import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StepVerifier,
  GuidedSearchEngine,
  BlastRadiusBudgeter,
  AtomicGraphUnlearning,
  NeuroSymbolicAdapter,
  CognitiveExecutionFabric
} from '../scripts/engine/cognitive-execution-fabric.js';
import { GraphIntelligencePlane } from '../scripts/engine/graph-intelligence-plane.js';

// ====================================================
// EOS COGNITIVE EXECUTION FABRIC TESTS (CF-01 to CF-10)
// ====================================================

test('CF-04: StepVerifier accepts safe step and prunes policy/risk violations', () => {
  const verifier = new StepVerifier();

  const safeStep = { id: 'STP-1', schemaValid: true, policyValid: true, staticChecksPass: true, riskScore: 1.0, evidenceScore: 9.0 };
  const riskyStep = { id: 'STP-2', schemaValid: true, policyValid: false, staticChecksPass: true, riskScore: 8.5, evidenceScore: 9.0 };

  const safeEval = verifier.verifyCandidateStep(safeStep);
  assert.equal(safeEval.accepted, true);
  assert.equal(safeEval.pruned, false);

  const riskyEval = verifier.verifyCandidateStep(riskyStep);
  assert.equal(riskyEval.accepted, false);
  assert.equal(riskyEval.pruned, true);
  assert.ok(riskyEval.rejectionReason.includes('Failed'));
});

test('CF-05: GuidedSearchEngine prunes unsafe branch and selects optimal verified path', () => {
  const searchEngine = new GuidedSearchEngine();

  const candidateBranches = [
    {
      branchId: 'BR-UNSAFE',
      name: 'Unsafe Shortcut Branch',
      steps: [{ schemaValid: true, policyValid: false, riskScore: 9.0, evidenceScore: 5.0 }]
    },
    {
      branchId: 'BR-OPTIMAL',
      name: 'Verified Guided Path',
      steps: [{ schemaValid: true, policyValid: true, riskScore: 1.0, evidenceScore: 9.8 }],
      estimatedCostUsd: 0.02,
      estimatedLatencyMs: 150
    }
  ];

  const searchResult = searchEngine.searchBestExecutionPath('Deploy accessible UI', candidateBranches);
  assert.equal(searchResult.totalBranchesEvaluated, 2);
  assert.equal(searchResult.prunedBranchesCount, 1);
  assert.equal(searchResult.selectedBranch.branchId, 'BR-OPTIMAL');
  assert.equal(searchResult.verdict, 'OPTIMAL_VERIFIED_BRANCH_SELECTED');
});

test('CF-03: BlastRadiusBudgeter enforces pre-mutation risk budget before write authorization', () => {
  const graph = new GraphIntelligencePlane();
  graph.addNode('TOL-CORE', 'TOOL', {});
  graph.addNode('AGT-1', 'AGENT', {});
  graph.addNode('TSK-1', 'TASK', {});
  graph.addNode('PRJ-1', 'PROJECT', { projectId: 'PRJ-1' });

  graph.addEdge('AGT-1', 'TOL-CORE', 'USES_TOOL');
  graph.addEdge('TSK-1', 'TOL-CORE', 'USES_TOOL');
  graph.addEdge('TOL-CORE', 'PRJ-1', 'AFFECTS_PROJECT');

  const budgeter = new BlastRadiusBudgeter(graph);

  // Mutation with tight budget (max 2 nodes) -> Exceeded (3 nodes affected)
  const tightMutation = budgeter.evaluateMutationBlastRadius({ targetToolId: 'TOL-CORE', targetProjectId: 'PRJ-1', proposedAction: 'DROP_TOOL', maxAllowedBlastRadius: 2 });
  assert.equal(tightMutation.withinBudget, false);
  assert.equal(tightMutation.action, 'BLOCK_EXCEEDS_BLAST_BUDGET');

  // Mutation with standard budget (max 5 nodes) -> Permitted
  const standardMutation = budgeter.evaluateMutationBlastRadius({ targetToolId: 'TOL-CORE', targetProjectId: 'PRJ-1', proposedAction: 'PATCH_TOOL', maxAllowedBlastRadius: 5 });
  assert.equal(standardMutation.withinBudget, true);
  assert.equal(standardMutation.action, 'AUTHORIZE_WITHIN_BLAST_BUDGET');
});

test('CF-07: AtomicGraphUnlearning marks root and derived beliefs with tombstones without destroying history', () => {
  const graph = new GraphIntelligencePlane();
  graph.addNode('BELIEF-ROOT', 'BKM', { status: 'ACTIVE' });
  graph.addNode('BELIEF-CHILD', 'BKM', { status: 'ACTIVE' });
  graph.addEdge('BELIEF-ROOT', 'BELIEF-CHILD', 'DERIVED_FROM');

  const unlearner = new AtomicGraphUnlearning(graph);
  const unlearnResult = unlearner.invalidateBeliefNode('BELIEF-ROOT', 'Observed negative performance drift');

  assert.equal(unlearnResult.invalidatedNodesCount, 2);
  assert.equal(graph.nodes.get('BELIEF-ROOT').properties.status, 'INVALIDATED');
  assert.equal(graph.nodes.get('BELIEF-ROOT').properties.tombstone, true);
  assert.equal(graph.nodes.get('BELIEF-CHILD').properties.status, 'INVALIDATED');
  assert.equal(unlearnResult.historicalAuditPreserved, true);
});

test('CF-08: NeuroSymbolicAdapter rejects specifications when counterexample is discovered', () => {
  const adapter = new NeuroSymbolicAdapter();

  const brokenSpec = {
    domain: 'FINANCIAL_TRANSACTION',
    propertyDescription: 'Non-negative balance across all rollbacks',
    counterexampleFound: true
  };
  const verifiedSpec = {
    domain: 'FINANCIAL_TRANSACTION',
    propertyDescription: 'Tokenized idempotency with zero double-spend',
    counterexampleFound: false
  };

  const evalBroken = adapter.verifyFormalProperty(brokenSpec);
  assert.equal(evalBroken.verified, false);
  assert.equal(evalBroken.verdict, 'FORMAL_VERIFICATION_REJECTED_COUNTEREXAMPLE');

  const evalVerified = adapter.verifyFormalProperty(verifiedSpec);
  assert.equal(evalVerified.verified, true);
  assert.equal(evalVerified.verdict, 'FORMAL_SPECIFICATION_VERIFIED');
});

test('CF-01 to CF-10: CognitiveExecutionFabric completes unified end-to-end execution loop', () => {
  const fabric = new CognitiveExecutionFabric();

  const missionRequest = {
    missionId: 'MIS-FABRIC-001',
    goal: 'Deliver accessible web architecture with bounded risk',
    candidateBranches: [
      {
        branchId: 'BR-1',
        name: 'Parallel Guided Stream',
        steps: [{ schemaValid: true, policyValid: true, riskScore: 1.0, evidenceScore: 9.5 }]
      }
    ],
    proposedMutation: { targetToolId: 'TOL-HEADLESS', targetProjectId: 'PRJ-PUBLIC', proposedAction: 'UPDATE', maxAllowedBlastRadius: 10 },
    formalSpec: { domain: 'AUTHORIZATION_GATE', propertyDescription: 'Zero unauthorized write delta invariant', counterexampleFound: false }
  };

  const outcome = fabric.executeCognitiveFabric(missionRequest);
  assert.equal(outcome.status, 'FABRIC_EXECUTION_COMPLETED');
  assert.equal(outcome.cognitiveGraphIntegrated, true);
  assert.equal(outcome.searchResult.verdict, 'OPTIMAL_VERIFIED_BRANCH_SELECTED');
  assert.equal(outcome.formalResult.verified, true);
});
