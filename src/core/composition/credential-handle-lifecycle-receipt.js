/**
 * @module credential-handle-lifecycle-receipt
 * SPEC-0158 / Mission EV — Credential Handle Lifecycle / Rotation Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     lifecycleDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   lifecycle,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l37ReopenRefused,
 *                   l38AutoCloseRefused,
 *                   liveSecretMutationRefused, liveSecretStoreRefused,
 *                   wallClockAuthorityRefused, tipRefreshAuthorityRefused,
 *                   rawSecretMaterialRefused, vaultKmsRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   lifecycleHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveSecretMutationRefused: true, liveSecretStoreRefused: true,
 *                wallClockAuthorityRefused: true, tipRewriteRefused: true,
 *                tipRefreshAuthorityRefused: true, rawSecretMaterialRefused: true,
 *                vaultKmsRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, secretMaterialRefused: true,
 *                secretZeroHeld: true,
 *                distinctFromEtCredentialHandleRegistry: true,
 *                distinctFromEuSecretZeroLeakDeny: true,
 *                distinctFromEqStagedActivation: true,
 *                distinctFromEoFeatureFlag: true,
 *                distinctFromEpPolicyPack: true,
 *                distinctFromErConfigHonesty: true,
 *                distinctFromAuSecretRuntimeBroker: true }
 *
 * Freeze soft-observe pin is `0eace5df` (EU #523 / current EXPECTED_TIP after tip-refresh #524). Soft-observe only.
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from ET bind, EU leak-deny, EQ config staged activation (config ≠ credential handle lifecycle).
 * EV rotates opaque handles — never plaintext credentials, never vault/KMS mutation.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed credential-handle lifecycle ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live secret mutation ≠ wall-clock authority ≠ ET/EU/EQ ports
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EV_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EV_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EV_RECEIPT_KIND = 'eos-credential-handle-lifecycle-receipt';
export const EV_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EV_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EV_OPERATION = 'CREDENTIAL_HANDLE_LIFECYCLE_ROTATION';
export const EV_STAGE_STATES = Object.freeze([
  'STAGED_ROTATE',
  'ROTATE',
  'REVOKE',
  'HOLD',
  'ROLLBACK_HOLD'
]);

export const EV_FREEZE_PIN = '0eace5df332026098a0eb153c746535e961f09cf';
export const EV_FREEZE_PIN_SHORT = '0eace5df';

export const EV_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Credential Handle Lifecycle / Rotation ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live secret mutation',
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
  'NON-CLAIM: L38 auto-close refused (EW–EX pending)',
  'NON-CLAIM: Live secret mutation / vault/KMS / wall-clock / tip-refresh authority refused',
  'NON-CLAIM: Raw secret material refused (Law VI — never seal secrets; opaque handleId + lifecycleDigest + stage only)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from ET credential-handle registry (bind ≠ lifecycle rotate)',
  'NON-CLAIM: Distinct from EU secret-zero leak-deny (leak-deny ≠ lifecycle rotate)',
  'NON-CLAIM: Distinct from EQ config staged activation (config packs ≠ credential handle lifecycle)',
  'NON-CLAIM: Distinct from EO/EP/ER and AU secret-runtime-broker',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed handle lifecycle ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EV_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EV_LIFECYCLE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveSecretMutationRefused: true,
  liveSecretStoreRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawSecretMaterialRefused: true,
  vaultKmsRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  secretMaterialRefused: true,
  secretZeroHeld: true,
  distinctFromEtCredentialHandleRegistry: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEqStagedActivation: true,
  distinctFromEoFeatureFlag: true,
  distinctFromEpPolicyPack: true,
  distinctFromErConfigHonesty: true,
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
 * Digests opaque handle lifecycle metadata only — never secret bytes (Law VI).
 * @param {{ handleId?: string, handleClass?: string, desiredStage?: string, observedLifecycle?: string }} meta
 */
export function computeLifecycleDigest(meta = {}) {
  const opaqueOnly = {
    handleId: meta.handleId || null,
    handleClass: meta.handleClass || null,
    desiredStage: meta.desiredStage || null,
    observedLifecycle: meta.observedLifecycle || null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: EV_FREEZE_PIN,
    pinShort: EV_FREEZE_PIN_SHORT,
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
    liveSecretMutationRefused: true,
    liveSecretStoreRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawSecretMaterialRefused: true,
    vaultKmsRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EV_FREEZE_NONCLAIM_LABELS,
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

export function forceLifecycleHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveSecretMutationRefused: true,
    liveSecretStoreRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawSecretMaterialRefused: true,
    vaultKmsRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    secretMaterialRefused: true,
    secretZeroHeld: true,
    distinctFromEtCredentialHandleRegistry: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEqStagedActivation: true,
    distinctFromEoFeatureFlag: true,
    distinctFromEpPolicyPack: true,
    distinctFromErConfigHonesty: true,
    distinctFromAuSecretRuntimeBroker: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalCredentialHandleLifecycleSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    lifecycleDigest: receipt.lifecycleDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Credential Handle Lifecycle Receipt.
 * Never seals secret material — only opaque handleId / stage / digests (Law VI).
 * @param {object} input
 * @returns {object}
 */
export function buildCredentialHandleLifecycleReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EV-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ev-default');
  const changeId = String(input.changeId || 'eos-ladder-38-mission-ev');
  const decision = EV_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EV_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const lifecycle = input.lifecycle || null;
  const lifecycleDigest =
    input.lifecycleDigest ||
    computeLifecycleDigest({
      handleId: lifecycle?.handleId,
      handleClass: lifecycle?.handleClass,
      desiredStage: lifecycle?.desiredStage,
      observedLifecycle: lifecycle?.observedLifecycle
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EV_OPERATION,
    planId,
    decision,
    changeId,
    lifecycleDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EV_RECEIPT_KIND,
    receiptId,
    operation: EV_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    lifecycleDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    lifecycle,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    lifecycleHold: forceLifecycleHold(input.lifecycleHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyCredentialHandleLifecycleReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EV_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EV_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EV_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalCredentialHandleLifecycleSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
