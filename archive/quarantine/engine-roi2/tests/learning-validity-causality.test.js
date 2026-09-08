import test from 'node:test';
import assert from 'node:assert/strict';
import { LearningValidityCausalityEngine } from '../scripts/engine/learning-validity-causality-engine.js';

// ====================================================
// LEARNING VALIDITY & CAUSALITY ENGINE TESTS
// ====================================================

const engine = new LearningValidityCausalityEngine();

test('ReplicationGuard tracks replication count and blocks promotion on single run', () => {
  const lesson = engine.recordLessonObservation({
    lessonId: 'LES-TEST-REPLICATION',
    proposedBelief: 'Minimalist CSS grid accelerates paint times',
    taskFamily: 'PERFORMANCE_OPTIMIZATION',
    executionId: 'EXEC-REP-1',
    evidenceRef: 'EVD-REP-1',
    observedOutcomeDelta: 1.5
  });

  assert.equal(lesson.replicationCount, 1);
  assert.equal(lesson.status, 'CANDIDATE_UNREPLICATED');
  assert.equal(lesson.causalConfidence, 0.20);

  // Attempting promotion before sufficient replication + counterfactual proof must throw
  assert.throws(
    () => engine.promoteValidatedLessonToBkm('LES-TEST-REPLICATION', 'GLOBAL'),
    /PROMOTION_BLOCKED/
  );
});

test('CausalAttributionEvaluator rejects spurious correlations and coincidence', () => {
  engine.recordLessonObservation({
    lessonId: 'LES-SPURIOUS-TEST',
    proposedBelief: 'Lucky emoji in HTML comment improves server uptime',
    taskFamily: 'INFRASTRUCTURE',
    executionId: 'EXEC-SPURIOUS-1',
    evidenceRef: 'EVD-COINCIDENCE',
    observedOutcomeDelta: 0.1
  });

  const evaluation = engine.evaluateCausalAttribution('LES-SPURIOUS-TEST', {
    withInterventionOutcome: 6.1,
    withoutInterventionControlOutcome: 6.0,
    randomCoincidenceProbability: 0.85
  });

  assert.equal(evaluation.isCausal, false);
  assert.equal(evaluation.lesson.status, 'REJECTED_SPURIOUS_CORRELATION');
  assert.equal(evaluation.lesson.causalConfidence, 0.05);
});

test('LearningAuditGraph generates complete explanatory evidence trace for BKM', () => {
  const lessonId = 'LES-AUDITABLE-BKM';
  for (let i = 1; i <= 3; i++) {
    engine.recordLessonObservation({
      lessonId,
      proposedBelief: 'Async script loading prevents parser blocking',
      taskFamily: 'BROWSER_PERFORMANCE',
      executionId: `EXEC-AUDIT-${i}`,
      evidenceRef: `EVD-TRACE-${i}`,
      observedOutcomeDelta: 2.5
    });
  }

  engine.evaluateCausalAttribution(lessonId, {
    withInterventionOutcome: 9.8,
    withoutInterventionControlOutcome: 5.5,
    randomCoincidenceProbability: 0.01
  });

  const bkm = engine.promoteValidatedLessonToBkm(lessonId, 'WEB_PAGES');
  const trace = engine.getExplanationTrace(bkm.bkmId);

  assert.notEqual(trace, null);
  assert.equal(trace.epistemicRigorRating, 'EPISTEMICALLY_DISCIPLINED');
  assert.equal(trace.evidenceChain.length, 3);
  assert.equal(trace.evidenceChain[0].evidence, 'EVD-TRACE-1');
});
