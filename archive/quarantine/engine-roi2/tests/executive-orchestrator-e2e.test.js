import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutiveOrchestratorEngine } from '../scripts/engine/executive-orchestrator-engine.js';

// ====================================================
// EXECUTIVE-END-TO-END-001 EXPERIMENTAL PROBES
// ====================================================

test('EXECUTIVE-END-TO-END-001: Full Cognitive Loop executes end-to-end across all 5 adversarial probes', () => {
  const orchestrator = new ExecutiveOrchestratorEngine();

  const missionRequest = {
    missionId: 'MIS-E2E-SAAS-LANDING-001',
    goal: 'Design and build accessible, high-performance SaaS landing page in sandbox',
    projectProfile: {
      complexity: 'MEDIUM',
      risk: 'LOW',
      userImpact: 'HIGH',
      uncertainty: 'LOW',
      reversibility: 'HIGH',
      domain: 'Performance'
    },
    requiredCapabilities: ['CAP-BROWSER-NAVIGATE', 'CAP-DOM-SNAPSHOT', 'CAP-A11Y-TREE'],
    toolCandidates: [
      {
        toolId: 'TOL-PLAYWRIGHT-MCP',
        name: 'Playwright MCP',
        capabilities: ['CAP-BROWSER-NAVIGATE', 'CAP-DOM-SNAPSHOT', 'CAP-A11Y-TREE'],
        securityScore: 9.0,
        performanceScore: 8.5,
        evidenceStatus: 'SANDBOX_VERIFIED'
      },
      {
        toolId: 'TOL-MOCK-CODE',
        name: 'Mock Code Generator',
        capabilities: ['CAP-CODE-GEN'],
        securityScore: 8.0,
        performanceScore: 9.0
      }
    ],
    agentRecommendations: [
      {
        agentId: 'AGT-GENERAL-1',
        agentDomain: 'General',
        recommendation: 'Heavy Client Framework (React+Redux)',
        evidenceType: 'THEORETICAL_ASSUMPTION',
        historicalReliability: 7.0,
        isPrimarySource: false
      },
      {
        agentId: 'AGT-GENERAL-2',
        agentDomain: 'General',
        recommendation: 'Heavy Client Framework (React+Redux)',
        evidenceType: 'THEORETICAL_ASSUMPTION',
        historicalReliability: 7.0,
        isPrimarySource: false
      },
      {
        agentId: 'AGT-PERF-SPECIALIST',
        agentDomain: 'Performance',
        recommendation: 'Ultra-Lean Static Architecture (Vanilla+Semantic HTML)',
        evidenceType: 'EMPIRICAL_EXECUTION',
        historicalReliability: 9.9,
        isPrimarySource: true
      }
    ],
    simulateToolFailure: true, // Deliberate failure injection probe
    isSyntheticOnly: true // Synthetic confidence discount probe
  };

  const outcome = orchestrator.executeCognitiveLoop(missionRequest);

  // 1. Assert Cognitive Loop Completion
  assert.equal(outcome.status, 'COGNITIVE_LOOP_COMPLETED');
  assert.equal(outcome.trace.steps.length, 6);

  // 2. Probe 1: Anti-Majority Vote Arbitration Check
  // Option from AGT-PERF-SPECIALIST must win over 2x Generalist votes
  assert.equal(
    outcome.arbitration.selectedRecommendation.recommendation,
    'Ultra-Lean Static Architecture (Vanilla+Semantic HTML)'
  );
  assert.equal(outcome.arbitration.selectedRecommendation.agentId, 'AGT-PERF-SPECIALIST');

  // 3. Probe 2: Failure Injection & Dynamic Replanning Recovery
  assert.equal(outcome.execution.status, 'RECOVERED_VIA_REPLANNING');
  assert.equal(outcome.execution.replanRecord.failedToolId, 'TOL-PLAYWRIGHT-MCP');
  assert.equal(outcome.execution.replanRecord.selectedAlternateToolId, 'TOL-AXE-CORE');
  assert.ok(outcome.execution.replanRecord.justification.includes('SIMULATED_PRIMARY_TOOL_TIMEOUT'));

  // 4. Probe 3: Synthetic Confidence Discount Guard
  // Confidence must NOT claim >0.70 because data is synthetic-only
  assert.ok(outcome.uncertainty.confidenceScore <= 0.70);
  assert.equal(outcome.uncertainty.isSyntheticOnly, true);

  // 5. Probe 4: Effort Budget Guard
  assert.equal(outcome.effortBudget.archetypeSelected, 'STANDARD_LANDING_PAGE');
  assert.equal(outcome.effortBudget.budgetAllocated.agentCount, 3);
  assert.equal(outcome.effortBudget.budgetAllocated.parallelismAllowed, true);

  // 6. Probe 5: Decision Synthesis Audit Trail
  assert.ok(outcome.decision.decisionId.startsWith('DEC-'));
  assert.equal(outcome.decision.governanceStatus, 'GOVERNED_AND_AUDITABLE');
  assert.equal(outcome.decision.alternativesConsidered.length, 2);
});
