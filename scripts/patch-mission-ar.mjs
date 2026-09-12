#!/usr/bin/env node
/**
 * Mission AR host patcher — idempotently consolidates Ladder 16 AN/AO/AP/AQ
 * satellites into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 4 npm run lines if absent
 *   - package.json:
 *       ensure AN/AO/AP/AQ primaries + mission aliases
 *       extend test:native-suite-pack with the 4 ladder16 scripts
 *       add test:mission-ar / test:ar16 / test:l16
 *       add test:ladder16-pack (chains 4 satellites + mission-ar)
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-ar-ladder16-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md: Ladder 16 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 4 satellites (if file present)
 *
 * CRLF-safe: line matchers use [^\r\n]* (Windows lesson from Mission AC / AH / AM).
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-ar.mjs
 *   node scripts/patch-mission-ar.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution; Law VI: no static provider-secret prefix literals.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CI seam-pack / ladder16-pack script names. */
const LADDER16 = [
  'test:multi-workstation-federation',
  'test:provider-failover-resilience',
  'test:hitl-po-authority',
  'test:evidence-export-notarization',
];

/**
 * Primary script -> mission alias + lock command (for alias seeding if absent).
 */
const SATELLITE_SEED = {
  'test:multi-workstation-federation': {
    aliases: ['test:mission-an'],
    lock: 'node --test tests/eos-an-multi-workstation-session-federation.test.js',
  },
  'test:provider-failover-resilience': {
    aliases: ['test:mission-ao'],
    lock: 'node --test tests/eos-ao-provider-failover-resilience.test.js',
  },
  'test:hitl-po-authority': {
    aliases: ['test:mission-ap'],
    lock: 'node --test tests/eos-ap-hitl-po-authority-channel.test.js',
  },
  'test:evidence-export-notarization': {
    aliases: ['test:mission-aq'],
    lock: 'node --test tests/eos-aq-evidence-export-notarization.test.js',
  },
};

const EXCLUDE = 'eos-ar-ladder16-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-ar-ladder16-seam-pack.test.js';
const LADDER16_PACK =
  'npm run test:multi-workstation-federation && npm run test:provider-failover-resilience && npm run test:hitl-po-authority && npm run test:evidence-export-notarization && npm run test:mission-ar';

const CONTRACT_NOTE = `
## AR / Mission AR Ladder 16 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 16 satellites: \`test:multi-workstation-federation\` (AN), \`test:provider-failover-resilience\` (AO), \`test:hitl-po-authority\` (AP), \`test:evidence-export-notarization\` (AQ). Keep prior native-suite + packs (incl. Ladder 12/13/14/15). Local aliases: \`test:ladder16-pack\`, \`test:mission-ar\` / \`test:ar16\` / \`test:l16\`. Lock basename \`eos-ar-ladder16-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals. Tip honesty ritual deferred to post-AR tip refresh (not this mission).

## Ladder 16 note (2026-09-12)
Ladder 16 closeout: AN (multi-workstation session federation) + AO (provider failover resilience) + AP (HITL/PO authority channel) + AQ (evidence export notarization) consolidated into CI seam-pack (SPEC-0049 / Mission AR). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See \`docs/releases/EOS_LADDER_16_CLOSEOUT_2026-09-12.md\`.
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
  console.error(`patch-mission-ar: package.json not found at ${pkgPath}`);
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

// Extend test:native-suite-pack with L16 CI scripts
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    val = LADDER16.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 16)`);
  } else {
    let next = val;
    for (const s of LADDER16) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 16)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 16)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-ar': LOCK_SCRIPT,
  'test:ar16': LOCK_SCRIPT,
  'test:l16': LOCK_SCRIPT,
  'test:ladder16-pack': LADDER16_PACK,
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
  console.error(`patch-mission-ar: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-ar: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER16.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 16 satellites already present)');
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
        console.error('patch-mission-ar: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    // CRLF-safe: [^\r\n]* not [^\n]* (Windows lesson from Mission AC / AH / AM)
    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\r\n]*)/,
      (m) =>
        m.includes('Ladder 16') || m.includes('multi-workstation-federation')
          ? m
          : `${m} + Ladder 16 AN/AO/AP/AQ`
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-ar: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-ar: could not locate SLIM_SUITE_EXCLUDES Set');
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
  console.error(`patch-mission-ar: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 16') &&
    (md.includes('test:multi-workstation-federation') || md.includes('Mission AR'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 16 note (already present)');
  } else {
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:multi-workstation-federation') &&
      !md.includes('test:evidence-export-notarization')
    ) {
      // CRLF-safe row match
      md = md.replace(
        /(\| seam-pack \|[^\r\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:multi-workstation-federation')) return m;
          return `${row} + \`test:multi-workstation-federation\`/\`test:provider-failover-resilience\`/\`test:hitl-po-authority\`/\`test:evidence-export-notarization\` (Ladder 16)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus('CI_CD_CONTRACT.md Ladder 16 / Mission AR notes');
  }
}

// ── assert-gha-contract.js needles (optional mirror of Mission AM/AH/AC/Y) ──────
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ['test:multi-workstation-federation', 'CI Mission AR multi-workstation-federation (AN)'],
    ['test:provider-failover-resilience', 'CI Mission AR provider-failover-resilience (AO)'],
    ['test:hitl-po-authority', 'CI Mission AR hitl-po-authority (AP)'],
    ['test:evidence-export-notarization', 'CI Mission AR evidence-export-notarization (AQ)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
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
      console.error(`patch-mission-ar: could not place assert needle for ${script}`);
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

console.log(changed ? 'patch-mission-ar: applied' : 'patch-mission-ar: no-op (already patched)');
