/**
 * @module notary-receipt
 * SPEC-0063 / Mission BF — Sealed notary receipt for Local Release
 * Candidate Packaging & Artifact Notary Port. sha256 via node:crypto.
 * NEVER include secrets. stableStringify + sha256Canonical like BE
 * replay-receipt (compose pattern; this file does NOT rewrite BE
 * replay-receipt.js, BD delivery-receipt.js, or BC apply-receipt.js).
 *
 * NON-CLAIM:
 *   notary receipt ≠ PRODUCTION_READY=YES flip /
 *   ≠ public registry publish /
 *   ≠ GH Releases product
 *   not BG; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BF_RECEIPT_PRODUCTION_READY = 'NO';

export const BF_RECEIPT_KIND = 'eos-local-rc-packaging-artifact-notary-receipt';

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
 * Build a sealed notary receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildNotaryReceipt(body = {}, opts = {}) {
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
        : body.code === 'PACKAGED' || body.code === 'OK'
          ? 'PACKAGED'
          : 'OK';

  const canonical = {
    kind: BF_RECEIPT_KIND,
    PRODUCTION_READY: BF_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true,
    code: body.code != null ? String(body.code) : 'OK',
    status,
    phase: body.phase != null ? String(body.phase) : 'SEAL',
    phases: Array.isArray(body.phases) ? body.phases.map(String) : [],
    manifestDigest:
      body.manifestDigest != null ? String(body.manifestDigest) : null,
    artifactCount:
      body.artifactCount != null ? Number(body.artifactCount) : null,
    artifactIds: Array.isArray(body.artifactIds)
      ? body.artifactIds.map(String)
      : [],
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    productionReadyYesFlip: false,
    publicRegistryPublish: false,
    ghReleasesProduct: false,
    cloudAgent: false,
    usesCloudAgent: false,
    at,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    decision: body.decision != null ? body.decision : null,
    deny: body.deny === true || body.ok === false,
    hermetic: body.hermetic !== false,
    meta: body.meta != null ? stripSecrets(body.meta) : undefined
  };

  const safe = stripSecrets(canonical);

  const receiptDigest = hashFn({
    kind: safe.kind,
    code: safe.code,
    status: safe.status,
    phase: safe.phase,
    phases: safe.phases,
    manifestDigest: safe.manifestDigest,
    artifactCount: safe.artifactCount,
    artifactIds: safe.artifactIds,
    at: safe.at,
    seq: safe.seq
  });

  const receiptId = `BF-RCPT-${String(receiptDigest).slice(0, 12)}`;

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
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens|receiptDigest|sha256|digest|manifestDigest)$/i.test(
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
  BF_RECEIPT_KIND,
  BF_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildNotaryReceipt
};
