/**
 * @module outbound-delivery-honesty-attestation-receipt
 * SPEC-0169 / Mission FG — Outbound Delivery Honesty & Attestation Receipt.
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
 *                   l38ReopenRefused,
 *                   liveOutboundDeliveryMutationRefused, wallClockAuthorityRefused,
 *                   liveUnsupervisedMutationRefused, tipRefreshAuthorityRefused,
 *                   rawCallbackSecretMaterialRefused, rawPayloadMaterialRefused,
 *                   schemaJsonAddRefused, softObserveAloneNotOutboundDeliveryTruth,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   attestationHold { hermeticInMemoryOnly: true, failClosed: true,
 *                     liveOutboundDeliveryMutationRefused: true, wallClockAuthorityRefused: true,
 *                     liveUnsupervisedMutationRefused: true, tipRefreshAuthorityRefused: true,
 *                     tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                     productionReadyFlipRefused: true, governedSealOnly: true,
 *                     softObserveAloneNotOutboundDeliveryTruth: true,
 *                     secretMaterialRefused: true, secretZeroHeld: true,
 *                     rawPayloadMaterialRefused: true, rawCallbackSecretMaterialRefused: true,
 *                     distinctFromFdOutboundDeliveryRegistry: true,
 *                     distinctFromEuSecretZeroLeakDeny: true,
 *                     distinctFromEvHandleLifecycle: true,
 *                     distinctFromErConfigHonesty: true,
 *                     distinctFromEmCapacityHonesty: true,
 *                     distinctFromEhTemporalHonesty: true,
 *                     distinctFromAuSecretRuntimeBroker: true }
 *
 * Freeze soft-observe pin is `a7c7df8f` (full `a7c7df8f04c52d081de21b61ffe6b1f699e614bc` — tip-refresh post-#555 / FF merge soft-observe).
 * Soft-observe of freeze pins alone is NOT outbound delivery honesty truth (mirror FB/EW/ER/EM/EH).
 * Soft-observe FD/FE/FF opaque deliveryId/targetId/authenticityRef/quarantine refs only — never secrets/raw payloads/callback bodies.
 * Soft-observe pinShort only — do NOT rewrite tip pins.
 * Distinct from FD (registry), FE (authenticity sign), FF (quarantine/retry-deny),
 * FB ingress honesty (inbound axis), EW/ER/EH/EM (other honesty axes), EU/EV/AU — fold concepts; do not reopen.
 * Attestation only — does not bind outbound delivery, sign/verify callback authenticity, or quarantine/retry-deny.
 *
 * PRODUCTION_READY: NO
 * PASS = hermetic outbound delivery honesty attestation ≠ live outbound delivery mutation ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/FF ≠ FB/ER/EH/EM
 * ≠ FD/FE/FF product ≠ FB/ER/EH/EM honesty axes
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FG_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FG_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FG_RECEIPT_KIND = 'eos-outbound-delivery-honesty-attestation-receipt';
export const FG_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FG_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FG_SUBJECT_KINDS = Object.freeze([
  'OUTBOUND_DELIVERY',
  'DELIVERY_BINDING',
  'CALLBACK_AUTHENTICITY',
  'QUARANTINE_CONSISTENCY',
  'COMPOSITE'
]);
export const FG_ATTESTATION_STAGES = Object.freeze([
  'BINDING_MATCH',
  'AUTHENTICITY_MATCH',
  'DIGEST_CONSISTENCY',
  'SECRET_REFUSED',
  'COMPOSITE'
]);
export const FG_OPERATION = 'OUTBOUND_DELIVERY_HONESTY_ATTESTATION';

export const FG_FREEZE_PIN = 'a7c7df8f04c52d081de21b61ffe6b1f699e614bc';
export const FG_FREEZE_PIN_SHORT = 'a7c7df8f';

export const FG_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Outbound Delivery Honesty & Receipt Attestation ≠ PRODUCTION_READY flip ≠ live outbound delivery mutation ≠ tip-refresh',
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
  'NON-CLAIM: L38 reopen refused',
  'NON-CLAIM: L39 reopen refused',
  'NON-CLAIM: L40 auto-close refused (FH pending)',
  'NON-CLAIM: Live outbound delivery mutation / live HTTP egress endpoint / wall-clock / tip-refresh authority refused',
  'NON-CLAIM: Raw callback secret / HMAC key / raw payload material refused (Law VI — never seal secrets; opaque deliveryId/targetId/authenticityRef + attestationDigest + stage/verdict only)',
  'NON-CLAIM: Soft-observe freeze pins alone ≠ outbound delivery honesty truth',
  'NON-CLAIM: Soft-observe FD/FE/FF opaque ids only — never secrets/raw payloads/callback bodies',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from FD outbound delivery registry — attestation only (does not bind)',
  'NON-CLAIM: Distinct from FE outbound callback authenticity — attestation only (does not sign/verify)',
  'NON-CLAIM: Distinct from FF outbound delivery quarantine/retry-deny — attestation only',
  'NON-CLAIM: Distinct from FB ingress honesty — outbound axis (fold concepts; do not reopen FB)',
  'NON-CLAIM: Distinct from EW credential honesty / ER config honesty / EM capacity honesty / EH temporal honesty',
  'NON-CLAIM: Distinct from EU secret-zero / EV handle lifecycle / AU secret-runtime-broker (fold; do not reopen)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = hermetic outbound delivery honesty attestation ≠ live outbound delivery mutation ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FG_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FG_ATTESTATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveOutboundDeliveryMutationRefused: true,
  liveHttpEgressEndpointRefused: true,
  wallClockAuthorityRefused: true,
  tipRefreshAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  productionReadyFlipRefused: true,
  governedSealOnly: true,
  softObserveAloneNotOutboundDeliveryTruth: true,
  secretMaterialRefused: true,
  secretZeroHeld: true,
  rawCallbackSecretMaterialRefused: true,
  rawPayloadMaterialRefused: true,
  distinctFromFdOutboundDeliveryRegistry: true,
  distinctFromFeOutboundCallbackAuthenticity: true,
  distinctFromFfOutboundDeliveryQuarantine: true,
  distinctFromFbIngressHonesty: true,
  distinctFromEwCredentialHonesty: true,
  distinctFromErConfigHonesty: true,
  distinctFromEmCapacityHonesty: true,
  distinctFromEhTemporalHonesty: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEvHandleLifecycle: true,
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
 * Digests opaque outbound delivery honesty attestation metadata only — never secrets / callback bodies / HMAC keys (Law VI).
 * Soft-observe FD/FE/FF opaque deliveryId/targetId/authenticityRef/quarantineRef refs only.
 * @param {{ deliveryId?: string, targetId?: string, authenticityRef?: string, quarantineRef?: string, subjectKind?: string, attestationStage?: string, bindingMatch?: boolean, digestConsistent?: boolean }} meta
 */
export function computeAttestationDigest(meta = {}) {
  const opaqueOnly = {
    deliveryId: meta.deliveryId || null,
    targetId: meta.targetId || null,
    authenticityRef: meta.authenticityRef || null,
    quarantineRef: meta.quarantineRef || null,
    subjectKind: meta.subjectKind || null,
    attestationStage: meta.attestationStage || null,
    bindingMatch: meta.bindingMatch === undefined ? null : Boolean(meta.bindingMatch),
    digestConsistent: meta.digestConsistent === undefined ? null : Boolean(meta.digestConsistent)
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FG_FREEZE_PIN,
    pinShort: FG_FREEZE_PIN_SHORT,
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
    l38ReopenRefused: true,
    l39ReopenRefused: true,
    l40AutoCloseRefused: true,
    liveOutboundDeliveryMutationRefused: true,
    liveHttpEgressEndpointRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCallbackSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    schemaJsonAddRefused: true,
    softObserveAloneNotOutboundDeliveryTruth: true,
    readOnly: true,
    nonClaimLabels: FG_FREEZE_NONCLAIM_LABELS,
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
    liveOutboundDeliveryMutationRefused: true,
    liveHttpEgressEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    productionReadyFlipRefused: true,
    governedSealOnly: true,
    softObserveAloneNotOutboundDeliveryTruth: true,
    secretMaterialRefused: true,
    secretZeroHeld: true,
    rawCallbackSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    distinctFromFdOutboundDeliveryRegistry: true,
    distinctFromFeOutboundCallbackAuthenticity: true,
    distinctFromFfOutboundDeliveryQuarantine: true,
    distinctFromFbIngressHonesty: true,
    distinctFromErConfigHonesty: true,
    distinctFromEmCapacityHonesty: true,
    distinctFromEhTemporalHonesty: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEvHandleLifecycle: true,
    distinctFromAuSecretRuntimeBroker: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalOutboundDeliveryHonestyAttestationSealBody(receipt) {
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
 * Builds a sealed Outbound Delivery Honesty & Handle Attestation Receipt.
 * Never seals secret material — only opaque authenticityRef / stage / digests (Law VI).
 * @param {object} input
 * @returns {object}
 */
export function buildOutboundDeliveryHonestyAttestationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FG-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fg-default');
  const changeId = String(input.changeId || 'eos-ladder-40-mission-fg');
  const decision = FG_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FG_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const attestation = input.attestation || null;
  const attestationDigest =
    input.attestationDigest ||
    computeAttestationDigest({
      deliveryId: attestation?.deliveryId,
      targetId: attestation?.targetId,
      authenticityRef: attestation?.authenticityRef,
      quarantineRef: attestation?.quarantineRef,
      subjectKind: attestation?.subjectKind,
      attestationStage: attestation?.attestationStage,
      bindingMatch: attestation?.bindingMatch,
      digestConsistent: attestation?.digestConsistent
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FG_OPERATION,
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
    kind: FG_RECEIPT_KIND,
    receiptId,
    operation: FG_OPERATION,
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
export function verifyOutboundDeliveryHonestyAttestationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FG_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FG_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FG_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalOutboundDeliveryHonestyAttestationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

