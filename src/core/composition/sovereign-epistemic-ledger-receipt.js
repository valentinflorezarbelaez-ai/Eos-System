/**
 * @module sovereign-epistemic-ledger-receipt
 * SPEC-0124 / Mission DN — Sovereign Epistemic Knowledge Ledger Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     epistemicDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   epistemicReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   epistemicHold { epistemicStateGrounded: true, ungroundedClaimsRefused: true }
 *
 * Freeze soft-observe pin is `079e6f2a` / full `079e6f2a9564e70a42738faeab138cc4aa5974fd` (Mission DM tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DN_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DN_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DN_RECEIPT_KIND = 'eos-sovereign-epistemic-ledger-receipt';
export const DN_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DN_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DN_FREEZE_PIN = '079e6f2a9564e70a42738faeab138cc4aa5974fd';
export const DN_FREEZE_PIN_SHORT = '079e6f2a';

export const DN_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Sovereign Epistemic Ledger ≠ PRODUCTION_READY flip ≠ L31 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DN_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DN_EPISTEMIC_HOLD_TEMPLATE = Object.freeze({
  epistemicStateGrounded: true,
  ungroundedClaimsRefused: true
});

export const EPISTEMIC_VALID_STATES = Object.freeze([
  'AUDIT_EXECUTED',
  'FINDINGS_IDENTIFIED',
  'REMEDIATION_REQUIRED',
  'REMEDIATION_IN_PROGRESS',
  'REVALIDATION_REQUIRED',
  'VERIFIED',
  'PRODUCTION_READY_WITHIN_TESTED_SCOPE',
  'PRODUCTION_READY'
]);

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
    pin: DN_FREEZE_PIN,
    pinShort: DN_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DN_FREEZE_NONCLAIM_LABELS
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true
  });
}

export function forceEpistemicHold(opts = {}) {
  return Object.freeze({
    epistemicStateGrounded: true,
    ungroundedClaimsRefused: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalSovereignEpistemicLedgerSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    epistemicDigest: receipt.epistemicDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Sovereign Epistemic Ledger Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildSovereignEpistemicLedgerReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DN-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dn-default');
  const changeId = String(input.changeId || 'eos-ladder-31-mission-dn');
  const decision = DN_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DN_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const epistemicReport = input.epistemicReport || null;
  const epistemicDigest = input.epistemicDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'SOVEREIGN_EPISTEMIC_LEDGER',
    planId,
    decision,
    changeId,
    epistemicDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DN_RECEIPT_KIND,
    receiptId,
    operation: 'SOVEREIGN_EPISTEMIC_LEDGER',
    planId,
    decision,
    changeId,
    ritualMode,
    epistemicDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    epistemicReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    epistemicHold: forceEpistemicHold(input.epistemicHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifySovereignEpistemicLedgerReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DN_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DN_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'SOVEREIGN_EPISTEMIC_LEDGER') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalSovereignEpistemicLedgerSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
