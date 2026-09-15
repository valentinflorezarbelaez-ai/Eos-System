/**
 * @module workflow-checkpoint-policy-gate
 * SPEC-0077 / Mission BT — Fail-closed Policy Gate for Dynamic Workflow
 * State Machine & Step-Level Checkpoint Fabric.
 *
 * Enforces strict fail-closed governance:
 * - ILLEGAL_STATE_TRANSITION_DENY: transition not allowed by FSM
 * - TERMINAL_STATE_LOCKED_DENY: attempt to transition out of terminal state
 * - CORRUPTED_CHECKPOINT_DENY: hash mismatch between checkpoint receipt and snapshot
 * - MISSING_CHECKPOINT_DENY: checkpoint referenced does not exist
 * - FUNDACION_ALWAYS_DENY: targets forbidden external directory
 * - MALFORMED_WORKFLOW_DENY: workflow payload missing required fields
 *
 * NON-CLAIM:
 *   policy gate ≠ AWS Step Functions /
 *   ≠ Temporal.io cluster /
 *   ≠ PRODUCTION_READY=YES orchestrator.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR and BS done; BT in progress; BU–BV pending);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO
 */

import { sha256Canonical, stableStringify } from './workflow-checkpoint-receipt.js';

/** @type {'NO'} */
export const BT_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BT_POLICY_GATE_KIND = 'eos-workflow-checkpoint-policy-gate';

export const WORKFLOW_STATES = Object.freeze({
  INITIALIZED: 'INITIALIZED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  CHECKPOINTED: 'CHECKPOINTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  ABORTED: 'ABORTED'
});

export const TERMINAL_STATES = Object.freeze(
  new Set([
    WORKFLOW_STATES.COMPLETED,
    WORKFLOW_STATES.FAILED,
    WORKFLOW_STATES.ABORTED
  ])
);

export const ALLOWED_TRANSITIONS = Object.freeze({
  [WORKFLOW_STATES.INITIALIZED]: Object.freeze([
    WORKFLOW_STATES.RUNNING,
    WORKFLOW_STATES.ABORTED
  ]),
  [WORKFLOW_STATES.RUNNING]: Object.freeze([
    WORKFLOW_STATES.CHECKPOINTED,
    WORKFLOW_STATES.PAUSED,
    WORKFLOW_STATES.COMPLETED,
    WORKFLOW_STATES.FAILED,
    WORKFLOW_STATES.ABORTED
  ]),
  [WORKFLOW_STATES.CHECKPOINTED]: Object.freeze([
    WORKFLOW_STATES.RUNNING,
    WORKFLOW_STATES.COMPLETED,
    WORKFLOW_STATES.FAILED,
    WORKFLOW_STATES.ABORTED
  ]),
  [WORKFLOW_STATES.PAUSED]: Object.freeze([
    WORKFLOW_STATES.RUNNING,
    WORKFLOW_STATES.ABORTED
  ]),
  [WORKFLOW_STATES.COMPLETED]: Object.freeze([]),
  [WORKFLOW_STATES.FAILED]: Object.freeze([]),
  [WORKFLOW_STATES.ABORTED]: Object.freeze([])
});

export const BT_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  TRANSITION_OK: 'TRANSITION_OK',
  CHECKPOINT_OK: 'CHECKPOINT_OK',
  RESTORE_OK: 'RESTORE_OK',
  ILLEGAL_STATE_TRANSITION_DENY: 'ILLEGAL_STATE_TRANSITION_DENY',
  TERMINAL_STATE_LOCKED_DENY: 'TERMINAL_STATE_LOCKED_DENY',
  CORRUPTED_CHECKPOINT_DENY: 'CORRUPTED_CHECKPOINT_DENY',
  MISSING_CHECKPOINT_DENY: 'MISSING_CHECKPOINT_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  MALFORMED_WORKFLOW_DENY: 'MALFORMED_WORKFLOW_DENY',
  MALFORMED_CHECKPOINT_DENY: 'MALFORMED_CHECKPOINT_DENY',
  UNKNOWN_WORKFLOW_DENY: 'UNKNOWN_WORKFLOW_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

/**
 * Construct a standardized deny decision.
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string, fundacionDelta: 0 }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BT_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BT_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyIllegalTransition(fromState, toState, extra = {}) {
  return deny(
    BT_POLICY_CODES.ILLEGAL_STATE_TRANSITION_DENY,
    `illegal workflow state transition from '${fromState}' to '${toState}'`,
    { fromState, toState, ...extra }
  );
}

export function denyTerminalStateLocked(currentState, attemptedState, extra = {}) {
  return deny(
    BT_POLICY_CODES.TERMINAL_STATE_LOCKED_DENY,
    `workflow is locked in terminal state '${currentState}'; cannot transition to '${attemptedState}'`,
    { currentState, attemptedState, ...extra }
  );
}

export function denyCorruptedCheckpoint(expectedHash, actualHash, extra = {}) {
  return deny(
    BT_POLICY_CODES.CORRUPTED_CHECKPOINT_DENY,
    `checkpoint snapshot corrupted: expected hash '${expectedHash}' but computed '${actualHash}'`,
    { expectedHash, actualHash, ...extra }
  );
}

export function denyMissingCheckpoint(checkpointId, extra = {}) {
  return deny(
    BT_POLICY_CODES.MISSING_CHECKPOINT_DENY,
    `referenced checkpoint '${checkpointId}' not found`,
    { checkpointId, ...extra }
  );
}

export function denyMalformedWorkflow(reason = 'malformed workflow payload', extra = {}) {
  return deny(BT_POLICY_CODES.MALFORMED_WORKFLOW_DENY, reason, extra);
}

export function denyMalformedCheckpoint(reason = 'malformed checkpoint payload', extra = {}) {
  return deny(BT_POLICY_CODES.MALFORMED_CHECKPOINT_DENY, reason, extra);
}

/**
 * Check if target path or description references forbidden external target (Fundacion).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * Check if state string is a valid FSM state.
 * @param {unknown} state
 * @returns {boolean}
 */
export function isValidWorkflowState(state) {
  return typeof state === 'string' && Object.values(WORKFLOW_STATES).includes(state);
}

/**
 * Check if state is terminal.
 * @param {unknown} state
 * @returns {boolean}
 */
export function isTerminalState(state) {
  return typeof state === 'string' && TERMINAL_STATES.has(state);
}

/**
 * Validate state transition against FSM graph.
 * @param {string} fromState
 * @param {string} toState
 * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string }}
 */
export function validateStateTransition(fromState, toState) {
  if (!isValidWorkflowState(fromState)) {
    return denyIllegalTransition(fromState, toState, {
      reason: `invalid origin state '${fromState}'`
    });
  }

  if (!isValidWorkflowState(toState)) {
    return denyIllegalTransition(fromState, toState, {
      reason: `invalid destination state '${toState}'`
    });
  }

  if (isTerminalState(fromState)) {
    return denyTerminalStateLocked(fromState, toState);
  }

  const allowed = ALLOWED_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    return denyIllegalTransition(fromState, toState);
  }

  return {
    ok: true,
    allow: true,
    code: BT_POLICY_CODES.TRANSITION_OK,
    fundacionDelta: 0
  };
}

/**
 * Validate checkpoint snapshot against expected hash.
 * @param {unknown} snapshot
 * @param {string} expectedHash
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, computedHash?: string }}
 */
export function validateCheckpointSnapshot(snapshot, expectedHash, hashFn = sha256Canonical) {
  if (snapshot == null) {
    return denyMalformedCheckpoint('checkpoint snapshot cannot be null or undefined');
  }

  if (typeof expectedHash !== 'string' || expectedHash.trim() === '') {
    return denyMalformedCheckpoint('expected checkpoint hash must be a non-empty string');
  }

  const computedHash = hashFn(snapshot);
  if (computedHash !== expectedHash.trim()) {
    return denyCorruptedCheckpoint(expectedHash.trim(), computedHash);
  }

  return {
    ok: true,
    allow: true,
    code: BT_POLICY_CODES.OK,
    computedHash,
    fundacionDelta: 0
  };
}

/**
 * Validate workflow initialization payload.
 * @param {unknown} payload
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanPayload?: object }}
 */
export function validateWorkflowInitPayload(payload) {
  if (payload == null || typeof payload !== 'object') {
    return denyMalformedWorkflow('workflow initialization payload must be an object');
  }

  const rawId = payload.workflowId ?? payload.id;
  const workflowId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!workflowId) {
    return denyMalformedWorkflow('workflow must possess a non-empty workflowId');
  }

  if (isFundacionTarget(workflowId)) {
    return denyFundacion(`workflowId '${workflowId}' references forbidden Fundacion path`);
  }

  if (payload.target && isFundacionTarget(payload.target)) {
    return denyFundacion(`target '${payload.target}' references forbidden Fundacion path`);
  }

  if (payload.initialContext && typeof payload.initialContext === 'object') {
    const s = JSON.stringify(payload.initialContext);
    if (isFundacionTarget(s)) {
      return denyFundacion('workflow initialContext references forbidden Fundacion directory');
    }
  }

  return {
    ok: true,
    cleanPayload: {
      workflowId,
      dag: payload.dag ?? null,
      initialContext: payload.initialContext ? Object.freeze({ ...payload.initialContext }) : {}
    }
  };
}

/**
 * Factory for workflow checkpoint policy gate.
 * @param {object} [opts]
 * @returns {object}
 */
export function createWorkflowCheckpointPolicyGate(opts = {}) {
  return Object.freeze({
    kind: BT_POLICY_GATE_KIND,
    productionReady: BT_POLICY_GATE_PRODUCTION_READY,
    validateStateTransition,
    validateCheckpointSnapshot,
    validateWorkflowInitPayload,
    isFundacionTarget,
    isValidWorkflowState,
    isTerminalState
  });
}
