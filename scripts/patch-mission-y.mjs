#!/usr/bin/env node
/**
 * Mission Y host patcher — idempotently consolidates Ladder 12 V/W/X satellites
 * into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 3 npm run lines if absent
 *   - package.json:
 *       extend test:native-suite-pack with the 3 ladder12 scripts
 *       add test:mission-y / test:y12
 *       optionally test:ladder12-pack (chains the 3 satellites)
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-y-ladder12-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md: Ladder 12 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 3 satellites (if file present)
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-y.mjs
 *   node scripts/patch-mission-y.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LADDER12 = [
  'test:fdir-remediation',
  'test:sovereign-session',
  'test:developer-shell',
];
const EXCLUDE = 'eos-y-ladder12-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-y-ladder12-seam-pack.test.js';
const LADDER12_PACK =
  'npm run test:fdir-remediation && npm run test:sovereign-session && npm run test:developer-shell';

const CONTRACT_NOTE = `
## Y / Mission Y Ladder 12 seam-pack note (2026-09-11)
seam-pack named pack extended with CI-safe Ladder 12 satellites: \`test:fdir-remediation\` (V), \`test:sovereign-session\` (W), \`test:developer-shell\` (X). Keep prior native-suite + packs. Local aliases: \`test:ladder12-pack\`, \`test:mission-y\` / \`test:y12\`. Lock basename \`eos-y-ladder12-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## Ladder 12 note (2026-09-11)
Ladder 12 closeout: V (FDIR remediation) + W (sovereign session) + X (developer shell) consolidated into CI seam-pack (SPEC-0030 / Mission Y). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See \`docs/releases/EOS_LADDER_12_CLOSEOUT_2026-09-11.md\`.
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
  console.error(`patch-mission-y: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
let pkgChanged = false;

// Extend test:native-suite-pack
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    // Seed from Ladder 11 chain if missing (host should already have it after Mission U)
    val = LADDER12.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 12)`);
  } else {
    let next = val;
    for (const s of LADDER12) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 12)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 12)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-y': LOCK_SCRIPT,
  'test:y12': LOCK_SCRIPT,
  'test:ladder12-pack': LADDER12_PACK,
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
  console.error(`patch-mission-y: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-y: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER12.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 12 satellites already present)');
  } else {
    // Insert before Fundacion freeze step inside seam-pack, or append after last npm run in that job.
    const fundacionIdx = yaml.search(
      /\n      - name: Fundacion freeze \(delta 0\)\n        run: \|\n          git diff --exit-code -- Fundacion/
    );
    const lines = missing.map((s) => `          npm run ${s}`).join('\n');

    if (fundacionIdx !== -1) {
      // Prefer inserting just before Fundacion freeze in the seam-pack block.
      // Find the last occurrence of "npm run " before Fundacion freeze that belongs to seam-pack.
      const before = yaml.slice(0, fundacionIdx);
      const after = yaml.slice(fundacionIdx);
      // Ensure trailing newline before insert
      const glue = before.endsWith('\n') ? '' : '\n';
      yaml = `${before}${glue}${lines}\n${after}`;
    } else {
      // Fallback: append after last "npm run " line in file
      const lastNpm = yaml.lastIndexOf('npm run ');
      if (lastNpm === -1) {
        console.error('patch-mission-y: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    // Optionally extend the step name annotation if present
    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\n]*)/,
      (m) => (m.includes('Ladder 12') || m.includes('fdir-remediation') ? m : `${m} + Ladder 12 V/W/X`)
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-y: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-y: could not locate SLIM_SUITE_EXCLUDES Set');
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
  console.error(`patch-mission-y: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 12') &&
    (md.includes('test:fdir-remediation') || md.includes('Mission Y'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 12 note (already present)');
  } else {
    // Careful append: do not rewrite prior notes; extend seam-pack row lightly if possible.
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:fdir-remediation') &&
      !md.includes('test:developer-shell')
    ) {
      md = md.replace(
        /(\| seam-pack \|[^\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:fdir-remediation')) return m;
          return `${row} + \`test:fdir-remediation\`/\`test:sovereign-session\`/\`test:developer-shell\` (Ladder 12)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus('CI_CD_CONTRACT.md Ladder 12 / Mission Y notes');
  }
}

// ── assert-gha-contract.js needles (optional mirror of Mission U) ────────────
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ["test:fdir-remediation", 'CI Mission Y fdir-remediation (V)'],
    ["test:sovereign-session", 'CI Mission Y sovereign-session (W)'],
    ["test:developer-shell", 'CI Mission Y developer-shell (X)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    // Append after the furthest Mission Y / native-suite anchor so order stays V→W→X
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
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
      console.error(`patch-mission-y: could not place assert needle for ${script}`);
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

console.log(changed ? 'patch-mission-y: applied' : 'patch-mission-y: no-op (already patched)');
