/**
 * @module idempotent-message-consumer-receipt
 * SPEC-0133 / Mission DW — Autonomous Idempotent Message Consumer Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     consumeDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   messageRecord,
 *   domainEvent (composed from DU when present),
 *   outboxRecord (composed from DV when present),
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused,
 *                   l33AutoCloseRefused, tipRewriteRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   consumeHold { consumeSealed: true, dedupeSealed: true, replayProtected: true },
 *   dvComposeObserve { softImport: true, outboxObserved: boolean },
 *   duComposeObserve { softImport: true, publisherObserved: boolean }
 *
 * Freeze soft-observe pin is `b485ae0b` (PR #447 Mission DV merge / tip-refresh-post-447).
 * Soft-import DV outbox observe when present; optionally soft-observe DU publisher.
 * Do NOT rewrite freeze tip pins.
 *
 * PRODUCTION_READY: NO
 * PASS = idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DW_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DW_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DW_RECEIPT_KIND = 'eos-idempotent-message-consumer-receipt';
export const DW_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DW_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const DW_OPERATIONS = Object.freeze([
  'MESSAGE_CONSUME',
  'MESSAGE_DEDUPE',
  'MESSAGE_REPLAY_PROTECT',
  'MESSAGE_CONSUME_DEDUPE_REPLAY'
]);

export const DW_FREEZE_PIN = 'b485ae0b2472ef8b6f7213fde82fc3ed05ead33d';
export const DW_FREEZE_PIN_SHORT = 'b485ae0b';

export const DW_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Idempotent Message Consumer Port ≠ PRODUCTION_READY flip ≠ tip rewrite',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY'
]);

export const DW_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DW_CONSUME_HOLD_TEMPLATE = Object.freeze({
  consumeSealed: true,
  dedupeSealed: true,
  replayProtected: true
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
    pin: DW_FREEZE_PIN,
    pinShort: DW_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DW_FREEZE_NONCLAIM_LABELS,
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

export function forceConsumeHold(opts = {}) {
  return Object.freeze({
    consumeSealed: true,
    dedupeSealed: true,
    replayProtected: true,
    ...opts
  });
}

export function forceDvComposeObserve(opts = {}) {
  return Object.freeze({
    softImport: true,
    outboxObserved: Boolean(opts.outboxObserved),
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
export function canonicalIdempotentMessageConsumerSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    consumeDigest: receipt.consumeDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Idempotent Message Consumer Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildIdempotentMessageConsumerReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DW-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dw-default');
  const changeId = String(input.changeId || 'eos-ladder-33-mission-dw');
  const decision = DW_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DW_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const operation = DW_OPERATIONS.includes(input.operation)
    ? input.operation
    : 'MESSAGE_CONSUME_DEDUPE_REPLAY';
  const messageRecord = input.messageRecord || null;
  const domainEvent = input.domainEvent || null;
  const outboxRecord = input.outboxRecord || null;
  const consumeDigest =
    input.consumeDigest ||
    sha256Canonical(
      JSON.stringify({
        planId,
        changeId,
        decision,
        operation,
        messageRecord,
        domainEvent,
        outboxRecord
      })
    );
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation,
    planId,
    decision,
    changeId,
    consumeDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DW_RECEIPT_KIND,
    receiptId,
    operation,
    planId,
    decision,
    changeId,
    ritualMode,
    consumeDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    messageRecord,
    domainEvent,
    outboxRecord,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    consumeHold: forceConsumeHold(input.consumeHold || {}),
    dvComposeObserve: forceDvComposeObserve(input.dvComposeObserve || {}),
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
export function verifyIdempotentMessageConsumerReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DW_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DW_RECEIPT_KIND}` };
  }
  if (!DW_OPERATIONS.includes(receipt.operation)) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalIdempotentMessageConsumerSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
