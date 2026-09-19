/**
 * @module local-ci-continuity-receipt
 * SPEC-0100 / Mission CQ — Local CI Continuity Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, runId,
 *     continuityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   continuityMode (ACTIVE|HOLD),
 *   ciEnvironment { github_actions: BILLING_BLOCKED, local_surrogate: ACTIVE,
 *                   github_actions_verdict: NOT_RUN },
 *   surrogateOk?, primaryFailure?, dirty?, stale?, drift?, verifyOk?,
 *   reasons[], continuityPlanDigest?, meta?
 *
 * NON-CLAIM:
 *   Local CI Continuity Port ≠ GitHub Actions green /
 *   ≠ GHE required-check enforcement /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L26 CLOSED never reopen (NEVER reopen L26);
 *   L27 OPEN (Audit MEASURED · CQ in progress · CR–CU pending);
 *   Axis: Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/ci.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CQ_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CQ_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CQ_RECEIPT_KIND = 'eos-local-ci-continuity-receipt';

export const CQ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);

export const CQ_CONTINUITY_MODES = Object.freeze(['ACTIVE', 'HOLD']);

/**
 * Forced CI environment encoding — never claim GH green.
 */
export const CQ_CI_ENVIRONMENT_TEMPLATE = Object.freeze({
  github_actions: 'BILLING_BLOCKED',
  local_surrogate: 'ACTIVE',
  github_actions_verdict: 'NOT_RUN',
  note:
    'NON-CLAIM: local CI continuity ≠ GitHub Actions green ≠ production readiness'
});

/**
 * Stable JSON stringify (sorted keys) for deterministic digests.
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
 * Force BILLING_BLOCKED / ACTIVE / NOT_RUN — refuse GH green overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
export function forceCiEnvironment(overrides = {}) {
  const env = {
    ...CQ_CI_ENVIRONMENT_TEMPLATE,
    ...overrides,
    github_actions: 'BILLING_BLOCKED',
    local_surrogate:
      overrides.local_surrogate != null
        ? String(overrides.local_surrogate)
        : 'ACTIVE',
    github_actions_verdict: 'NOT_RUN'
  };

  if (
    overrides.github_actions === 'PASS' ||
    overrides.github_actions === 'GREEN' ||
    overrides.github_actions === 'SUCCESS' ||
    overrides.github_actions_verdict === 'PASS' ||
    overrides.github_actions_verdict === 'GREEN'
  ) {
    env.refusal =
      'REFUSED claim of GitHub Actions green while billing-blocked; forced NOT_RUN';
  }

  return Object.freeze(env);
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalLocalCiContinuitySealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    runId: fields.runId != null ? String(fields.runId) : null,
    continuityDigest:
      fields.continuityDigest != null && fields.continuityDigest !== ''
        ? String(fields.continuityDigest)
        : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receiptHash over the canonical nine fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashLocalCiContinuityReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalLocalCiContinuitySealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyLocalCiContinuityReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CQ_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CQ_RECEIPT_KIND}, got ${receipt.kind}`
    };
  }

  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  if (receipt.fundacionDelta !== 0) {
    return {
      ok: false,
      reason: `fundacionDelta must be 0, got ${receipt.fundacionDelta}`
    };
  }

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CQ-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CQ-RCPT-' };
  }

  if (!CQ_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CQ_DECISIONS.join('|')}`
    };
  }

  const ci = receipt.ciEnvironment;
  if (!ci || typeof ci !== 'object') {
    return { ok: false, reason: 'ciEnvironment must be present' };
  }
  if (ci.github_actions !== 'BILLING_BLOCKED') {
    return {
      ok: false,
      reason: 'ciEnvironment.github_actions must be BILLING_BLOCKED'
    };
  }
  if (ci.github_actions_verdict !== 'NOT_RUN') {
    return {
      ok: false,
      reason: 'ciEnvironment.github_actions_verdict must be NOT_RUN'
    };
  }

  const expectedHash = hashLocalCiContinuityReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CQ-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildLocalCiContinuityReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CQ-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const continuityMode =
    fields.continuityMode != null &&
    CQ_CONTINUITY_MODES.includes(String(fields.continuityMode).toUpperCase())
      ? String(fields.continuityMode).toUpperCase()
      : fields.continuityMode != null
        ? String(fields.continuityMode)
        : null;

  const ciEnvironment = forceCiEnvironment(fields.ciEnvironment || {});

  const continuityDigest =
    fields.continuityDigest != null && fields.continuityDigest !== ''
      ? String(fields.continuityDigest)
      : hashFn({
          runId: fields.runId || null,
          continuityMode,
          ciEnvironment,
          surrogateOk: fields.surrogateOk ?? null,
          primaryFailure: fields.primaryFailure ?? null
        });

  const continuityPlanDigest =
    fields.continuityPlanDigest != null && fields.continuityPlanDigest !== ''
      ? String(fields.continuityPlanDigest)
      : hashFn({
          planId: fields.planId || null,
          runId: fields.runId || null,
          continuityDigest,
          continuityMode,
          decision: fields.decision || null
        });

  const body = canonicalLocalCiContinuitySealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    runId: fields.runId || null,
    continuityDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CQ_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    continuityMode,
    ciEnvironment,
    surrogateOk:
      fields.surrogateOk === true
        ? true
        : fields.surrogateOk === false
          ? false
          : null,
    primaryFailure:
      fields.primaryFailure != null ? String(fields.primaryFailure) : null,
    dirty: fields.dirty === true,
    stale: fields.stale === true,
    drift: fields.drift === true,
    verifyOk:
      fields.verifyOk === true
        ? true
        : fields.verifyOk === false
          ? false
          : null,
    reasons: Object.freeze([...reasons]),
    continuityPlanDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      githubActionsGreen: false,
      gheEnforcement: false,
      fundacionTouch: false,
      productionReady: false,
      l26Reopen: false
    })
  });
}

export default {
  CQ_PRODUCTION_READY,
  CQ_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CQ_RECEIPT_KIND,
  CQ_DECISIONS,
  CQ_CONTINUITY_MODES,
  CQ_CI_ENVIRONMENT_TEMPLATE,
  stableStringify,
  sha256Canonical,
  defaultHash,
  forceCiEnvironment,
  canonicalLocalCiContinuitySealBody,
  hashLocalCiContinuityReceipt,
  verifyLocalCiContinuityReceipt,
  buildLocalCiContinuityReceipt,
  _resetReceiptSeqForTests
};
