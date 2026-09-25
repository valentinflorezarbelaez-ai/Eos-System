/**
 * @module domain-event-compatibility-receipt
 * SPEC-0139 / Mission EC — Domain Event Compatibility & Evolution Gate Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     compatibilityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   evolution,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34AutoCloseRefused, schemaJsonAddRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   compatibilityHold { hermeticInMemoryOnly: true, networkWriteRefused: true,
 *                       schemaJsonAddRefused: true, tipRewriteRefused: true,
 *                       breakingWithoutDenyRefused: true, governedSealOnly: true }
 *
 * Freeze soft-observe pin is `19b353d8` (PR #465 EB merge / tip-refresh #466).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed compatibility receipt ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EC_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EC_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EC_RECEIPT_KIND = 'eos-domain-event-compatibility-receipt';
export const EC_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EC_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EC_CHANGE_KINDS = Object.freeze([
  'ADD_OPTIONAL_FIELD',
  'RENAME_FORBIDDEN',
  'BREAKING',
  'COMPATIBLE'
]);
export const EC_COMPATIBLE_CHANGE_KINDS = Object.freeze([
  'ADD_OPTIONAL_FIELD',
  'COMPATIBLE'
]);
export const EC_DENIED_CHANGE_KINDS = Object.freeze([
  'RENAME_FORBIDDEN',
  'BREAKING'
]);

export const EC_FREEZE_PIN = '19b353d8fa07ece41df251d4eaeaa8778c13ed81';
export const EC_FREEZE_PIN_SHORT = '19b353d8';

export const EC_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Domain Event Compatibility Gate ≠ PRODUCTION_READY flip ≠ network write ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 auto-close refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Breaking without sealed deny path refused',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed compatibility ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EC_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EC_COMPATIBILITY_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  networkWriteRefused: true,
  schemaJsonAddRefused: true,
  tipRewriteRefused: true,
  breakingWithoutDenyRefused: true,
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
    pin: EC_FREEZE_PIN,
    pinShort: EC_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34AutoCloseRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EC_FREEZE_NONCLAIM_LABELS,
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

export function forceCompatibilityHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    networkWriteRefused: true,
    schemaJsonAddRefused: true,
    tipRewriteRefused: true,
    breakingWithoutDenyRefused: true,
    governedSealOnly: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalDomainEventCompatibilitySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    compatibilityDigest: receipt.compatibilityDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Domain Event Compatibility Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildDomainEventCompatibilityReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EC-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ec-default');
  const changeId = String(input.changeId || 'eos-ladder-34-mission-ec');
  const decision = EC_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EC_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const evolution = input.evolution || null;
  const compatibilityDigest =
    input.compatibilityDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, evolution }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'DOMAIN_EVENT_COMPATIBILITY_GATE',
    planId,
    decision,
    changeId,
    compatibilityDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EC_RECEIPT_KIND,
    receiptId,
    operation: 'DOMAIN_EVENT_COMPATIBILITY_GATE',
    planId,
    decision,
    changeId,
    ritualMode,
    compatibilityDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    evolution,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    compatibilityHold: forceCompatibilityHold(input.compatibilityHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyDomainEventCompatibilityReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EC_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EC_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'DOMAIN_EVENT_COMPATIBILITY_GATE') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalDomainEventCompatibilitySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
