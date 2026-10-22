/**
 * @module ladder41-seam-receipt
 * SPEC-0175 / Mission FM — Ladder 41 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 * Soft-observe pin: f5948926 (FL merge #581 / tip-refresh post-#581). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
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
export const FM_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'LADDER41_SEAM_PACK_CLOSEOUT',
  'SEAM_CHAIN_FI_FJ_FK_FL',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const FM_FREEZE_PIN = 'f5948926b723167db78ffb08f46123810cd66444';
export const FM_FREEZE_PIN_SHORT = 'f5948926';

export const FM_CHAIN_ORDER = Object.freeze(['FI', 'FJ', 'FK', 'FL']);
export const FM_SATELLITE_SPECS = Object.freeze([
  'SPEC-0171',
  'SPEC-0172',
  'SPEC-0173',
  'SPEC-0174'
]);

export const FM_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 41 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
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
  'NON-CLAIM: L41 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L41 CLOSED is SEPARATE after FM merge + tip-refresh',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: Seam-pack closeout != Formal L41 CLOSED (tip-seal later)',
  'NON-CLAIM: Tip-seal-in-product claim refused',
  'NON-CLAIM: Schema-json add refused (AT_CEILING 35/35)',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: Distinct from FH L40 seam / FC L39 seam / EX L38 / ES L37',
  'NON-CLAIM: FI/FJ/FK/FL product reopen refused',
  'NON-CLAIM: Law VI — zero secrets; opaque digests/handles only',
  'NON-CLAIM: PASS = L41 seam chaining FI->FJ->FK->FL + closeout satellite != PRODUCTION_READY != Formal L41 CLOSED'
]);

export const FM_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  secretMaterialRefused: true,
  slimHold: true,
  schemaJsonAddRefused: true
});

export const FM_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  hermeticInMemoryOnly: true,
  softObserveOnly: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l41AutoCloseRefused: true,
  tipSealInProductClaimRefused: true,
  productionReadyFlipRefused: true,
  schemasAtCeiling: true,
  readOnly: true
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
    pin: FM_FREEZE_PIN,
    pinShort: FM_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    tipSealSeparate: true,
    tipSealInProductClaimRefused: true,
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
    schemasAtCeiling: true,
    secretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FM_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

/**
 * Digests the observed chain booleans, chain labels, satellite spec ordinals and
 * the seam class only — never ids, payload digests or secrets (Law VI).
 * @param {object} meta
 */
export function computeSeamDigest(meta = {}) {
  const chain = meta.chain || {};
  const opaqueOnly = {
    chain: {
      fi: !!chain.fi,
      fj: !!chain.fj,
      fk: !!chain.fk,
      fl: !!chain.fl
    },
    chainOrder: FM_CHAIN_ORDER,
    satelliteSpecs: FM_SATELLITE_SPECS,
    seamClass: meta.seamClass || null,
    desiredSeal: meta.desiredSeal || null,
    observedChainComplete: !!meta.observedChainComplete
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

/**
 * Builds a sealed Ladder 41 seam receipt.
 * @param {object} opts
 * @returns {object} frozen receipt
 */
export function buildLadder41SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const planId = opts.planId || 'plan-unknown';
  const receiptId = 'FM-RCPT-' + seq + '-' + sha256Canonical(planId).slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = FM_DECISIONS.includes(opts.decision) ? opts.decision : 'DENY';
  const operation = FM_OPERATIONS.includes(opts.operation) ? opts.operation : 'SEAM_GOVERN';
  const changeId = opts.changeId || 'eos-ladder-41-mission-fm';
  const ritualMode = FM_RITUAL_MODES.includes(opts.ritualMode) ? opts.ritualMode : 'ACTIVE';
  const chainObserve = {
    fi: !!(opts.chainObserve && opts.chainObserve.fi),
    fj: !!(opts.chainObserve && opts.chainObserve.fj),
    fk: !!(opts.chainObserve && opts.chainObserve.fk),
    fl: !!(opts.chainObserve && opts.chainObserve.fl),
    prefixes: Object.freeze((opts.chainObserve && opts.chainObserve.prefixes) || []),
    chainOrder: FM_CHAIN_ORDER,
    satelliteSpecs: FM_SATELLITE_SPECS
  };
  const seamDigest =
    opts.seamDigest ||
    computeSeamDigest({
      chain: chainObserve,
      seamClass: opts.seamClass || 'ladder-41-seam-pack',
      desiredSeal: opts.desiredSeal || 'SEAM_PACK',
      observedChainComplete: chainObserve.fi && chainObserve.fj && chainObserve.fk && chainObserve.fl
    });
  const prevReceiptHash = opts.prevReceiptHash || '0'.repeat(64);
  const fundacionDelta = 0;

  const canonical = {
    receiptId,
    operation,
    planId,
    decision,
    changeId,
    seamDigest,
    timestamp,
    fundacionDelta,
    prevReceiptHash
  };
  const receiptHash = sha256Canonical(canonical);

  return Object.freeze({
    ...canonical,
    receiptHash,
    kind: FM_RECEIPT_KIND,
    ritualMode,
    productionReady: FM_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: Object.freeze({ ...FM_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) }),
    seamHold: Object.freeze({ ...FM_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) }),
    chainObserve: Object.freeze(chainObserve),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {})
  });
}

/**
 * Verifies the canonical invariants and the hash of a seam receipt.
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyLadder41SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return { ok: false, reason: 'Invalid receipt object' };
  if (!String(receipt.receiptId || '').startsWith('FM-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with FM-RCPT-' };
  }
  if (receipt.kind !== FM_RECEIPT_KIND) return { ok: false, reason: 'kind mismatch' };
  if (receipt.fundacionDelta !== 0) return { ok: false, reason: 'fundacionDelta must be 0' };
  if (receipt.productionReady !== 'NO') return { ok: false, reason: 'productionReady must be NO' };
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) {
    return { ok: false, reason: 'seamDigest must be a 64-hex sha256 digest' };
  }
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) {
    return { ok: false, reason: 'freezeObserve.readOnly must be true' };
  }
  if (receipt.freezeObserve.tipSealSeparate !== true) {
    return { ok: false, reason: 'tipSealSeparate must be true' };
  }
  if (receipt.freezeObserve.tipSealInProductClaimRefused !== true) {
    return { ok: false, reason: 'tipSealInProductClaimRefused must be true' };
  }
  if (receipt.freezeObserve.l41AutoCloseRefused !== true) {
    return { ok: false, reason: 'l41AutoCloseRefused must be true' };
  }
  if (receipt.freezeObserve.l40ReopenRefused !== true) {
    return { ok: false, reason: 'l40ReopenRefused must be true' };
  }
  if (receipt.freezeObserve.schemasAtCeiling !== true) {
    return { ok: false, reason: 'schemasAtCeiling must be true' };
  }

  const expectedHash = sha256Canonical({
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    seamDigest: receipt.seamDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  });

  if (receipt.receiptHash !== expectedHash) {
    return { ok: false, reason: 'receiptHash mismatch' };
  }
  return { ok: true };
}
