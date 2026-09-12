/**
 * Mission AC / SPEC-0034 — Ladder 13 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER13 = [
  'test:target-flight',
  'test:multi-agent-swarm',
  'test:telemetry-server',
];

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

test('AC1: ci.yml seam-pack contains Ladder 13 Z/AA/AB satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER13) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('AC2: package.json scripts for Ladder 13 satellites + mission-ac / ac13', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER13) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  // mission-z / mission-aa / mission-ab aliases should exist (patcher seeds if missing)
  for (const alias of ['test:mission-z', 'test:mission-aa', 'test:mission-ab']) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-ac'],
    'node --test tests/eos-ac-ladder13-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:ac13'],
    'node --test tests/eos-ac-ladder13-seam-pack.test.js'
  );
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER13) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
  if (typeof pkg.scripts['test:ladder13-pack'] === 'string') {
    for (const s of LADDER13) {
      assert.ok(
        pkg.scripts['test:ladder13-pack'].includes(s),
        'ladder13-pack missing ' + s
      );
    }
  }
});

test('AC3: CI_CD_CONTRACT.md mentions Ladder 13 / Mission AC satellites', () => {
  assert.ok(exists('docs/governance/CI_CD_CONTRACT.md'), 'CI_CD_CONTRACT.md missing');
  const md = read('docs/governance/CI_CD_CONTRACT.md');
  assert.ok(
    md.includes('Ladder 13') || md.includes('Mission AC'),
    'contract missing Ladder 13 / Mission AC'
  );
  assert.ok(
    md.includes('test:target-flight') ||
      md.includes('test:multi-agent-swarm') ||
      md.includes('test:telemetry-server') ||
      md.includes('Ladder 13'),
    'contract missing Ladder 13 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
});

test('AC4: Ladder 13 closeout doc exists with PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_13_CLOSEOUT_2026-09-12.md';
  assert.ok(exists(p), 'Ladder 13 closeout missing');
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
    'closeout must mark Ladder 13 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    md.includes('target-flight') ||
      md.includes('multi-agent-swarm') ||
      md.includes('telemetry-server') ||
      (md.includes('Z') && md.includes('AA') && md.includes('AB')),
    'closeout must summarize Z/AA/AB'
  );
});

test('AC5: Mission AC release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_AC_LADDER13_SEAM_PACK_2026-09-12.md';
  assert.ok(exists(p), 'Mission AC release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0034') || md.includes('Mission AC'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:target-flight') &&
      md.includes('test:multi-agent-swarm') &&
      md.includes('test:telemetry-server')
  );
});

test('AC6: OpenSpec Mission AC artifacts exist (SPEC-0034)', () => {
  const base = 'openspec/changes/eos-mission-ac-ladder13-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/ladder13-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0034'));
});

test('AC7: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-ac-ladder13-seam-pack.test.js'") ||
      runner.includes('"eos-ac-ladder13-seam-pack.test.js"'),
    'eos-ac-ladder13-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('AC8: no continue-on-error; Fundacion freeze kept', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);
});
