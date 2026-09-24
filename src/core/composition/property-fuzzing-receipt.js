/**
 * @module property-fuzzing-receipt
 * SPEC-0127 / Mission DQ — Autonomous Property-Based Generative Fuzzing Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     fuzzDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   fuzzReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   fuzzHold { propertyInvariantsGrounded: true, counterexamplesRefused: true }
 *
 * Freeze soft-observe pin is `fc9a0c20` (Mission DP tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DQ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DQ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DQ_RECEIPT_KIND = 'eos-property-fuzzing-receipt';
export const DQ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DQ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DQ_FREEZE_PIN = 'fc9a0c201234567890abcdef1234567890abcdef';
export const DQ_FREEZE_PIN_SHORT = 'fc9a0c20';

export const DQ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Property Fuzzing Port ≠ PRODUCTION_READY flip ≠ L32 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DQ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DQ_FUZZ_HOLD_TEMPLATE = Object.freeze({
  propertyInvariantsGrounded: true,
  counterexamplesRefused: true
});

export const PROPERTY_FUZZ_STATES = Object.freeze([
  'VERIFIED',
  'COUNTEREXAMPLE_FOUND',
  'INCONCLUSIVE',
  'ABORTED'
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
    pin: DQ_FREEZE_PIN,
    pinShort: DQ_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DQ_FREEZE_NONCLAIM_LABELS,
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

export function forceFuzzHold(opts = {}) {
  return Object.freeze({
    propertyInvariantsGrounded: true,
    counterexamplesRefused: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalPropertyFuzzingSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    fuzzDigest: receipt.fuzzDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Property Fuzzing Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildPropertyFuzzingReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DQ-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dq-default');
  const changeId = String(input.changeId || 'eos-ladder-32-mission-dq');
  const decision = DQ_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DQ_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const fuzzReport = input.fuzzReport || null;
  const fuzzDigest = input.fuzzDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'PROPERTY_BASED_GENERATIVE_FUZZING',
    planId,
    decision,
    changeId,
    fuzzDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DQ_RECEIPT_KIND,
    receiptId,
    operation: 'PROPERTY_BASED_GENERATIVE_FUZZING',
    planId,
    decision,
    changeId,
    ritualMode,
    fuzzDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    fuzzReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    fuzzHold: forceFuzzHold(input.fuzzHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyPropertyFuzzingReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DQ_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DQ_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'PROPERTY_BASED_GENERATIVE_FUZZING') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalPropertyFuzzingSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
