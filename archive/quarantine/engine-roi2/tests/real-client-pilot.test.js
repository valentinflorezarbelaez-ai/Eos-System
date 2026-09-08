import test from 'node:test';
import assert from 'node:assert/strict';
import { RealClientPilotEngine } from '../scripts/engine/real-client-pilot-engine.js';

// ====================================================
// EOS REAL CLIENT PRODUCT FACTORY PILOT TESTS (P-01..12)
// ====================================================

const engine = new RealClientPilotEngine();

test('P-01 & 02: Client Discovery extracts valid JTBD and baseline friction points', () => {
  const res = engine.executeClientDiscovery({
    clientName: 'Global Freight Ltd',
    businessGoal: 'Instant shipment tracking'
  });

  assert.equal(res.clientName, 'Global Freight Ltd');
  assert.ok(res.jtbd.includes('dispatchers'));
  assert.equal(res.baselineFrictionPoints.length, 3);
  assert.equal(res.status, 'CLIENT_DISCOVERY_COMPLETED');
});

test('P-03..06: Planning and Acquisition binds sandboxed tools and generates architecture spec', () => {
  const res = engine.executePlanningAndAcquisition('CHG-TEST-001', { clientName: 'Global Freight Ltd' });

  assert.equal(res.toolAcquired.sandboxed, true);
  assert.equal(res.toolAcquired.tokenIssued, 'LEAST_PRIVILEGE_TOKEN');
  assert.equal(res.architectureSpec.specsReady, true);
  assert.equal(res.status, 'PLANNING_AND_CAPABILITY_ACQUISITION_COMPLETED');
});

test('P-07 & 08: Implementation and Audits pass WCAG AA, 0 security vulnerabilities and 100% tests', () => {
  const res = engine.executeImplementationAndAudits('CHG-TEST-001');

  assert.equal(res.allAuditsPassed, true);
  assert.equal(res.audits.security.vulnerabilityCount, 0);
  assert.equal(res.audits.accessibility.wcagAaCompliant, true);
  assert.ok(res.diffHash.length === 64);
  assert.equal(res.status, 'IMPLEMENTATION_AND_AUDITS_PASSED');
});

test('P-09..12: Finalize Delivery measures user telemetry, client value vector, and Engram BKM update', () => {
  const res = engine.finalizeClientDelivery({ changeId: 'CHG-TEST-001', clientName: 'Global Freight Ltd' });

  assert.equal(res.userTelemetry.taskCompletionRate, 0.98);
  assert.equal(res.clientValueVector.reworkCycles, 0);
  assert.equal(res.bkmRecord.persistedInEngram, true);
  assert.equal(res.independentCertification.blindEvaluationPassed, true);
  assert.equal(res.status, 'REAL_CLIENT_PRODUCT_DELIVERED');
});

test('Full Real Client Pilot: Executes all 12 stages from Brief to Delivery cleanly', () => {
  const fullRun = engine.executeFullClientPilot({
    clientName: 'Alpine Medical Center',
    businessGoal: 'Accessible appointment booking portal'
  });

  assert.equal(fullRun.allStagesSuccessful, true);
  assert.equal(fullRun.stages.p09_12.clientValueVector.safety, 10.0);
  assert.equal(fullRun.verdict, 'EOS_REAL_CLIENT_PILOT_001_COMPLETED');
});
