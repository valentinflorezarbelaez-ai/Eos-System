/**
 * @module transactional-outbox-receipt
 * SPEC-0132 / Mission DV — Transactional Resilient Outbox Pattern Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     outboxDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   outboxRecord,
 *   domainEvent (composed from DU when present),
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused,
 *                   l33AutoCloseRefused, tipRewriteRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   outboxHold { persistSealed: true, dispatchSealed: true, atLeastOnce: true },
 *   duComposeObserve { softImport: true, publisherObserved: boolean }
 *
 * Freeze soft-observe pin is `cd1512a9` (PR #445 Mission DU merge / tip-refresh-post-445).
 * Soft-import DU publisher observe when present. Do NOT rewrite freeze tip pins.
 *
 * PRODUCTION_READY: NO
 * PASS = outbox persist/dispatch sealed ≠ PRODUCTION_READY ≠ tip rewrite
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DV_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DV_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DV_RECEIPT_KIND = 'eos-transactional-outbox-receipt';
export const DV_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DV_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const DV_OPERATIONS = Object.freeze([
  'OUTBOX_PERSIST',
  'OUTBOX_DISPATCH',
  'OUTBOX_PERSIST_DISPATCH'
]);

export const DV_FREEZE_PIN = 'cd1512a9f0180edfb18f8ea97cd169e8b2d289c3';
export const DV_FREEZE_PIN_SHORT = 'cd1512a9';

export const DV_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Transactional Outbox Port ≠ PRODUCTION_READY flip ≠ tip rewrite',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = outbox persist/dispatch sealed ≠ PRODUCTION_READY'
]);

export const DV_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DV_OUTBOX_HOLD_TEMPLATE = Object.freeze({
  persistSealed: true,
  dispatchSealed: true,
  atLeastOnce: true
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
    pin: DV_FREEZE_PIN,
    pinShort: DV_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DV_FREEZE_NONCLAIM_LABELS,
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

export function forceOutboxHold(opts = {}) {
  return Object.freeze({
    persistSealed: true,
    dispatchSealed: true,
    atLeastOnce: true,
    ...opts
  });
}

export function forceDuComposeObserve(opts = {}) {
  return Object.freeze({
    softImport: true,
    publisherObserved: Boolean(opts.publisherObserved),
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalTransactionalOutboxSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    outboxDigest: receipt.outboxDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Transactional Outbox Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildTransactionalOutboxReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DV-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dv-default');
  const changeId = String(input.changeId || 'eos-ladder-33-mission-dv');
  const decision = DV_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DV_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const operation = DV_OPERATIONS.includes(input.operation)
    ? input.operation
    : 'OUTBOX_PERSIST_DISPATCH';
  const outboxRecord = input.outboxRecord || null;
  const domainEvent = input.domainEvent || null;
  const outboxDigest =
    input.outboxDigest ||
    sha256Canonical(
      JSON.stringify({ planId, changeId, decision, operation, outboxRecord, domainEvent })
    );
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation,
    planId,
    decision,
    changeId,
    outboxDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DV_RECEIPT_KIND,
    receiptId,
    operation,
    planId,
    decision,
    changeId,
    ritualMode,
    outboxDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    outboxRecord,
    domainEvent,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    outboxHold: forceOutboxHold(input.outboxHold || {}),
    duComposeObserve: forceDuComposeObserve(input.duComposeObserve || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyTransactionalOutboxReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DV_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DV_RECEIPT_KIND}` };
  }
  if (!DV_OPERATIONS.includes(receipt.operation)) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalTransactionalOutboxSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
