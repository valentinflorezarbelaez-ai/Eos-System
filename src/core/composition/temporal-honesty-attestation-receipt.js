/**
 * @module temporal-honesty-attestation-receipt
 * SPEC-0144 / Mission EH — Temporal Honesty & Deadline Attestation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     attestationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   attestation,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35AutoCloseRefused, liveTimerClaimRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   attestationHold { hermeticInMemoryOnly: true, liveTimerClaimRefused: true,
 *                     wallClockAuthorityRefused: true, tipRewriteRefused: true,
 *                     schemaJsonAddRefused: true, productionReadyFlipRefused: true,
 *                     governedSealOnly: true }
 *
 * Freeze soft-observe pin is `ff4b6d19` (EG merge / tip-refresh #481).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = hermetic honesty attestation ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EH_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EH_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EH_RECEIPT_KIND = 'eos-temporal-honesty-attestation-receipt';
export const EH_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EH_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EH_SUBJECT_KINDS = Object.freeze(['DEADLINE', 'SCHEDULE', 'COMPENSATION', 'COMPOSITE']);

export const EH_FREEZE_PIN = 'ff4b6d19132cfa0ab279109b9e09989e297dba71';
export const EH_FREEZE_PIN_SHORT = 'ff4b6d19';

export const EH_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Temporal Honesty & Deadline Attestation ≠ PRODUCTION_READY flip ≠ wall-clock authority ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 auto-close refused',
  'NON-CLAIM: Live timer / wall-clock authority honesty lie refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = hermetic honesty attestation ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EH_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EH_ATTESTATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  liveTimerClaimRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  productionReadyFlipRefused: true,
  governedSealOnly: true
});

let _receiptSeq = 0;

export function _resetReceiptSeqForTests() {
  _receiptSeq = 0;
}

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: EH_FREEZE_PIN,
    pinShort: EH_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35AutoCloseRefused: true,
    liveTimerClaimRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EH_FREEZE_NONCLAIM_LABELS,
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
    liveTimerClaimRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    productionReadyFlipRefused: true,
    governedSealOnly: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalTemporalHonestyAttestationSealBody(receipt) {
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
 * Builds a sealed Temporal Honesty & Deadline Attestation Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildTemporalHonestyAttestationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EH-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-eh-default');
  const changeId = String(input.changeId || 'eos-ladder-35-mission-eh');
  const decision = EH_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EH_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const attestation = input.attestation || null;
  const attestationDigest =
    input.attestationDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, attestation }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'TEMPORAL_HONESTY_DEADLINE_ATTESTATION',
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
    kind: EH_RECEIPT_KIND,
    receiptId,
    operation: 'TEMPORAL_HONESTY_DEADLINE_ATTESTATION',
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
export function verifyTemporalHonestyAttestationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EH_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EH_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'TEMPORAL_HONESTY_DEADLINE_ATTESTATION') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalTemporalHonestyAttestationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
