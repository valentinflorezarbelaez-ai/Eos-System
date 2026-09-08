import test from 'node:test';
import assert from 'node:assert/strict';
import { RestrictedAutonomyOperationsEngine } from '../scripts/engine/restricted-autonomy-operations.js';

// ====================================================
// EOS RESTRICTED AUTONOMY OPERATIONS TESTS (RAO-01..08)
// ====================================================

const engine = new RestrictedAutonomyOperationsEngine();

test('RAO-01: Risk Classification Accuracy enforces zero under-classification', () => {
  const crit = engine.classifyActionRisk({ targetPath: 'Fundacion/index.html' });
  const high = engine.classifyActionRisk({ actionType: 'BRANCH_MERGE' });
  const med = engine.classifyActionRisk({ actionType: 'SPEC_SYNTHESIS' });
  const low = engine.classifyActionRisk({ actionType: 'LINT_CHECK' });

  assert.equal(crit.riskTier, 'CRITICAL_RISK');
  assert.equal(high.riskTier, 'HIGH_RISK');
  assert.equal(med.riskTier, 'MEDIUM_RISK');
  assert.equal(low.riskTier, 'LOW_RISK');
});

test('RAO-02: Authority Routing blocks causal memory from granting High-Risk execution authority', () => {
  const routingBlocked = engine.routeAuthority(
    { actionType: 'EXTERNAL_TOOL_BINDING' },
    { hasCausalBkm: true, hasExplicitL2Token: false }
  );

  assert.equal(routingBlocked.authorized, false);
  assert.equal(routingBlocked.routingDecision, 'DENIED_MISSING_L2_AUTHORIZATION');
});

test('RAO-03..06: Four-Tier Execution properly handles Low, Medium, High and Critical actions', () => {
  // Low Risk: Autonomous
  const low = engine.executeOperationTier({ actionType: 'READ_ONLY_AUDIT' });
  assert.equal(low.routing.authorized, true);

  // Medium Risk: Autonomous + Audit
  const med = engine.executeOperationTier({ actionType: 'SANDBOX_CODE_GENERATION' });
  assert.equal(med.routing.authorized, true);
  assert.equal(med.routing.classification.auditMode, 'MANDATORY_ASYNC_AUDIT');

  // High Risk: Blocked without L2
  const highDenied = engine.executeOperationTier({ actionType: 'BRANCH_MERGE' }, { hasExplicitL2Token: false });
  assert.equal(highDenied.routing.authorized, false);

  // High Risk: Approved with L2
  const highApproved = engine.executeOperationTier({ actionType: 'BRANCH_MERGE' }, { hasExplicitL2Token: true });
  assert.equal(highApproved.routing.authorized, true);

  // Critical Risk: Always Blocked Autonomously
  const crit = engine.executeOperationTier({ actionType: 'TARGET_REPO_MUTATION', targetPath: 'Fundacion' });
  assert.equal(crit.routing.authorized, false);
});

test('RAO-08: Autonomy Coverage by Risk Tier validates 100% compliance across all 4 categories', () => {
  const coverage = engine.calculateAutonomyCoverage();

  assert.equal(coverage.metrics.lowRisk.coveragePct, 100.0);
  assert.equal(coverage.metrics.mediumRisk.coveragePct, 100.0);
  assert.equal(coverage.metrics.highRisk.unapprovedExecuted, 0);
  assert.equal(coverage.metrics.criticalRisk.autonomousExecuted, 0);
  assert.equal(coverage.verdict, 'AUTONOMY_COVERAGE_COMPLIANT_WITH_GO_WITH_RESTRICTIONS');
});

test('RAO-001 Program: Completes full restricted autonomy operations suite cleanly', () => {
  const fullRun = engine.executeRestrictedAutonomyProgram();

  assert.equal(fullRun.program, 'EOS-RESTRICTED-AUTONOMY-OPERATIONS-001');
  assert.equal(fullRun.allTiersCompliant, true);
  assert.equal(fullRun.gate13Status, 'STRICTLY_CLOSED');
  assert.equal(fullRun.gap002Status, 'UNKNOWN');
  assert.equal(fullRun.verdict, 'EOS_RESTRICTED_AUTONOMY_OPERATIONS_001_CERTIFIED');
});
