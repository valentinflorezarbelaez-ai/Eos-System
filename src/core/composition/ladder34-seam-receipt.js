/**
 * @module ladder34-seam-receipt
 * SPEC-0140 / Mission ED — Ladder 34 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 * Soft-observe pin: 29586ab8 (tip-refresh-post-468 / PR #468 EC merge). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const ED_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const ED_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const ED_RECEIPT_KIND = 'eos-ladder34-seam-receipt';
export const ED_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const ED_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const ED_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'LADDER34_SEAM_PACK_CLOSEOUT',
  'SEAM_CHAIN_DZ_EA_EB_EC',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const ED_FREEZE_PIN = '29586ab8f2c8a784eb84f5c5e9c899118c577427';
export const ED_FREEZE_PIN_SHORT = '29586ab8';

export const ED_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 34 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L34 CLOSED is SEPARATE after ED merge + tip-refresh',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: Seam-pack closeout != Formal L34 CLOSED (tip-seal later)',
  'NON-CLAIM: Tip-seal-in-product claim refused',
  'NON-CLAIM: Schema-json add refused (AT_CEILING 35/35)',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = L34 seam chaining DZ->EA->EB->EC + closeout satellite != PRODUCTION_READY != Formal L34 CLOSED'
]);

export const ED_CEILING_HOLD_TEMPLATE = Object.freeze({ schemasAtCeiling: true, slimHold: true, schemaJsonAddRefused: true });
export const ED_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l34AutoCloseRefused: true,
  tipSealInProductClaimRefused: true,
  productionReadyFlipRefused: true,
  schemasAtCeiling: true
});

let _receiptSeq = 0;
export function _resetReceiptSeqForTests() { _receiptSeq = 0; }

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: ED_FREEZE_PIN,
    pinShort: ED_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34AutoCloseRefused: true,
    tipSealSeparate: true,
    tipSealInProductClaimRefused: true,
    schemasAtCeiling: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: ED_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function buildLadder34SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const receiptId = 'ED-RCPT-' + seq + '-' + sha256Canonical(opts.planId || 'plan').slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = opts.decision || 'PASS';
  const operation = opts.operation || 'LADDER34_SEAM_PACK_CLOSEOUT';
  const planId = opts.planId || 'plan-unknown';
  const changeId = opts.changeId || 'eos-ladder-34-mission-ed';
  const seamDigest = opts.seamDigest || sha256Canonical(JSON.stringify({
    planId, decision, operation, chain: opts.chainObserve || null
  }));
  const prevReceiptHash = opts.prevReceiptHash || '0'.repeat(64);
  const fundacionDelta = 0;
  const canonical = { receiptId, operation, planId, decision, changeId, seamDigest, timestamp, fundacionDelta, prevReceiptHash };
  const receiptHash = sha256Canonical(canonical);
  return Object.freeze({
    ...canonical,
    receiptHash,
    ritualMode: opts.ritualMode || 'ACTIVE',
    productionReady: ED_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: { ...ED_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) },
    seamHold: { ...ED_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) },
    chainObserve: Object.freeze({
      softImport: true,
      dzObserved: !!(opts.chainObserve && opts.chainObserve.dzObserved),
      eaObserved: !!(opts.chainObserve && opts.chainObserve.eaObserved),
      ebObserved: !!(opts.chainObserve && opts.chainObserve.ebObserved),
      ecObserved: !!(opts.chainObserve && opts.chainObserve.ecObserved),
      prefixes: (opts.chainObserve && opts.chainObserve.prefixes) || []
    }),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {}),
    kind: ED_RECEIPT_KIND
  });
}

export function verifyLadder34SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!String(receipt.receiptId || '').startsWith('ED-RCPT-')) return false;
  if (receipt.fundacionDelta !== 0) return false;
  if (receipt.productionReady !== 'NO') return false;
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) return false;
  if (!receipt.receiptHash || String(receipt.receiptHash).length !== 64) return false;
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) return false;
  if (!receipt.freezeObserve.tipSealSeparate) return false;
  if (!receipt.freezeObserve.l34AutoCloseRefused) return false;
  if (!receipt.freezeObserve.schemasAtCeiling) return false;
  return true;
}
