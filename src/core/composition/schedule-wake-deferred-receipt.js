/**
 * @module schedule-wake-deferred-receipt
 * SPEC-0142 / Mission EF — Schedule Wake & Deferred Trigger Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     scheduleDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   schedule,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35AutoCloseRefused, liveCronRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   scheduleHold { hermeticInMemoryOnly: true, liveCronRefused: true,
 *                  osSchedulerRefused: true, networkWakeRefused: true,
 *                  tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                  governedSealOnly: true }
 *
 * Freeze soft-observe pin is `0a286ad8` (EE merge / tip-refresh #477).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = hermetic deferred-wake receipt ≠ setInterval/cron daemon ≠ network wake ≠ tip-refresh ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EF_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EF_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EF_RECEIPT_KIND = 'eos-schedule-wake-deferred-receipt';
export const EF_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EF_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EF_TRIGGER_KINDS = Object.freeze(['ONCE', 'DEFERRED']);

export const EF_FREEZE_PIN = '0a286ad8f4bfda1fafb8d5503de8babf89934a7c';
export const EF_FREEZE_PIN_SHORT = '0a286ad8';

export const EF_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Schedule Wake & Deferred Trigger ≠ PRODUCTION_READY flip ≠ live cron ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 auto-close refused',
  'NON-CLAIM: Live cron daemon / setInterval / OS scheduler / network wake refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = hermetic deferred-wake receipt ≠ live cron ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EF_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EF_SCHEDULE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  liveCronRefused: true,
  osSchedulerRefused: true,
  networkWakeRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true
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
    pin: EF_FREEZE_PIN,
    pinShort: EF_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35AutoCloseRefused: true,
    liveCronRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EF_FREEZE_NONCLAIM_LABELS,
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

export function forceScheduleHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    liveCronRefused: true,
    osSchedulerRefused: true,
    networkWakeRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalScheduleWakeDeferredSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    scheduleDigest: receipt.scheduleDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Schedule Wake & Deferred Trigger Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildScheduleWakeDeferredReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EF-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ef-default');
  const changeId = String(input.changeId || 'eos-ladder-35-mission-ef');
  const decision = EF_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EF_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const schedule = input.schedule || null;
  const scheduleDigest =
    input.scheduleDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, schedule }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'SCHEDULE_WAKE_DEFERRED_TRIGGER',
    planId,
    decision,
    changeId,
    scheduleDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EF_RECEIPT_KIND,
    receiptId,
    operation: 'SCHEDULE_WAKE_DEFERRED_TRIGGER',
    planId,
    decision,
    changeId,
    ritualMode,
    scheduleDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    schedule,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    scheduleHold: forceScheduleHold(input.scheduleHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyScheduleWakeDeferredReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EF_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EF_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'SCHEDULE_WAKE_DEFERRED_TRIGGER') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalScheduleWakeDeferredSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
