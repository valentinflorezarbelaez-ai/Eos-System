import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { TelemetryAutoSync } from '../src/core/observability/telemetry-auto-sync.js';

test('EOS-AUTO-SYNC: Mission Control Telemetry Synchronization', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-telemetry-sync-'));
  const missionDir = path.join(tempDir, 'EOS-MISSION-CONTROL');
  fs.mkdirSync(missionDir, { recursive: true });

  const statePath = path.join(missionDir, 'CURRENT_STATE.json');
  const missionPath = path.join(missionDir, 'CURRENT_MISSION.json');

  fs.writeFileSync(statePath, JSON.stringify({
    strict_checks: '500 / 500 PASS',
    updated_at: '2026-01-01T00:00:00Z'
  }, null, 2), 'utf8');

  fs.writeFileSync(missionPath, JSON.stringify({
    evidence: { strict_verifier: '500/500 PASS' },
    updated_at: '2026-01-01T00:00:00Z'
  }, null, 2), 'utf8');

  await t.test('SYNC-01: Synchronizes state and mission files with live metrics', () => {
    const syncer = new TelemetryAutoSync({ root: tempDir });
    
    // Mock live measurement
    syncer.measureLiveTruth = () => ({
      head: '53f9e56',
      branch: 'main',
      passed: 506,
      failed: 0
    });

    const res = syncer.sync();

    assert.equal(res.success, true);
    assert.equal(res.updatedFiles.length, 2);

    const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const updatedMission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));

    assert.equal(updatedState.strict_checks, '506 / 506 PASS');
    assert(typeof updatedState.last_telemetry_hash === 'string');
    assert.equal(updatedMission.evidence.strict_verifier, '506/506 PASS (0 failures)');
    assert.equal(updatedMission.evidence.eos_elevate, 'VERIFIED_SPEC_0002');
  });

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});
