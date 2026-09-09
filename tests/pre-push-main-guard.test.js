import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parsePrePushLine,
  classifyMainUpdate,
  evaluateMainPushGuard,
  formatGuardMessage,
  ALLOW_ENV_KEY
} from '../scripts/pre-push-hook.js';
import { installHooks } from '../scripts/install-git-hooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ZERO = '0'.repeat(40);
const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SHA_C = 'cccccccccccccccccccccccccccccccccccccccc';

describe('EOS M2 local main-push surrogate (fail-closed)', () => {
  test('M2-01: parsePrePushLine extracts four fields', () => {
    const u = parsePrePushLine(`refs/heads/feat ${SHA_A} refs/heads/main ${SHA_B}`);
    assert.equal(u.localRef, 'refs/heads/feat');
    assert.equal(u.localSha, SHA_A);
    assert.equal(u.remoteRef, 'refs/heads/main');
    assert.equal(u.remoteSha, SHA_B);
  });

  test('M2-02: DENY direct push to main (no allow env)', () => {
    const line = `refs/heads/main ${SHA_A} refs/heads/main ${SHA_B}`;
    const res = evaluateMainPushGuard({
      lines: [line],
      env: {},
      isAncestor: () => true
    });
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'MAIN_PUSH_DENIED');
    assert.equal(res.denied[0].kind, 'direct_push_main');
  });

  test('M2-03: DENY force-push to main when remote not ancestor', () => {
    const line = `refs/heads/main ${SHA_A} refs/heads/main ${SHA_B}`;
    const res = evaluateMainPushGuard({
      lines: [line],
      env: {},
      isAncestor: () => false
    });
    assert.equal(res.allowed, false);
    assert.equal(res.denied[0].kind, 'force_push_main');
    assert.equal(res.denied[0].force, true);
  });

  test('M2-04: DENY delete of main', () => {
    const line = `refs/heads/main ${ZERO} refs/heads/main ${SHA_B}`;
    const res = evaluateMainPushGuard({ lines: [line], env: {} });
    assert.equal(res.allowed, false);
    assert.equal(res.denied[0].kind, 'delete_main');
  });

  test('M2-05: ALLOW non-main branch push without env', () => {
    const line = `refs/heads/feat ${SHA_A} refs/heads/feat ${SHA_B}`;
    const res = evaluateMainPushGuard({
      lines: [line],
      env: {},
      isAncestor: () => true
    });
    assert.equal(res.allowed, true);
    assert.equal(res.reason, 'NO_MAIN_REF_UPDATE');
  });

  test('M2-06: ALLOW main push only with EOS_ALLOW_MAIN_PUSH=1 (danger)', () => {
    const line = `refs/heads/main ${SHA_A} refs/heads/main ${SHA_B}`;
    const res = evaluateMainPushGuard({
      lines: [line],
      env: { [ALLOW_ENV_KEY]: '1' },
      isAncestor: () => false
    });
    assert.equal(res.allowed, true);
    assert.equal(res.reason, 'EOS_ALLOW_MAIN_PUSH');
    assert.equal(res.danger, true);
    const msg = formatGuardMessage(res);
    assert.match(msg, /DANGEROUS/);
    assert.match(msg, /NOT GitHub branch-protection/i);
  });

  test('M2-07: classifyMainUpdate ignores non-main refs', () => {
    const c = classifyMainUpdate({
      localRef: 'refs/heads/x',
      localSha: SHA_A,
      remoteRef: 'refs/heads/x',
      remoteSha: SHA_B
    });
    assert.equal(c, null);
  });

  test('M2-08: deny message documents local surrogate caveat', () => {
    const line = `refs/heads/main ${SHA_A} refs/heads/main ${ZERO}`;
    const res = evaluateMainPushGuard({ lines: [line], env: {} });
    const msg = formatGuardMessage(res);
    assert.match(msg, /DENY/);
    assert.match(msg, /RULE_CREATED_NOT_ENFORCED/);
    assert.match(msg, /EOS_ALLOW_MAIN_PUSH=1/);
  });

  test('M2-09: installHooks writes both pre-commit and pre-push', () => {
    const tempHooksDir = path.join(rootDir, '.eos', 'test_hooks_m2');
    if (fs.existsSync(tempHooksDir)) fs.rmSync(tempHooksDir, { recursive: true, force: true });
    fs.mkdirSync(tempHooksDir, { recursive: true });
    const res = installHooks({ hooksDir: tempHooksDir });
    assert.equal(res.success, true);
    assert.ok(fs.existsSync(res.paths.preCommit));
    assert.ok(fs.existsSync(res.paths.prePush));
    const pushBody = fs.readFileSync(res.paths.prePush, 'utf8');
    assert.ok(pushBody.includes('node scripts/pre-push-hook.js'));
    fs.rmSync(tempHooksDir, { recursive: true, force: true });
  });
});
