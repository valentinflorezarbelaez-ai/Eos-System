/**
 * @module webhook-authenticity-receipt
 * SPEC-0162 / Mission EZ — Sovereign Webhook Authenticity / Signature-Verify Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     authenticityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   verify,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l38ReopenRefused,
 *                   l39AutoCloseRefused,
 *                   liveSignatureVerifyEndpointRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawWebhookSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   authenticityHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveSignatureVerifyEndpointRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawWebhookSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, webhookSecretMaterialRefused: true,
 *                authenticitySecretZeroHeld: true,
 *                distinctFromEtCredentialHandle: true,
 *                distinctFromL33DomainEventOutbound: true,
 *                distinctFromEuSecretZeroLeakDeny: true,
 *                distinctFromEwCredentialHonesty: true,
 *                distinctFromEyIngressRegistry: true,
 *                distinctFromAuSecretRuntimeBroker: true,
 *                distinctFromFaIngressQuarantine: true }
 *
 * Freeze soft-observe pin is `cc9161f9` (EY merge #536 / tip-refresh #537 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from ET credential-handle, L33 domain-event outbound, EU secret-zero leak-deny, EW credential honesty.
 * Distinct from Mission EY external-event-ingress-registry/*domain-event* (L33 outbound) (runtime broker ≠ composition port).
 * Fold L38 handle concepts into semantics; soft-observe EY ingressId/sourceId as opaque refs; do NOT reopen L33 outbound or copy secret material into receipts.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed webhook authenticity verify ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live signature verify endpoint ≠ wall-clock authority ≠ ET/EU/EY/AU/FA ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EZ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EZ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EZ_RECEIPT_KIND = 'eos-webhook-authenticity-receipt';
export const EZ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EZ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EZ_OPERATION = 'WEBHOOK_AUTHENTICITY_HANDLE_VERIFY';
export const EZ_VERDICT_STATES = Object.freeze(['AUTHENTIC', 'INAUTHENTIC', 'HOLD']);

export const EZ_FREEZE_PIN = 'cc9161f9a2da918a932081bae9afc644479f6eee';
export const EZ_FREEZE_PIN_SHORT = 'cc9161f9';

export const EZ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Webhook Authenticity / Signature-Verify Governance ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live signature verify endpoint',
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
  'NON-CLAIM: L39 auto-close refused (FA–FC pending)',
  'NON-CLAIM: Live webhook endpoint / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw webhook secret / HMAC material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from ET credential-handle / L33 domain-event outbound / EU secret-zero leak-deny / EW credential honesty',
  'NON-CLAIM: Distinct from EY ingress registry (EY is registry/verify only; EZ is authenticity verify via L38 handles)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed webhook-authenticity verify ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EZ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EZ_AUTHENTICITY_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveSignatureVerifyEndpointRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawWebhookSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  webhookSecretMaterialRefused: true,
  authenticitySecretZeroHeld: true,
  distinctFromEtCredentialHandle: true,
  distinctFromL33DomainEventOutbound: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEwCredentialHonesty: true,
  distinctFromEyIngressRegistry: true,
  distinctFromAuSecretRuntimeBroker: true,
  distinctFromFaIngressQuarantine: true
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
 * Digests opaque authenticity metadata only (handleId + verdict + optional EY ingressId/sourceId soft-observe) — never secret bytes (Law VI).
 * @param {{ handleId?: string, authenticityClass?: string, desiredVerdict?: string, observedVerdict?: string, verifyClass?: string }} meta
 */
export function computeAuthenticityDigest(meta = {}) {
  const opaqueOnly = {
    handleId: meta.handleId || null,
    sourceId: meta.sourceId || null,
    authenticityClass: meta.authenticityClass || null,
    verifyClass: meta.verifyClass || null,
    desiredVerdict: meta.desiredVerdict || null,
    observedVerdict: meta.observedVerdict ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: EZ_FREEZE_PIN,
    pinShort: EZ_FREEZE_PIN_SHORT,
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
    liveSignatureVerifyEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawWebhookSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EZ_FREEZE_NONCLAIM_LABELS,
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
    liveSignatureVerifyEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawWebhookSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    webhookSecretMaterialRefused: true,
    authenticitySecretZeroHeld: true,
    distinctFromEtCredentialHandle: true,
    distinctFromL33DomainEventOutbound: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEwCredentialHonesty: true,
    distinctFromEyIngressRegistry: true,
    distinctFromAuSecretRuntimeBroker: true,
    distinctFromFaIngressQuarantine: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalWebhookAuthenticitySealBody(receipt) {
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
 * Builds a sealed Webhook Authenticity / Signature-Verify Governance Receipt.
 * Never seals secret material — only opaque handleId / authenticityClass / digests + optional opaque EY ingressId/sourceId soft-observe. NEVER HMAC secrets, webhook tokens, raw signatures as secret material.
 * @param {object} input
 * @returns {object}
 */
export function buildWebhookAuthenticityReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EZ-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ez-default');
  const changeId = String(input.changeId || 'eos-ladder-39-mission-ez');
  const decision = EZ_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EZ_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const verify = input.verify || null;
  const authenticityDigest =
    input.authenticityDigest ||
    computeAuthenticityDigest({
      handleId: verify?.handleId,
      sourceId: verify?.sourceId,
      authenticityClass: verify?.authenticityClass,
      verifyClass: verify?.verifyClass,
      desiredVerdict: verify?.desiredVerdict,
      observedVerdict: verify?.observedVerdict
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EZ_OPERATION,
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
    kind: EZ_RECEIPT_KIND,
    receiptId,
    operation: EZ_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    authenticityDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    verify,
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
export function verifyWebhookAuthenticityReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EZ_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EZ_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EZ_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalWebhookAuthenticitySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
