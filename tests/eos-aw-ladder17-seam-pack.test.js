/**
 * Mission AW / SPEC-0054 — Ladder 17 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER17 = [
  'test:cross-satellite-composition',
  'test:operator-continuity',
  'test:law-vi-broker',
  'test:freeze-drift',
];

const MISSION_ALIASES = [
  'test:mission-as',
  'test:mission-at',
  'test:mission-au',
  'test:mission-av',
];

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

test('AW1: ci.yml seam-pack contains Ladder 17 AS/AT/AU/AV satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER17) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('AW2: package.json scripts for Ladder 17 satellites + mission-aw / aw17 / l17', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER17) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  for (const alias of MISSION_ALIASES) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-aw'],
    'node --test tests/eos-aw-ladder17-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:aw17'],
    'node --test tests/eos-aw-ladder17-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:l17'],
    'node --test tests/eos-aw-ladder17-seam-pack.test.js'
  );
});

test('AW3: ladder17-pack chains AS+AT+AU+AV + test:mission-aw', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:ladder17-pack'], 'string', 'missing test:ladder17-pack');
  for (const s of LADDER17) {
    assert.ok(
      pkg.scripts['test:ladder17-pack'].includes(s),
      'ladder17-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder17-pack'].includes('test:mission-aw'),
    'ladder17-pack must chain test:mission-aw'
  );
});

test('AW4: native-suite-pack extended with Ladder 17 satellites (when present)', () => {
  const pkg = JSON.parse(read('package.json'));
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER17) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
});

test('AW5: primary lock paths seed AS/AT/AU/AV test files', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(
    pkg.scripts['test:cross-satellite-composition'].includes(
      'eos-as-cross-satellite-composition.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:operator-continuity'].includes(
      'eos-at-operator-continuity-crash-recovery.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:law-vi-broker'].includes(
      'eos-au-law-vi-secret-runtime-broker.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:freeze-drift'].includes(
      'eos-av-governed-state-freeze-drift-observer.test.js'
    )
  );
  assert.equal(
    pkg.scripts['test:mission-as'],
    pkg.scripts['test:cross-satellite-composition']
  );
  assert.equal(
    pkg.scripts['test:mission-at'],
    pkg.scripts['test:operator-continuity']
  );
  assert.equal(pkg.scripts['test:mission-au'], pkg.scripts['test:law-vi-broker']);
  assert.equal(pkg.scripts['test:mission-av'], pkg.scripts['test:freeze-drift']);
});

test('AW6: CI_CD_CONTRACT.md mentions Ladder 17 / Mission AW satellites', () => {
  assert.ok(exists('docs/governance/CI_CD_CONTRACT.md'), 'CI_CD_CONTRACT.md missing');
  const md = read('docs/governance/CI_CD_CONTRACT.md');
  assert.ok(
    md.includes('Ladder 17') || md.includes('Mission AW'),
    'contract missing Ladder 17 / Mission AW'
  );
  assert.ok(
    md.includes('test:cross-satellite-composition') ||
      md.includes('test:operator-continuity') ||
      md.includes('test:law-vi-broker') ||
      md.includes('test:freeze-drift') ||
      md.includes('Ladder 17'),
    'contract missing Ladder 17 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
});

test('AW7: Ladder 17 closeout doc exists with CLOSED_FOR_LOCAL_GOVERNED_USE / AS–AV MEASURED / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_17_CLOSEOUT_2026-09-12.md';
  assert.ok(exists(p), 'Ladder 17 closeout missing');
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
    'closeout must mark Ladder 17 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    md.includes('MEASURED') &&
      (md.includes('AS') || md.includes('cross-satellite')) &&
      (md.includes('AT') || md.includes('continuity')) &&
      (md.includes('AU') || md.includes('secret')) &&
      (md.includes('AV') || md.includes('freeze-drift')),
    'closeout must mark AS–AV MEASURED'
  );
});

test('AW8: Mission AW release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_AW_LADDER17_SEAM_PACK_2026-09-12.md';
  assert.ok(exists(p), 'Mission AW release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0054') || md.includes('Mission AW'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:cross-satellite-composition') &&
      md.includes('test:operator-continuity') &&
      md.includes('test:law-vi-broker') &&
      md.includes('test:freeze-drift')
  );
});

test('AW9: OpenSpec Mission AW artifacts exist (SPEC-0054)', () => {
  const base = 'openspec/changes/eos-mission-aw-ladder17-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/ladder17-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0054'));
});

test('AW10: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-aw-ladder17-seam-pack.test.js'") ||
      runner.includes('"eos-aw-ladder17-seam-pack.test.js"'),
    'eos-aw-ladder17-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('AW11: NON-CLAIM markers (continuity≠HA SaaS, composition≠E2E product suite, broker≠vault/KMS, observer≠GH enforcement)', () => {
  const md = read('docs/releases/EOS_LADDER_17_CLOSEOUT_2026-09-12.md');
  assert.ok(
    md.includes('NON-CLAIM') || md.includes('not flipped') || md.includes('≠'),
    'closeout must carry NON-CLAIM / honesty markers'
  );
  assert.ok(
    /continuity/i.test(md) && /HA|multi-region/i.test(md),
    'NON-CLAIM: continuity ≠ HA multi-region SaaS'
  );
  assert.ok(
    /composition/i.test(md) && (/E2E|product suite|PRODUCTION_READY/i.test(md)),
    'NON-CLAIM: composition ≠ E2E product suite'
  );
  assert.ok(
    /broker|secret/i.test(md) && /vault|KMS|cloud/i.test(md),
    'NON-CLAIM: broker ≠ vault/KMS'
  );
  assert.ok(
    /observer|drift/i.test(md) && /auto-merge|GH|enforcement/i.test(md),
    'NON-CLAIM: observer ≠ auto-merge / GH enforcement'
  );
  assert.ok(
    md.includes('PRODUCTION_READY') && md.includes('NO'),
    'NON-CLAIM: PRODUCTION_READY remains NO'
  );
});

test('AW12: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-aw.mjs',
    'tests/eos-aw-ladder17-seam-pack.test.js',
    'docs/releases/EOS_LADDER_17_CLOSEOUT_2026-09-12.md',
    'docs/releases/EOS_MISSION_AW_LADDER17_SEAM_PACK_2026-09-12.md',
    'docs/governance/CI_CD_CONTRACT.ladder17-fragment.md',
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

test('AW13: patcher present and CRLF-safe ([^\\r\\n]* / [\\s\\S] patterns)', () => {
  assert.ok(exists('scripts/patch-mission-aw.mjs'), 'patch-mission-aw.mjs missing');
  const src = read('scripts/patch-mission-aw.mjs');
  assert.ok(src.includes('[^\\r\\n]*') || src.includes('[^\\r\\n]'), 'patcher must use CRLF-safe line matchers');
  assert.ok(src.includes('[\\s\\S]') || src.includes('[\\s\\S]*'), 'patcher must use [\\s\\S] for multi-line Set match');
  assert.ok(src.includes('PRODUCTION_READY'), 'patcher header must note PRODUCTION_READY');
});

test('AW14: assert-gha-contract needles for Ladder 17 (when assert file present)', () => {
  if (!exists('scripts/ci/assert-gha-contract.js')) return;
  const src = read('scripts/ci/assert-gha-contract.js');
  for (const s of LADDER17) {
    assert.ok(
      src.includes("'" + s + "'") || src.includes('"' + s + '"'),
      'assert-gha-contract missing needle ' + s
    );
  }
});

test('AW15: Antigravity-first / CloudAgent out markers in closeout + release', () => {
  const closeout = read('docs/releases/EOS_LADDER_17_CLOSEOUT_2026-09-12.md');
  const release = read('docs/releases/EOS_MISSION_AW_LADDER17_SEAM_PACK_2026-09-12.md');
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
