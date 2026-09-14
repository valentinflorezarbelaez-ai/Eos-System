#!/usr/bin/env node
/**
 * Mission BG host patcher — idempotently consolidates Ladder 19 BC/BD/BE/BF
 * satellites into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 4 npm run lines if absent
 *   - package.json:
 *       ensure BC/BD/BE/BF primaries + mission aliases
 *       extend test:native-suite-pack with the 4 ladder19 scripts
 *       add test:mission-bg / test:bg19 / test:l19
 *       add test:ladder19-pack (chains 4 satellites + mission-bg)
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-bg-ladder19-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md OR docs/releases/CI_CD_CONTRACT.md: Ladder 19 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 4 satellites (if file present)
 *
 * CRLF-safe: line matchers use [^\r\n]* (Windows lesson from Mission AC / AH / AM / AR / BB).
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-bg.mjs
 *   node scripts/patch-mission-bg.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution; Law VI: no static provider-secret prefix literals.
 * L17 CLOSED — never reopen. L18 CLOSED — never reopen.
 * After BG, Ladder 19 is CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L19 after closeout.
 * Tip honesty ritual deferred to post-BG tip refresh.
 * No rewrite of BC/BD/BE/BF modules — compose via CI scripts only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CI seam-pack / ladder19-pack script names (primary). */
const LADDER19 = [
  'test:governed-patch-apply',
  'test:multi-target-delivery',
  'test:verification-replay',
  'test:local-rc-packaging',
];

/**
 * Primary script -> mission alias + lock command (for alias seeding if absent).
 */
const SATELLITE_SEED = {
  'test:governed-patch-apply': {
    aliases: ['test:mission-bc'],
    lock: 'node --test tests/eos-bc-governed-patch-diff-apply-port.test.js',
  },
  'test:multi-target-delivery': {
    aliases: ['test:mission-bd'],
    lock: 'node --test tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js',
  },
  'test:verification-replay': {
    aliases: ['test:mission-be'],
    lock: 'node --test tests/eos-be-verification-replay-golden-receipt-port.test.js',
  },
  'test:local-rc-packaging': {
    aliases: ['test:mission-bf'],
    lock: 'node --test tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js',
  },
};

const EXCLUDE = 'eos-bg-ladder19-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-bg-ladder19-seam-pack.test.js';
const LADDER19_PACK =
  'npm run test:governed-patch-apply && npm run test:multi-target-delivery && npm run test:verification-replay && npm run test:local-rc-packaging && npm run test:mission-bg';

const CONTRACT_NOTE = `
## BG / Mission BG Ladder 19 seam-pack note (2026-09-14)
seam-pack named pack extended with CI-safe Ladder 19 satellites: \`test:governed-patch-apply\` (BC), \`test:multi-target-delivery\` (BD), \`test:verification-replay\` (BE), \`test:local-rc-packaging\` (BF). Keep prior native-suite + packs (incl. Ladder 12/13/14/15/16/17/18). Local aliases: \`test:ladder19-pack\`, \`test:mission-bg\` / \`test:bg19\` / \`test:l19\`. Lock basename \`eos-bg-ladder19-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / Team / Enterprise enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals. L17 CLOSED — never reopen. L18 CLOSED — never reopen. Ladder 19 CLOSED_FOR_LOCAL_GOVERNED_USE after BG — never reopen L19 after closeout. Tip honesty ritual deferred to post-BG tip refresh (not this mission). No rewrite of BC/BD/BE/BF modules — compose via CI scripts only.

## Ladder 19 note (2026-09-14)
Ladder 19 closeout: BC (governed patch / diff apply port) + BD (multi-worktree / multi-target delivery port) + BE (verification replay / golden receipt port) + BF (local RC packaging / artifact notary port) consolidated into CI seam-pack (SPEC-0064 / Mission BG). Axis: Sovereign Delivery & Verification Fabric. Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. Ladder 19 status: CLOSED_FOR_LOCAL_GOVERNED_USE. See \`docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md\`.
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
  return gov; // prefer governance path for error message
}

// ── package.json ────────────────────────────────────────────────────────────
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-bg: package.json not found at ${pkgPath}`);
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

// Extend test:native-suite-pack with L19 CI scripts
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    val = LADDER19.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 19)`);
  } else {
    let next = val;
    for (const s of LADDER19) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 19)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 19)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-bg': LOCK_SCRIPT,
  'test:bg19': LOCK_SCRIPT,
  'test:l19': LOCK_SCRIPT,
  'test:ladder19-pack': LADDER19_PACK,
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
  console.error(`patch-mission-bg: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-bg: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER19.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 19 satellites already present)');
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
        console.error('patch-mission-bg: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    // CRLF-safe: [^\r\n]* not [^\n]* (Windows lesson from Mission AC / AH / AM / AR / BB)
    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\r\n]*)/,
      (m) =>
        m.includes('Ladder 19') || m.includes('governed-patch-apply')
          ? m
          : `${m} + Ladder 19 BC/BD/BE/BF`
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-bg: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-bg: could not locate SLIM_SUITE_EXCLUDES Set');
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
  console.error(`patch-mission-bg: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 19') &&
    (md.includes('test:governed-patch-apply') || md.includes('Mission BG'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 19 note (already present)');
  } else {
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:governed-patch-apply') &&
      !md.includes('test:local-rc-packaging')
    ) {
      // CRLF-safe row match
      md = md.replace(
        /(\| seam-pack \|[^\r\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:governed-patch-apply')) return m;
          return `${row} + \`test:governed-patch-apply\`/\`test:multi-target-delivery\`/\`test:verification-replay\`/\`test:local-rc-packaging\` (Ladder 19)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus(`CI_CD_CONTRACT.md Ladder 19 / Mission BG notes (${path.relative(root, contractPath)})`);
  }
}

// ── assert-gha-contract.js needles (optional mirror of Mission BB/AW/AR/AM/AH/AC) ──────
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ['test:governed-patch-apply', 'CI Mission BG governed-patch-apply (BC)'],
    ['test:multi-target-delivery', 'CI Mission BG multi-target-delivery (BD)'],
    ['test:verification-replay', 'CI Mission BG verification-replay (BE)'],
    ['test:local-rc-packaging', 'CI Mission BG local-rc-packaging (BF)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
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
      console.error(`patch-mission-bg: could not place assert needle for ${script}`);
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

console.log(changed ? 'patch-mission-bg: applied' : 'patch-mission-bg: no-op (already patched)');
