/**
 * @module hitl-escalation-federation-receipt
 * SPEC-0092 / Mission CI — Human Authority Escalation Federation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, escalationId, decision, irreversibilityClass,
 *     operatorDecision, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   projectId, missionId, reasons[], escalationDigest?
 *
 * NON-CLAIM:
 *   Human Authority Escalation Federation ≠ autonomous approval of irreversible actions /
 *   human remains authority /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit + CG + CH MEASURED · CI in progress · CJ–CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/authority.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CI_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CI_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CI_RECEIPT_KIND = 'eos-hitl-escalation-federation-receipt';

export const CI_OPERATOR_DECISIONS = Object.freeze([
  'APPROVE',
  'REJECT',
  'DEFER'
]);

export const CI_IRREVERSIBILITY_CLASSES = Object.freeze([
  'REVERSIBLE',
  'PARTIALLY_REVERSIBLE',
  'IRREVERSIBLE'
]);

export const CI_DECISIONS = Object.freeze(['ESCALATE', 'HOLD', 'DENY']);

/**
 * Stable JSON stringify (sorted keys) for deterministic digests.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(/** @type {Record<string, unknown>} */ (value)[k]);
  }
  return out;
}

/**
 * sha256 hex digest of canonical payload (node:crypto).
 * @param {unknown} payload
 * @returns {string}
 */
export function sha256Canonical(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Alias used by injectable hash opts. */
export function defaultHash(payload) {
  return sha256Canonical(payload);
}

let _rcptSeq = 0;

/**
 * Reset in-process receipt sequence (tests only).
 */
export function _resetReceiptSeqForTests() {
  _rcptSeq = 0;
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalHitlEscalationFederationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    escalationId:
      fields.escalationId != null ? String(fields.escalationId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    irreversibilityClass:
      fields.irreversibilityClass != null
        ? String(fields.irreversibilityClass)
        : null,
    operatorDecision:
      fields.operatorDecision != null ? String(fields.operatorDecision) : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receiptHash over the canonical nine fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashHitlEscalationFederationReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalHitlEscalationFederationSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyHitlEscalationFederationReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CI_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CI_RECEIPT_KIND}, got ${receipt.kind}`
    };
  }

  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  if (receipt.fundacionDelta !== 0) {
    return {
      ok: false,
      reason: `fundacionDelta must be 0, got ${receipt.fundacionDelta}`
    };
  }

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CI-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CI-RCPT-' };
  }

  const expectedHash = hashHitlEscalationFederationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CI-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildHitlEscalationFederationReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CI-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const projectId =
    fields.projectId != null && fields.projectId !== ''
      ? String(fields.projectId)
      : null;
  const missionId =
    fields.missionId != null && fields.missionId !== ''
      ? String(fields.missionId)
      : null;

  const escalationDigest =
    fields.escalationDigest != null && fields.escalationDigest !== ''
      ? String(fields.escalationDigest)
      : hashFn({
          escalationId: fields.escalationId || null,
          projectId,
          missionId,
          operatorDecision: fields.operatorDecision || null,
          irreversibilityClass: fields.irreversibilityClass || null,
          decision: fields.decision || null
        });

  const body = canonicalHitlEscalationFederationSealBody({
    receiptId,
    operation: fields.operation || 'ESCALATE',
    escalationId: fields.escalationId || null,
    decision: fields.decision || 'DENY',
    irreversibilityClass: fields.irreversibilityClass || null,
    operatorDecision: fields.operatorDecision || null,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CI_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    projectId,
    missionId,
    reasons: Object.freeze([...reasons]),
    escalationDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      autonomousApprovalOfIrreversible: false,
      humanRemainsAuthority: true,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CI_PRODUCTION_READY,
  CI_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CI_RECEIPT_KIND,
  CI_OPERATOR_DECISIONS,
  CI_IRREVERSIBILITY_CLASSES,
  CI_DECISIONS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalHitlEscalationFederationSealBody,
  hashHitlEscalationFederationReceipt,
  verifyHitlEscalationFederationReceipt,
  buildHitlEscalationFederationReceipt,
  _resetReceiptSeqForTests
};
