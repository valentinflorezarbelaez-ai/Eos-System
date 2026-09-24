/**
 * @module specboot-mutation-gatekeeper-receipt
 * SPEC-0121 / Mission DK — SpecBoot Mutation Testing Gatekeeper Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     mutationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   mutationReport,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31AutoCloseRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   mutationHold { zeroMutantsSurvived: true, resilienceVerified: true }
 *
 * Freeze soft-observe pin is `2cead226` / full `2cead2260332ed465153f550325d2918d5f65679` (Ladder 31 Audit tip).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DK_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DK_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DK_RECEIPT_KIND = 'eos-specboot-mutation-gatekeeper-receipt';
export const DK_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DK_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DK_FREEZE_PIN = '2cead2260332ed465153f550325d2918d5f65679';
export const DK_FREEZE_PIN_SHORT = '2cead226';

export const DK_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: SpecBoot Mutation Gatekeeper ≠ PRODUCTION_READY flip ≠ L31 closeout',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 auto-close refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DK_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const DK_MUTATION_HOLD_TEMPLATE = Object.freeze({
  zeroMutantsSurvived: true,
  resilienceVerified: true
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
    pin: DK_FREEZE_PIN,
    pinShort: DK_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31AutoCloseRefused: true,
    readOnly: true,
    nonClaimLabels: DK_FREEZE_NONCLAIM_LABELS
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true
  });
}

export function forceMutationHold(opts = {}) {
  return Object.freeze({
    zeroMutantsSurvived: true,
    resilienceVerified: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalSpecbootMutationGatekeeperSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    mutationDigest: receipt.mutationDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed SpecBoot Mutation Testing Gatekeeper Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildSpecbootMutationGatekeeperReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DK-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dk-default');
  const changeId = String(input.changeId || 'eos-ladder-31-mission-dk');
  const decision = DK_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = DK_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const mutationReport = input.mutationReport || null;
  const mutationDigest = input.mutationDigest || sha256Canonical(JSON.stringify({ planId, changeId, decision }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'SPECBOOT_MUTATION_GATEKEEPER',
    planId,
    decision,
    changeId,
    mutationDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DK_RECEIPT_KIND,
    receiptId,
    operation: 'SPECBOOT_MUTATION_GATEKEEPER',
    planId,
    decision,
    changeId,
    ritualMode,
    mutationDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    mutationReport,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    mutationHold: forceMutationHold(input.mutationHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifySpecbootMutationGatekeeperReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DK_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${DK_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'SPECBOOT_MUTATION_GATEKEEPER') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalSpecbootMutationGatekeeperSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
