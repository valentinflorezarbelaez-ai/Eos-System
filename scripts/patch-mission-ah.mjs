#!/usr/bin/env node
/**
 * Mission AH host patcher — idempotently consolidates Ladder 14 AD/AE/AF/AG
 * satellites into CI seam-pack + native-suite-pack + contract notes.
 *
 * Patches:
 *   - .github/workflows/ci.yml seam-pack: append 4 npm run lines if absent
 *   - package.json:
 *       ensure AD/AE/AF/AG primaries + mission aliases
 *       ensure test:autonomous-loop alias -> same file as test:autonomous-execution-loop
 *       extend test:native-suite-pack with the 4 ladder14 scripts
 *       add test:mission-ah / test:ah14
 *       add test:ladder14-pack (chains 4 satellites + mission-ah)
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES += eos-ah-ladder14-seam-pack.test.js
 *   - docs/governance/CI_CD_CONTRACT.md: Ladder 14 closeout note
 *   - scripts/ci/assert-gha-contract.js: needles for the 4 satellites (if file present)
 *
 * CRLF-safe: line matchers use [^\r\n]* (Windows lesson from Mission AC).
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-ah.mjs
 *   node scripts/patch-mission-ah.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution; Law VI: no static provider-secret prefix literals.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CI seam-pack / ladder14-pack script names (user-facing AF alias). */
const LADDER14 = [
  'test:llm-provider-port',
  'test:token-budget-ecr',
  'test:autonomous-loop',
  'test:live-tool-engine',
];

/**
 * Primary script -> mission alias + lock command (for alias seeding if absent).
 * AF special: primary is test:autonomous-execution-loop; CI/user alias is test:autonomous-loop.
 */
const SATELLITE_SEED = {
  'test:llm-provider-port': {
    aliases: ['test:mission-ad'],
    lock: 'node --test tests/eos-ad-llm-provider-port.test.js',
  },
  'test:token-budget-ecr': {
    aliases: ['test:mission-ae'],
    lock: 'node --test tests/eos-ae-token-budget-ecr.test.js',
  },
  'test:autonomous-execution-loop': {
    aliases: ['test:autonomous-loop', 'test:mission-af'],
    lock: 'node --test tests/eos-af-autonomous-execution-loop.test.js',
  },
  'test:live-tool-engine': {
    aliases: ['test:mission-ag'],
    lock: 'node --test tests/eos-ag-live-tool-engine.test.js',
  },
};

const EXCLUDE = 'eos-ah-ladder14-seam-pack.test.js';
const LOCK_SCRIPT = 'node --test tests/eos-ah-ladder14-seam-pack.test.js';
const LADDER14_PACK =
  'npm run test:llm-provider-port && npm run test:token-budget-ecr && npm run test:autonomous-loop && npm run test:live-tool-engine && npm run test:mission-ah';

const CONTRACT_NOTE = `
## AH / Mission AH Ladder 14 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 14 satellites: \`test:llm-provider-port\` (AD), \`test:token-budget-ecr\` (AE), \`test:autonomous-loop\` (AF; alias of \`test:autonomous-execution-loop\`), \`test:live-tool-engine\` (AG). Keep prior native-suite + packs (incl. Ladder 12/13). Local aliases: \`test:ladder14-pack\`, \`test:mission-ah\` / \`test:ah14\`. Lock basename \`eos-ah-ladder14-seam-pack.test.js\` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals.

## Ladder 14 note (2026-09-12)
Ladder 14 closeout: AD (LLM provider port) + AE (token-budget ECR) + AF (autonomous execution loop) + AG (live tool engine) consolidated into CI seam-pack (SPEC-0039 / Mission AH). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See \`docs/releases/EOS_LADDER_14_CLOSEOUT_2026-09-12.md\`.
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
  console.error(`patch-mission-ah: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
let pkgChanged = false;

// Ensure primary satellite scripts + aliases (incl. AF autonomous-loop)
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
    } else if (pkg.scripts[alias] !== want && alias === 'test:autonomous-loop') {
      // Force AF CI alias to match primary lock file
      pkg.scripts[alias] = want;
      pkgChanged = true;
      logPlus(`package.json scripts.${alias} (alias aligned to autonomous-execution-loop)`);
    } else {
      logEq(`package.json scripts.${alias} (already present)`);
    }
  }
}

// Extend test:native-suite-pack with L14 CI scripts
{
  const key = 'test:native-suite-pack';
  let val = pkg.scripts[key] || '';
  if (!val) {
    val = LADDER14.map((s) => `npm run ${s}`).join(' && ');
    pkg.scripts[key] = val;
    pkgChanged = true;
    logPlus(`package.json scripts.${key} (seeded with Ladder 14)`);
  } else {
    let next = val;
    for (const s of LADDER14) {
      if (!next.includes(s)) {
        next = `${next} && npm run ${s}`;
      }
    }
    if (next !== val) {
      pkg.scripts[key] = next;
      pkgChanged = true;
      logPlus(`package.json scripts.${key} (+ Ladder 14)`);
    } else {
      logEq(`package.json scripts.${key} (already has Ladder 14)`);
    }
  }
}

const SCRIPT_ADDS = {
  'test:mission-ah': LOCK_SCRIPT,
  'test:ah14': LOCK_SCRIPT,
  'test:ladder14-pack': LADDER14_PACK,
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
  console.error(`patch-mission-ah: ci.yml not found at ${ciPath}`);
  process.exit(1);
}
{
  let yaml = fs.readFileSync(ciPath, 'utf8');
  if (!/^  seam-pack:/m.test(yaml)) {
    console.error('patch-mission-ah: seam-pack job not found in ci.yml');
    process.exit(1);
  }
  const missing = LADDER14.filter((s) => !yaml.includes(`npm run ${s}`));
  if (missing.length === 0) {
    logEq('ci.yml seam-pack (Ladder 14 satellites already present)');
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
        console.error('patch-mission-ah: could not locate npm run lines in ci.yml');
        process.exit(1);
      }
      const lineEnd = yaml.indexOf('\n', lastNpm);
      const at = lineEnd === -1 ? yaml.length : lineEnd;
      yaml = `${yaml.slice(0, at)}\n${lines}${yaml.slice(at)}`;
    }

    // CRLF-safe: [^\r\n]* not [^\n]* (Windows lesson from Mission AC)
    yaml = yaml.replace(
      /(Named ROI \/ Ladder seam pack[^\r\n]*)/,
      (m) =>
        m.includes('Ladder 14') || m.includes('llm-provider-port')
          ? m
          : `${m} + Ladder 14 AD/AE/AF/AG`
    );

    fs.writeFileSync(ciPath, yaml, 'utf8');
    logPlus(`ci.yml seam-pack (+ ${missing.join(', ')})`);
  }
}

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-ah: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
{
  let runner = fs.readFileSync(runnerPath, 'utf8');
  if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
    logEq(`SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
  } else {
    const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
    if (!re.test(runner)) {
      console.error('patch-mission-ah: could not locate SLIM_SUITE_EXCLUDES Set');
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
  console.error(`patch-mission-ah: CI_CD_CONTRACT.md not found at ${contractPath}`);
  process.exit(1);
}
{
  let md = fs.readFileSync(contractPath, 'utf8');
  const hasNote =
    md.includes('Ladder 14') &&
    (md.includes('test:llm-provider-port') || md.includes('Mission AH'));
  if (hasNote) {
    logEq('CI_CD_CONTRACT.md Ladder 14 note (already present)');
  } else {
    if (
      md.includes('| seam-pack |') &&
      !md.includes('test:llm-provider-port') &&
      !md.includes('test:live-tool-engine')
    ) {
      // CRLF-safe row match
      md = md.replace(
        /(\| seam-pack \|[^\r\n]*?)( \| Forbidden \|)/,
        (m, row, tail) => {
          if (row.includes('test:llm-provider-port')) return m;
          return `${row} + \`test:llm-provider-port\`/\`test:token-budget-ecr\`/\`test:autonomous-loop\`/\`test:live-tool-engine\` (Ladder 14)${tail}`;
        }
      );
    }
    if (!md.endsWith('\n')) md += '\n';
    md += `\n${CONTRACT_NOTE}`;
    if (!md.endsWith('\n')) md += '\n';
    fs.writeFileSync(contractPath, md, 'utf8');
    logPlus('CI_CD_CONTRACT.md Ladder 14 / Mission AH notes');
  }
}

// ── assert-gha-contract.js needles (optional mirror of Mission AC/Y) ─────────
const assertPath = path.join(root, 'scripts', 'ci', 'assert-gha-contract.js');
if (fs.existsSync(assertPath)) {
  let src = fs.readFileSync(assertPath, 'utf8');
  const needles = [
    ['test:llm-provider-port', 'CI Mission AH llm-provider-port (AD)'],
    ['test:token-budget-ecr', 'CI Mission AH token-budget-ecr (AE)'],
    ['test:autonomous-loop', 'CI Mission AH autonomous-loop (AF)'],
    ['test:live-tool-engine', 'CI Mission AH live-tool-engine (AG)'],
  ];
  let assertChanged = false;
  for (const [script, label] of needles) {
    if (src.includes(`'${script}'`) || src.includes(`"${script}"`)) {
      logEq(`assert-gha-contract.js needle ${script}`);
      continue;
    }
    const insertLine = `        assertContains(yaml, '${script}', '${label}');\n`;
    const anchors = [
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
      console.error(`patch-mission-ah: could not place assert needle for ${script}`);
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

console.log(changed ? 'patch-mission-ah: applied' : 'patch-mission-ah: no-op (already patched)');
