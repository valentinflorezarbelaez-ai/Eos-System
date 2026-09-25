/**
 * @module circuit-breaker-receipt
 * SPEC-0134 / Mission DX — Sovereign Circuit Breaker & Resilient Fallback Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     breakerDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   breakerRecord,
 *   fallbackRecord,
 *   messageRecord (composed from DW when present),
 *   domainEvent (composed from DU when present),
 *   outboxRecord (composed from DV when present),
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused,
 *                   l33AutoCloseRefused, tipRewriteRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   breakerHold { failClosed: true, fallbackSealed: true, stateMachineSealed: true },
 *   dwComposeObserve { softImport: true, consumerObserved: boolean },
 *   dvComposeObserve { softImport: true, outboxObserved: boolean },
 *   duComposeObserve { softImport: true, publisherObserved: boolean }
 *
 * Freeze soft-observe pin is `d667c6b5` (tip-refresh-post-450 / PR #450 Mission DW merge tip).
 * Soft-import DW consumer when present; optionally soft-observe DV outbox / DU publisher.
 * Do NOT rewrite freeze tip pins.
 *
 * PRODUCTION_READY: NO
 * PASS = circuit breaker + resilient fallback seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DX_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DX_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DX_RECEIPT_KIND = 'eos-circuit-breaker-receipt';
export const DX_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DX_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const DX_BREAKER_STATES = Object.freeze(['CLOSED', 'OPEN', 'HALF_OPEN']);
export const DX_OPERATIONS = Object.freeze([
  'BREAKER_GOVERN',
  'BREAKER_TRIP',
  'BREAKER_RESET',
  'BREAKER_HALF_OPEN_PROBE',
  'BREAKER_FALLBACK',
  'BREAKER_ALLOW'
]);

export const DX_FREEZE_PIN = 'd667c6b578d5c1b5ff9995101272e86dd039f5be';
export const DX_FREEZE_PIN_SHORT = 'd667c6b5';

export const DX_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Circuit Breaker & Resilient Fallback Port ≠ PRODUCTION_READY flip ≠ tip rewrite',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = circuit breaker + resilient fallback seal ≠ PRODUCTION_READY'
]);

export const DX_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DX_BREAKER_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  fallbackSealed: true,
  stateMachineSealed: true
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
    pin: DX_FREEZE_PIN,
    pinShort: DX_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DX_FREEZE_NONCLAIM_LABELS,
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

export function forceBreakerHold(opts = {}) {
  return Object.freeze({
    failClosed: true,
    fallbackSealed: true,
    stateMachineSealed: true,
    ...opts
  });
}

export function forceDwComposeObserve(opts = {}) {
  return Object.freeze({
    softImport: true,
    consumerObserved: Boolean(opts.consumerObserved),
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
export function canonicalCircuitBreakerSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    breakerDigest: receipt.breakerDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Circuit Breaker Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildCircuitBreakerReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DX-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dx-default');
  const changeId = String(input.changeId || 'eos-ladder-33-mission-dx');
  const decision = DX_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DX_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const operation = DX_OPERATIONS.includes(input.operation)
    ? input.operation
    : 'BREAKER_GOVERN';
  const breakerRecord = input.breakerRecord || null;
  const fallbackRecord = input.fallbackRecord || null;
  const messageRecord = input.messageRecord || null;
  const domainEvent = input.domainEvent || null;
  const outboxRecord = input.outboxRecord || null;
  const breakerDigest =
    input.breakerDigest ||
    sha256Canonical(
      JSON.stringify({
        planId,
        changeId,
        decision,
        operation,
        breakerRecord,
        fallbackRecord,
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
    breakerDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DX_RECEIPT_KIND,
    receiptId,
    operation,
    planId,
    decision,
    changeId,
    ritualMode,
    breakerDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    breakerRecord,
    fallbackRecord,
    messageRecord,
    domainEvent,
    outboxRecord,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    breakerHold: forceBreakerHold(input.breakerHold || {}),
    dwComposeObserve: forceDwComposeObserve(input.dwComposeObserve || {}),
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
export function verifyCircuitBreakerReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DX_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DX_RECEIPT_KIND}` };
  }
  if (!DX_OPERATIONS.includes(receipt.operation)) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalCircuitBreakerSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
