/**
 * Mission AM / SPEC-0044 — Ladder 15 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER15 = [
  'test:multi-session-autonomy',
  'test:evidence-economy-ledger',
  'test:constitution-runtime-policy-gate',
  'test:autonomy-replay-forensic-observer',
];

const MISSION_ALIASES = [
  'test:mission-ai',
  'test:mission-aj',
  'test:mission-ak',
  'test:mission-al',
];

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

test('AM1: ci.yml seam-pack contains Ladder 15 AI/AJ/AK/AL satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER15) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('AM2: package.json scripts for Ladder 15 satellites + mission-am / am15', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER15) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  for (const alias of MISSION_ALIASES) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-am'],
    'node --test tests/eos-am-ladder15-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:am15'],
    'node --test tests/eos-am-ladder15-seam-pack.test.js'
  );
});

test('AM3: ladder15-pack chains AI+AJ+AK+AL + test:mission-am', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:ladder15-pack'], 'string', 'missing test:ladder15-pack');
  for (const s of LADDER15) {
    assert.ok(
      pkg.scripts['test:ladder15-pack'].includes(s),
      'ladder15-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder15-pack'].includes('test:mission-am'),
    'ladder15-pack must chain test:mission-am'
  );
});

test('AM4: native-suite-pack extended with Ladder 15 satellites (when present)', () => {
  const pkg = JSON.parse(read('package.json'));
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER15) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
});

test('AM5: primary lock paths seed AI/AJ/AK/AL test files', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(
    pkg.scripts['test:multi-session-autonomy'].includes('eos-ai-multi-session-autonomy.test.js')
  );
  assert.ok(
    pkg.scripts['test:evidence-economy-ledger'].includes('eos-aj-evidence-economy-ledger.test.js')
  );
  assert.ok(
    pkg.scripts['test:constitution-runtime-policy-gate'].includes(
      'eos-ak-constitution-runtime-policy-gate.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:autonomy-replay-forensic-observer'].includes(
      'eos-al-autonomy-replay-forensic-observer.test.js'
    )
  );
  assert.equal(
    pkg.scripts['test:mission-ai'],
    pkg.scripts['test:multi-session-autonomy']
  );
  assert.equal(
    pkg.scripts['test:mission-aj'],
    pkg.scripts['test:evidence-economy-ledger']
  );
  assert.equal(
    pkg.scripts['test:mission-ak'],
    pkg.scripts['test:constitution-runtime-policy-gate']
  );
  assert.equal(
    pkg.scripts['test:mission-al'],
    pkg.scripts['test:autonomy-replay-forensic-observer']
  );
});

test('AM6: CI_CD_CONTRACT.md mentions Ladder 15 / Mission AM satellites', () => {
  assert.ok(exists('docs/governance/CI_CD_CONTRACT.md'), 'CI_CD_CONTRACT.md missing');
  const md = read('docs/governance/CI_CD_CONTRACT.md');
  assert.ok(
    md.includes('Ladder 15') || md.includes('Mission AM'),
    'contract missing Ladder 15 / Mission AM'
  );
  assert.ok(
    md.includes('test:multi-session-autonomy') ||
      md.includes('test:evidence-economy-ledger') ||
      md.includes('test:constitution-runtime-policy-gate') ||
      md.includes('test:autonomy-replay-forensic-observer') ||
      md.includes('Ladder 15'),
    'contract missing Ladder 15 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
});

test('AM7: Ladder 15 closeout doc exists with CLOSED_FOR_LOCAL_GOVERNED_USE / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_15_CLOSEOUT_2026-09-12.md';
  assert.ok(exists(p), 'Ladder 15 closeout missing');
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
    md.includes('CLOSED_FOR_LOCAL_GOVERNED_USE') ||
      md.includes('CLOSED_FOR_LOCAL'),
    'closeout must mark Ladder 15 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    (md.includes('multi-session') || md.includes('AI')) &&
      (md.includes('evidence-economy') || md.includes('AJ')) &&
      (md.includes('constitution') || md.includes('AK')) &&
      (md.includes('autonomy-replay') || md.includes('AL')),
    'closeout must summarize AI/AJ/AK/AL'
  );
});

test('AM8: Mission AM release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_AM_LADDER15_SEAM_PACK_2026-09-12.md';
  assert.ok(exists(p), 'Mission AM release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0044') || md.includes('Mission AM'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:multi-session-autonomy') &&
      md.includes('test:evidence-economy-ledger') &&
      md.includes('test:constitution-runtime-policy-gate') &&
      md.includes('test:autonomy-replay-forensic-observer')
  );
});

test('AM9: OpenSpec Mission AM artifacts exist (SPEC-0044)', () => {
  const base = 'openspec/changes/eos-mission-am-ladder15-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/ladder15-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0044'));
});

test('AM10: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-am-ladder15-seam-pack.test.js'") ||
      runner.includes('"eos-am-ladder15-seam-pack.test.js"'),
    'eos-am-ladder15-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('AM11: NON-CLAIM markers present in closeout (CI ≠ production / ≠ GH enforcement)', () => {
  const md = read('docs/releases/EOS_LADDER_15_CLOSEOUT_2026-09-12.md');
  assert.ok(
    md.includes('NON-CLAIM') || md.includes('not flipped') || md.includes('≠'),
    'closeout must carry NON-CLAIM / honesty markers'
  );
  assert.ok(
    /GH|branch-protection|enforcement|billing/i.test(md),
    'closeout must disclaim GH enforcement / billing'
  );
  assert.ok(
    md.includes('PRODUCTION_READY') && md.includes('NO'),
    'NON-CLAIM: PRODUCTION_READY remains NO'
  );
});

test('AM12: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-am.mjs',
    'tests/eos-am-ladder15-seam-pack.test.js',
    'docs/releases/EOS_LADDER_15_CLOSEOUT_2026-09-12.md',
    'docs/releases/EOS_MISSION_AM_LADDER15_SEAM_PACK_2026-09-12.md',
    'docs/governance/CI_CD_CONTRACT.ladder15-fragment.md',
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
});

test('AM13: patcher present and CRLF-safe ([^\\r\\n]* / [\\s\\S] patterns)', () => {
  assert.ok(exists('scripts/patch-mission-am.mjs'), 'patch-mission-am.mjs missing');
  const src = read('scripts/patch-mission-am.mjs');
  assert.ok(src.includes('[^\\r\\n]*') || src.includes('[^\\r\\n]'), 'patcher must use CRLF-safe line matchers');
  assert.ok(src.includes('[\\s\\S]') || src.includes('[\\s\\S]*'), 'patcher must use [\\s\\S] for multi-line Set match');
  assert.ok(src.includes('PRODUCTION_READY'), 'patcher header must note PRODUCTION_READY');
});

test('AM14: assert-gha-contract needles for Ladder 15 (when assert file present)', () => {
  if (!exists('scripts/ci/assert-gha-contract.js')) return;
  const src = read('scripts/ci/assert-gha-contract.js');
  for (const s of LADDER15) {
    assert.ok(
      src.includes("'" + s + "'") || src.includes('"' + s + '"'),
      'assert-gha-contract missing needle ' + s
    );
  }
});
