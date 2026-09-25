/**
 * @module feature-flag-runtime-toggle-receipt
 * SPEC-0151 / Mission EO — Sovereign Feature-Flag & Runtime Toggle Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     toggleDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   toggle,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35ReopenRefused, l36ReopenRefused,
 *                   l37AutoCloseRefused,
 *                   remoteConfigSdkRefused, wallClockRolloutAuthorityRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   toggleHold { hermeticInMemoryOnly: true, failClosed: true,
 *                remoteConfigSdkRefused: true, wallClockRolloutAuthorityRefused: true,
 *                tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true,
 *                distinctFromSentinelKillswitch: true,
 *                distinctFromFdirTrip: true,
 *                distinctFromEjAdmission: true,
 *                distinctFromEhTemporalHonesty: true }
 *
 * Freeze soft-observe pin is `f333afaf` (L37 tip-open / tip-refresh #505 pin).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from sentinel-killswitch / FDIR trip (fold killswitch concerns into
 * fail-closed toggle governance, but do NOT reopen FDIR as the axis).
 * Distinct from EJ/EK/EL/EM (admission/backpressure) and EH (temporal honesty).
 *
 * PRODUCTION_READY: NO
 * PASS = sealed feature-flag/toggle receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live remote config SDK ≠ wall-clock rollout authority ≠ killswitch port
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EO_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EO_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EO_RECEIPT_KIND = 'eos-feature-flag-runtime-toggle-receipt';
export const EO_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EO_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EO_OPERATION = 'FEATURE_FLAG_RUNTIME_TOGGLE_GOVERNANCE';
export const EO_FLAG_STATES = Object.freeze(['ON', 'OFF', 'HOLD']);

export const EO_FREEZE_PIN = 'f333afaf0c2e0bb22a1bb2eacc5e718f1bde768e';
export const EO_FREEZE_PIN_SHORT = 'f333afaf';

export const EO_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Feature-Flag & Runtime Toggle Governance ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live remote config SDK',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 auto-close refused (EP–ES pending)',
  'NON-CLAIM: Live remote config SDK / wall-clock rollout authority refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from sentinel-killswitch / FDIR trip — fail-closed toggle governance only',
  'NON-CLAIM: Distinct from EJ/EK/EL/EM admission/backpressure and EH temporal honesty',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed feature-flag/toggle ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EO_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EO_TOGGLE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  remoteConfigSdkRefused: true,
  wallClockRolloutAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  distinctFromSentinelKillswitch: true,
  distinctFromFdirTrip: true,
  distinctFromEjAdmission: true,
  distinctFromEhTemporalHonesty: true
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
    pin: EO_FREEZE_PIN,
    pinShort: EO_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36ReopenRefused: true,
    l37AutoCloseRefused: true,
    remoteConfigSdkRefused: true,
    wallClockRolloutAuthorityRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EO_FREEZE_NONCLAIM_LABELS,
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

export function forceToggleHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    remoteConfigSdkRefused: true,
    wallClockRolloutAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    distinctFromSentinelKillswitch: true,
    distinctFromFdirTrip: true,
    distinctFromEjAdmission: true,
    distinctFromEhTemporalHonesty: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalFeatureFlagRuntimeToggleSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    toggleDigest: receipt.toggleDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Feature-Flag & Runtime Toggle Governance Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildFeatureFlagRuntimeToggleReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EO-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-eo-default');
  const changeId = String(input.changeId || 'eos-ladder-37-mission-eo');
  const decision = EO_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EO_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const toggle = input.toggle || null;
  const toggleDigest =
    input.toggleDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, toggle }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EO_OPERATION,
    planId,
    decision,
    changeId,
    toggleDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EO_RECEIPT_KIND,
    receiptId,
    operation: EO_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    toggleDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    toggle,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    toggleHold: forceToggleHold(input.toggleHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyFeatureFlagRuntimeToggleReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EO_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EO_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EO_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalFeatureFlagRuntimeToggleSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
