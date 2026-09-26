/**
 * @module credential-handle-registry-receipt
 * SPEC-0156 / Mission ET — Sovereign Credential-Handle Registry & Binding Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     handleDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   binding,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l37ReopenRefused,
 *                   l38AutoCloseRefused,
 *                   liveSecretStoreRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   handleHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveSecretStoreRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, secretMaterialRefused: true,
 *                secretZeroHeld: true,
 *                distinctFromEoFeatureFlag: true,
 *                distinctFromEpPolicyPack: true,
 *                distinctFromEqStagedActivation: true,
 *                distinctFromErConfigHonesty: true,
 *                distinctFromAuSecretRuntimeBroker: true }
 *
 * Freeze soft-observe pin is `2b747fb0` (tip-open #519 / post tip-refresh #520 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EO feature-flag, EP policy-pack, EQ staged activation, ER config honesty.
 * Distinct from Mission AU src/core/secrets/* (runtime broker ≠ composition port).
 * Fold AU concepts into semantics; do NOT reopen AU or copy secret material into receipts.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed credential-handle registry binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live secret store ≠ wall-clock authority ≠ EO/EP/EQ/ER/AU ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const ET_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const ET_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const ET_RECEIPT_KIND = 'eos-credential-handle-registry-receipt';
export const ET_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const ET_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const ET_OPERATION = 'CREDENTIAL_HANDLE_REGISTRY_BINDING';
export const ET_BINDING_STATES = Object.freeze(['BOUND', 'UNBOUND', 'HOLD']);

export const ET_FREEZE_PIN = '2b747fb0b86b14ac8c03e57a60fda392e383ba55';
export const ET_FREEZE_PIN_SHORT = '2b747fb0';

export const ET_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Credential-Handle Registry & Binding ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live secret store',
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
  'NON-CLAIM: L38 auto-close refused (EU–EX pending)',
  'NON-CLAIM: Live secret store / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw secret material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EO feature-flag / EP policy-pack / EQ staged activation / ER config honesty',
  'NON-CLAIM: Distinct from AU secret-runtime-broker (runtime ≠ composition port)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed credential-handle binding ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const ET_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const ET_HANDLE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveSecretStoreRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  secretMaterialRefused: true,
  secretZeroHeld: true,
  distinctFromEoFeatureFlag: true,
  distinctFromEpPolicyPack: true,
  distinctFromEqStagedActivation: true,
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
 * Digests opaque handle metadata only — never secret bytes (Law VI).
 * @param {{ handleId?: string, handleClass?: string, desiredBinding?: string, observedBinding?: string, bindingClass?: string }} meta
 */
export function computeHandleDigest(meta = {}) {
  const opaqueOnly = {
    handleId: meta.handleId || null,
    handleClass: meta.handleClass || null,
    bindingClass: meta.bindingClass || null,
    desiredBinding: meta.desiredBinding || null,
    observedBinding: meta.observedBinding ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: ET_FREEZE_PIN,
    pinShort: ET_FREEZE_PIN_SHORT,
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
    liveSecretStoreRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: ET_FREEZE_NONCLAIM_LABELS,
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

export function forceHandleHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveSecretStoreRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    secretMaterialRefused: true,
    secretZeroHeld: true,
    distinctFromEoFeatureFlag: true,
    distinctFromEpPolicyPack: true,
    distinctFromEqStagedActivation: true,
    distinctFromErConfigHonesty: true,
    distinctFromAuSecretRuntimeBroker: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalCredentialHandleRegistrySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    handleDigest: receipt.handleDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Credential-Handle Registry & Binding Receipt.
 * Never seals secret material — only opaque handleId / handleClass / bindingClass / digests.
 * @param {object} input
 * @returns {object}
 */
export function buildCredentialHandleRegistryReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `ET-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-et-default');
  const changeId = String(input.changeId || 'eos-ladder-38-mission-et');
  const decision = ET_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = ET_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const binding = input.binding || null;
  const handleDigest =
    input.handleDigest ||
    computeHandleDigest({
      handleId: binding?.handleId,
      handleClass: binding?.handleClass,
      bindingClass: binding?.bindingClass,
      desiredBinding: binding?.desiredBinding,
      observedBinding: binding?.observedBinding
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: ET_OPERATION,
    planId,
    decision,
    changeId,
    handleDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: ET_RECEIPT_KIND,
    receiptId,
    operation: ET_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    handleDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    binding,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    handleHold: forceHandleHold(input.handleHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyCredentialHandleRegistryReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== ET_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${ET_RECEIPT_KIND}` };
  }
  if (receipt.operation !== ET_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalCredentialHandleRegistrySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
