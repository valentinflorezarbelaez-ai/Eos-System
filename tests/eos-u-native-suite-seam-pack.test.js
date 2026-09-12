import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const NATIVE_SATELLITES = [
  'test:compute-worker-i',
  'test:compute-worker-l',
  'test:compute-worker-m',
  'test:compute-worker-n',
  'test:compute-worker-o',
  'test:loop-compute',
  'test:worker-daemon',
  'test:fdir-sentinel',
  'test:specboot-agent',
  'test:external-write-gateway',
];

test('U1: ci.yml seam-pack contains each native satellite script', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  assert.match(yaml, /gameday:long-run/);
  assert.ok(yaml.includes('npm run test:compute-worker'), 'keep base compute-worker');
  assert.ok(yaml.includes('npm run test:c2'), 'keep test:c2');
  for (const s of NATIVE_SATELLITES) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('U2: package.json has test:native-suite-pack + test:mission-u (+ test:u11)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(typeof pkg.scripts['test:native-suite-pack'], 'string');
  for (const s of NATIVE_SATELLITES) {
    assert.ok(
      pkg.scripts['test:native-suite-pack'].includes(s),
      'native-suite-pack missing ' + s
    );
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  assert.equal(
    pkg.scripts['test:mission-u'],
    'node --test tests/eos-u-native-suite-seam-pack.test.js'
  );
  assert.equal(typeof pkg.scripts['test:u11'], 'string');
});

test('U3: CI_CD_CONTRACT.md documents Mission U / native-suite + Ladder 11', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:compute-worker-i') || md.includes('native-suite'));
  assert.ok(md.includes('test:external-write-gateway') || md.includes('native-suite-pack'));
  assert.ok(
    md.includes('U / Mission U seam-pack note') ||
      md.includes('Mission U seam-pack') ||
      md.includes('native-suite')
  );
  assert.ok(md.includes('Ladder 11'));
});

test('U4: Ladder 11 closeout doc exists with NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = path.join(rootDir, 'docs/releases/EOS_LADDER_11_CLOSEOUT_2026-09-11.md');
  assert.ok(fs.existsSync(p), 'Ladder 11 closeout missing');
  const md = fs.readFileSync(p, 'utf8');
  assert.ok(/PRODUCTION_READY\s*=\s*NO|PRODUCTION_READY:\s*\*\*NO\*\*/i.test(md) || md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(md.includes('NON-CLAIM') || md.includes('NON-claim') || md.includes('Δ=0') || md.includes('Delta=0') || md.includes('Fundacion'));
  assert.ok(md.includes('Fundacion') && (md.includes('Δ=0') || md.includes('Delta=0') || md.includes('delta-0') || md.includes('delta 0')));
  assert.ok(md.includes('COMPLETE_FOR_LOCAL_GOVERNED_USE'));
});

test('U5: assertGithubActionsContract ok (no continue-on-error; Fundacion freeze)', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('U6: OpenSpec Mission U artifacts exist (SPEC-0026)', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-mission-u-native-suite-seam-pack');
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/native-suite-seam-pack/spec.md',
  ]) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = fs.readFileSync(path.join(base, '.openspec.yaml'), 'utf8');
  assert.ok(yaml.includes('SPEC-0026'));
});

test('U7: Mission U release report exists', () => {
  const p = path.join(
    rootDir,
    'docs/releases/EOS_MISSION_U_NATIVE_SUITE_SEAM_PACK_2026-09-11.md'
  );
  assert.ok(fs.existsSync(p));
  const md = fs.readFileSync(p, 'utf8');
  assert.ok(md.includes('SPEC-0026') || md.includes('Mission U'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
});

test('U8: no continue-on-error; Fundacion freeze kept on all CI jobs', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  const jobs = ['verify', 'test', 'syntax', 'governance-gates', 'seam-pack'];
  for (const job of jobs) {
    assert.match(yaml, new RegExp('^  ' + job + ':', 'm'));
  }
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 5);
});
