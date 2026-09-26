/**
 * @module ladder40-seam-receipt
 * SPEC-0170 / Mission FH — Ladder 40 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 * Soft-observe pin: 1376ac54 (FG merge #557 / tip-refresh #558). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FH_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FH_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FH_RECEIPT_KIND = 'eos-ladder40-seam-receipt';
export const FH_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FH_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FH_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'LADDER40_SEAM_PACK_CLOSEOUT',
  'SEAM_CHAIN_FD_FE_FF_FG',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const FH_FREEZE_PIN = '1376ac546764a8a4df7ed85677241ae8e98abe54';
export const FH_FREEZE_PIN_SHORT = '1376ac54';

export const FH_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 40 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
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
  'NON-CLAIM: L40 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L40 CLOSED is SEPARATE after FH merge + tip-refresh',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: Seam-pack closeout != Formal L40 CLOSED (tip-seal later)',
  'NON-CLAIM: Tip-seal-in-product claim refused',
  'NON-CLAIM: Schema-json add refused (AT_CEILING 35/35)',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: Distinct from FC L39 seam / EX L38 / ES L37 / EN L36 / EI L35 / AU secrets runtime',
  'NON-CLAIM: FD/FE/FF/FG product reopen refused',
  'NON-CLAIM: AU secrets runtime reopen refused',
  'NON-CLAIM: Law VI — zero secrets; opaque digests/handles only',
  'NON-CLAIM: PASS = L40 seam chaining FD->FE->FF->FG + closeout satellite != PRODUCTION_READY != Formal L40 CLOSED'
]);

export const FH_CEILING_HOLD_TEMPLATE = Object.freeze({ schemasAtCeiling: true,
    auSecretsRuntimeReopenRefused: true,
    secretMaterialRefused: true, slimHold: true, schemaJsonAddRefused: true });
export const FH_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l40AutoCloseRefused: true,
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
    pin: FH_FREEZE_PIN,
    pinShort: FH_FREEZE_PIN_SHORT,
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
    l40AutoCloseRefused: true,
    tipSealSeparate: true,
    tipSealInProductClaimRefused: true,
    schemasAtCeiling: true,
    auSecretsRuntimeReopenRefused: true,
    secretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FH_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function buildLadder40SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const receiptId = 'FH-RCPT-' + seq + '-' + sha256Canonical(opts.planId || 'plan').slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = opts.decision || 'PASS';
  const operation = opts.operation || 'LADDER40_SEAM_PACK_CLOSEOUT';
  const planId = opts.planId || 'plan-unknown';
  const changeId = opts.changeId || 'eos-ladder-40-mission-fh';
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
    productionReady: FH_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: { ...FH_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) },
    seamHold: { ...FH_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) },
    chainObserve: Object.freeze({
      softImport: true,
      fdObserved: !!(opts.chainObserve && opts.chainObserve.fdObserved),
      feObserved: !!(opts.chainObserve && opts.chainObserve.feObserved),
      ffObserved: !!(opts.chainObserve && opts.chainObserve.ffObserved),
      fgObserved: !!(opts.chainObserve && opts.chainObserve.fgObserved),
      prefixes: (opts.chainObserve && opts.chainObserve.prefixes) || []
    }),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {}),
    kind: FH_RECEIPT_KIND
  });
}

export function verifyLadder40SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!String(receipt.receiptId || '').startsWith('FH-RCPT-')) return false;
  if (receipt.fundacionDelta !== 0) return false;
  if (receipt.productionReady !== 'NO') return false;
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) return false;
  if (!receipt.receiptHash || String(receipt.receiptHash).length !== 64) return false;
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) return false;
  if (!receipt.freezeObserve.tipSealSeparate) return false;
  if (!receipt.freezeObserve.l40AutoCloseRefused) return false;
  if (!receipt.freezeObserve.l38ReopenRefused) return false;
  if (!receipt.freezeObserve.l39ReopenRefused) return false;
  if (!receipt.freezeObserve.schemasAtCeiling) return false;
  return true;
}
