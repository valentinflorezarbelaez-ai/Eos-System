/**
 * @module ladder35-seam-receipt
 * SPEC-0145 / Mission EI — Ladder 35 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 * Soft-observe pin: bdd53e30 (tip-refresh-post-482 / PR #483 pin to EH merge #482). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EI_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EI_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EI_RECEIPT_KIND = 'eos-ladder35-seam-receipt';
export const EI_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EI_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EI_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'LADDER35_SEAM_PACK_CLOSEOUT',
  'SEAM_CHAIN_EE_EF_EG_EH',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const EI_FREEZE_PIN = 'bdd53e30015040223267146ef551064473d771d1';
export const EI_FREEZE_PIN_SHORT = 'bdd53e30';

export const EI_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 35 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L35 CLOSED is SEPARATE after EI merge + tip-refresh',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: Seam-pack closeout != Formal L35 CLOSED (tip-seal later)',
  'NON-CLAIM: Tip-seal-in-product claim refused',
  'NON-CLAIM: Schema-json add refused (AT_CEILING 35/35)',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = L35 seam chaining EE->EF->EG->EH + closeout satellite != PRODUCTION_READY != Formal L35 CLOSED'
]);

export const EI_CEILING_HOLD_TEMPLATE = Object.freeze({ schemasAtCeiling: true, slimHold: true, schemaJsonAddRefused: true });
export const EI_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l35AutoCloseRefused: true,
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
    pin: EI_FREEZE_PIN,
    pinShort: EI_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35AutoCloseRefused: true,
    tipSealSeparate: true,
    tipSealInProductClaimRefused: true,
    schemasAtCeiling: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EI_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function buildLadder35SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const receiptId = 'EI-RCPT-' + seq + '-' + sha256Canonical(opts.planId || 'plan').slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = opts.decision || 'PASS';
  const operation = opts.operation || 'LADDER35_SEAM_PACK_CLOSEOUT';
  const planId = opts.planId || 'plan-unknown';
  const changeId = opts.changeId || 'eos-ladder-35-mission-ei';
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
    productionReady: EI_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: { ...EI_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) },
    seamHold: { ...EI_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) },
    chainObserve: Object.freeze({
      softImport: true,
      eeObserved: !!(opts.chainObserve && opts.chainObserve.eeObserved),
      efObserved: !!(opts.chainObserve && opts.chainObserve.efObserved),
      egObserved: !!(opts.chainObserve && opts.chainObserve.egObserved),
      ehObserved: !!(opts.chainObserve && opts.chainObserve.ehObserved),
      prefixes: (opts.chainObserve && opts.chainObserve.prefixes) || []
    }),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {}),
    kind: EI_RECEIPT_KIND
  });
}

export function verifyLadder35SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!String(receipt.receiptId || '').startsWith('EI-RCPT-')) return false;
  if (receipt.fundacionDelta !== 0) return false;
  if (receipt.productionReady !== 'NO') return false;
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) return false;
  if (!receipt.receiptHash || String(receipt.receiptHash).length !== 64) return false;
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) return false;
  if (!receipt.freezeObserve.tipSealSeparate) return false;
  if (!receipt.freezeObserve.l35AutoCloseRefused) return false;
  if (!receipt.freezeObserve.schemasAtCeiling) return false;
  return true;
}
