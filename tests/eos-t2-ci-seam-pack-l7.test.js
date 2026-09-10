import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const L7_SEAM = ['test:s2', 'test:s3', 'test:s4', 'test:s5', 'test:s6', 'test:specboot-agy'];
const R_SEAM = ['test:r4', 'test:r5'];
const Q_SEAM = ['test:q2', 'test:q3', 'test:q4', 'test:q5', 'test:q6'];
const P_SEAM = ['test:p2', 'test:p3', 'test:p4', 'test:p5', 'test:p6'];

test('T2: CI workflow seam-pack runs Ladder7 L7 locks (s2..s6 + specboot-agy) and keeps prior packs', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  assert.match(yaml, /gameday:long-run/);
  for (const s of [
    'test:roi3', 'test:roi4', 'test:roi5', 'test:roi6',
    'test:m1', 'test:m2', 'test:m3', 'test:m4',
    'test:n2', 'test:n3', 'test:n4', 'test:n5', 'test:n6',
    ...P_SEAM,
    ...Q_SEAM,
    ...R_SEAM,
    ...L7_SEAM
  ]) {
    assert.ok(yaml.includes(s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('T2: CI_CD_CONTRACT.md documents L7 seam-pack (s2..s6 + specboot-agy)', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:s2'));
  assert.ok(md.includes('test:s6'));
  assert.ok(md.includes('test:specboot-agy'));
  assert.ok(md.includes('T2 seam-pack note') || md.includes('T2 seam-pack'));
});

test('T2: assert-gha-contract verifies Ladder7 L7 seam surface', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('T2: package scripts exist for L7 locks + test:t2', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:t2'], 'node --test tests/eos-t2-ci-seam-pack-l7.test.js');
  for (const s of L7_SEAM) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing npm script ' + s);
  }
});
