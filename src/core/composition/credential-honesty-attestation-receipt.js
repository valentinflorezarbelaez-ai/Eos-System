/**
 * @module credential-honesty-attestation-receipt
 * SPEC-0159 / Mission EW — Credential Honesty & Handle Attestation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     attestationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   attestation,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l37ReopenRefused,
 *                   l38AutoCloseRefused,
 *                   liveSecretStoreClaimRefused, wallClockAuthorityRefused,
 *                   liveUnsupervisedMutationRefused, tipRefreshAuthorityRefused,
 *                   rawSecretMaterialRefused, vaultKmsRefused,
 *                   schemaJsonAddRefused, softObserveAloneNotHandleTruth,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   attestationHold { hermeticInMemoryOnly: true, failClosed: true,
 *                     liveSecretStoreClaimRefused: true, wallClockAuthorityRefused: true,
 *                     liveUnsupervisedMutationRefused: true, tipRefreshAuthorityRefused: true,
 *                     tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                     productionReadyFlipRefused: true, governedSealOnly: true,
 *                     softObserveAloneNotHandleTruth: true,
 *                     secretMaterialRefused: true, secretZeroHeld: true,
 *                     vaultKmsRefused: true, rawSecretMaterialRefused: true,
 *                     distinctFromEtCredentialHandleRegistry: true,
 *                     distinctFromEuSecretZeroLeakDeny: true,
 *                     distinctFromEvCredentialHandleLifecycle: true,
 *                     distinctFromErConfigHonesty: true,
 *                     distinctFromEmCapacityHonesty: true,
 *                     distinctFromEhTemporalHonesty: true,
 *                     distinctFromAuSecretRuntimeBroker: true }
 *
 * Freeze soft-observe pin is `376378be` (EV #525 merge / current EXPECTED_TIP after tip-refresh #526).
 * Soft-observe of freeze pins alone is NOT handle truth (mirror ER vs soft-observe for config;
 * mirror EM/EH vs soft-observe for capacity/temporal). Soft-observe pinShort only — do NOT rewrite tip pins.
 * Distinct from ET (bind), EU (leak-deny), EV (lifecycle), ER (config honesty), EM/EH, AU.
 * Attestation only — does not bind/rotate/revoke handles or mutate secret stores.
 *
 * PRODUCTION_READY: NO
 * PASS = hermetic credential-handle honesty attestation ≠ live secret store ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ ET bind ≠ EU leak-deny ≠ EV lifecycle ≠ ER config honesty
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EW_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EW_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EW_RECEIPT_KIND = 'eos-credential-honesty-attestation-receipt';
export const EW_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EW_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EW_SUBJECT_KINDS = Object.freeze([
  'CREDENTIAL_HANDLE',
  'HANDLE_BINDING',
  'HANDLE_LIFECYCLE',
  'COMPOSITE'
]);
export const EW_ATTESTATION_STAGES = Object.freeze([
  'BINDING_MATCH',
  'DIGEST_CONSISTENCY',
  'SECRET_REFUSED',
  'COMPOSITE'
]);
export const EW_OPERATION = 'CREDENTIAL_HONESTY_HANDLE_ATTESTATION';

export const EW_FREEZE_PIN = '376378be81cc7ad57a98268c455252267a878c05';
export const EW_FREEZE_PIN_SHORT = '376378be';

export const EW_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Credential Honesty & Handle Attestation ≠ PRODUCTION_READY flip ≠ live secret store authority ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 reopen refused',
  'NON-CLAIM: L38 auto-close refused (EX pending)',
  'NON-CLAIM: Live secret store / vault/KMS / wall-clock / tip-refresh authority refused',
  'NON-CLAIM: Raw secret material refused (Law VI — never seal secrets; opaque handleId + attestationDigest + stage/verdict only)',
  'NON-CLAIM: Soft-observe freeze pins alone ≠ handle truth',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from ET credential-handle registry — attestation only (does not bind)',
  'NON-CLAIM: Distinct from EU secret-zero leak-deny — attestation only',
  'NON-CLAIM: Distinct from EV credential-handle lifecycle — attestation only (does not rotate/revoke)',
  'NON-CLAIM: Distinct from ER config honesty — credential-handle axis',
  'NON-CLAIM: Distinct from EM capacity honesty — credential-handle axis',
  'NON-CLAIM: Distinct from EH temporal honesty — credential-handle axis',
  'NON-CLAIM: Distinct from AU secret-runtime-broker (fold concepts; do not reopen AU)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = hermetic credential-handle honesty attestation ≠ live secret store ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EW_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EW_ATTESTATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveSecretStoreClaimRefused: true,
  wallClockAuthorityRefused: true,
  liveUnsupervisedMutationRefused: true,
  tipRefreshAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  productionReadyFlipRefused: true,
  governedSealOnly: true,
  softObserveAloneNotHandleTruth: true,
  secretMaterialRefused: true,
  secretZeroHeld: true,
  vaultKmsRefused: true,
  rawSecretMaterialRefused: true,
  distinctFromEtCredentialHandleRegistry: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEvCredentialHandleLifecycle: true,
  distinctFromErConfigHonesty: true,
  distinctFromEmCapacityHonesty: true,
  distinctFromEhTemporalHonesty: true,
  distinctFromAuSecretRuntimeBroker: true
});

let _receiptSeq = 0;

export function _resetReceiptSeqForTests() {
  _receiptSeq = 0;
}

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Digests opaque handle attestation metadata only — never secret bytes (Law VI).
 * @param {{ handleId?: string, handleClass?: string, subjectKind?: string, attestationStage?: string, bindingMatch?: boolean, digestConsistent?: boolean }} meta
 */
export function computeAttestationDigest(meta = {}) {
  const opaqueOnly = {
    handleId: meta.handleId || null,
    handleClass: meta.handleClass || null,
    subjectKind: meta.subjectKind || null,
    attestationStage: meta.attestationStage || null,
    bindingMatch: meta.bindingMatch === undefined ? null : Boolean(meta.bindingMatch),
    digestConsistent: meta.digestConsistent === undefined ? null : Boolean(meta.digestConsistent)
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: EW_FREEZE_PIN,
    pinShort: EW_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36ReopenRefused: true,
    l37ReopenRefused: true,
    l38AutoCloseRefused: true,
    liveSecretStoreClaimRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    rawSecretMaterialRefused: true,
    vaultKmsRefused: true,
    schemaJsonAddRefused: true,
    softObserveAloneNotHandleTruth: true,
    readOnly: true,
    nonClaimLabels: EW_FREEZE_NONCLAIM_LABELS,
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
    liveSecretStoreClaimRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    productionReadyFlipRefused: true,
    governedSealOnly: true,
    softObserveAloneNotHandleTruth: true,
    secretMaterialRefused: true,
    secretZeroHeld: true,
    vaultKmsRefused: true,
    rawSecretMaterialRefused: true,
    distinctFromEtCredentialHandleRegistry: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEvCredentialHandleLifecycle: true,
    distinctFromErConfigHonesty: true,
    distinctFromEmCapacityHonesty: true,
    distinctFromEhTemporalHonesty: true,
    distinctFromAuSecretRuntimeBroker: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalCredentialHonestyAttestationSealBody(receipt) {
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
 * Builds a sealed Credential Honesty & Handle Attestation Receipt.
 * Never seals secret material — only opaque handleId / stage / digests (Law VI).
 * @param {object} input
 * @returns {object}
 */
export function buildCredentialHonestyAttestationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EW-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ew-default');
  const changeId = String(input.changeId || 'eos-ladder-38-mission-ew');
  const decision = EW_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EW_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const attestation = input.attestation || null;
  const attestationDigest =
    input.attestationDigest ||
    computeAttestationDigest({
      handleId: attestation?.handleId,
      handleClass: attestation?.handleClass,
      subjectKind: attestation?.subjectKind,
      attestationStage: attestation?.attestationStage,
      bindingMatch: attestation?.bindingMatch,
      digestConsistent: attestation?.digestConsistent
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EW_OPERATION,
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
    kind: EW_RECEIPT_KIND,
    receiptId,
    operation: EW_OPERATION,
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
export function verifyCredentialHonestyAttestationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EW_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EW_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EW_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalCredentialHonestyAttestationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

