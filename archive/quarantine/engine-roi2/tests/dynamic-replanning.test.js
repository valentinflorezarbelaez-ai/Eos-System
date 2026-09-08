import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperienceLearningEngine } from '../scripts/engine/experience-learning-engine.js';
import { DynamicReplanningEngine } from '../scripts/engine/dynamic-replanning-engine.js';

// ====================================================
// DYNAMIC REPLANNING ENGINE TESTS
// ====================================================

test('DynamicReplanningEngine pivots plan on tool failure and records causal audit', () => {
  const expEngine = new ExperienceLearningEngine();
  const replanner = new DynamicReplanningEngine(expEngine);

  const initialPlan = {
    planId: 'PLAN-BROWSER-AUDIT-001',
    currentToolId: 'TOL-PLAYWRIGHT-MCP',
    taskType: 'ACCESSIBILITY_AUDIT',
    goal: 'Audit WCAG AA compliance on landing page'
  };

  const failure = {
    error: 'PLAYWRIGHT_MCP_PROCESS_CRASHED',
    latencyMs: 1500
  };

  const replanResult = replanner.evaluateExecutionAndReplan(initialPlan, failure);

  assert.equal(replanResult.status, 'REPLANNED_SUCCESSFULLY');
  assert.equal(replanResult.newPlan.toolId, 'TOL-AXE-CORE');
  assert.equal(replanResult.newPlan.fallbackGuardsActive, true);

  // Check audit trail
  assert.equal(replanner.replanAuditTrail.length, 1);
  assert.equal(replanner.replanAuditTrail[0].failedToolId, 'TOL-PLAYWRIGHT-MCP');
  assert.ok(replanner.replanAuditTrail[0].justification.includes('PLAYWRIGHT_MCP_PROCESS_CRASHED'));

  // Ensure failure was recorded in experience engine
  const score = expEngine.getEmpiricalToolScore('TOL-PLAYWRIGHT-MCP', 'ACCESSIBILITY_AUDIT');
  assert.equal(score.sampleSize, 1);
  assert.equal(score.successRate, 0);
});
