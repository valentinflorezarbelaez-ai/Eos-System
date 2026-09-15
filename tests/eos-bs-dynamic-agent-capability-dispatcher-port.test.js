/**
 * @file tests/eos-bs-dynamic-agent-capability-dispatcher-port.test.js
 * SPEC-0076 / Mission BS — Dynamic Agent Capability Matcher & Governed Dispatcher Port Test Suite.
 *
 * 100% hermetic: node:test + node:assert/strict. Zero network, zero external dependencies.
 * Verifies:
 * - Agent profile registration and validation
 * - Deterministic capability matching and tie-breaking by clearance
 * - Fail-closed dispatch denial on uncertified roles (UNCERTIFIED_CAPABILITY_DENY)
 * - Fail-closed dispatch denial on unattested agents (UNATTESTED_AGENT_DENY)
 * - Insufficient clearance level rejection (INSUFFICIENT_CLEARANCE_DENY)
 * - Fundacion ALWAYS_DENY write barrier enforcement
 * - Batch topological DAG dispatch with topological sequencing
 * - Cryptographically sealed BS-RCPT-* receipts & cryptographic trail verification
 * - Non-claim bounds and Law VI compliance
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createAgentCapabilityDispatcherPort,
  buildCapabilityMatcherReceipt,
  verifyCapabilityMatcherReceipt,
  isFundacionTarget,
  validateAgentProfile,
  validateTaskNode,
  BS_PRODUCTION_READY,
  BS_RECEIPT_KIND,
  BS_CODES,
  _resetReceiptSeqForTests
} from '../src/core/orchestration/dynamic-agent-capability-dispatcher-port.js';

describe('SPEC-0076 Mission BS — Dynamic Agent Capability Matcher & Dispatcher Port', () => {
  let port;
  let simulatedTime;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    simulatedTime = 1773532800000; // 2026-03-15T00:00:00.000Z
    port = createAgentCapabilityDispatcherPort({
      now: () => new Date(simulatedTime).toISOString()
    });
  });

  describe('1. Governance & Invariant Baseline', () => {
    test('PRODUCTION_READY must be strictly NO', () => {
      assert.equal(BS_PRODUCTION_READY, 'NO');
      assert.equal(port.productionReady, 'NO');
    });

    test('Fundacion targets are strictly identified and blocked', () => {
      assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/agent.js'), true);
      assert.equal(isFundacionTarget('documents/fundacion'), true);
      assert.equal(isFundacionTarget('src/core/orchestration'), false);
    });
  });

  describe('2. Agent Profile Registration (REQ-EARS-BS-01)', () => {
    test('registers valid agent profiles with capabilities and clearance', () => {
      const reg = port.registerAgentProfile({
        agentId: 'agent-core-01',
        capabilities: ['execution.core', 'planning.intent'],
        clearanceLevel: 2,
        role: 'executor',
        attested: true
      });

      assert.equal(reg.ok, true);
      assert.equal(reg.code, BS_CODES.REGISTER_OK);
      assert.equal(reg.agent.agentId, 'agent-core-01');
      assert.deepEqual(reg.agent.capabilities, ['execution.core', 'planning.intent']);
      assert.equal(reg.agent.clearanceLevel, 2);
      assert.equal(reg.agent.role, 'executor');
      assert.equal(reg.agent.attested, true);

      const found = port.getAgentProfile('agent-core-01');
      assert.ok(found);
      assert.equal(found.agentId, 'agent-core-01');
    });

    test('rejects malformed agent profile (missing ID or empty capabilities)', () => {
      const res1 = port.registerAgentProfile(null);
      assert.equal(res1.ok, false);
      assert.equal(res1.code, BS_CODES.MALFORMED_AGENT_DENY);

      const res2 = port.registerAgentProfile({ agentId: '', capabilities: ['execution.core'] });
      assert.equal(res2.ok, false);
      assert.equal(res2.code, BS_CODES.MALFORMED_AGENT_DENY);

      const res3 = port.registerAgentProfile({ agentId: 'agent-02', capabilities: [] });
      assert.equal(res3.ok, false);
      assert.equal(res3.code, BS_CODES.MALFORMED_AGENT_DENY);

      const res4 = port.registerAgentProfile({ agentId: 'agent-03', capabilities: [''] });
      assert.equal(res4.ok, false);
      assert.equal(res4.code, BS_CODES.MALFORMED_AGENT_DENY);
    });
  });

  describe('3. Deterministic Capability Matching (REQ-EARS-BS-02)', () => {
    beforeEach(() => {
      port.registerAgentProfile({
        agentId: 'agent-junior',
        capabilities: ['execution.core'],
        clearanceLevel: 1,
        attested: true
      });
      port.registerAgentProfile({
        agentId: 'agent-senior',
        capabilities: ['execution.core', 'verification.sensor'],
        clearanceLevel: 3,
        attested: true
      });
      port.registerAgentProfile({
        agentId: 'agent-auditor',
        capabilities: ['verification.sensor'],
        clearanceLevel: 2,
        attested: true
      });
    });

    test('matches agent possessing required capability and selects highest clearance', () => {
      const match = port.matchAgentForTask({
        id: 'task-01',
        requiredCapability: 'execution.core',
        requiredClearance: 1
      });

      assert.equal(match.ok, true);
      assert.equal(match.code, BS_CODES.MATCH_OK);
      // Highest clearance (agent-senior clearance 3 vs agent-junior clearance 1)
      assert.equal(match.agent.agentId, 'agent-senior');
      assert.equal(match.candidates.length, 2);
    });

    test('matches specific single eligible agent', () => {
      const match = port.matchAgentForTask({
        id: 'task-02',
        requiredCapability: 'verification.sensor',
        requiredClearance: 3
      });

      assert.equal(match.ok, true);
      assert.equal(match.agent.agentId, 'agent-senior');
      assert.equal(match.candidates.length, 1);
    });

    test('fails matching when capability is not registered (UNCERTIFIED_CAPABILITY_DENY)', () => {
      const match = port.matchAgentForTask({
        id: 'task-quantum',
        requiredCapability: 'quantum.hypercomputing'
      });

      assert.equal(match.ok, false);
      assert.equal(match.code, BS_CODES.UNCERTIFIED_CAPABILITY_DENY);
    });
  });

  describe('4. Fail-Closed Dispatch Denial (REQ-EARS-BS-03)', () => {
    beforeEach(() => {
      port.registerAgentProfile({
        agentId: 'agent-attested',
        capabilities: ['database.migration'],
        clearanceLevel: 2,
        attested: true
      });
      port.registerAgentProfile({
        agentId: 'agent-unattested',
        capabilities: ['database.migration'],
        clearanceLevel: 2,
        attested: false
      });
    });

    test('denies dispatch on uncertified capability with sealed failure receipt', () => {
      const res = port.dispatchTask({
        id: 'task-unknown-cap',
        requiredCapability: 'unknown.exotic.capability'
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BS_CODES.UNCERTIFIED_CAPABILITY_DENY);
      assert.ok(res.receipt);
      assert.equal(res.receipt.status, 'DENIED');
      assert.ok(res.receipt.receiptId.startsWith('BS-RCPT-'));
      assert.equal(res.fundacionDelta, 0);

      const v = verifyCapabilityMatcherReceipt(res.receipt);
      assert.equal(v.ok, true);
    });

    test('denies dispatch on unattested agent (UNATTESTED_AGENT_DENY)', () => {
      const res = port.dispatchTask(
        {
          id: 'task-db',
          requiredCapability: 'database.migration'
        },
        'agent-unattested'
      );

      assert.equal(res.ok, false);
      assert.equal(res.code, BS_CODES.UNATTESTED_AGENT_DENY);
      assert.ok(res.receipt);
      assert.equal(res.receipt.status, 'DENIED');
      assert.equal(res.receipt.agentId, 'agent-unattested');
    });

    test('denies dispatch on insufficient clearance level (INSUFFICIENT_CLEARANCE_DENY)', () => {
      const res = port.dispatchTask(
        {
          id: 'task-high-sec',
          requiredCapability: 'database.migration',
          requiredClearance: 4
        },
        'agent-attested'
      );

      assert.equal(res.ok, false);
      assert.equal(res.code, BS_CODES.INSUFFICIENT_CLEARANCE_DENY);
      assert.ok(res.receipt);
      assert.equal(res.receipt.status, 'DENIED');
    });

    test('triggers FUNDACION_ALWAYS_DENY on task targeting Fundacion path', () => {
      const res = port.dispatchTask({
        id: 'task-fundacion',
        requiredCapability: 'database.migration',
        targetPath: 'C:/Users/valen/Documents/Fundacion/secrets.json'
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BS_CODES.FUNDACION_ALWAYS_DENY);
      assert.equal(res.fundacionDelta, 0);
      assert.ok(res.receipt);
      assert.equal(res.receipt.status, 'DENIED');
    });
  });

  describe('5. Batch Topological DAG Dispatch (REQ-EARS-BS-04)', () => {
    beforeEach(() => {
      port.registerAgentProfile({
        agentId: 'agent-intake',
        capabilities: ['intake.reconnaissance'],
        clearanceLevel: 1,
        attested: true
      });
      port.registerAgentProfile({
        agentId: 'agent-builder',
        capabilities: ['execution.core'],
        clearanceLevel: 2,
        attested: true
      });
      port.registerAgentProfile({
        agentId: 'agent-verifier',
        capabilities: ['verification.sensor'],
        clearanceLevel: 2,
        attested: true
      });
      port.registerAgentProfile({
        agentId: 'agent-evidence',
        capabilities: ['evidence.custody'],
        clearanceLevel: 1,
        attested: true
      });
    });

    test('batch dispatches 4-task DAG in strict topological sequence', () => {
      const dagNodes = [
        { id: 'task-01', requiredCapability: 'intake.reconnaissance', dependsOn: [] },
        { id: 'task-02', requiredCapability: 'execution.core', dependsOn: ['task-01'] },
        { id: 'task-03', requiredCapability: 'verification.sensor', dependsOn: ['task-02'] },
        { id: 'task-04', requiredCapability: 'evidence.custody', dependsOn: ['task-03'] }
      ];

      const batch = port.batchDispatchDag(dagNodes);
      assert.equal(batch.ok, true);
      assert.equal(batch.code, BS_CODES.BATCH_DISPATCH_OK);
      assert.equal(batch.count, 4);
      assert.deepEqual(batch.topologicalOrder, ['task-01', 'task-02', 'task-03', 'task-04']);

      // Check receipts are chained
      assert.equal(batch.receipts.length, 4);
      for (const r of batch.receipts) {
        assert.equal(r.status, 'DISPATCHED');
        assert.ok(r.receiptId.startsWith('BS-RCPT-'));
      }

      const trail = port.verifyDispatchTrail(batch.receipts);
      assert.equal(trail.ok, true);
      assert.equal(trail.code, BS_CODES.TRAIL_OK);
      assert.equal(trail.verifiedCount, 4);
    });

    test('rejects batch dispatch when DAG contains a circular cycle', () => {
      const cyclicNodes = [
        { id: 'node-A', requiredCapability: 'execution.core', dependsOn: ['node-B'] },
        { id: 'node-B', requiredCapability: 'execution.core', dependsOn: ['node-A'] }
      ];

      const batch = port.batchDispatchDag(cyclicNodes);
      assert.equal(batch.ok, false);
      assert.equal(batch.code, BS_CODES.CYCLICAL_DEPENDENCY_DENY);
      assert.equal(batch.count, 0);
    });

    test('halts batch dispatch when intermediate node capability is missing', () => {
      const dagNodes = [
        { id: 'node-1', requiredCapability: 'intake.reconnaissance', dependsOn: [] },
        { id: 'node-2', requiredCapability: 'unsupported.magic.capability', dependsOn: ['node-1'] },
        { id: 'node-3', requiredCapability: 'evidence.custody', dependsOn: ['node-2'] }
      ];

      const batch = port.batchDispatchDag(dagNodes);
      assert.equal(batch.ok, false);
      assert.equal(batch.code, BS_CODES.UNCERTIFIED_CAPABILITY_DENY);
      assert.equal(batch.failedAt, 'node-2');
      // node-1 succeeded and emitted receipt, node-2 failed and emitted DENIED receipt
      assert.equal(batch.count, 2);
      assert.equal(batch.receipts[0].status, 'DISPATCHED');
      assert.equal(batch.receipts[1].status, 'DENIED');
    });
  });

  describe('6. Cryptographic Receipts & Trail Custody (REQ-EARS-BS-05)', () => {
    beforeEach(() => {
      port.registerAgentProfile({
        agentId: 'agent-alpha',
        capabilities: ['task.type.a'],
        clearanceLevel: 1,
        attested: true
      });
    });

    test('verifies intact receipt chain of sequential dispatches', () => {
      const d1 = port.dispatchTask({ id: 't-1', requiredCapability: 'task.type.a' });
      assert.equal(d1.ok, true);

      simulatedTime += 1000;
      const d2 = port.dispatchTask({ id: 't-2', requiredCapability: 'task.type.a' });
      assert.equal(d2.ok, true);

      simulatedTime += 1000;
      const d3 = port.dispatchTask({ id: 't-3', requiredCapability: 'task.type.a' });
      assert.equal(d3.ok, true);

      const trail = port.verifyDispatchTrail([d1.receipt, d2.receipt, d3.receipt]);
      assert.equal(trail.ok, true);
      assert.equal(trail.code, BS_CODES.TRAIL_OK);
      assert.equal(trail.verifiedCount, 3);
    });

    test('fails trail verification on tampered receipt payload', () => {
      const d1 = port.dispatchTask({ id: 't-1', requiredCapability: 'task.type.a' });
      const tampered = { ...d1.receipt, requiredCapability: 'forged.capability' };

      const trail = port.verifyDispatchTrail([tampered]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BS_CODES.TRAIL_BREAK);
    });

    test('fails trail verification on broken prevReceiptHash link', () => {
      const d1 = port.dispatchTask({ id: 't-1', requiredCapability: 'task.type.a' });
      const d2 = port.dispatchTask({ id: 't-2', requiredCapability: 'task.type.a' });

      const forgedD2 = {
        ...d2.receipt,
        prevReceiptHash: '0000000000000000000000000000000000000000000000000000000000000000'
      };

      const trail = port.verifyDispatchTrail([d1.receipt, forgedD2]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BS_CODES.TRAIL_BREAK);
    });
  });
});
