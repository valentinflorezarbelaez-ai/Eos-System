/**
 * @module adversarial-verification-receipt
 * SPEC-0093 / Mission CJ — Continuous Adversarial Verification Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, probeId, decision, targetCount,
 *     findingsDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   targets[] { claimId, claimedStatus }, findings[] { severity, message },
 *   reasons[], probeDigest?
 *
 * NON-CLAIM:
 *   Continuous Adversarial Verification Port ≠ red-team consulting product /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit + CG + CH + CI MEASURED · CJ in progress · CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/verification.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CJ_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CJ_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CJ_RECEIPT_KIND = 'eos-adversarial-verification-receipt';

export const CJ_CLAIM_STATUSES = Object.freeze([
  'MEASURED',
  'UNKNOWN',
  'BLOCKED'
]);

export const CJ_FINDING_SEVERITIES = Object.freeze(['INFO', 'WARN', 'FAIL']);

export const CJ_DECISIONS = Object.freeze(['PASS', 'CHALLENGE', 'DENY']);

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
 * Normalize a target for sealing / display.
 * @param {unknown} target
 * @returns {{ claimId: string, claimedStatus: string }|null}
 */
export function normalizeTarget(target) {
  if (target == null || typeof target !== 'object') return null;
  const claimId = target.claimId != null ? String(target.claimId).trim() : '';
  const claimedStatus =
    target.claimedStatus != null
      ? String(target.claimedStatus).trim().toUpperCase()
      : '';
  if (!claimId || !claimedStatus) return null;
  return { claimId, claimedStatus };
}

/**
 * Normalize a finding for sealing / display.
 * @param {unknown} finding
 * @returns {{ severity: string, message: string }|null}
 */
export function normalizeFinding(finding) {
  if (finding == null || typeof finding !== 'object') return null;
  const severity =
    finding.severity != null
      ? String(finding.severity).trim().toUpperCase()
      : '';
  const message = finding.message != null ? String(finding.message) : '';
  if (!severity || !message) return null;
  return { severity, message };
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalAdversarialVerificationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    probeId: fields.probeId != null ? String(fields.probeId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    targetCount:
      fields.targetCount != null ? Number(fields.targetCount) : 0,
    findingsDigest:
      fields.findingsDigest != null && fields.findingsDigest !== ''
        ? String(fields.findingsDigest)
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
export function hashAdversarialVerificationReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalAdversarialVerificationSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyAdversarialVerificationReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CJ_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CJ_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CJ-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CJ-RCPT-' };
  }

  const expectedHash = hashAdversarialVerificationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CJ-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildAdversarialVerificationReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CJ-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  /** @type {Array<{ claimId: string, claimedStatus: string }>} */
  const targets = [];
  if (Array.isArray(fields.targets)) {
    for (const t of fields.targets) {
      const n = normalizeTarget(t);
      if (n) targets.push(n);
    }
  }

  /** @type {Array<{ severity: string, message: string }>} */
  const findings = [];
  if (Array.isArray(fields.findings)) {
    for (const f of fields.findings) {
      const n = normalizeFinding(f);
      if (n) findings.push(n);
    }
  }

  const findingsDigest =
    fields.findingsDigest != null && fields.findingsDigest !== ''
      ? String(fields.findingsDigest)
      : hashFn(findings);

  const probeDigest =
    fields.probeDigest != null && fields.probeDigest !== ''
      ? String(fields.probeDigest)
      : hashFn({
          probeId: fields.probeId || null,
          targets,
          findings,
          decision: fields.decision || null
        });

  const body = canonicalAdversarialVerificationSealBody({
    receiptId,
    operation: fields.operation || 'PROBE',
    probeId: fields.probeId || null,
    decision: fields.decision || 'DENY',
    targetCount:
      fields.targetCount != null ? Number(fields.targetCount) : targets.length,
    findingsDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CJ_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    targets: Object.freeze(targets.map((t) => Object.freeze({ ...t }))),
    findings: Object.freeze(findings.map((f) => Object.freeze({ ...f }))),
    reasons: Object.freeze([...reasons]),
    probeDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      redTeamConsultingProduct: false,
      ghEnterpriseEnforcement: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CJ_PRODUCTION_READY,
  CJ_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CJ_RECEIPT_KIND,
  CJ_CLAIM_STATUSES,
  CJ_FINDING_SEVERITIES,
  CJ_DECISIONS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeTarget,
  normalizeFinding,
  canonicalAdversarialVerificationSealBody,
  hashAdversarialVerificationReceipt,
  verifyAdversarialVerificationReceipt,
  buildAdversarialVerificationReceipt,
  _resetReceiptSeqForTests
};
