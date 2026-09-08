import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousEcosystemManager } from '../scripts/engine/autonomous-ecosystem-manager.js';

// ====================================================
// AUTONOMOUS ECOSYSTEM MANAGER TESTS (LEVELS 0 - 3)
// ====================================================

const manager = new AutonomousEcosystemManager();

test('AutonomousEcosystemManager tracks candidate through Observe -> Research -> Sandbox -> Promote', () => {
  // Level 0: Observe
  const observed = manager.observeEcosystemCandidate({
    resourceId: 'MCP-SRV-ADVANCED-A11Y',
    name: 'Advanced Acoustic A11y MCP',
    type: 'MCP',
    source: 'https://github.com/official-org/mcp-a11y',
    reportedVersion: '2.0.0',
    capabilities: ['CAP-ACOUSTIC-A11Y']
  });
  assert.equal(observed.currentLevel, 'LEVEL_0_OBSERVE');
  assert.equal(observed.status, 'DISCOVERED');

  // Level 1: Research
  const researched = manager.researchCandidate('MCP-SRV-ADVANCED-A11Y', {
    license: 'MIT',
    isOfficialSource: true,
    securityAdvisoryFound: false,
    riskRating: 'LOW'
  });
  assert.equal(researched.currentLevel, 'LEVEL_1_RESEARCH');
  assert.equal(researched.status, 'RESEARCHED');

  // Level 2: Sandbox Benchmark
  const sandboxed = manager.sandboxBenchmarkCandidate('MCP-SRV-ADVANCED-A11Y', {
    functionalPass: true,
    performanceScore: 9.2,
    memoryOverheadMb: 35,
    zeroPrivilegeEscapes: true
  });
  assert.equal(sandboxed.currentLevel, 'LEVEL_2_SANDBOX');
  assert.equal(sandboxed.status, 'SANDBOX_VERIFIED');

  // Level 3: Controlled Promotion Proposal
  const proposal = manager.generatePromotionProposal('MCP-SRV-ADVANCED-A11Y', 'TOL-AXE-CORE');
  assert.equal(proposal.currentLevel, 'LEVEL_3_PROMOTE');
  assert.equal(proposal.requiresHumanGovernanceSignOff, true);
  assert.equal(proposal.governanceStatus, 'PENDING_GOVERNANCE_REVIEW');
});

test('AutonomousEcosystemManager rejects candidate with security vulnerabilities during research', () => {
  manager.observeEcosystemCandidate({
    resourceId: 'TOL-VULNERABLE-TOOL',
    name: 'Unsafe Scraper',
    type: 'TOOL'
  });

  const rejected = manager.researchCandidate('TOL-VULNERABLE-TOOL', {
    license: 'GPL',
    securityAdvisoryFound: true, // Vulnerability flag
    riskRating: 'CRITICAL'
  });

  assert.equal(rejected.status, 'SECURITY_REJECTED');
  assert.throws(
    () => manager.sandboxBenchmarkCandidate('TOL-VULNERABLE-TOOL', { functionalPass: true }),
    /ACTION_BLOCKED/
  );
});
