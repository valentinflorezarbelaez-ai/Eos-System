/**
 * @module spec-code-traceability-receipt
 * SPEC-0095 / Mission CL — Spec↔Code Traceability Graph Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, nodeCount,
 *     nodesDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   nodes[] { specId, codePath?, moduleId?, evidenceDigest? },
 *   reasons[], graphDigest?
 *
 * NON-CLAIM:
 *   Spec↔Code Traceability Graph Port ≠ full LSP/IDE product /
 *   ≠ GitHub code search /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L25 CLOSED never reopen;
 *   L26 OPEN (Audit MEASURED · CL in progress · CM–CP pending);
 *   Axis: Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/traceability.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CL_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CL_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CL_RECEIPT_KIND = 'eos-spec-code-traceability-receipt';

export const CL_DECISIONS = Object.freeze(['PASS', 'DENY']);

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
 * Normalize a graph node for sealing / display.
 * @param {unknown} node
 * @returns {{ specId: string, codePath: string|null, moduleId: string|null, evidenceDigest: string|null }|null}
 */
export function normalizeNode(node) {
  if (node == null || typeof node !== 'object') return null;
  const specId = node.specId != null ? String(node.specId).trim() : '';
  const codePath =
    node.codePath != null && String(node.codePath).trim() !== ''
      ? String(node.codePath).trim()
      : null;
  const moduleId =
    node.moduleId != null && String(node.moduleId).trim() !== ''
      ? String(node.moduleId).trim()
      : null;
  const evidenceDigest =
    node.evidenceDigest != null && String(node.evidenceDigest).trim() !== ''
      ? String(node.evidenceDigest).trim()
      : null;
  if (!specId) return null;
  if (!codePath && !moduleId) return null;
  return { specId, codePath, moduleId, evidenceDigest };
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalSpecCodeTraceabilitySealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    nodeCount: fields.nodeCount != null ? Number(fields.nodeCount) : 0,
    nodesDigest:
      fields.nodesDigest != null && fields.nodesDigest !== ''
        ? String(fields.nodesDigest)
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
export function hashSpecCodeTraceabilityReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalSpecCodeTraceabilitySealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifySpecCodeTraceabilityReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CL_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CL_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CL-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CL-RCPT-' };
  }

  const expectedHash = hashSpecCodeTraceabilityReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CL-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildSpecCodeTraceabilityReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CL-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  /** @type {Array<{ specId: string, codePath: string|null, moduleId: string|null, evidenceDigest: string|null }>} */
  const nodes = [];
  if (Array.isArray(fields.nodes)) {
    for (const n of fields.nodes) {
      const normalized = normalizeNode(n);
      if (normalized) nodes.push(normalized);
    }
  }

  const nodesDigest =
    fields.nodesDigest != null && fields.nodesDigest !== ''
      ? String(fields.nodesDigest)
      : hashFn(nodes);

  const graphDigest =
    fields.graphDigest != null && fields.graphDigest !== ''
      ? String(fields.graphDigest)
      : hashFn({
          planId: fields.planId || null,
          nodes,
          decision: fields.decision || null
        });

  const body = canonicalSpecCodeTraceabilitySealBody({
    receiptId,
    operation: fields.operation || 'LINK',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    nodeCount:
      fields.nodeCount != null ? Number(fields.nodeCount) : nodes.length,
    nodesDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CL_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    nodes: Object.freeze(nodes.map((n) => Object.freeze({ ...n }))),
    reasons: Object.freeze([...reasons]),
    graphDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      lspIdeProduct: false,
      githubCodeSearch: false,
      ghEnterpriseEnforcement: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CL_PRODUCTION_READY,
  CL_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CL_RECEIPT_KIND,
  CL_DECISIONS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeNode,
  canonicalSpecCodeTraceabilitySealBody,
  hashSpecCodeTraceabilityReceipt,
  verifySpecCodeTraceabilityReceipt,
  buildSpecCodeTraceabilityReceipt,
  _resetReceiptSeqForTests
};
