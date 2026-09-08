import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutiveGeneralizationHarness } from '../scripts/engine/executive-generalization-harness.js';

// ====================================================
// EXECUTIVE GENERALIZATION & CROSS-PROJECT MEMORY TESTS
// ====================================================

test('ExecutiveGeneralizationHarness successfully executes across 3 heterogeneous mission classes', () => {
  const harness = new ExecutiveGeneralizationHarness();
  const summary = harness.runGeneralizationExperiment();

  assert.equal(summary.status, 'ALL_3_HETEROGENEOUS_MISSIONS_COMPLETED');

  // Mission A: Standard Landing Page
  assert.equal(summary.results.missionA.archetypeAllocated, 'STANDARD_LANDING_PAGE');
  assert.ok(summary.results.missionA.selectedDecision.includes('Ultra-Lean Semantic Static Page'));

  // Mission B: Critical E-commerce with Dynamic Replanning
  assert.equal(summary.results.missionB.archetypeAllocated, 'COMPLEX_SAAS_ENTERPRISE');
  assert.equal(summary.results.missionB.replanned, true);

  // Mission C: Complex SaaS Dashboard
  assert.equal(summary.results.missionC.archetypeAllocated, 'COMPLEX_SAAS_ENTERPRISE');
  assert.ok(summary.results.missionC.selectedDecision.includes('Decoupled Event-Driven WebSocket'));

  // Cross-project memory assertions
  assert.equal(summary.crossProjectMemory.cumulativeExecutions, 3);
  assert.equal(summary.crossProjectMemory.lessonsLearned.length, 3);
  assert.equal(summary.crossProjectMemory.lessonsLearned[0].projectKey, 'MISSION-A');
  assert.equal(summary.crossProjectMemory.lessonsLearned[1].projectKey, 'MISSION-B');
  assert.equal(summary.crossProjectMemory.lessonsLearned[2].projectKey, 'MISSION-C');
});
