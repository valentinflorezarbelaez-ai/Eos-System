/**
 * @module workflow-telemetry-receipt
 * SPEC-0079 / Mission BV — Sealed Workflow Telemetry & Sovereign Audit Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern across all Ladder 22 receipts).
 *
 * Canonical seal fields (nine):
 *   { receiptId, workflowId, spanCount, receiptCount, auditDigest,
 *     status, timestamp, consensusSignature, prevReceiptHash }
 *
 * NON-CLAIM:
 *   telemetry receipt ≠ OpenTelemetry collector /
 *   ≠ Prometheus/Datadog APM /
 *   ≠ PRODUCTION_READY=YES cloud monitoring product.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 CLOSES WITH BV (BR, BS, BT, BU done; BV completes L22);
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
export const BV_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BV_RECEIPT_PRODUCTION_READY = 'NO';

export const BV_RECEIPT_KIND = 'eos-workflow-telemetry-receipt';

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
export function canonicalWorkflowTelemetrySealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    workflowId: fields.workflowId != null ? String(fields.workflowId) : null,
    spanCount: fields.spanCount != null ? Number(fields.spanCount) : 0,
    receiptCount: fields.receiptCount != null ? Number(fields.receiptCount) : 0,
    auditDigest:
      fields.auditDigest != null && fields.auditDigest !== ''
        ? String(fields.auditDigest)
        : null,
    status: fields.status != null ? String(fields.status) : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    consensusSignature:
      fields.consensusSignature != null && fields.consensusSignature !== ''
        ? String(fields.consensusSignature)
        : null,
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
export function hashWorkflowTelemetryReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalWorkflowTelemetrySealBody(fields));
}

/**
 * Verify a sealed workflow telemetry receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyWorkflowTelemetryReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashWorkflowTelemetryReceipt(receipt, hashFn);
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
 * Build a sealed Workflow Telemetry & Sovereign Audit Receipt.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildWorkflowTelemetryReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const timestamp =
    body.timestamp != null ? String(body.timestamp) : String(nowFn());

  _rcptSeq += 1;
  const workflowId =
    body.workflowId != null && String(body.workflowId).trim() !== ''
      ? String(body.workflowId).trim()
      : `WF-${String(_rcptSeq).padStart(4, '0')}`;

  const spanCount = typeof body.spanCount === 'number' ? Math.max(0, Math.floor(body.spanCount)) : 0;
  const receiptCount = typeof body.receiptCount === 'number' ? Math.max(0, Math.floor(body.receiptCount)) : 0;
  const auditDigest =
    body.auditDigest != null && String(body.auditDigest).trim() !== ''
      ? String(body.auditDigest).trim()
      : null;
  const status = body.status != null ? String(body.status) : 'UNKNOWN';
  const consensusSignature =
    body.consensusSignature != null && String(body.consensusSignature).trim() !== ''
      ? String(body.consensusSignature).trim()
      : null;
  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).trim() !== ''
      ? String(body.prevReceiptHash).trim()
      : null;

  const seed = `${workflowId}:${spanCount}:${receiptCount}:${auditDigest}:${status}:${timestamp}:${_rcptSeq}`;
  const seedHash = hashFn(seed).slice(0, 8);
  const receiptId =
    body.receiptId != null && String(body.receiptId).trim() !== ''
      ? String(body.receiptId).trim()
      : `BV-RCPT-${String(_rcptSeq).padStart(4, '0')}-${seedHash}`;

  const canonicalBody = canonicalWorkflowTelemetrySealBody({
    receiptId,
    workflowId,
    spanCount,
    receiptCount,
    auditDigest,
    status,
    timestamp,
    consensusSignature,
    prevReceiptHash
  });

  const receiptHash = hashFn(canonicalBody);

  return Object.freeze({
    kind: BV_RECEIPT_KIND,
    receiptId,
    workflowId,
    spanCount,
    receiptCount,
    auditDigest,
    status,
    timestamp,
    consensusSignature,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    canonicalSealBody: canonicalBody,
    nonClaims: Object.freeze({
      openTelemetryCollector: false,
      prometheusDatadogApm: false,
      productionReady: false
    }),
    fundacionDelta: 0,
    productionReady: BV_RECEIPT_PRODUCTION_READY
  });
}
