#!/usr/bin/env node
/**
 * Mission BR host patcher — idempotently adds:
 *   - package.json scripts: test:mission-br, test:intent-parser
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-br-sovereign-intent-parser-port.test.js
 *
 * CRLF-safe:
 *   - Set body matcher uses [\s\S]
 *   - trailing-comma / line-end checks accept [\r\n]
 *
 * Usage:
 *   node scripts/patch-mission-br.mjs
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'package.json')) && fs.existsSync(path.join(cwd, 'scripts'))) {
    return cwd;
  }
  const fromScript = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(fromScript, 'package.json'))) return fromScript;
  return cwd;
}

const root = resolveRoot();
const pkgPath = path.join(root, 'package.json');
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
const EXCLUDE = 'eos-br-sovereign-intent-parser-port.test.js';
const SCRIPTS = {
  'test:mission-br':
    'node --test tests/eos-br-sovereign-intent-parser-port.test.js',
  'test:intent-parser':
    'node --test tests/eos-br-sovereign-intent-parser-port.test.js'
};

let changed = false;

// ── package.json ────────────────────────────────────────────────────────────
if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-br: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
for (const [k, v] of Object.entries(SCRIPTS)) {
  if (pkg.scripts[k] !== v) {
    pkg.scripts[k] = v;
    changed = true;
    console.log(`+ package.json scripts.${k}`);
  } else {
    console.log(`= package.json scripts.${k} (already present)`);
  }
}
if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`wrote ${pkgPath}`);
}

// ── scripts/test-runner.js SLIM_SUITE_EXCLUDES ─────────────────────────────
if (fs.existsSync(runnerPath)) {
  const runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`)) {
    console.log(`= scripts/test-runner.js (already excludes ${EXCLUDE})`);
  } else {
    // Insert before closing bracket of SLIM_SUITE_EXCLUDES Set
    const match = runner.match(/export const SLIM_SUITE_EXCLUDES = new Set\(\[([\s\S]*?)\]\);/);
    if (!match) {
      console.warn(`! could not match SLIM_SUITE_EXCLUDES in ${runnerPath}`);
    } else {
      const inner = match[1];
      const replacement = `export const SLIM_SUITE_EXCLUDES = new Set([${inner}  '${EXCLUDE}',\n]);`;
      const patched = runner.replace(match[0], replacement);
      fs.writeFileSync(runnerPath, patched, 'utf8');
      console.log(`+ scripts/test-runner.js added ${EXCLUDE} to SLIM_SUITE_EXCLUDES`);
    }
  }
}
console.log('patch-mission-br complete.');
