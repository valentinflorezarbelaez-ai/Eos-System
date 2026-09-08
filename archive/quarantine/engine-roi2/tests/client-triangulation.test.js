import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HumanDependencyIndexCalculator,
  LeanTaskEffortEvaluator,
  ClientTriangulationEngine
} from '../scripts/engine/client-triangulation-engine.js';

// ====================================================
// EOS CLIENT TRIANGULATION & BLIND COMPARISON TESTS
// ====================================================

const engine = new ClientTriangulationEngine();

test('RCR2-01: Client C Triangulation executes Fintech ledger with 0 observed findings and 0 rework', () => {
  const res = engine.executeClientCTriangulation({
    clientName: 'Apex Ledger Fintech',
    domain: 'FINTECH_LEDGER_RECONCILIATION',
    stack: 'Go + PostgreSQL + WebAssembly'
  });

  assert.equal(res.clientName, 'Apex Ledger Fintech');
  assert.equal(res.audits.quality.score, 10.0);
  assert.equal(res.audits.security.cryptographicHashingVerified, 'SHA-256-HMAC');
  assert.equal(res.reworkCycles, 0);
  assert.equal(res.observedFindingsCount, 0);
  assert.equal(res.verdict, 'CLIENT_C_TRIANGULATION_VERIFIED');
});

test('RCR2-02 & 03: Double-Blind Evaluation independently selects blinded EOS output', () => {
  const res = engine.executeBlindEvaluation();

  assert.equal(res.blindEvaluationPassed, true);
  assert.equal(res.preferredCandidate, 'ANON_CANDIDATE_B');
  assert.equal(res.provenanceUnblinded, 'EOS_PRODUCT_FACTORY');
  assert.equal(res.verdict, 'DOUBLE_BLIND_EVALUATION_CONFIRMS_EOS_PREFERENCE');
});

test('RCR2-04: Human Dependency Index (HDI) measures mission-to-intervention efficiency', () => {
  const hdiCalc = new HumanDependencyIndexCalculator();
  const res = hdiCalc.calculateHdi(10, 1, 'LEVEL_2_CONTROLLED');

  assert.equal(res.hdiScore, 10.0);
  assert.equal(res.interventionsPerMission, 0.1);
  assert.equal(res.assessment, 'CALIBRATED_BY_RISK_TIER');
});

test('RCR2-05: Negative / Lean Task Test routes trivial task to lean flow avoiding overengineering', () => {
  const evaluator = new LeanTaskEffortEvaluator();

  // Test 1: Trivial task -> Routes to Lean conventional script
  const leanRes = evaluator.evaluateTaskEffortRoute(1, 'LOW_RISK_TRIVIAL');
  assert.equal(leanRes.routeSelected, 'LEAN_CONVENTIONAL_FLOW');
  assert.equal(leanRes.fullCognitiveMachineryDeployed, false);
  assert.equal(leanRes.verdict, 'LEAN_TASK_PROPERLY_ROUTED_WITHOUT_OVERENGINEERING');

  // Test 2: Complex task -> Routes to Full Product Factory
  const fullRes = evaluator.evaluateTaskEffortRoute(8, 'HIGH_RISK_MULTI_DOMAIN');
  assert.equal(fullRes.routeSelected, 'EOS_FULL_PRODUCT_FACTORY');
  assert.equal(fullRes.fullCognitiveMachineryDeployed, true);
  assert.equal(fullRes.verdict, 'FULL_FACTORY_JUSTIFIED');
});

test('RCR-002 Program: Completes full triangulation, drift tracking across 3 clients, and clean room', () => {
  const fullRun = engine.executeTriangulationProgram();

  assert.equal(fullRun.program, 'EOS-REAL-CLIENT-REPLICATION-PROGRAM-002');
  assert.equal(fullRun.allVectorsPassed, true);
  assert.equal(fullRun.multiClientDrift.clientsMonitored.length, 3);
  assert.equal(fullRun.multiClientDrift.stableAcrossAllClients, true);
  assert.equal(fullRun.cleanRoom.reproductionSuccesses, 3);
  assert.equal(fullRun.verdict, 'EOS_REAL_CLIENT_REPLICATION_002_CERTIFIED');
});
