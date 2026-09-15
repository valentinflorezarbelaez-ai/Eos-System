/**
 * @file tests/eos-bt-workflow-state-machine-checkpoint-port.test.js
 * SPEC-0077 / Mission BT — Dynamic Workflow State Machine & Step-Level Checkpoint Fabric Test Suite.
 *
 * 100% hermetic: node:test + node:assert/strict. Zero network, zero external dependencies.
 * Verifies:
 * - Workflow initialization and baseline governance
 * - Strict FSM state transition validation and terminal state locks
 * - Step-level cryptographic checkpointing with snapshot hashing
 * - Tamper-evident checkpoint restoration and corruption rejection
 * - Fundacion ALWAYS_DENY write barrier enforcement
 * - Sealed BT-RCPT-* receipts & cryptographic trail custody verification
 * - Non-claim bounds and Law VI compliance
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createWorkflowStateMachinePort,
  buildWorkflowCheckpointReceipt,
  verifyWorkflowCheckpointReceipt,
  isFundacionTarget,
  isValidWorkflowState,
  isTerminalState,
  validateStateTransition,
  validateCheckpointSnapshot,
  WORKFLOW_STATES,
  BT_PRODUCTION_READY,
  BT_RECEIPT_KIND,
  BT_CODES,
  _resetReceiptSeqForTests
} from '../src/core/orchestration/dynamic-workflow-state-machine-port.js';

describe('SPEC-0077 Mission BT — Workflow State Machine & Checkpoint Fabric', () => {
  let port;
  let simulatedTime;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    simulatedTime = 1773532800000; // 2026-03-15T00:00:00.000Z
    port = createWorkflowStateMachinePort({
      now: () => new Date(simulatedTime).toISOString()
    });
  });

  describe('1. Governance & Invariant Baseline', () => {
    test('PRODUCTION_READY must be strictly NO', () => {
      assert.equal(BT_PRODUCTION_READY, 'NO');
      assert.equal(port.productionReady, 'NO');
    });

    test('Fundacion targets are strictly identified and rejected', () => {
      assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/workflow.json'), true);
      assert.equal(isFundacionTarget('documents/fundacion'), true);
      assert.equal(isFundacionTarget('src/core/orchestration'), false);
    });

    test('validates valid and terminal workflow states', () => {
      assert.equal(isValidWorkflowState('RUNNING'), true);
      assert.equal(isValidWorkflowState('INITIALIZED'), true);
      assert.equal(isValidWorkflowState('INVALID_STATE'), false);

      assert.equal(isTerminalState('COMPLETED'), true);
      assert.equal(isTerminalState('FAILED'), true);
      assert.equal(isTerminalState('ABORTED'), true);
      assert.equal(isTerminalState('RUNNING'), false);
    });
  });

  describe('2. Workflow Lifecycle Initialization (REQ-EARS-BT-01)', () => {
    test('initializes workflow in INITIALIZED state with sealed receipt', () => {
      const res = port.initWorkflow({
        workflowId: 'wf-order-processing-01',
        initialContext: { orderId: 'ORD-9988' }
      });

      assert.equal(res.ok, true);
      assert.equal(res.code, BT_CODES.INIT_OK);
      assert.equal(res.workflow.workflowId, 'wf-order-processing-01');
      assert.equal(res.workflow.state, WORKFLOW_STATES.INITIALIZED);
      assert.deepEqual(res.workflow.context, { orderId: 'ORD-9988' });
      assert.equal(res.fundacionDelta, 0);

      assert.ok(res.receipt);
      assert.ok(res.receipt.receiptId.startsWith('BT-RCPT-'));
      assert.equal(res.receipt.status, BT_CODES.INIT_OK);
      assert.equal(res.receipt.state, WORKFLOW_STATES.INITIALIZED);

      const v = verifyWorkflowCheckpointReceipt(res.receipt);
      assert.equal(v.ok, true);
    });

    test('rejects malformed workflow initialization (missing workflowId)', () => {
      const res1 = port.initWorkflow(null);
      assert.equal(res1.ok, false);
      assert.equal(res1.code, BT_CODES.MALFORMED_WORKFLOW_DENY);

      const res2 = port.initWorkflow({ workflowId: '' });
      assert.equal(res2.ok, false);
      assert.equal(res2.code, BT_CODES.MALFORMED_WORKFLOW_DENY);
    });

    test('triggers FUNDACION_ALWAYS_DENY on workflow targeting Fundacion', () => {
      const res = port.initWorkflow({
        workflowId: 'wf-fundacion-sync',
        target: 'C:/Users/valen/Documents/Fundacion/repo'
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BT_CODES.FUNDACION_ALWAYS_DENY);
      assert.equal(res.fundacionDelta, 0);
    });
  });

  describe('3. Strict State Transition Enforcement (REQ-EARS-BT-02)', () => {
    beforeEach(() => {
      port.initWorkflow({
        workflowId: 'wf-trans-test',
        initialContext: { step: 0 }
      });
    });

    test('allows legitimate transitions: INITIALIZED -> RUNNING -> COMPLETED', () => {
      const t1 = port.transitionState('wf-trans-test', WORKFLOW_STATES.RUNNING);
      assert.equal(t1.ok, true);
      assert.equal(t1.code, BT_CODES.TRANSITION_OK);
      assert.equal(t1.workflow.state, WORKFLOW_STATES.RUNNING);

      const t2 = port.transitionState('wf-trans-test', WORKFLOW_STATES.COMPLETED);
      assert.equal(t2.ok, true);
      assert.equal(t2.code, BT_CODES.TRANSITION_OK);
      assert.equal(t2.workflow.state, WORKFLOW_STATES.COMPLETED);
    });

    test('allows pause and resume cycle: RUNNING -> PAUSED -> RUNNING', () => {
      port.transitionState('wf-trans-test', WORKFLOW_STATES.RUNNING);

      const paused = port.transitionState('wf-trans-test', WORKFLOW_STATES.PAUSED);
      assert.equal(paused.ok, true);
      assert.equal(paused.workflow.state, WORKFLOW_STATES.PAUSED);

      const resumed = port.transitionState('wf-trans-test', WORKFLOW_STATES.RUNNING);
      assert.equal(resumed.ok, true);
      assert.equal(resumed.workflow.state, WORKFLOW_STATES.RUNNING);
    });

    test('rejects illegal jump: INITIALIZED -> COMPLETED (ILLEGAL_STATE_TRANSITION_DENY)', () => {
      const bad = port.transitionState('wf-trans-test', WORKFLOW_STATES.COMPLETED);
      assert.equal(bad.ok, false);
      assert.equal(bad.code, BT_CODES.ILLEGAL_STATE_TRANSITION_DENY);

      // Verify state was not modified
      const state = port.getWorkflowState('wf-trans-test');
      assert.equal(state.workflow.state, WORKFLOW_STATES.INITIALIZED);
    });

    test('locks terminal states: COMPLETED -> RUNNING is blocked (TERMINAL_STATE_LOCKED_DENY)', () => {
      port.transitionState('wf-trans-test', WORKFLOW_STATES.RUNNING);
      port.transitionState('wf-trans-test', WORKFLOW_STATES.COMPLETED);

      const attempt = port.transitionState('wf-trans-test', WORKFLOW_STATES.RUNNING);
      assert.equal(attempt.ok, false);
      assert.equal(attempt.code, BT_CODES.TERMINAL_STATE_LOCKED_DENY);
    });
  });

  describe('4. Step-Level Cryptographic Checkpointing (REQ-EARS-BT-03)', () => {
    beforeEach(() => {
      port.initWorkflow({
        workflowId: 'wf-cp-test',
        initialContext: { pipeline: 'audit' }
      });
      port.transitionState('wf-cp-test', WORKFLOW_STATES.RUNNING);
    });

    test('checkpoints step, transitions to CHECKPOINTED, and hashes snapshot', () => {
      const cp = port.checkpointStep('wf-cp-test', 'step-01-intake', {
        status: 'SUCCESS',
        assetsProcessed: 42
      });

      assert.equal(cp.ok, true);
      assert.equal(cp.code, BT_CODES.CHECKPOINT_OK);
      assert.equal(cp.checkpoint.stepId, 'step-01-intake');
      assert.ok(cp.checkpoint.checkpointHash.length === 64);
      assert.equal(cp.workflow.state, WORKFLOW_STATES.CHECKPOINTED);
      assert.deepEqual(cp.workflow.context['step-01-intake'], {
        status: 'SUCCESS',
        assetsProcessed: 42
      });

      assert.ok(cp.receipt);
      assert.equal(cp.receipt.status, BT_CODES.CHECKPOINT_OK);
      assert.equal(cp.receipt.checkpointHash, cp.checkpoint.checkpointHash);
    });

    test('rejects checkpointing on terminal workflow (TERMINAL_STATE_LOCKED_DENY)', () => {
      port.transitionState('wf-cp-test', WORKFLOW_STATES.COMPLETED);

      const cp = port.checkpointStep('wf-cp-test', 'step-late', { foo: 'bar' });
      assert.equal(cp.ok, false);
      assert.equal(cp.code, BT_CODES.TERMINAL_STATE_LOCKED_DENY);
    });
  });

  describe('5. Tamper-Evident State Restoration (REQ-EARS-BT-04)', () => {
    beforeEach(() => {
      port.initWorkflow({
        workflowId: 'wf-restore-test',
        initialContext: { counter: 10 }
      });
      port.transitionState('wf-restore-test', WORKFLOW_STATES.RUNNING);
      port.checkpointStep('wf-restore-test', 'step-1', { counter: 20 });
      port.transitionState('wf-restore-test', WORKFLOW_STATES.RUNNING);
      port.checkpointStep('wf-restore-test', 'step-2', { counter: 30 });
    });

    test('restores clean workflow state from previous checkpoint', () => {
      const res = port.restoreFromCheckpoint('wf-restore-test', 'step-1');
      assert.equal(res.ok, true);
      assert.equal(res.code, BT_CODES.RESTORE_OK);
      assert.equal(res.restoredState, WORKFLOW_STATES.CHECKPOINTED);
      assert.deepEqual(res.restoredContext['step-1'], { counter: 20 });
      assert.equal(res.restoredContext['step-2'], undefined);
    });

    test('rejects corrupted checkpoint restoration (CORRUPTED_CHECKPOINT_DENY)', () => {
      const tamperedSnapshot = { counter: 999999, corrupted: true };
      const res = port.restoreFromCheckpoint('wf-restore-test', 'step-1', {
        overrideSnapshot: tamperedSnapshot
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BT_CODES.CORRUPTED_CHECKPOINT_DENY);
    });

    test('rejects non-existent checkpoint (MISSING_CHECKPOINT_DENY)', () => {
      const res = port.restoreFromCheckpoint('wf-restore-test', 'step-non-existent');
      assert.equal(res.ok, false);
      assert.equal(res.code, BT_CODES.MISSING_CHECKPOINT_DENY);
    });
  });

  describe('6. Cryptographic Receipts & Trail Custody (REQ-EARS-BT-05)', () => {
    test('verifies intact receipt chain across workflow lifecycle', () => {
      const w = port.initWorkflow({ workflowId: 'wf-chain' });
      assert.equal(w.ok, true);

      simulatedTime += 1000;
      const t1 = port.transitionState('wf-chain', WORKFLOW_STATES.RUNNING);
      assert.equal(t1.ok, true);

      simulatedTime += 1000;
      const cp1 = port.checkpointStep('wf-chain', 'step-1', { ok: true });
      assert.equal(cp1.ok, true);

      simulatedTime += 1000;
      const t2 = port.transitionState('wf-chain', WORKFLOW_STATES.COMPLETED);
      assert.equal(t2.ok, true);

      const trail = port.verifyCheckpointTrail([
        w.receipt,
        t1.receipt,
        cp1.receipt,
        t2.receipt
      ]);

      assert.equal(trail.ok, true);
      assert.equal(trail.code, BT_CODES.TRAIL_OK);
      assert.equal(trail.verifiedCount, 4);
    });

    test('fails trail verification on tampered receipt payload', () => {
      const w = port.initWorkflow({ workflowId: 'wf-tamper' });
      const tampered = { ...w.receipt, state: 'TAMPERED_STATE' };

      const trail = port.verifyCheckpointTrail([tampered]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BT_CODES.TRAIL_BREAK);
    });

    test('fails trail verification on broken prevReceiptHash link', () => {
      const w = port.initWorkflow({ workflowId: 'wf-link' });
      const t1 = port.transitionState('wf-link', WORKFLOW_STATES.RUNNING);

      const forgedT1 = {
        ...t1.receipt,
        prevReceiptHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      };

      const trail = port.verifyCheckpointTrail([w.receipt, forgedT1]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BT_CODES.TRAIL_BREAK);
    });
  });
});
