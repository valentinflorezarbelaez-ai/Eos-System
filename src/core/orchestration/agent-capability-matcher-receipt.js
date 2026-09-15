/**
 * @module agent-capability-matcher-receipt
 * SPEC-0076 / Mission BS — Sealed Agent Capability Matcher & Governed Dispatch Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BR/BM/BH/BK receipts).
 *
 * Canonical seal fields (nine):
 *   { receiptId, taskId, agentId, requiredCapability, matchedCapability,
 *     status, timestamp, consensusSignature, prevReceiptHash }
 *
 * NON-CLAIM:
 *   capability matcher receipt ≠ Kubernetes scheduler /
 *   ≠ distributed task queue (Celery/RabbitMQ) /
 *   ≠ PRODUCTION_READY=YES orchestrator.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR done; BS in progress; BT–BV pending);
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
export const BS_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BS_RECEIPT_PRODUCTION_READY = 'NO';

export const BS_RECEIPT_KIND = 'eos-agent-capability-matcher-receipt';

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
export function canonicalCapabilityMatcherSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    taskId: fields.taskId != null ? String(fields.taskId) : null,
    agentId: fields.agentId != null ? String(fields.agentId) : null,
    requiredCapability:
      fields.requiredCapability != null ? String(fields.requiredCapability) : null,
    matchedCapability:
      fields.matchedCapability != null ? String(fields.matchedCapability) : null,
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
export function hashCapabilityMatcherReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalCapabilityMatcherSealBody(fields));
}

/**
 * Verify a sealed capability matcher receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyCapabilityMatcherReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashCapabilityMatcherReceipt(receipt, hashFn);
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
 * Build a sealed Capability Matcher & Dispatch Provenance Receipt.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildCapabilityMatcherReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const timestamp =
    body.timestamp != null ? String(body.timestamp) : String(nowFn());

  _rcptSeq += 1;
  const taskId =
    body.taskId != null && String(body.taskId).trim() !== ''
      ? String(body.taskId).trim()
      : `TASK-${String(_rcptSeq).padStart(4, '0')}`;

  const agentId = body.agentId != null ? String(body.agentId).trim() : null;
  const requiredCapability =
    body.requiredCapability != null ? String(body.requiredCapability).trim() : 'general.task';
  const matchedCapability =
    body.matchedCapability != null ? String(body.matchedCapability).trim() : null;
  const status = body.status != null ? String(body.status) : 'UNKNOWN';
  const consensusSignature =
    body.consensusSignature != null && String(body.consensusSignature).trim() !== ''
      ? String(body.consensusSignature).trim()
      : null;
  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).trim() !== ''
      ? String(body.prevReceiptHash).trim()
      : null;

  const seed = `${taskId}:${agentId}:${requiredCapability}:${status}:${timestamp}:${_rcptSeq}`;
  const seedHash = hashFn(seed).slice(0, 8);
  const receiptId =
    body.receiptId != null && String(body.receiptId).trim() !== ''
      ? String(body.receiptId).trim()
      : `BS-RCPT-${String(_rcptSeq).padStart(4, '0')}-${seedHash}`;

  const canonicalBody = canonicalCapabilityMatcherSealBody({
    receiptId,
    taskId,
    agentId,
    requiredCapability,
    matchedCapability,
    status,
    timestamp,
    consensusSignature,
    prevReceiptHash
  });

  const receiptHash = hashFn(canonicalBody);

  return Object.freeze({
    kind: BS_RECEIPT_KIND,
    receiptId,
    taskId,
    agentId,
    requiredCapability,
    matchedCapability,
    status,
    timestamp,
    consensusSignature,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    canonicalSealBody: canonicalBody,
    nonClaims: Object.freeze({
      kubernetesScheduler: false,
      distributedQueue: false,
      productionReady: false
    }),
    fundacionDelta: 0,
    productionReady: BS_RECEIPT_PRODUCTION_READY
  });
}
