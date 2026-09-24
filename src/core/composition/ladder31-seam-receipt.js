/**
 * @module ladder31-seam-receipt
 * SPEC-0125 / Mission DO — Ladder 31 CI Seam-Pack Consolidation & Closeout Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     upstreamDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   seamMode (ACTIVE|HOLD|DRY_RUN),
 *   dkReceiptLink, dlReceiptLink, dmReceiptLink, dnReceiptLink,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   seamHold { ladder31Consolidated: true, closedForLocalGovernedUse: true }
 *
 * Freeze soft-observe pin is `8a4db2c3` (Mission DN tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DO_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DO_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DO_RECEIPT_KIND = 'eos-ladder31-seam-receipt';
export const DO_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DO_SEAM_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DO_FREEZE_PIN = '8a4db2c3e1e2d3c4b5a697887766554433221100';
export const DO_FREEZE_PIN_SHORT = '8a4db2c3';

export const DO_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 31 Seam-Pack Consolidation ≠ PRODUCTION_READY flip',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused after closeout',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DO_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DO_SEAM_HOLD_TEMPLATE = Object.freeze({
  ladder31Consolidated: true,
  closedForLocalGovernedUse: true
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
    pin: DO_FREEZE_PIN,
    pinShort: DO_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    readOnly: true,
    nonClaimLabels: DO_FREEZE_NONCLAIM_LABELS,
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

export function forceSeamHold(opts = {}) {
  return Object.freeze({
    ladder31Consolidated: true,
    closedForLocalGovernedUse: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalLadder31SeamSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    upstreamDigest: receipt.upstreamDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Ladder 31 Seam-Pack Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildLadder31SeamReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DO-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-do-default');
  const changeId = String(input.changeId || 'eos-ladder-31-mission-do');
  const decision = DO_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const seamMode = DO_SEAM_MODES.includes(input.seamMode) ? input.seamMode : 'ACTIVE';
  
  const dkReceiptLink = input.dkReceiptLink || null;
  const dlReceiptLink = input.dlReceiptLink || null;
  const dmReceiptLink = input.dmReceiptLink || null;
  const dnReceiptLink = input.dnReceiptLink || null;

  const upstreamDigest = input.upstreamDigest || sha256Canonical(JSON.stringify({
    dkReceiptLink,
    dlReceiptLink,
    dmReceiptLink,
    dnReceiptLink,
    decision
  }));

  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'LADDER31_SEAM_PACK_CLOSEOUT',
    planId,
    decision,
    changeId,
    upstreamDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DO_RECEIPT_KIND,
    receiptId,
    operation: 'LADDER31_SEAM_PACK_CLOSEOUT',
    planId,
    decision,
    changeId,
    seamMode,
    upstreamDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    dkReceiptLink,
    dlReceiptLink,
    dmReceiptLink,
    dnReceiptLink,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    seamHold: forceSeamHold(input.seamHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyLadder31SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DO_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DO_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'LADDER31_SEAM_PACK_CLOSEOUT') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalLadder31SeamSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
