/**
 * @module temporal-deadline-ttl-receipt
 * SPEC-0141 / Mission EE — Temporal Deadline & TTL Governance Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     deadlineDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   deadline,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35AutoCloseRefused, liveTimerRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   temporalHold { hermeticInMemoryOnly: true, liveTimerRefused: true,
 *                  wallClockSchedulerRefused: true, tipRewriteRefused: true,
 *                  schemaJsonAddRefused: true, governedSealOnly: true }
 *
 * Freeze soft-observe pin is `9600063c` (tip-open L35 / tip-refresh #475).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed deadline/TTL receipt ≠ live setTimeout/setInterval/cron ≠ tip-refresh ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EE_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EE_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EE_RECEIPT_KIND = 'eos-temporal-deadline-ttl-receipt';
export const EE_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD', 'EXPIRE']);
export const EE_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const EE_FREEZE_PIN = '9600063c07f82dff13720ddcfb35e0d78804113b';
export const EE_FREEZE_PIN_SHORT = '9600063c';

export const EE_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Temporal Deadline & TTL Governance ≠ PRODUCTION_READY flip ≠ live timer ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 auto-close refused',
  'NON-CLAIM: Live wall-clock scheduler / setTimeout / setInterval refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed deadline/TTL ≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EE_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EE_TEMPORAL_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  liveTimerRefused: true,
  wallClockSchedulerRefused: true,
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
    pin: EE_FREEZE_PIN,
    pinShort: EE_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35AutoCloseRefused: true,
    liveTimerRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EE_FREEZE_NONCLAIM_LABELS,
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

export function forceTemporalHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    liveTimerRefused: true,
    wallClockSchedulerRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalTemporalDeadlineTtlSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    deadlineDigest: receipt.deadlineDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Temporal Deadline & TTL Governance Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildTemporalDeadlineTtlReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EE-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ee-default');
  const changeId = String(input.changeId || 'eos-ladder-35-mission-ee');
  const decision = EE_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EE_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const deadline = input.deadline || null;
  const deadlineDigest =
    input.deadlineDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, deadline }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'TEMPORAL_DEADLINE_TTL_GOVERNANCE',
    planId,
    decision,
    changeId,
    deadlineDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EE_RECEIPT_KIND,
    receiptId,
    operation: 'TEMPORAL_DEADLINE_TTL_GOVERNANCE',
    planId,
    decision,
    changeId,
    ritualMode,
    deadlineDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    deadline,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    temporalHold: forceTemporalHold(input.temporalHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyTemporalDeadlineTtlReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EE_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EE_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'TEMPORAL_DEADLINE_TTL_GOVERNANCE') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalTemporalDeadlineTtlSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
