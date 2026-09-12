/**
 * Mission AH / SPEC-0039 — Ladder 14 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER14 = [
  'test:llm-provider-port',
  'test:token-budget-ecr',
  'test:autonomous-loop',
  'test:live-tool-engine',
];

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

test('AH1: ci.yml seam-pack contains Ladder 14 AD/AE/AF/AG satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER14) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('AH2: package.json scripts for Ladder 14 satellites + mission-ah / ah14 + AF alias', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER14) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  // AF: both primary and CI alias must exist and share the same lock file
  assert.equal(
    typeof pkg.scripts['test:autonomous-execution-loop'],
    'string',
    'missing primary test:autonomous-execution-loop'
  );
  assert.equal(
    pkg.scripts['test:autonomous-loop'],
    pkg.scripts['test:autonomous-execution-loop'],
    'test:autonomous-loop must alias test:autonomous-execution-loop'
  );
  assert.ok(
    pkg.scripts['test:autonomous-loop'].includes('eos-af-autonomous-execution-loop.test.js'),
    'AF alias must point at eos-af-autonomous-execution-loop.test.js'
  );
  for (const alias of ['test:mission-ad', 'test:mission-ae', 'test:mission-af', 'test:mission-ag']) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-ah'],
    'node --test tests/eos-ah-ladder14-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:ah14'],
    'node --test tests/eos-ah-ladder14-seam-pack.test.js'
  );
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER14) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
  assert.equal(typeof pkg.scripts['test:ladder14-pack'], 'string', 'missing test:ladder14-pack');
  for (const s of LADDER14) {
    assert.ok(
      pkg.scripts['test:ladder14-pack'].includes(s),
      'ladder14-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder14-pack'].includes('test:mission-ah'),
    'ladder14-pack must chain test:mission-ah'
  );
});

test('AH3: CI_CD_CONTRACT.md mentions Ladder 14 / Mission AH satellites', () => {
  assert.ok(exists('docs/governance/CI_CD_CONTRACT.md'), 'CI_CD_CONTRACT.md missing');
  const md = read('docs/governance/CI_CD_CONTRACT.md');
  assert.ok(
    md.includes('Ladder 14') || md.includes('Mission AH'),
    'contract missing Ladder 14 / Mission AH'
  );
  assert.ok(
    md.includes('test:llm-provider-port') ||
      md.includes('test:token-budget-ecr') ||
      md.includes('test:autonomous-loop') ||
      md.includes('test:live-tool-engine') ||
      md.includes('Ladder 14'),
    'contract missing Ladder 14 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
});

test('AH4: Ladder 14 closeout doc exists with PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_14_CLOSEOUT_2026-09-12.md';
  assert.ok(exists(p), 'Ladder 14 closeout missing');
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
    'closeout must mark Ladder 14 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    (md.includes('llm-provider-port') || md.includes('AD')) &&
      (md.includes('token-budget') || md.includes('AE')) &&
      (md.includes('autonomous') || md.includes('AF')) &&
      (md.includes('live-tool') || md.includes('AG')),
    'closeout must summarize AD/AE/AF/AG'
  );
});

test('AH5: Mission AH release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_AH_LADDER14_SEAM_PACK_2026-09-12.md';
  assert.ok(exists(p), 'Mission AH release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0039') || md.includes('Mission AH'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:llm-provider-port') &&
      md.includes('test:token-budget-ecr') &&
      md.includes('test:autonomous-loop') &&
      md.includes('test:live-tool-engine')
  );
});

test('AH6: OpenSpec Mission AH artifacts exist (SPEC-0039)', () => {
  const base = 'openspec/changes/eos-mission-ah-ladder14-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/ladder14-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0039'));
});

test('AH7: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-ah-ladder14-seam-pack.test.js'") ||
      runner.includes('"eos-ah-ladder14-seam-pack.test.js"'),
    'eos-ah-ladder14-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('AH8: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-ah.mjs',
    'tests/eos-ah-ladder14-seam-pack.test.js',
    'docs/releases/EOS_LADDER_14_CLOSEOUT_2026-09-12.md',
    'docs/releases/EOS_MISSION_AH_LADDER14_SEAM_PACK_2026-09-12.md',
    'docs/governance/CI_CD_CONTRACT.ladder14-fragment.md',
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
