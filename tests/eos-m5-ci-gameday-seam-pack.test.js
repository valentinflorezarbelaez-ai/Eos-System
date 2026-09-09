import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('M5: CI workflow declares seam-pack GameDay / ROI pack', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  assert.match(yaml, /gameday:long-run/);
  for (const s of ['test:roi3', 'test:roi4', 'test:roi5', 'test:roi6', 'test:m1', 'test:m2', 'test:m3', 'test:m4', 'test:n2', 'test:n3', 'test:n4', 'test:n5', 'test:n6', 'test:p2', 'test:p3', 'test:p4', 'test:p5', 'test:p6', 'test:q2', 'test:q3', 'test:q4', 'test:q5', 'test:q6', 'test:r4', 'test:r5']) {
    assert.ok(yaml.includes(s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  assert.equal(/soak/i.test(yaml.split('seam-pack:')[1] || ''), false);
});

test('M5: CI_CD_CONTRACT.json lists seam-pack job', () => {
  const contract = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.json'), 'utf8')
  );
  assert.ok(contract.workflows.ci.jobs.includes('seam-pack'));
  assert.equal(contract.production_deploy, 'FORBIDDEN');
  assert.equal(contract.fundacion_mutation, 'FORBIDDEN');
});

test('M5: assert-gha-contract verifies seam-pack surface', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('M5: package script test:m5 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:m5'], 'node --test tests/eos-m5-ci-gameday-seam-pack.test.js');
});
