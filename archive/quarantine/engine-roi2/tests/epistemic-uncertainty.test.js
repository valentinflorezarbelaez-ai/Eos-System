import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutiveArbitrationEngine } from '../scripts/engine/executive-arbitration-engine.js';

// ====================================================
// CONFIDENCE & UNCERTAINTY DEGRADATION TESTS
// ====================================================

const engine = new ExecutiveArbitrationEngine();

test('ExecutiveArbitrationEngine grades epistemic states and triggers research on UNKNOWN', () => {
  // Empty evidence -> UNKNOWN
  const unknownEval = engine.evaluateUncertainty([]);
  assert.equal(unknownEval.epistemicState, 'UNKNOWN');
  assert.equal(unknownEval.confidenceScore, 0.0);
  assert.equal(unknownEval.policy, 'TRIGGER_RESEARCH_PLAN');
});

test('ExecutiveArbitrationEngine caps confidence on synthetic-only evidence to prevent false certainty', () => {
  const syntheticEvidence = [
    { type: 'SANDBOX_EMPIRICAL', hash: 'hash1' },
    { type: 'SANDBOX_EMPIRICAL', hash: 'hash2' },
    { type: 'SANDBOX_EMPIRICAL', hash: 'hash3' }
  ];

  // Evaluating synthetic-only runs
  const evalResult = engine.evaluateUncertainty(syntheticEvidence, true);

  // Confidence must be capped at <= 0.70 to prevent false certainty without real-world evidence
  assert.ok(evalResult.confidenceScore <= 0.70);
  assert.equal(evalResult.isSyntheticOnly, true);
});

test('ExecutiveArbitrationEngine achieves HIGH_CONFIDENCE when backed by real-world verified evidence', () => {
  const realWorldEvidence = [
    { type: 'REAL_WORLD_EVIDENCE', hash: 'hash-real-1' },
    { type: 'REAL_WORLD_EVIDENCE', hash: 'hash-real-2' }
  ];

  const evalResult = engine.evaluateUncertainty(realWorldEvidence, false);
  assert.equal(evalResult.epistemicState, 'HIGH_CONFIDENCE');
  assert.ok(evalResult.confidenceScore >= 0.85);
});
