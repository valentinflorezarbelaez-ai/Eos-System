/**
 * @module ladder37-seam-receipt
 * SPEC-0155 / Mission ES — Ladder 37 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 * Soft-observe pin: 22289f5d (ER merge #512). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const ES_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const ES_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const ES_RECEIPT_KIND = 'eos-ladder37-seam-receipt';
export const ES_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const ES_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const ES_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'LADDER37_SEAM_PACK_CLOSEOUT',
  'SEAM_CHAIN_EO_EP_EQ_ER',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const ES_FREEZE_PIN = '22289f5dec7b4e374408ca4d1bd26574da40a2c1';
export const ES_FREEZE_PIN_SHORT = '22289f5d';

export const ES_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 37 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L37 CLOSED is SEPARATE after ES merge + tip-refresh',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: Seam-pack closeout != Formal L37 CLOSED (tip-seal later)',
  'NON-CLAIM: Tip-seal-in-product claim refused',
  'NON-CLAIM: Schema-json add refused (AT_CEILING 35/35)',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: Distinct from EN L36 seam and EI L35 seam',
  'NON-CLAIM: PASS = L37 seam chaining EO->EP->EQ->ER + closeout satellite != PRODUCTION_READY != Formal L37 CLOSED'
]);

export const ES_CEILING_HOLD_TEMPLATE = Object.freeze({ schemasAtCeiling: true, slimHold: true, schemaJsonAddRefused: true });
export const ES_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l37AutoCloseRefused: true,
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
    pin: ES_FREEZE_PIN,
    pinShort: ES_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36ReopenRefused: true,
    l37AutoCloseRefused: true,
    tipSealSeparate: true,
    tipSealInProductClaimRefused: true,
    schemasAtCeiling: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: ES_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function buildLadder37SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const receiptId = 'ES-RCPT-' + seq + '-' + sha256Canonical(opts.planId || 'plan').slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = opts.decision || 'PASS';
  const operation = opts.operation || 'LADDER37_SEAM_PACK_CLOSEOUT';
  const planId = opts.planId || 'plan-unknown';
  const changeId = opts.changeId || 'eos-ladder-37-mission-es';
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
    productionReady: ES_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: { ...ES_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) },
    seamHold: { ...ES_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) },
    chainObserve: Object.freeze({
      softImport: true,
      eoObserved: !!(opts.chainObserve && opts.chainObserve.eoObserved),
      epObserved: !!(opts.chainObserve && opts.chainObserve.epObserved),
      eqObserved: !!(opts.chainObserve && opts.chainObserve.eqObserved),
      erObserved: !!(opts.chainObserve && opts.chainObserve.erObserved),
      prefixes: (opts.chainObserve && opts.chainObserve.prefixes) || []
    }),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {}),
    kind: ES_RECEIPT_KIND
  });
}

export function verifyLadder37SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!String(receipt.receiptId || '').startsWith('ES-RCPT-')) return false;
  if (receipt.fundacionDelta !== 0) return false;
  if (receipt.productionReady !== 'NO') return false;
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) return false;
  if (!receipt.receiptHash || String(receipt.receiptHash).length !== 64) return false;
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) return false;
  if (!receipt.freezeObserve.tipSealSeparate) return false;
  if (!receipt.freezeObserve.l37AutoCloseRefused) return false;
  if (!receipt.freezeObserve.l36ReopenRefused) return false;
  if (!receipt.freezeObserve.schemasAtCeiling) return false;
  return true;
}