/**
 * @module adversarial-invariant-refuter-receipt
 * SPEC-0122 / Mission DL — Adversarial Invariant Refuter Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     refutationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   refutationReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   refutationHold { invariantsWithstood: true, zeroBreachesUnhandled: true }
 *
 * Freeze soft-observe pin is `20cb9abd` / full `20cb9abd9025c995eb8e90d5a87296f57574263c` (Mission DK tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DL_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DL_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DL_RECEIPT_KIND = 'eos-adversarial-invariant-refuter-receipt';
export const DL_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD', 'CHALLENGE']);
export const DL_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DL_FREEZE_PIN = '20cb9abd9025c995eb8e90d5a87296f57574263c';
export const DL_FREEZE_PIN_SHORT = '20cb9abd';

export const DL_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Adversarial Invariant Refuter ≠ PRODUCTION_READY flip ≠ L31 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DL_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DL_REFUTATION_HOLD_TEMPLATE = Object.freeze({
  invariantsWithstood: true,
  zeroBreachesUnhandled: true
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
    pin: DL_FREEZE_PIN,
    pinShort: DL_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DL_FREEZE_NONCLAIM_LABELS
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true
  });
}

export function forceRefutationHold(opts = {}) {
  return Object.freeze({
    invariantsWithstood: true,
    zeroBreachesUnhandled: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalAdversarialInvariantRefuterSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    refutationDigest: receipt.refutationDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Adversarial Invariant Refuter Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildAdversarialInvariantRefuterReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DL-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dl-default');
  const changeId = String(input.changeId || 'eos-ladder-31-mission-dl');
  const decision = DL_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DL_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const refutationReport = input.refutationReport || null;
  const refutationDigest = input.refutationDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'ADVERSARIAL_INVARIANT_REFUTER',
    planId,
    decision,
    changeId,
    refutationDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DL_RECEIPT_KIND,
    receiptId,
    operation: 'ADVERSARIAL_INVARIANT_REFUTER',
    planId,
    decision,
    changeId,
    ritualMode,
    refutationDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    refutationReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    refutationHold: forceRefutationHold(input.refutationHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyAdversarialInvariantRefuterReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DL_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DL_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'ADVERSARIAL_INVARIANT_REFUTER') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalAdversarialInvariantRefuterSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
