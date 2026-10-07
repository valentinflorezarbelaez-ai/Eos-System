/**
 * Phase 4 — Write Barrier sandbox (strict TDD).
 *
 * Proves:
 * (a) write without scope fails
 * (b) write outside allowlist fails
 * (c) Fundacion path fails even with open scope
 * (d) write inside allowlist with scope succeeds
 * (e) fail-closed if hook/misconfig
 * (f) barrierCheck MCP surface is fail-closed (no legacy allow)
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  withWriteScope,
  authorizeWrite,
  assertWritable,
  installWriteBarrierHooks,
  uninstallWriteBarrierHooks,
  getActiveWriteScope,
  loadSsotRoots,
  resolveRepoRoot,
  barrierCheck,
  WriteBarrierDeniedError
} from '../src/core/write-barrier/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-wb-'));
  for (const rel of ['src', 'tests', 'docs', 'config', 'Fundacion', 'outside-allow']) {
    fs.mkdirSync(path.join(root, rel), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'src', 'ok.txt'), 'seed\n', 'utf8');
  fs.writeFileSync(path.join(root, 'Fundacion', 'probe.md'), 'frozen\n', 'utf8');
  fs.writeFileSync(path.join(root, 'outside-allow', 'x.txt'), 'x\n', 'utf8');
  const configDir = path.join(root, 'config', 'security');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'write-barrier-ssot-roots.json'),
    JSON.stringify(
      {
        version: 1,
        repoRelativeAllowRoots: ['src', 'tests', 'docs', 'config'],
        alwaysDenyRepoRelative: ['Fundacion']
      },
      null,
      2
    ),
    'utf8'
  );
  return root;
}

describe('Phase 4 Write Barrier sandbox', () => {
  let tempRoot;
  let prevCwd;

  before(() => {
    tempRoot = makeTempRepo();
    prevCwd = process.cwd();
    process.chdir(tempRoot);
  });

  after(() => {
    process.chdir(prevCwd);
    uninstallWriteBarrierHooks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    uninstallWriteBarrierHooks();
  });

  afterEach(() => {
    uninstallWriteBarrierHooks();
  });

  it('(a) authorizeWrite without active scope fails closed', () => {
    const target = path.join(tempRoot, 'src', 'ok.txt');
    const verdict = authorizeWrite(target, { repoRoot: tempRoot });
    assert.equal(verdict.allowed, false);
    assert.match(String(verdict.reason), /NO_ACTIVE_SCOPE|SCOPE_REQUIRED/i);
    assert.equal(getActiveWriteScope(), null);
    assert.throws(
      () => assertWritable(target, { repoRoot: tempRoot }),
      (err) => err instanceof WriteBarrierDeniedError
    );
  });

  it('(b) write outside allowlist fails even with open scope', async () => {
    const outside = path.join(tempRoot, 'outside-allow', 'x.txt');
    await withWriteScope(
      { repoRoot: tempRoot, roots: ['src', 'tests', 'docs', 'config'] },
      async () => {
        const verdict = authorizeWrite(outside, { repoRoot: tempRoot });
        assert.equal(verdict.allowed, false);
        assert.match(String(verdict.reason), /OUTSIDE_ALLOWLIST|NOT_IN_ALLOWLIST/i);
      }
    );
  });

  it('(c) Fundacion path fails even with open scope listing Fundacion', async () => {
    const fundacionProbe = path.join(tempRoot, 'Fundacion', 'probe.md');
    await withWriteScope(
      { repoRoot: tempRoot, roots: ['src', 'Fundacion'] },
      async () => {
        const verdict = authorizeWrite(fundacionProbe, { repoRoot: tempRoot });
        assert.equal(verdict.allowed, false);
        assert.match(String(verdict.reason), /FUNDACION|ALWAYS_DENY|PROTECTED/i);
      }
    );

    const externalWin = 'C:\\Users\\valen\\Documents\\Fundacion\\probe.md';
    await withWriteScope(
      { repoRoot: tempRoot, roots: ['src'] },
      async () => {
        const verdict = authorizeWrite(externalWin, { repoRoot: tempRoot });
        assert.equal(verdict.allowed, false);
        assert.match(String(verdict.reason), /FUNDACION|ALWAYS_DENY|PROTECTED/i);
      }
    );
  });

  it('(d) write inside allowlist with scope succeeds (authorize + hooked fs)', async () => {
    const target = path.join(tempRoot, 'src', 'phase4-allowed.txt');
    installWriteBarrierHooks({ repoRoot: tempRoot });

    await withWriteScope({ repoRoot: tempRoot, roots: ['src'] }, async () => {
      const verdict = authorizeWrite(target, { repoRoot: tempRoot });
      assert.equal(verdict.allowed, true, `expected allow, got ${JSON.stringify(verdict)}`);
      fs.writeFileSync(target, 'phase4-ok\n', 'utf8');
      assert.equal(fs.readFileSync(target, 'utf8'), 'phase4-ok\n');
    });
  });

  it('(e) fail-closed on missing/invalid SSOT config and when hooks require scope', async () => {
    const brokenRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-wb-misconfig-'));
    fs.mkdirSync(path.join(brokenRoot, 'src'), { recursive: true });
    assert.throws(
      () => loadSsotRoots({ repoRoot: brokenRoot }),
      (err) => {
        assert.match(String(err.message || err.code || err), /SSOT|CONFIG|MISSING|INVALID/i);
        return true;
      }
    );

    const deny = authorizeWrite(path.join(brokenRoot, 'src', 'a.txt'), {
      repoRoot: brokenRoot
    });
    assert.equal(deny.allowed, false);
    assert.match(String(deny.reason), /SSOT|CONFIG|MISCONFIG|FAIL.?CLOSED|NO_ACTIVE_SCOPE/i);

    const target = path.join(tempRoot, 'src', 'hook-no-scope.txt');
    installWriteBarrierHooks({ repoRoot: tempRoot });
    assert.throws(
      () => fs.writeFileSync(target, 'should-fail\n', 'utf8'),
      (err) =>
        err instanceof WriteBarrierDeniedError ||
        /NO_ACTIVE_SCOPE|WRITE_BARRIER/i.test(String(err.message))
    );
    assert.equal(fs.existsSync(target), false);

    uninstallWriteBarrierHooks();
    fs.rmSync(brokenRoot, { recursive: true, force: true });
  });

  it('(f) barrierCheck is fail-closed at MCP boundary', async () => {
    // Empty path
    const empty = barrierCheck({ path: '', repoRoot: tempRoot });
    assert.equal(empty.allowed, false);
    assert.equal(empty.reason, 'EMPTY_PATH');

    // Fundacion always denied with MCP-compatible reason
    const fundacion = barrierCheck({
      path: path.join(tempRoot, 'Fundacion', 'probe.md'),
      repoRoot: tempRoot
    });
    assert.equal(fundacion.allowed, false);
    assert.equal(fundacion.reason, 'PROTECTED_SURFACE');

    // No ALS scope → deny (removed advisory allowlist pass)
    const noScope = barrierCheck({
      path: path.join(tempRoot, 'src', 'ok.txt'),
      repoRoot: tempRoot
    });
    assert.equal(noScope.allowed, false);
    assert.equal(noScope.reason, 'NO_ACTIVE_SCOPE');
    assert.equal(noScope.scope_active, false);

    // Active scope + inside allowlist → allow
    await withWriteScope({ repoRoot: tempRoot, roots: ['src'] }, async () => {
      const ok = barrierCheck({
        path: path.join(tempRoot, 'src', 'ok.txt'),
        repoRoot: tempRoot
      });
      assert.equal(ok.allowed, true);
      assert.equal(ok.reason, 'OK');
      assert.equal(ok.scope_active, true);
    });

    // Active scope + outside allowlist → deny
    await withWriteScope({ repoRoot: tempRoot, roots: ['src'] }, async () => {
      const outside = barrierCheck({
        path: path.join(tempRoot, 'outside-allow', 'x.txt'),
        repoRoot: tempRoot
      });
      assert.equal(outside.allowed, false);
      assert.match(String(outside.reason), /OUTSIDE_ALLOWLIST/i);
    });

    // Missing SSOT → deny (no legacy allow)
    const brokenRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-wb-barrier-'));
    fs.mkdirSync(path.join(brokenRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(brokenRoot, 'src', 'a.txt'), 'a\n', 'utf8');
    const missingSsot = barrierCheck({
      path: path.join(brokenRoot, 'src', 'a.txt'),
      repoRoot: brokenRoot
    });
    assert.equal(missingSsot.allowed, false);
    assert.match(String(missingSsot.reason), /SSOT_CONFIG_MISSING|MISCONFIG/i);
    fs.rmSync(brokenRoot, { recursive: true, force: true });
  });

  it('SSOT roots load from repo-relative config (runtime realpath)', () => {
    const realRoot = resolveRepoRoot(REPO_ROOT);
    const roots = loadSsotRoots({ repoRoot: realRoot });
    assert.ok(Array.isArray(roots.repoRelativeAllowRoots));
    assert.ok(roots.repoRelativeAllowRoots.includes('src'));
    assert.ok(Array.isArray(roots.resolvedAllowRoots));
    assert.ok(roots.resolvedAllowRoots.length > 0);
  });
});
