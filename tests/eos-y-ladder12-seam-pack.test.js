/**
 * Mission Y / SPEC-0030 — Ladder 12 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER12 = [
  'test:fdir-remediation',
  'test:sovereign-session',
  'test:developer-shell',
];

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

test('Y1: ci.yml seam-pack contains Ladder 12 V/W/X satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER12) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('Y2: package.json scripts for Ladder 12 satellites + mission-y / y12', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER12) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  assert.equal(
    pkg.scripts['test:mission-y'],
    'node --test tests/eos-y-ladder12-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:y12'],
    'node --test tests/eos-y-ladder12-seam-pack.test.js'
  );
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER12) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
  if (typeof pkg.scripts['test:ladder12-pack'] === 'string') {
    for (const s of LADDER12) {
      assert.ok(
        pkg.scripts['test:ladder12-pack'].includes(s),
        'ladder12-pack missing ' + s
      );
    }
  }
});

test('Y3: CI_CD_CONTRACT.md mentions Ladder 12 / Mission Y satellites', () => {
  assert.ok(exists('docs/governance/CI_CD_CONTRACT.md'), 'CI_CD_CONTRACT.md missing');
  const md = read('docs/governance/CI_CD_CONTRACT.md');
  assert.ok(
    md.includes('Ladder 12') || md.includes('Mission Y'),
    'contract missing Ladder 12 / Mission Y'
  );
  assert.ok(
    md.includes('test:fdir-remediation') ||
      md.includes('test:sovereign-session') ||
      md.includes('test:developer-shell') ||
      md.includes('Ladder 12'),
    'contract missing Ladder 12 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
});

test('Y4: Ladder 12 closeout doc exists with PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_12_CLOSEOUT_2026-09-11.md';
  assert.ok(exists(p), 'Ladder 12 closeout missing');
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
    md.includes('fdir-remediation') ||
      md.includes('sovereign-session') ||
      md.includes('developer-shell') ||
      (md.includes('V') && md.includes('W') && md.includes('X')),
    'closeout must summarize V/W/X'
  );
});

test('Y5: Mission Y release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_Y_LADDER12_SEAM_PACK_2026-09-11.md';
  assert.ok(exists(p), 'Mission Y release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0030') || md.includes('Mission Y'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:fdir-remediation') &&
      md.includes('test:sovereign-session') &&
      md.includes('test:developer-shell')
  );
});

test('Y6: OpenSpec Mission Y artifacts exist (SPEC-0030)', () => {
  const base = 'openspec/changes/eos-mission-y-ladder12-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/ladder12-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0030'));
});

test('Y7: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-y-ladder12-seam-pack.test.js'") ||
      runner.includes('"eos-y-ladder12-seam-pack.test.js"'),
    'eos-y-ladder12-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('Y8: no continue-on-error; Fundacion freeze kept', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);
});
