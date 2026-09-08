import test from 'node:test';
import assert from 'node:assert/strict';
import { RealWorldAutonomyPilotEngine } from '../scripts/engine/real-world-autonomy-pilot.js';

// ====================================================
// EOS REAL-WORLD AUTONOMY PILOT TESTS (R-01 to R-04)
// ====================================================

const pilotEngine = new RealWorldAutonomyPilotEngine();

test('R-01: Real Tool Acquisition validates supply chain, license, and sandboxed container', () => {
  const toolCandidate = {
    name: 'axe-core-headless-mcp',
    version: '4.8.0',
    license: 'MPL-2.0', // Non-standard -> will fail default MIT/Apache allowlist
    provider: 'DEQUE_SYSTEMS',
    securityAuditPassed: true,
    hasSandboxedContainer: true
  };

  // Rejected due to license mismatch
  const res1 = pilotEngine.acquireRealToolInSandbox(toolCandidate);
  assert.equal(res1.acquired, false);
  assert.equal(res1.connectionStatus, 'REJECTED_SUPPLY_CHAIN_RISK');

  // Approved with standard MIT license
  toolCandidate.license = 'MIT';
  const res2 = pilotEngine.acquireRealToolInSandbox(toolCandidate);
  assert.equal(res2.acquired, true);
  assert.equal(res2.connectionStatus, 'ACQUIRED_AND_BOUND_IN_SANDBOX');
});

test('R-02: Real MCP Pilot enforces Least-Privilege container and blocks secret access', () => {
  // Test 1: Blocked on production secrets
  const riskyCall = {
    serverName: 'mcp-playwright-headless',
    hasProductionSecrets: true
  };
  const res1 = pilotEngine.executeRealMcpPilot(riskyCall);
  assert.equal(res1.executionSuccess, false);
  assert.equal(res1.status, 'BLOCKED_BY_LEAST_PRIVILEGE_GATEWAY');

  // Test 2: Safe real execution
  const safeCall = {
    serverName: 'mcp-playwright-headless',
    method: 'tools/call',
    params: { action: 'audit-a11y' },
    hasProductionSecrets: false,
    writeProtectedTargetAttempted: false
  };
  const res2 = pilotEngine.executeRealMcpPilot(safeCall);
  assert.equal(res2.executionSuccess, true);
  assert.equal(res2.zeroPrivilegeEscalation, true);
  assert.equal(res2.status, 'REAL_MCP_PILOT_EXECUTED_SAFELY');
});

test('R-03: Controlled Repo Pilot measures delta and creates rollback snapshots', () => {
  const repoTask = {
    repoPath: 'C:\\Users\\valen\\Documents\\Eos system\\tests\\fixtures\\mission-projects\\synthetic-website',
    targetBranch: 'eos-pilot-branch-001',
    proposedDiff: '+ <main role="main" aria-label="Content">\n- <div class="content">'
  };

  const repoResult = pilotEngine.executeControlledRepoPilot(repoTask);
  assert.equal(repoResult.branchCreated, true);
  assert.equal(repoResult.deltaMeasured, true);
  assert.ok(repoResult.deltaBytes > 0);
  assert.equal(repoResult.rollbackFeasible, true);
  assert.ok(repoResult.rollbackSnapshotId.startsWith('SNAP-'));
  assert.equal(repoResult.status, 'CONTROLLED_REPO_PILOT_VERIFIED_PASS');
});

test('R-04: Closed-Loop Self-Improvement proves EOS autonomously optimizes its own strategy', () => {
  const mission1Telemetry = { reworkCycles: 2, latencyMs: 450, costUsd: 0.14 };
  const mission2Reqs = { goal: 'Optimize checkout flow' };

  const loopResult = pilotEngine.executeSelfImprovingProcessLoop(mission1Telemetry, mission2Reqs);
  assert.equal(loopResult.processImprovedAutonomously, true);
  assert.equal(loopResult.strategyAAnalysis.subOptimalityIdentified, true);
  assert.equal(loopResult.autonomousStrategyPivot.selectedNewStrategy, 'PARALLEL_GUIDED_STREAM');
  assert.equal(loopResult.verdict, 'AUTONOMOUS_PROCESS_SELF_IMPROVEMENT_PROVEN');
});
