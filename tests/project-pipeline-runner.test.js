import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ProjectPipelineRunner,
  loadProjectRegistration,
  parseOrchestrateArgs,
  PIPELINE_PHASES
} from '../src/core/runtime/project-pipeline-runner.js';

describe('EOS ProjectPipelineRunner', () => {
  test('parseOrchestrateArgs supports --project/--phase and --pipeline forms', () => {
    assert.deepEqual(
      parseOrchestrateArgs(['run', '--project', 'PRJ-APP-FUERZA', '--phase', 'verify']),
      { projectId: 'PRJ-APP-FUERZA', phase: 'verify' }
    );
    assert.deepEqual(
      parseOrchestrateArgs(['--project=PRJ-APP-FUERZA', '--pipeline=audit']),
      { projectId: 'PRJ-APP-FUERZA', phase: 'audit' }
    );
    assert.ok(PIPELINE_PHASES.includes('verify'));
  });

  test('loadProjectRegistration resolves PRJ-APP-FUERZA from registrations', () => {
    const root = process.cwd();
    const { registration, registrationPath } = loadProjectRegistration('PRJ-APP-FUERZA', root);
    assert.equal(registration.project_id, 'PRJ-APP-FUERZA');
    assert.ok(registrationPath.includes('app-fuerza'));
  });

  test('verify phase runs auditors, confirms EVD-0007, and seals SHA-256 evidence', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pipeline-'));
    const regDir = path.join(tmp, 'docs/projects/registrations');
    const evdDir = path.join(tmp, 'docs/evidence');
    fs.mkdirSync(regDir, { recursive: true });
    fs.mkdirSync(evdDir, { recursive: true });
    fs.mkdirSync(path.join(tmp, 'src/app-fuerza/core'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/app-fuerza/core/timers.js'), '// proxy\n');
    fs.writeFileSync(path.join(tmp, 'src/app-fuerza/core/sync-wal.js'), '// proxy\n');

    fs.writeFileSync(
      path.join(regDir, 'app-fuerza.json'),
      JSON.stringify({
        project_id: 'PRJ-APP-FUERZA',
        name: 'ATP Strength',
        path: path.join(tmp, 'missing-satellite'),
        technical_status: 'VERIFIED'
      }),
      'utf8'
    );

    fs.writeFileSync(
      path.join(evdDir, 'EVD-0007.json'),
      JSON.stringify({
        id: 'EVD-0007',
        claim: 'fixture',
        status: 'VERIFIED',
        scope: 'test',
        timestamp: new Date().toISOString(),
        actor: 'test',
        action: 'fixture',
        command: 'fixture',
        expected: 'PASS',
        actual: 'PASS',
        result: 'PASS',
        confidence: 'HIGH'
      }),
      'utf8'
    );

    const runner = new ProjectPipelineRunner({
      controlPlaneRoot: tmp,
      skipSatelliteCommands: true
    });

    const result = await runner.run('PRJ-APP-FUERZA', 'verify');

    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.phase, 'verify');
    assert.ok(result.sha256.startsWith('sha256-'));
    assert.ok(fs.existsSync(result.evidencePath));
    assert.equal(result.steps.auditors.status, 'VERIFIED');
    assert.equal(result.steps.confirmedEvidence.status, 'CONFIRMED');
    assert.ok(
      result.steps.auditors.coreAuditors.some((a) => a.name === 'quality')
    );
    assert.ok(
      result.steps.auditors.coreAuditors.some((a) => a.name === 'security')
    );
    assert.ok(
      result.steps.auditors.coreAuditors.some((a) => a.name === 'architecture')
    );
  });

  test('invalid phase is rejected', async () => {
    const runner = new ProjectPipelineRunner({ controlPlaneRoot: process.cwd() });
    await assert.rejects(
      () => runner.run('PRJ-APP-FUERZA', 'not-a-phase'),
      /INVALID_PIPELINE_PHASE/
    );
  });
});
