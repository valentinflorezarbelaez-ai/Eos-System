/**
 * @module consensus-orchestration-receipt
 * SPEC-0078 / Mission BU — Sealed Multi-Agent Consensus Orchestration Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BR/BS/BT/BM receipts).
 *
 * Canonical seal fields (nine):
 *   { receiptId, proposalId, action, quorumPolicy, tallyDigest,
 *     outcome, timestamp, consensusSignature, prevReceiptHash }
 *
 * NON-CLAIM:
 *   consensus receipt ≠ Raft/Paxos consensus cluster /
 *   ≠ Blockchain smart contracts /
 *   ≠ PRODUCTION_READY=YES distributed consensus product.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR, BS, BT done; BU in progress; BV pending);
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
export const BU_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BU_RECEIPT_PRODUCTION_READY = 'NO';

export const BU_RECEIPT_KIND = 'eos-consensus-orchestration-receipt';

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
export function canonicalConsensusOrchestrationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    proposalId: fields.proposalId != null ? String(fields.proposalId) : null,
    action: fields.action != null ? String(fields.action) : null,
    quorumPolicy: fields.quorumPolicy != null ? String(fields.quorumPolicy) : null,
    tallyDigest:
      fields.tallyDigest != null && fields.tallyDigest !== ''
        ? String(fields.tallyDigest)
        : null,
    outcome: fields.outcome != null ? String(fields.outcome) : null,
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
export function hashConsensusOrchestrationReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalConsensusOrchestrationSealBody(fields));
}

/**
 * Verify a sealed consensus orchestration receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyConsensusOrchestrationReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashConsensusOrchestrationReceipt(receipt, hashFn);
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
 * Build a sealed Multi-Agent Consensus Orchestration Receipt.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildConsensusOrchestrationReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const timestamp =
    body.timestamp != null ? String(body.timestamp) : String(nowFn());

  _rcptSeq += 1;
  const proposalId =
    body.proposalId != null && String(body.proposalId).trim() !== ''
      ? String(body.proposalId).trim()
      : `PROP-${String(_rcptSeq).padStart(4, '0')}`;

  const action = body.action != null ? String(body.action).trim() : 'workflow.action';
  const quorumPolicy =
    body.quorumPolicy != null ? String(body.quorumPolicy).trim() : 'MAJORITY';
  const tallyDigest =
    body.tallyDigest != null && String(body.tallyDigest).trim() !== ''
      ? String(body.tallyDigest).trim()
      : null;
  const outcome = body.outcome != null ? String(body.outcome) : 'UNKNOWN';
  const consensusSignature =
    body.consensusSignature != null && String(body.consensusSignature).trim() !== ''
      ? String(body.consensusSignature).trim()
      : null;
  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).trim() !== ''
      ? String(body.prevReceiptHash).trim()
      : null;

  const seed = `${proposalId}:${action}:${quorumPolicy}:${tallyDigest}:${outcome}:${timestamp}:${_rcptSeq}`;
  const seedHash = hashFn(seed).slice(0, 8);
  const receiptId =
    body.receiptId != null && String(body.receiptId).trim() !== ''
      ? String(body.receiptId).trim()
      : `BU-RCPT-${String(_rcptSeq).padStart(4, '0')}-${seedHash}`;

  const canonicalBody = canonicalConsensusOrchestrationSealBody({
    receiptId,
    proposalId,
    action,
    quorumPolicy,
    tallyDigest,
    outcome,
    timestamp,
    consensusSignature,
    prevReceiptHash
  });

  const receiptHash = hashFn(canonicalBody);

  return Object.freeze({
    kind: BU_RECEIPT_KIND,
    receiptId,
    proposalId,
    action,
    quorumPolicy,
    tallyDigest,
    outcome,
    status: body.status != null ? String(body.status) : outcome,
    timestamp,
    consensusSignature,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    canonicalSealBody: canonicalBody,
    nonClaims: Object.freeze({
      raftCluster: false,
      blockchainConsensus: false,
      productionReady: false
    }),
    fundacionDelta: 0,
    productionReady: BU_RECEIPT_PRODUCTION_READY
  });
}
