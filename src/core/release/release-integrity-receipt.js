/**
 * @module release-integrity-receipt
 * SPEC-0098 / Mission CO — Release Integrity & Progressive Honesty Governor Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, releaseId,
 *     integrityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   honestyMode (HOLD|PROMOTE|ROLLBACK_HINT),
 *   attestDigest? (prior CN), bindDigest? (prior CM), linkDigest? (prior CL),
 *   claims[], reasons[], integrityPlanDigest?
 *
 * NON-CLAIM:
 *   Release Integrity & Progressive Honesty Governor Port ≠ Argo/Flagger /
 *   ≠ real canary / ≠ GHE / ≠ PRODUCTION_READY=YES.
 *   L17–L25 CLOSED never reopen;
 *   L26 OPEN (Audit + CL + CM + CN MEASURED · CO in progress · CP pending);
 *   Axis: Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/release.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CO_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CO_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CO_RECEIPT_KIND = 'eos-release-integrity-receipt';

export const CO_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);

export const CO_HONESTY_MODES = Object.freeze([
  'HOLD',
  'PROMOTE',
  'ROLLBACK_HINT'
]);

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
 * Normalize a claim node for sealing / display.
 * @param {unknown} claim
 * @returns {{ claimId: string, claimType: string|null, digest: string|null }|null}
 */
export function normalizeClaim(claim) {
  if (claim == null || typeof claim !== 'object') return null;
  const claimId =
    claim.claimId != null
      ? String(claim.claimId).trim()
      : claim.id != null
        ? String(claim.id).trim()
        : '';
  if (!claimId) return null;
  const claimType =
    claim.claimType != null && String(claim.claimType).trim() !== ''
      ? String(claim.claimType).trim()
      : claim.type != null && String(claim.type).trim() !== ''
        ? String(claim.type).trim()
        : null;
  const digest =
    claim.digest != null && String(claim.digest).trim() !== ''
      ? String(claim.digest).trim()
      : null;
  return { claimId, claimType, digest };
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalReleaseIntegritySealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    releaseId: fields.releaseId != null ? String(fields.releaseId) : null,
    integrityDigest:
      fields.integrityDigest != null && fields.integrityDigest !== ''
        ? String(fields.integrityDigest)
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
export function hashReleaseIntegrityReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalReleaseIntegritySealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyReleaseIntegrityReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CO_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CO_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CO-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CO-RCPT-' };
  }

  if (!CO_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CO_DECISIONS.join('|')}`
    };
  }

  const expectedHash = hashReleaseIntegrityReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CO-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildReleaseIntegrityReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CO-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  /** @type {Array<object>} */
  const claims = [];
  if (Array.isArray(fields.claims)) {
    for (const c of fields.claims) {
      const normalized = normalizeClaim(c);
      if (normalized) claims.push(normalized);
    }
  }

  const honestyMode =
    fields.honestyMode != null &&
    CO_HONESTY_MODES.includes(String(fields.honestyMode))
      ? String(fields.honestyMode)
      : fields.honestyMode != null
        ? String(fields.honestyMode)
        : null;

  const attestDigest =
    fields.attestDigest != null && String(fields.attestDigest).trim() !== ''
      ? String(fields.attestDigest).trim()
      : null;
  const bindDigest =
    fields.bindDigest != null && String(fields.bindDigest).trim() !== ''
      ? String(fields.bindDigest).trim()
      : null;
  const linkDigest =
    fields.linkDigest != null && String(fields.linkDigest).trim() !== ''
      ? String(fields.linkDigest).trim()
      : null;

  const integrityDigest =
    fields.integrityDigest != null && fields.integrityDigest !== ''
      ? String(fields.integrityDigest)
      : hashFn({
          releaseId: fields.releaseId || null,
          claims,
          honestyMode,
          attestDigest,
          bindDigest,
          linkDigest
        });

  const integrityPlanDigest =
    fields.integrityPlanDigest != null && fields.integrityPlanDigest !== ''
      ? String(fields.integrityPlanDigest)
      : hashFn({
          planId: fields.planId || null,
          releaseId: fields.releaseId || null,
          integrityDigest,
          honestyMode,
          decision: fields.decision || null
        });

  const body = canonicalReleaseIntegritySealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    releaseId: fields.releaseId || null,
    integrityDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CO_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    honestyMode,
    attestDigest,
    bindDigest,
    linkDigest,
    claims: Object.freeze(claims.map((c) => Object.freeze({ ...c }))),
    reasons: Object.freeze([...reasons]),
    integrityPlanDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      argoFlagger: false,
      realCanary: false,
      progressiveDeliverySaas: false,
      ghEnterpriseEnforcement: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CO_PRODUCTION_READY,
  CO_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CO_RECEIPT_KIND,
  CO_DECISIONS,
  CO_HONESTY_MODES,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeClaim,
  canonicalReleaseIntegritySealBody,
  hashReleaseIntegrityReceipt,
  verifyReleaseIntegrityReceipt,
  buildReleaseIntegrityReceipt,
  _resetReceiptSeqForTests
};
