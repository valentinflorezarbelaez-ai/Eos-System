#!/usr/bin/env node
/**
 * Mission BL host patcher — idempotently consolidates Ladder 20 BH/BI/BJ/BK
 * satellites into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 4 npm run lines if absent
 *   - package.json:
 *       ensure BH/BI/BJ/BK primaries + mission aliases
 *       extend test:native-suite-pack with the 4 ladder20 scripts
 *       add test:mission-bl / test:bl20 / test:l20
 *       add test:ladder20-pack (chains 4 satellites + mission-bl)
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-bl-ladder20-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md OR docs/releases/CI_CD_CONTRACT.md: Ladder 20 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 4 satellites (if file present)
 *
 * CRLF-safe: line matchers use [^\r\n]* (Windows lesson from Mission AC / AH / AM / AR / BB / BG).
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-bl.mjs
 *   node scripts/patch-mission-bl.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution; Law VI: no static provider-secret prefix literals.
 * L17 CLOSED — never reopen. L18 CLOSED — never reopen. L19 CLOSED — never reopen.
 * After BL, Ladder 20 is CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L20 after closeout.
 * Tip honesty ritual deferred to post-BL tip refresh.
 * No rewrite of BH/BI/BJ/BK modules — compose via CI scripts only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CI seam-pack / ladder20-pack script names (primary). */
const LADDER20 = [
  'test:mission-bh',
  'test:mission-bi',
  'test:mission-bj',
  'test:mission-bk',
];

/**
 * Primary script -> mission alias + lock command (for alias seeding if absent).
 */
const SATELLITE_SEED = {
  'test:mission-bh': {
    aliases: ['test:mission-lifecycle'],
    lock: 'node --test tests/eos-bh-mission-lifecycle-state-machine.test.js',
  },
  'test:mission-bi': {
    aliases: ['test:cross-session-continuity'],
    lock: 'node --test tests/eos-bi-cross-session-continuity-replay-fabric.test.js',
  },
  'test:mission-bj': {
    aliases: ['test:operator-dashboard-hud'],
    lock: 'node --test tests/eos-bj-operator-dashboard-hud-fabric.test.js',
  },
  'test:mission-bk': {
    aliases: ['test:governed-external-write'],
    lock: 'node --test tests/eos-bk-governed-external-write-orchestrator.test.js',
  },
};

const EXCLUDE = 'eos-bl-ladder20-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-bl-ladder20-seam-pack.test.js';
const LADDER20_PACK =
  'npm run test:mission-bh && npm run test:mission-bi && npm run test:mission-bj && npm run test:mission-bk && npm run test:mission-bl';

const CONTRACT_NOTE = `
## BL / Mission BL Ladder 20 seam-pack note (2026-09-14)
seam-pack named pack extended with CI-safe Ladder 20 satellites: \`test:mission-bh\` (BH), \`test:mission-bi\` (BI), \`test:mission-bj\` (BJ), \`test:mission-bk\` (BK). Keep prior native-suite + packs (incl. Ladder 12/13/14/15/16/17/18/19). Local aliases: \`test:ladder20-pack\`, \`test:mission-bl\` / \`test:bl20\` / \`test:l20\`. Lock basename \`eos-bl-ladder20-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / Team / Enterprise enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals. L17 CLOSED — never reopen. L18 CLOSED — never reopen. L19 CLOSED — never reopen. Ladder 20 CLOSED_FOR_LOCAL_GOVERNED_USE after BL — never reopen L20 after closeout. Tip honesty ritual deferred to post-BL tip refresh (not this mission). No rewrite of BH/BI/BJ/BK modules — compose via CI scripts only. Receipt integrity: BH-RCPT-* / BI-RCPT-* / BJ-RCPT-* / BK-RCPT-*.

## Ladder 20 note (2026-09-14)
Ladder 20 closeout: BH (mission lifecycle state machine) + BI (cross-session continuity & replay fabric) + BJ (operator dashboard / HUD fabric) + BK (governed external write orchestrator) consolidated into CI seam-pack (SPEC-0069 / Mission BL). Axis: Sovereign Mission Continuity & Operator Fabric. Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. Ladder 20 status: CLOSED_FOR_LOCAL_GOVERNED_USE. See \`docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md\`.
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
  console.error(`patch-mission-bl: package.json not found at ${pkgPath}`);
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

// Extend test:native-suite-pack with L20 CI scripts
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    val = LADDER20.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 20)`);
  } else {
    let next = val;
    for (const s of LADDER20) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 20)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 20)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-bl': LOCK_SCRIPT,
  'test:bl20': LOCK_SCRIPT,
  'test:l20': LOCK_SCRIPT,
  'test:ladder20-pack': LADDER20_PACK,
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
  console.error(`patch-mission-bl: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-bl: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER20.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 20 satellites already present)');
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
        console.error('patch-mission-bl: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    // CRLF-safe: [^\r\n]* not [^\n]* (Windows lesson from Mission AC / AH / AM / AR / BB / BG)
    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\r\n]*)/,
      (m) =>
        m.includes('Ladder 20') || m.includes('test:mission-bh') || m.includes('mission-bh')
          ? m
          : `${m} + Ladder 20 BH/BI/BJ/BK`
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-bl: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-bl: could not locate SLIM_SUITE_EXCLUDES Set');
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
  console.error(`patch-mission-bl: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 20') &&
    (md.includes('test:mission-bh') || md.includes('Mission BL'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 20 note (already present)');
  } else {
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:mission-bh') &&
      !md.includes('test:mission-bk')
    ) {
      // CRLF-safe row match
      md = md.replace(
        /(\| seam-pack \|[^\r\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:mission-bh')) return m;
          return `${row} + \`test:mission-bh\`/\`test:mission-bi\`/\`test:mission-bj\`/\`test:mission-bk\` (Ladder 20)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus(`CI_CD_CONTRACT.md Ladder 20 / Mission BL notes (${path.relative(root, contractPath)})`);
  }
}

// ── assert-gha-contract.js needles (optional mirror of Mission BG/BB/AW/…) ──────
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ['test:mission-bh', 'CI Mission BL mission-bh (BH)'],
    ['test:mission-bi', 'CI Mission BL mission-bi (BI)'],
    ['test:mission-bj', 'CI Mission BL mission-bj (BJ)'],
    ['test:mission-bk', 'CI Mission BL mission-bk (BK)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
      "assertContains(yaml, 'test:mission-bk'",
      "assertContains(yaml, 'test:mission-bj'",
      "assertContains(yaml, 'test:mission-bi'",
      "assertContains(yaml, 'test:mission-bh'",
      "assertContains(yaml, 'test:local-rc-packaging'",
      "assertContains(yaml, 'test:verification-replay'",
      "assertContains(yaml, 'test:multi-target-delivery'",
      "assertContains(yaml, 'test:governed-patch-apply'",
      "assertContains(yaml, 'test:local-sandbox-port'",
      "assertContains(yaml, 'test:self-repair-bridge'",
      "assertContains(yaml, 'test:ast-semantic-port'",
      "assertContains(yaml, 'test:developer-engine-core'",
      "assertContains(yaml, 'test:evidence-export-notarization'",
      "assertContains(yaml, 'test:hitl-po-authority'",
      "assertContains(yaml, 'test:provider-failover-resilience'",
      "assertContains(yaml, 'test:multi-workstation-federation'",
      "assertContains(yaml, 'test:autonomy-replay-forensic-observer'",
      "assertContains(yaml, 'test:constitution-runtime-policy-gate'",
      "assertContains(yaml, 'test:evidence-economy-ledger'",
      "assertContains(yaml, 'test:multi-session-autonomy'",
      "assertContains(yaml, 'test:live-tool-engine'",
      "assertContains(yaml, 'test:autonomous-loop'",
      "assertContains(yaml, 'test:token-budget-ecr'",
      "assertContains(yaml, 'test:llm-provider-port'",
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
      console.error(`patch-mission-bl: could not place assert needle for ${script}`);
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

console.log(changed ? 'patch-mission-bl: applied' : 'patch-mission-bl: no-op (already patched)');
