/**
 * @module outbound-callback-authenticity-receipt
 * SPEC-0167 / Mission FE — Sovereign Outbound Callback Authenticity / Signature-Sign Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     authenticityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   sign,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l39ReopenRefused,
 *                   l40AutoCloseRefused,
 *                   liveSignatureSignEndpointRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawCallbackSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   authenticityHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveSignatureSignEndpointRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawCallbackSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, callbackSecretMaterialRefused: true,
 *                authenticitySecretZeroHeld: true,
 *                distinctFromEtCredentialHandle: true,
 *                distinctFromL33DomainEventOutbound: true,
 *                distinctFromEuSecretZeroLeakDeny: true,
 *                distinctFromEwCredentialHonesty: true,
 *                distinctFromEzWebhookAuthenticityVerify: true,
 *                distinctFromFdOutboundDeliveryRegistry: true,
 *                distinctFromAuSecretRuntimeBroker: true,
 *                distinctFromFfQuarantine: true }
 *
 * Freeze soft-observe pin is `7b47bf8b` (FD merge #551 / tip-refresh #552 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EZ webhook authenticity verify (inbound), FD outbound delivery/callback registry (targets only).
 * Distinct from ET credential-handle, AU secrets, FF quarantine (next — do NOT implement).
 * Fold L38 handle concepts into semantics; soft-observe FD targetId/deliveryId as opaque refs; do NOT reopen L33 outbound or copy secret material into receipts.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed outbound-callback authenticity sign ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live signature sign endpoint ≠ wall-clock authority ≠ ET/EZ/FD/AU/FF ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FE_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FE_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FE_RECEIPT_KIND = 'eos-outbound-callback-authenticity-receipt';
export const FE_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FE_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FE_OPERATION = 'OUTBOUND_CALLBACK_AUTHENTICITY_HANDLE_SIGN';
export const FE_VERDICT_STATES = Object.freeze(['SIGNED', 'UNSIGNED', 'HOLD']);

export const FE_FREEZE_PIN = '7b47bf8b8da0905460fb82d8f664097ea2b98f63';
export const FE_FREEZE_PIN_SHORT = '7b47bf8b';

export const FE_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Outbound Callback Authenticity / Signature-Sign Governance ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live signature sign endpoint',
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
  'NON-CLAIM: L40 auto-close refused (FF–FH pending)',
  'NON-CLAIM: Live signature sign endpoint / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw callback secret / HMAC / signing key material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from ET credential-handle / L33 domain-event outbound / EU secret-zero leak-deny / EW credential honesty',
  'NON-CLAIM: Distinct from EZ webhook authenticity verify (EZ verifies inbound; FE signs outbound via L38 handles)',
  'NON-CLAIM: Distinct from FD outbound delivery/callback registry (FD is registry/binding only; FE is signature-sign)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed outbound-callback-authenticity sign ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FE_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FE_AUTHENTICITY_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveSignatureSignEndpointRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawCallbackSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  callbackSecretMaterialRefused: true,
  authenticitySecretZeroHeld: true,
  distinctFromEtCredentialHandle: true,
  distinctFromL33DomainEventOutbound: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEwCredentialHonesty: true,
  distinctFromEzWebhookAuthenticityVerify: true,
  distinctFromFdOutboundDeliveryRegistry: true,
  distinctFromAuSecretRuntimeBroker: true,
  distinctFromFfQuarantine: true
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
 * Digests opaque authenticity metadata only (handleId + verdict + optional FD targetId/deliveryId soft-observe) — never secret bytes (Law VI).
 * @param {{ handleId?: string, targetId?: string, deliveryId?: string, authenticityClass?: string, desiredVerdict?: string, observedVerdict?: string, signClass?: string }} meta
 */
export function computeAuthenticityDigest(meta = {}) {
  const opaqueOnly = {
    handleId: meta.handleId || null,
    targetId: meta.targetId || null,
    deliveryId: meta.deliveryId || null,
    authenticityClass: meta.authenticityClass || null,
    signClass: meta.signClass || null,
    desiredVerdict: meta.desiredVerdict || null,
    observedVerdict: meta.observedVerdict ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

/** Alias — signatureDigest is the same opaque digest (never raw HMAC / signing-key material). */
export function computeSignatureDigest(meta = {}) {
  return computeAuthenticityDigest(meta);
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FE_FREEZE_PIN,
    pinShort: FE_FREEZE_PIN_SHORT,
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
    liveSignatureSignEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCallbackSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FE_FREEZE_NONCLAIM_LABELS,
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

export function forceAuthenticityHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveSignatureSignEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCallbackSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    callbackSecretMaterialRefused: true,
    authenticitySecretZeroHeld: true,
    distinctFromEtCredentialHandle: true,
    distinctFromL33DomainEventOutbound: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEwCredentialHonesty: true,
    distinctFromEzWebhookAuthenticityVerify: true,
    distinctFromFdOutboundDeliveryRegistry: true,
    distinctFromAuSecretRuntimeBroker: true,
    distinctFromFfQuarantine: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalOutboundCallbackAuthenticitySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    authenticityDigest: receipt.authenticityDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Outbound Callback Authenticity / Signature-Sign Governance Receipt.
 * Never seals secret material — only opaque handleId / authenticityClass / digests + optional opaque FD targetId/deliveryId soft-observe. NEVER callbackSecret, hmacKey, webhookSecret, signing key material, raw HMAC output.
 * @param {object} input
 * @returns {object}
 */
export function buildOutboundCallbackAuthenticityReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FE-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fe-default');
  const changeId = String(input.changeId || 'eos-ladder-40-mission-fe');
  const decision = FE_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FE_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const sign = input.sign || null;
  const authenticityDigest =
    input.authenticityDigest ||
    computeAuthenticityDigest({
      handleId: sign?.handleId,
      targetId: sign?.targetId,
      deliveryId: sign?.deliveryId,
      authenticityClass: sign?.authenticityClass,
      signClass: sign?.signClass,
      desiredVerdict: sign?.desiredVerdict,
      observedVerdict: sign?.observedVerdict
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FE_OPERATION,
    planId,
    decision,
    changeId,
    authenticityDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FE_RECEIPT_KIND,
    receiptId,
    operation: FE_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    authenticityDigest,
    signatureDigest: authenticityDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    sign,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    authenticityHold: forceAuthenticityHold(input.authenticityHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyOutboundCallbackAuthenticityReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FE_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FE_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FE_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalOutboundCallbackAuthenticitySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
