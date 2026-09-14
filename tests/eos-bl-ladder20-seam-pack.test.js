/**
 * Mission BL / SPEC-0069 — Ladder 20 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 * L17 CLOSED — never reopen. L18 CLOSED — never reopen. L19 CLOSED — never reopen.
 * After BL, Ladder 20 is CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L20 after closeout.
 * Tip honesty ritual deferred to post-BL tip refresh (not this mission).
 * Receipt integrity: BH-RCPT-* / BI-RCPT-* / BJ-RCPT-* / BK-RCPT-*.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER20 = [
  'test:mission-bh',
  'test:mission-bi',
  'test:mission-bj',
  'test:mission-bk',
];

const MISSION_ALIASES = [
  'test:mission-lifecycle',
  'test:cross-session-continuity',
  'test:operator-dashboard-hud',
  'test:governed-external-write',
];

const SATELLITE_LOCKS = {
  'test:mission-bh': 'eos-bh-mission-lifecycle-state-machine.test.js',
  'test:mission-bi': 'eos-bi-cross-session-continuity-replay-fabric.test.js',
  'test:mission-bj': 'eos-bj-operator-dashboard-hud-fabric.test.js',
  'test:mission-bk': 'eos-bk-governed-external-write-orchestrator.test.js',
};

const RECEIPT_PREFIXES = {
  'tests/eos-bh-mission-lifecycle-state-machine.test.js': 'BH-RCPT-',
  'tests/eos-bi-cross-session-continuity-replay-fabric.test.js': 'BI-RCPT-',
  'tests/eos-bj-operator-dashboard-hud-fabric.test.js': 'BJ-RCPT-',
  'tests/eos-bk-governed-external-write-orchestrator.test.js': 'BK-RCPT-',
};

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

function resolveContractRel() {
  if (exists('docs/governance/CI_CD_CONTRACT.md')) return 'docs/governance/CI_CD_CONTRACT.md';
  if (exists('docs/releases/CI_CD_CONTRACT.md')) return 'docs/releases/CI_CD_CONTRACT.md';
  return 'docs/governance/CI_CD_CONTRACT.md';
}

test('BL1: ci.yml seam-pack contains Ladder 20 BH/BI/BJ/BK satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER20) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('BL2: package.json scripts for Ladder 20 satellites + mission-bl / bl20 / l20', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER20) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  for (const alias of MISSION_ALIASES) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-bl'],
    'node --test tests/eos-bl-ladder20-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:bl20'],
    'node --test tests/eos-bl-ladder20-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:l20'],
    'node --test tests/eos-bl-ladder20-seam-pack.test.js'
  );
});

test('BL3: ladder20-pack chains BH+BI+BJ+BK + test:mission-bl', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:ladder20-pack'], 'string', 'missing test:ladder20-pack');
  for (const s of LADDER20) {
    assert.ok(
      pkg.scripts['test:ladder20-pack'].includes(s),
      'ladder20-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder20-pack'].includes('test:mission-bl'),
    'ladder20-pack must chain test:mission-bl'
  );
  assert.equal(
    pkg.scripts['test:ladder20-pack'],
    'npm run test:mission-bh && npm run test:mission-bi && npm run test:mission-bj && npm run test:mission-bk && npm run test:mission-bl'
  );
});

test('BL4: native-suite-pack extended with Ladder 20 satellites (when present)', () => {
  const pkg = JSON.parse(read('package.json'));
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER20) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
});

test('BL5: primary lock paths seed BH/BI/BJ/BK test files + aliases aligned', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const [script, lock] of Object.entries(SATELLITE_LOCKS)) {
    assert.ok(
      pkg.scripts[script].includes(lock),
      script + ' must point at ' + lock
    );
  }
  assert.equal(pkg.scripts['test:mission-lifecycle'], pkg.scripts['test:mission-bh']);
  assert.equal(pkg.scripts['test:cross-session-continuity'], pkg.scripts['test:mission-bi']);
  assert.equal(pkg.scripts['test:operator-dashboard-hud'], pkg.scripts['test:mission-bj']);
  assert.equal(pkg.scripts['test:governed-external-write'], pkg.scripts['test:mission-bk']);
});

test('BL6: CI_CD_CONTRACT.md + fragment mention Ladder 20 / Mission BL satellites', () => {
  const contractRel = resolveContractRel();
  assert.ok(exists(contractRel), 'CI_CD_CONTRACT.md missing');
  const md = read(contractRel);
  assert.ok(
    md.includes('Ladder 20') || md.includes('Mission BL'),
    'contract missing Ladder 20 / Mission BL'
  );
  assert.ok(
    md.includes('test:mission-bh') ||
      md.includes('test:mission-bi') ||
      md.includes('test:mission-bj') ||
      md.includes('test:mission-bk') ||
      md.includes('Ladder 20'),
    'contract missing Ladder 20 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
  const frag = 'docs/governance/CI_CD_CONTRACT.ladder20-fragment.md';
  assert.ok(exists(frag), 'ladder20 contract fragment missing');
  const fragMd = read(frag);
  assert.ok(
    fragMd.includes('Ladder 20') &&
      (fragMd.includes('test:mission-bh') || fragMd.includes('Mission BL')),
    'fragment must document Ladder 20 / Mission BL'
  );
});

test('BL7: Ladder 20 closeout doc exists with CLOSED_FOR_LOCAL_GOVERNED_USE / BH–BK+BL MEASURED / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md';
  assert.ok(exists(p), 'Ladder 20 closeout missing');
  const md = read(p);
  assert.ok(
    /PRODUCTION_READY\s*[:=]\s*\*?NO\*?/i.test(md) ||
      (md.includes('PRODUCTION_READY') && md.includes('NO')),
    'closeout must state PRODUCTION_READY=NO'
  );
  assert.ok(
    md.includes('Fundacion') &&
      (md.includes('Δ=0') || md.includes('Delta=0') || md.includes('delta-0') || md.includes('delta 0')),
    'closeout must state Fundacion Δ=0'
  );
  assert.ok(md.includes('COMPLETE_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(
    md.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'),
    'closeout must mark Ladder 20 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    md.includes('MEASURED') &&
      (md.includes('BH') || md.includes('lifecycle')) &&
      (md.includes('BI') || md.includes('cross-session') || md.includes('continuity')) &&
      (md.includes('BJ') || md.includes('dashboard') || md.includes('HUD')) &&
      (md.includes('BK') || md.includes('external-write') || md.includes('orchestrator')) &&
      (md.includes('BL') || md.includes('seam-pack')),
    'closeout must mark BH+BI+BJ+BK+BL MEASURED'
  );
  assert.ok(
    /Sovereign Mission Continuity & Operator Fabric/i.test(md),
    'closeout must name the L20 axis'
  );
});

test('BL8: Mission BL release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_BL_LADDER20_SEAM_PACK_2026-09-14.md';
  assert.ok(exists(p), 'Mission BL release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0069') || md.includes('Mission BL'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:mission-bh') &&
      md.includes('test:mission-bi') &&
      md.includes('test:mission-bj') &&
      md.includes('test:mission-bk')
  );
});

test('BL9: OpenSpec Mission BL artifacts exist (SPEC-0069)', () => {
  const base = 'openspec/changes/eos-ladder-20-mission-bl';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/mission-bl-ladder20-closeout-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0069'));
});

test('BL10: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-bl-ladder20-seam-pack.test.js'") ||
      runner.includes('"eos-bl-ladder20-seam-pack.test.js"'),
    'eos-bl-ladder20-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('BL11: NON-CLAIM markers (GH Team/enforcement, PRODUCTION_READY, L20 satellite fences)', () => {
  const md = read('docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md');
  assert.ok(
    md.includes('NON-CLAIM') || md.includes('not flipped') || md.includes('≠'),
    'closeout must carry NON-CLAIM / honesty markers'
  );
  assert.ok(
    /GH Team|Enterprise|enforcement/i.test(md),
    'NON-CLAIM: seam-pack ≠ GH Team/Enterprise enforcement'
  );
  assert.ok(
    md.includes('PRODUCTION_READY') && md.includes('NO'),
    'NON-CLAIM: PRODUCTION_READY remains NO'
  );
  assert.ok(
    /lifecycle|state machine/i.test(md) &&
      (/PM SaaS|Jira/i.test(md)),
    'NON-CLAIM: mission lifecycle ≠ full PM SaaS / Jira replacement'
  );
  assert.ok(
    /cross-session|continuity/i.test(md) &&
      (/HA multi-region|distributed clustering/i.test(md)),
    'NON-CLAIM: cross-session continuity ≠ HA multi-region SaaS / distributed clustering'
  );
  assert.ok(
    /HUD|dashboard/i.test(md) &&
      (/observability SaaS|Grafana|Datadog/i.test(md)),
    'NON-CLAIM: operator HUD ≠ full observability SaaS / Grafana/Datadog replacement'
  );
  assert.ok(
    /external write|orchestrator/i.test(md) &&
      (/unsupervised fleet|K8s|Kubernetes/i.test(md)),
    'NON-CLAIM: governed external write ≠ unsupervised fleet deploy / K8s CD'
  );
});

test('BL12: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-bl.mjs',
    'tests/eos-bl-ladder20-seam-pack.test.js',
    'docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md',
    'docs/releases/EOS_MISSION_BL_LADDER20_SEAM_PACK_2026-09-14.md',
    'docs/governance/CI_CD_CONTRACT.ladder20-fragment.md',
    'docs/adrs/ADR-0028-mission-bl-ladder20-closeout-seam-pack.md',
    'docs/evidence/EOS_MISSION_BL_EVIDENCE_2026-09-14.md',
  ];
  for (const rel of scanRels) {
    if (!exists(rel)) continue;
    const body = read(rel);
    assert.equal(
      body.includes(forbiddenPrefix),
      false,
      'Law VI violation: static provider-secret prefix literal in ' + rel
    );
  }

  // Law VI MODULE_DIR: Mission BL ships no src/ modules (docs+scripts closeout).
  // Scan only BL touchpoints above — never whole-repo src/ (pre-existing unrelated files).
});

test('BL13: patcher present and CRLF-safe ([^\\r\\n]* / [\\s\\S] patterns)', () => {
  assert.ok(exists('scripts/patch-mission-bl.mjs'), 'patch-mission-bl.mjs missing');
  const src = read('scripts/patch-mission-bl.mjs');
  assert.ok(src.includes('[^\\r\\n]*') || src.includes('[^\\r\\n]'), 'patcher must use CRLF-safe line matchers');
  assert.ok(src.includes('[\\s\\S]') || src.includes('[\\s\\S]*'), 'patcher must use [\\s\\S] for multi-line Set match');
  assert.ok(src.includes('PRODUCTION_READY'), 'patcher header must note PRODUCTION_READY');
});

test('BL14: assert-gha-contract needles for Ladder 20 (when assert file present)', () => {
  if (!exists('scripts/ci/assert-gha-contract.js')) return;
  const src = read('scripts/ci/assert-gha-contract.js');
  for (const s of LADDER20) {
    assert.ok(
      src.includes("'" + s + "'") || src.includes('"' + s + '"'),
      'assert-gha-contract missing needle ' + s
    );
  }
});

test('BL15: Antigravity-first / CloudAgent out markers in closeout + release', () => {
  const closeout = read('docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md');
  const release = read('docs/releases/EOS_MISSION_BL_LADDER20_SEAM_PACK_2026-09-14.md');
  for (const md of [closeout, release]) {
    assert.ok(
      /Antigravity-first/i.test(md) || /CloudAgent/i.test(md),
      'docs must mark Antigravity-first / CloudAgent out'
    );
    assert.ok(
      /CloudAgent/i.test(md) && (/out|OUT|forbidden|no Cursor/i.test(md)),
      'docs must explicitly put CloudAgent out'
    );
  }
});

test('BL16: tip honesty deferred; Expected tip StartsWith dd225d9 documented', () => {
  const closeout = read('docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md');
  assert.ok(
    /tip honesty|post-BL tip refresh|deferred/i.test(closeout),
    'closeout must defer tip honesty to post-BL tip refresh'
  );
  assert.ok(
    closeout.includes('dd225d9'),
    'closeout must document Expected tip StartsWith dd225d9'
  );
});

test('BL17: L17/L18/L19 CLOSED never-reopen; L20 CLOSED_FOR_LOCAL_GOVERNED_USE (never left OPEN)', () => {
  const closeout = read('docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md');
  const release = read('docs/releases/EOS_MISSION_BL_LADDER20_SEAM_PACK_2026-09-14.md');
  for (const md of [closeout, release]) {
    assert.ok(
      /L17|Ladder 17/i.test(md) && /never reopen|CLOSED/i.test(md),
      'L17 CLOSED — never reopen'
    );
    assert.ok(
      /L18|Ladder 18/i.test(md) && /never reopen|CLOSED/i.test(md),
      'L18 CLOSED — never reopen'
    );
    assert.ok(
      /L19|Ladder 19/i.test(md) && /never reopen|CLOSED/i.test(md),
      'L19 CLOSED — never reopen'
    );
    assert.ok(
      md.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'),
      'docs must mark L20 CLOSED_FOR_LOCAL_GOVERNED_USE'
    );
    assert.equal(
      /L20 stays OPEN|L20 remains OPEN|L20:\s*\*?\*?OPEN\b|Ladder 20\s+(is\s+)?\*?\*?OPEN\b/i.test(md),
      false,
      'BL docs must not leave Ladder 20 OPEN after closeout'
    );
  }
});

test('BL18: dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE + ADR-0028 rejected alts', () => {
  const closeout = read('docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md');
  assert.ok(
    closeout.includes('COMPLETE_FOR_LOCAL_GOVERNED_USE'),
    'closeout must carry dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE'
  );
  const adrRel = 'docs/adrs/ADR-0028-mission-bl-ladder20-closeout-seam-pack.md';
  assert.ok(exists(adrRel), 'ADR-0028 missing');
  const adr = read(adrRel);
  assert.ok(/Decision/i.test(adr), 'ADR must have Decision');
  assert.ok(/Consequences/i.test(adr), 'ADR must have Consequences');
  assert.ok(/NON-CLAIM/i.test(adr), 'ADR must have NON-CLAIM');
  assert.ok(/soak/i.test(adr) && /continue-on-error/i.test(adr), 'ADR reject: soak/continue-on-error pack');
  assert.ok(
    /PRODUCTION_READY\s*=\s*YES|PRODUCTION_READY=YES/i.test(adr),
    'ADR reject: PRODUCTION_READY=YES flip'
  );
  assert.ok(
    /reopen(ing)? L20/i.test(adr),
    'ADR reject: reopening L20 after closeout'
  );
  assert.ok(
    /soft-fail|soft fail/i.test(adr),
    'ADR reject: soft-fail seam-pack'
  );
});

test('BL19: receipt integrity prefixes BH-RCPT-* / BI-RCPT-* / BJ-RCPT-* / BK-RCPT-* in satellite locks', () => {
  for (const [rel, prefix] of Object.entries(RECEIPT_PREFIXES)) {
    assert.ok(exists(rel), 'satellite lock missing: ' + rel + ' (seed fixture or host copy)');
    const body = read(rel);
    assert.ok(
      body.includes(prefix),
      rel + ' must document receipt prefix ' + prefix
    );
  }
});

test('BL20: Layer 0 purity / fail-closed — no soft-fail / FUNDACION_ALWAYS_DENY held in closeout', () => {
  const closeout = read('docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md');
  assert.ok(
    /fail-closed|no continue-on-error|No soak/i.test(closeout),
    'closeout must affirm fail-closed / no soak / no continue-on-error'
  );
  assert.ok(
    /FUNDACION_ALWAYS_DENY|Fundacion.*Δ=0|Fundacion delta-0/i.test(closeout),
    'closeout must affirm Fundacion Δ=0 / ALWAYS_DENY posture'
  );
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  assert.equal(/soft-fail/i.test(yaml), false);
});
