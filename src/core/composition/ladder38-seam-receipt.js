/**
 * @module ladder38-seam-receipt
 * SPEC-0160 / Mission EX — Ladder 38 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 * Soft-observe pin: b09467a2 (EW merge #527). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EX_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EX_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EX_RECEIPT_KIND = 'eos-ladder38-seam-receipt';
export const EX_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EX_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EX_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'LADDER38_SEAM_PACK_CLOSEOUT',
  'SEAM_CHAIN_ET_EU_EV_EW',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const EX_FREEZE_PIN = 'b09467a2163286d81d14ab893839dfe091c588b8';
export const EX_FREEZE_PIN_SHORT = 'b09467a2';

export const EX_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 38 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
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
  'NON-CLAIM: L38 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L38 CLOSED is SEPARATE after ES merge + tip-refresh',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: Seam-pack closeout != Formal L38 CLOSED (tip-seal later)',
  'NON-CLAIM: Tip-seal-in-product claim refused',
  'NON-CLAIM: Schema-json add refused (AT_CEILING 35/35)',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: Distinct from ES L37 seam / EN L36 / EI L35 / AU secrets runtime',
  'NON-CLAIM: AU secrets runtime reopen refused',
  'NON-CLAIM: Law VI — zero secrets; opaque digests/handles only',
  'NON-CLAIM: PASS = L38 seam chaining ET->EU->EV->EW + closeout satellite != PRODUCTION_READY != Formal L38 CLOSED'
]);

export const EX_CEILING_HOLD_TEMPLATE = Object.freeze({ schemasAtCeiling: true,
    auSecretsRuntimeReopenRefused: true,
    secretMaterialRefused: true, slimHold: true, schemaJsonAddRefused: true });
export const EX_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l38AutoCloseRefused: true,
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
    pin: EX_FREEZE_PIN,
    pinShort: EX_FREEZE_PIN_SHORT,
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
    l38AutoCloseRefused: true,
    tipSealSeparate: true,
    tipSealInProductClaimRefused: true,
    schemasAtCeiling: true,
    auSecretsRuntimeReopenRefused: true,
    secretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EX_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function buildLadder38SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const receiptId = 'EX-RCPT-' + seq + '-' + sha256Canonical(opts.planId || 'plan').slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = opts.decision || 'PASS';
  const operation = opts.operation || 'LADDER38_SEAM_PACK_CLOSEOUT';
  const planId = opts.planId || 'plan-unknown';
  const changeId = opts.changeId || 'eos-ladder-38-mission-ex';
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
    productionReady: EX_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: { ...EX_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) },
    seamHold: { ...EX_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) },
    chainObserve: Object.freeze({
      softImport: true,
      etObserved: !!(opts.chainObserve && opts.chainObserve.etObserved),
      euObserved: !!(opts.chainObserve && opts.chainObserve.euObserved),
      evObserved: !!(opts.chainObserve && opts.chainObserve.evObserved),
      ewObserved: !!(opts.chainObserve && opts.chainObserve.ewObserved),
      prefixes: (opts.chainObserve && opts.chainObserve.prefixes) || []
    }),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {}),
    kind: EX_RECEIPT_KIND
  });
}

export function verifyLadder38SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!String(receipt.receiptId || '').startsWith('EX-RCPT-')) return false;
  if (receipt.fundacionDelta !== 0) return false;
  if (receipt.productionReady !== 'NO') return false;
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) return false;
  if (!receipt.receiptHash || String(receipt.receiptHash).length !== 64) return false;
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) return false;
  if (!receipt.freezeObserve.tipSealSeparate) return false;
  if (!receipt.freezeObserve.l38AutoCloseRefused) return false;
  if (!receipt.freezeObserve.l36ReopenRefused) return false;
  if (!receipt.freezeObserve.l37ReopenRefused) return false;
  if (!receipt.freezeObserve.schemasAtCeiling) return false;
  return true;
}