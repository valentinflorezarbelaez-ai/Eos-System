/**
 * @module doctor-ritual-automation-receipt
 * SPEC-0111 / Mission DB — Doctor Ritual Automation Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     ritualDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   ritualMode (ACTIVE|HOLD),
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   observedPorts[], requiredObserveSet[], ritualOk?, honestyOk?,
 *   refuseCodes[], humanGateHeld?, autoSealRefused?, autoProductionFlipRefused?,
 *   tipPinRewriteRefused?, gheClaimRefused?, autoCloseL29Refused?,
 *   l28ReopenRefused?, reasons[], ritualPlanDigest?, meta?
 *
 * NON-CLAIM:
 *   Doctor Ritual Automation Port ≠ PRODUCTION_READY flip /
 *   ≠ tip-pin rewrite / ≠ Fundacion write / ≠ GHE /
 *   ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM.
 *   L17–L28 CLOSED never reopen (NEVER reopen L28);
 *   L29 axis: Sovereign Observability & Evidence Economy Fabric (ADR-0081);
 *   DB second satellite after DA MEASURED; soft-observe freeze pin daae7380 (#403 DA)
 *   until tip-refresh — ≠ tip-pin rewrite.
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Freeze soft-observe pin is `daae7380` (DA MEASURED #403). Soft-observe freeze
 * NON-CLAIM surfaces only — do NOT rewrite freeze tip pins from this package.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DB_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DB_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DB_RECEIPT_KIND = 'eos-doctor-ritual-automation-receipt';
export const DB_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DB_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD']);
/** Aliases for DA/CY/CX API compatibility. */
export const DB_HONESTY_MODES = DB_RITUAL_MODES;
export const DB_AGGREGATION_MODES = DB_RITUAL_MODES;

/** Required: DA observe labels for ACTIVE PASS. */
export const DB_REQUIRED_OBSERVE_PORTS = Object.freeze(['DA']);
/** Soft-observe L28 honesty labels (compose; not hard-required for gate PASS). */
export const DB_SOFT_OBSERVE_L28_PORTS = Object.freeze(['CV', 'CW', 'CX', 'CY']);
export const DB_OPTIONAL_OBSERVE_PORTS = Object.freeze([
  'CQ',
  'CR',
  'CS',
  'CT',
  'CZ',
  'CV',
  'CW',
  'CX',
  'CY'
]);
export const DB_OBSERVE_PORT_LABELS = Object.freeze([
  'CQ',
  'CR',
  'CS',
  'CT',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ',
  'DA'
]);

/** Freeze soft-observe pin (DA MEASURED #403). Soft-observe only — do NOT rewrite. */
export const DB_FREEZE_PIN = 'daae7380';
export const DB_FREEZE_PIN_SHORT = 'daae7380';

/**
 * Soft-observed freeze NON-CLAIM fixture labels (read-only; never rewrite tip pins).
 */
export const DB_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'FREEZE:NON-CLAIM:PRODUCTION_READY=NO',
  'FREEZE:NON-CLAIM:Fundacion-delta=0',
  'FREEZE:NON-CLAIM:≠-tip-pin-rewrite',
  'FREEZE:NON-CLAIM:≠-GHE',
  'FREEZE:NON-CLAIM:≠-L29-auto-close',
  'FREEZE:NON-CLAIM:≠-L28-reopen',
  'FREEZE:NON-CLAIM:≠-external-APM',
  'FREEZE:pin=daae7380:observe-only'
]);

export const DB_FREEZE_OBSERVE_TEMPLATE = Object.freeze({
  pin: DB_FREEZE_PIN,
  pinShort: DB_FREEZE_PIN_SHORT,
  readOnly: true,
  tipRewriteRefused: true,
  productionReadyFlipRefused: true,
  nonClaimLabels: [...DB_FREEZE_NONCLAIM_LABELS],
  note:
    'NON-CLAIM: Doctor Ritual Automation soft-observes freeze surfaces only — ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L29 auto-close (pin daae7380 DA MEASURED #403)'
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
    ...DB_FREEZE_OBSERVE_TEMPLATE,
    ...overrides,
    pin: DB_FREEZE_PIN,
    pinShort: DB_FREEZE_PIN_SHORT,
    readOnly: true,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    nonClaimLabels: Array.isArray(overrides.nonClaimLabels)
      ? overrides.nonClaimLabels.map(String)
      : [...DB_FREEZE_NONCLAIM_LABELS]
  };

  if (
    overrides.pin != null &&
    String(overrides.pin) !== DB_FREEZE_PIN &&
    String(overrides.pin) !== DB_FREEZE_PIN_SHORT &&
    !String(overrides.pin).startsWith(DB_FREEZE_PIN_SHORT)
  ) {
    env.refusal =
      'REFUSED freeze tip-pin rewrite; forced soft-observe pin daae7380 (DA MEASURED #403)';
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
  if (DB_OBSERVE_PORT_LABELS.includes(head)) return head;
  if (DB_OBSERVE_PORT_LABELS.includes(s)) return s;
  return null;
}

export function canonicalDoctorRitualAutomationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    ritualDigest:
      fields.ritualDigest != null && fields.ritualDigest !== ''
        ? String(fields.ritualDigest)
        : fields.honestyDigest != null && fields.honestyDigest !== ''
          ? String(fields.honestyDigest)
          : fields.observabilityDigest != null && fields.observabilityDigest !== ''
            ? String(fields.observabilityDigest)
            : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

export function hashDoctorRitualAutomationReceipt(
  fields,
  hashFn = sha256Canonical
) {
  return hashFn(canonicalDoctorRitualAutomationSealBody(fields));
}

export function verifyDoctorRitualAutomationReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }
  if (receipt.kind !== DB_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${DB_RECEIPT_KIND}, got ${receipt.kind}`
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
  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('DB-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with DB-RCPT-' };
  }
  if (!DB_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${DB_DECISIONS.join('|')}`
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
    freeze.pinShort !== DB_FREEZE_PIN_SHORT &&
    freeze.pin !== DB_FREEZE_PIN &&
    !(typeof freeze.pin === 'string' && freeze.pin.startsWith(DB_FREEZE_PIN_SHORT))
  ) {
    return {
      ok: false,
      reason: 'freezeObserve pin must remain daae7380 (soft-observe only)'
    };
  }
  const expected = hashDoctorRitualAutomationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expected) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expected}, got ${receipt.receiptHash}`
    };
  }
  return { ok: true };
}

export function buildDoctorRitualAutomationReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `DB-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];
  const rawMode =
    fields.ritualMode != null
      ? fields.ritualMode
      : fields.honestyMode != null
        ? fields.honestyMode
        : fields.aggregationMode != null
          ? fields.aggregationMode
          : fields.observeMode != null
            ? fields.observeMode
            : null;
  const ritualMode =
    rawMode != null &&
    DB_RITUAL_MODES.includes(String(rawMode).toUpperCase())
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
    : [...DB_REQUIRED_OBSERVE_PORTS];

  const freezeObserve = forceFreezeObserve(fields.freezeObserve || {});

  const ritualDigest =
    fields.ritualDigest != null && fields.ritualDigest !== ''
      ? String(fields.ritualDigest)
      : fields.honestyDigest != null && fields.honestyDigest !== ''
        ? String(fields.honestyDigest)
        : fields.observabilityDigest != null && fields.observabilityDigest !== ''
          ? String(fields.observabilityDigest)
          : hashFn({
              changeId: fields.changeId || null,
              ritualMode,
              observedPorts,
              ritualOk: fields.ritualOk ?? null,
              refuseCodes,
              freezeObserve: {
                pinShort: freezeObserve.pinShort,
                readOnly: freezeObserve.readOnly
              }
            });

  const ritualPlanDigest =
    fields.ritualPlanDigest != null && fields.ritualPlanDigest !== ''
      ? String(fields.ritualPlanDigest)
      : fields.honestyPlanDigest != null && fields.honestyPlanDigest !== ''
        ? String(fields.honestyPlanDigest)
        : fields.observabilityPlanDigest != null &&
            fields.observabilityPlanDigest !== ''
          ? String(fields.observabilityPlanDigest)
          : hashFn({
              planId: fields.planId || null,
              changeId: fields.changeId || null,
              ritualDigest,
              ritualMode,
              decision: fields.decision || null
            });

  const body = canonicalDoctorRitualAutomationSealBody({
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
    kind: DB_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    honestyDigest: ritualDigest,
    observabilityDigest: ritualDigest,
    ritualMode,
    honestyMode: ritualMode,
    aggregationMode: ritualMode,
    observeMode: ritualMode,
    phase: fields.phase != null ? String(fields.phase) : null,
    freezeObserve,
    observedPorts: Object.freeze([...observedPorts]),
    requiredObserveSet: Object.freeze([...requiredObserveSet]),
    softObserveL28Ports: Object.freeze([...DB_SOFT_OBSERVE_L28_PORTS]),
    ritualOk:
      fields.ritualOk === true
        ? true
        : fields.ritualOk === false
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
    ritualPlanDigest,
    honestyPlanDigest: ritualPlanDigest,
    observabilityPlanDigest: ritualPlanDigest,
    meta: Object.freeze({
      freezePin: DB_FREEZE_PIN_SHORT,
      freezePinFull: DB_FREEZE_PIN,
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
  DB_PRODUCTION_READY,
  DB_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DB_RECEIPT_KIND,
  DB_DECISIONS,
  DB_RITUAL_MODES,
  DB_HONESTY_MODES,
  DB_AGGREGATION_MODES,
  DB_REQUIRED_OBSERVE_PORTS,
  DB_SOFT_OBSERVE_L28_PORTS,
  DB_OPTIONAL_OBSERVE_PORTS,
  DB_OBSERVE_PORT_LABELS,
  DB_FREEZE_NONCLAIM_LABELS,
  DB_FREEZE_OBSERVE_TEMPLATE,
  DB_FREEZE_PIN,
  DB_FREEZE_PIN_SHORT,
  stableStringify,
  sha256Canonical,
  defaultHash,
  forceFreezeObserve,
  normalizeObservePortLabel,
  canonicalDoctorRitualAutomationSealBody,
  hashDoctorRitualAutomationReceipt,
  verifyDoctorRitualAutomationReceipt,
  buildDoctorRitualAutomationReceipt,
  _resetReceiptSeqForTests
};
