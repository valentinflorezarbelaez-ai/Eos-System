import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';
import { SLIM_SUITE_EXCLUDES } from '../scripts/test-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PRIOR_V_SEAM = ['test:v2', 'test:v3', 'test:v4', 'test:v5'];
const L8_SEAM = ['test:t2', 'test:t3', 'test:t4', 'test:t5', 'test:t6', 'test:t7', 'test:t8'];

test('C2: CI workflow seam-pack runs test:compute-worker + test:u2 and keeps prior packs', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  assert.match(yaml, /gameday:long-run/);
  for (const s of [
    'test:roi3', 'test:roi4', 'test:roi5', 'test:roi6',
    'test:m1', 'test:m2', 'test:m3', 'test:m4',
    'test:n2', 'test:n3', 'test:n4', 'test:n5', 'test:n6',
    'test:p2', 'test:p3', 'test:p4', 'test:p5', 'test:p6',
    'test:q2', 'test:q3', 'test:q4', 'test:q5', 'test:q6',
    'test:r4', 'test:r5',
    'test:s2', 'test:s3', 'test:s4', 'test:s5', 'test:s6', 'test:specboot-agy',
    ...L8_SEAM,
    ...PRIOR_V_SEAM,
    'test:u2',
    'test:compute-worker',
    'test:c2'
  ]) {
    assert.ok(yaml.includes(s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('C2: CI_CD_CONTRACT.md documents compute-worker seam-pack', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:compute-worker'));
  assert.ok(md.includes('C2 seam-pack note') || md.includes('C2 seam-pack'));
});

test('C2: assert-gha-contract verifies compute-worker seam surface', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('C2: package scripts exist for compute-worker + test:c2; lock excluded from slim', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:c2'], 'node --test tests/eos-mission-c2-ci-compute-worker.test.js');
  assert.equal(typeof pkg.scripts['test:compute-worker'], 'string');
  assert.ok(pkg.scripts['test:compute-worker'].includes('eos-compute-worker.test.js'));
  assert.ok(pkg.scripts['test:compute-worker'].includes('eos-compute-worker-fuzz.test.js'));
  assert.ok(pkg.scripts['test:compute-worker'].includes('eos-compute-worker-adversarial.test.js'));
  assert.equal(typeof pkg.scripts['test:u2'], 'string');
  assert.ok(
    SLIM_SUITE_EXCLUDES.has('eos-mission-c2-ci-compute-worker.test.js'),
    'C2 lock must stay out of slim to hold TR-01 ≤145'
  );
});
