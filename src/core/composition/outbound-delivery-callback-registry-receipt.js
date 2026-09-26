/**
 * @module outbound-delivery-callback-registry-receipt
 * SPEC-0166 / Mission FD — Sovereign External Event Outbound Registry & Binding Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     deliveryDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   binding,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l38ReopenRefused, l39ReopenRefused,
 *                   l40AutoCloseRefused,
 *                   liveHttpEgressRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawCallbackSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   deliveryHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveHttpEgressRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawCallbackSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, callbackSecretMaterialRefused: true,
 *                outboundSecretZeroHeld: true,
 *                distinctFromEtCredentialHandle: true,
 *                distinctFromL33DomainEventOutbound: true,
 *                distinctFromEyIngressRegistry: true,
 *                distinctFromCanaryDeliveryDispatcher: true,
 *                distinctFromFeSignatureSign: true }
 *
 * Freeze soft-observe pin is `f9a14e16` (tip-open #549 / post tip-refresh #550 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from ET credential-handle, L33 domain-event outbound, EU secret-zero leak-deny, EW credential honesty.
 * Distinct from Mission EZ src/core/composition/*domain-event* (L33 outbound) (runtime broker ≠ composition port).
 * Fold ingress concepts into semantics; do NOT reopen L33 outbound or copy secret material into receipts.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed outbound-delivery-callback registry binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/ET/L33/Canary/FE ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FD_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FD_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FD_RECEIPT_KIND = 'eos-outbound-delivery-callback-registry-receipt';
export const FD_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FD_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FD_OPERATION = 'OUTBOUND_DELIVERY_CALLBACK_REGISTRY_BINDING';
export const FD_BINDING_STATES = Object.freeze(['BOUND', 'UNBOUND', 'HOLD']);

export const FD_FREEZE_PIN = 'f9a14e162b632b73b2b414aaa57e3d1179222389';
export const FD_FREEZE_PIN_SHORT = 'f9a14e16';

export const FD_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Outbound Delivery / Callback Target Registry & Binding ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live HTTP egress',
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
  'NON-CLAIM: L40 auto-close refused (FE–FH pending)',
  'NON-CLAIM: Live HTTP egress / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw callback secret / HMAC material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EY ingress registry / ET credential-handle / L33 domain-event outbound / Canary delivery dispatcher',
  'NON-CLAIM: Distinct from FE signature-sign (FE is next satellite; FD is registry/binding only)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed outbound-delivery-callback binding ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FD_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FD_DELIVERY_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawCallbackSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  callbackSecretMaterialRefused: true,
  outboundSecretZeroHeld: true,
  distinctFromEtCredentialHandle: true,
  distinctFromL33DomainEventOutbound: true,
  distinctFromEyIngressRegistry: true,
  distinctFromCanaryDeliveryDispatcher: true,
  distinctFromFeSignatureSign: true
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
 * Digests opaque outbound metadata only — never secret bytes (Law VI).
 * @param {{ targetId?: string, targetClass?: string, desiredBinding?: string, observedBinding?: string, bindingClass?: string }} meta
 */
export function computeDeliveryDigest(meta = {}) {
  const opaqueOnly = {
    targetId: meta.targetId || null,
    deliveryId: meta.deliveryId || null,
    targetClass: meta.targetClass || null,
    bindingClass: meta.bindingClass || null,
    desiredBinding: meta.desiredBinding || null,
    observedBinding: meta.observedBinding ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FD_FREEZE_PIN,
    pinShort: FD_FREEZE_PIN_SHORT,
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
    liveHttpEgressRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCallbackSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FD_FREEZE_NONCLAIM_LABELS,
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

export function forceDeliveryHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveHttpEgressRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCallbackSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    callbackSecretMaterialRefused: true,
    outboundSecretZeroHeld: true,
    distinctFromEtCredentialHandle: true,
    distinctFromL33DomainEventOutbound: true,
    distinctFromEyIngressRegistry: true,
    distinctFromCanaryDeliveryDispatcher: true,
    distinctFromFeSignatureSign: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalOutboundDeliveryCallbackRegistrySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    deliveryDigest: receipt.deliveryDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed External Event Outbound Registry & Binding Receipt.
 * Never seals secret material — only opaque targetId / targetClass / bindingClass / digests.
 * @param {object} input
 * @returns {object}
 */
export function buildOutboundDeliveryCallbackRegistryReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FD-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fd-default');
  const changeId = String(input.changeId || 'eos-ladder-40-mission-fd');
  const decision = FD_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FD_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const binding = input.binding || null;
  const deliveryDigest =
    input.deliveryDigest ||
    computeDeliveryDigest({
      targetId: binding?.targetId,
      deliveryId: binding?.deliveryId,
      targetClass: binding?.targetClass,
      bindingClass: binding?.bindingClass,
      desiredBinding: binding?.desiredBinding,
      observedBinding: binding?.observedBinding
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FD_OPERATION,
    planId,
    decision,
    changeId,
    deliveryDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FD_RECEIPT_KIND,
    receiptId,
    operation: FD_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    deliveryDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    binding,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    deliveryHold: forceDeliveryHold(input.deliveryHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyOutboundDeliveryCallbackRegistryReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FD_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FD_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FD_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalOutboundDeliveryCallbackRegistrySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
