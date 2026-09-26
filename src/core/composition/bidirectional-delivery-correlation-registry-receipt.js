/**
 * @module bidirectional-delivery-correlation-registry-receipt
 * SPEC-0171 / Mission FI — Bidirectional Delivery Correlation Registry & Binding Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     correlationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   binding,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l40ReopenRefused,
 *                   l41AutoCloseRefused,
 *                   liveHttpEgressRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawCorrelationSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   correlationHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveHttpEgressRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawCorrelationSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, correlationSecretMaterialRefused: true,
 *                correlationSecretZeroHeld: true,
 *                softObserveL39IngressRefsOnly: true,
 *                softObserveL40OutboundRefsOnly: true,
 *                distinctFromEyIngressRegistry: true,
 *                distinctFromFdOutboundRegistry: true,
 *                distinctFromFjRoundTripIntegrity: true,
 *                distinctFromCanaryDeliveryDispatcher: true }
 *
 * Freeze soft-observe pin is `78141c3d` (tip-open #564 / tip-refresh #565 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Soft-observe opaque L39 ingress refs (ingressId/sourceId) + L40 outbound refs (targetId/deliveryId).
 * Joins them into a bidirectional correlation binding — without reopening L39/L40.
 *
 * Distinct from EY ingress registry, FD outbound registry, Canary/Fundacion delivery.
 * Distinct from Mission FJ round-trip integrity (next — do NOT implement).
 *
 * PRODUCTION_READY: NO
 * PASS = sealed bidirectional-delivery-correlation registry binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FJ/Canary ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FI_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FI_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FI_RECEIPT_KIND = 'eos-bidirectional-delivery-correlation-registry-receipt';
export const FI_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FI_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FI_OPERATION = 'BIDIRECTIONAL_DELIVERY_CORRELATION_REGISTRY_BINDING';
export const FI_BINDING_STATES = Object.freeze(['BOUND', 'UNBOUND', 'HOLD']);

export const FI_FREEZE_PIN = '78141c3d295579f210589301230af5d0853df392';
export const FI_FREEZE_PIN_SHORT = '78141c3d';

export const FI_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Bidirectional Delivery Correlation Registry & Binding ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live HTTP egress',
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
  'NON-CLAIM: L40 reopen refused',
  'NON-CLAIM: L41 auto-close refused (FJ–FM pending)',
  'NON-CLAIM: Live HTTP egress / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw correlation secret / payload material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EY ingress registry / FD outbound registry / Canary delivery dispatcher',
  'NON-CLAIM: Distinct from FJ round-trip integrity (FJ is next satellite; FI is registry/binding only)',
  'NON-CLAIM: Soft-observe L39 ingress + L40 outbound opaque refs only — do NOT reopen L39/L40',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed bidirectional-delivery-correlation binding ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FI_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FI_CORRELATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawCorrelationSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  correlationSecretMaterialRefused: true,
  correlationSecretZeroHeld: true,
  softObserveL39IngressRefsOnly: true,
  softObserveL40OutboundRefsOnly: true,
  distinctFromEyIngressRegistry: true,
  distinctFromFdOutboundRegistry: true,
  distinctFromFjRoundTripIntegrity: true,
  distinctFromCanaryDeliveryDispatcher: true
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
 * Digests opaque L39 ingress + L40 outbound correlation metadata only — never secret bytes (Law VI).
 * @param {{ correlationId?: string, bindingId?: string, ingressId?: string, sourceId?: string, targetId?: string, deliveryId?: string, correlationClass?: string, bindingClass?: string, desiredBinding?: string, observedBinding?: string }} meta
 */
export function computeCorrelationDigest(meta = {}) {
  const opaqueOnly = {
    correlationId: meta.correlationId || null,
    bindingId: meta.bindingId || null,
    ingressId: meta.ingressId || null,
    sourceId: meta.sourceId || null,
    targetId: meta.targetId || null,
    deliveryId: meta.deliveryId || null,
    correlationClass: meta.correlationClass || null,
    bindingClass: meta.bindingClass || null,
    desiredBinding: meta.desiredBinding || null,
    observedBinding: meta.observedBinding ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FI_FREEZE_PIN,
    pinShort: FI_FREEZE_PIN_SHORT,
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
    l40ReopenRefused: true,
    l41AutoCloseRefused: true,
    liveHttpEgressRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCorrelationSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FI_FREEZE_NONCLAIM_LABELS,
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

export function forceCorrelationHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveHttpEgressRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawCorrelationSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    correlationSecretMaterialRefused: true,
    correlationSecretZeroHeld: true,
    softObserveL39IngressRefsOnly: true,
    softObserveL40OutboundRefsOnly: true,
    distinctFromEyIngressRegistry: true,
    distinctFromFdOutboundRegistry: true,
    distinctFromFjRoundTripIntegrity: true,
    distinctFromCanaryDeliveryDispatcher: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalBidirectionalDeliveryCorrelationRegistrySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    correlationDigest: receipt.correlationDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Bidirectional Delivery Correlation Registry & Binding Receipt.
 * Never seals secret material — only opaque correlationId / bindingId / ingressId / sourceId /
 * targetId / deliveryId / correlationClass / bindingClass / digests.
 * @param {object} input
 * @returns {object}
 */
export function buildBidirectionalDeliveryCorrelationRegistryReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FI-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fi-default');
  const changeId = String(input.changeId || 'eos-ladder-41-mission-fi');
  const decision = FI_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FI_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const binding = input.binding || null;
  const correlationDigest =
    input.correlationDigest ||
    computeCorrelationDigest({
      correlationId: binding?.correlationId,
      bindingId: binding?.bindingId,
      ingressId: binding?.ingressId,
      sourceId: binding?.sourceId,
      targetId: binding?.targetId,
      deliveryId: binding?.deliveryId,
      correlationClass: binding?.correlationClass,
      bindingClass: binding?.bindingClass,
      desiredBinding: binding?.desiredBinding,
      observedBinding: binding?.observedBinding
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FI_OPERATION,
    planId,
    decision,
    changeId,
    correlationDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FI_RECEIPT_KIND,
    receiptId,
    operation: FI_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    correlationDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    binding,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    correlationHold: forceCorrelationHold(input.correlationHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyBidirectionalDeliveryCorrelationRegistryReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FI_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FI_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FI_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalBidirectionalDeliveryCorrelationRegistrySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
