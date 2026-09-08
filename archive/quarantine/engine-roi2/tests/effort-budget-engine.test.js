import test from 'node:test';
import assert from 'node:assert/strict';
import { EffortBudgetEngine } from '../scripts/engine/effort-budget-engine.js';

// ====================================================
// EFFORT & AUTONOMY BUDGET ENGINE TESTS
// ====================================================

const engine = new EffortBudgetEngine();

test('EffortBudgetEngine allocates minimal single-agent budget for low-risk trivial fixes', () => {
  const profile = {
    complexity: 'LOW',
    risk: 'LOW',
    userImpact: 'LOW',
    uncertainty: 'LOW',
    reversibility: 'HIGH'
  };

  const allocation = engine.calculateEffortBudget(profile);
  assert.equal(allocation.archetypeSelected, 'TRIVIAL_FIX');
  assert.equal(allocation.budgetAllocated.agentCount, 1);
  assert.equal(allocation.budgetAllocated.parallelismAllowed, false);
  assert.equal(allocation.antiOverEngineeringGuard, 'BLOCKED_SPAWNING_EXCESSIVE_AGENTS');
});

test('EffortBudgetEngine allocates full multi-agent swarm budget for critical SaaS projects', () => {
  const profile = {
    complexity: 'HIGH',
    risk: 'CRITICAL',
    userImpact: 'HIGH',
    uncertainty: 'HIGH',
    reversibility: 'LOW'
  };

  const allocation = engine.calculateEffortBudget(profile);
  assert.equal(allocation.archetypeSelected, 'COMPLEX_SAAS_ENTERPRISE');
  assert.equal(allocation.budgetAllocated.agentCount, 6);
  assert.equal(allocation.budgetAllocated.parallelismAllowed, true);
  assert.equal(allocation.antiUnderEngineeringGuard, 'MANDATORY_ADVERSARIAL_AUDIT');
});
