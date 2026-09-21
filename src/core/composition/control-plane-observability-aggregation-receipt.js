/**
 * @module control-plane-observability-aggregation-receipt
 * SPEC-0110 / Mission DA — Control-Plane Observability Aggregation Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     observabilityDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   aggregationMode (ACTIVE|HOLD),
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   observedPorts[], requiredObserveSet[], aggregationOk?, honestyOk?,
 *   refuseCodes[], humanGateHeld?, autoSealRefused?, autoProductionFlipRefused?,
 *   tipPinRewriteRefused?, gheClaimRefused?, autoCloseL29Refused?,
 *   l28ReopenRefused?, reasons[], observabilityPlanDigest?, meta?
 *
 * NON-CLAIM:
 *   Control-Plane Observability Aggregation Port ≠ PRODUCTION_READY flip /
 *   ≠ tip-pin rewrite / ≠ Fundacion write / ≠ GHE /
 *   ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM.
 *   L17–L28 CLOSED never reopen (NEVER reopen L28);
 *   L29 axis: Sovereign Observability & Evidence Economy Fabric (ADR-0081);
 *   DA first satellite after L29 audit; soft-observe freeze pin 2d6ab2d2 (#401)
 *   until tip-open — ≠ tip-pin rewrite.
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Freeze soft-observe pin is `2d6ab2d2` (L29 audit #401). Soft-observe freeze
 * NON-CLAIM surfaces only — do NOT rewrite freeze tip pins from this package.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DA_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DA_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DA_RECEIPT_KIND = 'eos-control-plane-observability-aggregation-receipt';
export const DA_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DA_AGGREGATION_MODES = Object.freeze(['ACTIVE', 'HOLD']);
/** Alias for CY/CX API compatibility (honestyMode / ritualMode ↔ aggregationMode). */
export const DA_HONESTY_MODES = DA_AGGREGATION_MODES;
export const DA_RITUAL_MODES = DA_AGGREGATION_MODES;

export const DA_REQUIRED_OBSERVE_PORTS = Object.freeze(['CV', 'CW', 'CX', 'CY']);
export const DA_OPTIONAL_OBSERVE_PORTS = Object.freeze([
  'CQ',
  'CR',
  'CS',
  'CT',
  'CZ'
]);
export const DA_OBSERVE_PORT_LABELS = Object.freeze([
  'CQ',
  'CR',
  'CS',
  'CT',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ'
]);

/** Freeze soft-observe pin (L29 audit #401). Soft-observe only — do NOT rewrite. */
export const DA_FREEZE_PIN = '2d6ab2d2';
export const DA_FREEZE_PIN_SHORT = '2d6ab2d2';

/**
 * Soft-observed freeze NON-CLAIM fixture labels (read-only; never rewrite tip pins).
 */
export const DA_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'FREEZE:NON-CLAIM:PRODUCTION_READY=NO',
  'FREEZE:NON-CLAIM:Fundacion-delta=0',
  'FREEZE:NON-CLAIM:≠-tip-pin-rewrite',
  'FREEZE:NON-CLAIM:≠-GHE',
  'FREEZE:NON-CLAIM:≠-L29-auto-close',
  'FREEZE:NON-CLAIM:≠-L28-reopen',
  'FREEZE:NON-CLAIM:≠-external-APM',
  'FREEZE:pin=2d6ab2d2:observe-only'
]);

export const DA_FREEZE_OBSERVE_TEMPLATE = Object.freeze({
  pin: DA_FREEZE_PIN,
  pinShort: DA_FREEZE_PIN_SHORT,
  readOnly: true,
  tipRewriteRefused: true,
  productionReadyFlipRefused: true,
  nonClaimLabels: [...DA_FREEZE_NONCLAIM_LABELS],
  note:
    'NON-CLAIM: Control-Plane Observability Aggregation soft-observes freeze surfaces only — ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L29 auto-close (pin 2d6ab2d2 L29 audit #401)'
});

export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(value[k]);
  }
  return out;
}

export function sha256Canonical(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
export function defaultHash(payload) {
  return sha256Canonical(payload);
}

let _rcptSeq = 0;
export function _resetReceiptSeqForTests() {
  _rcptSeq = 0;
}

/**
 * Force freeze observe read-only — refuse tip-pin rewrite / PR flip overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
export function forceFreezeObserve(overrides = {}) {
  const env = {
    ...DA_FREEZE_OBSERVE_TEMPLATE,
    ...overrides,
    pin: DA_FREEZE_PIN,
    pinShort: DA_FREEZE_PIN_SHORT,
    readOnly: true,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    nonClaimLabels: Array.isArray(overrides.nonClaimLabels)
      ? overrides.nonClaimLabels.map(String)
      : [...DA_FREEZE_NONCLAIM_LABELS]
  };

  if (
    overrides.pin != null &&
    String(overrides.pin) !== DA_FREEZE_PIN &&
    String(overrides.pin) !== DA_FREEZE_PIN_SHORT &&
    !String(overrides.pin).startsWith(DA_FREEZE_PIN_SHORT)
  ) {
    env.refusal =
      'REFUSED freeze tip-pin rewrite; forced soft-observe pin 2d6ab2d2 (L29 audit #401)';
  }
  if (
    overrides.readOnly === false ||
    overrides.tipRewrite === true ||
    overrides.rewriteTipPin === true
  ) {
    env.refusal =
      (env.refusal ? env.refusal + '; ' : '') +
      'REFUSED freeze tip-pin mutation; observe remains read-only';
  }

  return Object.freeze({
    ...env,
    nonClaimLabels: Object.freeze([...env.nonClaimLabels])
  });
}

export function normalizeObservePortLabel(label) {
  if (label == null) return null;
  const s = String(label).trim().toUpperCase();
  if (!s) return null;
  const head = s.split(/[:|/.\\s_-]/)[0];
  if (DA_OBSERVE_PORT_LABELS.includes(head)) return head;
  if (DA_OBSERVE_PORT_LABELS.includes(s)) return s;
  return null;
}

export function canonicalControlPlaneObservabilityAggregationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    observabilityDigest:
      fields.observabilityDigest != null && fields.observabilityDigest !== ''
        ? String(fields.observabilityDigest)
        : fields.honestyDigest != null && fields.honestyDigest !== ''
          ? String(fields.honestyDigest)
          : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

export function hashControlPlaneObservabilityAggregationReceipt(
  fields,
  hashFn = sha256Canonical
) {
  return hashFn(canonicalControlPlaneObservabilityAggregationSealBody(fields));
}

export function verifyControlPlaneObservabilityAggregationReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }
  if (receipt.kind !== DA_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${DA_RECEIPT_KIND}, got ${receipt.kind}`
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
  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('DA-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with DA-RCPT-' };
  }
  if (!DA_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${DA_DECISIONS.join('|')}`
    };
  }
  const freeze = receipt.freezeObserve;
  if (!freeze || typeof freeze !== 'object') {
    return { ok: false, reason: 'freezeObserve must be present' };
  }
  if (freeze.readOnly !== true) {
    return { ok: false, reason: 'freezeObserve.readOnly must be true' };
  }
  if (
    freeze.pinShort !== DA_FREEZE_PIN_SHORT &&
    freeze.pin !== DA_FREEZE_PIN &&
    !(typeof freeze.pin === 'string' && freeze.pin.startsWith(DA_FREEZE_PIN_SHORT))
  ) {
    return {
      ok: false,
      reason: 'freezeObserve pin must remain 2d6ab2d2 (soft-observe only)'
    };
  }
  const expected = hashControlPlaneObservabilityAggregationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expected) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expected}, got ${receipt.receiptHash}`
    };
  }
  return { ok: true };
}

export function buildControlPlaneObservabilityAggregationReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `DA-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];
  const rawMode =
    fields.aggregationMode != null
      ? fields.aggregationMode
      : fields.honestyMode != null
        ? fields.honestyMode
        : fields.ritualMode != null
          ? fields.ritualMode
          : fields.observeMode != null
            ? fields.observeMode
            : null;
  const aggregationMode =
    rawMode != null &&
    DA_AGGREGATION_MODES.includes(String(rawMode).toUpperCase())
      ? String(rawMode).toUpperCase()
      : rawMode != null
        ? String(rawMode)
        : null;

  const refuseCodes = Array.isArray(fields.refuseCodes)
    ? fields.refuseCodes.map((c) => String(c))
    : [];
  const observedPorts = Array.isArray(fields.observedPorts)
    ? fields.observedPorts.map((p) => String(p))
    : [];
  const requiredObserveSet = Array.isArray(fields.requiredObserveSet)
    ? fields.requiredObserveSet.map((p) => String(p))
    : [...DA_REQUIRED_OBSERVE_PORTS];

  const freezeObserve = forceFreezeObserve(fields.freezeObserve || {});

  const observabilityDigest =
    fields.observabilityDigest != null && fields.observabilityDigest !== ''
      ? String(fields.observabilityDigest)
      : fields.honestyDigest != null && fields.honestyDigest !== ''
        ? String(fields.honestyDigest)
        : hashFn({
            changeId: fields.changeId || null,
            aggregationMode,
            observedPorts,
            aggregationOk: fields.aggregationOk ?? null,
            refuseCodes,
            freezeObserve: {
              pinShort: freezeObserve.pinShort,
              readOnly: freezeObserve.readOnly
            }
          });

  const observabilityPlanDigest =
    fields.observabilityPlanDigest != null && fields.observabilityPlanDigest !== ''
      ? String(fields.observabilityPlanDigest)
      : fields.honestyPlanDigest != null && fields.honestyPlanDigest !== ''
        ? String(fields.honestyPlanDigest)
        : hashFn({
            planId: fields.planId || null,
            changeId: fields.changeId || null,
            observabilityDigest,
            aggregationMode,
            decision: fields.decision || null
          });

  const body = canonicalControlPlaneObservabilityAggregationSealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    changeId: fields.changeId || null,
    observabilityDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });
  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: DA_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    honestyDigest: observabilityDigest,
    aggregationMode,
    honestyMode: aggregationMode,
    ritualMode: aggregationMode,
    observeMode: aggregationMode,
    phase: fields.phase != null ? String(fields.phase) : null,
    freezeObserve,
    observedPorts: Object.freeze([...observedPorts]),
    requiredObserveSet: Object.freeze([...requiredObserveSet]),
    aggregationOk:
      fields.aggregationOk === true
        ? true
        : fields.aggregationOk === false
          ? false
          : null,
    residualHonestyOk:
      fields.residualHonestyOk === true
        ? true
        : fields.residualHonestyOk === false
          ? false
          : fields.aggregationOk === true
            ? true
            : fields.aggregationOk === false
              ? false
              : null,
    honestyOk:
      fields.honestyOk === true
        ? true
        : fields.honestyOk === false
          ? false
          : null,
    refuseCodes: Object.freeze([...refuseCodes]),
    humanGateHeld: fields.humanGateHeld === true,
    autoSealRefused: fields.autoSealRefused === true,
    autoProductionFlipRefused: fields.autoProductionFlipRefused === true,
    tipPinRewriteRefused: fields.tipPinRewriteRefused === true,
    gheClaimRefused: fields.gheClaimRefused === true,
    autoCloseL29Refused: fields.autoCloseL29Refused === true,
    l28ReopenRefused: fields.l28ReopenRefused === true,
    reasons: Object.freeze([...reasons]),
    observabilityPlanDigest,
    honestyPlanDigest: observabilityPlanDigest,
    meta: Object.freeze({
      freezePin: DA_FREEZE_PIN_SHORT,
      freezePinFull: DA_FREEZE_PIN,
      ...(fields.meta || {})
    }),
    receiptHash,
    nonClaims: Object.freeze({
      productionReadyFlip: false,
      l28Reopen: false,
      tipRewrite: false,
      tipPinRewrite: false,
      ghe: false,
      fundacionWriteAuth: false,
      fundacionTouch: false,
      productionReady: false,
      l29Closeout: false,
      l29AutoClose: false,
      tipRefresh: false,
      externalApm: false,
      autoSealL29: false
    })
  });
}

export default {
  DA_PRODUCTION_READY,
  DA_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DA_RECEIPT_KIND,
  DA_DECISIONS,
  DA_AGGREGATION_MODES,
  DA_HONESTY_MODES,
  DA_RITUAL_MODES,
  DA_REQUIRED_OBSERVE_PORTS,
  DA_OPTIONAL_OBSERVE_PORTS,
  DA_OBSERVE_PORT_LABELS,
  DA_FREEZE_NONCLAIM_LABELS,
  DA_FREEZE_OBSERVE_TEMPLATE,
  DA_FREEZE_PIN,
  DA_FREEZE_PIN_SHORT,
  stableStringify,
  sha256Canonical,
  defaultHash,
  forceFreezeObserve,
  normalizeObservePortLabel,
  canonicalControlPlaneObservabilityAggregationSealBody,
  hashControlPlaneObservabilityAggregationReceipt,
  verifyControlPlaneObservabilityAggregationReceipt,
  buildControlPlaneObservabilityAggregationReceipt,
  _resetReceiptSeqForTests
};
