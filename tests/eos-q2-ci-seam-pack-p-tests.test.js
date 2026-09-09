import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const P_SEAM = ['test:p2', 'test:p3', 'test:p4', 'test:p5', 'test:p6'];

test('Q2: CI workflow seam-pack runs Ladder4 P-tests (p2 + p3 + p4..p6)', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  assert.match(yaml, /gameday:long-run/);
  for (const s of [
    'test:roi3', 'test:roi4', 'test:roi5', 'test:roi6',
    'test:m1', 'test:m2', 'test:m3', 'test:m4',
    'test:n2', 'test:n3', 'test:n4', 'test:n5', 'test:n6',
    ...P_SEAM
  ]) {
    assert.ok(yaml.includes(s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('Q2: CI_CD_CONTRACT.md documents p2 + p4..p6 seam-pack', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:p2'));
  assert.ok(md.includes('test:p4'));
  assert.ok(md.includes('test:p6'));
  assert.ok(md.includes('Q2 seam-pack note') || md.includes('Q2 seam-pack'));
});

test('Q2: assert-gha-contract verifies Ladder4 P seam surface', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('Q2: package script test:q2 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:q2'], 'node --test tests/eos-q2-ci-seam-pack-p-tests.test.js');
});
