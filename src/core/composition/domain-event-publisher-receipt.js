/**
 * @module domain-event-publisher-receipt
 * SPEC-0131 / Mission DU — Sovereign Pure Domain Event Publisher Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     eventDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   domainEvent,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused,
 *                   l33AutoCloseRefused, outboxDispatchRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   publishHold { purePublishOnly: true, outboxDispatchDeferred: true }
 *
 * Freeze soft-observe pin is `b205ce8c` (PR #442 tip-honesty merge / prefer tip-refresh-post-442).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed domain event publish receipt ≠ outbox dispatch (DV later) ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DU_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DU_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DU_RECEIPT_KIND = 'eos-domain-event-publisher-receipt';
export const DU_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DU_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DU_FREEZE_PIN = 'b205ce8cc28e94bfbf27954af745f85420c4bd4c';
export const DU_FREEZE_PIN_SHORT = 'b205ce8c';

export const DU_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Domain Event Publisher Port ≠ PRODUCTION_READY flip ≠ outbox dispatch (DV later)',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 auto-close refused',
  'NON-CLAIM: Outbox dispatch refused (DV later)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused'
]);

export const DU_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DU_PUBLISH_HOLD_TEMPLATE = Object.freeze({
  purePublishOnly: true,
  outboxDispatchDeferred: true
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
    pin: DU_FREEZE_PIN,
    pinShort: DU_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33AutoCloseRefused: true,
    outboxDispatchRefused: true,
    readOnly: true,
    nonClaimLabels: DU_FREEZE_NONCLAIM_LABELS,
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

export function forcePublishHold(opts = {}) {
  return Object.freeze({
    purePublishOnly: true,
    outboxDispatchDeferred: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalDomainEventPublisherSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    eventDigest: receipt.eventDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Domain Event Publisher Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildDomainEventPublisherReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DU-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-du-default');
  const changeId = String(input.changeId || 'eos-ladder-33-mission-du');
  const decision = DU_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DU_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const domainEvent = input.domainEvent || null;
  const eventDigest =
    input.eventDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, domainEvent }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'DOMAIN_EVENT_PUBLISH',
    planId,
    decision,
    changeId,
    eventDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DU_RECEIPT_KIND,
    receiptId,
    operation: 'DOMAIN_EVENT_PUBLISH',
    planId,
    decision,
    changeId,
    ritualMode,
    eventDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    domainEvent,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    publishHold: forcePublishHold(input.publishHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyDomainEventPublisherReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DU_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DU_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'DOMAIN_EVENT_PUBLISH') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalDomainEventPublisherSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
