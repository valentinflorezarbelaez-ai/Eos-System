/**
 * @module operator-dashboard-receipt
 * SPEC-0067 / Mission BJ — Sealed Operator Dashboard Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BH/BI receipts;
 * this file does NOT rewrite operator-hud / terminal-hud-engine / freeze-drift /
 * evidence / delivery BE/BF).
 *
 * Canonical seal fields (seven):
 *   { receiptId, snapshotTimestamp, overallHealth, surfaceScores,
 *     surfaceCount, prevReceiptHash, status }
 *
 * NON-CLAIM:
 *   dashboard receipt ≠ observability SaaS (Grafana/Datadog/Prometheus) /
 *   ≠ external web GUI/HTTP server /
 *   ≠ PRODUCTION_READY=YES
 *   BH+BI MEASURED acknowledged; not BK–BL; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/observability (BJ-owned
 * operator-dashboard-* files; siblings may coexist).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BJ_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BJ_RECEIPT_PRODUCTION_READY = 'NO';

export const BJ_RECEIPT_KIND = 'eos-operator-dashboard-receipt';

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
 * Normalize surfaceScores to a stable object for sealing.
 * @param {unknown} scores
 * @returns {Record<string, unknown>|null}
 */
function normalizeSurfaceScores(scores) {
  if (scores == null) return null;
  if (typeof scores !== 'object' || Array.isArray(scores)) return null;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(scores).sort()) {
    const v = /** @type {Record<string, unknown>} */ (scores)[k];
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = {
        health:
          /** @type {Record<string, unknown>} */ (v).health != null
            ? String(/** @type {Record<string, unknown>} */ (v).health)
            : null,
        score:
          typeof /** @type {Record<string, unknown>} */ (v).score === 'number'
            ? /** @type {Record<string, unknown>} */ (v).score
            : null,
        reason:
          /** @type {Record<string, unknown>} */ (v).reason != null
            ? String(/** @type {Record<string, unknown>} */ (v).reason)
            : null
      };
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Build canonical seal body (the seven fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalDashboardSealBody(fields = {}) {
  const surfaceScores = normalizeSurfaceScores(fields.surfaceScores);
  const surfaceCount =
    typeof fields.surfaceCount === 'number'
      ? fields.surfaceCount
      : surfaceScores != null
        ? Object.keys(surfaceScores).length
        : null;
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    snapshotTimestamp:
      fields.snapshotTimestamp != null
        ? String(fields.snapshotTimestamp)
        : null,
    overallHealth:
      fields.overallHealth != null ? String(fields.overallHealth) : null,
    surfaceScores,
    surfaceCount,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null,
    status: fields.status != null ? String(fields.status) : null
  };
}

/**
 * Compute receipt hash over the seven canonical seal fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashDashboardReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalDashboardSealBody(fields));
}

/**
 * Verify a sealed dashboard receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyDashboardReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashDashboardReceipt(receipt, hashFn);
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
 * Build a sealed Operator Dashboard Receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildDashboardReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const snapshotTimestamp =
    body.snapshotTimestamp != null
      ? String(body.snapshotTimestamp)
      : String(nowFn());

  _rcptSeq += 1;

  const status =
    body.status != null
      ? String(body.status)
      : body.ok === false || body.deny === true || body.denied === true
        ? 'DENY'
        : body.overallHealth === 'FAIL'
          ? 'FAIL'
          : body.overallHealth === 'DEGRADED'
            ? 'DEGRADED'
            : 'OK';

  const overallHealth =
    body.overallHealth != null
      ? String(body.overallHealth)
      : status === 'DENY' || status === 'FAIL'
        ? 'FAIL'
        : status === 'DEGRADED'
          ? 'DEGRADED'
          : 'OK';

  const surfaceScores = normalizeSurfaceScores(body.surfaceScores) || {};
  const surfaceCount =
    typeof body.surfaceCount === 'number'
      ? body.surfaceCount
      : Object.keys(surfaceScores).length;

  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).length > 0
      ? String(body.prevReceiptHash)
      : null;

  const idSeed = hashFn({
    overallHealth,
    surfaceCount,
    snapshotTimestamp,
    seq: _rcptSeq,
    status
  });
  const receiptId =
    body.receiptId != null
      ? String(body.receiptId)
      : `BJ-RCPT-${String(idSeed).slice(0, 12)}`;

  const sealBody = canonicalDashboardSealBody({
    receiptId,
    snapshotTimestamp,
    overallHealth,
    surfaceScores,
    surfaceCount,
    prevReceiptHash,
    status
  });

  const receiptHash = hashFn(sealBody);

  const safe = stripSecrets({
    kind: BJ_RECEIPT_KIND,
    PRODUCTION_READY: BJ_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true && body.denied !== true,
    code:
      body.code != null
        ? String(body.code)
        : status === 'DENY'
          ? 'DENY'
          : status === 'FAIL'
            ? 'FAIL'
            : status === 'DEGRADED'
              ? 'DEGRADED'
              : 'OK',
    status,
    receiptId,
    snapshotTimestamp,
    overallHealth,
    surfaceScores,
    surfaceCount,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    sealed: true,
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    observabilitySaas: false,
    grafanaDatadogPrometheus: false,
    externalWebGui: false,
    httpServer: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    deny: body.deny === true || body.denied === true || body.ok === false,
    denied: body.deny === true || body.denied === true || body.ok === false,
    hermetic: body.hermetic !== false,
    meta: body.meta != null ? stripSecrets(body.meta) : undefined
  });

  return safe;
}

/**
 * Remove secret-looking keys from a plain object (shallow+deep).
 * @param {unknown} value
 * @returns {unknown}
 */
function stripSecrets(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripSecrets);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (
      /(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key)/i.test(
        k
      ) &&
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens|receiptDigest|receiptHash|sha256|digest|checkpointHash|prevReceiptHash|surfaceScores)$/i.test(
        k
      )
    ) {
      continue;
    }
    out[k] = stripSecrets(v);
  }
  return out;
}

export default {
  BJ_PRODUCTION_READY,
  BJ_RECEIPT_PRODUCTION_READY,
  BJ_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalDashboardSealBody,
  hashDashboardReceipt,
  verifyDashboardReceipt,
  buildDashboardReceipt,
  _resetReceiptSeqForTests
};
