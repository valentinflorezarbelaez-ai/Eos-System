/**
 * @module ladder39-seam-receipt
 * SPEC-0165 / Mission FC — Ladder 39 CI Seam-Pack Consolidation & Closeout Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 * Soft-observe pin: d1041230 (FB merge #542 / tip-refresh #543). Tip-seal SEPARATE.
 * PRODUCTION_READY: NO
 */
import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FC_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FC_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FC_RECEIPT_KIND = 'eos-ladder39-seam-receipt';
export const FC_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FC_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FC_OPERATIONS = Object.freeze([
  'SEAM_GOVERN',
  'LADDER39_SEAM_PACK_CLOSEOUT',
  'SEAM_CHAIN_EY_EZ_FA_FB',
  'SEAM_HOLD',
  'SEAM_DENY'
]);

export const FC_FREEZE_PIN = 'd1041230300465e6516e8d78725bebadb93fcaa2';
export const FC_FREEZE_PIN_SHORT = 'd1041230';

export const FC_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Ladder 39 Seam-Pack != PRODUCTION_READY flip != tip rewrite',
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
  'NON-CLAIM: L39 auto-close refused without humanGateHeld (tip-seal SEPARATE)',
  'NON-CLAIM: Tip-seal L39 CLOSED is SEPARATE after FC merge + tip-refresh',
  'NON-CLAIM: Seam-pack != GitHub Enterprise / != GHE enforcement',
  'NON-CLAIM: Seam-pack closeout != Formal L39 CLOSED (tip-seal later)',
  'NON-CLAIM: Tip-seal-in-product claim refused',
  'NON-CLAIM: Schema-json add refused (AT_CEILING 35/35)',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: Distinct from EX L38 seam / ES L37 / EN L36 / EI L35 / AU secrets runtime',
  'NON-CLAIM: EY/EZ/FA/FB product reopen refused',
  'NON-CLAIM: AU secrets runtime reopen refused',
  'NON-CLAIM: Law VI — zero secrets; opaque digests/handles only',
  'NON-CLAIM: PASS = L39 seam chaining EY->EZ->FA->FB + closeout satellite != PRODUCTION_READY != Formal L39 CLOSED'
]);

export const FC_CEILING_HOLD_TEMPLATE = Object.freeze({ schemasAtCeiling: true,
    auSecretsRuntimeReopenRefused: true,
    secretMaterialRefused: true, slimHold: true, schemaJsonAddRefused: true });
export const FC_SEAM_HOLD_TEMPLATE = Object.freeze({
  failClosed: true,
  tipSealSeparate: true,
  tipRewriteRefused: true,
  l39AutoCloseRefused: true,
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
    pin: FC_FREEZE_PIN,
    pinShort: FC_FREEZE_PIN_SHORT,
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
    l39AutoCloseRefused: true,
    tipSealSeparate: true,
    tipSealInProductClaimRefused: true,
    schemasAtCeiling: true,
    auSecretsRuntimeReopenRefused: true,
    secretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: FC_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function buildLadder39SeamReceipt(opts = {}) {
  _receiptSeq += 1;
  const seq = String(_receiptSeq).padStart(4, '0');
  const receiptId = 'FC-RCPT-' + seq + '-' + sha256Canonical(opts.planId || 'plan').slice(0, 8);
  const timestamp = opts.timestamp || new Date().toISOString();
  const decision = opts.decision || 'PASS';
  const operation = opts.operation || 'LADDER39_SEAM_PACK_CLOSEOUT';
  const planId = opts.planId || 'plan-unknown';
  const changeId = opts.changeId || 'eos-ladder-39-mission-fc';
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
    productionReady: FC_PRODUCTION_READY,
    freezeObserve: forceFreezeObserve(opts.freezeObserve || {}),
    ceilingHold: { ...FC_CEILING_HOLD_TEMPLATE, ...(opts.ceilingHold || {}) },
    seamHold: { ...FC_SEAM_HOLD_TEMPLATE, ...(opts.seamHold || {}) },
    chainObserve: Object.freeze({
      softImport: true,
      eyObserved: !!(opts.chainObserve && opts.chainObserve.eyObserved),
      ezObserved: !!(opts.chainObserve && opts.chainObserve.ezObserved),
      faObserved: !!(opts.chainObserve && opts.chainObserve.faObserved),
      fbObserved: !!(opts.chainObserve && opts.chainObserve.fbObserved),
      prefixes: (opts.chainObserve && opts.chainObserve.prefixes) || []
    }),
    satelliteReceipts: Object.freeze(opts.satelliteReceipts || {}),
    kind: FC_RECEIPT_KIND
  });
}

export function verifyLadder39SeamReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!String(receipt.receiptId || '').startsWith('FC-RCPT-')) return false;
  if (receipt.fundacionDelta !== 0) return false;
  if (receipt.productionReady !== 'NO') return false;
  if (!receipt.seamDigest || String(receipt.seamDigest).length !== 64) return false;
  if (!receipt.receiptHash || String(receipt.receiptHash).length !== 64) return false;
  if (!receipt.freezeObserve || receipt.freezeObserve.readOnly !== true) return false;
  if (!receipt.freezeObserve.tipSealSeparate) return false;
  if (!receipt.freezeObserve.l39AutoCloseRefused) return false;
  if (!receipt.freezeObserve.l37ReopenRefused) return false;
  if (!receipt.freezeObserve.l38ReopenRefused) return false;
  if (!receipt.freezeObserve.schemasAtCeiling) return false;
  return true;
}
