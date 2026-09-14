/**
 * @module governed-external-write-receipt
 * SPEC-0068 / Mission BK — Sealed Governed External Write Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BH/BI/BJ receipts;
 * this file does NOT rewrite write-barrier / delivery / T-gate siblings).
 *
 * Canonical seal fields (eight):
 *   { receiptId, targetProjectId, targetPaths, preconditionMask,
 *     status, rollbackExecuted, timestamp, prevReceiptHash }
 *
 * NON-CLAIM:
 *   write receipt ≠ unsupervised fleet deploy /
 *   ≠ K8s/ArgoCD CD /
 *   ≠ PRODUCTION_READY=YES
 *   BH+BI+BJ MEASURED acknowledged; not BL; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/orchestration (BK-owned
 * governed-external-write-* files; siblings may coexist).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BK_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BK_RECEIPT_PRODUCTION_READY = 'NO';

export const BK_RECEIPT_KIND = 'eos-governed-external-write-receipt';

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
 * Normalize targetPaths to a stable sorted string array.
 * @param {unknown} paths
 * @returns {string[]|null}
 */
function normalizeTargetPaths(paths) {
  if (paths == null) return null;
  if (!Array.isArray(paths)) return null;
  return paths.map((p) => String(p)).sort();
}

/**
 * Normalize preconditionMask to a stable object or number.
 * @param {unknown} mask
 * @returns {object|number|null}
 */
function normalizePreconditionMask(mask) {
  if (mask == null) return null;
  if (typeof mask === 'number') return mask;
  if (typeof mask === 'object' && !Array.isArray(mask)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const k of Object.keys(mask).sort()) {
      out[k] = /** @type {Record<string, unknown>} */ (mask)[k];
    }
    return out;
  }
  return null;
}

/**
 * Build canonical seal body (the eight fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalWriteSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    targetProjectId:
      fields.targetProjectId != null ? String(fields.targetProjectId) : null,
    targetPaths: normalizeTargetPaths(fields.targetPaths),
    preconditionMask: normalizePreconditionMask(fields.preconditionMask),
    status: fields.status != null ? String(fields.status) : null,
    rollbackExecuted: fields.rollbackExecuted === true,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receipt hash over the eight canonical seal fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashWriteReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalWriteSealBody(fields));
}

/**
 * Verify a sealed write receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyWriteReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashWriteReceipt(receipt, hashFn);
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
 * Build a sealed Governed External Write Receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildWriteReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const timestamp =
    body.timestamp != null ? String(body.timestamp) : String(nowFn());

  _rcptSeq += 1;

  const status =
    body.status != null
      ? String(body.status)
      : body.ok === false || body.deny === true || body.denied === true
        ? 'DENY'
        : body.rollbackExecuted === true
          ? 'ROLLBACK'
          : 'OK';

  const targetPaths = normalizeTargetPaths(body.targetPaths) || [];
  const preconditionMask = normalizePreconditionMask(body.preconditionMask);

  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).length > 0
      ? String(body.prevReceiptHash)
      : null;

  const targetProjectId =
    body.targetProjectId != null
      ? String(body.targetProjectId)
      : body.targetProject != null &&
          typeof body.targetProject === 'object' &&
          /** @type {Record<string, unknown>} */ (body.targetProject).id != null
        ? String(/** @type {Record<string, unknown>} */ (body.targetProject).id)
        : null;

  const rollbackExecuted = body.rollbackExecuted === true;

  const idSeed = hashFn({
    targetProjectId,
    status,
    timestamp,
    seq: _rcptSeq,
    rollbackExecuted
  });
  const receiptId =
    body.receiptId != null
      ? String(body.receiptId)
      : `BK-RCPT-${String(idSeed).slice(0, 12)}`;

  const sealBody = canonicalWriteSealBody({
    receiptId,
    targetProjectId,
    targetPaths,
    preconditionMask,
    status,
    rollbackExecuted,
    timestamp,
    prevReceiptHash
  });

  const receiptHash = hashFn(sealBody);

  const safe = stripSecrets({
    kind: BK_RECEIPT_KIND,
    PRODUCTION_READY: BK_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true && body.denied !== true,
    code:
      body.code != null
        ? String(body.code)
        : status === 'DENY'
          ? 'DENY'
          : status === 'ROLLBACK'
            ? 'ROLLBACK'
            : 'OK',
    status,
    receiptId,
    targetProjectId,
    targetPaths,
    preconditionMask,
    rollbackExecuted,
    timestamp,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    sealed: true,
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    unsupervisedFleetDeploy: false,
    k8sArgoCd: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    deny: body.deny === true || body.denied === true || body.ok === false,
    denied: body.deny === true || body.denied === true || body.ok === false,
    hermetic: body.hermetic !== false,
    transactionId:
      body.transactionId != null ? String(body.transactionId) : null,
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
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens|receiptDigest|receiptHash|sha256|digest|checkpointHash|prevReceiptHash|preconditionMask|transactionId)$/i.test(
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
  BK_PRODUCTION_READY,
  BK_RECEIPT_PRODUCTION_READY,
  BK_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalWriteSealBody,
  hashWriteReceipt,
  verifyWriteReceipt,
  buildWriteReceipt,
  _resetReceiptSeqForTests
};
