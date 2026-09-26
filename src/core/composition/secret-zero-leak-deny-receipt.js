/**
 * @module secret-zero-leak-deny-receipt
 * SPEC-0157 / Mission EU — Secret-Zero Leak-Deny & Redaction Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     redactionDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   claim,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l37ReopenRefused,
 *                   l38AutoCloseRefused,
 *                   liveSecretStoreRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   leakHold { hermeticInMemoryOnly: true, failClosed: true,
 *                liveSecretStoreRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, secretMaterialRefused: true,
 *                secretZeroHeld: true,
 *                distinctFromEoFeatureFlag: true,
 *                distinctFromEpPolicyPack: true,
 *                distinctFromEqStagedActivation: true,
 *                distinctFromErConfigHonesty: true,
 *                distinctFromEtCredentialHandleRegistry: true,
  distinctFromAuSecretLeakGuard: true }
 *
 * Freeze soft-observe pin is `bc24c17b` (ET #521 / current EXPECTED_TIP after tip-refresh #522). Soft-observe only.
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EO feature-flag, EP policy-pack, EQ staged activation, ER config honesty.
 * Distinct from Mission AU src/core/secrets/* (runtime broker ≠ composition port).
 * Fold AU concepts into semantics; do NOT reopen AU or copy secret material into receipts.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed credential-handle registry claim ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live secret store ≠ wall-clock authority ≠ EO/EP/EQ/ER/AU ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EU_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EU_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EU_RECEIPT_KIND = 'eos-secret-zero-leak-deny-receipt';
export const EU_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const EU_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EU_OPERATION = 'SECRET_ZERO_LEAK_DENY_REDACTION';
export const EU_DESIRED_ACTIONS = Object.freeze(['DENY_LEAK', 'REDACT', 'HOLD']);
export const EU_SUBJECT_KINDS = Object.freeze([
  'RECEIPT',
  'LOG',
  'FEDERATION_BODY',
  'COMPOSITE'
]);
export const EU_LEAK_CLASSES = Object.freeze(['NONE', 'SUSPECTED', 'CONFIRMED']);

export const EU_FREEZE_PIN = 'bc24c17bbb0b580b70ae4eeb0277630536002f51';
export const EU_FREEZE_PIN_SHORT = 'bc24c17b';

export const EU_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Secret-Zero Leak-Deny & Claim ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live secret store',
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
  'NON-CLAIM: L38 auto-close refused (EV–EX pending)',
  'NON-CLAIM: Live secret store / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw secret material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EO feature-flag / EP policy-pack / EQ staged activation / ER config honesty',
  'NON-CLAIM: Distinct from ET credential-handle registry (bind ≠ leak-deny)',
  'NON-CLAIM: Distinct from AU secret-runtime-broker (runtime ≠ composition port)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed credential-handle claim ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EU_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EU_LEAK_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveSecretStoreRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  secretMaterialRefused: true,
  secretZeroHeld: true,
  distinctFromEoFeatureFlag: true,
  distinctFromEpPolicyPack: true,
  distinctFromEqStagedActivation: true,
  distinctFromErConfigHonesty: true,
  distinctFromAuSecretLeakGuard: true
});

let _receiptSeq = 0;

export function _resetReceiptSeqForTests() {
  _receiptSeq = 0;
}

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Digests opaque handle metadata only — never secret bytes (Law VI).
 * @param {{ handleId?: string, handleClass?: string, desiredBinding?: string, observedBinding?: string, bindingClass?: string }} meta
 */
export function computeRedactionDigest(meta = {}) {
  const opaqueOnly = {
    subjectKind: meta.subjectKind || null,
    desiredAction: meta.desiredAction || null,
    leakClass: meta.leakClass || null,
    leakDetected:
      typeof meta.leakDetected === 'boolean' ? meta.leakDetected : meta.leakDetected ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: EU_FREEZE_PIN,
    pinShort: EU_FREEZE_PIN_SHORT,
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
    liveSecretStoreRefused: true,
    wallClockAuthorityRefused: true,
    tipRefreshAuthorityRefused: true,
    rawSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EU_FREEZE_NONCLAIM_LABELS,
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

export function forceLeakHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveSecretStoreRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    tipRefreshAuthorityRefused: true,
    rawSecretMaterialRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    secretMaterialRefused: true,
    secretZeroHeld: true,
    distinctFromEoFeatureFlag: true,
    distinctFromEpPolicyPack: true,
    distinctFromEqStagedActivation: true,
    distinctFromErConfigHonesty: true,
    distinctFromAuSecretLeakGuard: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalSecretZeroLeakDenySealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    redactionDigest: receipt.redactionDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Secret-Zero Leak-Deny & Claim Receipt.
 * Never seals secret material — only opaque handleId / handleClass / bindingClass / digests.
 * @param {object} input
 * @returns {object}
 */
export function buildSecretZeroLeakDenyReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EU-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-et-default');
  const changeId = String(input.changeId || 'eos-ladder-38-mission-eu');
  const decision = EU_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EU_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const claim = input.claim || null;
  const redactionDigest =
    input.redactionDigest ||
    computeRedactionDigest({
      subjectKind: claim?.subjectKind,
      desiredAction: claim?.desiredAction,
      leakClass: claim?.leakClass,
      leakDetected: claim?.observedScan?.leakDetected
    });
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EU_OPERATION,
    planId,
    decision,
    changeId,
    redactionDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EU_RECEIPT_KIND,
    receiptId,
    operation: EU_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    redactionDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    claim,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    leakHold: forceLeakHold(input.leakHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifySecretZeroLeakDenyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EU_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EU_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EU_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalSecretZeroLeakDenySealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
