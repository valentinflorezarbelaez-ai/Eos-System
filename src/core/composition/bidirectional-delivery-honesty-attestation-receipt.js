/**
 * @module bidirectional-delivery-honesty-attestation-receipt
 * SPEC-0174 / Mission FL — Bidirectional Delivery Honesty & Integrity Attestation Receipt.
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
 *                   l30ReopenRefused … l40ReopenRefused,
 *                   l41AutoCloseRefused,
 *                   liveHttpEgressRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawAttestationSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   attestationHold { hermeticInMemoryOnly, failClosed, liveHttpEgressRefused,
 *                     wallClockAuthorityRefused, tipRewriteRefused,
 *                     tipRefreshAuthorityRefused, rawAttestationSecretMaterialRefused,
 *                     schemaJsonAddRefused, governedSealOnly,
 *                     attestationSecretMaterialRefused, attestationSecretZeroHeld,
 *                     attestOnly: true, noPayloadCopy: true,
 *                     consumesFiCorrelationBinding, consumesFjRoundTripVerdict,
 *                     consumesFkQuarantineDecision,
 *                     distinctFromFiCorrelationRegistry, distinctFromFjRoundTripIntegrity,
 *                     distinctFromFkMismatchQuarantine, distinctFromCanaryDeliveryDispatcher }
 *
 * Freeze soft-observe pin is `e1a17e9b` (post-#578 merge / FK MEASURED soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Attestation attests a claim; it never copies, moves, or seals payload bytes.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed honesty & integrity attestation ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FJ/FK/Canary ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FL_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FL_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FL_RECEIPT_KIND = 'eos-bidirectional-delivery-honesty-attestation-receipt';
export const FL_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FL_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FL_OPERATION = 'BIDIRECTIONAL_DELIVERY_HONESTY_ATTESTATION';
export const FL_ATTESTATIONS = Object.freeze(['ATTEST_INTEGRITY', 'ATTEST_HONESTY', 'HOLD']);
export const FL_CLAIMS = Object.freeze(['CONSISTENT', 'CONTRADICTED', 'UNVERIFIED', 'HOLD']);

export const FL_FREEZE_PIN = 'e1a17e9ba16716fc904c1570baf5f8ca4ff3ea17';
export const FL_FREEZE_PIN_SHORT = 'e1a17e9b';

export const FL_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Bidirectional Delivery Honesty & Integrity Attestation ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live HTTP egress',
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
  'NON-CLAIM: L41 auto-close refused (FM pending)',
  'NON-CLAIM: Live HTTP egress / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw attestation secret / request-reply payload material refused (Law VI — never seal or copy secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from FI correlation registry / FJ round-trip integrity / FK mismatch quarantine / Canary delivery dispatcher',
  'NON-CLAIM: Attestation is a decision record only — no payload copy, no payload move',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed honesty & integrity attestation ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FL_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FL_ATTESTATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawAttestationSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  attestationSecretMaterialRefused: true,
  attestationSecretZeroHeld: true,
  attestOnly: true,
  noPayloadCopy: true,
  consumesFiCorrelationBinding: true,
  consumesFjRoundTripVerdict: true,
  consumesFkQuarantineDecision: true,
  distinctFromFiCorrelationRegistry: true,
  distinctFromFjRoundTripIntegrity: true,
  distinctFromFkMismatchQuarantine: true,
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

function normalizeDigest(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : null;
}

/**
 * Digests opaque FI/FJ/FK refs + attestation metadata only — never secret bytes (Law VI).
 * @param {object} meta
 */
export function computeAttestationDigest(meta = {}) {
  const opaqueOnly = {
    correlationId: meta.correlationId || null,
    bindingId: meta.bindingId || null,
    roundTripId: meta.roundTripId || null,
    requestId: meta.requestId || null,
    replyId: meta.replyId || null,
    requestDigest: normalizeDigest(meta.requestDigest),
    replyDigest: normalizeDigest(meta.replyDigest),
    quarantineDecisionId: meta.quarantineDecisionId || null,
    mismatchDigest: normalizeDigest(meta.mismatchDigest),
    attestationClass: meta.attestationClass || null,
    desiredAttestation: meta.desiredAttestation || null,
    observedClaim: meta.observedClaim ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FL_FREEZE_PIN,
    pinShort: FL_FREEZE_PIN_SHORT,
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
    rawAttestationSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FL_FREEZE_NONCLAIM_LABELS,
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
    ...FL_ATTESTATION_HOLD_TEMPLATE,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalBidirectionalDeliveryHonestyAttestationSealBody(receipt) {
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
 * Builds a sealed Bidirectional Delivery Honesty & Integrity Attestation receipt.
 * Never seals secret material — only opaque FI/FJ/FK ids, classes, claims and digests.
 * @param {object} input
 * @returns {object}
 */
export function buildBidirectionalDeliveryHonestyAttestationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FL-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fl-default');
  const changeId = String(input.changeId || 'eos-ladder-41-mission-fl');
  const decision = FL_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FL_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const attestation = input.attestation || null;
  const attestationDigest =
    normalizeDigest(input.attestationDigest) || computeAttestationDigest(attestation || {});
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FL_OPERATION,
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
    kind: FL_RECEIPT_KIND,
    receiptId,
    operation: FL_OPERATION,
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
export function verifyBidirectionalDeliveryHonestyAttestationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }
  if (receipt.kind !== FL_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FL_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FL_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalBidirectionalDeliveryHonestyAttestationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
