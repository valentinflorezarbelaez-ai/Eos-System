/**
 * @module config-honesty-attestation-receipt
 * SPEC-0154 / Mission ER — Config Honesty & Flag Attestation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     attestationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   attestation,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l36ReopenRefused, l37AutoCloseRefused,
 *                   liveFlagStoreClaimRefused, wallClockAuthorityRefused,
 *                   liveUnsupervisedMutationRefused, tipRefreshAuthorityRefused,
 *                   schemaJsonAddRefused, softObserveAloneNotConfigTruth,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   attestationHold { hermeticInMemoryOnly: true, failClosed: true,
 *                     liveFlagStoreClaimRefused: true, wallClockAuthorityRefused: true,
 *                     liveUnsupervisedMutationRefused: true, tipRefreshAuthorityRefused: true,
 *                     tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                     productionReadyFlipRefused: true, governedSealOnly: true,
 *                     softObserveAloneNotConfigTruth: true,
 *                     distinctFromEoFeatureFlag: true,
 *                     distinctFromEpPolicyPackBinding: true,
 *                     distinctFromEqStagedActivation: true,
 *                     distinctFromEmCapacityHonesty: true,
 *                     distinctFromEhTemporalHonesty: true }
 *
 * Freeze soft-observe pin is `7ee4bd49` (EQ #510 merge / current EXPECTED_TIP after tip-refresh #511).
 * Soft-observe of freeze pins alone is NOT config truth (mirror EM vs soft-observe for capacity;
 * mirror EH vs soft-observe for temporal). Soft-observe pinShort only — do NOT rewrite tip pins.
 * Distinct from EO (flag toggle), EP (pack binding), EQ (staged activation), EM (capacity honesty),
 * EH (temporal honesty). Attestation only — does not flip flags or activate config.
 *
 * PRODUCTION_READY: NO
 * PASS = hermetic config/flag honesty attestation ≠ live flag store ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ EO toggle ≠ EP pack ≠ EQ staged activation ≠ EM capacity ≠ EH temporal
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const ER_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const ER_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const ER_RECEIPT_KIND = 'eos-config-honesty-attestation-receipt';
export const ER_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const ER_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const ER_SUBJECT_KINDS = Object.freeze([
  'FEATURE_FLAG',
  'POLICY_PACK',
  'STAGED_ACTIVATION',
  'COMPOSITE'
]);
export const ER_OPERATION = 'CONFIG_HONESTY_FLAG_ATTESTATION';

export const ER_FREEZE_PIN = '7ee4bd4963ad1e3f42b165079383c45a31c0811c';
export const ER_FREEZE_PIN_SHORT = '7ee4bd49';

export const ER_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Config Honesty & Flag Attestation ≠ PRODUCTION_READY flip ≠ live flag store authority ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 auto-close refused (ES pending)',
  'NON-CLAIM: Live remote flag store / wall-clock authority / unsupervised mutation refused',
  'NON-CLAIM: Tip-refresh authority refused (tip-refresh post-ER is SEPARATE)',
  'NON-CLAIM: Soft-observe freeze pins alone ≠ config truth',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EO feature-flag toggle — attestation only (does not flip flags)',
  'NON-CLAIM: Distinct from EP policy-pack binding — attestation only',
  'NON-CLAIM: Distinct from EQ staged activation — attestation only (does not activate config)',
  'NON-CLAIM: Distinct from EM capacity honesty — config/flag axis',
  'NON-CLAIM: Distinct from EH temporal honesty — config/flag axis',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = hermetic config/flag honesty attestation ≠ live flag store ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const ER_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const ER_ATTESTATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveFlagStoreClaimRefused: true,
  wallClockAuthorityRefused: true,
  liveUnsupervisedMutationRefused: true,
  tipRefreshAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  productionReadyFlipRefused: true,
  governedSealOnly: true,
  softObserveAloneNotConfigTruth: true,
  distinctFromEoFeatureFlag: true,
  distinctFromEpPolicyPackBinding: true,
  distinctFromEqStagedActivation: true,
  distinctFromEmCapacityHonesty: true,
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
    pin: ER_FREEZE_PIN,
    pinShort: ER_FREEZE_PIN_SHORT,
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
    liveFlagStoreClaimRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    schemaJsonAddRefused: true,
    softObserveAloneNotConfigTruth: true,
    readOnly: true,
    nonClaimLabels: ER_FREEZE_NONCLAIM_LABELS,
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

export function forceAttestationHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveFlagStoreClaimRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    productionReadyFlipRefused: true,
    governedSealOnly: true,
    softObserveAloneNotConfigTruth: true,
    distinctFromEoFeatureFlag: true,
    distinctFromEpPolicyPackBinding: true,
    distinctFromEqStagedActivation: true,
    distinctFromEmCapacityHonesty: true,
    distinctFromEhTemporalHonesty: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalConfigHonestyAttestationSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    attestationDigest: receipt.attestationDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Config Honesty & Flag Attestation Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildConfigHonestyAttestationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `ER-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-er-default');
  const changeId = String(input.changeId || 'eos-ladder-37-mission-er');
  const decision = ER_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = ER_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const attestation = input.attestation || null;
  const attestationDigest =
    input.attestationDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, attestation }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: ER_OPERATION,
    planId,
    decision,
    changeId,
    attestationDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: ER_RECEIPT_KIND,
    receiptId,
    operation: ER_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    attestationDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    attestation,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    attestationHold: forceAttestationHold(input.attestationHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyConfigHonestyAttestationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== ER_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${ER_RECEIPT_KIND}` };
  }
  if (receipt.operation !== ER_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalConfigHonestyAttestationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
