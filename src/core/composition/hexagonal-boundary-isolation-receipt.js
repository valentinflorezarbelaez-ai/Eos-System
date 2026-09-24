/**
 * @module hexagonal-boundary-isolation-receipt
 * SPEC-0123 / Mission DM — Hexagonal Architecture Boundary Isolation Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     boundaryDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   boundaryReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   boundaryHold { layer0Pure: true, zeroBoundaryViolations: true }
 *
 * Freeze soft-observe pin is `f367a1cf` / full `f367a1cfb7945b9fc4a089aeebbc4ba68a9d9260` (Mission DL tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DM_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DM_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DM_RECEIPT_KIND = 'eos-hexagonal-boundary-isolation-receipt';
export const DM_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DM_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DM_FREEZE_PIN = 'f367a1cfb7945b9fc4a089aeebbc4ba68a9d9260';
export const DM_FREEZE_PIN_SHORT = 'f367a1cf';

export const DM_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Hexagonal Boundary Isolation ≠ PRODUCTION_READY flip ≠ L31 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DM_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DM_BOUNDARY_HOLD_TEMPLATE = Object.freeze({
  layer0Pure: true,
  zeroBoundaryViolations: true
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
    pin: DM_FREEZE_PIN,
    pinShort: DM_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DM_FREEZE_NONCLAIM_LABELS
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true
  });
}

export function forceBoundaryHold(opts = {}) {
  return Object.freeze({
    layer0Pure: true,
    zeroBoundaryViolations: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalHexagonalBoundaryIsolationSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    boundaryDigest: receipt.boundaryDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Hexagonal Boundary Isolation Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildHexagonalBoundaryIsolationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DM-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dm-default');
  const changeId = String(input.changeId || 'eos-ladder-31-mission-dm');
  const decision = DM_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DM_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const boundaryReport = input.boundaryReport || null;
  const boundaryDigest = input.boundaryDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'HEXAGONAL_BOUNDARY_ISOLATION',
    planId,
    decision,
    changeId,
    boundaryDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DM_RECEIPT_KIND,
    receiptId,
    operation: 'HEXAGONAL_BOUNDARY_ISOLATION',
    planId,
    decision,
    changeId,
    ritualMode,
    boundaryDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    boundaryReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    boundaryHold: forceBoundaryHold(input.boundaryHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyHexagonalBoundaryIsolationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DM_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DM_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'HEXAGONAL_BOUNDARY_ISOLATION') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalHexagonalBoundaryIsolationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
