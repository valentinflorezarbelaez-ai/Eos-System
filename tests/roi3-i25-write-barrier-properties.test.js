/**
 * ROI3 / I2.5 — Write-barrier authorize/scope property tests (L0).
 *
 * Seams: authorizeWrite fail-closed reasons, Fundacion always-deny,
 * scope requirement, allowlist membership, normalizeBarrierPath idempotence.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { PropertyBasedFalsifier } from '../src/core/formal/property-based-falsifier.js';
import {
  authorizeWrite,
  withWriteScope,
  getActiveWriteScope
} from '../src/core/write-barrier/index.js';
import {
  normalizeBarrierPath,
  isFundacionPath,
  isPathInsideRoot
} from '../src/core/write-barrier/paths.js';

function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-roi3-wb-'));
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
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"eos-roi3-wb","type":"module"}\n');
  return root;
}

describe('ROI3 I2.5 write-barrier authorize/scope properties', () => {
  let tempRoot;
  let prevCwd;

  before(() => {
    tempRoot = makeTempRepo();
    prevCwd = process.cwd();
    process.chdir(tempRoot);
  });

  after(() => {
    process.chdir(prevCwd);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('property: empty / blank paths always deny EMPTY_PATH', () => {
    for (const p of ['', null, undefined]) {
      const v = authorizeWrite(p, { repoRoot: tempRoot });
      assert.equal(v.allowed, false);
      assert.equal(v.reason, 'EMPTY_PATH');
    }
  });

  it('property: no active scope ⇒ allowlisted path denied NO_ACTIVE_SCOPE', () => {
    assert.equal(getActiveWriteScope(), null);
    const target = path.join(tempRoot, 'src', 'ok.txt');
    const v = authorizeWrite(target, { repoRoot: tempRoot });
    assert.equal(v.allowed, false);
    assert.equal(v.reason, 'NO_ACTIVE_SCOPE');
  });

  it('property: Fundacion paths always deny even inside open scope', async () => {
    const probes = [
      path.join(tempRoot, 'Fundacion', 'probe.md'),
      path.join(tempRoot, 'Fundacion', 'nested', 'x.txt'),
      path.join(tempRoot, 'src', '..', 'Fundacion', 'probe.md')
    ];
    await withWriteScope(
      { repoRoot: tempRoot, roots: ['src', 'tests', 'docs', 'config', 'Fundacion'] },
      async () => {
        for (const p of probes) {
          assert.equal(isFundacionPath(p), true, p);
          const v = authorizeWrite(p, { repoRoot: tempRoot });
          assert.equal(v.allowed, false, p);
          assert.equal(v.reason, 'FUNDACION_ALWAYS_DENY', p);
        }
      }
    );
  });

  it('property: inside allowlist + scope ⇒ allow; outside ⇒ OUTSIDE_ALLOWLIST', async () => {
    const inside = path.join(tempRoot, 'src', 'ok.txt');
    const outside = path.join(tempRoot, 'outside-allow', 'x.txt');
    await withWriteScope(
      { repoRoot: tempRoot, roots: ['src', 'tests', 'docs', 'config'] },
      async () => {
        const ok = authorizeWrite(inside, { repoRoot: tempRoot });
        assert.equal(ok.allowed, true);
        assert.equal(ok.reason, 'OK');
        const bad = authorizeWrite(outside, { repoRoot: tempRoot });
        assert.equal(bad.allowed, false);
        assert.equal(bad.reason, 'OUTSIDE_ALLOWLIST');
      }
    );
  });

  it('property: random relative suffixes under Fundacion remain denied (falsifier)', async () => {
    const fuzzer = new PropertyBasedFalsifier();
    await withWriteScope(
      { repoRoot: tempRoot, roots: ['src', 'tests', 'docs', 'config'] },
      async () => {
        const result = fuzzer.checkProperty(
          (suffix) => {
            const safe = String(suffix || 'x')
              .replace(/[<>:"|?*\0]/g, '_')
              .replace(/\\/g, '/')
              .split('/')
              .filter((s) => s && s !== '..' && s !== '.')
              .join(path.sep) || 'probe.txt';
            const target = path.join(tempRoot, 'Fundacion', safe);
            const v = authorizeWrite(target, { repoRoot: tempRoot });
            return v.allowed === false && v.reason === 'FUNDACION_ALWAYS_DENY';
          },
          [() => fuzzer.arbitraryString(32)],
          { iterations: 200 }
        );
        assert.equal(result.passed, true, JSON.stringify(result.minimalCounterExample || result));
      }
    );
  });

  it('property: normalizeBarrierPath is idempotent', () => {
    const fuzzer = new PropertyBasedFalsifier();
    const result = fuzzer.assertIdempotent(
      normalizeBarrierPath,
      () => {
        const mix = [
          fuzzer.arbitraryString(40),
          'C:\\Users\\valen\\Documents\\Fundacion\\x',
          'src/../Fundacion/a',
          '/tmp//double//slash'
        ];
        return mix[Math.floor(Math.random() * mix.length)];
      },
      { iterations: 300 }
    );
    assert.equal(result.passed, true);
  });

  it('property: isPathInsideRoot is prefix-closed for normalized paths', () => {
    const root = normalizeBarrierPath(path.join(tempRoot, 'src'));
    const child = normalizeBarrierPath(path.join(tempRoot, 'src', 'a', 'b.txt'));
    const cousin = normalizeBarrierPath(path.join(tempRoot, 'srcx', 'a.txt'));
    assert.equal(isPathInsideRoot(child, root), true);
    assert.equal(isPathInsideRoot(root, root), true);
    assert.equal(isPathInsideRoot(cousin, root), false);
  });
});
