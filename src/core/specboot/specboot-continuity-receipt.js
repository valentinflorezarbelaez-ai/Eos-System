/**
 * @module specboot-continuity-receipt
 * SPEC-0102 / Mission CS — SpecBoot Operator Continuity Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     continuityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   continuityMode (ACTIVE|HOLD), lidrStep, frictionOk?,
 *   refuseCodes[], humanGateHeld?, autoSealRefused?, autoProductionFlipRefused?,
 *   reasons[], continuityPlanDigest?, meta?
 *
 * NON-CLAIM:
 *   SpecBoot Operator Continuity Port ≠ automatic closure /
 *   ≠ PRODUCTION_READY flip / ≠ full SpecBoot CLI rewrite /
 *   ≠ Fundacion writes (Δ=0) / ≠ reopen L26 / ≠ L27 closeout.
 *   L17–L26 CLOSED never reopen (NEVER reopen L26);
 *   L27 OPEN (Audit MEASURED · CQ MEASURED · CR MEASURED · CS in progress · CT–CU pending);
 *   Axis: Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/specboot.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CS_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CS_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CS_RECEIPT_KIND = 'eos-specboot-continuity-receipt';

export const CS_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);

export const CS_CONTINUITY_MODES = Object.freeze(['ACTIVE', 'HOLD']);

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
export function canonicalSpecbootContinuitySealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    continuityDigest:
      fields.continuityDigest != null && fields.continuityDigest !== ''
        ? String(fields.continuityDigest)
        : null,
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
export function hashSpecbootContinuityReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalSpecbootContinuitySealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifySpecbootContinuityReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CS_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CS_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CS-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CS-RCPT-' };
  }

  if (!CS_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CS_DECISIONS.join('|')}`
    };
  }

  const expectedHash = hashSpecbootContinuityReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CS-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildSpecbootContinuityReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CS-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const continuityMode =
    fields.continuityMode != null &&
    CS_CONTINUITY_MODES.includes(String(fields.continuityMode).toUpperCase())
      ? String(fields.continuityMode).toUpperCase()
      : fields.continuityMode != null
        ? String(fields.continuityMode)
        : null;

  const refuseCodes = Array.isArray(fields.refuseCodes)
    ? fields.refuseCodes.map((c) => String(c))
    : [];

  const continuityDigest =
    fields.continuityDigest != null && fields.continuityDigest !== ''
      ? String(fields.continuityDigest)
      : hashFn({
          changeId: fields.changeId || null,
          continuityMode,
          lidrStep: fields.lidrStep || null,
          frictionOk: fields.frictionOk ?? null,
          refuseCodes
        });

  const continuityPlanDigest =
    fields.continuityPlanDigest != null && fields.continuityPlanDigest !== ''
      ? String(fields.continuityPlanDigest)
      : hashFn({
          planId: fields.planId || null,
          changeId: fields.changeId || null,
          continuityDigest,
          continuityMode,
          decision: fields.decision || null
        });

  const body = canonicalSpecbootContinuitySealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    changeId: fields.changeId || null,
    continuityDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CS_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    continuityMode,
    lidrStep: fields.lidrStep != null ? String(fields.lidrStep) : null,
    frictionOk:
      fields.frictionOk === true
        ? true
        : fields.frictionOk === false
          ? false
          : null,
    refuseCodes: Object.freeze([...refuseCodes]),
    humanGateHeld: fields.humanGateHeld === true,
    autoSealRefused: fields.autoSealRefused === true,
    autoProductionFlipRefused: fields.autoProductionFlipRefused === true,
    reasons: Object.freeze([...reasons]),
    continuityPlanDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      automaticClosure: false,
      productionReadyFlip: false,
      fullSpecbootRewrite: false,
      fundacionTouch: false,
      productionReady: false,
      l26Reopen: false,
      l27Closeout: false
    })
  });
}

export default {
  CS_PRODUCTION_READY,
  CS_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CS_RECEIPT_KIND,
  CS_DECISIONS,
  CS_CONTINUITY_MODES,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalSpecbootContinuitySealBody,
  hashSpecbootContinuityReceipt,
  verifySpecbootContinuityReceipt,
  buildSpecbootContinuityReceipt,
  _resetReceiptSeqForTests
};
