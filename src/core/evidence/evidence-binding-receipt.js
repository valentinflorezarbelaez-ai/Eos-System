/**
 * @module evidence-binding-receipt
 * SPEC-0096 / Mission CM — Evidence Binding & Claim Custody Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, claimCount,
 *     claimsDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   claims[] { claimId, evidenceDigest, linkDigest?, specId?, codePath? },
 *   reasons[], bindingDigest?
 *
 * NON-CLAIM:
 *   Evidence Binding & Claim Custody Port ≠ WORM SaaS /
 *   ≠ external audit product /
 *   ≠ SIEM retention SaaS / ≠ production data lake /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L25 CLOSED never reopen;
 *   L26 OPEN (Audit + CL MEASURED · CM in progress · CN–CP pending);
 *   Axis: Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/evidence.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CM_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CM_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CM_RECEIPT_KIND = 'eos-evidence-binding-receipt';

export const CM_DECISIONS = Object.freeze(['PASS', 'DENY']);

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
 * Normalize a claim binding node for sealing / display.
 * @param {unknown} claim
 * @returns {{ claimId: string, evidenceDigest: string, linkDigest: string|null, specId: string|null, codePath: string|null }|null}
 */
export function normalizeClaim(claim) {
  if (claim == null || typeof claim !== 'object') return null;
  const claimId = claim.claimId != null ? String(claim.claimId).trim() : '';
  const evidenceDigest =
    claim.evidenceDigest != null && String(claim.evidenceDigest).trim() !== ''
      ? String(claim.evidenceDigest).trim()
      : '';
  if (!claimId || !evidenceDigest) return null;
  const linkDigest =
    claim.linkDigest != null && String(claim.linkDigest).trim() !== ''
      ? String(claim.linkDigest).trim()
      : null;
  const specId =
    claim.specId != null && String(claim.specId).trim() !== ''
      ? String(claim.specId).trim()
      : null;
  const codePath =
    claim.codePath != null && String(claim.codePath).trim() !== ''
      ? String(claim.codePath).trim()
      : null;
  return { claimId, evidenceDigest, linkDigest, specId, codePath };
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalEvidenceBindingSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    claimCount: fields.claimCount != null ? Number(fields.claimCount) : 0,
    claimsDigest:
      fields.claimsDigest != null && fields.claimsDigest !== ''
        ? String(fields.claimsDigest)
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
export function hashEvidenceBindingReceipt(fields, hashFn = sha256Canonical) {
  const body = canonicalEvidenceBindingSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyEvidenceBindingReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CM_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CM_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CM-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CM-RCPT-' };
  }

  const expectedHash = hashEvidenceBindingReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CM-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildEvidenceBindingReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CM-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  /** @type {Array<{ claimId: string, evidenceDigest: string, linkDigest: string|null, specId: string|null, codePath: string|null }>} */
  const claims = [];
  if (Array.isArray(fields.claims)) {
    for (const c of fields.claims) {
      const normalized = normalizeClaim(c);
      if (normalized) claims.push(normalized);
    }
  }

  const claimsDigest =
    fields.claimsDigest != null && fields.claimsDigest !== ''
      ? String(fields.claimsDigest)
      : hashFn(claims);

  const bindingDigest =
    fields.bindingDigest != null && fields.bindingDigest !== ''
      ? String(fields.bindingDigest)
      : hashFn({
          planId: fields.planId || null,
          claims,
          decision: fields.decision || null
        });

  const body = canonicalEvidenceBindingSealBody({
    receiptId,
    operation: fields.operation || 'BIND',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    claimCount:
      fields.claimCount != null ? Number(fields.claimCount) : claims.length,
    claimsDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CM_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    claims: Object.freeze(claims.map((c) => Object.freeze({ ...c }))),
    reasons: Object.freeze([...reasons]),
    bindingDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      wormSaas: false,
      externalAuditProduct: false,
      siemRetentionSaas: false,
      productionDataLake: false,
      ghEnterpriseEnforcement: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CM_PRODUCTION_READY,
  CM_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CM_RECEIPT_KIND,
  CM_DECISIONS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeClaim,
  canonicalEvidenceBindingSealBody,
  hashEvidenceBindingReceipt,
  verifyEvidenceBindingReceipt,
  buildEvidenceBindingReceipt,
  _resetReceiptSeqForTests
};
