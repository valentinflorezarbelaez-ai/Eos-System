/**
 * @module admission-control-intake-receipt
 * SPEC-0146 / Mission EJ — Sovereign Admission Control & Work-Intake Quotas Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     intakeDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   intake,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35ReopenRefused, l36AutoCloseRefused,
 *                   liveOsSchedulerRefused, networkRateLimiterRefused, schemaJsonAddRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   admissionHold { hermeticInMemoryOnly: true, failClosed: true,
 *                   liveOsSchedulerRefused: true, networkRateLimiterRefused: true,
 *                   wallClockAuthorityRefused: true, tipRewriteRefused: true,
 *                   schemaJsonAddRefused: true, governedSealOnly: true,
 *                   distinctFromDxCircuitBreaker: true }
 *
 * Freeze soft-observe pin is `d7490fee` (L36 tip-open / tip-refresh #490 pin).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from DX circuit breaker (failureThreshold/cooldown trip) —
 * this is intake capacity / work-intake quotas, not trip-on-failure.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed admission/quota receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live OS scheduler ≠ network rate limiter ≠ wall-clock authority
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EJ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EJ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EJ_RECEIPT_KIND = 'eos-admission-control-intake-receipt';
export const EJ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EJ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EJ_OPERATION = 'ADMISSION_CONTROL_WORK_INTAKE_QUOTAS';

export const EJ_FREEZE_PIN = 'd7490fee0e419fc58602f67b0051ca06e649595a';
export const EJ_FREEZE_PIN_SHORT = 'd7490fee';

export const EJ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Admission Control & Work-Intake Quotas ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live OS scheduler',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 auto-close refused (EK–EN pending)',
  'NON-CLAIM: Live OS scheduler / network rate limiter / wall-clock authority refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from DX circuit breaker (failureThreshold/cooldown) — intake quotas only',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed admission/quota ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EJ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EJ_ADMISSION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveOsSchedulerRefused: true,
  networkRateLimiterRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  distinctFromDxCircuitBreaker: true
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
    pin: EJ_FREEZE_PIN,
    pinShort: EJ_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36AutoCloseRefused: true,
    liveOsSchedulerRefused: true,
    networkRateLimiterRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EJ_FREEZE_NONCLAIM_LABELS,
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

export function forceAdmissionHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveOsSchedulerRefused: true,
    networkRateLimiterRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    distinctFromDxCircuitBreaker: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalAdmissionControlIntakeSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    intakeDigest: receipt.intakeDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Admission Control & Work-Intake Quotas Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildAdmissionControlIntakeReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EJ-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ej-default');
  const changeId = String(input.changeId || 'eos-ladder-36-mission-ej');
  const decision = EJ_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EJ_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const intake = input.intake || null;
  const intakeDigest =
    input.intakeDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, intake }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EJ_OPERATION,
    planId,
    decision,
    changeId,
    intakeDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EJ_RECEIPT_KIND,
    receiptId,
    operation: EJ_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    intakeDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    intake,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    admissionHold: forceAdmissionHold(input.admissionHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyAdmissionControlIntakeReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EJ_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EJ_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EJ_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalAdmissionControlIntakeSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
