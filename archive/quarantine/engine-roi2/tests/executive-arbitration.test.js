import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutiveArbitrationEngine } from '../scripts/engine/executive-arbitration-engine.js';

// ====================================================
// EXECUTIVE ARBITRATION & META-REASONING TESTS
// ====================================================

const engine = new ExecutiveArbitrationEngine();

test('ExecutiveArbitrationEngine arbitrates based on domain expertise and empirical evidence over majority vote', () => {
  // 2 Generalist agents recommend Option X (without empirical evidence)
  // 1 Domain specialist agent recommends Option Y (with empirical evidence)
  const recommendations = [
    {
      agentId: 'AGT-GENERAL-1',
      agentDomain: 'General',
      recommendation: 'Option X',
      evidenceType: 'THEORETICAL_ASSUMPTION',
      historicalReliability: 7.5,
      isPrimarySource: false
    },
    {
      agentId: 'AGT-GENERAL-2',
      agentDomain: 'General',
      recommendation: 'Option X',
      evidenceType: 'THEORETICAL_ASSUMPTION',
      historicalReliability: 7.5,
      isPrimarySource: false
    },
    {
      agentId: 'AGT-SECURITY-EXPERT',
      agentDomain: 'Security',
      recommendation: 'Option Y (Hardened Sandbox)',
      evidenceType: 'EMPIRICAL_EXECUTION',
      historicalReliability: 9.8,
      isPrimarySource: true
    }
  ];

  const result = engine.arbitrateRecommendations(recommendations, { targetDomain: 'Security' });

  // Anti-Majority Vote Assertion: Option Y must win due to domain expertise, empirical evidence and primary source provenance
  assert.equal(result.selectedRecommendation.recommendation, 'Option Y (Hardened Sandbox)');
  assert.equal(result.selectedRecommendation.agentId, 'AGT-SECURITY-EXPERT');
  assert.equal(result.confidence, 'HIGH_CONFIDENCE');
});

test('ExecutiveArbitrationEngine synthesizes executive decision with full audit record', () => {
  const input = {
    topic: 'BROWSER_AUTOMATION_TOOL_SELECTION',
    objective: 'Select WCAG AA automated browser verification tool',
    selectedOption: {
      name: 'Playwright MCP',
      rationale: 'Validated in sandbox with 100% origin isolation and accessibility tree snapshotting'
    },
    alternatives: [
      { name: 'Puppeteer Core', rejectionReason: 'Lacks native MCP 2026-07-28 stateless server integration' }
    ],
    evidenceRefs: ['RSC-MCP-2026-001', 'EVD-PLAYWRIGHT-SANDBOX-001'],
    confidence: 'HIGH_CONFIDENCE',
    risks: ['Higher memory footprint than mock tool'],
    rollbackPlan: 'Fallback to TOL-NODE-TEST-RUNNER'
  };

  const decision = engine.synthesizeExecutiveDecision(input);

  assert.equal(decision.decision, 'Playwright MCP');
  assert.equal(decision.governanceStatus, 'GOVERNED_AND_AUDITABLE');
  assert.equal(decision.alternativesConsidered.length, 1);
  assert.equal(engine.decisions.length, 1);
});

test('ExecutiveArbitrationEngine tracks hypothesis lifecycle across testing iterations', () => {
  engine.registerHypothesis({
    hypothesisId: 'HYP-TOOL-001',
    statement: 'Playwright MCP achieves >95% accuracy on accessibility tree extraction',
    domain: 'ACCESSIBILITY'
  });

  engine.updateHypothesisOutcome('HYP-TOOL-001', true);
  engine.updateHypothesisOutcome('HYP-TOOL-001', true);
  const finalState = engine.updateHypothesisOutcome('HYP-TOOL-001', true);

  assert.equal(finalState.empiricalRuns, 3);
  assert.equal(finalState.verdict, 'SUPPORTED');
  assert.equal(finalState.status, 'RESOLVED');
});
