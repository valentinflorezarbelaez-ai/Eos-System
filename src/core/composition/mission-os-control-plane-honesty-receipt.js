/**
 * @module mission-os-control-plane-honesty-receipt
 * SPEC-0108 / Mission CY — Mission OS / Control-Plane L0 Residual Honesty Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     honestyDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   honestyMode (ACTIVE|HOLD),
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   observedPorts[], requiredObserveSet[], residualHonestyOk?, honestyOk?,
 *   refuseCodes[], humanGateHeld?, autoSealRefused?, autoProductionFlipRefused?,
 *   tipPinRewriteRefused?, gheClaimRefused?, autoCloseL28Refused?, startCzRefused?,
 *   reasons[], honestyPlanDigest?, meta?
 *
 * NON-CLAIM:
 *   Mission OS / Control-Plane L0 Residual Honesty Port ≠ PRODUCTION_READY flip /
 *   ≠ tip-pin rewrite / ≠ Fundacion write / ≠ GHE /
 *   ≠ L28 auto-close / ≠ CZ start / ≠ L27 reopen.
 *   L17–L27 CLOSED never reopen (NEVER reopen L27);
 *   L28 OPEN (Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY in progress · CZ pending);
 *   Axis: Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Freeze honesty pin is `487a38bf` (CX #394 MEASURED). Soft-observe freeze
 * NON-CLAIM surfaces only — do NOT rewrite freeze tip pins from this package.
 * Explicitly: no tip-refresh / no CZ from this package.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CY_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const CY_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CY_RECEIPT_KIND = 'eos-mission-os-control-plane-honesty-receipt';
export const CY_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const CY_HONESTY_MODES = Object.freeze(['ACTIVE', 'HOLD']);
/** Alias for CW/CX API compatibility (ritualMode ↔ honestyMode). */
export const CY_RITUAL_MODES = CY_HONESTY_MODES;

export const CY_REQUIRED_OBSERVE_PORTS = Object.freeze(['CV', 'CW', 'CX']);
export const CY_OPTIONAL_OBSERVE_PORTS = Object.freeze([
  'CQ',
  'CR',
  'CS',
  'CT'
]);
export const CY_OBSERVE_PORT_LABELS = Object.freeze([
  'CQ',
  'CR',
  'CS',
  'CT',
  'CV',
  'CW',
  'CX'
]);

/** Freeze honesty pin (CX MEASURED #394). Soft-observe only — do NOT rewrite. */
export const CY_FREEZE_PIN = '487a38bfa6b174141171aa476e5b7b98cf4a0a4e';
export const CY_FREEZE_PIN_SHORT = '487a38bf';

/**
 * Soft-observed freeze NON-CLAIM fixture labels (read-only; never rewrite tip pins).
 */
export const CY_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'FREEZE:NON-CLAIM:PRODUCTION_READY=NO',
  'FREEZE:NON-CLAIM:Fundacion-delta=0',
  'FREEZE:NON-CLAIM:≠-tip-pin-rewrite',
  'FREEZE:NON-CLAIM:≠-GHE',
  'FREEZE:NON-CLAIM:≠-L28-auto-close',
  'FREEZE:NON-CLAIM:≠-CZ-start',
  'FREEZE:NON-CLAIM:≠-L27-reopen',
  'FREEZE:pin=487a38bf:observe-only'
]);

export const CY_FREEZE_OBSERVE_TEMPLATE = Object.freeze({
  pin: CY_FREEZE_PIN,
  pinShort: CY_FREEZE_PIN_SHORT,
  readOnly: true,
  tipRewriteRefused: true,
  productionReadyFlipRefused: true,
  nonClaimLabels: [...CY_FREEZE_NONCLAIM_LABELS],
  note:
    'NON-CLAIM: Mission OS control-plane residual honesty soft-observes freeze surfaces only — ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ CZ start'
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
    ...CY_FREEZE_OBSERVE_TEMPLATE,
    ...overrides,
    pin: CY_FREEZE_PIN,
    pinShort: CY_FREEZE_PIN_SHORT,
    readOnly: true,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    nonClaimLabels: Array.isArray(overrides.nonClaimLabels)
      ? overrides.nonClaimLabels.map(String)
      : [...CY_FREEZE_NONCLAIM_LABELS]
  };

  if (
    overrides.pin != null &&
    String(overrides.pin) !== CY_FREEZE_PIN &&
    String(overrides.pin) !== CY_FREEZE_PIN_SHORT
  ) {
    env.refusal =
      'REFUSED freeze tip-pin rewrite; forced soft-observe pin 487a38bf (CX MEASURED)';
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
  if (CY_OBSERVE_PORT_LABELS.includes(head)) return head;
  if (CY_OBSERVE_PORT_LABELS.includes(s)) return s;
  return null;
}

export function canonicalMissionOsControlPlaneHonestySealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    honestyDigest:
      fields.honestyDigest != null && fields.honestyDigest !== ''
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

export function hashMissionOsControlPlaneHonestyReceipt(
  fields,
  hashFn = sha256Canonical
) {
  return hashFn(canonicalMissionOsControlPlaneHonestySealBody(fields));
}

export function verifyMissionOsControlPlaneHonestyReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }
  if (receipt.kind !== CY_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CY_RECEIPT_KIND}, got ${receipt.kind}`
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
  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CY-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CY-RCPT-' };
  }
  if (!CY_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CY_DECISIONS.join('|')}`
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
    freeze.pinShort !== CY_FREEZE_PIN_SHORT &&
    freeze.pin !== CY_FREEZE_PIN
  ) {
    return {
      ok: false,
      reason: 'freezeObserve pin must remain 487a38bf (soft-observe only)'
    };
  }
  const expected = hashMissionOsControlPlaneHonestyReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expected) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expected}, got ${receipt.receiptHash}`
    };
  }
  return { ok: true };
}

export function buildMissionOsControlPlaneHonestyReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CY-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];
  const rawMode =
    fields.honestyMode != null
      ? fields.honestyMode
      : fields.ritualMode != null
        ? fields.ritualMode
        : null;
  const honestyMode =
    rawMode != null &&
    CY_HONESTY_MODES.includes(String(rawMode).toUpperCase())
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
    : [...CY_REQUIRED_OBSERVE_PORTS];

  const freezeObserve = forceFreezeObserve(fields.freezeObserve || {});

  const honestyDigest =
    fields.honestyDigest != null && fields.honestyDigest !== ''
      ? String(fields.honestyDigest)
      : hashFn({
          changeId: fields.changeId || null,
          honestyMode,
          observedPorts,
          residualHonestyOk: fields.residualHonestyOk ?? null,
          refuseCodes,
          freezeObserve: {
            pinShort: freezeObserve.pinShort,
            readOnly: freezeObserve.readOnly
          }
        });

  const honestyPlanDigest =
    fields.honestyPlanDigest != null && fields.honestyPlanDigest !== ''
      ? String(fields.honestyPlanDigest)
      : hashFn({
          planId: fields.planId || null,
          changeId: fields.changeId || null,
          honestyDigest,
          honestyMode,
          decision: fields.decision || null
        });

  const body = canonicalMissionOsControlPlaneHonestySealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    changeId: fields.changeId || null,
    honestyDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });
  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CY_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    honestyMode,
    ritualMode: honestyMode,
    phase: fields.phase != null ? String(fields.phase) : null,
    freezeObserve,
    observedPorts: Object.freeze([...observedPorts]),
    requiredObserveSet: Object.freeze([...requiredObserveSet]),
    residualHonestyOk:
      fields.residualHonestyOk === true
        ? true
        : fields.residualHonestyOk === false
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
    autoCloseL28Refused: fields.autoCloseL28Refused === true,
    startCzRefused: fields.startCzRefused === true,
    reasons: Object.freeze([...reasons]),
    honestyPlanDigest,
    meta: Object.freeze({
      freezePin: CY_FREEZE_PIN_SHORT,
      freezePinFull: CY_FREEZE_PIN,
      ...(fields.meta || {})
    }),
    receiptHash,
    nonClaims: Object.freeze({
      productionReadyFlip: false,
      l27Reopen: false,
      tipRewrite: false,
      tipPinRewrite: false,
      ghe: false,
      fundacionWriteAuth: false,
      fundacionTouch: false,
      productionReady: false,
      l28Closeout: false,
      l28AutoClose: false,
      tipRefresh: false,
      startCZ: false,
      autoSealL28: false
    })
  });
}

export default {
  CY_PRODUCTION_READY,
  CY_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CY_RECEIPT_KIND,
  CY_DECISIONS,
  CY_HONESTY_MODES,
  CY_RITUAL_MODES,
  CY_REQUIRED_OBSERVE_PORTS,
  CY_OPTIONAL_OBSERVE_PORTS,
  CY_OBSERVE_PORT_LABELS,
  CY_FREEZE_NONCLAIM_LABELS,
  CY_FREEZE_OBSERVE_TEMPLATE,
  CY_FREEZE_PIN,
  CY_FREEZE_PIN_SHORT,
  stableStringify,
  sha256Canonical,
  defaultHash,
  forceFreezeObserve,
  normalizeObservePortLabel,
  canonicalMissionOsControlPlaneHonestySealBody,
  hashMissionOsControlPlaneHonestyReceipt,
  verifyMissionOsControlPlaneHonestyReceipt,
  buildMissionOsControlPlaneHonestyReceipt,
  _resetReceiptSeqForTests
};
