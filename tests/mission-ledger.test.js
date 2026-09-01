import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MissionLedger } from '../scripts/engine/mission-ledger.js';

const TEST_DIR = path.resolve('tests/fixtures/test-ledger');
const LEGACY_DIR = path.resolve('tests/fixtures/test-ledger/legacy');

test.after(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

test('ML-01: Initializes mission with feature list and progress file', () => {
  const ledger = new MissionLedger({ baseDir: TEST_DIR, legacyDir: LEGACY_DIR });
  const missionId = `TEST-MIS-${Date.now()}`;
  const features = [
    { id: 'FEAT-001', name: 'Authority Adapter', status: 'PENDING' },
    { id: 'FEAT-002', name: 'Context Compiler', status: 'PENDING' }
  ];

  const list = ledger.initializeMission(missionId, features);
  assert.equal(list.missionId, missionId);
  assert.equal(list.features.length, 2);

  const readBack = ledger.getFeatureList(missionId);
  assert.equal(readBack.features[0].name, 'Authority Adapter');
});

test('ML-02: Updates feature status to IN_PROGRESS and PASS', () => {
  const ledger = new MissionLedger({ baseDir: TEST_DIR, legacyDir: LEGACY_DIR });
  const missionId = `TEST-MIS-${Date.now()}`;
  ledger.initializeMission(missionId, [{ id: 'FEAT-001', name: 'Authority Adapter', status: 'PENDING' }]);

  ledger.updateFeatureStatus(missionId, 'FEAT-001', 'IN_PROGRESS');
  let list = ledger.getFeatureList(missionId);
  assert.equal(list.features[0].status, 'IN_PROGRESS');

  ledger.updateFeatureStatus(missionId, 'FEAT-001', 'PASS');
  list = ledger.getFeatureList(missionId);
  assert.equal(list.features[0].status, 'PASS');
});

test('ML-03: VERIFIED status requires an attached evidence receipt', () => {
  const ledger = new MissionLedger({ baseDir: TEST_DIR, legacyDir: LEGACY_DIR });
  const missionId = `TEST-MIS-${Date.now()}`;
  ledger.initializeMission(missionId, [{ id: 'FEAT-001', name: 'Feature 1', status: 'PENDING' }]);

  assert.throws(() => {
    ledger.updateFeatureStatus(missionId, 'FEAT-001', 'VERIFIED');
  }, /without attached evidence receipt/);

  ledger.updateFeatureStatus(missionId, 'FEAT-001', 'VERIFIED', 'EVD-P01-TEST');
  const list = ledger.getFeatureList(missionId);
  assert.equal(list.features[0].status, 'VERIFIED');
  assert.equal(list.features[0].evidenceReceipt, 'EVD-P01-TEST');
});

test('ML-04: Recovers state sequentially from append-only log', () => {
  const ledger = new MissionLedger({ baseDir: TEST_DIR, legacyDir: LEGACY_DIR });
  const missionId = `TEST-MIS-RECOVER-${Date.now()}`;
  ledger.initializeMission(missionId, [{ id: 'FEAT-001', name: 'Feature 1', status: 'PENDING' }]);
  ledger.updateFeatureStatus(missionId, 'FEAT-001', 'VERIFIED', 'EVD-RECOVER-001');

  // Simulate corrupt feature_list.json by deleting it
  const featPath = path.join(TEST_DIR, `feature_list_${missionId}.json`);
  if (fs.existsSync(featPath)) {
    fs.unlinkSync(featPath);
  }

  assert.equal(ledger.getFeatureList(missionId), null);

  const recovered = ledger.recover(missionId);
  assert.equal(recovered.features[0].status, 'VERIFIED');
  assert.equal(recovered.features[0].evidenceReceipt, 'EVD-RECOVER-001');
});
