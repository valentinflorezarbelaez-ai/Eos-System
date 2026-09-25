/**
 * @module execution-loop-controller-receipt
 * SPEC-0128 / Mission DR — Deterministic Autonomous Execution Loop Controller Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     loopDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   loopReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   loopHold { stateTransitionsDeterministic: true, outOfOrderExecutionRefused: true }
 *
 * Freeze soft-observe pin is `898aa96a` (Mission DQ tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DR_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DR_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DR_RECEIPT_KIND = 'eos-execution-loop-controller-receipt';
export const DR_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DR_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DR_FREEZE_PIN = '898aa96a1234567890abcdef1234567890abcdef';
export const DR_FREEZE_PIN_SHORT = '898aa96a';

export const DR_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Execution Loop Controller Port ≠ PRODUCTION_READY flip ≠ L32 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DR_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DR_LOOP_HOLD_TEMPLATE = Object.freeze({
  stateTransitionsDeterministic: true,
  outOfOrderExecutionRefused: true
});

export const VALID_LIFECYCLE_STATES = Object.freeze([
  'INTAKE',
  'SPEC_APPROVAL',
  'TDD_RED',
  'TDD_GREEN',
  'QUALITY_AUDIT',
  'VERIFIED',
  'SEALED'
]);

let _receiptSeq = 0;

export function _resetReceiptSeqForTests() {
  _receiptSeq = 0;
}

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: DR_FREEZE_PIN,
    pinShort: DR_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DR_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true,
    ...opts
  });
}

export function forceLoopHold(opts = {}) {
  return Object.freeze({
    stateTransitionsDeterministic: true,
    outOfOrderExecutionRefused: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalExecutionLoopControllerSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    loopDigest: receipt.loopDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Execution Loop Controller Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildExecutionLoopControllerReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DR-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dr-default');
  const changeId = String(input.changeId || 'eos-ladder-32-mission-dr');
  const decision = DR_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DR_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const loopReport = input.loopReport || null;
  const loopDigest = input.loopDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'DETERMINISTIC_EXECUTION_LOOP_CONTROLLER',
    planId,
    decision,
    changeId,
    loopDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DR_RECEIPT_KIND,
    receiptId,
    operation: 'DETERMINISTIC_EXECUTION_LOOP_CONTROLLER',
    planId,
    decision,
    changeId,
    ritualMode,
    loopDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    loopReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    loopHold: forceLoopHold(input.loopHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyExecutionLoopControllerReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DR_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DR_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'DETERMINISTIC_EXECUTION_LOOP_CONTROLLER') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalExecutionLoopControllerSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
