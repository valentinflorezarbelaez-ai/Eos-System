/**
 * @module vertical-slice-receipt
 * SPEC-0126 / Mission DP — Sovereign Vertical Slice & Screaming Architecture Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     sliceDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   sliceReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   sliceHold { screamingArchitectureEnforced: true, crossSliceLeakagePrevented: true }
 *
 * Freeze soft-observe pin is `8bbdd522` (Ladder 32 Audit tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DP_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DP_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DP_RECEIPT_KIND = 'eos-vertical-slice-receipt';
export const DP_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DP_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DP_FREEZE_PIN = '8bbdd5229876543210abcdef0123456789abcdef';
export const DP_FREEZE_PIN_SHORT = '8bbdd522';

export const DP_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Vertical Slice Port ≠ PRODUCTION_READY flip ≠ L32 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DP_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DP_SLICE_HOLD_TEMPLATE = Object.freeze({
  screamingArchitectureEnforced: true,
  crossSliceLeakagePrevented: true
});

export const SLICE_INTEGRITY_STATES = Object.freeze([
  'ISOLATED',
  'COHESIVE',
  'VIOLATION_DETECTED',
  'LEAKAGE_DETECTED'
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
    pin: DP_FREEZE_PIN,
    pinShort: DP_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DP_FREEZE_NONCLAIM_LABELS,
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

export function forceSliceHold(opts = {}) {
  return Object.freeze({
    screamingArchitectureEnforced: true,
    crossSliceLeakagePrevented: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalVerticalSliceSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    sliceDigest: receipt.sliceDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Vertical Slice Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildVerticalSliceReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DP-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dp-default');
  const changeId = String(input.changeId || 'eos-ladder-32-mission-dp');
  const decision = DP_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DP_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const sliceReport = input.sliceReport || null;
  const sliceDigest = input.sliceDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'VERTICAL_SLICE_SCREAMING_ARCHITECTURE',
    planId,
    decision,
    changeId,
    sliceDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DP_RECEIPT_KIND,
    receiptId,
    operation: 'VERTICAL_SLICE_SCREAMING_ARCHITECTURE',
    planId,
    decision,
    changeId,
    ritualMode,
    sliceDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    sliceReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    sliceHold: forceSliceHold(input.sliceHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyVerticalSliceReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DP_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DP_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'VERTICAL_SLICE_SCREAMING_ARCHITECTURE') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalVerticalSliceSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
