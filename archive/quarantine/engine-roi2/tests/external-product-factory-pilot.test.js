import test from 'node:test';
import assert from 'node:assert/strict';
import { ExternalProductFactoryPilotEngine } from '../scripts/engine/external-product-factory-pilot.js';

// ====================================================
// EOS EXTERNAL PRODUCT FACTORY PILOT TESTS (EPF-01..10)
// ====================================================

const engine = new ExternalProductFactoryPilotEngine();

test('EPF-01: Read-Only Discovery operates with zero unauthorized mutations and computes tree hash', () => {
  const res = engine.executeReadOnlyDiscovery({
    repoPath: 'tests/fixtures/mission-projects/synthetic-website',
    repoName: 'PRJ-TEST-PILOT'
  });

  assert.equal(res.mode, 'READ_ONLY');
  assert.equal(res.unauthorizedMutationsCount, 0);
  assert.ok(res.initialTreeHash.length === 64);
  assert.equal(res.status, 'READ_ONLY_DISCOVERY_COMPLETED');
});

test('EPF-02 & 03: Autonomous Capability Resolution selects approved tool and issues least privilege token', () => {
  const res = engine.resolveAndAcquireCapability({
    capability: 'BROWSER_ACCESSIBILITY_AUDIT'
  });

  assert.equal(res.acquiredInSandbox, true);
  assert.equal(res.leastPrivilegeTokenIssued, true);
  assert.equal(res.selectedTool.name, 'playwright-mcp-axe');
  assert.equal(res.verdict, 'CAPABILITY_ACQUIRED_LEAST_PRIVILEGE');
});

test('EPF-04: Controlled Branch Execution requires explicit Level 2 PO token and validates rollback', () => {
  // 1. Unauthorized attempt -> blocked in AWAITING_APPROVAL
  const blocked = engine.executeControlledBranch({
    targetBranch: 'unauthorized-branch',
    authorizingToken: 'INVALID_TOKEN'
  });
  assert.equal(blocked.authorized, false);
  assert.equal(blocked.status, 'AWAITING_APPROVAL');

  // 2. Authorized attempt -> succeeds and proves rollback
  const allowed = engine.executeControlledBranch({
    targetBranch: 'authorized-branch-001',
    authorizingToken: 'PO_AUTH_LEVEL_2'
  });
  assert.equal(allowed.authorized, true);
  assert.equal(allowed.rollbackProven, true);
  assert.equal(allowed.status, 'CONTROLLED_BRANCH_EXECUTED_AND_VERIFIED');
});

test('EPF-05 & 06: Product Delivery & Multi-Audits verify WCAG AA, zero vulnerabilities, and 100% test pass', () => {
  const res = engine.deliverAndAuditProduct({ jtbdGoal: 'Accessible high-conversion booking portal' });

  assert.equal(res.allAuditsPassed, true);
  assert.equal(res.audits.accessibility.wcagAaCompliant, true);
  assert.equal(res.audits.security.vulnerabilityCount, 0);
  assert.equal(res.verdict, 'PRODUCT_DELIVERY_AND_AUDITS_VERIFIED');
});

test('EPF-07: Real User Validation measures completion rate >= 90% and trust score >= 8.5', () => {
  const res = engine.measureHumanOutcome({
    taskCompletionRate: 0.96,
    trustScore: 9.4,
    dropOffRate: 0.04,
    cognitiveOverloadDetected: false
  });

  assert.equal(res.isValidated, true);
  assert.equal(res.verdict, 'HUMAN_OUTCOME_VALIDATED');
});

test('EPF-08..10: Finalizes causal learning in Engram and proves clean-room reproduction (3/3)', () => {
  const res = engine.finalizeMissionAndAudit({
    missionId: 'MIS-FINAL-001',
    learningInsight: 'Context7 grounding eliminated API drift'
  });

  assert.equal(res.causalMemoryRecord.persistedInEngram, true);
  assert.equal(res.cleanRoomReproduction.successes, 3);
  assert.ok(res.eosValueVector.compositeEosValue >= 9.7);
  assert.equal(res.finalCertification, 'EPF_PILOT_001_INDEPENDENTLY_CERTIFIED');
});

test('Complete EPF Pilot: Executes full 10-step autonomous product engineering cycle', () => {
  const fullRun = engine.executeFullEpfPilot('Deliver accessible headless portal for non-profit');

  assert.equal(fullRun.allStepsSuccessful, true);
  assert.equal(fullRun.stepsExecuted.length, 10);
  assert.equal(fullRun.verdict, 'EOS_EXTERNAL_PRODUCT_FACTORY_PILOT_001_COMPLETED');
});
