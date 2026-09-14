/**
 * @module agent-action-receipt
 * SPEC-0070 / Mission BM — Sealed Agent Action Provenance Receipt.
 * sha256 via node:crypto. NEVER include secrets.
 * stableStringify + sha256Canonical (compose pattern with BH/BK receipts;
 * this file does NOT rewrite consensus/ or mission/ siblings).
 *
 * Canonical seal fields (nine):
 *   { receiptId, agentId, sessionSignature, promptHash, actionPayloadHash,
 *     toolScope, status, timestamp, prevReceiptHash }
 *
 * NON-CLAIM:
 *   action receipt ≠ OAuth/OIDC/IAM /
 *   ≠ SAML IdP /
 *   ≠ PRODUCTION_READY=YES identity product
 *   L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 *   L21 OPEN (BM in progress; BN–BQ pending);
 *   Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/attestation (BM-owned
 * agent-* files; consensus/ siblings MUST NOT be rewritten).
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BM_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const BM_RECEIPT_PRODUCTION_READY = 'NO';

export const BM_RECEIPT_KIND = 'eos-agent-action-receipt';

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
 * Normalize toolScope to a stable sorted string array (or null).
 * @param {unknown} scope
 * @returns {string[]|null}
 */
function normalizeToolScope(scope) {
  if (scope == null) return null;
  if (typeof scope === 'string') return [scope];
  if (!Array.isArray(scope)) return null;
  return scope.map((s) => String(s)).sort();
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalActionSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    agentId: fields.agentId != null ? String(fields.agentId) : null,
    sessionSignature:
      fields.sessionSignature != null && fields.sessionSignature !== ''
        ? String(fields.sessionSignature)
        : null,
    promptHash:
      fields.promptHash != null && fields.promptHash !== ''
        ? String(fields.promptHash)
        : null,
    actionPayloadHash:
      fields.actionPayloadHash != null && fields.actionPayloadHash !== ''
        ? String(fields.actionPayloadHash)
        : null,
    toolScope: normalizeToolScope(fields.toolScope),
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
export function hashActionReceipt(fields, hashFn = sha256Canonical) {
  return hashFn(canonicalActionSealBody(fields));
}

/**
 * Verify a sealed action receipt's hash (tamper-resistance).
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, expected: string|null, actual: string|null, reason: string|null }}
 */
export function verifyActionReceipt(receipt, hashFn = sha256Canonical) {
  if (receipt == null || typeof receipt !== 'object') {
    return {
      ok: false,
      expected: null,
      actual: null,
      reason: 'malformed receipt'
    };
  }
  const expected = hashActionReceipt(receipt, hashFn);
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
 * Build a sealed Agent Action Provenance Receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildActionReceipt(body = {}, opts = {}) {
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
        : 'OK';

  const agentId = body.agentId != null ? String(body.agentId) : null;
  const sessionSignature =
    body.sessionSignature != null && String(body.sessionSignature).length > 0
      ? String(body.sessionSignature)
      : null;
  const promptHash =
    body.promptHash != null && String(body.promptHash).length > 0
      ? String(body.promptHash)
      : null;
  const actionPayloadHash =
    body.actionPayloadHash != null && String(body.actionPayloadHash).length > 0
      ? String(body.actionPayloadHash)
      : null;
  const toolScope = normalizeToolScope(body.toolScope) || [];
  const prevReceiptHash =
    body.prevReceiptHash != null && String(body.prevReceiptHash).length > 0
      ? String(body.prevReceiptHash)
      : null;

  const idSeed = hashFn({
    agentId,
    status,
    timestamp,
    seq: _rcptSeq,
    promptHash
  });
  const receiptId =
    body.receiptId != null
      ? String(body.receiptId)
      : `BM-RCPT-${String(idSeed).slice(0, 12)}`;

  const sealBody = canonicalActionSealBody({
    receiptId,
    agentId,
    sessionSignature,
    promptHash,
    actionPayloadHash,
    toolScope,
    status,
    timestamp,
    prevReceiptHash
  });

  const receiptHash = hashFn(sealBody);

  const safe = stripSecrets({
    kind: BM_RECEIPT_KIND,
    PRODUCTION_READY: BM_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true && body.denied !== true,
    code:
      body.code != null
        ? String(body.code)
        : status === 'DENY'
          ? 'DENY'
          : 'OK',
    status,
    receiptId,
    agentId,
    sessionSignature,
    promptHash,
    actionPayloadHash,
    toolScope,
    timestamp,
    prevReceiptHash,
    receiptHash,
    receiptDigest: receiptHash,
    sealed: true,
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    oauthOidcIam: false,
    samlIdp: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    identityProduct: false,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    deny: body.deny === true || body.denied === true || body.ok === false,
    denied: body.deny === true || body.denied === true || body.ok === false,
    hermetic: body.hermetic !== false,
    sessionId: body.sessionId != null ? String(body.sessionId) : null,
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
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens|receiptDigest|receiptHash|sha256|digest|promptHash|actionPayloadHash|prevReceiptHash|sessionSignature|sessionId)$/i.test(
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
  BM_PRODUCTION_READY,
  BM_RECEIPT_PRODUCTION_READY,
  BM_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalActionSealBody,
  hashActionReceipt,
  verifyActionReceipt,
  buildActionReceipt,
  _resetReceiptSeqForTests
};
