import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextualLearningBoundaryEngine } from '../scripts/engine/contextual-learning-boundary-engine.js';

// ====================================================
// CONTEXTUAL LEARNING BOUNDARY ENGINE TESTS
// ====================================================

const engine = new ContextualLearningBoundaryEngine();

test('ContextualLearningBoundaryEngine registers portfolio BKMs correctly', () => {
  const registered = engine.registerPortfolioBkm('BKM_MOBILE_FIRST', {
    bkmId: 'BKM-MOB-01',
    name: 'Mobile Touch Fluidity',
    domain: 'MARKETING_WEBSITE',
    targetDevice: 'MOBILE_TOUCH_HEAVY'
  });

  assert.equal(registered.portfolioKey, 'BKM_MOBILE_FIRST');
  assert.equal(engine.learningPortfolio.size, 1);
});

test('ContextualLearningBoundaryEngine resolves memory conflicts by narrowing parent scope', () => {
  const resolution = engine.resolveMemoryConflict({
    domain: 'MARKETING_WEBSITE',
    desktopSuccess: true,
    mobileFailure: true
  });

  assert.equal(resolution.actionTaken, 'NARROWED_PARENT_SCOPE_AND_SPAWNED_CONTEXTUAL_RULE');
  assert.equal(resolution.historicalIntegrityPreserved, true);
  assert.equal(engine.conflictHistory.length, 1);
});
