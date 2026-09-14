#!/usr/bin/env node
/**
 * Mission BQ host patcher — idempotently consolidates Ladder 21 BM/BN/BO/BP
 * satellites into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 4 npm run lines if absent
 *   - package.json:
 *       ensure BM/BN/BO/BP primaries + mission aliases
 *       extend test:native-suite-pack with the 4 ladder21 scripts
 *       add test:mission-bq / test:bq21 / test:l21
 *       add test:ladder21-pack (chains 4 satellites + mission-bq)
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-bq-ladder21-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md OR docs/releases/CI_CD_CONTRACT.md: Ladder 21 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 4 satellites (if file present)
 *
 * CRLF-safe: line matchers use [^\r\n]* (Windows lesson from Mission AC / AH / AM / AR / BB / BG / BL).
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-bq.mjs
 *   node scripts/patch-mission-bq.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution; Law VI: no static provider-secret prefix literals.
 * L17 CLOSED — never reopen. L18 CLOSED — never reopen. L19 CLOSED — never reopen. L20 CLOSED — never reopen.
 * After BQ, Ladder 21 is CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L21 after closeout.
 * Tip honesty ritual deferred to post-BQ tip refresh.
 * No rewrite of BM/BN/BO/BP modules — compose via CI scripts only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CI seam-pack / ladder21-pack script names (primary). */
const LADDER21 = [
  'test:mission-bm',
  'test:mission-bn',
  'test:mission-bo',
  'test:mission-bp',
];

/**
 * Primary script -> mission alias + lock command (for alias seeding if absent).
 */
const SATELLITE_SEED = {
  'test:mission-bm': {
    aliases: ['test:agent-identity-attestation'],
    lock: 'node --test tests/eos-bm-agent-identity-attestation.test.js',
  },
  'test:mission-bn': {
    aliases: ['test:continuous-integrity-sentinel'],
    lock: 'node --test tests/eos-bn-continuous-integrity-sentinel.test.js',
  },
  'test:mission-bo': {
    aliases: ['test:two-key-consensus-gate'],
    lock: 'node --test tests/eos-bo-two-key-consensus-gate.test.js',
  },
  'test:mission-bp': {
    aliases: ['test:telemetry-forensic-trail'],
    lock: 'node --test tests/eos-bp-telemetry-forensic-trail.test.js',
  },
};

const EXCLUDE = 'eos-bq-ladder21-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-bq-ladder21-seam-pack.test.js';
const LADDER21_PACK =
  'npm run test:mission-bm && npm run test:mission-bn && npm run test:mission-bo && npm run test:mission-bp && npm run test:mission-bq';

const CONTRACT_NOTE = `
## BQ / Mission BQ Ladder 21 seam-pack note (2026-09-14)
seam-pack named pack extended with CI-safe Ladder 21 satellites: \`test:mission-bm\` (BM), \`test:mission-bn\` (BN), \`test:mission-bo\` (BO), \`test:mission-bp\` (BP). Keep prior native-suite + packs (incl. Ladder 12/13/14/15/16/17/18/19/20). Local aliases: \`test:ladder21-pack\`, \`test:mission-bq\` / \`test:bq21\` / \`test:l21\`. Lock basename \`eos-bq-ladder21-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / Team / Enterprise enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals. L17 CLOSED — never reopen. L18 CLOSED — never reopen. L19 CLOSED — never reopen. L20 CLOSED — never reopen. Ladder 21 CLOSED_FOR_LOCAL_GOVERNED_USE after BQ — never reopen L21 after closeout. Tip honesty ritual deferred to post-BQ tip refresh (not this mission). No rewrite of BM/BN/BO/BP modules — compose via CI scripts only. Receipt integrity: BM-RCPT-* / BN-RCPT-* / BO-RCPT-* / BP-RCPT-*.

## Ladder 21 note (2026-09-14)
Ladder 21 closeout: BM (agent identity attestation) + BN (continuous integrity sentinel) + BO (two-key consensus gate) + BP (telemetry forensic trail aggregator) consolidated into CI seam-pack (SPEC-0074 / Mission BQ). Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric. Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. Ladder 21 status: CLOSED_FOR_LOCAL_GOVERNED_USE. See \`docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md\`.
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

function resolveContractPath() {
  const gov = path.join(root, 'docs', 'governance', 'CI_CD_CONTRACT.md');
  const rel = path.join(root, 'docs', 'releases', 'CI_CD_CONTRACT.md');
  if (fs.existsSync(gov)) return gov;
  if (fs.existsSync(rel)) return rel;
  return gov;
}

// ── package.json ────────────────────────────────────────────────────────────
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-bq: package.json not found at ${pkgPath}`);
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

// Extend test:native-suite-pack with L21 CI scripts
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    val = LADDER21.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 21)`);
  } else {
    let next = val;
    for (const s of LADDER21) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 21)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 21)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-bq': LOCK_SCRIPT,
  'test:bq21': LOCK_SCRIPT,
  'test:l21': LOCK_SCRIPT,
  'test:ladder21-pack': LADDER21_PACK,
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
  console.error(`patch-mission-bq: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-bq: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER21.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 21 satellites already present)');
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
        console.error('patch-mission-bq: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    // CRLF-safe: [^\r\n]* not [^\n]* (Windows lesson from Mission AC / AH / AM / AR / BB / BG / BL)
    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\r\n]*)/,
      (m) =>
        m.includes('Ladder 21') || m.includes('test:mission-bm') || m.includes('mission-bm')
          ? m
          : `${m} + Ladder 21 BM/BN/BO/BP`
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-bq: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-bq: could not locate SLIM_SUITE_EXCLUDES Set');
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

// ── CI_CD_CONTRACT.md (governance preferred; releases fallback) ─────────────
const contractPath = resolveContractPath();
if (!fs.existsSync(contractPath)) {
  console.error(`patch-mission-bq: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 21') &&
    (md.includes('test:mission-bm') || md.includes('Mission BQ'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 21 note (already present)');
  } else {
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:mission-bm') &&
      !md.includes('test:mission-bp')
    ) {
      // CRLF-safe row match
      md = md.replace(
        /(\| seam-pack \|[^\r\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:mission-bm')) return m;
          return `${row} + \`test:mission-bm\`/\`test:mission-bn\`/\`test:mission-bo\`/\`test:mission-bp\` (Ladder 21)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus(`CI_CD_CONTRACT.md Ladder 21 / Mission BQ notes (${path.relative(root, contractPath)})`);
  }
}

// ── assert-gha-contract.js needles (optional mirror of Mission BL/BG/BB/AW/…) ──
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ['test:mission-bm', 'CI Mission BQ mission-bm (BM)'],
    ['test:mission-bn', 'CI Mission BQ mission-bn (BN)'],
    ['test:mission-bo', 'CI Mission BQ mission-bo (BO)'],
    ['test:mission-bp', 'CI Mission BQ mission-bp (BP)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
      "assertContains(yaml, 'test:mission-bp'",
      "assertContains(yaml, 'test:mission-bo'",
      "assertContains(yaml, 'test:mission-bn'",
      "assertContains(yaml, 'test:mission-bm'",
      "assertContains(yaml, 'test:mission-bk'",
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
      console.error(`patch-mission-bq: could not place assert needle for ${script}`);
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

console.log(changed ? 'patch-mission-bq: applied' : 'patch-mission-bq: no-op (already patched)');
