/**
 * @module ladder33-seam-receipt
 * SPEC-0135 / Mission DY — Ladder 33 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 * Soft-observe pin: fe52fb3b (tip-refresh-post-452 / PR #452). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DY_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DY_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DY_RECEIPT_KIND = 'eos-ladder33-seam-receipt';
export const DY_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DY_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const DY_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'SEAM_CHAIN_DU_DV_DW_DX',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const DY_FREEZE_PIN = 'fe52fb3bbfa23aaedcca3efdaa53e1c16722a823';
export const DY_FREEZE_PIN_SHORT = 'fe52fb3b';

export const DY_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 33 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L33 CLOSED is SEPARATE after DY merge',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: CLOSED_FOR_LOCAL_GOVERNED_USE != PRODUCTION_READY=YES',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = L33 seam chaining DU->DV->DW->DX + closeout != PRODUCTION_READY'
]);

export const DY_CEILING_HOLD_TEMPLATE = Object.freeze({ schemasAtCeiling: true, slimHold: true });
export const DY_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l33AutoCloseRefused: true,
  productionReadyFlipRefused: true
});

let _receiptSeq = 0;
export function _resetReceiptSeqForTests() { _receiptSeq = 0; }

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: DY_FREEZE_PIN,
    pinShort: DY_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33AutoCloseRefused: true,
    tipSealSeparate: true,
    readOnly: true,
    nonClaimLabels: DY_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function buildLadder33SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const receiptId = 'DY-RCPT-' + seq + '-' + sha256Canonical(opts.planId || 'plan').slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = opts.decision || 'PASS';
  const operation = opts.operation || 'SEAM_GOVERN';
  const planId = opts.planId || 'plan-unknown';
  const changeId = opts.changeId || 'eos-ladder-33-mission-dy';
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
    productionReady: DY_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: { ...DY_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) },
    seamHold: { ...DY_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) },
    chainObserve: Object.freeze({
      softImport: true,
      duObserved: !!(opts.chainObserve && opts.chainObserve.duObserved),
      dvObserved: !!(opts.chainObserve && opts.chainObserve.dvObserved),
      dwObserved: !!(opts.chainObserve && opts.chainObserve.dwObserved),
      dxObserved: !!(opts.chainObserve && opts.chainObserve.dxObserved),
      prefixes: (opts.chainObserve && opts.chainObserve.prefixes) || []
    }),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {}),
    kind: DY_RECEIPT_KIND
  });
}

export function verifyLadder33SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!String(receipt.receiptId || '').startsWith('DY-RCPT-')) return false;
  if (receipt.fundacionDelta !== 0) return false;
  if (receipt.productionReady !== 'NO') return false;
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) return false;
  if (!receipt.receiptHash || String(receipt.receiptHash).length !== 64) return false;
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) return false;
  if (!receipt.freezeObserve.tipSealSeparate) return false;
  return true;
}
