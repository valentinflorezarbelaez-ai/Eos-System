/**
 * @module hud-doctor-honesty-ritual-receipt
 * SPEC-0105 / Mission CV — HUD/Doctor Honesty Ritual Composition Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     ritualDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   ritualMode (ACTIVE|HOLD), honestyOk?, freezeLagMeasured?,
 *   dirtyDeferred?, nonClaimChips[], pendingPorts[], cqCtObserveLabels[],
 *   refuseCodes[], humanGateHeld?, autoSealRefused?, autoProductionFlipRefused?,
 *   reasons[], ritualPlanDigest?, honestySurfaceDigest?, meta?
 *
 * NON-CLAIM:
 *   HUD/Doctor Honesty Ritual Composition Port ≠ PRODUCTION_READY flip /
 *   ≠ L27 reopen / ≠ tip rewrite / ≠ GHE / ≠ L28 closeout / ≠ tip-refresh / ≠ CW.
 *   L17–L27 CLOSED never reopen (NEVER reopen L27);
 *   L28 OPEN (Audit MEASURED · CV in progress · CW–CZ pending);
 *   Axis: Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/composition.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CV_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CV_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CV_RECEIPT_KIND = 'eos-hud-doctor-honesty-ritual-receipt';

export const CV_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);

export const CV_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD']);

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
export function canonicalHudDoctorHonestyRitualSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    ritualDigest:
      fields.ritualDigest != null && fields.ritualDigest !== ''
        ? String(fields.ritualDigest)
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
export function hashHudDoctorHonestyRitualReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalHudDoctorHonestyRitualSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyHudDoctorHonestyRitualReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CV_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CV_RECEIPT_KIND}, got ${receipt.kind}`
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

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CV-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CV-RCPT-' };
  }

  if (!CV_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CV_DECISIONS.join('|')}`
    };
  }

  const expectedHash = hashHudDoctorHonestyRitualReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CV-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildHudDoctorHonestyRitualReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CV-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const ritualMode =
    fields.ritualMode != null &&
    CV_RITUAL_MODES.includes(String(fields.ritualMode).toUpperCase())
      ? String(fields.ritualMode).toUpperCase()
      : fields.ritualMode != null
        ? String(fields.ritualMode)
        : null;

  const refuseCodes = Array.isArray(fields.refuseCodes)
    ? fields.refuseCodes.map((c) => String(c))
    : [];

  const nonClaimChips = Array.isArray(fields.nonClaimChips)
    ? fields.nonClaimChips.map((c) => String(c))
    : [];

  const pendingPorts = Array.isArray(fields.pendingPorts)
    ? fields.pendingPorts.map((p) => String(p))
    : [];

  const cqCtObserveLabels = Array.isArray(fields.cqCtObserveLabels)
    ? fields.cqCtObserveLabels.map((l) => String(l))
    : [];

  const ritualDigest =
    fields.ritualDigest != null && fields.ritualDigest !== ''
      ? String(fields.ritualDigest)
      : hashFn({
          changeId: fields.changeId || null,
          ritualMode,
          honestyOk: fields.honestyOk ?? null,
          freezeLagMeasured: fields.freezeLagMeasured ?? null,
          dirtyDeferred: fields.dirtyDeferred ?? null,
          refuseCodes
        });

  const ritualPlanDigest =
    fields.ritualPlanDigest != null && fields.ritualPlanDigest !== ''
      ? String(fields.ritualPlanDigest)
      : hashFn({
          planId: fields.planId || null,
          changeId: fields.changeId || null,
          ritualDigest,
          ritualMode,
          decision: fields.decision || null
        });

  const honestySurfaceDigest =
    fields.honestySurfaceDigest != null && fields.honestySurfaceDigest !== ''
      ? String(fields.honestySurfaceDigest)
      : null;

  const body = canonicalHudDoctorHonestyRitualSealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    changeId: fields.changeId || null,
    ritualDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CV_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    ritualMode,
    honestyOk:
      fields.honestyOk === true
        ? true
        : fields.honestyOk === false
          ? false
          : null,
    freezeLagMeasured:
      fields.freezeLagMeasured === true
        ? true
        : fields.freezeLagMeasured === false
          ? false
          : null,
    dirtyDeferred:
      fields.dirtyDeferred === true
        ? true
        : fields.dirtyDeferred === false
          ? false
          : null,
    nonClaimChips: Object.freeze([...nonClaimChips]),
    pendingPorts: Object.freeze([...pendingPorts]),
    cqCtObserveLabels: Object.freeze([...cqCtObserveLabels]),
    refuseCodes: Object.freeze([...refuseCodes]),
    humanGateHeld: fields.humanGateHeld === true,
    autoSealRefused: fields.autoSealRefused === true,
    autoProductionFlipRefused: fields.autoProductionFlipRefused === true,
    reasons: Object.freeze([...reasons]),
    ritualPlanDigest,
    honestySurfaceDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      productionReadyFlip: false,
      l27Reopen: false,
      tipRewrite: false,
      ghe: false,
      fundacionWriteAuth: false,
      fundacionTouch: false,
      productionReady: false,
      l28Closeout: false,
      tipRefresh: false,
      startCW: false
    })
  });
}

export default {
  CV_PRODUCTION_READY,
  CV_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CV_RECEIPT_KIND,
  CV_DECISIONS,
  CV_RITUAL_MODES,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalHudDoctorHonestyRitualSealBody,
  hashHudDoctorHonestyRitualReceipt,
  verifyHudDoctorHonestyRitualReceipt,
  buildHudDoctorHonestyRitualReceipt,
  _resetReceiptSeqForTests
};
