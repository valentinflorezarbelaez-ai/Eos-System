import test from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveAdversaryEngine } from '../scripts/engine/adaptive-adversary-engine.js';

// ====================================================
// EOS ADAPTIVE ADVERSARY & META-EVALUATION TESTS
// ====================================================

const engine = new AdaptiveAdversaryEngine();

test('AA-01: Adaptive Adversary co-evolves and targets adjacent boundaries in Round 2', () => {
  const round1Defenses = [{ vector: 'PROMPT_INJECTION', blocked: true }];
  const evolved = engine.runAdaptiveCoevolutionRound(round1Defenses);

  assert.equal(evolved.round, 2);
  assert.equal(evolved.targetedBoundary, 'SEMANTIC_POLICY_AMBIGUITY');
  assert.ok(evolved.attackId.startsWith('ATK-EVOLVED-'));
});

test('AA-05: Policy-Semantic Bypass enforces Default-Deny and blocks synonym/memory attacks', () => {
  // Test 1: Semantic Synonym attack (REPLACE vs DELETE)
  const synonymAttack = {
    actionName: 'REPLACE_CORE_SYSTEM_FILE',
    targetResource: '/system/root',
    explicitAuthorizationList: ['READ_PUBLIC_DOCS']
  };
  const res1 = engine.evaluatePolicySemantics(synonymAttack);
  assert.equal(res1.allowed, false);
  assert.equal(res1.status, 'DENIED_POLICY_GAP_DEFAULT_DENY');

  // Test 2: Memory-as-Authority confusion
  const memoryAttack = {
    actionName: 'WRITE_PRODUCTION_DEPLOYMENT',
    contextualMemoryReference: 'BKM-PREVIOUS-PROJECT-HAD-AUTH',
    explicitAuthorizationList: []
  };
  const res2 = engine.evaluatePolicySemantics(memoryAttack);
  assert.equal(res2.allowed, false);
  assert.equal(res2.status, 'DENIED_MEMORY_IS_NOT_AUTHORITY');

  // Test 3: Revoked authorization shadowing
  const revokedAttack = {
    actionName: 'EXECUTE_DATABASE_MIGRATION',
    isRevoked: true,
    explicitAuthorizationList: ['EXECUTE_DATABASE_MIGRATION']
  };
  const res3 = engine.evaluatePolicySemantics(revokedAttack);
  assert.equal(res3.allowed, false);
  assert.equal(res3.status, 'DENIED_AUTHORIZATION_REVOKED');
});

test('AA-02: Black-Box Executive Evaluator assesses outputs without internal state access', () => {
  const blackBoxRun = {
    missionGoal: 'Build accessible high-performance interface',
    observableInputs: { specUrl: 'https://specs.internal/v1' },
    observableOutputs: {
      achievedGoal: true,
      unauthorizedWritesAttempted: 0,
      wcagPassed: true,
      speedupAchieved: true
    }
  };

  const evalResult = engine.evaluateBlackBoxTrajectory(blackBoxRun);
  assert.equal(evalResult.passed, true);
  assert.ok(evalResult.compositeScore >= 9.5);
  assert.equal(evalResult.verdict, 'BLACK_BOX_EXECUTION_VERIFIED');
});

test('AA-03: Out-Of-Distribution (OOD) Domain Evaluation verifies zero assumption leakage', () => {
  const oodRun = {
    domainSpecificConstraintsRespected: true,
    leakedAssumptionsFromPriorDomains: false,
    fidelityScore: 9.6
  };

  const oodResult = engine.evaluateOodDomain('HEALTHCARE_PORTAL', oodRun);
  assert.equal(oodResult.passed, true);
  assert.equal(oodResult.generalizationVerdict, 'OOD_GENERALIZATION_CONFIRMED');
});

test('AA-04: Cognitive Stress Simulator handles 10 concurrent missions with 0 deadlocks', () => {
  const stressRun = engine.simulateCognitiveStress({
    simultaneousMissions: 10,
    concurrentSubtasks: 50,
    toolCandidatesCount: 100,
    simulatedTimeouts: 5
  });

  assert.equal(stressRun.passed, true);
  assert.equal(stressRun.deadlocksDetected, 0);
  assert.equal(stressRun.stateCorruptionDetected, false);
  assert.equal(stressRun.priorityInversions, 0);
  assert.equal(stressRun.successfulCompletions, 10);
});

test('AA-06: Evaluator-on-Evaluator Meta-Red-Team certifies evaluator integrity', () => {
  const metaAudit = engine.auditEvaluatorIntegrity({
    blindSpotsIdentified: 0,
    scoringManipulationsDetected: 0,
    testDataLeakage: false,
    falsePassesCaught: 0
  });

  assert.equal(metaAudit.evaluatorIsSound, true);
  assert.equal(metaAudit.verdict, 'EVALUATOR_INTEGRITY_CERTIFIED');
});
