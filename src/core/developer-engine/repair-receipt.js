/**
 * @module repair-receipt
 * SPEC-0057 / Mission AZ — Sealed EVD-style receipt for Deterministic
 * Self-Repair & FDIR Remediation Bridge. sha256 via node:crypto.
 * NEVER include secrets.
 *
 * NON-CLAIM:
 *   repair receipt ≠ unbounded self-modifying AGI /
 *   ≠ unsupervised internet remediator /
 *   ≠ CloudAgent self-heal fleet
 *   not BA/BB; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const AZ_RECEIPT_PRODUCTION_READY = 'NO';

export const AZ_RECEIPT_KIND = 'eos-deterministic-self-repair-receipt';

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
 * Build a sealed repair receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildRepairReceipt(body = {}, opts = {}) {
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
    kind: AZ_RECEIPT_KIND,
    PRODUCTION_READY: AZ_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true,
    code: body.code != null ? String(body.code) : 'OK',
    status,
    phase: body.phase != null ? String(body.phase) : 'SEAL',
    phases: Array.isArray(body.phases) ? body.phases.map(String) : [],
    faultClass: body.faultClass != null ? String(body.faultClass) : null,
    artifactPath:
      body.artifactPath != null ? String(body.artifactPath) : null,
    planHash: body.planHash != null ? String(body.planHash) : null,
    planId: body.planId != null ? String(body.planId) : null,
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    unboundedSelfModifyingAgi: false,
    unsupervisedInternetRemediator: false,
    cloudAgentSelfHealFleet: false,
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
    faultClass: safe.faultClass,
    artifactPath: safe.artifactPath,
    planHash: safe.planHash,
    at: safe.at,
    seq: safe.seq
  });

  const receiptId = `AZ-RCPT-${String(receiptDigest).slice(0, 12)}`;

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
  AZ_RECEIPT_KIND,
  AZ_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildRepairReceipt
};
