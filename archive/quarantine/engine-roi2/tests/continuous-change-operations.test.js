import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SequentialChangeChainManager,
  CrossChangeDependencyGraph,
  ChangeConflictResolver,
  BkmDriftManager,
  ContinuousChangeOperationsEngine
} from '../scripts/engine/continuous-change-operations.js';

// ====================================================
// EOS CONTINUOUS CHANGE OPERATIONS TESTS (CCO-01..07)
// ====================================================

const engine = new ContinuousChangeOperationsEngine();

test('CCO-01: Sequential Change Chains maintain unbroken SHA-256 cryptographic lineage across changes', () => {
  const chainManager = new SequentialChangeChainManager();
  const res = chainManager.executeChangeChain([
    { id: 'CHG-01', spec: 'Semantic Shell', status: 'COMPLETED' },
    { id: 'CHG-02', spec: 'Modal Dialog', status: 'COMPLETED' },
    { id: 'CHG-03', spec: 'Theme Switcher', status: 'COMPLETED' }
  ]);

  assert.equal(res.chainLength, 3);
  assert.equal(res.unbrokenLineage, true);
  assert.ok(res.finalChainHash.length === 64);
  assert.equal(res.verdict, 'SEQUENTIAL_CHANGE_CHAIN_VALIDATED');
});

test('CCO-02: Cross-Change Dependency Graph models causal enabling edges between changes', () => {
  const depGraph = new CrossChangeDependencyGraph();
  const res = depGraph.buildDependencyGraph([
    { from: 'CHG-SHELL', to: 'CHG-MODAL', relation: 'ENABLES' },
    { from: 'CHG-MODAL', to: 'CHG-CHECKOUT', relation: 'ENABLES' }
  ]);

  assert.equal(res.edgesCount, 2);
  assert.equal(res.graphValid, true);
  assert.equal(res.verdict, 'CROSS_CHANGE_DEPENDENCY_GRAPH_VERIFIED');
});

test('CCO-03: Change Conflict Resolution preserves both historical intentions and synthesizes optimal merge', () => {
  const resolver = new ChangeConflictResolver();
  const res = resolver.resolveConflict({
    changeA: 'CHG-AUTH-MAGIC-LINK',
    changeB: 'CHG-AUTH-PASSKEY',
    conflictingPath: 'src/auth/handler.ts'
  });

  assert.equal(res.conflictDetected, true);
  assert.equal(res.historiesDestroyed, false);
  assert.equal(res.reconciledChange.preservedHistories, true);
  assert.ok(res.reconciledChange.reconciledDiffHash.length === 64);
  assert.equal(res.verdict, 'CHANGE_CONFLICT_RECONCILED_HISTORIES_PRESERVED');
});

test('CCO-04: BKM Drift Manager narrows scope and issues tombstone when ecosystem shifts', () => {
  const driftManager = new BkmDriftManager();
  const res = driftManager.evaluateBkmDrift(
    { bkmId: 'BKM-CSS-01', targetFrameworkVersion: 'Tailwind v3' },
    { currentFrameworkVersion: 'Tailwind v4' }
  );

  assert.equal(res.driftDetected, true);
  assert.equal(res.action, 'NARROW_SCOPE_AND_ISSUE_TOMBSTONE');
  assert.ok(res.tombstoneHash.length === 64);
  assert.equal(res.verdict, 'BKM_DRIFT_MANAGED_TOMBSTONE_PRESERVED');
});

test('CCO-05..07: Continuous Change Operations Program executes full 7-vector suite', () => {
  const fullRun = engine.executeContinuousChangeProgram();

  assert.equal(fullRun.program, 'EOS-CONTINUOUS-CHANGE-OPERATIONS-001');
  assert.equal(fullRun.allVectorsPassed, true);
  assert.equal(fullRun.longRunningCycle.zeroAuthorityLeaks, true);
  assert.equal(fullRun.cleanRoomReplay.invariantsIdentical, true);
  assert.equal(fullRun.independentAudit.specToOutcomeVerified, true);
  assert.equal(fullRun.verdict, 'EOS_CONTINUOUS_CHANGE_OPERATIONS_CERTIFIED');
});
