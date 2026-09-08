import test from 'node:test';
import assert from 'node:assert/strict';
import { SustainedOperationEngine } from '../scripts/engine/sustained-operation-engine.js';

// ====================================================
// EOS SUSTAINED OPERATION & PRODUCT FACTORY TESTS
// ====================================================

const engine = new SustainedOperationEngine();

test('O-01: Long-Run Operation Sequence achieves 100% SLO compliance over multiple missions', () => {
  const runResult = engine.executeLongRunOperationSequence();

  assert.equal(runResult.missionsExecutedCount, 5);
  assert.equal(runResult.missionSuccessRate, 1.0);
  assert.equal(runResult.sloCompliance, true);
  assert.ok(runResult.avgLatencyMs < 300);
  assert.equal(runResult.verdict, 'LONG_RUN_OPERATION_SLO_PASSED');
});

test('O-02: Multi-Project Continuity transfers BKMs while strictly blocking secrets and authority', () => {
  const projectA = { id: 'PRJ-FINTECH-CORP' };
  const projectB = { id: 'PRJ-HEALTHCARE-PUBLIC' };
  const sharedPayload = {
    bkmStrategy: 'BKM-ACCESSIBILITY-FIRST',
    secrets: [],
    authorizations: []
  };

  const continuityResult = engine.executeMultiProjectOperation(projectA, projectB, sharedPayload);
  assert.equal(continuityResult.isolationMaintained, true);
  assert.equal(continuityResult.secretsLeakedCount, 0);
  assert.equal(continuityResult.authorityLeakedCount, 0);
  assert.equal(continuityResult.bkmTransferred, 'BKM-ACCESSIBILITY-FIRST');
  assert.equal(continuityResult.verdict, 'MULTI_PROJECT_CONTINUITY_SECURE');
});

test('O-03: Ecosystem Drift Adapter auto-adapts to breaking MCP schema without mission collapse', () => {
  const driftEvent = {
    eventType: 'MCP_SCHEMA_VERSION_MUTATION',
    component: 'mcp-playwright',
    oldVersion: '1.0.0',
    newVersion: '2.0.0',
    schemaBreakingChange: true
  };

  const driftResult = engine.handleEcosystemDrift(driftEvent);
  assert.equal(driftResult.adapterApplied, true);
  assert.equal(driftResult.zeroMissionCollapse, true);
  assert.equal(driftResult.verdict, 'ECOSYSTEM_DRIFT_AUTONOMOUSLY_ADAPTED');
});

test('O-04: Governance Latency Handler freezes state snapshot and resumes cleanly after PO approval', () => {
  const gateReq = {
    operationId: 'OP-PROD-DEPLOY',
    riskTier: 'CRITICAL',
    statePayload: { step: 4, diffsPending: 2 }
  };

  const gateResult = engine.handleGovernanceApprovalGate(gateReq);
  assert.equal(gateResult.statePreserved, true);
  assert.equal(gateResult.evidencePreserved, true);
  assert.equal(gateResult.cleanResumption, true);
  assert.equal(gateResult.poDecision, 'APPROVED_BY_PO');
  assert.equal(gateResult.verdict, 'GOVERNANCE_LATENCY_SAFELY_HANDLED');
});

test('Intelligence Economics: Optimizes Pareto frontier between High-Stakes and Lean missions', () => {
  const highStakes = engine.selectEconomicStrategy({ stakes: 'HIGH_STAKES' });
  assert.equal(highStakes.strategy, 'MAX_RELIABILITY_FORMAL_GUIDED');
  assert.equal(highStakes.targetQuality, 9.9);

  const lean = engine.selectEconomicStrategy({ stakes: 'LOW_RISK_FAST' });
  assert.equal(lean.strategy, 'LEAN_FAST_OPTIMIZED');
  assert.equal(lean.targetQuality, 9.3);
  assert.ok(lean.estimatedCostUsd < highStakes.estimatedCostUsd);
});

test('Product Factory Pilot: Coordinates full 9-step delivery from Business Goal to Learning Delta', () => {
  const factoryResult = engine.executeProductFactoryRun('Deliver accessible high-conversion landing portal');
  assert.equal(factoryResult.stepsCompletedCount, 9);
  assert.equal(factoryResult.allStepsCompleted, true);
  assert.notEqual(factoryResult.deliverables.productArtifact, null);
  assert.equal(factoryResult.verdict, 'PRODUCT_FACTORY_MISSION_DELIVERED');
});
