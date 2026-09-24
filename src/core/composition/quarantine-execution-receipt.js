/**
 * @module quarantine-execution-receipt
 * SPEC-0117 / Mission DH — Quarantine / Soft-Remove Execution Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     manifestDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   executionMode (ACTIVE|HOLD|DRY_RUN),
 *   quarantinedPaths[],
 *   quarantineDir,
 *   dgReceiptLink,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   hardDeleteRefused, massPruneRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true }
 *
 * NON-CLAIM:
 *   Quarantine Execution ≠ destructive delete ≠ mass prune ≠
 *   Fundacion Δ>0 ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠
 *   L29 reopen ≠ L30 auto-close ≠ GHE ≠ CloudAgent
 *   Zero data destruction: soft isolation only.
 *
 * Freeze soft-observe pin is `06af7278` / full `06af7278d6bdf3b55c65a044bfb22ce93e6205cf`.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DH_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DH_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DH_RECEIPT_KIND = 'eos-quarantine-execution-receipt';
export const DH_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DH_EXECUTION_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const DH_FREEZE_PIN = '06af7278d6bdf3b55c65a044bfb22ce93e6205cf';
export const DH_FREEZE_PIN_SHORT = '06af7278';

export const DH_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Quarantine Execution ≠ destructive delete ≠ mass prune ≠ Fundacion Δ>0',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L29 reopen refused',
  'NON-CLAIM: L30 auto-close refused',
  'NON-CLAIM: Hard delete refused — soft quarantine isolation only',
  'NON-CLAIM: CloudAgent out of path'
]);

export const DH_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
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
    pin: DH_FREEZE_PIN,
    pinShort: DH_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    hardDeleteRefused: true,
    massPruneRefused: true,
    readOnly: true,
    nonClaimLabels: DH_FREEZE_NONCLAIM_LABELS
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true
  });
}

/**
 * Normalizes quarantined file paths
 * @param {string[]} paths
 * @returns {string[]}
 */
export function normalizeQuarantinedPaths(paths) {
  if (!Array.isArray(paths)) return [];
  return [...new Set(paths.map(p => String(p).trim()).filter(Boolean))].sort();
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalQuarantineExecutionSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    manifestDigest: receipt.manifestDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Quarantine Execution Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildQuarantineExecutionReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `DH-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-dh-default');
  const changeId = String(input.changeId || 'eos-ladder-30-mission-dh');
  const decision = DH_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const executionMode = DH_EXECUTION_MODES.includes(input.executionMode) ? input.executionMode : 'ACTIVE';
  const quarantinedPaths = normalizeQuarantinedPaths(input.quarantinedPaths);
  const quarantineDir = input.quarantineDir || `.quarantine/${new Date().toISOString().slice(0, 10)}`;
  const manifestDigest = input.manifestDigest || sha256Canonical(JSON.stringify(quarantinedPaths));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);
  const dgReceiptLink = input.dgReceiptLink || null;

  const rawSeal = {
    receiptId,
    operation: 'QUARANTINE_EXECUTE',
    planId,
    decision,
    changeId,
    manifestDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: DH_RECEIPT_KIND,
    receiptId,
    operation: 'QUARANTINE_EXECUTE',
    planId,
    decision,
    changeId,
    executionMode,
    manifestDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    quarantinedPaths: Object.freeze([...quarantinedPaths]),
    quarantineDir,
    dgReceiptLink,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyQuarantineExecutionReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== DH_RECEIPT_KIND) {
    return { ok: false, reason: 'Kind mismatch' };
  }

  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'Fundacion delta must be 0' };
  }

  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'PRODUCTION_READY must be NO' };
  }

  const sealBody = canonicalQuarantineExecutionSealBody(receipt);
  const expectedHash = sha256Canonical(sealBody);

  if (expectedHash !== receipt.receiptHash) {
    return { ok: false, reason: 'Receipt hash mismatch (tampering detected)' };
  }

  return { ok: true };
}
