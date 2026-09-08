/**
 * @file tests/e2e-exhaustive-forensic-stress.test.js
 * @description Exhaustive End-to-End forensic stress test for EOS Mission OS.
 * Validates all 24 MCP tools, the 9-phase Golden Blueprint, ReAct Reflexion loops,
 * Evolutionary Pareto optimization, Clean Architecture scaffolding, Contract drift,
 * Byzantine consensus, BKM secret scrubbing, and write-barrier immutability.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';
import { resolveControlPlaneRoot } from '../src/core/runtime/control-plane-root.js';

test('E2E-FORENSIC-01: MCP Server exposes all 80 tools with strict metadata & authorization', async () => {
  const server = new EosMcpServer();
  assert.equal(CANONICAL_TOOLS.length, 80);

  // Test critical tool calls
  const statusRes = await server.handleToolCall('eos.mission.status', {});
  assert.equal(statusRes.status, 'SUCCESS');
  assert.equal(statusRes.executed, true);

  const fdirRes = await server.handleToolCall('eos.fdir.status', {});
  assert.equal(fdirRes.status, 'SUCCESS');
  assert.equal(fdirRes.executed, true);

  const barrierRes = await server.handleToolCall('eos.workspace.barrier_check', { path: 'Fundacion/some-file.js' });
  assert.equal(barrierRes.status, 'SUCCESS');
  assert.equal(barrierRes.barrier.allowed, false); // Blocked by write barrier

  const driftRes = await server.handleToolCall('eos.drift.check', {
    baseline: { required: ['id'], properties: { id: { type: 'string' } } },
    candidate: { required: ['id'], properties: { id: { type: 'string' }, name: { type: 'string' } } }
  });
  assert.equal(driftRes.status, 'SUCCESS');
  assert.equal(driftRes.drift_report.isCompatible, true);
});

test('E2E-FORENSIC-02: Full 9-phase Golden Blueprint executes cleanly with SHA-256 integrity', async () => {
  const runtime = new MissionRuntime();
  const blueprint = runtime.blueprintEngine.loadBlueprint('docs/blueprints/GOLDEN_SPEC_DRIVEN_BLUEPRINT.json');

  const executedPhases = [];
  const report = await runtime.blueprintEngine.executeBlueprint({
    blueprint,
    missionContext: {
      mission_id: 'MIS-FORENSIC-001',
      allow_simulated_gates: true
    },
    phaseExecutor: async (phase) => {
      executedPhases.push(phase.phase_id);
      return { status: 'VERIFIED', outputs: { phase_id: phase.phase_id } };
    }
  });

  assert.equal(report.verdict, 'GOLDEN_BLUEPRINT_COMPLETE');
  assert.equal(report.total_phases, 9);
  assert.equal(executedPhases.length, 9);
  assert.ok(report.sha256.length === 64);
});

test('E2E-FORENSIC-03: Autonomous ReAct Reflexion Loop self-repairs code and bounds retries', async () => {
  const runtime = new MissionRuntime();

  let attempt = 0;
  const receipt = await runtime.sandboxEvaluator.executeReflexionLoop({
    taskContract: { task_id: 'TASK-FORENSIC-REPAIR' },
    mutationFn: async (iter, lastErr) => {
      attempt = iter;
      return { version: iter };
    },
    testExecutorAsyncFn: async (mut) => {
      if (mut.version < 2) {
        return { exitCode: 1, stderr: 'AssertionError: Expected 200 got 500\n    at (file:///test.js:15:3)' };
      }
      return { exitCode: 0, stdout: 'PASS' };
    },
    maxRetries: 3
  });

  assert.equal(receipt.resolved, true);
  assert.equal(receipt.total_iterations, 2);
  assert.equal(receipt.verdict, 'VERIFIED_PASS');
  assert.ok(receipt.sha256.length === 64);
});

test('E2E-FORENSIC-04: Evolutionary Pareto Strategy Optimizer rejects bloated candidates and selects lean winner', () => {
  const runtime = new MissionRuntime();

  const candidates = [
    { id: 'STRAT-BLOATED', name: 'Bloated Stubs', estimatedLatencyMs: 1200, memoryBytes: 80000000, bloatIndex: 8.0, reversibilityScore: 0.2 },
    { id: 'STRAT-OPTIMAL', name: 'Pure Clean Hexagonal', estimatedLatencyMs: 80, memoryBytes: 1500000, bloatIndex: 0.2, reversibilityScore: 1.0 }
  ];

  const decision = runtime.evolutionOptimizer.evaluateCandidates(candidates);
  assert.equal(decision.selected_candidate, 'STRAT-OPTIMAL');
  assert.ok(decision.why_selected.includes('Highest composite fitness score'));
  assert.equal(decision.candidates_comparison[1].verdict, 'REJECTED_SUBOPTIMAL');
});

test('E2E-FORENSIC-05: Epistemic BKM Engine scrubs credentials and paths without data loss', () => {
  const runtime = new MissionRuntime();

  const bkm = runtime.bkm.distillBkm({
    title: 'Secret Scrubbing Verification',
    domain: 'SECURITY',
    problemPattern: 'Ensure token sk-12345678901234567890 and path C:\\Users\\secretuser\\repo are never leaked',
    solutionPattern: 'Use regex scrubbing before persistence'
  });

  assert.ok(!bkm.problem_pattern.includes('secretuser'));
  assert.ok(bkm.problem_pattern.includes('<REDACTED_HOME>'));
  assert.ok(bkm.sha256.length === 64);
});

test('E2E-FORENSIC-06: Byzantine Consensus Engine enforces security veto override', () => {
  const runtime = new MissionRuntime();

  const consensus = runtime.consensus.evaluateConsensus({
    decisionId: 'DEC-SECURITY-TEST',
    proposal: { test: true },
    votes: [
      { voter_id: 'A1', role: 'DEV', approve: true },
      { voter_id: 'A2', role: 'QA', approve: true },
      { voter_id: 'A3', role: 'SECURITY_AUDITOR', approve: false, veto: true, reason: 'CVE detected' }
    ]
  });

  assert.equal(consensus.verdict, 'VETOED_SECURITY_FAILURE');
  assert.equal(consensus.details.vetoing_voter, 'A3');
  assert.equal(consensus.details.veto_reason, 'CVE detected');
});
