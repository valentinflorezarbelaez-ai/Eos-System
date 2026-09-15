/**
 * @module workflow-checkpoint-receipt
 * SPEC-0077 / Mission BT — Sealed Workflow State Machine & Step-Level Checkpoint Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BR/BS/BM receipts).
 *
 * Canonical seal fields (nine):
 *   { receiptId, workflowId, stepId, state, checkpointHash,
 *     status, timestamp, consensusSignature, prevReceiptHash }
 *
 * NON-CLAIM:
 *   checkpoint receipt ≠ AWS Step Functions /
 *   ≠ Temporal.io cluster /
 *   ≠ PRODUCTION_READY=YES distributed orchestrator.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR and BS done; BT in progress; BU–BV pending);
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
export const BT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BT_RECEIPT_PRODUCTION_READY = 'NO';

export const BT_RECEIPT_KIND = 'eos-workflow-checkpoint-receipt';

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
export function canonicalWorkflowCheckpointSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    workflowId: fields.workflowId != null ? String(fields.workflowId) : null,
    stepId: fields.stepId != null ? String(fields.stepId) : null,
    state: fields.state != null ? String(fields.state) : null,
    checkpointHash:
      fields.checkpointHash != null && fields.checkpointHash !== ''
        ? String(fields.checkpointHash)
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
export function hashWorkflowCheckpointReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalWorkflowCheckpointSealBody(fields));
}

/**
 * Verify a sealed workflow checkpoint receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyWorkflowCheckpointReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashWorkflowCheckpointReceipt(receipt, hashFn);
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
 * Build a sealed Workflow State Machine & Checkpoint Receipt.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildWorkflowCheckpointReceipt(body = {}, opts = {}) {
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

  const stepId = body.stepId != null ? String(body.stepId).trim() : null;
  const state = body.state != null ? String(body.state).trim() : 'UNKNOWN';
  const checkpointHash =
    body.checkpointHash != null && String(body.checkpointHash).trim() !== ''
      ? String(body.checkpointHash).trim()
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

  const seed = `${workflowId}:${stepId}:${state}:${checkpointHash}:${status}:${timestamp}:${_rcptSeq}`;
  const seedHash = hashFn(seed).slice(0, 8);
  const receiptId =
    body.receiptId != null && String(body.receiptId).trim() !== ''
      ? String(body.receiptId).trim()
      : `BT-RCPT-${String(_rcptSeq).padStart(4, '0')}-${seedHash}`;

  const canonicalBody = canonicalWorkflowCheckpointSealBody({
    receiptId,
    workflowId,
    stepId,
    state,
    checkpointHash,
    status,
    timestamp,
    consensusSignature,
    prevReceiptHash
  });

  const receiptHash = hashFn(canonicalBody);

  return Object.freeze({
    kind: BT_RECEIPT_KIND,
    receiptId,
    workflowId,
    stepId,
    state,
    checkpointHash,
    status,
    timestamp,
    consensusSignature,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    canonicalSealBody: canonicalBody,
    nonClaims: Object.freeze({
      awsStepFunctions: false,
      temporalCluster: false,
      productionReady: false
    }),
    fundacionDelta: 0,
    productionReady: BT_RECEIPT_PRODUCTION_READY
  });
}
