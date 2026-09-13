/**
 * @module reasoning-receipt
 * SPEC-0056 / Mission AY — Sealed EVD-style receipt for AST & Semantic Graph
 * Reasoning Port. sha256 of canonical payload via node:crypto.
 * NEVER include secrets.
 *
 * NON-CLAIM:
 *   reasoning receipt ≠ full IDE / ≠ language-server marketplace /
 *   ≠ CloudAgent code intelligence SaaS
 *   not AZ/BA/BB
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * Law VI: never embed static vendor-key prefix literals; never seal secrets.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const AY_RECEIPT_PRODUCTION_READY = 'NO';

export const AY_RECEIPT_KIND = 'eos-ast-semantic-reasoning-receipt';

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
 * Build a sealed reasoning receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildReasoningReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const at = String(nowFn());

  _rcptSeq += 1;

  const status =
    body.status != null
      ? String(body.status)
      : body.ok === false || body.deny === true
        ? 'DENY'
        : body.code === 'COMPLETED'
          ? 'COMPLETED'
          : 'OK';

  const canonical = {
    kind: AY_RECEIPT_KIND,
    PRODUCTION_READY: AY_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true,
    code: body.code != null ? String(body.code) : 'OK',
    status,
    phase: body.phase != null ? String(body.phase) : 'QUERY',
    phases: Array.isArray(body.phases) ? body.phases.map(String) : [],
    artifactPath:
      body.artifactPath != null ? String(body.artifactPath) : null,
    queryKind: body.queryKind != null ? String(body.queryKind) : null,
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    fullIde: false,
    languageServerMarketplace: false,
    cloudAgentCodeIntelligence: false,
    cloudAgent: false,
    codingSaasClaim: false,
    at,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    decision: body.decision != null ? body.decision : null,
    deny: body.deny === true || body.ok === false,
    meta: body.meta != null ? stripSecrets(body.meta) : undefined
  };

  const safe = stripSecrets(canonical);

  const receiptDigest = hashFn({
    kind: safe.kind,
    code: safe.code,
    status: safe.status,
    phase: safe.phase,
    phases: safe.phases,
    artifactPath: safe.artifactPath,
    at: safe.at,
    seq: safe.seq
  });

  const receiptId = `AY-RCPT-${String(receiptDigest).slice(0, 12)}`;

  return {
    ...safe,
    receiptId,
    receiptDigest,
    sealed: true
  };
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
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens)$/i.test(
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
  AY_RECEIPT_KIND,
  AY_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildReasoningReceipt
};
