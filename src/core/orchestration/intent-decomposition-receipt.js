/**
 * @module intent-decomposition-receipt
 * SPEC-0075 / Mission BR — Sealed Sovereign Intent Decomposition Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BM/BH/BK receipts;
 * this file does NOT rewrite sibling orchestration files).
 *
 * Canonical seal fields (nine):
 *   { receiptId, intentId, rawIntentHash, parsedGoal, nodeCount, edgeCount,
 *     status, timestamp, prevReceiptHash }
 *
 * NON-CLAIM:
 *   intent decomposition receipt ≠ general AGI planner /
 *   ≠ unconstrained autonomous reasoning /
 *   ≠ PRODUCTION_READY=YES workflow engine product.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR in progress; BS–BV pending);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BR_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BR_RECEIPT_PRODUCTION_READY = 'NO';

export const BR_RECEIPT_KIND = 'eos-intent-decomposition-receipt';

/**
 * Stable JSON stringify (sorted keys) for digests.
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
export function canonicalIntentDecompositionSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    intentId: fields.intentId != null ? String(fields.intentId) : null,
    rawIntentHash:
      fields.rawIntentHash != null && fields.rawIntentHash !== ''
        ? String(fields.rawIntentHash)
        : null,
    parsedGoal:
      fields.parsedGoal != null && fields.parsedGoal !== ''
        ? String(fields.parsedGoal)
        : null,
    nodeCount:
      typeof fields.nodeCount === 'number' && Number.isFinite(fields.nodeCount)
        ? Math.max(0, Math.floor(fields.nodeCount))
        : 0,
    edgeCount:
      typeof fields.edgeCount === 'number' && Number.isFinite(fields.edgeCount)
        ? Math.max(0, Math.floor(fields.edgeCount))
        : 0,
    status: fields.status != null ? String(fields.status) : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receipt hash over the nine canonical seal fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashIntentDecompositionReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalIntentDecompositionSealBody(fields));
}

/**
 * Verify a sealed intent decomposition receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyIntentDecompositionReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashIntentDecompositionReceipt(receipt, hashFn);
  const actual =
    receipt.receiptHash != null
      ? String(receipt.receiptHash)
      : receipt.receiptDigest != null
        ? String(receipt.receiptDigest)
        : null;
  if (actual == null) {
    return {
      ok: false,
      expected,
      actual: null,
      reason: 'missing receiptHash'
    };
  }
  if (actual !== expected) {
    return {
      ok: false,
      expected,
      actual,
      reason: 'receipt hash mismatch (tamper)'
    };
  }
  return { ok: true, expected, actual, reason: null };
}

/**
 * Build a sealed Intent Decomposition Provenance Receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildIntentDecompositionReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const timestamp =
    body.timestamp != null ? String(body.timestamp) : String(nowFn());

  _rcptSeq += 1;
  const intentId =
    body.intentId != null && String(body.intentId).trim() !== ''
      ? String(body.intentId).trim()
      : `INTENT-${String(_rcptSeq).padStart(4, '0')}`;

  const rawIntentHash =
    body.rawIntentHash != null && String(body.rawIntentHash).trim() !== ''
      ? String(body.rawIntentHash).trim()
      : body.rawIntent != null
        ? hashFn(String(body.rawIntent))
        : null;

  const parsedGoal =
    body.parsedGoal != null ? String(body.parsedGoal).slice(0, 500) : null;

  const nodeCount =
    typeof body.nodeCount === 'number' && Number.isFinite(body.nodeCount)
      ? Math.max(0, Math.floor(body.nodeCount))
      : 0;

  const edgeCount =
    typeof body.edgeCount === 'number' && Number.isFinite(body.edgeCount)
      ? Math.max(0, Math.floor(body.edgeCount))
      : 0;

  const status = body.status != null ? String(body.status) : 'UNKNOWN';

  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).trim() !== ''
      ? String(body.prevReceiptHash).trim()
      : null;

  const seed = `${intentId}:${rawIntentHash}:${status}:${timestamp}:${_rcptSeq}`;
  const seedHash = hashFn(seed).slice(0, 8);
  const receiptId =
    body.receiptId != null && String(body.receiptId).trim() !== ''
      ? String(body.receiptId).trim()
      : `BR-RCPT-${String(_rcptSeq).padStart(4, '0')}-${seedHash}`;

  const canonicalBody = canonicalIntentDecompositionSealBody({
    receiptId,
    intentId,
    rawIntentHash,
    parsedGoal,
    nodeCount,
    edgeCount,
    status,
    timestamp,
    prevReceiptHash
  });

  const receiptHash = hashFn(canonicalBody);

  return Object.freeze({
    kind: BR_RECEIPT_KIND,
    receiptId,
    intentId,
    rawIntentHash,
    parsedGoal,
    nodeCount,
    edgeCount,
    status,
    timestamp,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    canonicalSealBody: canonicalBody,
    nonClaims: Object.freeze({
      generalAgiPlanner: false,
      productionReady: false,
      unsupervisedAutonomy: false
    }),
    fundacionDelta: 0,
    productionReady: BR_RECEIPT_PRODUCTION_READY
  });
}
