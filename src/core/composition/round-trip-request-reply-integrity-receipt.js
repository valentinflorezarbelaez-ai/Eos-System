/**
 * @module round-trip-request-reply-integrity-receipt
 * SPEC-0172 / Mission FJ — Round-Trip / Request-Reply Integrity Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     integrityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   roundTrip,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l40ReopenRefused,
 *                   l41AutoCloseRefused,
 *                   liveHttpEgressRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawIntegritySecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   integrityHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveHttpEgressRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawIntegritySecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, integritySecretMaterialRefused: true,
 *                integritySecretZeroHeld: true,
 *                softObserveFiCorrelationAndL39IngressRefsOnly: true,
 *                softObserveL40OutboundRefsOnly: true,
 *                distinctFromEyIngressRegistry: true,
 *                distinctFromFdOutboundRegistry: true,
 *                distinctFromFiCorrelationRegistry: true,
 *                distinctFromFkQuarantine: true }
 *
 * Freeze soft-observe pin is `78141c3d` (tip-open #564 / tip-refresh #565 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Soft-observe opaque L39 ingress refs (ingressId/sourceId) + L40 outbound refs (targetId/deliveryId).
 * Verifies round-trip / request-reply integrity across correlated opaque FI + L39 + L40 refs — without reopening L39/L40 or elevating FI as this port.
 *
 * Distinct from EY ingress registry, FD outbound registry, Canary/Fundacion delivery.
 * Distinct from Mission FI correlation registry (prior) and Mission FK quarantine (next — do NOT implement).
 *
 * PRODUCTION_READY: NO
 * PASS = sealed round-trip request-reply integrity verify ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FI/FK/Canary ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FJ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FJ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FJ_RECEIPT_KIND = 'eos-round-trip-request-reply-integrity-receipt';
export const FJ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FJ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FJ_OPERATION = 'ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFY';
export const FJ_VERDICT_STATES = Object.freeze(['INTACT', 'BROKEN', 'HOLD']);

export const FJ_FREEZE_PIN = '78141c3d295579f210589301230af5d0853df392';
export const FJ_FREEZE_PIN_SHORT = '78141c3d';

export const FJ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Round-Trip / Request-Reply Integrity Governance ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live HTTP egress',
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
  'NON-CLAIM: L41 auto-close refused (FK–FM pending)',
  'NON-CLAIM: Live HTTP egress / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw request/reply payload / integrity secret material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EY ingress registry / FD outbound registry / FI correlation registry / Canary dispatcher',
  'NON-CLAIM: Distinct from FI correlation registry (FI is registry/binding only; FJ is round-trip integrity verify)',
  'NON-CLAIM: Soft-observe FI correlationId + L39 ingress + L40 outbound opaque refs only — do NOT reopen L39/L40',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed round-trip request-reply integrity verify ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FJ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FJ_INTEGRITY_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawIntegritySecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  integritySecretMaterialRefused: true,
  integritySecretZeroHeld: true,
  softObserveFiCorrelationAndL39IngressRefsOnly: true,
  softObserveL40OutboundRefsOnly: true,
  distinctFromEyIngressRegistry: true,
  distinctFromFdOutboundRegistry: true,
  distinctFromFiCorrelationRegistry: true,
  distinctFromFkQuarantine: true
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
 * Digests opaque FI correlation + request/reply + L39/L40 metadata only — never secret bytes (Law VI).
 * @param {{ correlationId?: string, roundTripId?: string, requestId?: string, replyId?: string, ingressId?: string, sourceId?: string, targetId?: string, deliveryId?: string, integrityClass?: string, desiredVerdict?: string, observedVerdict?: string }} meta
 */
export function computeIntegrityDigest(meta = {}) {
  const opaqueOnly = {
    correlationId: meta.correlationId || null,
    roundTripId: meta.roundTripId || null,
    requestId: meta.requestId || null,
    replyId: meta.replyId || null,
    ingressId: meta.ingressId || null,
    sourceId: meta.sourceId || null,
    targetId: meta.targetId || null,
    deliveryId: meta.deliveryId || null,
    integrityClass: meta.integrityClass || null,
    desiredVerdict: meta.desiredVerdict || null,
    observedVerdict: meta.observedVerdict ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FJ_FREEZE_PIN,
    pinShort: FJ_FREEZE_PIN_SHORT,
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
    rawIntegritySecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FJ_FREEZE_NONCLAIM_LABELS,
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

export function forceIntegrityHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveHttpEgressRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawIntegritySecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    integritySecretMaterialRefused: true,
    integritySecretZeroHeld: true,
    softObserveFiCorrelationAndL39IngressRefsOnly: true,
    softObserveL40OutboundRefsOnly: true,
    distinctFromEyIngressRegistry: true,
    distinctFromFdOutboundRegistry: true,
    distinctFromFiCorrelationRegistry: true,
    distinctFromFkQuarantine: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalRoundTripRequestReplyIntegritySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    integrityDigest: receipt.integrityDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Round-Trip / Request-Reply Integrity Receipt.
 * Never seals secret material — only opaque correlationId / roundTripId / requestId / replyId /
 * ingressId / sourceId / targetId / deliveryId / integrityClass / digests.
 * @param {object} input
 * @returns {object}
 */
export function buildRoundTripRequestReplyIntegrityReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FJ-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fj-default');
  const changeId = String(input.changeId || 'eos-ladder-41-mission-fj');
  const decision = FJ_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FJ_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const roundTrip = input.roundTrip || null;
  const integrityDigest =
    input.integrityDigest ||
    computeIntegrityDigest({
      correlationId: roundTrip?.correlationId,
      roundTripId: roundTrip?.roundTripId,
      requestId: roundTrip?.requestId,
      replyId: roundTrip?.replyId,
      ingressId: roundTrip?.ingressId,
      sourceId: roundTrip?.sourceId,
      targetId: roundTrip?.targetId,
      deliveryId: roundTrip?.deliveryId,
      integrityClass: roundTrip?.integrityClass,
      desiredVerdict: roundTrip?.desiredVerdict,
      observedVerdict: roundTrip?.observedVerdict
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FJ_OPERATION,
    planId,
    decision,
    changeId,
    integrityDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FJ_RECEIPT_KIND,
    receiptId,
    operation: FJ_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    integrityDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    roundTrip,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    integrityHold: forceIntegrityHold(input.integrityHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyRoundTripRequestReplyIntegrityReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FJ_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FJ_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FJ_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalRoundTripRequestReplyIntegritySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
