/**
 * @module mission-archive-replay-receipt
 * SPEC-0091 / Mission CH — Long-Horizon Mission Archive & Replay Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, archiveId, decision, entryCount,
 *     trailDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   trailEntries[] { missionId, receiptId, digest }, reasons[], replayCursor?
 *
 * NON-CLAIM:
 *   Long-horizon mission archive & replay ≠ production data lake /
 *   ≠ SIEM retention SaaS /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit + CG MEASURED · CH in progress · CI–CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/archive.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CH_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CH_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CH_RECEIPT_KIND = 'eos-mission-archive-replay-receipt';

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
 * Normalize a trail entry for sealing / display.
 * @param {unknown} entry
 * @returns {{ missionId: string, receiptId: string, digest: string }|null}
 */
export function normalizeTrailEntry(entry) {
  if (entry == null || typeof entry !== 'object') return null;
  const missionId =
    entry.missionId != null ? String(entry.missionId).trim() : '';
  const receiptId =
    entry.receiptId != null ? String(entry.receiptId).trim() : '';
  const digest = entry.digest != null ? String(entry.digest).trim() : '';
  if (!missionId && !receiptId && !digest) return null;
  return { missionId, receiptId, digest };
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalMissionArchiveReplaySealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    archiveId: fields.archiveId != null ? String(fields.archiveId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    entryCount:
      fields.entryCount != null && Number.isFinite(Number(fields.entryCount))
        ? Number(fields.entryCount)
        : 0,
    trailDigest:
      fields.trailDigest != null && fields.trailDigest !== ''
        ? String(fields.trailDigest)
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
export function hashMissionArchiveReplayReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalMissionArchiveReplaySealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyMissionArchiveReplayReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CH_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CH_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CH-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CH-RCPT-' };
  }

  const expectedHash = hashMissionArchiveReplayReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CH-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildMissionArchiveReplayReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CH-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const trailEntries = Array.isArray(fields.trailEntries)
    ? fields.trailEntries
        .map((e) => normalizeTrailEntry(e))
        .filter((e) => e != null)
    : [];
  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const trailDigest =
    fields.trailDigest != null && fields.trailDigest !== ''
      ? String(fields.trailDigest)
      : trailEntries.length > 0
        ? hashFn({
            trailEntries,
            decision: fields.decision || null,
            archiveId: fields.archiveId || null
          })
        : null;

  const body = canonicalMissionArchiveReplaySealBody({
    receiptId,
    operation: fields.operation || 'ARCHIVE',
    archiveId: fields.archiveId || null,
    decision: fields.decision || 'DENY',
    entryCount:
      fields.entryCount != null ? fields.entryCount : trailEntries.length,
    trailDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  const replayCursor =
    fields.replayCursor != null && fields.replayCursor !== ''
      ? String(fields.replayCursor)
      : null;

  return Object.freeze({
    kind: CH_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    trailEntries: Object.freeze(
      trailEntries.map((e) => Object.freeze({ ...e }))
    ),
    reasons: Object.freeze([...reasons]),
    replayCursor,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      productionDataLake: false,
      siemRetentionSaas: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CH_PRODUCTION_READY,
  CH_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CH_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeTrailEntry,
  canonicalMissionArchiveReplaySealBody,
  hashMissionArchiveReplayReceipt,
  verifyMissionArchiveReplayReceipt,
  buildMissionArchiveReplayReceipt,
  _resetReceiptSeqForTests
};
