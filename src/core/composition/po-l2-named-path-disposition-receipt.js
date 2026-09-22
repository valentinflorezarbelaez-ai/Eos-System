/**
 * @module po-l2-named-path-disposition-receipt
 * SPEC-0116 / Mission DG — PO Level-2 Named-Path Disposition Gate Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     dispositionDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   dispositionMode (ACTIVE|HOLD),
 *   namedPaths[],
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   deleteAuthRefused, autoApproveRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   observedSurfaces[], requiredObserveSet[],
 *   dispositionOk?, ceilingHoldOk?, refuseCodes[], humanGateHeld?,
 *   autoApproveRefused?, autoSealRefused?, autoProductionFlipRefused?,
 *   tipPinRewriteRefused?, gheClaimRefused?, autoCloseL30Refused?,
 *   l29ReopenRefused?, deleteAuthRefused?, massPruneRefused?, reasons[],
 *   dispositionPlanDigest?, dfInventoryDigest?, meta?
 *
 * NON-CLAIM:
 *   PO L2 Named-Path Disposition Gate ≠ unsupervised delete ≠ mass prune ≠
 *   auto-approve deletes ≠ Fundacion Δ>0 ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠
 *   L29 reopen ≠ L30 auto-close ≠ GHE ≠ CloudAgent
 *   Inventory/plan ≠ delete auth; gate ≠ execution (DH executes later)
 *   Formal L29 CLOSED retained — NEVER reopen L29
 *   L30 axis: Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric (ADR-0087);
 *   L30 OPEN (Audit + DF MEASURED · DG–DJ pending) via tip-refresh #416;
 *   soft-observe freeze pin 31f811ca (Mission DF #415) — ≠ tip-pin rewrite.
 *   Fundacion Δ=0; Antigravity-first; schemas AT_CEILING 35/35.
 *
 * Freeze soft-observe pin is `31f811ca` / full `31f811caf7ff28cc25aa9ac87add0e45f4abf650`
 * (Mission DF #415). Soft-observe freeze NON-CLAIM surfaces only — do NOT rewrite
 * freeze tip pins from this package.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const DG_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const DG_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const DG_RECEIPT_KIND = 'eos-po-l2-named-path-disposition-receipt';
export const DG_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const DG_DISPOSITION_MODES = Object.freeze(['ACTIVE', 'HOLD']);
/** Aliases for DF/DA API compatibility. */
export const DG_REMEASURE_MODES = DG_DISPOSITION_MODES;
export const DG_AGGREGATION_MODES = DG_DISPOSITION_MODES;
export const DG_HONESTY_MODES = DG_DISPOSITION_MODES;
export const DG_RITUAL_MODES = DG_DISPOSITION_MODES;

/** Required disposition observe surfaces (observe-only; ≠ delete execution). */
export const DG_REQUIRED_OBSERVE_SURFACES = Object.freeze([
  'DF_REMEASURE',
  'ADR_0075_HITL',
  'AP_HITL'
]);
export const DG_OPTIONAL_OBSERVE_SURFACES = Object.freeze([
  'DA',
  'POST_L26_INVENTORY'
]);
export const DG_OBSERVE_SURFACE_LABELS = Object.freeze([
  'DF_REMEASURE',
  'ADR_0075_HITL',
  'AP_HITL',
  'DA',
  'POST_L26_INVENTORY'
]);

/** Freeze soft-observe pin (Mission DF #415 tip). Soft-observe only — do NOT rewrite. */
export const DG_FREEZE_PIN =
  '31f811caf7ff28cc25aa9ac87add0e45f4abf650';
export const DG_FREEZE_PIN_SHORT = '31f811ca';

/**
 * Soft-observed freeze NON-CLAIM fixture labels (read-only; never rewrite tip pins).
 */
export const DG_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'FREEZE:NON-CLAIM:PRODUCTION_READY=NO',
  'FREEZE:NON-CLAIM:Fundacion-delta=0',
  'FREEZE:NON-CLAIM:≠-tip-pin-rewrite',
  'FREEZE:NON-CLAIM:≠-GHE',
  'FREEZE:NON-CLAIM:≠-L30-auto-close',
  'FREEZE:NON-CLAIM:≠-L29-reopen',
  'FREEZE:NON-CLAIM:≠-delete-authorization',
  'FREEZE:NON-CLAIM:≠-mass-prune',
  'FREEZE:NON-CLAIM:≠-unsupervised-delete',
  'FREEZE:NON-CLAIM:≠-auto-approve-deletes',
  'FREEZE:NON-CLAIM:gate≠execution',
  'FREEZE:NON-CLAIM:inventory≠delete-auth',
  'FREEZE:NON-CLAIM:schemas-AT_CEILING-35/35',
  'FREEZE:pin=31f811ca:observe-only'
]);

export const DG_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true,
  schemasCount: 35,
  schemasCeiling: 35,
  note:
    'NON-CLAIM: schemas AT_CEILING 35/35 — do NOT add docs/schemas JSON files (AT_CEILING); disposition gate ≠ delete execution'
});

export const DG_FREEZE_OBSERVE_TEMPLATE = Object.freeze({
  pin: DG_FREEZE_PIN,
  pinShort: DG_FREEZE_PIN_SHORT,
  readOnly: true,
  tipRewriteRefused: true,
  productionReadyFlipRefused: true,
  deleteAuthRefused: true,
  autoApproveRefused: true,
  nonClaimLabels: [...DG_FREEZE_NONCLAIM_LABELS],
  note:
    'NON-CLAIM: PO L2 Named-Path Disposition soft-observes freeze surfaces only — ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ delete auth ≠ auto-approve ≠ L30 auto-close (pin 31f811ca Mission DF #415)'
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
 * Force freeze observe read-only — refuse tip-pin rewrite / PR flip / delete-auth / auto-approve overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
export function forceFreezeObserve(overrides = {}) {
  const env = {
    ...DG_FREEZE_OBSERVE_TEMPLATE,
    ...overrides,
    pin: DG_FREEZE_PIN,
    pinShort: DG_FREEZE_PIN_SHORT,
    readOnly: true,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    deleteAuthRefused: true,
    autoApproveRefused: true,
    nonClaimLabels: Array.isArray(overrides.nonClaimLabels)
      ? overrides.nonClaimLabels.map(String)
      : [...DG_FREEZE_NONCLAIM_LABELS]
  };

  if (
    overrides.pin != null &&
    String(overrides.pin) !== DG_FREEZE_PIN &&
    String(overrides.pin) !== DG_FREEZE_PIN_SHORT &&
    !String(overrides.pin).startsWith(DG_FREEZE_PIN_SHORT)
  ) {
    env.refusal =
      'REFUSED freeze tip-pin rewrite; forced soft-observe pin 31f811ca (Mission DF #415)';
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
  if (
    overrides.deleteAuth === true ||
    overrides.authorizeDelete === true ||
    overrides.massPrune === true
  ) {
    env.refusal =
      (env.refusal ? env.refusal + '; ' : '') +
      'REFUSED delete/mass-prune authorization; gate≠execution (DH later)';
  }
  if (overrides.autoApprove === true || overrides.autoApproveDeletes === true) {
    env.refusal =
      (env.refusal ? env.refusal + '; ' : '') +
      'REFUSED auto-approve deletes; humanGateHeld required for ACTIVE disposition';
  }

  return Object.freeze({
    ...env,
    nonClaimLabels: Object.freeze([...env.nonClaimLabels])
  });
}

/**
 * Force ceiling-hold fixture — schemas remain AT_CEILING; slim hold.
 * @param {object} [overrides]
 * @returns {object}
 */
export function forceCeilingHold(overrides = {}) {
  return Object.freeze({
    ...DG_CEILING_HOLD_TEMPLATE,
    ...overrides,
    schemasAtCeiling: true,
    slimHold: true,
    schemasCount:
      overrides.schemasCount != null
        ? Number(overrides.schemasCount)
        : DG_CEILING_HOLD_TEMPLATE.schemasCount,
    schemasCeiling: DG_CEILING_HOLD_TEMPLATE.schemasCeiling
  });
}

/**
 * Normalize a named path entry (allowlist member). Empty / Fundacion → null.
 * @param {unknown} p
 * @returns {string|null}
 */
export function normalizeNamedPath(p) {
  if (p == null) return null;
  const s = String(p).trim().replace(/\\/g, '/');
  if (!s) return null;
  const lower = s.toLowerCase();
  if (
    lower.includes('documents/fundacion') ||
    lower.startsWith('fundacion/') ||
    lower === 'fundacion'
  ) {
    return null;
  }
  return s;
}

/**
 * Normalize namedPaths allowlist — unique, non-empty, Fundacion-refused filtered.
 * @param {unknown} paths
 * @returns {{ normalized: string[], raw: string[], empty: boolean }}
 */
export function normalizeNamedPaths(paths) {
  const raw = Array.isArray(paths) ? paths.map(String) : [];
  const normalized = [];
  const seen = new Set();
  for (const p of raw) {
    const n = normalizeNamedPath(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      normalized.push(n);
    }
  }
  return { normalized, raw, empty: normalized.length === 0 };
}

export function normalizeObserveSurfaceLabel(label) {
  if (label == null) return null;
  const s = String(label).trim().toUpperCase();
  if (!s) return null;
  const head = s.split(/[:|/.\\\s_-]/)[0];
  const compact = s.replace(/[:|/.\\\s-]+/g, '_');
  for (const known of DG_OBSERVE_SURFACE_LABELS) {
    if (compact === known || compact.startsWith(known + '_')) return known;
    if (head === known) return known;
  }
  const aliases = {
    DF: 'DF_REMEASURE',
    DF_REMEASURE_OBSERVE: 'DF_REMEASURE',
    REMEASURE: 'DF_REMEASURE',
    COMPLEXITY_INVENTORY_REMEASURE: 'DF_REMEASURE',
    ADR_0075: 'ADR_0075_HITL',
    ADR0075: 'ADR_0075_HITL',
    ADR_0075_PRUNE_PLAN: 'ADR_0075_HITL',
    HITL: 'ADR_0075_HITL',
    PO_HITL: 'ADR_0075_HITL',
    AP: 'AP_HITL',
    AP_HITL_OBSERVE: 'AP_HITL',
    POST_L26: 'POST_L26_INVENTORY',
    POSTL26: 'POST_L26_INVENTORY',
    INVENTORY: 'POST_L26_INVENTORY'
  };
  if (aliases[compact]) return aliases[compact];
  if (aliases[head]) return aliases[head];
  if (DG_OBSERVE_SURFACE_LABELS.includes(s)) return s;
  return null;
}

export function canonicalPoL2NamedPathDispositionSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    changeId: fields.changeId != null ? String(fields.changeId) : null,
    dispositionDigest:
      fields.dispositionDigest != null && fields.dispositionDigest !== ''
        ? String(fields.dispositionDigest)
        : fields.inventoryDigest != null && fields.inventoryDigest !== ''
          ? String(fields.inventoryDigest)
          : fields.observabilityDigest != null &&
              fields.observabilityDigest !== ''
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

export function hashPoL2NamedPathDispositionReceipt(
  fields,
  hashFn = sha256Canonical
) {
  return hashFn(canonicalPoL2NamedPathDispositionSealBody(fields));
}

export function verifyPoL2NamedPathDispositionReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }
  if (receipt.kind !== DG_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${DG_RECEIPT_KIND}, got ${receipt.kind}`
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
  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('DG-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with DG-RCPT-' };
  }
  if (!DG_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${DG_DECISIONS.join('|')}`
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
    freeze.pinShort !== DG_FREEZE_PIN_SHORT &&
    freeze.pin !== DG_FREEZE_PIN &&
    !(
      typeof freeze.pin === 'string' &&
      freeze.pin.startsWith(DG_FREEZE_PIN_SHORT)
    )
  ) {
    return {
      ok: false,
      reason: 'freezeObserve pin must remain 31f811ca (soft-observe only)'
    };
  }
  if (freeze.deleteAuthRefused !== true) {
    return { ok: false, reason: 'freezeObserve.deleteAuthRefused must be true' };
  }
  const ceiling = receipt.ceilingHold;
  if (!ceiling || typeof ceiling !== 'object') {
    return { ok: false, reason: 'ceilingHold must be present' };
  }
  if (ceiling.schemasAtCeiling !== true) {
    return { ok: false, reason: 'ceilingHold.schemasAtCeiling must be true' };
  }
  if (!Array.isArray(receipt.namedPaths)) {
    return { ok: false, reason: 'namedPaths must be an array' };
  }
  const expected = hashPoL2NamedPathDispositionReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expected) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expected}, got ${receipt.receiptHash}`
    };
  }
  return { ok: true };
}

export function buildPoL2NamedPathDispositionReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `DG-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];
  const rawMode =
    fields.dispositionMode != null
      ? fields.dispositionMode
      : fields.remeasureMode != null
        ? fields.remeasureMode
        : fields.aggregationMode != null
          ? fields.aggregationMode
          : fields.honestyMode != null
            ? fields.honestyMode
            : fields.ritualMode != null
              ? fields.ritualMode
              : fields.observeMode != null
                ? fields.observeMode
                : null;
  const dispositionMode =
    rawMode != null &&
    DG_DISPOSITION_MODES.includes(String(rawMode).toUpperCase())
      ? String(rawMode).toUpperCase()
      : rawMode != null
        ? String(rawMode)
        : null;

  const refuseCodes = Array.isArray(fields.refuseCodes)
    ? fields.refuseCodes.map((c) => String(c))
    : [];
  const observedSurfaces = Array.isArray(fields.observedSurfaces)
    ? fields.observedSurfaces.map((p) => String(p))
    : Array.isArray(fields.observedPorts)
      ? fields.observedPorts.map((p) => String(p))
      : [];
  const requiredObserveSet = Array.isArray(fields.requiredObserveSet)
    ? fields.requiredObserveSet.map((p) => String(p))
    : [...DG_REQUIRED_OBSERVE_SURFACES];

  const namedPathsInfo = normalizeNamedPaths(fields.namedPaths);
  const namedPaths = namedPathsInfo.normalized;

  const freezeObserve = forceFreezeObserve(fields.freezeObserve || {});
  const ceilingHold = forceCeilingHold(fields.ceilingHold || {});

  const dispositionDigest =
    fields.dispositionDigest != null && fields.dispositionDigest !== ''
      ? String(fields.dispositionDigest)
      : fields.inventoryDigest != null && fields.inventoryDigest !== ''
        ? String(fields.inventoryDigest)
        : fields.observabilityDigest != null &&
            fields.observabilityDigest !== ''
          ? String(fields.observabilityDigest)
          : fields.honestyDigest != null && fields.honestyDigest !== ''
            ? String(fields.honestyDigest)
            : hashFn({
                changeId: fields.changeId || null,
                dispositionMode,
                namedPaths,
                observedSurfaces,
                dispositionOk: fields.dispositionOk ?? null,
                ceilingHoldOk: fields.ceilingHoldOk ?? null,
                refuseCodes,
                freezeObserve: {
                  pinShort: freezeObserve.pinShort,
                  readOnly: freezeObserve.readOnly,
                  deleteAuthRefused: freezeObserve.deleteAuthRefused,
                  autoApproveRefused: freezeObserve.autoApproveRefused
                },
                ceilingHold: {
                  schemasAtCeiling: ceilingHold.schemasAtCeiling,
                  slimHold: ceilingHold.slimHold
                }
              });

  const dispositionPlanDigest =
    fields.dispositionPlanDigest != null && fields.dispositionPlanDigest !== ''
      ? String(fields.dispositionPlanDigest)
      : fields.inventoryPlanDigest != null && fields.inventoryPlanDigest !== ''
        ? String(fields.inventoryPlanDigest)
        : hashFn({
            planId: fields.planId || null,
            changeId: fields.changeId || null,
            dispositionDigest,
            dispositionMode,
            namedPaths,
            decision: fields.decision || null
          });

  const body = canonicalPoL2NamedPathDispositionSealBody({
    receiptId,
    operation: fields.operation || 'GOVERN',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    changeId: fields.changeId || null,
    dispositionDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });
  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: DG_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    honestyDigest: dispositionDigest,
    observabilityDigest: dispositionDigest,
    inventoryDigest: dispositionDigest,
    dispositionMode,
    remeasureMode: dispositionMode,
    aggregationMode: dispositionMode,
    honestyMode: dispositionMode,
    ritualMode: dispositionMode,
    observeMode: dispositionMode,
    phase: fields.phase != null ? String(fields.phase) : null,
    namedPaths: Object.freeze([...namedPaths]),
    freezeObserve,
    ceilingHold,
    observedSurfaces: Object.freeze([...observedSurfaces]),
    observedPorts: Object.freeze([...observedSurfaces]),
    requiredObserveSet: Object.freeze([...requiredObserveSet]),
    dispositionOk:
      fields.dispositionOk === true
        ? true
        : fields.dispositionOk === false
          ? false
          : null,
    ceilingHoldOk:
      fields.ceilingHoldOk === true
        ? true
        : fields.ceilingHoldOk === false
          ? false
          : fields.dispositionOk === true
            ? true
            : fields.dispositionOk === false
              ? false
              : null,
    inventoryOk:
      fields.inventoryOk === true
        ? true
        : fields.inventoryOk === false
          ? false
          : fields.dispositionOk === true
            ? true
            : fields.dispositionOk === false
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
    autoApproveRefused: fields.autoApproveRefused === true,
    autoSealRefused: fields.autoSealRefused === true,
    autoProductionFlipRefused: fields.autoProductionFlipRefused === true,
    tipPinRewriteRefused: fields.tipPinRewriteRefused === true,
    gheClaimRefused: fields.gheClaimRefused === true,
    autoCloseL30Refused: fields.autoCloseL30Refused === true,
    l29ReopenRefused: fields.l29ReopenRefused === true,
    deleteAuthRefused: fields.deleteAuthRefused === true,
    massPruneRefused: fields.massPruneRefused === true,
    reasons: Object.freeze([...reasons]),
    dispositionPlanDigest,
    inventoryPlanDigest: dispositionPlanDigest,
    observabilityPlanDigest: dispositionPlanDigest,
    honestyPlanDigest: dispositionPlanDigest,
    dfInventoryDigest:
      fields.dfInventoryDigest != null && fields.dfInventoryDigest !== ''
        ? String(fields.dfInventoryDigest)
        : null,
    meta: Object.freeze({
      freezePin: DG_FREEZE_PIN_SHORT,
      freezePinFull: DG_FREEZE_PIN,
      schemasAtCeiling: true,
      gateNotExecution: true,
      ...(fields.meta || {})
    }),
    receiptHash,
    nonClaims: Object.freeze({
      productionReadyFlip: false,
      l29Reopen: false,
      tipRewrite: false,
      tipPinRewrite: false,
      ghe: false,
      fundacionWriteAuth: false,
      fundacionTouch: false,
      productionReady: false,
      l30Closeout: false,
      l30AutoClose: false,
      tipRefresh: false,
      deleteAuthorization: false,
      massPrune: false,
      unsupervisedDelete: false,
      autoApproveDeletes: false,
      inventoryIsDeleteAuth: false,
      gateIsExecution: false,
      autoSealL30: false,
      cloudAgent: false
    })
  });
}

export default {
  DG_PRODUCTION_READY,
  DG_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DG_RECEIPT_KIND,
  DG_DECISIONS,
  DG_DISPOSITION_MODES,
  DG_REMEASURE_MODES,
  DG_AGGREGATION_MODES,
  DG_HONESTY_MODES,
  DG_RITUAL_MODES,
  DG_REQUIRED_OBSERVE_SURFACES,
  DG_OPTIONAL_OBSERVE_SURFACES,
  DG_OBSERVE_SURFACE_LABELS,
  DG_FREEZE_NONCLAIM_LABELS,
  DG_FREEZE_OBSERVE_TEMPLATE,
  DG_CEILING_HOLD_TEMPLATE,
  DG_FREEZE_PIN,
  DG_FREEZE_PIN_SHORT,
  stableStringify,
  sha256Canonical,
  defaultHash,
  forceFreezeObserve,
  forceCeilingHold,
  normalizeNamedPath,
  normalizeNamedPaths,
  normalizeObserveSurfaceLabel,
  canonicalPoL2NamedPathDispositionSealBody,
  hashPoL2NamedPathDispositionReceipt,
  verifyPoL2NamedPathDispositionReceipt,
  buildPoL2NamedPathDispositionReceipt,
  _resetReceiptSeqForTests
};
