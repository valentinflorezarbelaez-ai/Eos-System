/**
 * Q5 — Mission artifact write governance (selected writers → Write Barrier / envelope).
 * NOT a parallel EVD ledger. Fundacion untouched. PRODUCTION_READY=NO.
 */
import { describe, it, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  writeMissionArtifactFile,
  auditMissionArtifactWritePaths,
  sourceWritesUngovernedMissionArtifact,
  assertUnderMissionsRoot,
  ensureMissionsWriteBarrierSsot,
  MISSION_ARTIFACT_WRITE_MODULE,
  MISSION_ARTIFACT_ALLOW_ROOT,
  MISSION_ARTIFACT_ROUTED_CALLERS
} from '../src/core/runtime/mission-artifact-write.js';
import { WriteBarrierDeniedError, authorizeWrite, withWriteScope } from '../src/core/write-barrier/index.js';
import { GovernedTaskExecutor } from '../src/core/runtime/governed-task-executor.js';
import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('Q5 mission artifact write governance', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-q5-'));
  });

  afterEach(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('repo audit ok: SSOT allows .missions + routed callers use envelope', () => {
    const audit = auditMissionArtifactWritePaths(rootDir);
    assert.equal(audit.ok, true, JSON.stringify(audit.violations, null, 2));
    assert.equal(audit.missionsAllowlisted, true);
    assert.equal(audit.scope, 'mission-artifact-selected');
    assert.ok(audit.sanctioned.includes(MISSION_ARTIFACT_WRITE_MODULE));
    for (const rel of MISSION_ARTIFACT_ROUTED_CALLERS) {
      assert.ok(audit.routedOk.includes(rel), `expected routedOk ${rel}: ${JSON.stringify(audit)}`);
    }
  });

  it('write-barrier SSOT includes .missions allow root', () => {
    const ssotPath = path.join(rootDir, 'config', 'security', 'write-barrier-ssot-roots.json');
    const raw = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
    assert.ok(raw.repoRelativeAllowRoots.includes(MISSION_ARTIFACT_ALLOW_ROOT));
  });

  it('assertUnderMissionsRoot denies paths outside .missions', () => {
    assert.throws(
      () => assertUnderMissionsRoot(path.join(tempRoot, 'src', 'x.json'), tempRoot),
      (err) => err instanceof WriteBarrierDeniedError
    );
  });

  it('writeMissionArtifactFile writes under .missions via barrier scope', () => {
    ensureMissionsWriteBarrierSsot(tempRoot);
    const target = path.join(tempRoot, '.missions', 'MIS-Q5', 'plan.json');
    const result = writeMissionArtifactFile({
      controlPlaneRoot: tempRoot,
      targetPath: target,
      content: JSON.stringify({ ok: true }, null, 2),
      label: 'q5-test'
    });
    assert.equal(result.governed, true);
    assert.equal(result.envelope, 'mission-artifact-write');
    assert.ok(fs.existsSync(target));
    assert.match(fs.readFileSync(target, 'utf8'), /"ok": true/);
  });

  it('ensureMissionsWriteBarrierSsot patches incomplete existing fixture SSOT', () => {
    // Mirrors mission-loop / Phase4 fixtures that predate Q5 .missions allow root.
    fs.mkdirSync(path.join(tempRoot, 'config', 'security'), { recursive: true });
    const ssotPath = path.join(tempRoot, 'config', 'security', 'write-barrier-ssot-roots.json');
    fs.writeFileSync(
      ssotPath,
      JSON.stringify(
        {
          version: 1,
          repoRelativeAllowRoots: ['src', 'tests', 'docs', 'config', 'scripts'],
          alwaysDenyRepoRelative: ['Fundacion']
        },
        null,
        2
      ),
      'utf8'
    );
    const ensured = ensureMissionsWriteBarrierSsot(tempRoot);
    assert.equal(ensured.patched, true);
    const raw = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
    assert.ok(raw.repoRelativeAllowRoots.includes(MISSION_ARTIFACT_ALLOW_ROOT));
    // Other roots preserved — do not weaken / replace global allowlist.
    assert.ok(raw.repoRelativeAllowRoots.includes('src'));
    assert.ok(raw.alwaysDenyRepoRelative.includes('Fundacion'));

    const target = path.join(tempRoot, '.missions', 'MIS-LOOP', 'direction.json');
    const result = writeMissionArtifactFile({
      controlPlaneRoot: tempRoot,
      targetPath: target,
      content: JSON.stringify({ goal: 'loop' }, null, 2),
      label: 'q5-incomplete-ssot'
    });
    assert.equal(result.governed, true);
    assert.ok(fs.existsSync(target));
  });

  it('writeMissionArtifactFile denies Fundacion paths', () => {
    ensureMissionsWriteBarrierSsot(tempRoot);
    fs.mkdirSync(path.join(tempRoot, 'Fundacion'), { recursive: true });
    // Even if someone tries to nest Fundacion under a weird path, isFundacionPath / deny roots apply.
    // Direct Fundacion write must fail the missions-root check first:
    assert.throws(
      () =>
        writeMissionArtifactFile({
          controlPlaneRoot: tempRoot,
          targetPath: path.join(tempRoot, 'Fundacion', 'x.md'),
          content: 'nope'
        }),
      (err) => err instanceof WriteBarrierDeniedError || /MISSION_ARTIFACT_OUTSIDE/.test(String(err))
    );
  });

  it('sourceWritesUngovernedMissionArtifact detects raw taskFile write', () => {
    const bad = `
      fs.writeFileSync(taskFile, JSON.stringify(taskContract), 'utf8');
      fs.writeFileSync(manifestFile, JSON.stringify(manifest), 'utf8');
    `;
    assert.equal(sourceWritesUngovernedMissionArtifact(bad), true);
    const good = `
      import { writeMissionArtifactFile } from './mission-artifact-write.js';
      writeMissionArtifactFile({ targetPath: taskFile, content: '{}' });
    `;
    assert.equal(sourceWritesUngovernedMissionArtifact(good), false);
  });

  it('GovernedTaskExecutor task/manifest writes go through envelope', async () => {
    ensureMissionsWriteBarrierSsot(tempRoot);
    const missionId = 'MIS-Q5-EXEC';
    const missionDir = path.join(tempRoot, '.missions', missionId);
    const tasksDir = path.join(missionDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(missionDir, 'direction.json'),
      JSON.stringify({ authority_level: 'LEVEL_1', project_path: missionDir }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(missionDir, 'integrity-manifest.json'),
      JSON.stringify({ mission_id: missionId, files: {} }, null, 2),
      'utf8'
    );
    const taskId = 'TASK-Q5-01';
    fs.writeFileSync(
      path.join(tasksDir, `${taskId}.json`),
      JSON.stringify({
        schema_version: '1.0.0',
        task_id: taskId,
        mission_id: missionId,
        objective: 'Q5 envelope smoke',
        status: 'approved',
        assigned_role: 'ENGINEER',
        budget: { max_duration_seconds: 30 }
      }),
      'utf8'
    );

    const executor = new GovernedTaskExecutor({ controlPlaneRoot: tempRoot });
    executor.validator = { assertValid() { return true; } };

    const result = await executor.executeTask(missionDir, taskId, {
      runner: async () => ({ exitCode: 0, stdout: 'ok', stderr: '' })
    });
    assert.equal(result.exitCode, 0);
    const taskAfter = JSON.parse(fs.readFileSync(path.join(tasksDir, `${taskId}.json`), 'utf8'));
    assert.equal(taskAfter.status, 'completed');
    const manifest = JSON.parse(
      fs.readFileSync(path.join(missionDir, 'integrity-manifest.json'), 'utf8')
    );
    assert.ok(manifest.files[`tasks/${taskId}.json`]);
  });

  it('MissionRuntime selected artifact writes land under .missions via envelope', () => {
    ensureMissionsWriteBarrierSsot(tempRoot);
    const rt = new MissionRuntime({ baseDir: tempRoot, allowLocalDirectorReceipt: true });
    // Lightweight: exercise _writeMissionArtifact / _updateManifestFile path via public create if too heavy,
    // else call private helpers through a minimal mission layout.
    const missionId = 'MIS-Q5-RT';
    const missionDir = path.join(tempRoot, '.missions', missionId);
    fs.mkdirSync(path.join(missionDir, 'artifacts'), { recursive: true });
    fs.mkdirSync(path.join(missionDir, 'evidence'), { recursive: true });
    // Use envelope-backed private helpers
    const art = rt._writeMissionArtifact(missionDir, 'q5-probe', { q5: true });
    assert.ok(art.uri.includes('artifacts/q5-probe.json'));
    assert.ok(fs.existsSync(path.join(missionDir, art.uri)));
    assert.ok(fs.existsSync(path.join(missionDir, 'integrity-manifest.json')));
  });

  it('package script test:q5 exists', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['test:q5'],
      'node --test tests/eos-q5-mission-artifact-write-governance.test.js'
    );
  });

  it('static audit flags synthetic bypass in routed caller fixture', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-q5-audit-'));
    fs.mkdirSync(path.join(fixtureRoot, 'src', 'core', 'runtime'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'config', 'security'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, 'config', 'security', 'write-barrier-ssot-roots.json'),
      JSON.stringify({
        version: 1,
        repoRelativeAllowRoots: ['.missions', 'src'],
        alwaysDenyRepoRelative: ['Fundacion']
      }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureRoot, MISSION_ARTIFACT_WRITE_MODULE),
      'export const MISSION_ARTIFACT_WRITE_MODULE = "x";\nexport function writeMissionArtifactFile(){}\nwriteFileSync(targetPath, content);\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'src', 'core', 'runtime', 'governed-task-executor.js'),
      `
import fs from 'node:fs';
export class GovernedTaskExecutor {
  run(taskFile) { fs.writeFileSync(taskFile, '{}'); }
}
`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'src', 'core', 'runtime', 'mission-runtime.js'),
      `
import { writeMissionArtifactFile } from './mission-artifact-write.js';
export class MissionRuntime {
  write(missionDir) {
    writeMissionArtifactFile({ targetPath: missionDir + '/plan.json', content: '{}' });
  }
}
`,
      'utf8'
    );
    const audit = auditMissionArtifactWritePaths(fixtureRoot);
    assert.equal(audit.ok, false);
    assert.ok(
      audit.violations.some(
        (v) =>
          v.path === 'src/core/runtime/governed-task-executor.js' &&
          (v.code === 'MISSION_ARTIFACT_ENVELOPE_NOT_IMPORTED' ||
            v.code === 'MISSION_ARTIFACT_RAW_WRITE_BYPASS')
      ),
      JSON.stringify(audit.violations)
    );
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });
});

test('Q5 authorizeWrite allows .missions under scoped SSOT', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-q5-scope-'));
  try {
    ensureMissionsWriteBarrierSsot(tempRoot);
    fs.mkdirSync(path.join(tempRoot, '.missions', 'M1'), { recursive: true });
    const target = path.join(tempRoot, '.missions', 'M1', 'x.json');
    await withWriteScope({ repoRoot: tempRoot, roots: ['.missions'] }, async () => {
      const verdict = authorizeWrite(target, { repoRoot: tempRoot });
      assert.equal(verdict.allowed, true, JSON.stringify(verdict));
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
