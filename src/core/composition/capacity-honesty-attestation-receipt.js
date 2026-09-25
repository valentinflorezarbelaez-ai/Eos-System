/**
 * @module capacity-honesty-attestation-receipt
 * SPEC-0149 / Mission EM — Capacity Honesty & Admission Attestation Receipt.
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
 *                   l34ReopenRefused, l35ReopenRefused, l36AutoCloseRefused, liveMetricsClaimRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   attestationHold { hermeticInMemoryOnly: true, liveMetricsClaimRefused: true,
 *                     wallClockCapacityAuthorityRefused: true, tipRewriteRefused: true,
 *                     schemaJsonAddRefused: true, productionReadyFlipRefused: true,
 *                     governedSealOnly: true }
 *
 * Freeze soft-observe pin is `933f32ae` (EL #495 merge / tip-refresh #496).
 * Do NOT rewrite freeze tip pins from this mission package.
 * Soft-observe of freeze pins alone is NOT capacity truth (mirror EH vs soft-observe for temporal).
 * Distinct from EJ (quotas), EK (load-shed), EL (bulkhead), EH (temporal honesty).
 *
 * PRODUCTION_READY: NO
 * PASS = hermetic capacity/admission honesty attestation ≠ wall-clock capacity authority ≠ tip-refresh ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EM_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EM_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EM_RECEIPT_KIND = 'eos-capacity-honesty-attestation-receipt';
export const EM_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EM_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EM_SUBJECT_KINDS = Object.freeze(['ADMISSION', 'LOAD_SHED', 'BULKHEAD', 'COMPOSITE']);
export const EM_OPERATION = 'CAPACITY_HONESTY_ADMISSION_ATTESTATION';

export const EM_FREEZE_PIN = '933f32ae07fd3526b322cbd8ed389f66d8b298f1';
export const EM_FREEZE_PIN_SHORT = '933f32ae';

export const EM_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Capacity Honesty & Admission Attestation ≠ PRODUCTION_READY flip ≠ wall-clock capacity authority ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 auto-close refused (EN pending)',
  'NON-CLAIM: Live metrics scrapers / wall-clock capacity authority honesty lie refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Soft-observe freeze pins alone ≠ capacity truth',
  'NON-CLAIM: Distinct from EJ admission quotas — attestation only',
  'NON-CLAIM: Distinct from EK load-shed — attestation only',
  'NON-CLAIM: Distinct from EL bulkhead — attestation only',
  'NON-CLAIM: Distinct from EH temporal honesty — capacity axis',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = hermetic capacity/admission honesty attestation ≠ wall-clock capacity authority ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EM_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EM_ATTESTATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  liveMetricsClaimRefused: true,
  wallClockCapacityAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  productionReadyFlipRefused: true,
  governedSealOnly: true,
  distinctFromEjAdmissionQuota: true,
  distinctFromEkLoadShed: true,
  distinctFromElBulkhead: true,
  distinctFromEhTemporalHonesty: true
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
    pin: EM_FREEZE_PIN,
    pinShort: EM_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36AutoCloseRefused: true,
    liveMetricsClaimRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EM_FREEZE_NONCLAIM_LABELS,
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
    liveMetricsClaimRefused: true,
    wallClockCapacityAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    productionReadyFlipRefused: true,
    governedSealOnly: true,
    distinctFromEjAdmissionQuota: true,
    distinctFromEkLoadShed: true,
    distinctFromElBulkhead: true,
    distinctFromEhTemporalHonesty: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalCapacityHonestyAttestationSealBody(receipt) {
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
 * Builds a sealed Capacity Honesty & Admission Attestation Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildCapacityHonestyAttestationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EM-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-em-default');
  const changeId = String(input.changeId || 'eos-ladder-36-mission-em');
  const decision = EM_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EM_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const attestation = input.attestation || null;
  const attestationDigest =
    input.attestationDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, attestation }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'CAPACITY_HONESTY_ADMISSION_ATTESTATION',
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
    kind: EM_RECEIPT_KIND,
    receiptId,
    operation: 'CAPACITY_HONESTY_ADMISSION_ATTESTATION',
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
export function verifyCapacityHonestyAttestationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EM_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EM_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'CAPACITY_HONESTY_ADMISSION_ATTESTATION') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalCapacityHonestyAttestationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
