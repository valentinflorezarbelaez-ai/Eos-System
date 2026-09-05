import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectOnboarder } from '../src/core/projects/project-onboarder.js';

test('ProjectOnboarder - Unit & Integration Test Suite', async (t) => {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-onboarder-test-'));
  const controlPlaneRoot = path.join(tmpBase, 'control-plane');
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'projects', 'registrations'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'intake'), { recursive: true });
  fs.mkdirSync(path.join(controlPlaneRoot, 'docs', 'evidence'), { recursive: true });

  const onboarder = new ProjectOnboarder({ controlPlaneRoot });

  await t.test('rejects missing or non-existent target paths', () => {
    assert.throws(() => onboarder.onboardProject(''), /MISSING_TARGET_PATH/);
    assert.throws(() => onboarder.onboardProject(path.join(tmpBase, 'non-existent')), /TARGET_NOT_FOUND/);
  });

  await t.test('onboards a Node/TypeScript project fixture', () => {
    const projectDir = path.join(tmpBase, 'my-synth-app');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'my-synth-app',
        version: '1.0.0',
        dependencies: { next: '16.0.0', react: '19.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
      'utf8'
    );
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), '{}', 'utf8');

    const result = onboarder.onboardProject(projectDir);
    assert.equal(result.success, true);
    assert.equal(result.registration.project_id, 'PRJ-MY-SYNTH-APP');
    assert.equal(result.registration.project_type, 'WEB_APP');
    assert.ok(result.registration.stack.includes('TypeScript'));
    assert.ok(fs.existsSync(result.registrationPath));
    assert.ok(fs.existsSync(result.contextPath));

    // Verify written JSON matches registration
    const written = JSON.parse(fs.readFileSync(result.registrationPath, 'utf8'));
    assert.equal(written.project_id, 'PRJ-MY-SYNTH-APP');
    assert.equal(written.intake_status, 'COMPLETE');
  });

  await t.test('onboards a Python project fixture', () => {
    const pyDir = path.join(tmpBase, 'data-service');
    fs.mkdirSync(pyDir, { recursive: true });
    fs.writeFileSync(
      path.join(pyDir, 'requirements.txt'),
      'fastapi==0.110.0\nsqlalchemy==2.0.25\n',
      'utf8'
    );

    const result = onboarder.onboardProject(pyDir);
    assert.equal(result.success, true);
    assert.equal(result.registration.project_id, 'PRJ-DATA-SERVICE');
    assert.ok(result.registration.stack.includes('Python'));
    assert.ok(result.registration.stack.includes('FastAPI'));
  });

  await t.test('getFleetStatus aggregates projects and detects evidence', () => {
    // Add mock evidence
    const evdFile = path.join(controlPlaneRoot, 'docs', 'evidence', 'EVD-9999.json');
    fs.writeFileSync(
      evdFile,
      JSON.stringify({
        id: 'EVD-9999',
        projectId: 'PRJ-MY-SYNTH-APP',
        sha256: 'sha256-mock1234567890',
        status: 'VERIFIED',
      }),
      'utf8'
    );

    const fleet = onboarder.getFleetStatus();
    assert.equal(fleet.totalCount, 2);
    const synth = fleet.projects.find((p) => p.project_id === 'PRJ-MY-SYNTH-APP');
    assert.ok(synth);
    assert.equal(synth.latest_evidence?.evidenceId, 'EVD-9999');
    assert.equal(synth.latest_evidence?.sha256, 'sha256-mock1234567890');

    // Test terminal table formatting
    const table = onboarder.formatFleetTable(fleet);
    assert.ok(table.includes('PRJ-MY-SYNTH-APP'));
    assert.ok(table.includes('PRJ-DATA-SERVICE'));
    assert.ok(table.includes('EVD-9999.json'));
  });

  // Cleanup temporary directory
  try {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
