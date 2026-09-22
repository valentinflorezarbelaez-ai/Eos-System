/**
 * @module po-l2-named-path-disposition-port
 * SPEC-0116 / Mission DG — PO Level-2 Named-Path Disposition Gate Port.
 * Pure Layer-0 Node.js builtins (node:crypto). Never seal secrets.
 *
 * Hermetic PO L2 Named-Path Disposition Gate Port:
 *   - Validates plan via policy gate
 *   - Soft-observes freeze NON-CLAIM labels/fixtures (read-only; do NOT rewrite tip pins)
 *   - Soft-imports DF remeasure observe + ADR-0075/AP HITL observe fixtures when present
 *     else builtin fixture double
 *   - dispositionMode: ACTIVE | HOLD (ACTIVE requires non-empty namedPaths allowlist)
 *   - Decision: PASS | DENY | HOLD
 *   - Seals DG-RCPT-* receipts with forced freeze soft-observe (pin 31f811ca)
 *   - Soft-observes DF inventoryDigest when present
 *   - Explicit honesty: PASS = disposition gated with named paths sealed ≠ delete execution
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate
 *   - schemas AT_CEILING 35/35 — do NOT add docs/schemas JSON files
 *
 * NON-CLAIM: PO L2 Named-Path Disposition Gate ≠ unsupervised delete ≠ mass prune ≠
 * auto-approve deletes ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠
 * GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent
 * Inventory/plan ≠ delete auth; gate ≠ execution (DH executes later)
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DG_PRODUCTION_READY,
  DG_RECEIPT_KIND,
  DG_FREEZE_PIN,
  DG_FREEZE_PIN_SHORT,
  DG_REQUIRED_OBSERVE_SURFACES,
  DG_FREEZE_NONCLAIM_LABELS,
  DG_FREEZE_OBSERVE_TEMPLATE,
  DG_CEILING_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  normalizeNamedPaths,
  buildPoL2NamedPathDispositionReceipt,
  verifyPoL2NamedPathDispositionReceipt
} from './po-l2-named-path-disposition-receipt.js';

import {
  PoL2NamedPathDispositionPolicyGate,
  DG_CODES,
  evaluateRequiredObserveSet
} from './po-l2-named-path-disposition-policy-gate.js';

/** @type {'NO'} */
export const DG_PORT_PRODUCTION_READY = 'NO';
export const DG_PORT_KIND = 'eos-po-l2-named-path-disposition-port';
export {
  DG_FREEZE_PIN,
  DG_FREEZE_PIN_SHORT,
  DG_FREEZE_NONCLAIM_LABELS,
  DG_FREEZE_OBSERVE_TEMPLATE,
  DG_CEILING_HOLD_TEMPLATE
};

export const DG_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_DISPOSITION_PROBE',
  'A2_FREEZE_NONCLAIM_OBSERVE_PROBE',
  'A3_DF_HITL_SURFACES_SOFT_IMPORT_PROBE',
  'A4_NON_CLAIM_CHIP_PROBE',
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L29_REOPEN',
  'A9_REFUSE_GHE_CLAIM',
  'A10_REFUSE_AUTO_CLOSE_L30',
  'A11_REFUSE_DELETE_AUTH',
  'A12_REFUSE_PRODUCTION_READY_FLIP',
  'A13_REFUSE_MASS_PRUNE',
  'A14_HOLD_SCHEMAS_AT_CEILING',
  'A15_REFUSE_AUTO_APPROVE_WITHOUT_NAMED_PATHS',
  'A16_REQUIRE_NAMED_PATHS_FOR_ACTIVE',
  'A17_GATE_NOT_EXECUTION'
]);

export const DG_REFUSE_CODES = Object.freeze({
  MISSING_REQUIRED_OBSERVE_SURFACES: 'MISSING_REQUIRED_OBSERVE_SURFACES',
  EMPTY_NAMED_PATHS_ACTIVE: 'EMPTY_NAMED_PATHS_ACTIVE',
  DISPOSITION_NOT_OK: 'DISPOSITION_NOT_OK',
  CEILING_HOLD_NOT_OK: 'CEILING_HOLD_NOT_OK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  AUTO_APPROVE_REFUSED: 'AUTO_APPROVE_REFUSED',
  L29_REOPEN_REFUSED: 'L29_REOPEN_REFUSED',
  TIP_PIN_REWRITE_REFUSED: 'TIP_PIN_REWRITE_REFUSED',
  GHE_CLAIM_REFUSED: 'GHE_CLAIM_REFUSED',
  AUTO_CLOSE_L30_REFUSED: 'AUTO_CLOSE_L30_REFUSED',
  DELETE_AUTH_REFUSED: 'DELETE_AUTH_REFUSED',
  MASS_PRUNE_REFUSED: 'MASS_PRUNE_REFUSED'
});

export const DG_DEFAULT_OBSERVE_SURFACES = Object.freeze([
  'DF_REMEASURE:complexity-inventory-remeasure-observe',
  'ADR_0075_HITL:po-gated-prune-plan-hitl-observe',
  'AP_HITL:antigravity-hitl-observe',
  'DA:control-plane-observability-aggregation-observe'
]);

export const DG_HITL_SURFACE_FIXTURES = Object.freeze({
  DF_REMEASURE: {
    path: 'src/core/composition/complexity-inventory-remeasure-receipt.js',
    mode: 'observe-only',
    note: 'Mission DF remeasure observe — soft-import when present; ≠ delete auth'
  },
  ADR_0075_HITL: {
    path: 'docs/adrs/ADR-0075-po-gated-complexity-prune-plan.md',
    mode: 'observe-only',
    note: 'ADR-0075 PO-gated prune plan HITL — observe only; plan≠execution'
  },
  AP_HITL: {
    path: 'AP_HITL_OBSERVE_FIXTURE',
    mode: 'observe-only',
    note: 'AP HITL observe fixture — human gate for named-path disposition'
  },
  DA: {
    path: 'src/core/composition/control-plane-observability-aggregation-receipt.js',
    mode: 'observe-only',
    note: 'Soft-observe DA receipt patterns optional'
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import DF remeasure + HITL observe surfaces when co-located.
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportDfHitlSurfaces(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'complexity-inventory-remeasure-receipt.js'),
    path.resolve(
      '/workspace/eos-mission-df/src/core/composition/complexity-inventory-remeasure-receipt.js'
    ),
    path.resolve(
      '/workspace/eos-mission-df/src/core/composition/complexity-inventory-remeasure-port.js'
    ),
    path.resolve(
      '/workspace/eos-mission-da/src/core/composition/control-plane-observability-aggregation-receipt.js'
    )
  );
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      if (typeof mod.builtinComplexityInventoryDouble === 'function') {
        return {
          buildDispositionSurface: (input) =>
            adaptDfDouble(mod.builtinComplexityInventoryDouble(input)),
          DISPOSITION_PRODUCTION_READY: 'NO',
          source: 'soft-import-df',
          path: candidate
        };
      }
      if (typeof mod.buildComplexityInventoryRemeasureReceipt === 'function') {
        return {
          buildDispositionSurface: builtinPoL2NamedPathDispositionDouble,
          DISPOSITION_PRODUCTION_READY: 'NO',
          source: 'soft-import-df-receipt',
          path: candidate
        };
      }
      if (typeof mod.builtinObservabilityAggregationDouble === 'function') {
        return {
          buildDispositionSurface: (input) =>
            adaptDaDouble(mod.builtinObservabilityAggregationDouble(input)),
          DISPOSITION_PRODUCTION_READY: 'NO',
          source: 'soft-import-da',
          path: candidate
        };
      }
      if (typeof mod.buildDispositionSurface === 'function') {
        return {
          buildDispositionSurface: mod.buildDispositionSurface,
          DISPOSITION_PRODUCTION_READY: mod.DISPOSITION_PRODUCTION_READY || 'NO',
          source: 'soft-import',
          path: candidate
        };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function adaptDfDouble(dfSurface) {
  return {
    schema: 'eos.po-l2-named-path-disposition-observe.v1',
    surface: dfSurface?.surface || 'soft-import-df',
    PRODUCTION_READY: 'NO',
    freeze_pin: DG_FREEZE_PIN,
    freeze_pin_short: DG_FREEZE_PIN_SHORT,
    freeze_observe: forceFreezeObserve(dfSurface?.freeze_observe || {}),
    ceiling_hold: forceCeilingHold(),
    observe: dfSurface?.observe || { ok: true, missing: [], observed: [] },
    disposition: { ok: dfSurface?.inventory?.ok !== false },
    ceiling: { ok: true, schemasAtCeiling: true },
    honesty: dfSurface?.honesty || { ok: true },
    pending_ports: dfSurface?.pending_ports || [
      'DH pending',
      'DI pending',
      'DJ pending'
    ],
    non_claim_chips: [
      ...(Array.isArray(dfSurface?.non_claim_chips)
        ? dfSurface.non_claim_chips.map(String)
        : []),
      'NON-CLAIM: disposition gate ≠ delete execution (DH later)',
      'NON-CLAIM: namedPaths allowlist ≠ unsupervised delete',
      'NON-CLAIM: schemas AT_CEILING 35/35'
    ],
    _softImportDf: true
  };
}

function adaptDaDouble(daSurface) {
  return {
    schema: 'eos.po-l2-named-path-disposition-observe.v1',
    surface: daSurface?.surface || 'soft-import-da',
    PRODUCTION_READY: 'NO',
    freeze_pin: DG_FREEZE_PIN,
    freeze_pin_short: DG_FREEZE_PIN_SHORT,
    freeze_observe: forceFreezeObserve(daSurface?.freeze_observe || {}),
    ceiling_hold: forceCeilingHold(),
    observe: daSurface?.observe || { ok: true, missing: [], observed: [] },
    disposition: { ok: daSurface?.aggregation?.ok !== false },
    ceiling: { ok: true, schemasAtCeiling: true },
    honesty: daSurface?.honesty || { ok: true },
    pending_ports: daSurface?.pending_ports || [
      'DH pending',
      'DI pending',
      'DJ pending'
    ],
    non_claim_chips: [
      ...(Array.isArray(daSurface?.non_claim_chips)
        ? daSurface.non_claim_chips.map(String)
        : []),
      'NON-CLAIM: disposition gate ≠ delete execution (DH later)',
      'NON-CLAIM: schemas AT_CEILING 35/35'
    ],
    _softImportDa: true
  };
}

/**
 * Soft-compose HITL observe surfaces (fixtures when absent).
 * @param {string[]} [requested]
 */
export function softComposeHitlSurfaces(requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return {
      labels: requested.map(String),
      source: 'plan',
      fixtures: { ...DG_HITL_SURFACE_FIXTURES }
    };
  }
  return {
    labels: [...DG_DEFAULT_OBSERVE_SURFACES],
    source: 'fixture-default',
    fixtures: { ...DG_HITL_SURFACE_FIXTURES }
  };
}

/**
 * Soft-observe freeze NON-CLAIM surfaces (never rewrite tip pins).
 * @param {object} [input]
 */
export function softObserveFreezeNonClaims(input = {}) {
  return forceFreezeObserve({
    ...(input.freezeObserve || {}),
    nonClaimLabels: Array.isArray(input.nonClaimLabels)
      ? input.nonClaimLabels.map(String)
      : [...DG_FREEZE_NONCLAIM_LABELS]
  });
}

/**
 * Builtin PO L2 named-path disposition double for hermetic PASS|DENY|HOLD.
 * @param {object} input
 */
export function builtinPoL2NamedPathDispositionDouble(input = {}) {
  const observedSurfaces = Array.isArray(input.observedSurfaces)
    ? input.observedSurfaces.map(String)
    : Array.isArray(input.observedPorts)
      ? input.observedPorts.map(String)
      : [...DG_DEFAULT_OBSERVE_SURFACES];
  const codes = [];
  const seen = new Set();
  for (const p of observedSurfaces) {
    const upper = String(p).trim().toUpperCase();
    const compact = upper.replace(/[:|/.\\\s-]+/g, '_');
    let code = null;
    for (const known of DG_REQUIRED_OBSERVE_SURFACES) {
      if (compact === known || compact.startsWith(known)) {
        code = known;
        break;
      }
    }
    if (!code && compact.startsWith('DA')) code = 'DA';
    if (!code) {
      const head = upper.split(/[:|/.\\\s_-]/)[0];
      if (DG_REQUIRED_OBSERVE_SURFACES.includes(head)) code = head;
      if (head === 'DF' || head === 'DF_REMEASURE') code = 'DF_REMEASURE';
      if (head === 'ADR' || head === 'ADR_0075' || head === 'ADR0075')
        code = 'ADR_0075_HITL';
      if (head === 'AP' || head === 'HITL') code = 'AP_HITL';
      if (head === 'DA') code = 'DA';
    }
    if (code && !seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  const observe = evaluateRequiredObserveSet(codes);
  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map(String)
    : ['DH pending', 'DI pending', 'DJ pending'];
  const freezeObserve = softObserveFreezeNonClaims(input);
  const ceilingHold = forceCeilingHold(input.ceilingHold || {});
  const namedPathsInfo = normalizeNamedPaths(input.namedPaths);
  const namedPaths = namedPathsInfo.normalized;

  const non_claim_chips = [
    'NON-CLAIM: PO L2 Named-Path Disposition ≠ PRODUCTION_READY flip',
    'NON-CLAIM: disposition ≠ tip-pin rewrite (freeze soft-observe 31f811ca only)',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L30 auto-close / ≠ L29 reopen',
    'NON-CLAIM: ≠ GHE / ≠ delete authorization / ≠ mass prune / ≠ CloudAgent',
    'NON-CLAIM: gate ≠ execution (DH executes later); namedPaths ≠ unsupervised delete',
    'NON-CLAIM: inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A)',
    'NON-CLAIM: schemas AT_CEILING 35/35 — do NOT add docs/schemas JSON files (AT_CEILING)',
    'NON-CLAIM: freeze NON-CLAIM surfaces observed as labels only — no tip rewrite',
    'NON-CLAIM: PASS = disposition gated with named paths sealed ≠ delete execution'
  ];
  if (!observe.ok) {
    non_claim_chips.push(
      `NON-CLAIM chip: missing required observe (${observe.missing.join(',')}) — not closed by labels alone`
    );
  }
  if (namedPaths.length === 0) {
    non_claim_chips.push(
      'NON-CLAIM chip: empty namedPaths — ACTIVE disposition cannot PASS'
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by disposition port`
    );
  }

  return {
    schema: 'eos.po-l2-named-path-disposition-observe.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    freeze_pin: DG_FREEZE_PIN,
    freeze_pin_short: DG_FREEZE_PIN_SHORT,
    freeze_observe: freezeObserve,
    ceiling_hold: ceilingHold,
    named_paths: namedPaths,
    observe: {
      ok: observe.ok,
      missing: observe.missing,
      observed: codes
    },
    disposition: {
      ok:
        input.dispositionOk !== false &&
        observe.ok &&
        (input.requireNamedPaths === false || namedPaths.length > 0)
    },
    ceiling: {
      ok: input.ceilingHoldOk !== false && ceilingHold.schemasAtCeiling === true,
      schemasAtCeiling: true
    },
    honesty: { ok: input.honestyOk !== false },
    inventory: {
      ok: input.dispositionOk !== false && observe.ok
    },
    fixtures: { ...DG_HITL_SURFACE_FIXTURES },
    pending_ports: pendingPorts,
    non_claim_chips,
    observe_note:
      'Mission DG builtin po-l2-named-path-disposition double — DF_REMEASURE+ADR_0075_HITL+AP_HITL required observe; namedPaths allowlist for ACTIVE; freeze NON-CLAIM soft-observe read-only; L29 CLOSED retained; L30 axis open after tip-refresh #416; ≠ tip-pin rewrite ≠ delete execution ≠ L30 auto-close',
    _builtinDouble: true
  };
}

/**
 * Evaluate observe surface → ok / refuse codes.
 */
export function evaluateObserveOk(surface, acks = {}, namedPaths = []) {
  const refuses = [];
  const observeOk = surface?.observe?.ok === true;
  const honestyOk = surface?.honesty?.ok !== false;
  const dispositionOk = surface?.disposition?.ok !== false;
  const ceilingHoldOk =
    surface?.ceiling?.ok !== false &&
    surface?.ceiling_hold?.schemasAtCeiling !== false;
  const ackMissing =
    acks.ackMissingObserveSurfaces === true ||
    acks.ackMissingObserveLabels === true;
  const paths =
    Array.isArray(namedPaths) && namedPaths.length > 0
      ? namedPaths
      : Array.isArray(surface?.named_paths)
        ? surface.named_paths
        : [];

  if (!observeOk && !ackMissing) {
    refuses.push(DG_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES);
  }
  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(DG_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }
  if (
    surface?.freeze_observe?.readOnly === false ||
    (surface?.freeze_observe?.pin != null &&
      String(surface.freeze_observe.pin) !== DG_FREEZE_PIN &&
      String(surface.freeze_observe.pin) !== DG_FREEZE_PIN_SHORT &&
      !String(surface.freeze_observe.pin).startsWith(DG_FREEZE_PIN_SHORT))
  ) {
    refuses.push(DG_REFUSE_CODES.TIP_PIN_REWRITE_REFUSED);
  }
  if (surface?.freeze_observe?.deleteAuthRefused === false) {
    refuses.push(DG_REFUSE_CODES.DELETE_AUTH_REFUSED);
  }
  if (!honestyOk) refuses.push(DG_REFUSE_CODES.HONESTY_NOT_OK);
  if (!dispositionOk && observeOk) {
    refuses.push(DG_REFUSE_CODES.DISPOSITION_NOT_OK);
  }
  if (!ceilingHoldOk && observeOk && dispositionOk) {
    refuses.push(DG_REFUSE_CODES.CEILING_HOLD_NOT_OK);
  }
  return {
    ok: refuses.length === 0,
    refuseCodes: refuses,
    observeOk,
    honestyOk,
    dispositionOk,
    ceilingHoldOk,
    namedPathsCount: paths.length,
    primaryRefuse: refuses.length ? refuses[0] : null
  };
}

/**
 * Map dispositionMode + observe eval + namedPaths → decision.
 * ACTIVE requires namedPaths non-empty for PASS.
 */
export function decisionForDisposition(
  dispositionMode,
  observeEval,
  namedPaths = []
) {
  if (dispositionMode === 'HOLD') return 'HOLD';
  if (
    observeEval &&
    observeEval.ok === true &&
    Array.isArray(namedPaths) &&
    namedPaths.length > 0
  ) {
    return 'PASS';
  }
  return 'DENY';
}
export const decisionForRemeasure = decisionForDisposition;
export const decisionForAggregation = decisionForDisposition;
export const decisionForHonesty = decisionForDisposition;
export const decisionForRitual = decisionForDisposition;

/**
 * PO L2 Named-Path Disposition Port — hermetic.
 */
export class PoL2NamedPathDispositionPort {
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new PoL2NamedPathDispositionPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });
    this._injectedDisposition =
      options.disposition || options.inventory || options.honesty || null;
    this._dispositionModulePath =
      options.dispositionModulePath ||
      options.inventoryModulePath ||
      options.honestyModulePath ||
      null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    this._resolvedDisposition = null;
    /** @type {Map<string, object>} */
    this.decisions = new Map();
    /** @type {Array<object>} */
    this.receipts = [];
    this._lastReceiptHash = null;
    this._governSeq = 0;
  }

  async resolveDisposition() {
    if (this._injectedDisposition?.buildDispositionSurface) {
      this._resolvedDisposition = {
        ...this._injectedDisposition,
        DISPOSITION_PRODUCTION_READY:
          this._injectedDisposition.DISPOSITION_PRODUCTION_READY || 'NO',
        source: 'injected'
      };
      return this._resolvedDisposition;
    }
    if (this._injectedDisposition?.buildInventorySurface) {
      this._resolvedDisposition = {
        buildDispositionSurface: (input) =>
          adaptDfDouble(this._injectedDisposition.buildInventorySurface(input)),
        DISPOSITION_PRODUCTION_READY: 'NO',
        source: 'injected-inventory'
      };
      return this._resolvedDisposition;
    }
    if (this._preferBuiltinDouble) {
      this._resolvedDisposition = {
        buildDispositionSurface: builtinPoL2NamedPathDispositionDouble,
        DISPOSITION_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedDisposition;
    }
    if (!this._resolvedDisposition) {
      const soft = await softImportDfHitlSurfaces(this._dispositionModulePath);
      this._resolvedDisposition = soft || {
        buildDispositionSurface: builtinPoL2NamedPathDispositionDouble,
        DISPOSITION_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
    }
    return this._resolvedDisposition;
  }

  _sealReceipt(fields) {
    const receipt = buildPoL2NamedPathDispositionReceipt(
      { ...fields, prevReceiptHash: this._lastReceiptHash },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  _deny(plan, evaluation, extra = {}) {
    const reasons = [evaluation.reason, ...(extra.reasons || [])].filter(
      Boolean
    );
    const observedSurfaces = extra.observedSurfaces || [];
    const namedPaths = extra.namedPaths || [];
    const freezeObserve = forceFreezeObserve(plan?.freezeObserve || {});
    const ceilingHold = forceCeilingHold(plan?.ceilingHold || {});
    const mode =
      plan?.dispositionMode != null
        ? String(plan.dispositionMode)
        : plan?.remeasureMode != null
          ? String(plan.remeasureMode)
          : plan?.aggregationMode != null
            ? String(plan.aggregationMode)
            : plan?.honestyMode != null
              ? String(plan.honestyMode)
              : plan?.ritualMode != null
                ? String(plan.ritualMode)
                : plan?.observeMode != null
                  ? String(plan.observeMode)
                  : null;
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      changeId: plan?.changeId != null ? String(plan.changeId) : null,
      decision: 'DENY',
      dispositionMode: mode,
      remeasureMode: mode,
      aggregationMode: mode,
      honestyMode: mode,
      phase: plan?.phase != null ? String(plan.phase) : null,
      namedPaths,
      dispositionDigest:
        plan?.dispositionDigest != null &&
        String(plan.dispositionDigest).trim() !== ''
          ? String(plan.dispositionDigest)
          : plan?.inventoryDigest != null &&
              String(plan.inventoryDigest).trim() !== ''
            ? String(plan.inventoryDigest)
            : plan?.honestyDigest != null &&
                String(plan.honestyDigest).trim() !== ''
              ? String(plan.honestyDigest)
              : this.hashFn({ deny: true, planId: plan?.planId || null }),
      dfInventoryDigest:
        plan?.dfInventoryDigest != null
          ? String(plan.dfInventoryDigest)
          : null,
      observedSurfaces,
      dispositionOk: extra.dispositionOk ?? false,
      ceilingHoldOk: extra.ceilingHoldOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoApproveRefused: extra.autoApproveRefused === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL30Refused: extra.autoCloseL30Refused === true,
      l29ReopenRefused: extra.l29ReopenRefused === true,
      deleteAuthRefused: extra.deleteAuthRefused === true,
      massPruneRefused: extra.massPruneRefused === true,
      freezeObserve,
      ceilingHold,
      reasons,
      meta: {
        code: evaluation.code,
        reason: evaluation.reason,
        freezePin: DG_FREEZE_PIN_SHORT,
        gateNotExecution: true
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      dispositionMode: mode || undefined,
      remeasureMode: mode || undefined,
      aggregationMode: mode || undefined,
      honestyMode: mode || undefined,
      ritualMode: mode || undefined,
      namedPaths,
      observedSurfaces,
      observedSurfaceCodes: extra.observedSurfaceCodes || [],
      observedPorts: observedSurfaces,
      observedPortCodes: extra.observedSurfaceCodes || [],
      dispositionOk: extra.dispositionOk ?? false,
      ceilingHoldOk: extra.ceilingHoldOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      freezeObserve,
      ceilingHold,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoApproveRefused: extra.autoApproveRefused === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL30Refused: extra.autoCloseL30Refused === true,
      l29ReopenRefused: extra.l29ReopenRefused === true,
      deleteAuthRefused: extra.deleteAuthRefused === true,
      massPruneRefused: extra.massPruneRefused === true,
      reasons,
      receipt,
      observe: extra.observe || null,
      safeAutomationIds: [...DG_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern a PO L2 named-path disposition plan → PASS | DENY | HOLD + DG-RCPT-*.
   * PASS = disposition gated with named paths sealed ≠ delete execution.
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal =
        evaluation.code === DG_CODES.AUTO_SEAL_CLAIM_DENY ||
        evaluation.code === DG_CODES.AUTO_SEAL_L30_CLAIM_DENY ||
        evaluation.code === DG_CODES.AUTO_CLOSE_L30_CLAIM_DENY;
      const autoProd =
        evaluation.code === DG_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === DG_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      const autoApprove =
        evaluation.code === DG_CODES.AUTO_APPROVE_CLAIM_DENY ||
        evaluation.code === DG_CODES.AUTO_APPROVE_WITHOUT_NAMED_PATHS_DENY ||
        evaluation.code === DG_CODES.EMPTY_NAMED_PATHS_ACTIVE_DENY;
      const tipPin =
        evaluation.code === DG_CODES.TIP_PIN_REWRITE_CLAIM_DENY ||
        evaluation.code === DG_CODES.TIP_REWRITE_CLAIM_DENY;
      const ghe = evaluation.code === DG_CODES.GHE_CLAIM_DENY;
      const l29 = evaluation.code === DG_CODES.L29_REOPEN_CLAIM_DENY;
      const delAuth = evaluation.code === DG_CODES.DELETE_AUTH_CLAIM_DENY;
      const mass =
        evaluation.code === DG_CODES.MASS_PRUNE_CLAIM_DENY ||
        evaluation.code === DG_CODES.UNSUPERVISED_DELETE_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoApproveRefused: autoApprove,
        autoProductionFlipRefused: autoProd,
        tipPinRewriteRefused: tipPin,
        gheClaimRefused: ghe,
        autoCloseL30Refused:
          evaluation.code === DG_CODES.AUTO_CLOSE_L30_CLAIM_DENY ||
          evaluation.code === DG_CODES.AUTO_SEAL_L30_CLAIM_DENY,
        l29ReopenRefused: l29,
        deleteAuthRefused: delAuth,
        massPruneRefused: mass,
        humanGateHeld: autoSeal || autoProd || autoApprove || delAuth || mass,
        refuseCodes: [evaluation.code],
        namedPaths: Array.isArray(plan?.namedPaths)
          ? normalizeNamedPaths(plan.namedPaths).normalized
          : [],
        observedSurfaces: Array.isArray(plan?.observedSurfaces)
          ? plan.observedSurfaces.map(String)
          : Array.isArray(plan?.observedPorts)
            ? plan.observedPorts.map(String)
            : []
      });
    }

    this._governSeq += 1;
    const {
      planId,
      changeId,
      dispositionMode,
      phase,
      dispositionDigest: planDigest,
      observedSurfaces,
      observedSurfaceCodes,
      namedPaths,
      observeOk: gateObserveOk,
      ackMissingObserveSurfaces,
      honestyOk: gateHonestyOk,
      dispositionOk: gateDispositionOk,
      ceilingHoldOk: gateCeilingOk,
      dfInventoryDigest,
      humanGateHeld: planHumanGateHeld,
      reasons: planReasons
    } = evaluation;

    let observe = null;
    if (
      dispositionMode === 'HOLD' &&
      (!observedSurfaces || observedSurfaces.length === 0)
    ) {
      const freezeObserve = softObserveFreezeNonClaims(plan || {});
      const ceilingHold = forceCeilingHold(plan?.ceilingHold || {});
      observe = {
        schema: 'eos.po-l2-named-path-disposition-observe.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        freeze_pin: DG_FREEZE_PIN,
        freeze_observe: freezeObserve,
        ceiling_hold: ceilingHold,
        named_paths: namedPaths || [],
        observe: { ok: true, missing: [], observed: [] },
        disposition: { ok: true },
        ceiling: { ok: true, schemasAtCeiling: true },
        honesty: { ok: true },
        inventory: { ok: true },
        pending_ports: ['DH pending', 'DI pending', 'DJ pending'],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L30 auto-close / ≠ L29 reopen',
          'NON-CLAIM: HOLD observe ≠ tip-pin rewrite (freeze soft-observe only)',
          'NON-CLAIM: HOLD observe ≠ delete authorization / ≠ mass prune / ≠ auto-approve',
          'NON-CLAIM: HOLD observe ≠ delete execution (DH later)'
        ],
        note: 'HOLD observe — PO L2 Named-Path Disposition; ≠ automatic closure; ≠ tip-pin rewrite; ≠ delete execution'
      };
    } else {
      const runner = await this.resolveDisposition();
      observe = runner.buildDispositionSurface({
        observedSurfaces,
        observedPorts: observedSurfaces,
        namedPaths,
        honestyOk: gateHonestyOk !== false,
        dispositionOk: gateDispositionOk !== false,
        ceilingHoldOk: gateCeilingOk !== false,
        pendingPorts: ['DH pending', 'DI pending', 'DJ pending'],
        surface: 'po-l2-named-path-disposition',
        freezeObserve: plan?.freezeObserve,
        ceilingHold: plan?.ceilingHold
      });
      observe = {
        ...observe,
        PRODUCTION_READY: 'NO',
        freeze_pin: DG_FREEZE_PIN,
        freeze_observe: softObserveFreezeNonClaims({
          freezeObserve: {
            ...(observe.freeze_observe || {}),
            ...(plan?.freezeObserve || {})
          }
        }),
        ceiling_hold: forceCeilingHold({
          ...(observe.ceiling_hold || {}),
          ...(plan?.ceilingHold || {})
        }),
        named_paths: namedPaths
      };
      if (!observe.observe || typeof observe.observe !== 'object') {
        observe = {
          ...observe,
          observe: {
            ok: gateObserveOk === true,
            missing: DG_REQUIRED_OBSERVE_SURFACES.filter(
              (c) => !(observedSurfaceCodes || []).includes(c)
            ),
            observed: [...(observedSurfaceCodes || [])]
          },
          honesty: observe.honesty || { ok: gateHonestyOk !== false },
          disposition: observe.disposition || {
            ok:
              gateObserveOk === true &&
              gateDispositionOk !== false &&
              namedPaths.length > 0
          },
          ceiling: observe.ceiling || {
            ok: gateObserveOk === true && gateCeilingOk !== false,
            schemasAtCeiling: true
          }
        };
      }
      if (!observe.disposition) {
        observe = {
          ...observe,
          disposition: {
            ok:
              observe.observe?.ok === true &&
              observe.honesty?.ok !== false &&
              namedPaths.length > 0
          }
        };
      }
      if (!observe.ceiling) {
        observe = {
          ...observe,
          ceiling: { ok: true, schemasAtCeiling: true }
        };
      }
    }

    const observeEval = evaluateObserveOk(
      observe,
      {
        ackMissingObserveSurfaces,
        ackMissingObserveLabels: ackMissingObserveSurfaces
      },
      namedPaths
    );

    let decision = decisionForDisposition(
      dispositionMode,
      observeEval,
      namedPaths
    );
    if (dispositionMode === 'ACTIVE' && !gateObserveOk && decision === 'PASS') {
      decision = 'DENY';
      observeEval.ok = false;
      if (
        !observeEval.refuseCodes.includes(
          DG_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES
        )
      ) {
        observeEval.refuseCodes.push(
          DG_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES
        );
      }
      observeEval.primaryRefuse =
        DG_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES;
    }
    if (
      dispositionMode === 'ACTIVE' &&
      namedPaths.length === 0 &&
      decision === 'PASS'
    ) {
      decision = 'DENY';
      observeEval.ok = false;
      if (
        !observeEval.refuseCodes.includes(
          DG_REFUSE_CODES.EMPTY_NAMED_PATHS_ACTIVE
        )
      ) {
        observeEval.refuseCodes.push(DG_REFUSE_CODES.EMPTY_NAMED_PATHS_ACTIVE);
      }
      observeEval.primaryRefuse = DG_REFUSE_CODES.EMPTY_NAMED_PATHS_ACTIVE;
    }

    const nonClaimChips = Array.isArray(observe?.non_claim_chips)
      ? observe.non_claim_chips.map(String)
      : [];
    const pendingPorts = Array.isArray(observe?.pending_ports)
      ? observe.pending_ports.map(String)
      : [];
    const freezeObserve = forceFreezeObserve(plan?.freezeObserve || {});
    const ceilingHold = forceCeilingHold(plan?.ceilingHold || {});

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: DG_CODES.DISPOSITION_REFUSE_DENY,
          reason: `PO L2 named-path disposition/observe refused: ${observeEval.primaryRefuse || 'unknown'} (≠ delete execution / ≠ tip-pin rewrite / ≠ PRODUCTION_READY flip / ≠ auto-approve)`
        },
        {
          dispositionOk: false,
          ceilingHoldOk: false,
          honestyOk: observeEval.honestyOk,
          namedPaths,
          observedSurfaces,
          observedSurfaceCodes,
          refuseCodes: observeEval.refuseCodes.length
            ? observeEval.refuseCodes
            : [DG_REFUSE_CODES.DISPOSITION_NOT_OK],
          observe,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? DG_CODES.GOVERN_PASS : DG_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `po-l2-named-path-disposition govern ${decision}: changeId=${changeId} dispositionMode=${dispositionMode} phase=${phase} planId=${planId} namedPaths=${namedPaths.length}`,
      `freeze soft-observe: pin=${DG_FREEZE_PIN_SHORT} readOnly=true (≠ tip-pin rewrite)`,
      'NON-CLAIM: disposition PASS = named paths sealed ≠ delete execution ≠ auto-approve ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent',
      'A5_PRESERVE_FUNDACION_ALWAYS_DENY + A6_PRESERVE_HUMAN_PROD_GATE held',
      'A7_REFUSE_TIP_PIN_REWRITE + A8_REFUSE_L29_REOPEN + A9_REFUSE_GHE_CLAIM + A10_REFUSE_AUTO_CLOSE_L30 + A11_REFUSE_DELETE_AUTH + A12_REFUSE_PRODUCTION_READY_FLIP + A13_REFUSE_MASS_PRUNE + A14_HOLD_SCHEMAS_AT_CEILING + A15_REFUSE_AUTO_APPROVE_WITHOUT_NAMED_PATHS + A16_REQUIRE_NAMED_PATHS_FOR_ACTIVE + A17_GATE_NOT_EXECUTION held',
      `freeze pin ${DG_FREEZE_PIN_SHORT} (Mission DF #415 soft-observe; tip-refresh #416; no tip-pin rewrite from this package)`,
      'gate ≠ execution (DH later); inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A); schemas AT_CEILING 35/35'
    ];

    const dispositionDigest =
      planDigest ||
      this.hashFn({
        changeId,
        dispositionMode,
        phase,
        namedPaths,
        observedSurfaces,
        refuseCodes: observeEval.refuseCodes,
        decision,
        freezeObserve: {
          pinShort: DG_FREEZE_PIN_SHORT,
          readOnly: true,
          deleteAuthRefused: true,
          autoApproveRefused: true
        },
        ceilingHold: {
          schemasAtCeiling: true,
          slimHold: true
        }
      });

    const dispositionPlanDigest = this.hashFn({
      planId,
      changeId,
      dispositionDigest,
      dispositionMode,
      phase,
      namedPaths,
      decision,
      observeEval,
      observedSurfaceCodes
    });

    const record = Object.freeze({
      planId,
      changeId,
      dispositionDigest,
      dispositionMode,
      phase,
      decision,
      namedPaths: Object.freeze([...namedPaths]),
      dispositionOk: observeEval.dispositionOk || gateObserveOk,
      ceilingHoldOk: observeEval.ceilingHoldOk || gateObserveOk,
      honestyOk: observeEval.honestyOk,
      observedSurfaces: Object.freeze([...observedSurfaces]),
      observedSurfaceCodes: Object.freeze([...observedSurfaceCodes]),
      refuseCodes: Object.freeze([...observeEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      dispositionPlanDigest,
      dfInventoryDigest: dfInventoryDigest || null,
      governedAt: new Date().toISOString()
    });
    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      dispositionMode,
      remeasureMode: dispositionMode,
      aggregationMode: dispositionMode,
      honestyMode: dispositionMode,
      phase,
      namedPaths,
      dispositionDigest,
      dfInventoryDigest: dfInventoryDigest || null,
      observedSurfaces,
      requiredObserveSet: [...DG_REQUIRED_OBSERVE_SURFACES],
      dispositionOk: record.dispositionOk,
      ceilingHoldOk: record.ceilingHoldOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      humanGateHeld: planHumanGateHeld === true || decision === 'PASS',
      autoApproveRefused: false,
      autoSealRefused: false,
      autoProductionFlipRefused: false,
      tipPinRewriteRefused: false,
      gheClaimRefused: false,
      autoCloseL30Refused: false,
      l29ReopenRefused: false,
      deleteAuthRefused: false,
      massPruneRefused: false,
      freezeObserve,
      ceilingHold,
      reasons,
      dispositionPlanDigest,
      meta: {
        code,
        reasons,
        freezePin: DG_FREEZE_PIN_SHORT,
        freezePinFull: DG_FREEZE_PIN,
        schemasAtCeiling: true,
        gateNotExecution: true,
        dispositionSource: this._resolvedDisposition?.source || 'snapshot',
        observedSurfaceCodes,
        namedPathsCount: namedPaths.length,
        safeAutomationIds: [...DG_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      dispositionMode,
      remeasureMode: dispositionMode,
      aggregationMode: dispositionMode,
      honestyMode: dispositionMode,
      ritualMode: dispositionMode,
      phase,
      namedPaths,
      dispositionDigest,
      inventoryDigest: dispositionDigest,
      observabilityDigest: dispositionDigest,
      honestyDigest: dispositionDigest,
      dispositionPlanDigest,
      inventoryPlanDigest: dispositionPlanDigest,
      observabilityPlanDigest: dispositionPlanDigest,
      honestyPlanDigest: dispositionPlanDigest,
      dfInventoryDigest: dfInventoryDigest || null,
      observedSurfaces,
      observedSurfaceCodes,
      observedPorts: observedSurfaces,
      observedPortCodes: observedSurfaceCodes,
      dispositionOk: record.dispositionOk,
      ceilingHoldOk: record.ceilingHoldOk,
      honestyOk: record.honestyOk,
      freezeObserve,
      ceilingHold,
      refuseCodes: observeEval.refuseCodes,
      nonClaimChips,
      pendingPorts,
      humanGateHeld: planHumanGateHeld === true || decision === 'PASS',
      reasons,
      receipt,
      observe,
      safeAutomationIds: [...DG_SAFE_AUTOMATION_IDS]
    };
  }

  async evaluate(plan) {
    return this.govern(plan);
  }

  getDecision(planId) {
    return this.decisions.get(planId) || null;
  }

  verifyTrail() {
    let prevHash = null;
    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifyPoL2NamedPathDispositionReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: DG_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: DG_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      prevHash = receipt.receiptHash;
    }
    return {
      valid: true,
      code: DG_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  DG_PORT_PRODUCTION_READY,
  DG_PORT_KIND,
  DG_PRODUCTION_READY,
  DG_RECEIPT_KIND,
  DG_CODES,
  DG_SAFE_AUTOMATION_IDS,
  DG_REFUSE_CODES,
  DG_FREEZE_PIN,
  DG_FREEZE_PIN_SHORT,
  DG_DEFAULT_OBSERVE_SURFACES,
  DG_HITL_SURFACE_FIXTURES,
  DG_FREEZE_NONCLAIM_LABELS,
  DG_FREEZE_OBSERVE_TEMPLATE,
  DG_CEILING_HOLD_TEMPLATE,
  softImportDfHitlSurfaces,
  softComposeHitlSurfaces,
  softObserveFreezeNonClaims,
  builtinPoL2NamedPathDispositionDouble,
  evaluateObserveOk,
  decisionForDisposition,
  decisionForRemeasure,
  decisionForAggregation,
  decisionForHonesty,
  decisionForRitual,
  PoL2NamedPathDispositionPort
};
