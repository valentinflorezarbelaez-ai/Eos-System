/**
 * @module data-contract-notary-receipt
 * SPEC-0129 / Mission DS — Contract-First Formal Data Contract Notary Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     contractDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   contractReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   contractHold { schemaStrictnessPreserved: true, uncontractedPayloadRefused: true }
 *
 * Freeze soft-observe pin is `2ff91794` (Mission DR tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DS_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DS_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DS_RECEIPT_KIND = 'eos-data-contract-notary-receipt';
export const DS_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DS_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DS_FREEZE_PIN = '2ff917941234567890abcdef1234567890abcdef';
export const DS_FREEZE_PIN_SHORT = '2ff91794';

export const DS_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Data Contract Notary Port ≠ PRODUCTION_READY flip ≠ L32 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DS_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DS_CONTRACT_HOLD_TEMPLATE = Object.freeze({
  schemaStrictnessPreserved: true,
  uncontractedPayloadRefused: true
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
    pin: DS_FREEZE_PIN,
    pinShort: DS_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DS_FREEZE_NONCLAIM_LABELS,
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

export function forceContractHold(opts = {}) {
  return Object.freeze({
    schemaStrictnessPreserved: true,
    uncontractedPayloadRefused: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalDataContractNotarySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    contractDigest: receipt.contractDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Data Contract Notary Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildDataContractNotaryReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DS-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ds-default');
  const changeId = String(input.changeId || 'eos-ladder-32-mission-ds');
  const decision = DS_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DS_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const contractReport = input.contractReport || null;
  const contractDigest = input.contractDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'DATA_CONTRACT_NOTARY',
    planId,
    decision,
    changeId,
    contractDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DS_RECEIPT_KIND,
    receiptId,
    operation: 'DATA_CONTRACT_NOTARY',
    planId,
    decision,
    changeId,
    ritualMode,
    contractDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    contractReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    contractHold: forceContractHold(input.contractHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyDataContractNotaryReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DS_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DS_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'DATA_CONTRACT_NOTARY') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalDataContractNotarySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
