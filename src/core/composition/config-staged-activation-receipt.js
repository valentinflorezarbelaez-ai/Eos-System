/**
 * @module config-staged-activation-receipt
 * SPEC-0153 / Mission EQ — Config Change / Staged Activation Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     activationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   activation,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35ReopenRefused, l36ReopenRefused,
 *                   l37AutoCloseRefused,
 *                   remoteConfigPushRefused, wallClockAuthorityRefused,
 *                   liveUnsupervisedMutationRefused, tipRefreshAuthorityRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   activationHold { hermeticInMemoryOnly: true, failClosed: true,
 *                remoteConfigPushRefused: true, wallClockAuthorityRefused: true,
 *                liveUnsupervisedMutationRefused: true, tipRefreshAuthorityRefused: true,
 *                tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true,
 *                distinctFromEoFeatureFlag: true,
 *                distinctFromEpPolicyPackBinding: true,
 *                distinctFromDxCircuitBreaker: true,
 *                distinctFromEjAdmission: true,
 *                distinctFromEkBackpressure: true,
 *                distinctFromEgScheduleWake: true,
 *                distinctFromEhTemporalHonesty: true }
 *
 * Freeze soft-observe pin is `748000c3` (EP #508 merge / current EXPECTED_TIP after tip-refresh #509).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EO feature-flag toggle, EP policy-pack binding, EJ admission,
 * EK backpressure, EG schedule wake, EH temporal honesty.
 * Fold emergency-override narrowly into fail-closed staged activation —
 * do NOT reopen FDIR/DX as the axis.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed staged-activation receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live unsupervised mutation ≠ wall-clock authority ≠ remote config push
 * ≠ EO flag port ≠ EP pack port
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EQ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EQ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EQ_RECEIPT_KIND = 'eos-config-staged-activation-receipt';
export const EQ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EQ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EQ_OPERATION = 'CONFIG_STAGED_ACTIVATION_GOVERNANCE';
export const EQ_STAGE_STATES = Object.freeze([
  'STAGED',
  'CANARY',
  'FULL',
  'HOLD',
  'ROLLBACK_HOLD'
]);

export const EQ_FREEZE_PIN = '748000c3b241e03b316679a97b18c0121b3678d4';
export const EQ_FREEZE_PIN_SHORT = '748000c3';

export const EQ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Config Change / Staged Activation Governance ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live unsupervised mutation',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 auto-close refused (ER–ES pending)',
  'NON-CLAIM: Live unsupervised mutation / wall-clock authority / remote config push refused',
  'NON-CLAIM: Tip-refresh authority refused (tip-refresh post-EQ is SEPARATE)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EO feature-flag toggle — staged activation governance only',
  'NON-CLAIM: Distinct from EP policy-pack binding — staged activation ≠ pack bind+evaluate',
  'NON-CLAIM: Distinct from EJ/EK admission/backpressure, EG schedule wake, EH temporal honesty',
  'NON-CLAIM: Fold emergency-override narrowly; do NOT reopen FDIR/DX as axis',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed staged-activation ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EQ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EQ_ACTIVATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  remoteConfigPushRefused: true,
  wallClockAuthorityRefused: true,
  liveUnsupervisedMutationRefused: true,
  tipRefreshAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  distinctFromEoFeatureFlag: true,
  distinctFromEpPolicyPackBinding: true,
  distinctFromDxCircuitBreaker: true,
  distinctFromEjAdmission: true,
  distinctFromEkBackpressure: true,
  distinctFromEgScheduleWake: true,
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
    pin: EQ_FREEZE_PIN,
    pinShort: EQ_FREEZE_PIN_SHORT,
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
    remoteConfigPushRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EQ_FREEZE_NONCLAIM_LABELS,
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

export function forceActivationHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    remoteConfigPushRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    distinctFromEoFeatureFlag: true,
    distinctFromEpPolicyPackBinding: true,
    distinctFromDxCircuitBreaker: true,
    distinctFromEjAdmission: true,
    distinctFromEkBackpressure: true,
    distinctFromEgScheduleWake: true,
    distinctFromEhTemporalHonesty: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalConfigStagedActivationSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    activationDigest: receipt.activationDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Config Change / Staged Activation Governance Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildConfigStagedActivationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EQ-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-eq-default');
  const changeId = String(input.changeId || 'eos-ladder-37-mission-eq');
  const decision = EQ_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EQ_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const activation = input.activation || null;
  const activationDigest =
    input.activationDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, activation }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EQ_OPERATION,
    planId,
    decision,
    changeId,
    activationDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EQ_RECEIPT_KIND,
    receiptId,
    operation: EQ_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    activationDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    activation,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    activationHold: forceActivationHold(input.activationHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyConfigStagedActivationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EQ_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EQ_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EQ_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalConfigStagedActivationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
