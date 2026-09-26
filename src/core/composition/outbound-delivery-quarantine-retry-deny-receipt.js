/**
 * @module outbound-delivery-quarantine-retry-deny-receipt
 * SPEC-0168 / Mission FF — Outbound Delivery Quarantine & Retry-Deny Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     quarantineDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   quarantine,
 *   retryDenyDigest,
 *   ackDigest,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l39ReopenRefused,
 *                   l40AutoCloseRefused,
 *                   liveOutboundDeliveryMutationRefused, liveHttpEgressEndpointRefused,
 *                   wallClockAuthorityRefused, tipRefreshAuthorityRefused,
 *                   rawCallbackSecretMaterialRefused, rawPayloadMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   quarantineHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveOutboundDeliveryMutationRefused: true, liveHttpEgressEndpointRefused: true,
 *                wallClockAuthorityRefused: true, tipRewriteRefused: true,
 *                tipRefreshAuthorityRefused: true, rawCallbackSecretMaterialRefused: true,
 *                rawPayloadMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, callbackSecretMaterialRefused: true,
 *                quarantineSecretZeroHeld: true,
 *                distinctFromFdOutboundDeliveryRegistry: true,
  distinctFromFaIngressQuarantine: true,
 *                distinctFromFeOutboundCallbackAuthenticity: true,
 *                distinctFromEbDeadLetterQuarantine: true,
 *                distinctFromL36AdmissionBackpressure: true,
 *                distinctFromEuSecretZeroLeakDeny: true,
 *                distinctFromEvHandleLifecycle: true,
 *                distinctFromFgOutboundHonesty: true }
 *
 * Freeze soft-observe pin is `1079bddf` (FE merge #553 / tip-refresh #554 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from FD outbound delivery registry, FE outbound callback authenticity, EB dead-letter quarantine (L34),
 * L36 admission/backpressure, EU secret-zero, EV handle lifecycle.
 * Soft-observe FD targetId/deliveryId + FE authenticity refs as opaque ids only.
 * Stages (EV/EQ-adapted): QUARANTINE | HOLD | RETRY_DENY | RELEASE_HOLD | ADMIT.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed outbound delivery quarantine / retry-deny ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live outbound delivery mutation ≠ wall-clock authority ≠ FD/FE/EB/L36 ports
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FF_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FF_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FF_RECEIPT_KIND = 'eos-outbound-delivery-quarantine-retry-deny-receipt';
export const FF_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FF_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FF_OPERATION = 'OUTBOUND_DELIVERY_QUARANTINE_RETRY_DENY';
export const FF_STAGE_STATES = Object.freeze([
  'QUARANTINE',
  'HOLD',
  'RETRY_DENY',
  'RELEASE_HOLD',
  'ACK',
  'ADMIT'
]);

export const FF_FREEZE_PIN = '1079bddfd403fbf39c47e6eb1df6b2cfda14a373';
export const FF_FREEZE_PIN_SHORT = '1079bddf';

export const FF_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Outbound Delivery Quarantine / Retry-Deny ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live outbound delivery mutation',
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
  'NON-CLAIM: L40 auto-close refused (FG–FH pending)',
  'NON-CLAIM: Live outbound delivery mutation / live HTTP egress endpoint / wall-clock / tip-refresh authority refused',
  'NON-CLAIM: Raw callback secret / raw payload material refused (Law VI — never seal secrets; opaque deliveryId/targetId + digests + stage only)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from FD outbound delivery registry (bind ≠ quarantine/retry-deny)',
  'NON-CLAIM: Distinct from FE outbound callback authenticity (sign ≠ quarantine/retry-deny)',
  'NON-CLAIM: Distinct from EB dead-letter quarantine / L36 admission (fold concepts; do NOT reopen L34/L36)',
  'NON-CLAIM: Distinct from FF outbound delivery quarantine / EU secret-zero / EV handle lifecycle / FG outbound honesty (FG next)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed outbound delivery quarantine/retry-deny ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FF_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FF_QUARANTINE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveOutboundDeliveryMutationRefused: true,
  liveHttpEgressEndpointRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawCallbackSecretMaterialRefused: true,
  rawPayloadMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  callbackSecretMaterialRefused: true,
  quarantineSecretZeroHeld: true,
  distinctFromFdOutboundDeliveryRegistry: true,
  distinctFromFaIngressQuarantine: true,
  distinctFromFeOutboundCallbackAuthenticity: true,
  distinctFromEbDeadLetterQuarantine: true,
  distinctFromL36AdmissionBackpressure: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEvHandleLifecycle: true,
  distinctFromFgOutboundHonesty: true
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
 * Digests opaque quarantine metadata only (deliveryId/targetId + stage + class) — never secret/raw payload bytes (Law VI).
 * @param {{ deliveryId?: string, targetId?: string, authenticityRef?: string, quarantineClass?: string, desiredStage?: string, observedStage?: string }} meta
 */
export function computeQuarantineDigest(meta = {}) {
  const opaqueOnly = {
    deliveryId: meta.deliveryId || null,
    targetId: meta.targetId || null,
    authenticityRef: meta.authenticityRef || null,
    quarantineClass: meta.quarantineClass || null,
    desiredStage: meta.desiredStage || null,
    observedStage: meta.observedStage ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

/**
 * Digests opaque retry-deny metadata only — never secret/raw payload bytes (Law VI).
 * @param {{ deliveryId?: string, targetId?: string, authenticityRef?: string, desiredStage?: string, observedStage?: string }} meta
 */
export function computeRetryDenyDigest(meta = {}) {
  const opaqueOnly = {
    kind: 'retry-deny',
    deliveryId: meta.deliveryId || null,
    targetId: meta.targetId || null,
    authenticityRef: meta.authenticityRef || null,
    desiredStage: meta.desiredStage || null,
    observedStage: meta.observedStage ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

/**
 * Digests opaque ack metadata only — never secret/raw payload bytes (Law VI).
 * @param {{ deliveryId?: string, targetId?: string, authenticityRef?: string, desiredStage?: string, observedStage?: string }} meta
 */
export function computeAckDigest(meta = {}) {
  const opaqueOnly = {
    kind: 'ack',
    deliveryId: meta.deliveryId || null,
    targetId: meta.targetId || null,
    authenticityRef: meta.authenticityRef || null,
    desiredStage: meta.desiredStage || null,
    observedStage: meta.observedStage ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FF_FREEZE_PIN,
    pinShort: FF_FREEZE_PIN_SHORT,
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
    tipRefreshAuthorityRefused: true,
    rawCallbackSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FF_FREEZE_NONCLAIM_LABELS,
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

export function forceQuarantineHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveOutboundDeliveryMutationRefused: true,
    liveHttpEgressEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCallbackSecretMaterialRefused: true,
    rawPayloadMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    callbackSecretMaterialRefused: true,
    quarantineSecretZeroHeld: true,
    distinctFromFdOutboundDeliveryRegistry: true,
  distinctFromFaIngressQuarantine: true,
    distinctFromFeOutboundCallbackAuthenticity: true,
    distinctFromEbDeadLetterQuarantine: true,
    distinctFromL36AdmissionBackpressure: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEvHandleLifecycle: true,
    distinctFromFgOutboundHonesty: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalOutboundDeliveryQuarantineRetryDenySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    quarantineDigest: receipt.quarantineDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Outbound Delivery Quarantine / Retry-Deny Governance Receipt.
 * Never seals secret material — only opaque deliveryId / targetId / authenticityRef / digests / stage.
 * @param {object} input
 * @returns {object}
 */
export function buildOutboundDeliveryQuarantineRetryDenyReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FF-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ff-default');
  const changeId = String(input.changeId || 'eos-ladder-40-mission-ff');
  const decision = FF_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FF_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const quarantine = input.quarantine || null;
  const quarantineDigest =
    input.quarantineDigest ||
    computeQuarantineDigest({
      deliveryId: quarantine?.deliveryId,
      targetId: quarantine?.targetId,
      authenticityRef: quarantine?.authenticityRef,
      quarantineClass: quarantine?.quarantineClass,
      desiredStage: quarantine?.desiredStage,
      observedStage: quarantine?.observedStage
    });
  const retryDenyDigest =
    input.retryDenyDigest ||
    computeRetryDenyDigest({
      deliveryId: quarantine?.deliveryId,
      targetId: quarantine?.targetId,
      authenticityRef: quarantine?.authenticityRef,
      desiredStage: quarantine?.desiredStage,
      observedStage: quarantine?.observedStage
    });
  const ackDigest =
    input.ackDigest ||
    computeAckDigest({
      deliveryId: quarantine?.deliveryId,
      targetId: quarantine?.targetId,
      authenticityRef: quarantine?.authenticityRef,
      desiredStage: quarantine?.desiredStage,
      observedStage: quarantine?.observedStage
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FF_OPERATION,
    planId,
    decision,
    changeId,
    quarantineDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FF_RECEIPT_KIND,
    receiptId,
    operation: FF_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    quarantineDigest,
    retryDenyDigest,
    ackDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    quarantine,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    quarantineHold: forceQuarantineHold(input.quarantineHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyOutboundDeliveryQuarantineRetryDenyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FF_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FF_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FF_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalOutboundDeliveryQuarantineRetryDenySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
