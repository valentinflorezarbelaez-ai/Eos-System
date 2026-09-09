import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const Q_SEAM = ['test:q2', 'test:q3', 'test:q4', 'test:q5', 'test:q6'];
const P_SEAM = ['test:p2', 'test:p3', 'test:p4', 'test:p5', 'test:p6'];

test('R2: CI workflow seam-pack runs Ladder5 Q-tests (q2..q6) and keeps p2..p6', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  assert.match(yaml, /gameday:long-run/);
  for (const s of [
    'test:roi3', 'test:roi4', 'test:roi5', 'test:roi6',
    'test:m1', 'test:m2', 'test:m3', 'test:m4',
    'test:n2', 'test:n3', 'test:n4', 'test:n5', 'test:n6',
    ...P_SEAM,
    ...Q_SEAM
  ]) {
    assert.ok(yaml.includes(s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('R2: CI_CD_CONTRACT.md documents q2..q6 seam-pack', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:q2'));
  assert.ok(md.includes('test:q6'));
  assert.ok(md.includes('R2 seam-pack note') || md.includes('R2 seam-pack'));
});

test('R2: assert-gha-contract verifies Ladder5 Q seam surface', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('R2: package script test:r2 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:r2'], 'node --test tests/eos-r2-ci-seam-pack-q-tests.test.js');
});
