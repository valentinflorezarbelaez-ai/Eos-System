/**
 * @module hooks-install-smoke
 * P3 — Hooks install CI/verify smoke (Ladder 4 J3).
 *
 * Runs install-git-hooks into a TEMP git hooks directory (never the CI
 * checkout .git). Fail-closed if pre-commit + pre-push shims are not written
 * with expected markers. Local surrogate only — NOT GitHub branch protection.
 *
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installHooks } from '../install-git-hooks.js';

export const HOOKS_INSTALL_REQUIRED_PATHS = Object.freeze([
  'scripts/install-git-hooks.js',
  'scripts/pre-commit-hook.js',
  'scripts/pre-push-hook.js',
  'scripts/lib/hooks-install-smoke.js',
  'tests/pre-push-main-guard.test.js',
  'tests/eos-p3-hooks-install-smoke.test.js',
  'docs/releases/EOS_P3_HOOKS_INSTALL_SMOKE_2026-09-08.md'
]);

const PRE_COMMIT_MARKER = 'node scripts/pre-commit-hook.js';
const PRE_PUSH_MARKER = 'node scripts/pre-push-hook.js';
const PRE_PUSH_CAVEAT = 'LOCAL ONLY';

/**
 * Install hooks into an isolated temp .git/hooks tree and assert shims.
 * Does not mutate the repository checkout .git.
 *
 * @param {object} [options]
 * @param {typeof installHooks} [options.installFn]
 * @param {string} [options.tmpPrefix]
 * @returns {{ ok: boolean, checks: object[], failures: object[], tempRoot?: string, paths?: object }}
 */
export function runHooksInstallSmoke(options = {}) {
  const checks = [];
  const failures = [];
  const installFn = options.installFn || installHooks;
  const tmpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), options.tmpPrefix || 'eos-hooks-smoke-')
  );
  const hooksDir = path.join(tmpRoot, '.git', 'hooks');

  try {
    fs.mkdirSync(hooksDir, { recursive: true });

    let result;
    try {
      result = installFn({ hooksDir });
    } catch (err) {
      failures.push({
        path: 'scripts/install-git-hooks.js',
        message: 'installHooks threw (fail-closed): ' + (err.message || err),
        type: 'hooks-install-smoke'
      });
      return { ok: false, checks, failures, tempRoot: tmpRoot };
    }

    if (!result || result.success !== true) {
      failures.push({
        path: 'scripts/install-git-hooks.js',
        message:
          'installHooks did not succeed for temp hooksDir (reason=' +
          String(result && result.reason) +
          ')',
        type: 'hooks-install-smoke'
      });
      return { ok: false, checks, failures, tempRoot: tmpRoot };
    }

    const preCommit =
      result.paths && result.paths.preCommit
        ? result.paths.preCommit
        : path.join(hooksDir, 'pre-commit');
    const prePush =
      result.paths && result.paths.prePush
        ? result.paths.prePush
        : path.join(hooksDir, 'pre-push');

    if (!fs.existsSync(preCommit)) {
      failures.push({
        path: preCommit,
        message: 'Expected pre-commit shim missing after install',
        type: 'hooks-install-smoke'
      });
    } else {
      const body = fs.readFileSync(preCommit, 'utf8');
      if (!body.includes(PRE_COMMIT_MARKER)) {
        failures.push({
          path: preCommit,
          message: 'pre-commit shim missing marker: ' + PRE_COMMIT_MARKER,
          type: 'hooks-install-smoke'
        });
      } else {
        checks.push({
          path: 'temp/.git/hooks/pre-commit',
          status: 'VERIFIED',
          type: 'hooks-install-smoke'
        });
      }
    }

    if (!fs.existsSync(prePush)) {
      failures.push({
        path: prePush,
        message: 'Expected pre-push shim missing after install (fail-closed)',
        type: 'hooks-install-smoke'
      });
    } else {
      const body = fs.readFileSync(prePush, 'utf8');
      if (!body.includes(PRE_PUSH_MARKER)) {
        failures.push({
          path: prePush,
          message: 'pre-push shim missing marker: ' + PRE_PUSH_MARKER,
          type: 'hooks-install-smoke'
        });
      } else if (!body.includes(PRE_PUSH_CAVEAT)) {
        failures.push({
          path: prePush,
          message: 'pre-push shim missing LOCAL ONLY non-claim caveat',
          type: 'hooks-install-smoke'
        });
      } else {
        checks.push({
          path: 'temp/.git/hooks/pre-push',
          status: 'VERIFIED',
          type: 'hooks-install-smoke'
        });
      }
    }

    // Negative surface: missing hooks dir must fail closed (not throw open).
    // Always use real installHooks here (injectable installFn is for shim-write probes only).
    const missing = installHooks({
      hooksDir: path.join(tmpRoot, '.git', 'hooks-MISSING-P3')
    });
    if (missing && missing.success === false && missing.reason === 'NO_GIT_DIR') {
      checks.push({
        path: 'installHooks NO_GIT_DIR fail-closed',
        status: 'VERIFIED',
        type: 'hooks-install-smoke'
      });
    } else {
      failures.push({
        path: 'scripts/install-git-hooks.js',
        message: 'Expected NO_GIT_DIR fail-closed for missing hooksDir',
        type: 'hooks-install-smoke'
      });
    }

    return {
      ok: failures.length === 0,
      checks,
      failures,
      tempRoot: tmpRoot,
      paths: { preCommit, prePush }
    };
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

/**
 * Verify-eos light audit: required paths + package scripts + temp install smoke.
 * @param {string} rootDir
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditHooksInstallSurface(rootDir) {
  const checks = [];
  const failures = [];
  const root = path.resolve(rootDir || process.cwd());

  for (const rel of HOOKS_INSTALL_REQUIRED_PATHS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      failures.push({
        path: rel,
        message: 'Hooks-install required path missing',
        type: 'hooks-install-lock'
      });
    } else {
      checks.push({
        path: rel,
        status: 'VERIFIED',
        type: 'hooks-install-lock'
      });
    }
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (pkg.scripts?.['hooks:install'] !== 'node scripts/install-git-hooks.js') {
      failures.push({
        path: 'package.json',
        message: 'hooks:install script missing or drifted',
        type: 'hooks-install-lock'
      });
    } else {
      checks.push({
        path: 'package.json#scripts.hooks:install',
        status: 'VERIFIED',
        type: 'hooks-install-lock'
      });
    }
    if (pkg.scripts?.['test:p3'] !== 'node --test tests/eos-p3-hooks-install-smoke.test.js') {
      failures.push({
        path: 'package.json',
        message: 'test:p3 script missing or drifted',
        type: 'hooks-install-lock'
      });
    } else {
      checks.push({
        path: 'package.json#scripts.test:p3',
        status: 'VERIFIED',
        type: 'hooks-install-lock'
      });
    }
  } catch (err) {
    failures.push({
      path: 'package.json',
      message: 'package.json hooks script audit failed: ' + err.message,
      type: 'hooks-install-lock'
    });
  }

  if (failures.length > 0) {
    return { ok: false, checks, failures };
  }

  const smoke = runHooksInstallSmoke();
  for (const c of smoke.checks) checks.push(c);
  for (const f of smoke.failures) failures.push(f);

  return { ok: failures.length === 0, checks, failures };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const result = auditHooksInstallSurface(rootDir);
  if (!result.ok) {
    console.error('[EOS P3 hooks-install-smoke] FAIL');
    for (const f of result.failures) {
      console.error(' -', f.path + ':', f.message);
    }
    process.exit(1);
  }
  console.log('[EOS P3 hooks-install-smoke] OK — temp install + surface verified');
  console.log('  checks:', result.checks.length);
  process.exit(0);
}
