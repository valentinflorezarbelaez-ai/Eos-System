/**
 * @module process-manager-saga-receipt
 * SPEC-0136 / Mission DZ — Sovereign Process Manager / Saga Orchestration Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     processDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   processInstance,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34AutoCloseRefused, dualWriteRefused, outboxMutationRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   sagaHold { hermeticInMemoryOnly: true, compensateFailClosed: true,
 *              dualWriteDeferred: true, networkWriteRefused: true }
 *
 * Freeze soft-observe pin is `b382d29b` (PR #460 tip-refresh / tip-open L34 merge).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed process/saga step receipt ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DZ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DZ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DZ_RECEIPT_KIND = 'eos-process-manager-saga-receipt';
export const DZ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD', 'COMPENSATE']);
export const DZ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DZ_FREEZE_PIN = 'b382d29bee2494f21652f9207170d900c7179f4c';
export const DZ_FREEZE_PIN_SHORT = 'b382d29b';

export const DZ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Process Manager / Saga Port ≠ PRODUCTION_READY flip ≠ network write ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 auto-close refused',
  'NON-CLAIM: Dual-write refused',
  'NON-CLAIM: Outbox mutation refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed process/saga step ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const DZ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DZ_SAGA_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  compensateFailClosed: true,
  dualWriteDeferred: true,
  networkWriteRefused: true
});

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
    pin: DZ_FREEZE_PIN,
    pinShort: DZ_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34AutoCloseRefused: true,
    dualWriteRefused: true,
    outboxMutationRefused: true,
    readOnly: true,
    nonClaimLabels: DZ_FREEZE_NONCLAIM_LABELS,
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

export function forceSagaHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    compensateFailClosed: true,
    dualWriteDeferred: true,
    networkWriteRefused: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalProcessManagerSagaSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    processDigest: receipt.processDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Process Manager / Saga Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildProcessManagerSagaReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DZ-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dz-default');
  const changeId = String(input.changeId || 'eos-ladder-34-mission-dz');
  const decision = DZ_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DZ_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const processInstance = input.processInstance || null;
  const processDigest =
    input.processDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, processInstance }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'PROCESS_MANAGER_SAGA',
    planId,
    decision,
    changeId,
    processDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DZ_RECEIPT_KIND,
    receiptId,
    operation: 'PROCESS_MANAGER_SAGA',
    planId,
    decision,
    changeId,
    ritualMode,
    processDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    processInstance,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    sagaHold: forceSagaHold(input.sagaHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyProcessManagerSagaReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DZ_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DZ_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'PROCESS_MANAGER_SAGA') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalProcessManagerSagaSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
