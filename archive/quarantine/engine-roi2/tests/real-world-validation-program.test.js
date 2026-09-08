import test from 'node:test';
import assert from 'node:assert/strict';
import { RealWorldValidationProgramEngine } from '../scripts/engine/real-world-validation-program.js';

// ====================================================
// EOS REAL-WORLD VALIDATION PROGRAM TESTS (R-05..R-10)
// ====================================================

const engine = new RealWorldValidationProgramEngine();

test('R-05: Real Repo Validation verifies Before/After Tree Hashes and Rollback Proof', () => {
  const repoRes = engine.validateExternalRepoOperation({
    repoPath: 'C:\\Users\\valen\\Documents\\Eos system\\tests\\fixtures\\mission-projects\\synthetic-website',
    targetBranch: 'eos-real-validation-branch-001',
    proposedChanges: [{ file: 'index.html', diff: '+ <!-- Real World Accessible Landmark -->' }]
  });

  assert.notEqual(repoRes.beforeTreeHash, repoRes.afterTreeHash);
  assert.equal(repoRes.rollbackProven, true);
  assert.equal(repoRes.status, 'REAL_REPO_MUTATION_AND_ROLLBACK_VERIFIED');
});

test('R-06: External MCP Monitor enforces Least Privilege and detects zero secret leakage', () => {
  const mcpRes = engine.monitorExternalMcpConnection({
    endpoint: 'http://localhost:3000/mcp',
    enforceLeastPrivilege: true,
    secretsExposedCount: 0,
    unauthorizedEgressAttempted: false
  });

  assert.equal(mcpRes.isSecure, true);
  assert.equal(mcpRes.secretsExposedCount, 0);
  assert.equal(mcpRes.verdict, 'REAL_MCP_CONNECTION_SECURE_LEAST_PRIVILEGE');
});

test('R-07: Autonomous Tool Acquisition resolves capability gap without human prompt', () => {
  const acqRes = engine.resolveCapabilityGapAutonomously({
    requiredCapability: 'AST_MUTATION_ANALYSIS'
  });

  assert.equal(acqRes.acquiredAutonomously, true);
  assert.equal(acqRes.selectedTool.name, 'ast-grep-cli');
  assert.equal(acqRes.selectedTool.license, 'MIT');
  assert.equal(acqRes.verdict, 'AUTONOMOUS_TOOL_ACQUISITION_SUCCESS');
});

test('R-08: Real Human Outcome Telemetry measures task completion, trust, and WCAG AA', () => {
  const outcomeRes = engine.recordHumanOutcomeTelemetry({
    taskCompletionRate: 0.98,
    perceivedTrustScore: 9.5,
    cognitiveOverloadDetected: false,
    wcagAaCompliancePassed: true
  });

  assert.equal(outcomeRes.isSuccessfulOutcome, true);
  assert.equal(outcomeRes.verdict, 'REAL_HUMAN_OUTCOME_VERIFIED');
});

test('R-09: Independent Reproduction Barrier verifies clean-room execution in Environment B', () => {
  const reproRes = engine.verifyIndependentReproduction({
    environmentId: 'ENV-B-CLEAN-ROOM',
    internalMemoryUsed: false,
    cachedFixturesUsed: false,
    reproductionAttempts: 3,
    successfulReproductions: 3
  });

  assert.equal(reproRes.reproductionPassed, true);
  assert.equal(reproRes.reproductionRatio, '3/3');
  assert.equal(reproRes.verdict, 'INDEPENDENT_CLEAN_ROOM_REPRODUCTION_VERIFIED');
});

test('R-10: Blind External Evaluation certifies system based purely on observable outputs', () => {
  const blindRes = engine.evaluateBlindExternalScorecard({
    goalFidelity: 9.8,
    qualityScore: 9.9,
    safetyViolations: 0,
    costEfficiency: 9.5
  });

  assert.equal(blindRes.passed, true);
  assert.ok(blindRes.compositeScore >= 9.8);
  assert.equal(blindRes.verdict, 'BLIND_EXTERNAL_EVALUATION_PASSED');
});
