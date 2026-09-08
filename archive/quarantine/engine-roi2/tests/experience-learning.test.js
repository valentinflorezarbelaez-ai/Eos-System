import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperienceLearningEngine } from '../scripts/engine/experience-learning-engine.js';

// ====================================================
// EXPERIENCE LEARNING & BENCHMARK LEDGER TESTS
// ====================================================

test('ExperienceLearningEngine records executions and calculates empirical scores over assumptions', () => {
  const engine = new ExperienceLearningEngine();

  // Record 3 executions for Tool A (2 success, 1 failure)
  engine.recordToolExecution({ toolId: 'TOL-A', taskType: 'BROWSER_QA', success: true, latencyMs: 120, qualityScore: 9.0 });
  engine.recordToolExecution({ toolId: 'TOL-A', taskType: 'BROWSER_QA', success: true, latencyMs: 110, qualityScore: 9.2 });
  engine.recordToolExecution({ toolId: 'TOL-A', taskType: 'BROWSER_QA', success: false, latencyMs: 30000, errorMessage: 'Timeout' });

  // Record 2 executions for Tool B (2 success)
  engine.recordToolExecution({ toolId: 'TOL-B', taskType: 'BROWSER_QA', success: true, latencyMs: 80, qualityScore: 9.5 });
  engine.recordToolExecution({ toolId: 'TOL-B', taskType: 'BROWSER_QA', success: true, latencyMs: 75, qualityScore: 9.4 });

  const scoreA = engine.getEmpiricalToolScore('TOL-A', 'BROWSER_QA');
  assert.equal(scoreA.sampleSize, 3);
  assert.equal(scoreA.successRate, 0.67);
  assert.equal(scoreA.epistemicType, 'EMPIRICAL');

  const comparison = engine.compareCandidates('TOL-A', 'TOL-B', 'BROWSER_QA');
  assert.equal(comparison.recommendedTool, 'TOL-B');
  assert.ok(comparison.decisionRationale.includes('higher empirical success rate'));
});

test('ExperienceLearningEngine extracts confirmed failure patterns upon repeated errors', () => {
  const engine = new ExperienceLearningEngine();

  // Simulate 3 identical timeout errors
  engine.recordToolExecution({ toolId: 'TOL-A', taskType: 'LARGE_DOM_A11Y', success: false, errorMessage: 'TIMEOUT_30S_EXCEEDED' });
  engine.recordToolExecution({ toolId: 'TOL-A', taskType: 'LARGE_DOM_A11Y', success: false, errorMessage: 'TIMEOUT_30S_EXCEEDED' });
  engine.recordToolExecution({ toolId: 'TOL-A', taskType: 'LARGE_DOM_A11Y', success: false, errorMessage: 'TIMEOUT_30S_EXCEEDED' });

  assert.equal(engine.failurePatterns.length, 1);
  assert.equal(engine.failurePatterns[0].occurrences, 3);
  assert.equal(engine.failurePatterns[0].status, 'CONFIRMED_LIMITATION');
});
