/**
 * @module fleet-activation-receipt
 * SPEC-0087 / Mission CD — Fleet Project Registry & Governed Activation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, projectId, decision, projectSsotDigest,
 *     allowedMissionCount, timestamp, fundacionDelta, prevReceiptHash }
 *
 * NON-CLAIM:
 *   Fleet activation ≠ Kubernetes multi-cluster control plane /
 *   ≠ touches Fundacion (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L23 CLOSED never reopen;
 *   L24 OPEN (Audit + CB + CC MEASURED · CD in progress · CE–CF pending);
 *   Axis: Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/projects.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CD_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CD_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CD_RECEIPT_KIND = 'eos-fleet-activation-receipt';

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
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalFleetActivationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    projectId: fields.projectId != null ? String(fields.projectId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    projectSsotDigest:
      fields.projectSsotDigest != null && fields.projectSsotDigest !== ''
        ? String(fields.projectSsotDigest)
        : null,
    allowedMissionCount:
      fields.allowedMissionCount != null &&
      Number.isFinite(Number(fields.allowedMissionCount))
        ? Number(fields.allowedMissionCount)
        : 0,
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
export function hashFleetActivationReceipt(fields, hashFn = sha256Canonical) {
  const body = canonicalFleetActivationSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyFleetActivationReceipt(receipt, hashFn = sha256Canonical) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CD_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CD_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CD-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CD-RCPT-' };
  }

  const expectedHash = hashFleetActivationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CD-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildFleetActivationReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CD-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const allowedMissions = Array.isArray(fields.allowedMissions)
    ? fields.allowedMissions.map((m) => String(m))
    : [];
  const deniedMissions = Array.isArray(fields.deniedMissions)
    ? fields.deniedMissions.map((m) => String(m))
    : [];
  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const body = canonicalFleetActivationSealBody({
    receiptId,
    operation: fields.operation || 'ACTIVATE',
    projectId: fields.projectId || null,
    decision: fields.decision || 'ALLOW',
    projectSsotDigest: fields.projectSsotDigest || null,
    allowedMissionCount:
      fields.allowedMissionCount != null
        ? fields.allowedMissionCount
        : allowedMissions.length,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CD_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    allowedMissions: Object.freeze([...allowedMissions]),
    deniedMissions: Object.freeze([...deniedMissions]),
    reasons: Object.freeze([...reasons]),
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      kubernetesMultiClusterControlPlane: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CD_PRODUCTION_READY,
  CD_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CD_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalFleetActivationSealBody,
  hashFleetActivationReceipt,
  verifyFleetActivationReceipt,
  buildFleetActivationReceipt,
  _resetReceiptSeqForTests
};
