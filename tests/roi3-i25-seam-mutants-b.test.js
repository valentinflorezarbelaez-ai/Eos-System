/**
 * ROI3 I2.5 seam mutant oracle suite B — write-barrier Fundacion kill.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorizeWrite, withWriteScope } from '../src/core/write-barrier/index.js';
import { isFundacionPath } from '../src/core/write-barrier/paths.js';
import {
  MISSION_LOOP_ORDER,
  MISSION_LOOP_TRANSITIONS,
  evaluateStageTransition
} from '../src/core/mcp/mission-loop.js';

function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-roi3-mut-'));
  for (const rel of ['src', 'tests', 'docs', 'config', 'Fundacion']) {
    fs.mkdirSync(path.join(root, rel), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'src', 'ok.txt'), 'seed\n');
  fs.writeFileSync(path.join(root, 'Fundacion', 'probe.md'), 'frozen\n');
  fs.mkdirSync(path.join(root, 'config', 'security'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config', 'security', 'write-barrier-ssot-roots.json'),
    JSON.stringify({
      version: 1,
      repoRelativeAllowRoots: ['src', 'tests', 'docs', 'config'],
      alwaysDenyRepoRelative: ['Fundacion']
    })
  );
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"eos-roi3-mut","type":"module"}\n');
  return root;
}

describe('ROI3 I2.5 seam mutants B', () => {
  it('kills inverted-adjacency oracle on happy-path edges', () => {
    for (let i = 0; i < MISSION_LOOP_ORDER.length - 1; i++) {
      const from = MISSION_LOOP_ORDER[i];
      const to = MISSION_LOOP_ORDER[i + 1];
      const prod = evaluateStageTransition(from, to);
      const invertedOk = !(MISSION_LOOP_TRANSITIONS[from] || []).includes(to);
      assert.equal(prod.ok, true);
      assert.equal(invertedOk, false);
      assert.notEqual(prod.ok, invertedOk);
    }
  });

  it('kills ignore-Fundacion oracle under open scope', async () => {
    const root = makeTempRepo();
    const prev = process.cwd();
    process.chdir(root);
    try {
      const fundacionPath = path.join(root, 'Fundacion', 'probe.md');
      assert.equal(isFundacionPath(fundacionPath), true);
      await withWriteScope({ repoRoot: root, roots: ['src', 'tests', 'docs', 'config'] }, async () => {
        const prod = authorizeWrite(fundacionPath, { repoRoot: root });
        assert.equal(prod.allowed, false);
        assert.equal(prod.reason, 'FUNDACION_ALWAYS_DENY');
      });
    } finally {
      process.chdir(prev);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('records L0: audit:mutation exists; Stryker absent', () => {
    const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.equal(pkg.scripts['audit:mutation'], 'node scripts/mutation-audit.js');
    assert.ok(!pkg.dependencies);
    assert.ok(!pkg.devDependencies || !pkg.devDependencies['@stryker-mutator/core']);
  });
});
