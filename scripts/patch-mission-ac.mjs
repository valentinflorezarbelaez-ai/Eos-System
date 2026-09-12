#!/usr/bin/env node
/**
 * Mission AC host patcher — idempotently consolidates Ladder 13 Z/AA/AB satellites
 * into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 3 npm run lines if absent
 *   - package.json:
 *       extend test:native-suite-pack with the 3 ladder13 scripts
 *       add test:mission-ac / test:ac13
 *       add test:ladder13-pack (chains the 3 satellites)
 *       ensure mission-z / mission-aa / mission-ab aliases if missing
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-ac-ladder13-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md: Ladder 13 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 3 satellites (if file present)
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-ac.mjs
 *   node scripts/patch-mission-ac.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LADDER13 = [
  'test:target-flight',
  'test:multi-agent-swarm',
  'test:telemetry-server',
];

/** Primary script -> mission alias + lock command (for alias seeding if absent). */
const SATELLITE_ALIASES = {
  'test:target-flight': {
    alias: 'test:mission-z',
    lock: 'node --test tests/eos-z-target-flight-sandbox.test.js',
  },
  'test:multi-agent-swarm': {
    alias: 'test:mission-aa',
    lock: 'node --test tests/eos-aa-multi-agent-swarm.test.js',
  },
  'test:telemetry-server': {
    alias: 'test:mission-ab',
    lock: 'node --test tests/eos-ab-telemetry-server.test.js',
  },
};

const EXCLUDE = 'eos-ac-ladder13-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-ac-ladder13-seam-pack.test.js';
const LADDER13_PACK =
  'npm run test:target-flight && npm run test:multi-agent-swarm && npm run test:telemetry-server';

const CONTRACT_NOTE = `
## AC / Mission AC Ladder 13 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 13 satellites: \`test:target-flight\` (Z), \`test:multi-agent-swarm\` (AA), \`test:telemetry-server\` (AB). Keep prior native-suite + packs (incl. Ladder 12). Local aliases: \`test:ladder13-pack\`, \`test:mission-ac\` / \`test:ac13\`. Lock basename \`eos-ac-ladder13-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## Ladder 13 note (2026-09-12)
Ladder 13 closeout: Z (target flight sandbox) + AA (multi-agent swarm) + AB (telemetry stream server) consolidated into CI seam-pack (SPEC-0034 / Mission AC). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See \`docs/releases/EOS_LADDER_13_CLOSEOUT_2026-09-12.md\`.
`.trimStart();

/** Resolve repo root: cwd if it looks like EOS, else parent of scripts/ when copied in. */
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
let changed = false;

function logPlus(msg) {
  changed = true;
  console.log(`+ ${msg}`);
}
function logEq(msg) {
  console.log(`= ${msg}`);
}

// ── package.json ────────────────────────────────────────────────────────────
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-ac: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
let pkgChanged = false;

// Ensure primary satellite scripts + mission-z/aa/ab aliases if missing
for (const [primary, meta] of Object.entries(SATELLITE_ALIASES)) {
  if (typeof pkg.scripts[primary] !== 'string') {
    pkg.scripts[primary] = meta.lock;
    pkgChanged = true;
    logPlus(`package.json scripts.${primary} (seeded)`);
  } else {
    logEq(`package.json scripts.${primary} (already present)`);
  }
  if (typeof pkg.scripts[meta.alias] !== 'string') {
    pkg.scripts[meta.alias] = pkg.scripts[primary];
    pkgChanged = true;
    logPlus(`package.json scripts.${meta.alias} (alias seeded)`);
  } else {
    logEq(`package.json scripts.${meta.alias} (already present)`);
  }
}

// Extend test:native-suite-pack
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    val = LADDER13.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 13)`);
  } else {
    let next = val;
    for (const s of LADDER13) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 13)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 13)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-ac': LOCK_SCRIPT,
  'test:ac13': LOCK_SCRIPT,
  'test:ladder13-pack': LADDER13_PACK,
};
for (const [k, v] of Object.entries(SCRIPT_ADDS)) {
  if (pkg.scripts[k] !== v) {
    pkg.scripts[k] = v;
    pkgChanged = true;
    logPlus(`package.json scripts.${k}`);
  } else {
    logEq(`package.json scripts.${k} (already present)`);
  }
}

if (pkgChanged) {
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  changed = true;
}

// ── ci.yml seam-pack ────────────────────────────────────────────────────────
const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');
if (!fs.existsSync(ciPath)) {
  console.error(`patch-mission-ac: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-ac: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER13.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 13 satellites already present)');
  } else {
    // Insert before Fundacion freeze step inside seam-pack, or append after last npm run in that job.
    const fundacionIdx = yaml.search(
      /\n      - name: Fundacion freeze \(delta 0\)\n        run: \|\n          git diff --exit-code -- Fundacion/
    );
    const lines = missing.map((s) => `          npm run ${s}`).join('\n');

    if (fundacionIdx !== -1) {
      const before = yaml.slice(0, fundacionIdx);
      const after = yaml.slice(fundacionIdx);
      const glue = before.endsWith('\n') ? '' : '\n';
      yaml = `${before}${glue}${lines}\n${after}`;
    } else {
      const lastNpm = yaml.lastIndexOf('npm run ');
      if (lastNpm === -1) {
        console.error('patch-mission-ac: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\n]*)/,
      (m) =>
        m.includes('Ladder 13') || m.includes('target-flight')
          ? m
          : `${m} + Ladder 13 Z/AA/AB`
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-ac: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-ac: could not locate SLIM_SUITE_EXCLUDES Set');
      process.exit(1);
    }
    runner = runner.replace(re, (m, head, tail) => {
      let h = head;
      if (!/,\s*$/.test(h.trimEnd())) {
        h = h.replace(/(['"][^'"]+['"])(\s*)$/, '$1,$2');
      }
      return `${h}\n  '${EXCLUDE}',\n${tail}`;
    });
    runner = runner.replace(/,(\s*,)+/g, ',');
    fs.writeFileSync(runnerPath, runner, 'utf8');
    logPlus(`SLIM_SUITE_EXCLUDES ${EXCLUDE}`);
  }
}

// ── CI_CD_CONTRACT.md ───────────────────────────────────────────────────────
const contractPath = path.join(root, 'docs', 'governance', 'CI_CD_CONTRACT.md');
if (!fs.existsSync(contractPath)) {
  console.error(`patch-mission-ac: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 13') &&
    (md.includes('test:target-flight') || md.includes('Mission AC'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 13 note (already present)');
  } else {
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:target-flight') &&
      !md.includes('test:telemetry-server')
    ) {
      md = md.replace(
        /(\| seam-pack \|[^\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:target-flight')) return m;
          return `${row} + \`test:target-flight\`/\`test:multi-agent-swarm\`/\`test:telemetry-server\` (Ladder 13)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus('CI_CD_CONTRACT.md Ladder 13 / Mission AC notes');
  }
}

// ── assert-gha-contract.js needles (optional mirror of Mission Y) ────────────
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ['test:target-flight', 'CI Mission AC target-flight (Z)'],
    ['test:multi-agent-swarm', 'CI Mission AC multi-agent-swarm (AA)'],
    ['test:telemetry-server', 'CI Mission AC telemetry-server (AB)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
      "assertContains(yaml, 'test:telemetry-server'",
      "assertContains(yaml, 'test:multi-agent-swarm'",
      "assertContains(yaml, 'test:target-flight'",
      "assertContains(yaml, 'test:developer-shell'",
      "assertContains(yaml, 'test:sovereign-session'",
      "assertContains(yaml, 'test:fdir-remediation'",
      "assertContains(yaml, 'test:external-write-gateway'",
      "assertContains(yaml, 'test:c2'",
      "assertContains(yaml, 'test:compute-worker'",
    ];
    let placeAt = -1;
    for (const a of anchors) {
      const idx = src.lastIndexOf(a);
      if (idx === -1) continue;
      const lineEnd = src.indexOf('\n', idx);
      if (lineEnd === -1) continue;
      placeAt = lineEnd + 1;
      break;
    }
    if (placeAt === -1) {
      console.error(`patch-mission-ac: could not place assert needle for ${script}`);
      process.exit(1);
    }
    src = src.slice(0, placeAt) + insertLine + src.slice(placeAt);
    assertChanged = true;
    logPlus(`assert-gha-contract.js needle ${script}`);
  }
  if (assertChanged) {
    fs.writeFileSync(assertPath, src, 'utf8');
    changed = true;
  }
} else {
  console.log('= assert-gha-contract.js absent; skip needles');
}

console.log(changed ? 'patch-mission-ac: applied' : 'patch-mission-ac: no-op (already patched)');
