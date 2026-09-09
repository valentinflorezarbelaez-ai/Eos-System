import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('P2: CI workflow declares seam-pack Ladder3 N2-N6 pack', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  assert.match(yaml, /gameday:long-run/);
  for (const s of ['test:roi3', 'test:roi4', 'test:roi5', 'test:roi6', 'test:m1', 'test:m2', 'test:m3', 'test:m4', 'test:n2', 'test:n3', 'test:n4', 'test:n5', 'test:n6']) {
    assert.ok(yaml.includes(s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  assert.equal(/soak/i.test(yaml.split('seam-pack:')[1] || ''), false);
});

test('P2: CI_CD_CONTRACT.md documents n2..n6', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:n2'));
  assert.ok(md.includes('test:n6'));
  assert.ok(md.includes('P2 seam-pack note'));
});

test('P2: assert-gha-contract verifies N seam surface', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('P2: package script test:p2 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:p2'], 'node --test tests/eos-p2-ci-seam-pack-n2-n6.test.js');
});
