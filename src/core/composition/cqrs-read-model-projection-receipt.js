/**
 * @module cqrs-read-model-projection-receipt
 * SPEC-0137 / Mission EA — CQRS Read-Model Projection Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     projectionDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   projection,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34AutoCloseRefused, secondSourceOfTruthRefused, dualWriteRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   projectionHold { projectionDisposable: true, secondSourceOfTruthRefused: true,
 *                    hermeticInMemoryOnly: true, networkWriteRefused: true,
 *                    rebuildFromStreamOnly: true }
 *
 * Freeze soft-observe pin is `1f2234cf` (PR #461 DZ merge / tip-refresh #462).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed projection receipt ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EA_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EA_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EA_RECEIPT_KIND = 'eos-cqrs-read-model-projection-receipt';
export const EA_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EA_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const EA_FREEZE_PIN = '1f2234cffdecd7e0810d7271c5e92adc9f8c75f3';
export const EA_FREEZE_PIN_SHORT = '1f2234cf';

export const EA_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: CQRS Read-Model Projection Port ≠ PRODUCTION_READY flip ≠ network write ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 auto-close refused',
  'NON-CLAIM: Second source of truth refused',
  'NON-CLAIM: Dual-write refused',
  'NON-CLAIM: Projection is disposable / reconstructable — not SoT',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed projection ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT'
]);

export const EA_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EA_PROJECTION_HOLD_TEMPLATE = Object.freeze({
  projectionDisposable: true,
  secondSourceOfTruthRefused: true,
  hermeticInMemoryOnly: true,
  networkWriteRefused: true,
  rebuildFromStreamOnly: true
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
    pin: EA_FREEZE_PIN,
    pinShort: EA_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34AutoCloseRefused: true,
    secondSourceOfTruthRefused: true,
    dualWriteRefused: true,
    readOnly: true,
    nonClaimLabels: EA_FREEZE_NONCLAIM_LABELS,
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

export function forceProjectionHold(opts = {}) {
  return Object.freeze({
    projectionDisposable: true,
    secondSourceOfTruthRefused: true,
    hermeticInMemoryOnly: true,
    networkWriteRefused: true,
    rebuildFromStreamOnly: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalCqrsReadModelProjectionSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    projectionDigest: receipt.projectionDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed CQRS Read-Model Projection Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildCqrsReadModelProjectionReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EA-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ea-default');
  const changeId = String(input.changeId || 'eos-ladder-34-mission-ea');
  const decision = EA_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EA_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const projection = input.projection || null;
  const projectionDigest =
    input.projectionDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, projection }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'CQRS_READ_MODEL_PROJECTION',
    planId,
    decision,
    changeId,
    projectionDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EA_RECEIPT_KIND,
    receiptId,
    operation: 'CQRS_READ_MODEL_PROJECTION',
    planId,
    decision,
    changeId,
    ritualMode,
    projectionDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    projection,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    projectionHold: forceProjectionHold(input.projectionHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyCqrsReadModelProjectionReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EA_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EA_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'CQRS_READ_MODEL_PROJECTION') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalCqrsReadModelProjectionSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}