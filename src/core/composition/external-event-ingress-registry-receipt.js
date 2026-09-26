/**
 * @module external-event-ingress-registry-receipt
 * SPEC-0161 / Mission EY — Sovereign External Event Ingress Registry & Binding Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     ingressDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   binding,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l38ReopenRefused,
 *                   l39AutoCloseRefused,
 *                   liveWebhookEndpointRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawWebhookSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   ingressHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveWebhookEndpointRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawWebhookSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, webhookSecretMaterialRefused: true,
 *                ingressSecretZeroHeld: true,
 *                distinctFromEtCredentialHandle: true,
 *                distinctFromL33DomainEventOutbound: true,
 *                distinctFromEuSecretZeroLeakDeny: true,
 *                distinctFromEwCredentialHonesty: true,
 *                distinctFromEzWebhookAuthenticity: true }
 *
 * Freeze soft-observe pin is `987702da` (tip-open #533 / post tip-refresh #535 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from ET credential-handle, L33 domain-event outbound, EU secret-zero leak-deny, EW credential honesty.
 * Distinct from Mission EZ src/core/composition/*domain-event* (L33 outbound) (runtime broker ≠ composition port).
 * Fold ingress concepts into semantics; do NOT reopen L33 outbound or copy secret material into receipts.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed external-event-ingress registry binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live webhook endpoint ≠ wall-clock authority ≠ ET/L33/EU/EW/EZ ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EY_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EY_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EY_RECEIPT_KIND = 'eos-external-event-ingress-registry-receipt';
export const EY_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EY_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EY_OPERATION = 'EXTERNAL_EVENT_INGRESS_REGISTRY_BINDING';
export const EY_BINDING_STATES = Object.freeze(['BOUND', 'UNBOUND', 'HOLD']);

export const EY_FREEZE_PIN = '987702da91fac40550bf6f7fb803790f69aca21c';
export const EY_FREEZE_PIN_SHORT = '987702da';

export const EY_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: External Event Ingress Registry & Binding ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live webhook endpoint',
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
  'NON-CLAIM: L39 auto-close refused (EZ–FC pending)',
  'NON-CLAIM: Live webhook endpoint / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw webhook secret / HMAC material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from ET credential-handle / L33 domain-event outbound / EU secret-zero leak-deny / EW credential honesty',
  'NON-CLAIM: Distinct from EZ webhook authenticity (EZ is next satellite; EY is registry/binding only)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed credential-ingress binding ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EY_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EY_INGRESS_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveWebhookEndpointRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawWebhookSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  webhookSecretMaterialRefused: true,
  ingressSecretZeroHeld: true,
  distinctFromEtCredentialHandle: true,
  distinctFromL33DomainEventOutbound: true,
  distinctFromEuSecretZeroLeakDeny: true,
  distinctFromEwCredentialHonesty: true,
  distinctFromEzWebhookAuthenticity: true
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
 * Digests opaque ingress metadata only — never secret bytes (Law VI).
 * @param {{ ingressId?: string, sourceClass?: string, desiredBinding?: string, observedBinding?: string, bindingClass?: string }} meta
 */
export function computeIngressDigest(meta = {}) {
  const opaqueOnly = {
    ingressId: meta.ingressId || null,
    sourceId: meta.sourceId || null,
    sourceClass: meta.sourceClass || null,
    bindingClass: meta.bindingClass || null,
    desiredBinding: meta.desiredBinding || null,
    observedBinding: meta.observedBinding ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: EY_FREEZE_PIN,
    pinShort: EY_FREEZE_PIN_SHORT,
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
    liveWebhookEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawWebhookSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EY_FREEZE_NONCLAIM_LABELS,
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

export function forceIngressHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveWebhookEndpointRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawWebhookSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    webhookSecretMaterialRefused: true,
    ingressSecretZeroHeld: true,
    distinctFromEtCredentialHandle: true,
    distinctFromL33DomainEventOutbound: true,
    distinctFromEuSecretZeroLeakDeny: true,
    distinctFromEwCredentialHonesty: true,
    distinctFromEzWebhookAuthenticity: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalExternalEventIngressRegistrySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    ingressDigest: receipt.ingressDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed External Event Ingress Registry & Binding Receipt.
 * Never seals secret material — only opaque ingressId / sourceClass / bindingClass / digests.
 * @param {object} input
 * @returns {object}
 */
export function buildExternalEventIngressRegistryReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EY-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ey-default');
  const changeId = String(input.changeId || 'eos-ladder-39-mission-ey');
  const decision = EY_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EY_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const binding = input.binding || null;
  const ingressDigest =
    input.ingressDigest ||
    computeIngressDigest({
      ingressId: binding?.ingressId,
      sourceId: binding?.sourceId,
      sourceClass: binding?.sourceClass,
      bindingClass: binding?.bindingClass,
      desiredBinding: binding?.desiredBinding,
      observedBinding: binding?.observedBinding
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EY_OPERATION,
    planId,
    decision,
    changeId,
    ingressDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EY_RECEIPT_KIND,
    receiptId,
    operation: EY_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    ingressDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    binding,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    ingressHold: forceIngressHold(input.ingressHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyExternalEventIngressRegistryReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EY_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EY_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EY_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalExternalEventIngressRegistrySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
