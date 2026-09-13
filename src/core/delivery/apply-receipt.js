/**
 * @module apply-receipt
 * SPEC-0060 / Mission BC — Sealed apply receipt for Governed Patch /
 * Diff Apply Port. sha256 via node:crypto. NEVER include secrets.
 *
 * NON-CLAIM:
 *   apply receipt ≠ unsupervised auto-merge SaaS /
 *   ≠ GH Actions replacement /
 *   ≠ PRODUCTION_READY delivery product
 *   not BD/BE/BF/BG; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const BC_RECEIPT_PRODUCTION_READY = 'NO';

export const BC_RECEIPT_KIND = 'eos-governed-patch-diff-apply-receipt';

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
 * Build a sealed apply receipt — NEVER includes secret values.
 * Explicit NON-CLAIM flags always false.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildApplyReceipt(body = {}, opts = {}) {
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
        : body.code === 'APPLIED' || body.code === 'OK'
          ? 'APPLIED'
          : 'OK';

  const targets = Array.isArray(body.targets)
    ? body.targets.map(String)
    : body.target != null
      ? [String(body.target)]
      : [];

  const canonical = {
    kind: BC_RECEIPT_KIND,
    PRODUCTION_READY: BC_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false && body.deny !== true,
    code: body.code != null ? String(body.code) : 'OK',
    status,
    phase: body.phase != null ? String(body.phase) : 'SEAL',
    phases: Array.isArray(body.phases) ? body.phases.map(String) : [],
    targets,
    appliedPaths: Array.isArray(body.appliedPaths)
      ? body.appliedPaths.map(String)
      : [],
    fundacionDelta: 0,
    fundacion: 'ALWAYS_DENY',
    // NON-CLAIM flags — always false
    unsupervisedAutoMergeSaas: false,
    ghActionsReplacement: false,
    productionReadyDeliveryProduct: false,
    autoMerge: false,
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
    targets: safe.targets,
    appliedPaths: safe.appliedPaths,
    at: safe.at,
    seq: safe.seq
  });

  const receiptId = `BC-RCPT-${String(receiptDigest).slice(0, 12)}`;

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
      !/^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|promptTokens|completionTokens|totalTokens|receiptDigest|sha256|digest)$/i.test(
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
  BC_RECEIPT_KIND,
  BC_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildApplyReceipt
};
