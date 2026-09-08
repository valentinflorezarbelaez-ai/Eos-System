import test from 'node:test';
import assert from 'node:assert/strict';
import { LongRunIndependentOperationEngine } from '../scripts/engine/long-run-independent-operation.js';

// ====================================================
// EOS LONG-RUN INDEPENDENT OPERATION TESTS (LRI-01..08)
// ====================================================

const engine = new LongRunIndependentOperationEngine();

test('LRI-01 & 02: 12-Month Multi-Cohort Continuity verifies high outcome across all user groups', () => {
  const res = engine.evaluateMultiMonthContinuity(12);

  assert.equal(res.operationSpanMonths, 12);
  assert.equal(res.cohortsMonitored, 3);
  assert.equal(res.allCohortsMaintainedHighOutcome, true);
  assert.equal(res.verdict, 'LONG_RUN_USER_CONTINUITY_MAINTAINED');
});

test('LRI-03 & 04: Churn and Memory Drift confirms zero regressions and 100% memory integrity', () => {
  const res = engine.evaluateChurnAndMemoryDrift();

  assert.equal(res.churnEventsHandled.length, 3);
  assert.equal(res.driftMetrics.memoryIntegrityPct, 100.0);
  assert.equal(res.driftMetrics.securityViolations, 0);
  assert.equal(res.driftWithinAcceptableBounds, true);
  assert.equal(res.verdict, 'CHURN_AND_DRIFT_INVARIANTS_SATISFIED');
});

test('LRI-05: Longitudinal User Outcomes proves 64.8% efficiency gain and zero friction points', () => {
  const res = engine.evaluateLongitudinalUserOutcomes();

  assert.equal(res.timeOnTaskTrends.efficiencyImprovementPct, 64.8);
  assert.equal(res.frictionReduction.month12FrictionPoints, 0);
  assert.equal(res.frictionReduction.sustainedTrustScore, 9.7);
  assert.equal(res.verdict, 'HUMAN_VALUE_LONGITUDINALLY_PROVEN');
});

test('LRI-06 & 07: Tri-partite Decoupled Auditing proves Executor != Observer != Certifier with clean replay', () => {
  const res = engine.evaluateIndependentAuditingArchitecture();

  assert.equal(res.triPartiteSeparation.isFullyDecoupled, true);
  assert.equal(res.cleanRoomReplay.mismatchCount, 0);
  assert.equal(res.cleanRoomReplay.reconstructedMissions, 50);
  assert.equal(res.verdict, 'INDEPENDENT_AUDITING_AND_REPLAY_VALIDATED');
});

test('LRI-08: Final Production-Readiness Review keeps GATE-13 strictly CLOSED and GAP-002 UNKNOWN', () => {
  const res = engine.evaluateFinalProductionReadiness();

  assert.equal(res.readyForGeneralProduction, false);
  assert.equal(res.dimensions.fundacionGap002.status, 'BLOCKED_UNKNOWN');
  assert.equal(res.dimensions.gate13ProductionAutonomy.status, 'STRICTLY_CLOSED');
  assert.equal(res.gate13Status, 'STRICTLY_CLOSED_PENDING_PO_AUTHORIZATION');
  assert.equal(res.verdict, 'LRI_001_CERTIFIED_GATE13_REMAINS_STRICTLY_CLOSED');
});

test('LRI-001 Program: Completes full long-run independent operation suite cleanly', () => {
  const fullRun = engine.executeLongRunProgram();

  assert.equal(fullRun.program, 'EOS-LONG-RUN-INDEPENDENT-OPERATION-001');
  assert.equal(fullRun.allVectorsPassed, true);
  assert.equal(fullRun.readiness.gate13Status, 'STRICTLY_CLOSED_PENDING_PO_AUTHORIZATION');
  assert.equal(fullRun.verdict, 'EOS_LONG_RUN_INDEPENDENT_OPERATION_001_COMPLETED');
});
