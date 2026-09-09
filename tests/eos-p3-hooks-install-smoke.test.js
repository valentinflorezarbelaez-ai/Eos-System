import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';
import {
  runHooksInstallSmoke,
  auditHooksInstallSurface,
  HOOKS_INSTALL_REQUIRED_PATHS
} from '../scripts/lib/hooks-install-smoke.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('P3: runHooksInstallSmoke writes pre-commit + pre-push in temp .git/hooks', () => {
  const smoke = runHooksInstallSmoke();
  assert.equal(smoke.ok, true, JSON.stringify(smoke.failures));
  assert.ok(smoke.checks.some((c) => c.path.includes('pre-commit')));
  assert.ok(smoke.checks.some((c) => c.path.includes('pre-push')));
  assert.ok(smoke.checks.some((c) => String(c.path).includes('NO_GIT_DIR')));
});

test('P3: runHooksInstallSmoke fail-closed when install cannot write pre-push', () => {
  const smoke = runHooksInstallSmoke({
    installFn: ({ hooksDir }) => {
      const preCommit = path.join(hooksDir, 'pre-commit');
      fs.writeFileSync(preCommit, '#!/bin/sh\n', 'utf8');
      // Deliberately omit pre-push write — smoke must fail closed.
      return {
        success: true,
        path: preCommit,
        paths: { preCommit, prePush: path.join(hooksDir, 'pre-push') }
      };
    }
  });
  assert.equal(smoke.ok, false);
  assert.ok(
    smoke.failures.some((f) => /pre-push shim missing/i.test(f.message)),
    JSON.stringify(smoke.failures)
  );
});

test('P3: auditHooksInstallSurface verifies paths + package scripts + smoke', () => {
  const audit = auditHooksInstallSurface(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures));
  for (const rel of HOOKS_INSTALL_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('P3: smoke does not leave temp roots under os.tmpdir after success', () => {
  const before = new Set(
    fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('eos-hooks-smoke-'))
  );
  const smoke = runHooksInstallSmoke({ tmpPrefix: 'eos-hooks-smoke-p3clean-' });
  assert.equal(smoke.ok, true);
  const after = fs
    .readdirSync(os.tmpdir())
    .filter((n) => n.startsWith('eos-hooks-smoke-p3clean-'));
  for (const name of after) {
    assert.ok(before.has(name), 'leaked temp dir ' + name);
  }
});

test('P3: CI seam-pack runs test:p3', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  assert.ok(yaml.includes('test:p3'), 'ci.yml seam-pack missing test:p3');
  assert.equal(yaml.includes('continue-on-error: true'), false);
});

test('P3: CI_CD_CONTRACT.md documents P3 hooks install smoke', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:p3'));
  assert.ok(md.includes('P3 hooks-install'));
});

test('P3: assert-gha-contract requires test:p3', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('P3: package script test:p3 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:p3'], 'node --test tests/eos-p3-hooks-install-smoke.test.js');
  assert.equal(pkg.scripts['hooks:install'], 'node scripts/install-git-hooks.js');
});
