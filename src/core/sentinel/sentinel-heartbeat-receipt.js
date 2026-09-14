/**
 * @module sentinel-heartbeat-receipt
 * SPEC-0071 / Mission BN — Sealed Continuous Integrity Sentinel Heartbeat Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BM/BH/BK receipts;
 * this file does NOT rewrite freeze-drift/ / fdir/ / governance/ siblings).
 *
 * Canonical seal fields (seven):
 *   { receiptId, pulseIndex, timestamp, targetManifestHash, integrityStatus,
 *     anomaliesDetected, prevReceiptHash }
 *
 * NON-CLAIM:
 *   heartbeat receipt ≠ Datadog/Prometheus/K8s daemonset /
 *   ≠ heavy APM product /
 *   ≠ PRODUCTION_READY=YES monitoring product
 *   L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 *   L21 OPEN (BM MEASURED; BN in progress; BO–BQ pending);
 *   Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/sentinel (BN-owned
 * sentinel-* / continuous-* files; freeze-drift/fdir/governance siblings
 * MUST NOT be rewritten).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BN_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BN_RECEIPT_PRODUCTION_READY = 'NO';

export const BN_RECEIPT_KIND = 'eos-sentinel-heartbeat-receipt';

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
 * Normalize anomaliesDetected to a stable sorted string array (or empty).
 * @param {unknown} anomalies
 * @returns {string[]}
 */
function normalizeAnomalies(anomalies) {
  if (anomalies == null) return [];
  if (typeof anomalies === 'string') return [anomalies];
  if (!Array.isArray(anomalies)) return [];
  return anomalies.map((a) => String(a)).sort();
}

/**
 * Build canonical seal body (the seven fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalHeartbeatSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    pulseIndex:
      fields.pulseIndex != null && Number.isFinite(Number(fields.pulseIndex))
        ? Number(fields.pulseIndex)
        : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    targetManifestHash:
      fields.targetManifestHash != null && fields.targetManifestHash !== ''
        ? String(fields.targetManifestHash)
        : null,
    integrityStatus:
      fields.integrityStatus != null ? String(fields.integrityStatus) : null,
    anomaliesDetected: normalizeAnomalies(fields.anomaliesDetected),
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receipt hash over the seven canonical seal fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashHeartbeatReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalHeartbeatSealBody(fields));
}

/**
 * Verify a sealed heartbeat receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyHeartbeatReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashHeartbeatReceipt(receipt, hashFn);
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
 * Build a sealed Sentinel Heartbeat Receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildHeartbeatReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const timestamp =
    body.timestamp != null ? String(body.timestamp) : String(nowFn());

  _rcptSeq += 1;

  const integrityStatus =
    body.integrityStatus != null
      ? String(body.integrityStatus)
      : body.ok === false || body.deny === true || body.denied === true
        ? 'DRIFT_DETECTED'
        : 'OK';

  const pulseIndex =
    body.pulseIndex != null && Number.isFinite(Number(body.pulseIndex))
      ? Number(body.pulseIndex)
      : _rcptSeq;

  const targetManifestHash =
    body.targetManifestHash != null && String(body.targetManifestHash).length > 0
      ? String(body.targetManifestHash)
      : null;

  const anomaliesDetected = normalizeAnomalies(body.anomaliesDetected);
  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).length > 0
      ? String(body.prevReceiptHash)
      : null;

  const idSeed = hashFn({
    pulseIndex,
    integrityStatus,
    timestamp,
    seq: _rcptSeq,
    targetManifestHash
  });
  const receiptId =
    body.receiptId != null
      ? String(body.receiptId)
      : `BN-RCPT-${String(idSeed).slice(0, 12)}`;

  const sealBody = canonicalHeartbeatSealBody({
    receiptId,
    pulseIndex,
    timestamp,
    targetManifestHash,
    integrityStatus,
    anomaliesDetected,
    prevReceiptHash
  });

  const receiptHash = hashFn(sealBody);

  const safe = stripSecrets({
    kind: BN_RECEIPT_KIND,
    PRODUCTION_READY: BN_RECEIPT_PRODUCTION_READY,
    ok:
      body.ok !== false &&
      body.deny !== true &&
      body.denied !== true &&
      integrityStatus === 'OK',
    code:
      body.code != null
        ? String(body.code)
        : integrityStatus === 'OK'
          ? 'OK'
          : integrityStatus,
    status: integrityStatus,
    integrityStatus,
    receiptId,
    pulseIndex,
    timestamp,
    targetManifestHash,
    anomaliesDetected,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    sealed: true,
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    datadogPrometheusK8sDaemonset: false,
    heavyApm: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    monitoringProduct: false,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    deny:
      body.deny === true ||
      body.denied === true ||
      body.ok === false ||
      integrityStatus !== 'OK',
    denied:
      body.deny === true ||
      body.denied === true ||
      body.ok === false ||
      integrityStatus !== 'OK',
    hermetic: body.hermetic !== false,
    quarantined: body.quarantined === true,
    meta: body.meta != null ? stripSecrets(body.meta) : undefined
  });

  return safe;
}

/**
 * Remove secret-looking keys from a plain object (shallow+deep).
 * Never seals hmacSecret / privateKey / token values.
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
      /(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key|hmacSecret|signingKey)/i.test(
        k
      ) &&
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens|receiptDigest|receiptHash|sha256|digest|targetManifestHash|prevReceiptHash|pulseIndex)$/i.test(
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
  BN_PRODUCTION_READY,
  BN_RECEIPT_PRODUCTION_READY,
  BN_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalHeartbeatSealBody,
  hashHeartbeatReceipt,
  verifyHeartbeatReceipt,
  buildHeartbeatReceipt,
  _resetReceiptSeqForTests
};
