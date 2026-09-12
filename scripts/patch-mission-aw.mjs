#!/usr/bin/env node
/**
 * Mission AW host patcher — idempotently consolidates Ladder 17 AS/AT/AU/AV
 * satellites into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 4 npm run lines if absent
 *   - package.json:
 *       ensure AS/AT/AU/AV primaries + mission aliases
 *       extend test:native-suite-pack with the 4 ladder17 scripts
 *       add test:mission-aw / test:aw17 / test:l17
 *       add test:ladder17-pack (chains 4 satellites + mission-aw)
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-aw-ladder17-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md: Ladder 17 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 4 satellites (if file present)
 *
 * CRLF-safe: line matchers use [^\r\n]* (Windows lesson from Mission AC / AH / AM / AR).
 *
 * Usage (from worktree root):
 *   node scripts/patch-mission-aw.mjs
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution; Law VI: no static provider-secret prefix literals.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CI seam-pack / ladder17-pack script names. */
const LADDER17 = [
  'test:cross-satellite-composition',
  'test:operator-continuity',
  'test:law-vi-broker',
  'test:freeze-drift',
];

/**
 * Primary script -> mission alias + lock command (for alias seeding if absent).
 */
const SATELLITE_SEED = {
  'test:cross-satellite-composition': {
    aliases: ['test:mission-as'],
    lock: 'node --test tests/eos-as-cross-satellite-composition.test.js',
  },
  'test:operator-continuity': {
    aliases: ['test:mission-at'],
    lock: 'node --test tests/eos-at-operator-continuity-crash-recovery.test.js',
  },
  'test:law-vi-broker': {
    aliases: ['test:mission-au'],
    lock: 'node --test tests/eos-au-law-vi-secret-runtime-broker.test.js',
  },
  'test:freeze-drift': {
    aliases: ['test:mission-av'],
    lock: 'node --test tests/eos-av-governed-state-freeze-drift-observer.test.js',
  },
};

const EXCLUDE = 'eos-aw-ladder17-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-aw-ladder17-seam-pack.test.js';
const LADDER17_PACK =
  'npm run test:cross-satellite-composition && npm run test:operator-continuity && npm run test:law-vi-broker && npm run test:freeze-drift && npm run test:mission-aw';

const CONTRACT_NOTE = `
## AW / Mission AW Ladder 17 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 17 satellites: \`test:cross-satellite-composition\` (AS), \`test:operator-continuity\` (AT), \`test:law-vi-broker\` (AU), \`test:freeze-drift\` (AV). Keep prior native-suite + packs (incl. Ladder 12/13/14/15/16). Local aliases: \`test:ladder17-pack\`, \`test:mission-aw\` / \`test:aw17\` / \`test:l17\`. Lock basename \`eos-aw-ladder17-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals.

## Ladder 17 note (2026-09-12)
Ladder 17 closeout: AS (cross-satellite composition harness) + AT (operator continuity / crash-recovery custody port) + AU (Law VI secret runtime broker) + AV (governed state freeze & drift observer) consolidated into CI seam-pack (SPEC-0054 / Mission AW). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See \`docs/releases/EOS_LADDER_17_CLOSEOUT_2026-09-12.md\`.
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
  console.error(`patch-mission-aw: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
let pkgChanged = false;

// Ensure primary satellite scripts + aliases
for (const [primary, meta] of Object.entries(SATELLITE_SEED)) {
  if (typeof pkg.scripts[primary] !== 'string') {
    pkg.scripts[primary] = meta.lock;
    pkgChanged = true;
    logPlus(`package.json scripts.${primary} (seeded)`);
  } else {
    logEq(`package.json scripts.${primary} (already present)`);
  }
  for (const alias of meta.aliases) {
    const want = pkg.scripts[primary];
    if (typeof pkg.scripts[alias] !== 'string') {
      pkg.scripts[alias] = want;
      pkgChanged = true;
      logPlus(`package.json scripts.${alias} (alias seeded)`);
    } else {
      logEq(`package.json scripts.${alias} (already present)`);
    }
  }
}

// Extend test:native-suite-pack with L17 CI scripts
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    val = LADDER17.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 17)`);
  } else {
    let next = val;
    for (const s of LADDER17) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 17)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 17)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-aw': LOCK_SCRIPT,
  'test:aw17': LOCK_SCRIPT,
  'test:l17': LOCK_SCRIPT,
  'test:ladder17-pack': LADDER17_PACK,
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
  console.error(`patch-mission-aw: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-aw: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER17.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 17 satellites already present)');
  } else {
    // Insert before Fundacion freeze step inside seam-pack (CRLF-safe).
    const fundacionRe =
      /\r?\n      - name: Fundacion freeze \(delta 0\)\r?\n        run: \|\r?\n          git diff --exit-code -- Fundacion/;
    const fundacionMatch = yaml.match(fundacionRe);
    const fundacionIdx = fundacionMatch ? fundacionMatch.index : -1;
    const lines = missing.map((s) => `          npm run ${s}`).join('\n');

    if (fundacionIdx !== -1) {
      const before = yaml.slice(0, fundacionIdx);
      const after = yaml.slice(fundacionIdx);
      const glue = /\r?\n$/.test(before) ? '' : '\n';
      yaml = `${before}${glue}${lines}\n${after}`;
    } else {
      const lastNpm = yaml.lastIndexOf('npm run ');
      if (lastNpm === -1) {
        console.error('patch-mission-aw: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    // CRLF-safe: [^\r\n]* not [^\n]* (Windows lesson from Mission AC / AH / AM / AR)
    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\r\n]*)/,
      (m) =>
        m.includes('Ladder 17') || m.includes('cross-satellite-composition')
          ? m
          : `${m} + Ladder 17 AS/AT/AU/AV`
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-aw: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-aw: could not locate SLIM_SUITE_EXCLUDES Set');
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
  console.error(`patch-mission-aw: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 17') &&
    (md.includes('test:cross-satellite-composition') || md.includes('Mission AW'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 17 note (already present)');
  } else {
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:cross-satellite-composition') &&
      !md.includes('test:freeze-drift')
    ) {
      // CRLF-safe row match
      md = md.replace(
        /(\| seam-pack \|[^\r\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:cross-satellite-composition')) return m;
          return `${row} + \`test:cross-satellite-composition\`/\`test:operator-continuity\`/\`test:law-vi-broker\`/\`test:freeze-drift\` (Ladder 17)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus('CI_CD_CONTRACT.md Ladder 17 / Mission AW notes');
  }
}

// ── assert-gha-contract.js needles ──────────────────────────────────────────
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ['test:cross-satellite-composition', 'CI Mission AW cross-satellite-composition (AS)'],
    ['test:operator-continuity', 'CI Mission AW operator-continuity (AT)'],
    ['test:law-vi-broker', 'CI Mission AW law-vi-broker (AU)'],
    ['test:freeze-drift', 'CI Mission AW freeze-drift (AV)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
      "assertContains(yaml, 'test:freeze-drift'",
      "assertContains(yaml, 'test:law-vi-broker'",
      "assertContains(yaml, 'test:operator-continuity'",
      "assertContains(yaml, 'test:cross-satellite-composition'",
      "assertContains(yaml, 'test:evidence-export-notarization'",
      "assertContains(yaml, 'test:hitl-po-authority'",
      "assertContains(yaml, 'test:provider-failover-resilience'",
      "assertContains(yaml, 'test:multi-workstation-federation'",
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
      console.error(`patch-mission-aw: could not place assert needle for ${script}`);
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

console.log(changed ? 'patch-mission-aw: applied' : 'patch-mission-aw: no-op (already patched)');
