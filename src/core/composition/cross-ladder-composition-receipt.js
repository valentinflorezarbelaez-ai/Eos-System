/**
 * @module cross-ladder-composition-receipt
 * SPEC-0085 / Mission CB — Cross-Ladder Composition Orchestrator Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, compositionId, rootDigest, status,
 *     stageCount, timestamp, fundacionDelta, prevReceiptHash }
 *
 * NON-CLAIM:
 *   Cross-ladder composition ≠ Airflow/Temporal enterprise orchestrator /
 *   ≠ general AGI planner /
 *   ≠ PRODUCTION_READY=YES composition system.
 *   L22 CLOSED never reopen; L23 CLOSED never reopen; L17–L21 CLOSED never reopen;
 *   L24 OPEN (Mission CB in progress);
 *   Axis: Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/composition.
 *
 * Does NOT rewrite Ladder AS composition-receipt.js (AS-RCPT lineage intact).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CB_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CB_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CB_RECEIPT_KIND = 'eos-cross-ladder-composition-receipt';

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
export function canonicalCrossLadderCompositionSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    compositionId:
      fields.compositionId != null ? String(fields.compositionId) : null,
    rootDigest:
      fields.rootDigest != null && fields.rootDigest !== ''
        ? String(fields.rootDigest)
        : null,
    status: fields.status != null ? String(fields.status) : null,
    stageCount:
      fields.stageCount != null && Number.isFinite(Number(fields.stageCount))
        ? Number(fields.stageCount)
        : 0,
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
export function hashCrossLadderCompositionReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalCrossLadderCompositionSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyCrossLadderCompositionReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CB_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CB_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CB-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CB-RCPT-' };
  }

  const expectedHash = hashCrossLadderCompositionReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CB-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildCrossLadderCompositionReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CB-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const body = canonicalCrossLadderCompositionSealBody({
    receiptId,
    operation: fields.operation || 'COMPOSE',
    compositionId: fields.compositionId || null,
    rootDigest: fields.rootDigest || null,
    status: fields.status || 'OK',
    stageCount: fields.stageCount != null ? fields.stageCount : 0,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CB_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      airflowTemporal: false,
      agiPlanner: false,
      productionReady: false
    })
  });
}

export default {
  CB_PRODUCTION_READY,
  CB_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CB_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalCrossLadderCompositionSealBody,
  hashCrossLadderCompositionReceipt,
  verifyCrossLadderCompositionReceipt,
  buildCrossLadderCompositionReceipt,
  _resetReceiptSeqForTests
};
