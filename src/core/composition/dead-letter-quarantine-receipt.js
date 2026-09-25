/**
 * @module dead-letter-quarantine-receipt
 * SPEC-0138 / Mission EB — Dead-Letter Quarantine & Poison-Message Governance Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     quarantineDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   quarantine,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34AutoCloseRefused, silentDropRefused, unsupervisedRetryRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   quarantineHold { hermeticInMemoryOnly: true, networkWriteRefused: true,
 *                    liveBrokerWriteRefused: true, silentDropRefused: true,
 *                    unsupervisedRetryRefused: true, governedSealOnly: true }
 *
 * Freeze soft-observe pin is `037f9578` (PR #463 EA merge / tip-refresh #464).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed quarantine receipt ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EB_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EB_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EB_RECEIPT_KIND = 'eos-dead-letter-quarantine-receipt';
export const EB_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EB_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const EB_FREEZE_PIN = '037f95786724936aecf48bf3684b4dd5dc37e815';
export const EB_FREEZE_PIN_SHORT = '037f9578';

export const EB_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Dead-Letter Quarantine Port ≠ PRODUCTION_READY flip ≠ network write ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 auto-close refused',
  'NON-CLAIM: Silent drop refused',
  'NON-CLAIM: Unsupervised retry refused',
  'NON-CLAIM: Live broker write refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed quarantine ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop'
]);

export const EB_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EB_QUARANTINE_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  networkWriteRefused: true,
  liveBrokerWriteRefused: true,
  silentDropRefused: true,
  unsupervisedRetryRefused: true,
  governedSealOnly: true
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
    pin: EB_FREEZE_PIN,
    pinShort: EB_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34AutoCloseRefused: true,
    silentDropRefused: true,
    unsupervisedRetryRefused: true,
    readOnly: true,
    nonClaimLabels: EB_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true,
    ...opts
  });
}

export function forceQuarantineHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    networkWriteRefused: true,
    liveBrokerWriteRefused: true,
    silentDropRefused: true,
    unsupervisedRetryRefused: true,
    governedSealOnly: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalDeadLetterQuarantineSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    quarantineDigest: receipt.quarantineDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Dead-Letter Quarantine Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildDeadLetterQuarantineReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EB-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-eb-default');
  const changeId = String(input.changeId || 'eos-ladder-34-mission-eb');
  const decision = EB_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EB_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const quarantine = input.quarantine || null;
  const quarantineDigest =
    input.quarantineDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, quarantine }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'DEAD_LETTER_QUARANTINE',
    planId,
    decision,
    changeId,
    quarantineDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EB_RECEIPT_KIND,
    receiptId,
    operation: 'DEAD_LETTER_QUARANTINE',
    planId,
    decision,
    changeId,
    ritualMode,
    quarantineDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    quarantine,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    quarantineHold: forceQuarantineHold(input.quarantineHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyDeadLetterQuarantineReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EB_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EB_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'DEAD_LETTER_QUARANTINE') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalDeadLetterQuarantineSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
