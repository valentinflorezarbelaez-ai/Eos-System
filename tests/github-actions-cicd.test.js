import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract, loadCicdContract, readWorkflow } from '../scripts/ci/assert-gha-contract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('GHA-001: CI/CD contract file is valid and forbids production deploy', () => {
  const contract = loadCicdContract(rootDir);
  assert.equal(contract.provider, 'github-actions');
  assert.equal(contract.production_deploy, 'FORBIDDEN');
  assert.equal(contract.fundacion_mutation, 'FORBIDDEN');
  assert.equal(contract.dependency_policy, 'L0_NODE_BUILTINS_ONLY');
  assert.equal(contract.workflows.cd_release_gate.production_deploy, false);
});

test('GHA-002: GitHub Actions workflows satisfy the CI/CD contract', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('GHA-003: CI workflow covers verify, test, syntax, and governance gates', () => {
  const yaml = readWorkflow(rootDir, '.github/workflows/ci.yml');
  assert.match(yaml, /^  verify:/m);
  assert.match(yaml, /^  test:/m);
  assert.match(yaml, /^  syntax:/m);
  assert.match(yaml, /^  governance-gates:/m);
  assert.equal(yaml.includes('npm install'), false);
  assert.equal(yaml.includes('pull_request_target'), false);
});

test('GHA-004: CD workflow is a release gate and cannot deploy production', () => {
  const yaml = readWorkflow(rootDir, '.github/workflows/cd-release-gate.yml');
  assert.match(yaml, /EOS_CD_MODE: 'RELEASE_GATE_ONLY'/);
  assert.match(yaml, /EOS_PRODUCTION_DEPLOY: 'false'/);
  assert.equal(yaml.includes('environment: production'), false);
  assert.equal(yaml.includes('actions/deploy-pages'), false);
  assert.equal(yaml.includes('npm publish'), false);
  assert.match(yaml, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.match(yaml, /scripts\/ci\/extract-json-payload\.js/);
  assert.equal(yaml.includes('tee "${RUNNER_TEMP}/release-eval.json"'), false);
});

test('GHA-005: verify-eos required paths include GitHub Actions CI/CD artifacts', () => {
  const verifier = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  const required = [
    '.github/workflows/ci.yml',
    '.github/workflows/cd-release-gate.yml',
    'docs/governance/CI_CD_CONTRACT.json',
    'docs/governance/CI_CD_CONTRACT.md',
    'docs/specs/eos_core/SPEC-GHA-001-github-actions-cicd.md',
    'docs/architecture/adrs/ADR-0009-github-actions-cicd.md',
    'scripts/ci/assert-gha-contract.js',
    'scripts/ci/extract-json-payload.js',
    'tests/github-actions-cicd.test.js'
  ];
  for (const rel of required) {
    assert.ok(verifier.includes(`'${rel}'`), `verify-eos REQUIRED_PATHS must include ${rel}`);
    assert.ok(fs.existsSync(path.join(rootDir, rel)), `${rel} must exist`);
  }
});

test('GHA-006: package.json exposes an L0 ci script used by GitHub Actions', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(typeof pkg.scripts.ci, 'string');
  assert.match(pkg.scripts.ci, /assert-gha-contract/);
  assert.equal(pkg.scripts.ci.includes('npm install'), false);
  assert.equal(Object.hasOwn(pkg, 'dependencies'), false);
  assert.equal(Object.hasOwn(pkg, 'devDependencies'), false);
});

test('GHA-007: extract-json-payload strips CLI banners into valid JSON', async () => {
  const { extractJsonPayload } = await import('../scripts/ci/extract-json-payload.js');
  const bannered = 'EOS PRODUCTION READINESS & RELEASE GOVERNANCE RESULTS:\n[{"provingId":"PROVING-001"}]\n';
  const payload = extractJsonPayload(bannered);
  assert.deepEqual(JSON.parse(payload), [{ provingId: 'PROVING-001' }]);
  assert.throws(() => extractJsonPayload('no payload here'), /No JSON payload/);
});
