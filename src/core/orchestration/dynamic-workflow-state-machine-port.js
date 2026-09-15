/**
 * @module dynamic-workflow-state-machine-port
 * SPEC-0077 / Mission BT — Dynamic Workflow State Machine & Step-Level Checkpoint Fabric.
 *
 * Facade: createWorkflowStateMachinePort({ now, hash, policyGate })
 *   .initWorkflow({ workflowId, dag, initialContext })
 *   .transitionState(workflowId, targetState, opts)
 *   .checkpointStep(workflowId, stepId, stepPayload, opts)
 *   .restoreFromCheckpoint(workflowId, stepIdOrReceipt, opts)
 *   .getWorkflowState(workflowId)
 *   .verifyCheckpointTrail(receipts)
 *
 * Pure Layer-0 hermetic workflow finite state machine and checkpointing fabric.
 * Emits cryptographically sealed BT-RCPT-* receipts via node:crypto.
 *
 * Fail-closed:
 *   Fundacion ALWAYS_DENY; illegal state transition → ILLEGAL_STATE_TRANSITION_DENY;
 *   terminal state modification → TERMINAL_STATE_LOCKED_DENY;
 *   corrupted snapshot digest → CORRUPTED_CHECKPOINT_DENY;
 *   missing checkpoint → MISSING_CHECKPOINT_DENY.
 *
 * NON-CLAIM:
 *   state machine & checkpoint fabric ≠ AWS Step Functions /
 *   ≠ Temporal.io cluster /
 *   ≠ PRODUCTION_READY=YES distributed orchestrator.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR and BS done; BT in progress; BU–BV pending);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BT_CEILING
 */

import {
  BT_PRODUCTION_READY as BT_RECEIPT_PR,
  BT_RECEIPT_KIND,
  BT_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalWorkflowCheckpointSealBody,
  hashWorkflowCheckpointReceipt,
  verifyWorkflowCheckpointReceipt,
  buildWorkflowCheckpointReceipt,
  _resetReceiptSeqForTests
} from './workflow-checkpoint-receipt.js';

import {
  BT_POLICY_GATE_KIND,
  BT_POLICY_GATE_PRODUCTION_READY,
  BT_POLICY_CODES,
  WORKFLOW_STATES,
  TERMINAL_STATES,
  ALLOWED_TRANSITIONS,
  deny,
  denyFundacion,
  denyIllegalTransition,
  denyTerminalStateLocked,
  denyCorruptedCheckpoint,
  denyMissingCheckpoint,
  denyMalformedWorkflow,
  denyMalformedCheckpoint,
  isFundacionTarget,
  isValidWorkflowState,
  isTerminalState,
  validateStateTransition,
  validateCheckpointSnapshot,
  validateWorkflowInitPayload,
  createWorkflowCheckpointPolicyGate
} from './workflow-checkpoint-policy-gate.js';

/** @type {'NO'} */
export const BT_PRODUCTION_READY = 'NO';

export const BT_KIND = 'eos-dynamic-workflow-state-machine-port';

export const BT_CODES = Object.freeze({
  ...BT_POLICY_CODES,
  INIT_OK: 'INIT_OK',
  STATE_GET_OK: 'STATE_GET_OK'
});

export {
  BT_POLICY_CODES,
  BT_POLICY_GATE_KIND,
  BT_POLICY_GATE_PRODUCTION_READY,
  BT_RECEIPT_KIND,
  BT_RECEIPT_PRODUCTION_READY,
  BT_RECEIPT_PR,
  WORKFLOW_STATES,
  TERMINAL_STATES,
  ALLOWED_TRANSITIONS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalWorkflowCheckpointSealBody,
  hashWorkflowCheckpointReceipt,
  verifyWorkflowCheckpointReceipt,
  buildWorkflowCheckpointReceipt,
  _resetReceiptSeqForTests,
  isFundacionTarget,
  isValidWorkflowState,
  isTerminalState,
  validateStateTransition,
  validateCheckpointSnapshot,
  validateWorkflowInitPayload
};

/**
 * Factory for Dynamic Workflow State Machine & Step-Level Checkpoint Port.
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.policyGate]
 * @returns {object}
 */
export function createWorkflowStateMachinePort(opts = {}) {
  const nowFn = typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const hashFn = typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const policyGate = opts.policyGate || createWorkflowCheckpointPolicyGate();

  /**
   * @type {Map<string, {
   *   workflowId: string,
   *   state: string,
   *   context: Record<string, unknown>,
   *   dag: unknown,
   *   checkpoints: Map<string, { stepId: string, snapshot: object, checkpointHash: string, timestamp: string }>,
   *   history: Array<object>,
   *   lastReceiptHash: string|null
   * }>}
   */
  const workflows = new Map();

  /**
   * Initialize a new workflow in the INITIALIZED state.
   * @param {object} rawPayload
   * @param {object} [initOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, workflow?: object, receipt: object, fundacionDelta: 0 }}
   */
  function initWorkflow(rawPayload, initOpts = {}) {
    const timestamp = String(nowFn());
    const val = policyGate.validateWorkflowInitPayload(rawPayload);

    if (!val.ok) {
      const fallbackId =
        rawPayload && typeof rawPayload === 'object' && rawPayload.workflowId
          ? String(rawPayload.workflowId)
          : 'WF-UNKNOWN';

      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: fallbackId,
          stepId: null,
          state: 'UNKNOWN',
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: val.code || BT_CODES.MALFORMED_WORKFLOW_DENY,
        reason: val.reason || 'invalid workflow initialization payload',
        receipt,
        fundacionDelta: 0
      };
    }

    const clean = val.cleanPayload;
    const initialContext = { ...clean.initialContext };
    const checkpointHash = hashFn(initialContext);

    const receipt = buildWorkflowCheckpointReceipt(
      {
        workflowId: clean.workflowId,
        stepId: null,
        state: WORKFLOW_STATES.INITIALIZED,
        checkpointHash,
        status: BT_CODES.INIT_OK,
        timestamp,
        consensusSignature: initOpts.consensusSignature || null,
        prevReceiptHash: null
      },
      { hash: hashFn, now: nowFn }
    );

    const wfRecord = {
      workflowId: clean.workflowId,
      state: WORKFLOW_STATES.INITIALIZED,
      context: initialContext,
      dag: clean.dag,
      checkpoints: new Map(),
      history: [receipt],
      lastReceiptHash: receipt.receiptHash
    };

    workflows.set(clean.workflowId, wfRecord);

    return {
      ok: true,
      allow: true,
      code: BT_CODES.INIT_OK,
      workflow: {
        workflowId: clean.workflowId,
        state: wfRecord.state,
        context: Object.freeze({ ...wfRecord.context })
      },
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Transition active workflow state.
   * @param {string} workflowId
   * @param {string} targetState
   * @param {object} [transOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, workflow?: object, receipt: object, fundacionDelta: 0 }}
   */
  function transitionState(workflowId, targetState, transOpts = {}) {
    const timestamp = String(nowFn());
    const wf = workflows.get(String(workflowId).trim());

    if (!wf) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: String(workflowId),
          stepId: transOpts.stepId || null,
          state: String(targetState),
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: transOpts.consensusSignature || null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BT_CODES.UNKNOWN_WORKFLOW_DENY,
        reason: `workflow '${workflowId}' not found`,
        receipt,
        fundacionDelta: 0
      };
    }

    const check = policyGate.validateStateTransition(wf.state, targetState);
    if (!check.ok) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: wf.workflowId,
          stepId: transOpts.stepId || null,
          state: wf.state,
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: transOpts.consensusSignature || null,
          prevReceiptHash: wf.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );
      wf.history.push(receipt);
      wf.lastReceiptHash = receipt.receiptHash;

      return {
        ok: false,
        allow: false,
        code: check.code,
        reason: check.reason,
        workflow: {
          workflowId: wf.workflowId,
          state: wf.state,
          context: Object.freeze({ ...wf.context })
        },
        receipt,
        fundacionDelta: 0
      };
    }

    // Apply optional context update
    if (transOpts.contextUpdate && typeof transOpts.contextUpdate === 'object') {
      Object.assign(wf.context, transOpts.contextUpdate);
    }

    wf.state = targetState;

    const receipt = buildWorkflowCheckpointReceipt(
      {
        workflowId: wf.workflowId,
        stepId: transOpts.stepId || null,
        state: targetState,
        checkpointHash: null,
        status: BT_CODES.TRANSITION_OK,
        timestamp,
        consensusSignature: transOpts.consensusSignature || null,
        prevReceiptHash: wf.lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );

    wf.history.push(receipt);
    wf.lastReceiptHash = receipt.receiptHash;

    return {
      ok: true,
      allow: true,
      code: BT_CODES.TRANSITION_OK,
      workflow: {
        workflowId: wf.workflowId,
        state: wf.state,
        context: Object.freeze({ ...wf.context })
      },
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Record a step-level checkpoint snapshot.
   * Updates state to CHECKPOINTED and computes deterministic state digest.
   * @param {string} workflowId
   * @param {string} stepId
   * @param {object} [stepPayload]
   * @param {object} [cpOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, checkpoint?: object, receipt: object, fundacionDelta: 0 }}
   */
  function checkpointStep(workflowId, stepId, stepPayload = {}, cpOpts = {}) {
    const timestamp = String(nowFn());
    const wf = workflows.get(String(workflowId).trim());

    if (!wf) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: String(workflowId),
          stepId: String(stepId),
          state: 'UNKNOWN',
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: cpOpts.consensusSignature || null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BT_CODES.UNKNOWN_WORKFLOW_DENY,
        reason: `workflow '${workflowId}' not found`,
        receipt,
        fundacionDelta: 0
      };
    }

    // Verify FSM transition to CHECKPOINTED
    const transCheck = policyGate.validateStateTransition(wf.state, WORKFLOW_STATES.CHECKPOINTED);
    if (!transCheck.ok) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: wf.workflowId,
          stepId: String(stepId),
          state: wf.state,
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: cpOpts.consensusSignature || null,
          prevReceiptHash: wf.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );
      wf.history.push(receipt);
      wf.lastReceiptHash = receipt.receiptHash;

      return {
        ok: false,
        allow: false,
        code: transCheck.code,
        reason: transCheck.reason,
        receipt,
        fundacionDelta: 0
      };
    }

    const cleanStepId = String(stepId).trim();
    if (!cleanStepId) {
      return {
        ok: false,
        allow: false,
        code: BT_CODES.MALFORMED_CHECKPOINT_DENY,
        reason: 'stepId must be a non-empty string',
        receipt: null,
        fundacionDelta: 0
      };
    }

    // Update context with step payload
    if (stepPayload && typeof stepPayload === 'object') {
      wf.context[cleanStepId] = stepPayload;
    }

    const snapshot = JSON.parse(JSON.stringify(wf.context));
    const checkpointHash = hashFn(snapshot);

    wf.state = WORKFLOW_STATES.CHECKPOINTED;
    wf.checkpoints.set(cleanStepId, {
      stepId: cleanStepId,
      snapshot,
      checkpointHash,
      timestamp
    });

    const receipt = buildWorkflowCheckpointReceipt(
      {
        workflowId: wf.workflowId,
        stepId: cleanStepId,
        state: WORKFLOW_STATES.CHECKPOINTED,
        checkpointHash,
        status: BT_CODES.CHECKPOINT_OK,
        timestamp,
        consensusSignature: cpOpts.consensusSignature || null,
        prevReceiptHash: wf.lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );

    wf.history.push(receipt);
    wf.lastReceiptHash = receipt.receiptHash;

    return {
      ok: true,
      allow: true,
      code: BT_CODES.CHECKPOINT_OK,
      checkpoint: {
        stepId: cleanStepId,
        checkpointHash,
        timestamp
      },
      workflow: {
        workflowId: wf.workflowId,
        state: wf.state,
        context: Object.freeze({ ...wf.context })
      },
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Restore workflow state from a recorded checkpoint.
   * Rejects restoration if snapshot hash does not match recorded digest.
   * @param {string} workflowId
   * @param {string|object} stepIdOrReceipt
   * @param {object} [restoreOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, restoredState?: string, restoredContext?: object, receipt: object, fundacionDelta: 0 }}
   */
  function restoreFromCheckpoint(workflowId, stepIdOrReceipt, restoreOpts = {}) {
    const timestamp = String(nowFn());
    const wf = workflows.get(String(workflowId).trim());

    if (!wf) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: String(workflowId),
          stepId: null,
          state: 'UNKNOWN',
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BT_CODES.UNKNOWN_WORKFLOW_DENY,
        reason: `workflow '${workflowId}' not found`,
        receipt,
        fundacionDelta: 0
      };
    }

    if (policyGate.isTerminalState(wf.state)) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: wf.workflowId,
          stepId: null,
          state: wf.state,
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: wf.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BT_CODES.TERMINAL_STATE_LOCKED_DENY,
        reason: `cannot restore workflow '${wf.workflowId}' from checkpoint because it is in terminal state '${wf.state}'`,
        receipt,
        fundacionDelta: 0
      };
    }

    const stepId =
      typeof stepIdOrReceipt === 'string'
        ? stepIdOrReceipt.trim()
        : stepIdOrReceipt && typeof stepIdOrReceipt === 'object' && stepIdOrReceipt.stepId
          ? String(stepIdOrReceipt.stepId).trim()
          : '';

    const cp = wf.checkpoints.get(stepId);
    if (!cp) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: wf.workflowId,
          stepId,
          state: wf.state,
          checkpointHash: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: wf.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BT_CODES.MISSING_CHECKPOINT_DENY,
        reason: `no checkpoint found for stepId '${stepId}'`,
        receipt,
        fundacionDelta: 0
      };
    }

    // Verify snapshot integrity
    const snapshotToVerify = restoreOpts.overrideSnapshot ?? cp.snapshot;
    const check = policyGate.validateCheckpointSnapshot(snapshotToVerify, cp.checkpointHash, hashFn);

    if (!check.ok) {
      const receipt = buildWorkflowCheckpointReceipt(
        {
          workflowId: wf.workflowId,
          stepId,
          state: wf.state,
          checkpointHash: cp.checkpointHash,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: wf.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );
      wf.history.push(receipt);
      wf.lastReceiptHash = receipt.receiptHash;

      return {
        ok: false,
        allow: false,
        code: check.code,
        reason: check.reason,
        receipt,
        fundacionDelta: 0
      };
    }

    // Restore state and context
    wf.context = JSON.parse(JSON.stringify(snapshotToVerify));
    wf.state = WORKFLOW_STATES.CHECKPOINTED;

    const receipt = buildWorkflowCheckpointReceipt(
      {
        workflowId: wf.workflowId,
        stepId,
        state: wf.state,
        checkpointHash: cp.checkpointHash,
        status: BT_CODES.RESTORE_OK,
        timestamp,
        consensusSignature: restoreOpts.consensusSignature || null,
        prevReceiptHash: wf.lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );

    wf.history.push(receipt);
    wf.lastReceiptHash = receipt.receiptHash;

    return {
      ok: true,
      allow: true,
      code: BT_CODES.RESTORE_OK,
      restoredState: wf.state,
      restoredContext: Object.freeze({ ...wf.context }),
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Get active state and context of a workflow.
   * @param {string} workflowId
   * @returns {{ ok: boolean, code: string, workflow?: object, reason?: string }}
   */
  function getWorkflowState(workflowId) {
    const wf = workflows.get(String(workflowId).trim());
    if (!wf) {
      return {
        ok: false,
        code: BT_CODES.UNKNOWN_WORKFLOW_DENY,
        reason: `workflow '${workflowId}' not found`
      };
    }

    return {
      ok: true,
      code: BT_CODES.STATE_GET_OK,
      workflow: {
        workflowId: wf.workflowId,
        state: wf.state,
        context: Object.freeze({ ...wf.context }),
        checkpointCount: wf.checkpoints.size,
        historyCount: wf.history.length,
        lastReceiptHash: wf.lastReceiptHash
      }
    };
  }

  /**
   * Verify an execution checkpoint trail of receipts for cryptographic integrity.
   * @param {Array<object>} receiptsToVerify
   * @param {(payload: unknown) => string} [customHash]
   * @returns {{ ok: boolean, code: string, verifiedCount: number, error?: string }}
   */
  function verifyCheckpointTrail(receiptsToVerify, customHash = hashFn) {
    if (!Array.isArray(receiptsToVerify) || receiptsToVerify.length === 0) {
      return {
        ok: false,
        code: BT_CODES.TRAIL_BREAK,
        verifiedCount: 0,
        error: 'receipts list is empty or not an array'
      };
    }

    let prevHash = null;
    let verifiedCount = 0;

    for (let i = 0; i < receiptsToVerify.length; i++) {
      const r = receiptsToVerify[i];
      const check = verifyWorkflowCheckpointReceipt(r, customHash);
      if (!check.ok) {
        return {
          ok: false,
          code: BT_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `receipt at index ${i} failed hash check: ${check.reason}`
        };
      }

      if (i > 0 && r.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          code: BT_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `chain break at index ${i}: prevReceiptHash '${r.prevReceiptHash}' does not match previous receiptHash '${prevHash}'`
        };
      }

      prevHash = r.receiptHash;
      verifiedCount++;
    }

    return {
      ok: true,
      code: BT_CODES.TRAIL_OK,
      verifiedCount
    };
  }

  /**
   * Reset internal state (for testing).
   */
  function _resetForTests() {
    workflows.clear();
    _resetReceiptSeqForTests();
  }

  return Object.freeze({
    kind: BT_KIND,
    productionReady: BT_PRODUCTION_READY,
    initWorkflow,
    transitionState,
    checkpointStep,
    restoreFromCheckpoint,
    getWorkflowState,
    verifyCheckpointTrail,
    _resetForTests
  });
}
