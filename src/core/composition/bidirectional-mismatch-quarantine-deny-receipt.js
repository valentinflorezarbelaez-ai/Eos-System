/**
 * @module bidirectional-mismatch-quarantine-deny-receipt
 * SPEC-0173 / Mission FK — Bidirectional Mismatch Quarantine / Deny Governance Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     mismatchDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   mismatch,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l40ReopenRefused,
 *                   l41AutoCloseRefused,
 *                   liveHttpEgressRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawMismatchSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   quarantineHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveHttpEgressRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawMismatchSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, mismatchSecretMaterialRefused: true,
 *                mismatchSecretZeroHeld: true,
 *                decisionRecordOnly: true, noPayloadCopy: true,
 *                consumesFiCorrelationBinding: true, consumesFjRoundTripVerdict: true,
 *                distinctFromFiCorrelationRegistry: true,
 *                distinctFromFjRoundTripIntegrity: true,
 *                distinctFromFlHonestyAttestation: true,
 *                distinctFromCanaryDeliveryDispatcher: true }
 *
 * Freeze soft-observe pin is `038a9a4` (post-#577 merge / FJ MEASURED soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Quarantine is a decision record only: never copy, move, or seal request/reply payload bytes.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed mismatch quarantine/deny decision ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FJ/FL/Canary ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FK_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FK_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FK_RECEIPT_KIND = 'eos-bidirectional-mismatch-quarantine-deny-receipt';
export const FK_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FK_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FK_OPERATION = 'BIDIRECTIONAL_MISMATCH_QUARANTINE_DENY';
export const FK_DISPOSITIONS = Object.freeze(['QUARANTINE', 'DENY', 'HOLD']);
export const FK_VERDICTS = Object.freeze(['VERIFIED', 'MISMATCH', 'HOLD']);

export const FK_FREEZE_PIN = '038a9a4ac4b213b58a09cd6956d797ab8a713869';
export const FK_FREEZE_PIN_SHORT = '038a9a4';

export const FK_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Bidirectional Mismatch Quarantine / Deny ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live HTTP egress',
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
  'NON-CLAIM: L41 auto-close refused (FL–FM pending)',
  'NON-CLAIM: Live HTTP egress / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw mismatch secret / request-reply payload material refused (Law VI — never seal or copy secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from FI correlation registry / FJ round-trip integrity / FL honesty attestation / Canary delivery dispatcher',
  'NON-CLAIM: Quarantine is a decision record only — no payload copy, no payload move',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed mismatch quarantine/deny decision ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FK_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FK_QUARANTINE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawMismatchSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  mismatchSecretMaterialRefused: true,
  mismatchSecretZeroHeld: true,
  decisionRecordOnly: true,
  noPayloadCopy: true,
  consumesFiCorrelationBinding: true,
  consumesFjRoundTripVerdict: true,
  distinctFromFiCorrelationRegistry: true,
  distinctFromFjRoundTripIntegrity: true,
  distinctFromFlHonestyAttestation: true,
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
 * Digests opaque FI/FJ refs + mismatch metadata only — never secret bytes (Law VI).
 * @param {object} meta
 */
export function computeMismatchDigest(meta = {}) {
  const opaqueOnly = {
    correlationId: meta.correlationId || null,
    bindingId: meta.bindingId || null,
    roundTripId: meta.roundTripId || null,
    requestId: meta.requestId || null,
    replyId: meta.replyId || null,
    requestDigest: normalizeDigest(meta.requestDigest),
    replyDigest: normalizeDigest(meta.replyDigest),
    mismatchClass: meta.mismatchClass || null,
    desiredDisposition: meta.desiredDisposition || null,
    observedVerdict: meta.observedVerdict ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FK_FREEZE_PIN,
    pinShort: FK_FREEZE_PIN_SHORT,
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
    rawMismatchSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FK_FREEZE_NONCLAIM_LABELS,
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
    liveHttpEgressRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawMismatchSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    mismatchSecretMaterialRefused: true,
    mismatchSecretZeroHeld: true,
    decisionRecordOnly: true,
    noPayloadCopy: true,
    consumesFiCorrelationBinding: true,
    consumesFjRoundTripVerdict: true,
    distinctFromFiCorrelationRegistry: true,
    distinctFromFjRoundTripIntegrity: true,
    distinctFromFlHonestyAttestation: true,
    distinctFromCanaryDeliveryDispatcher: true,
    ...opts
  });
}


/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalBidirectionalMismatchQuarantineDenySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    mismatchDigest: receipt.mismatchDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Bidirectional Mismatch Quarantine / Deny receipt.
 * Never seals secret material — only opaque FI/FJ ids, classes, verdicts and digests.
 * @param {object} input
 * @returns {object}
 */
export function buildBidirectionalMismatchQuarantineDenyReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FK-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fk-default');
  const changeId = String(input.changeId || 'eos-ladder-41-mission-fk');
  const decision = FK_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FK_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const mismatch = input.mismatch || null;
  const mismatchDigest =
    normalizeDigest(input.mismatchDigest) || computeMismatchDigest(mismatch || {});
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FK_OPERATION,
    planId,
    decision,
    changeId,
    mismatchDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FK_RECEIPT_KIND,
    receiptId,
    operation: FK_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    mismatchDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    mismatch,
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
export function verifyBidirectionalMismatchQuarantineDenyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }
  if (receipt.kind !== FK_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FK_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FK_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalBidirectionalMismatchQuarantineDenySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

