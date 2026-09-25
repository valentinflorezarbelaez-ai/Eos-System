/**
 * @module policy-pack-binding-receipt
 * SPEC-0152 / Mission EP — Sovereign Policy-Pack Binding & Evaluation Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     bindingDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   binding,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35ReopenRefused, l36ReopenRefused,
 *                   l37AutoCloseRefused,
 *                   remotePolicyEngineRefused, wallClockAuthorityRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   packHold { hermeticInMemoryOnly: true, failClosed: true,
 *                remotePolicyEngineRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true,
 *                distinctFromEoFeatureFlag: true,
 *                distinctFromDxCircuitBreaker: true,
 *                distinctFromEjAdmission: true,
 *
 * Freeze soft-observe pin is `75131386` (EO #506 merge (post tip-refresh #507 soft-observe) pin).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EO feature-flag / FDIR trip (fold killswitch concerns into
 * fail-closed binding governance, but do NOT reopen DX circuit breaker as the axis).
 * Distinct from EJ/EK/EL/EM (admission/backpressure) and EH (temporal honesty).
 *
 * PRODUCTION_READY: NO
 * PASS = sealed policy-pack binding receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live remote policy engine ≠ wall-clock authority ≠ EO flag port
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EP_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EP_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EP_RECEIPT_KIND = 'eos-policy-pack-binding-receipt';
export const EP_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EP_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EP_OPERATION = 'POLICY_PACK_BINDING_EVALUATION';
export const EP_BINDING_STATES = Object.freeze(['BOUND', 'UNBOUND', 'HOLD']);

export const EP_FREEZE_PIN = '75131386ba7f970a9e273ff35aa678821115c091';
export const EP_FREEZE_PIN_SHORT = '75131386';

export const EP_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Policy-Pack Binding & Evaluation ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live remote policy engine',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 auto-close refused (EQ–ES pending)',
  'NON-CLAIM: Live remote policy engine / wall-clock authority refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EO feature-flag / FDIR trip — fail-closed binding governance only',
  'NON-CLAIM: Distinct from EJ/EK/EL/EM admission/backpressure and EH temporal honesty',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed policy-pack binding ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EP_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EP_PACK_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  remotePolicyEngineRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  distinctFromEoFeatureFlag: true,
  distinctFromDxCircuitBreaker: true,
  distinctFromEjAdmission: true,
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
    pin: EP_FREEZE_PIN,
    pinShort: EP_FREEZE_PIN_SHORT,
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
    remotePolicyEngineRefused: true,
    wallClockAuthorityRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EP_FREEZE_NONCLAIM_LABELS,
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

export function forcePackHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    remotePolicyEngineRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    distinctFromEoFeatureFlag: true,
    distinctFromDxCircuitBreaker: true,
    distinctFromEjAdmission: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalPolicyPackBindingSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    bindingDigest: receipt.bindingDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Policy-Pack Binding & Evaluation Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildPolicyPackBindingReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EP-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ep-default');
  const changeId = String(input.changeId || 'eos-ladder-37-mission-ep');
  const decision = EP_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EP_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const binding = input.binding || null;
  const bindingDigest =
    input.bindingDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, binding }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EP_OPERATION,
    planId,
    decision,
    changeId,
    bindingDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EP_RECEIPT_KIND,
    receiptId,
    operation: EP_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    bindingDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    binding,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    packHold: forcePackHold(input.packHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyPolicyPackBindingReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EP_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EP_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EP_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalPolicyPackBindingSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
