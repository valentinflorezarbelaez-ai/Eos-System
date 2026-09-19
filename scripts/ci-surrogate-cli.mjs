#!/usr/bin/env node
/**
 * Post-L26 C — local CI surrogate CLI entry (npm run ci:surrogate).
 *
 * Reads optional JSON config from --config path, or uses env/fixture defaults.
 * Always emits ci_environment with github_actions=BILLING_BLOCKED.
 *
 * Exit codes: see EXIT in local-ci-surrogate.js (deterministic).
 *
 * NON-CLAIM: Local success ≠ GitHub Actions success ≠ production readiness.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = { config: null, json: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--config' && argv[i + 1]) out.config = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage: node scripts/ci-surrogate-cli.mjs [--config path.json] [--json]

Fail-closed local CI surrogate while GitHub Actions is BILLING_BLOCKED.
Never claims GitHub Actions green. PRODUCTION_READY remains NO.

Prerequisites (documented):
  - Node >= 18
  - Freeze tip evidence + HEAD revision
  - Mission-pack SSOT expected identity
  - verify:strict runner or recordedResult
  - Clean tree (dirty → fail-closed)
`);
    process.exit(0);
  }

  const mod = await import(
    pathToFileURL(path.join(PKG, 'src/core/ci/local-ci-surrogate.js')).href
  );

  let input = {};
  if (args.config) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(args.config), 'utf8'));
    input = raw.input || raw;
  } else {
    // Demo / hermetic default: fixture pass path with recorded 914/0
    const fix = JSON.parse(
      fs.readFileSync(path.join(PKG, 'fixtures/mission-pack-ssot.json'), 'utf8')
    );
    const expected = mod.buildMissionPackIdentity({
      paths: fix.paths,
      scriptKeys: fix.script_keys,
      fileContents: fix.file_bodies,
      scripts: fix.scripts
    });
    input = {
      freezeRevision: mod.CANONICAL_FREEZE_TIP,
      sourceRevision: mod.CANONICAL_FREEZE_TIP,
      lagCommits: 0,
      expectedFreeze: mod.CANONICAL_FREEZE_TIP,
      dirty: false,
      expectedMissionPack: expected,
      fileContents: fix.file_bodies,
      scripts: fix.scripts,
      recordedResult: {
        ok: true,
        exitCode: 0,
        pass_count: 914,
        fail_count: 0,
        evidence: { pattern: '914/0', note: 'hermetic demo recorded' }
      }
    };
  }

  const gate = await mod.runLocalCiSurrogate(input);
  if (args.json) {
    console.log(JSON.stringify(gate, null, 2));
  } else {
    console.log(mod.formatGateSummary(gate));
  }
  process.exit(mod.exitCodeFromGate(gate));
}

main().catch((err) => {
  console.error('ci-surrogate-cli:', err?.stack || err);
  process.exit(1);
});
