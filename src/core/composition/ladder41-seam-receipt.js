/**
 * @module ladder41-seam-receipt
 * SPEC-0175 / Mission FM — Ladder 41 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     seamDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   seam (opaque chain booleans + labels + spec ordinals only),
 *   freezeObserve { pin, pinShort, tipRewriteRefused, tipSealInProductRefused,
 *                   productionReadyFlipRefused, l30ReopenRefused … l40ReopenRefused,
 *                   l41AutoCloseRefused, liveHttpEgressRefused,
 *                   wallClockAuthorityRefused, tipRefreshAuthorityRefused,
 *                   rawSeamSecretMaterialRefused, schemaJsonAddRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling, slimHold, tipSealSeparate, formalL41Closeout: false },
 *   seamHold { hermeticInMemoryOnly, failClosed, governedSealOnly, seamOnly,
 *              noPayloadCopy, consumesFi…consumesFl, distinctFromFi…distinctFromFl }
 *
 * Freeze soft-observe pin is `f5948926` (post-#581 merge / FL MEASURED soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed Ladder 41 seam-pack consolidation ≠ tip-refresh ≠ tip-seal
 * ≠ PRODUCTION_READY ≠ Formal L41 CLOSED
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FM_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FM_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FM_RECEIPT_KIND = 'eos-ladder41-seam-receipt';
export const FM_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FM_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FM_OPERATION = 'LADDER_41_SEAM_PACK_CONSOLIDATION';
export const FM_SEAM_CLASSES = Object.freeze(['SEAM_PACK', 'HOLD']);
export const FM_CHAIN_ORDER = Object.freeze(['FI', 'FJ', 'FK', 'FL']);
export const FM_SATELLITE_SPECS = Object.freeze([
  'SPEC-0171',
  'SPEC-0172',
  'SPEC-0173',
  'SPEC-0174'
]);

export const FM_FREEZE_PIN = 'f5948926b723167db78ffb08f46123810cd66444';
export const FM_FREEZE_PIN_SHORT = 'f5948926';

export const FM_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 41 Seam-Pack Consolidation ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ tip-seal',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: Tip-seal in product package refused (tip-seal is a SEPARATE governed act)',
  'NON-CLAIM: Formal L41 CLOSED is a SEPARATE governed act — never sealed by the FM product package',
  'NON-CLAIM: L41 auto-close refused without humanGateHeld',
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
  'NON-CLAIM: Live HTTP egress / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw seam secret / payload material refused (Law VI — never seal or copy secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from FI correlation registry / FJ round-trip integrity / FK mismatch quarantine / FL honesty attestation / FH L40 seam-pack',
  'NON-CLAIM: Seam consolidation is a decision record only — no payload copy, no payload move',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed L41 seam-pack consolidation ≠ tip-refresh ≠ tip-seal ≠ PRODUCTION_READY'
]);

export const FM_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true,
  tipSealSeparate: true,
  formalL41Closeout: false
});

export const FM_SEAM_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  tipSealInProductRefused: true,
  l41AutoCloseRefused: true,
  rawSeamSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  seamSecretMaterialRefused: true,
  seamSecretZeroHeld: true,
  seamOnly: true,
  noPayloadCopy: true,
  humanGateRequired: true,
  consumesFiCorrelationRegistry: true,
  consumesFjRoundTripIntegrity: true,
  consumesFkMismatchQuarantine: true,
  consumesFlHonestyAttestation: true,
  distinctFromFiCorrelationRegistry: true,
  distinctFromFjRoundTripIntegrity: true,
  distinctFromFkMismatchQuarantine: true,
  distinctFromFlHonestyAttestation: true,
  distinctFromFhLadder40SeamPack: true
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
 * Digests opaque chain booleans, chain labels, spec ordinals and the seam class only.
 * Never secret bytes, ids or payload digests (Law VI).
 * @param {object} meta
 * @returns {string} 64-hex sha256
 */
export function computeSeamDigest(meta = {}) {
  const chain = meta.chain && typeof meta.chain === 'object' ? meta.chain : {};
  const opaqueOnly = {
    chain: {
      fi: chain.fi === true,
      fj: chain.fj === true,
      fk: chain.fk === true,
      fl: chain.fl === true
    },
    chainOrder: FM_CHAIN_ORDER,
    seamClass: FM_SEAM_CLASSES.includes(meta.seamClass) ? meta.seamClass : null,
    satelliteSpecs: FM_SATELLITE_SPECS,
    desiredSeal: FM_SEAM_CLASSES.includes(meta.desiredSeal) ? meta.desiredSeal : null,
    observedChainComplete: meta.observedChainComplete === true
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: FM_FREEZE_PIN,
    pinShort: FM_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    tipSealInProductRefused: true,
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
    rawSeamSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FM_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    ...FM_CEILING_HOLD_TEMPLATE,
    ...opts
  });
}

export function forceSeamHold(opts = {}) {
  return Object.freeze({
    ...FM_SEAM_HOLD_TEMPLATE,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalLadder41SeamSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    seamDigest: receipt.seamDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Ladder 41 seam-pack consolidation receipt.
 * Never seals secret material — only opaque chain booleans, labels and spec ordinals.
 * @param {object} input
 * @returns {object}
 */
export function buildLadder41SeamReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FM-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fm-default');
  const changeId = String(input.changeId || 'eos-ladder-41-mission-fm');
  const decision = FM_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FM_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const seam = input.seam || null;
  const seamDigest = normalizeDigest(input.seamDigest) || computeSeamDigest(seam || {});
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FM_OPERATION,
    planId,
    decision,
    changeId,
    seamDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FM_RECEIPT_KIND,
    receiptId,
    operation: FM_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    seamDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    seam,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    seamHold: forceSeamHold(input.seamHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyLadder41SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }
  if (receipt.kind !== FM_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FM_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FM_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalLadder41SeamSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

void FM_PRODUCTION_READY;
void PRODUCTION_READY;
