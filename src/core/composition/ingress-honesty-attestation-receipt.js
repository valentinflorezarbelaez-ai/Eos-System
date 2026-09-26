/**
 * @module ingress-honesty-attestation-receipt
 * SPEC-0164 / Mission FB — External Event Ingress Honesty & Attestation Receipt.
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
 *                   liveIngressMutationRefused, wallClockAuthorityRefused,
 *                   liveUnsupervisedMutationRefused, tipRefreshAuthorityRefused,
 *                   rawWebhookSecretMaterialRefused, rawPayloadMaterialRefused,
 *                   schemaJsonAddRefused, softObserveAloneNotIngressTruth,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   attestationHold { hermeticInMemoryOnly: true, failClosed: true,
 *                     liveIngressMutationRefused: true, wallClockAuthorityRefused: true,
 *                     liveUnsupervisedMutationRefused: true, tipRefreshAuthorityRefused: true,
 *                     tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                     productionReadyFlipRefused: true, governedSealOnly: true,
 *                     softObserveAloneNotIngressTruth: true,
 *                     secretMaterialRefused: true, secretZeroHeld: true,
 *                     rawPayloadMaterialRefused: true, rawWebhookSecretMaterialRefused: true,
 *                     distinctFromEtCredentialHandleRegistry: true,
 *                     distinctFromEuSecretZeroLeakDeny: true,
 *                     distinctFromEvCredentialHandleLifecycle: true,
 *                     distinctFromErConfigHonesty: true,
 *                     distinctFromEmCapacityHonesty: true,
 *                     distinctFromEhTemporalHonesty: true,
 *                     distinctFromAuSecretRuntimeBroker: true }
 *
 * Freeze soft-observe pin is `57edb92e` (full `57edb92e5e64d0c3c5a0f6a2e38def02f80746e0` — tip-refresh post-#540 / FA merge soft-observe).
 * Soft-observe of freeze pins alone is NOT ingress honesty truth (mirror EW/ER/EM/EH).
 * Soft-observe EY/EZ/FA opaque ingressId/sourceId/handleId refs only — never secrets/raw payloads.
 * Soft-observe pinShort only — do NOT rewrite tip pins.
 * Distinct from EY (registry), EZ (authenticity verify), FA (quarantine/replay-deny),
 * EW/ER/EH/EM (other honesty axes), EU/EV/AU — fold concepts; do not reopen.
 * Attestation only — does not bind ingress, verify HMAC, or quarantine/replay-deny.
 *
 * PRODUCTION_READY: NO
 * PASS = hermetic ingress honesty attestation ≠ live ingress mutation ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/FA ≠ EW/ER/EH/EM
 * ≠ EY/EZ/FA product ≠ EW/ER/EH/EM honesty axes
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FB_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FB_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FB_RECEIPT_KIND = 'eos-ingress-honesty-attestation-receipt';
export const FB_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FB_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FB_SUBJECT_KINDS = Object.freeze([
  'EXTERNAL_EVENT_INGRESS',
  'INGRESS_BINDING',
  'WEBHOOK_AUTHENTICITY',
  'QUARANTINE_CONSISTENCY',
  'COMPOSITE'
]);
export const FB_ATTESTATION_STAGES = Object.freeze([
  'BINDING_MATCH',
  'AUTHENTICITY_MATCH',
  'DIGEST_CONSISTENCY',
  'SECRET_REFUSED',
  'COMPOSITE'
]);
export const FB_OPERATION = 'INGRESS_HONESTY_ATTESTATION';

export const FB_FREEZE_PIN = '57edb92e5e64d0c3c5a0f6a2e38def02f80746e0';
export const FB_FREEZE_PIN_SHORT = '57edb92e';

export const FB_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ingress Honesty & Attestation ≠ PRODUCTION_READY flip ≠ live ingress mutation ≠ tip-refresh',
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
  'NON-CLAIM: L39 auto-close refused (FC pending)',
  'NON-CLAIM: Live ingress mutation / live webhook ingress endpoint / wall-clock / tip-refresh authority refused',
  'NON-CLAIM: Raw webhook secret / HMAC key / raw payload material refused (Law VI — never seal secrets; opaque ingressId/sourceId/handleId + attestationDigest + stage/verdict only)',
  'NON-CLAIM: Soft-observe freeze pins alone ≠ ingress honesty truth',
  'NON-CLAIM: Soft-observe EY/EZ/FA opaque ids only — never secrets/raw payloads',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EY ingress registry — attestation only (does not bind)',
  'NON-CLAIM: Distinct from EZ webhook authenticity — attestation only (does not verify HMAC)',
  'NON-CLAIM: Distinct from FA ingress quarantine/replay-deny — attestation only',
  'NON-CLAIM: Distinct from EW credential honesty — ingress axis (fold concepts; do not reopen EW)',
  'NON-CLAIM: Distinct from ER config honesty — ingress axis',
  'NON-CLAIM: Distinct from EM capacity honesty — ingress axis',
  'NON-CLAIM: Distinct from EH temporal honesty — ingress axis',
  'NON-CLAIM: Distinct from EU secret-zero / EV handle lifecycle / AU secret-runtime-broker (fold; do not reopen)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = hermetic ingress honesty attestation ≠ live ingress mutation ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FB_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FB_ATTESTATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveIngressMutationRefused: true,
  liveWebhookIngressEndpointRefused: true,
  wallClockAuthorityRefused: true,
  tipRefreshAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  productionReadyFlipRefused: true,
  governedSealOnly: true,
  softObserveAloneNotIngressTruth: true,
  secretMaterialRefused: true,
  secretZeroHeld: true,
  rawWebhookSecretMaterialRefused: true,
  rawPayloadMaterialRefused: true,
  distinctFromEyIngressRegistry: true,
  distinctFromEzWebhookAuthenticity: true,
  distinctFromFaIngressQuarantine: true,
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
    pin: FB_FREEZE_PIN,
    pinShort: FB_FREEZE_PIN_SHORT,
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
    l39AutoCloseRefused: true,
    liveIngressMutationRefused: true,
    liveWebhookIngressEndpointRefused: true,
    wallClockAuthorityRefused: true,
    liveUnsupervisedMutationRefused: true,
    tipRefreshAuthorityRefused: true,
    rawWebhookSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    schemaJsonAddRefused: true,
    softObserveAloneNotIngressTruth: true,
    readOnly: true,
    nonClaimLabels: FB_FREEZE_NONCLAIM_LABELS,
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
    liveIngressMutationRefused: true,
    liveWebhookIngressEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    productionReadyFlipRefused: true,
    governedSealOnly: true,
    softObserveAloneNotIngressTruth: true,
    secretMaterialRefused: true,
    secretZeroHeld: true,
    rawWebhookSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    distinctFromEyIngressRegistry: true,
    distinctFromEzWebhookAuthenticity: true,
    distinctFromFaIngressQuarantine: true,
    distinctFromEwCredentialHonesty: true,
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
export function canonicalIngressHonestyAttestationSealBody(receipt) {
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
export function buildIngressHonestyAttestationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FB-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fb-default');
  const changeId = String(input.changeId || 'eos-ladder-39-mission-fb');
  const decision = FB_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FB_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const attestation = input.attestation || null;
  const attestationDigest =
    input.attestationDigest ||
    computeAttestationDigest({
      ingressId: attestation?.ingressId,
      sourceId: attestation?.sourceId,
      handleId: attestation?.handleId,
      subjectKind: attestation?.subjectKind,
      attestationStage: attestation?.attestationStage,
      bindingMatch: attestation?.bindingMatch,
      digestConsistent: attestation?.digestConsistent
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FB_OPERATION,
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
    kind: FB_RECEIPT_KIND,
    receiptId,
    operation: FB_OPERATION,
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
export function verifyIngressHonestyAttestationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FB_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FB_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FB_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalIngressHonestyAttestationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

