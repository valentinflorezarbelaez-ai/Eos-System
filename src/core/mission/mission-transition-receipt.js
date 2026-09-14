/**
 * @module mission-transition-receipt
 * SPEC-0065 / Mission BH — Sealed TransitionReceipt for Mission Lifecycle
 * State Machine. sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BE/BD receipts;
 * this file does NOT rewrite delivery/*).
 *
 * Canonical seal fields:
 *   { receiptId, missionId, fromState, toState, evidenceHash,
 *     timestamp, status, prevReceiptHash }
 *
 * NON-CLAIM:
 *   transition receipt ≠ Jira/PM SaaS /
 *   ≠ distributed consensus/multi-region /
 *   ≠ PRODUCTION_READY=YES
 *   not BI–BL; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/mission.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BH_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BH_RECEIPT_PRODUCTION_READY = 'NO';

export const BH_RECEIPT_KIND = 'eos-mission-transition-receipt';

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
 * Build canonical seal body (the eight fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalTransitionSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    missionId: fields.missionId != null ? String(fields.missionId) : null,
    fromState: fields.fromState != null ? String(fields.fromState) : null,
    toState: fields.toState != null ? String(fields.toState) : null,
    evidenceHash:
      fields.evidenceHash != null && fields.evidenceHash !== ''
        ? String(fields.evidenceHash)
        : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    status: fields.status != null ? String(fields.status) : null,
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
export function hashTransitionReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalTransitionSealBody(fields));
}

/**
 * Verify a sealed transition receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyTransitionReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashTransitionReceipt(receipt, hashFn);
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
 * Build a sealed TransitionReceipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildTransitionReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const timestamp = String(nowFn());

  _rcptSeq += 1;

  const status =
    body.status != null
      ? String(body.status)
      : body.ok === false || body.deny === true || body.denied === true
        ? 'DENY'
        : 'OK';

  const missionId =
    body.missionId != null ? String(body.missionId) : null;
  const fromState =
    body.fromState != null ? String(body.fromState) : null;
  const toState = body.toState != null ? String(body.toState) : null;
  const evidenceHash =
    body.evidenceHash != null && String(body.evidenceHash).length > 0
      ? String(body.evidenceHash)
      : null;
  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).length > 0
      ? String(body.prevReceiptHash)
      : null;

  // Provisional id seed (independent of final seal hash) so receiptId can
  // participate in the canonical eight-field digest as required by SPEC-0065.
  const idSeed = hashFn({
    missionId,
    fromState,
    toState,
    timestamp,
    seq: _rcptSeq,
    status
  });
  const receiptId =
    body.receiptId != null
      ? String(body.receiptId)
      : `BH-RCPT-${String(idSeed).slice(0, 12)}`;

  const sealBody = canonicalTransitionSealBody({
    receiptId,
    missionId,
    fromState,
    toState,
    evidenceHash,
    timestamp,
    status,
    prevReceiptHash
  });

  const receiptHash = hashFn(sealBody);

  const safe = stripSecrets({
    kind: BH_RECEIPT_KIND,
    PRODUCTION_READY: BH_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true && body.denied !== true,
    code: body.code != null ? String(body.code) : status === 'DENY' ? 'DENY' : 'OK',
    status,
    receiptId,
    missionId,
    fromState,
    toState,
    evidenceHash,
    timestamp,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    sealed: true,
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    jiraPmSaas: false,
    distributedConsensus: false,
    multiRegion: false,
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
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens|receiptDigest|receiptHash|sha256|digest|evidenceHash|prevReceiptHash)$/i.test(
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
  BH_PRODUCTION_READY,
  BH_RECEIPT_PRODUCTION_READY,
  BH_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalTransitionSealBody,
  hashTransitionReceipt,
  verifyTransitionReceipt,
  buildTransitionReceipt,
  _resetReceiptSeqForTests
};
