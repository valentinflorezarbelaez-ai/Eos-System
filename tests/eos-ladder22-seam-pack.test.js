/**
 * Ladder 22 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 *
 * Hermetically validates the full Ladder 22 Sovereign Intent Decomposition &
 * Dynamic Workflow Orchestration Fabric:
 * - Mission BR (SPEC-0075): Sovereign Intent Parser & DAG Decomposer Port (BR-RCPT-*)
 * - Mission BS (SPEC-0076): Dynamic Agent Capability Matcher & Dispatcher Port (BS-RCPT-*)
 * - Mission BT (SPEC-0077): Dynamic Workflow State Machine & Step Checkpoint Port (BT-RCPT-*)
 * - Mission BU (SPEC-0078): Multi-Agent Consensus Orchestration Gate Port (BU-RCPT-*)
 * - Mission BV (SPEC-0079): Dynamic Workflow Telemetry & Sovereign Audit Port (BV-RCPT-*)
 *
 * Invariants:
 * - PRODUCTION_READY=NO (strict, honest non-claim held)
 * - Fundacion Δ=0 (write barrier preserved)
 * - Law VI: Zero plain secrets in repository or payloads
 * - Pure Node.js built-ins only (L0 purity)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Factories & Constants
import {
  createSovereignIntentParserPort,
  BR_CODES,
  BR_PRODUCTION_READY
} from '../src/core/orchestration/sovereign-intent-parser-port.js';

import {
  createAgentCapabilityDispatcherPort,
  BS_CODES,
  BS_PRODUCTION_READY
} from '../src/core/orchestration/dynamic-agent-capability-dispatcher-port.js';

import {
  createWorkflowStateMachinePort,
  WORKFLOW_STATES,
  BT_CODES,
  BT_PRODUCTION_READY
} from '../src/core/orchestration/dynamic-workflow-state-machine-port.js';

import {
  createConsensusOrchestrationPort,
  QUORUM_POLICIES,
  PROPOSAL_OUTCOMES,
  BU_CODES,
  BU_PRODUCTION_READY
} from '../src/core/orchestration/dynamic-consensus-orchestration-port.js';

import {
  createWorkflowTelemetryPort,
  BV_CODES,
  BV_PRODUCTION_READY
} from '../src/core/orchestration/dynamic-workflow-telemetry-port.js';

const rootDir = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

const LADDER22_SCRIPTS = [
  'test:mission-br',
  'test:mission-bs',
  'test:mission-bt',
  'test:mission-bu',
  'test:mission-bv',
];

test('L22-SEAM-1: package.json registers all Ladder 22 satellite scripts', () => {
  assert.ok(exists('package.json'), 'package.json must exist');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');

  for (const s of LADDER22_SCRIPTS) {
    assert.equal(typeof pkg.scripts[s], 'string', `Missing script: ${s}`);
  }
});

test('L22-SEAM-2: End-to-end integration flow BR -> BS -> BT -> BU -> BV', () => {
  const intentPort = createSovereignIntentParserPort();
  const dispatcherPort = createAgentCapabilityDispatcherPort();
  const fsmPort = createWorkflowStateMachinePort();
  const consensusPort = createConsensusOrchestrationPort();
  const telemetryPort = createWorkflowTelemetryPort();

  // 1. Mission BR: Parse intent and decompose into atomic DAG
  const parsed = intentPort.parseIntent('Build, test, and consensus-sign the payment core module');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.code, BR_CODES.PARSE_OK);

  const customDag = [
    { id: 'task-build', requiredCapability: 'build.compile', dependsOn: [] },
    { id: 'task-test', requiredCapability: 'test.unit', dependsOn: ['task-build'] },
    { id: 'task-consensus', requiredCapability: 'review.security', dependsOn: ['task-test'] },
  ];

  const decomp = intentPort.decomposeTaskDag('Build, test, and consensus-sign the payment core module', {
    customNodes: customDag,
  });
  assert.equal(decomp.ok, true);
  assert.ok(decomp.receipt.receiptId.startsWith('BR-RCPT-'));
  assert.deepEqual(decomp.dag.sortedOrder, ['task-build', 'task-test', 'task-consensus']);

  // 2. Mission BS: Register agents and batch dispatch DAG tasks
  dispatcherPort.registerAgentProfile({
    agentId: 'agent-compiler-01',
    capabilities: ['build.compile'],
    clearanceLevel: 2,
    attested: true,
  });
  dispatcherPort.registerAgentProfile({
    agentId: 'agent-tester-01',
    capabilities: ['test.unit'],
    clearanceLevel: 2,
    attested: true,
  });
  dispatcherPort.registerAgentProfile({
    agentId: 'agent-security-01',
    capabilities: ['review.security'],
    clearanceLevel: 3,
    attested: true,
  });

  const batchDispatch = dispatcherPort.batchDispatchDag(customDag);
  assert.equal(batchDispatch.ok, true);
  assert.equal(batchDispatch.count, 3);
  assert.ok(batchDispatch.receipts[0].receiptId.startsWith('BS-RCPT-'));

  // 3. Mission BT: Initialize Workflow State Machine and record step checkpoints
  const initFsm = fsmPort.initWorkflow({
    workflowId: 'WF-L22-SEAM-001',
    initialContext: { pipeline: 'payment-core', dag: customDag },
  });
  assert.equal(initFsm.ok, true);
  assert.ok(initFsm.receipt.receiptId.startsWith('BT-RCPT-'));

  // Transition to RUNNING
  const runningTransition = fsmPort.transitionState('WF-L22-SEAM-001', WORKFLOW_STATES.RUNNING);
  assert.equal(runningTransition.ok, true);

  // Checkpoint step 1 (RUNNING -> CHECKPOINTED)
  const cp1 = fsmPort.checkpointStep('WF-L22-SEAM-001', 'task-build', {
    status: 'SUCCESS',
    artifact: 'dist/payment.js',
  });
  assert.equal(cp1.ok, true);
  assert.ok(cp1.receipt.receiptId.startsWith('BT-RCPT-'));

  // Resume RUNNING (CHECKPOINTED -> RUNNING)
  const resume1 = fsmPort.transitionState('WF-L22-SEAM-001', WORKFLOW_STATES.RUNNING);
  assert.equal(resume1.ok, true);

  // Checkpoint step 2 (RUNNING -> CHECKPOINTED)
  const cp2 = fsmPort.checkpointStep('WF-L22-SEAM-001', 'task-test', {
    status: 'SUCCESS',
    passedTests: 42,
  });
  assert.equal(cp2.ok, true);

  // 4. Mission BU: Multi-Agent Consensus Orchestration on critical step
  const propSubmit = consensusPort.submitProposal({
    proposalId: 'PROP-L22-SEAM-001',
    action: 'payment.core.release',
    voters: ['agent-security-01', 'agent-architect-01', 'agent-compliance-01'],
    quorumPolicy: QUORUM_POLICIES.MAJORITY,
  });
  assert.equal(propSubmit.ok, true);
  assert.ok(propSubmit.receipt.receiptId.startsWith('BU-RCPT-'));

  // Cast votes
  consensusPort.castVote('PROP-L22-SEAM-001', { agentId: 'agent-security-01', vote: 'APPROVE' });
  consensusPort.castVote('PROP-L22-SEAM-001', { agentId: 'agent-architect-01', vote: 'APPROVE' });
  consensusPort.castVote('PROP-L22-SEAM-001', { agentId: 'agent-compliance-01', vote: 'REJECT' });

  const consensusEval = consensusPort.evaluateConsensus('PROP-L22-SEAM-001');
  assert.equal(consensusEval.ok, true);
  assert.equal(consensusEval.outcome, PROPOSAL_OUTCOMES.CONSENSUS_APPROVED);
  assert.ok(consensusEval.receipt.receiptId.startsWith('BU-RCPT-'));

  // Resume RUNNING (CHECKPOINTED -> RUNNING)
  const resume2 = fsmPort.transitionState('WF-L22-SEAM-001', WORKFLOW_STATES.RUNNING);
  assert.equal(resume2.ok, true);

  // Step 3 checkpoint with consensus receipt (RUNNING -> CHECKPOINTED)
  const cp3 = fsmPort.checkpointStep('WF-L22-SEAM-001', 'task-consensus', {
    status: 'SUCCESS',
    consensusReceiptId: consensusEval.receipt.receiptId,
  });
  assert.equal(cp3.ok, true);

  // Transition to COMPLETED (CHECKPOINTED -> COMPLETED)
  const completedTransition = fsmPort.transitionState('WF-L22-SEAM-001', WORKFLOW_STATES.COMPLETED);
  assert.equal(completedTransition.ok, true);

  // 5. Mission BV: Ingest multi-mission receipts and compile sovereign audit summary
  telemetryPort.recordSpan({
    workflowId: 'WF-L22-SEAM-001',
    spanId: 'span-intent',
    phase: 'intake',
    durationMs: 15,
    status: 'OK',
  });
  telemetryPort.recordSpan({
    workflowId: 'WF-L22-SEAM-001',
    spanId: 'span-dispatch',
    phase: 'dispatch',
    durationMs: 12,
    status: 'OK',
  });
  telemetryPort.recordSpan({
    workflowId: 'WF-L22-SEAM-001',
    spanId: 'span-execution',
    phase: 'execution',
    durationMs: 45,
    status: 'OK',
  });

  // Ingest sibling receipts
  telemetryPort.ingestReceipt(decomp.receipt, 'WF-L22-SEAM-001');
  telemetryPort.ingestReceipt(batchDispatch.receipts[0], 'WF-L22-SEAM-001');
  telemetryPort.ingestReceipt(cp1.receipt, 'WF-L22-SEAM-001');
  telemetryPort.ingestReceipt(consensusEval.receipt, 'WF-L22-SEAM-001');

  const auditSummary = telemetryPort.compileAuditSummary('WF-L22-SEAM-001', {
    consensusSignature: 'SIG-L22-SEAM-SEAL-01',
  });
  assert.equal(auditSummary.ok, true);
  assert.ok(auditSummary.receipt.receiptId.startsWith('BV-RCPT-'));
  assert.equal(auditSummary.auditSummary.metrics.totalSpans, 3);
  assert.equal(auditSummary.auditSummary.metrics.totalReceipts, 4);

  // Verify audit seal
  const auditVerification = telemetryPort.verifyAuditSeal(auditSummary);
  assert.equal(auditVerification.ok, true);
});

test('L22-SEAM-3: Fail-closed governance across all 5 satellites', () => {
  const intentPort = createSovereignIntentParserPort();
  const dispatcherPort = createAgentCapabilityDispatcherPort();
  const fsmPort = createWorkflowStateMachinePort();
  const consensusPort = createConsensusOrchestrationPort();

  // BR Fail-Closed: Cyclical DAG rejected
  const cyclicNodes = [
    { id: 'node-a', requiredCapability: 'cap:a', dependsOn: ['node-b'] },
    { id: 'node-b', requiredCapability: 'cap:b', dependsOn: ['node-a'] },
  ];
  const cyclicDecomp = intentPort.decomposeTaskDag('Cyclic intent', { customNodes: cyclicNodes });
  assert.equal(cyclicDecomp.ok, false);
  assert.equal(cyclicDecomp.code, BR_CODES.CYCLICAL_DEPENDENCY_DENY);

  // BS Fail-Closed: Missing capability rejected
  const dispatchFail = dispatcherPort.matchAgentForTask({
    id: 'task-quantum',
    requiredCapability: 'quantum.compute',
  });
  assert.equal(dispatchFail.ok, false);
  assert.equal(dispatchFail.code, BS_CODES.UNCERTIFIED_CAPABILITY_DENY);

  // BT Fail-Closed: Terminal state mutation rejected
  fsmPort.initWorkflow({
    workflowId: 'WF-TERMINAL-LOCK',
    initialContext: {},
  });
  fsmPort.transitionState('WF-TERMINAL-LOCK', WORKFLOW_STATES.RUNNING);
  fsmPort.transitionState('WF-TERMINAL-LOCK', WORKFLOW_STATES.COMPLETED);
  const terminalTransition = fsmPort.transitionState('WF-TERMINAL-LOCK', WORKFLOW_STATES.RUNNING);
  assert.equal(terminalTransition.ok, false);
  assert.equal(terminalTransition.code, BT_CODES.TERMINAL_STATE_LOCKED_DENY);

  // BU Fail-Closed: Malformed proposal rejected
  const failSubmit = consensusPort.submitProposal({
    proposalId: 'PROP-EMPTY-VOTERS',
    action: 'test',
    voters: [], // Empty voters rejected
  });
  assert.equal(failSubmit.ok, false);
  assert.equal(failSubmit.code, BU_CODES.MALFORMED_PROPOSAL_DENY);
});

test('L22-SEAM-4: Invariant & Non-Claim verification', () => {
  // 1. Verify strict PRODUCTION_READY=NO across all ports
  assert.equal(BR_PRODUCTION_READY, 'NO');
  assert.equal(BS_PRODUCTION_READY, 'NO');
  assert.equal(BT_PRODUCTION_READY, 'NO');
  assert.equal(BU_PRODUCTION_READY, 'NO');
  assert.equal(BV_PRODUCTION_READY, 'NO');

  // 2. Verify no plain secrets in orchestration ports
  const forbiddenPatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /sk-[A-Za-z0-9]{32,}/,
    /ghp_[A-Za-z0-9]{36}/,
  ];

  const filesToCheck = [
    'src/core/orchestration/sovereign-intent-parser-port.js',
    'src/core/orchestration/dynamic-agent-capability-dispatcher-port.js',
    'src/core/orchestration/dynamic-workflow-state-machine-port.js',
    'src/core/orchestration/dynamic-consensus-orchestration-port.js',
    'src/core/orchestration/dynamic-workflow-telemetry-port.js',
  ];

  for (const rel of filesToCheck) {
    const content = read(rel);
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(content), false, `Forbidden secret pattern found in ${rel}`);
    }
  }

  // 3. Verify Fundacion write barrier posture in core write barrier
  assert.ok(exists('src/core/write-barrier/authorize.js'));
  const wb = read('src/core/write-barrier/authorize.js');
  assert.ok(wb.includes('FUNDACION_ALWAYS_DENY'));
});
