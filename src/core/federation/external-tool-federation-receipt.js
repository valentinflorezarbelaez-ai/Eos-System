/**
 * @module external-tool-federation-receipt
 * SPEC-0090 / Mission CG — External Tool / MCP Federation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, federationId, decision, toolCount,
 *     toolCallDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone): toolIds[], allowlist[], reasons[]
 *
 * NON-CLAIM:
 *   External tool federation ≠ unrestricted tool proxy /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit MEASURED · CG in progress · CH–CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/federation.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CG_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CG_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CG_RECEIPT_KIND = 'eos-external-tool-federation-receipt';

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
 * Normalize a tool id string for sealing / display.
 * @param {unknown} id
 * @returns {string}
 */
export function normalizeToolId(id) {
  return id != null ? String(id).trim() : '';
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalExternalToolFederationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    federationId:
      fields.federationId != null ? String(fields.federationId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    toolCount:
      fields.toolCount != null && Number.isFinite(Number(fields.toolCount))
        ? Number(fields.toolCount)
        : 0,
    toolCallDigest:
      fields.toolCallDigest != null && fields.toolCallDigest !== ''
        ? String(fields.toolCallDigest)
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
export function hashExternalToolFederationReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalExternalToolFederationSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyExternalToolFederationReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CG_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CG_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CG-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CG-RCPT-' };
  }

  const expectedHash = hashExternalToolFederationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CG-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildExternalToolFederationReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CG-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const toolIds = Array.isArray(fields.toolIds)
    ? fields.toolIds.map((t) => normalizeToolId(t)).filter(Boolean)
    : [];
  const allowlist = Array.isArray(fields.allowlist)
    ? fields.allowlist.map((t) => normalizeToolId(t)).filter(Boolean)
    : [];
  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const toolCallDigest =
    fields.toolCallDigest != null && fields.toolCallDigest !== ''
      ? String(fields.toolCallDigest)
      : toolIds.length > 0
        ? hashFn({ toolIds, allowlist, decision: fields.decision || null })
        : null;

  const body = canonicalExternalToolFederationSealBody({
    receiptId,
    operation: fields.operation || 'FEDERATE',
    federationId: fields.federationId || null,
    decision: fields.decision || 'DENY',
    toolCount:
      fields.toolCount != null ? fields.toolCount : toolIds.length,
    toolCallDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CG_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    toolIds: Object.freeze([...toolIds]),
    allowlist: Object.freeze([...allowlist]),
    reasons: Object.freeze([...reasons]),
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      unrestrictedToolProxy: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CG_PRODUCTION_READY,
  CG_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CG_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeToolId,
  canonicalExternalToolFederationSealBody,
  hashExternalToolFederationReceipt,
  verifyExternalToolFederationReceipt,
  buildExternalToolFederationReceipt,
  _resetReceiptSeqForTests
};
