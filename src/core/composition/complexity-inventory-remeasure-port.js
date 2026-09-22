/**
 * @module complexity-inventory-remeasure-port
 * SPEC-0115 / Mission DF — Complexity Inventory Re-measure & Ceiling Hold Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic Complexity Inventory Re-measure Port:
 *   - Validates plan via policy gate
 *   - Soft-observes freeze NON-CLAIM labels/fixtures (read-only; do NOT rewrite tip pins)
 *   - Soft-imports ceiling surfaces when present (compose) else builtin fixture double:
 *       Post-L26 complexity prune inventory (observe only)
 *       ADR-0075 PO-gated prune plan (observe only; plan≠execution)
 *       T6 complexity ceiling hold / COMPLEXITY_CEILING_HOLD_RITUAL (observe only)
 *       Soft-observe DA receipt patterns optional
 *   - remeasureMode / aggregationMode / honestyMode / ritualMode: ACTIVE | HOLD
 *   - Decision: PASS | DENY | HOLD
 *   - Seals DF-RCPT-* receipts with forced freeze soft-observe (pin 36c99107)
 *   - Explicit honesty: remeasure PASS ≠ delete auth ≠ mass prune ≠ PRODUCTION_READY flip
 *     ≠ tip-pin rewrite ≠ L30 auto-close ≠ L29 reopen
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate
 *   - schemas AT_CEILING 35/35 — do NOT add docs/schemas JSON files (AT_CEILING)
 *
 * NON-CLAIM: Complexity Inventory Re-measure Port ≠ delete authorization ≠
 * mass prune ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠
 * GHE ≠ L30 auto-close ≠ L29 reopen ≠ unsupervised delete.
 * Inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A).
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DF_PRODUCTION_READY,
  DF_RECEIPT_KIND,
  DF_FREEZE_PIN,
  DF_FREEZE_PIN_SHORT,
  DF_REQUIRED_OBSERVE_SURFACES,
  DF_FREEZE_NONCLAIM_LABELS,
  DF_FREEZE_OBSERVE_TEMPLATE,
  DF_CEILING_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  buildComplexityInventoryRemeasureReceipt,
  verifyComplexityInventoryRemeasureReceipt
} from './complexity-inventory-remeasure-receipt.js';

import {
  ComplexityInventoryRemeasurePolicyGate,
  DF_CODES,
  evaluateRequiredObserveSet
} from './complexity-inventory-remeasure-policy-gate.js';

/** @type {'NO'} */
export const DF_PORT_PRODUCTION_READY = 'NO';
export const DF_PORT_KIND = 'eos-complexity-inventory-remeasure-port';
export {
  DF_FREEZE_PIN,
  DF_FREEZE_PIN_SHORT,
  DF_FREEZE_NONCLAIM_LABELS,
  DF_FREEZE_OBSERVE_TEMPLATE,
  DF_CEILING_HOLD_TEMPLATE
};

export const DF_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_REMEASURE_PROBE',
  'A2_FREEZE_NONCLAIM_OBSERVE_PROBE',
  'A3_CEILING_SURFACES_SOFT_IMPORT_PROBE',
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
  'A14_HOLD_SCHEMAS_AT_CEILING'
]);

export const DF_REFUSE_CODES = Object.freeze({
  MISSING_REQUIRED_OBSERVE_SURFACES: 'MISSING_REQUIRED_OBSERVE_SURFACES',
  INVENTORY_NOT_OK: 'INVENTORY_NOT_OK',
  CEILING_HOLD_NOT_OK: 'CEILING_HOLD_NOT_OK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L29_REOPEN_REFUSED: 'L29_REOPEN_REFUSED',
  TIP_PIN_REWRITE_REFUSED: 'TIP_PIN_REWRITE_REFUSED',
  GHE_CLAIM_REFUSED: 'GHE_CLAIM_REFUSED',
  AUTO_CLOSE_L30_REFUSED: 'AUTO_CLOSE_L30_REFUSED',
  DELETE_AUTH_REFUSED: 'DELETE_AUTH_REFUSED',
  MASS_PRUNE_REFUSED: 'MASS_PRUNE_REFUSED'
});

export const DF_DEFAULT_OBSERVE_SURFACES = Object.freeze([
  'POST_L26_INVENTORY:complexity-prune-inventory-observe',
  'ADR_0075_PRUNE_PLAN:po-gated-prune-plan-observe',
  'T6_CEILING_HOLD:complexity-ceiling-hold-observe',
  'DA:control-plane-observability-aggregation-observe'
]);

export const DF_CEILING_SURFACE_FIXTURES = Object.freeze({
  POST_L26_INVENTORY: {
    path: 'docs/releases/EOS_POST_L26_COMPLEXITY_PRUNE_INVENTORY_2026-09-19.md',
    mode: 'observe-only',
    note: 'Post-L26 complexity prune inventory — observe only; ≠ delete auth'
  },
  ADR_0075_PRUNE_PLAN: {
    path: 'docs/adrs/ADR-0075-po-gated-complexity-prune-plan.md',
    mode: 'observe-only',
    note: 'ADR-0075 PO-gated prune plan — observe only; plan≠execution'
  },
  T6_CEILING_HOLD: {
    path: 'COMPLEXITY_CEILING_HOLD_RITUAL',
    mode: 'observe-only',
    note: 'T6 complexity ceiling hold — observe only; schemas AT_CEILING 35/35'
  },
  DA: {
    path: 'src/core/composition/control-plane-observability-aggregation-receipt.js',
    mode: 'observe-only',
    note: 'Soft-observe DA receipt patterns optional'
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import ceiling surfaces when co-located (compose; don't fork).
 * Returns fixture doubles when modules/docs absent.
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportCeilingSurfaces(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'control-plane-observability-aggregation-receipt.js'),
    path.resolve(
      '/workspace/eos-mission-da/src/core/composition/control-plane-observability-aggregation-receipt.js'
    ),
    path.resolve(
      '/workspace/eos-mission-da/src/core/composition/control-plane-observability-aggregation-port.js'
    )
  );
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      if (typeof mod.builtinObservabilityAggregationDouble === 'function') {
        return {
          buildInventorySurface: (input) =>
            adaptDaDouble(mod.builtinObservabilityAggregationDouble(input)),
          INVENTORY_PRODUCTION_READY: 'NO',
          source: 'soft-import',
          path: candidate
        };
      }
      if (typeof mod.buildControlPlaneObservabilityAggregationReceipt === 'function') {
        return {
          buildInventorySurface: builtinComplexityInventoryDouble,
          INVENTORY_PRODUCTION_READY: 'NO',
          source: 'soft-import-da-receipt',
          path: candidate
        };
      }
      if (typeof mod.buildInventorySurface === 'function') {
        return {
          buildInventorySurface: mod.buildInventorySurface,
          INVENTORY_PRODUCTION_READY: mod.INVENTORY_PRODUCTION_READY || 'NO',
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

function adaptDaDouble(daSurface) {
  return {
    schema: 'eos.complexity-inventory-remeasure-observe.v1',
    surface: daSurface?.surface || 'soft-import-da',
    PRODUCTION_READY: 'NO',
    freeze_pin: DF_FREEZE_PIN,
    freeze_pin_short: DF_FREEZE_PIN_SHORT,
    freeze_observe: forceFreezeObserve(daSurface?.freeze_observe || {}),
    ceiling_hold: forceCeilingHold(),
    observe: daSurface?.observe || { ok: true, missing: [], observed: [] },
    inventory: { ok: daSurface?.aggregation?.ok !== false },
    ceiling: { ok: true, schemasAtCeiling: true },
    honesty: daSurface?.honesty || { ok: true },
    pending_ports: daSurface?.pending_ports || ['DG pending', 'DH pending', 'DI pending', 'DJ pending'],
    non_claim_chips: [
      ...(Array.isArray(daSurface?.non_claim_chips)
        ? daSurface.non_claim_chips.map(String)
        : []),
      'NON-CLAIM: inventory re-measure ≠ delete authorization (ADR-0075)',
      'NON-CLAIM: schemas AT_CEILING 35/35'
    ],
    _softImportDa: true
  };
}

/**
 * Soft-compose ceiling observe surfaces (fixtures when absent).
 * @param {string[]} [requested]
 * @returns {{ labels: string[], source: string, fixtures: object }}
 */
export function softComposeCeilingSurfaces(requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return {
      labels: requested.map(String),
      source: 'plan',
      fixtures: { ...DF_CEILING_SURFACE_FIXTURES }
    };
  }
  return {
    labels: [...DF_DEFAULT_OBSERVE_SURFACES],
    source: 'fixture-default',
    fixtures: { ...DF_CEILING_SURFACE_FIXTURES }
  };
}

/**
 * Soft-observe freeze NON-CLAIM surfaces (labels/fixtures; never rewrite tip pins).
 * @param {object} [input]
 * @returns {object}
 */
export function softObserveFreezeNonClaims(input = {}) {
  return forceFreezeObserve({
    ...(input.freezeObserve || {}),
    nonClaimLabels: Array.isArray(input.nonClaimLabels)
      ? input.nonClaimLabels.map(String)
      : [...DF_FREEZE_NONCLAIM_LABELS]
  });
}

/**
 * Builtin complexity inventory remeasure double for hermetic PASS|DENY|HOLD.
 * @param {object} input
 * @returns {object}
 */
export function builtinComplexityInventoryDouble(input = {}) {
  const observedSurfaces = Array.isArray(input.observedSurfaces)
    ? input.observedSurfaces.map(String)
    : Array.isArray(input.observedPorts)
      ? input.observedPorts.map(String)
      : [...DF_DEFAULT_OBSERVE_SURFACES];
  const codes = [];
  const seen = new Set();
  for (const p of observedSurfaces) {
    const upper = String(p).trim().toUpperCase();
    const compact = upper.replace(/[:|/.\\\s-]+/g, '_');
    let code = null;
    for (const known of DF_REQUIRED_OBSERVE_SURFACES) {
      if (compact === known || compact.startsWith(known)) {
        code = known;
        break;
      }
    }
    if (!code && compact.startsWith('DA')) code = 'DA';
    if (!code) {
      const head = upper.split(/[:|/.\\\s_-]/)[0];
      if (DF_REQUIRED_OBSERVE_SURFACES.includes(head)) code = head;
      if (head === 'POST' || head === 'POST_L26') code = 'POST_L26_INVENTORY';
      if (head === 'ADR' || head === 'ADR_0075' || head === 'ADR0075')
        code = 'ADR_0075_PRUNE_PLAN';
      if (head === 'T6' || head === 'CEILING') code = 'T6_CEILING_HOLD';
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
    : ['DG pending', 'DH pending', 'DI pending', 'DJ pending'];
  const freezeObserve = softObserveFreezeNonClaims(input);
  const ceilingHold = forceCeilingHold(input.ceilingHold || {});

  const non_claim_chips = [
    'NON-CLAIM: Complexity Inventory Re-measure ≠ PRODUCTION_READY flip',
    'NON-CLAIM: remeasure ≠ tip-pin rewrite (freeze soft-observe 36c99107 only)',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L30 auto-close / ≠ L29 reopen',
    'NON-CLAIM: ≠ GHE / ≠ delete authorization / ≠ mass prune',
    'NON-CLAIM: inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A)',
    'NON-CLAIM: schemas AT_CEILING 35/35 — do NOT add docs/schemas JSON files (AT_CEILING)',
    'NON-CLAIM: freeze NON-CLAIM surfaces observed as labels only — no tip rewrite'
  ];
  if (!observe.ok) {
    non_claim_chips.push(
      `NON-CLAIM chip: missing required observe (${observe.missing.join(',')}) — not closed by labels alone`
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by remeasure port`
    );
  }

  return {
    schema: 'eos.complexity-inventory-remeasure-observe.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    freeze_pin: DF_FREEZE_PIN,
    freeze_pin_short: DF_FREEZE_PIN_SHORT,
    freeze_observe: freezeObserve,
    ceiling_hold: ceilingHold,
    observe: {
      ok: observe.ok,
      missing: observe.missing,
      observed: codes
    },
    inventory: {
      ok: input.inventoryOk !== false && observe.ok
    },
    ceiling: {
      ok: input.ceilingHoldOk !== false && ceilingHold.schemasAtCeiling === true,
      schemasAtCeiling: true
    },
    honesty: { ok: input.honestyOk !== false },
    aggregation: {
      ok: input.inventoryOk !== false && observe.ok
    },
    fixtures: { ...DF_CEILING_SURFACE_FIXTURES },
    pending_ports: pendingPorts,
    non_claim_chips,
    observe_note:
      'Mission DF builtin complexity-inventory-remeasure double — POST_L26+ADR_0075+T6 required observe; freeze NON-CLAIM soft-observe read-only; L29 CLOSED retained; L30 axis open after tip-open #414; ≠ tip-pin rewrite ≠ delete auth ≠ L30 auto-close',
    _builtinDouble: true
  };
}

/**
 * Evaluate observe surface → ok / refuse codes.
 * @param {object} surface
 * @param {object} [acks]
 */
export function evaluateObserveOk(surface, acks = {}) {
  const refuses = [];
  const observeOk = surface?.observe?.ok === true;
  const honestyOk = surface?.honesty?.ok !== false;
  const inventoryOk = surface?.inventory?.ok !== false;
  const ceilingHoldOk =
    surface?.ceiling?.ok !== false &&
    surface?.ceiling_hold?.schemasAtCeiling !== false;
  const ackMissing =
    acks.ackMissingObserveSurfaces === true ||
    acks.ackMissingObserveLabels === true;

  if (!observeOk && !ackMissing) {
    refuses.push(DF_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES);
  }
  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(DF_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }
  if (
    surface?.freeze_observe?.readOnly === false ||
    (surface?.freeze_observe?.pin != null &&
      String(surface.freeze_observe.pin) !== DF_FREEZE_PIN &&
      String(surface.freeze_observe.pin) !== DF_FREEZE_PIN_SHORT &&
      !String(surface.freeze_observe.pin).startsWith(DF_FREEZE_PIN_SHORT))
  ) {
    refuses.push(DF_REFUSE_CODES.TIP_PIN_REWRITE_REFUSED);
  }
  if (surface?.freeze_observe?.deleteAuthRefused === false) {
    refuses.push(DF_REFUSE_CODES.DELETE_AUTH_REFUSED);
  }
  if (!honestyOk) refuses.push(DF_REFUSE_CODES.HONESTY_NOT_OK);
  if (!inventoryOk && observeOk) {
    refuses.push(DF_REFUSE_CODES.INVENTORY_NOT_OK);
  }
  if (!ceilingHoldOk && observeOk && inventoryOk) {
    refuses.push(DF_REFUSE_CODES.CEILING_HOLD_NOT_OK);
  }
  return {
    ok: refuses.length === 0,
    refuseCodes: refuses,
    observeOk,
    honestyOk,
    inventoryOk,
    ceilingHoldOk,
    primaryRefuse: refuses.length ? refuses[0] : null
  };
}

/**
 * Map remeasureMode + observe eval → decision.
 * @param {string} remeasureMode
 * @param {{ ok: boolean }|null} observeEval
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForRemeasure(remeasureMode, observeEval) {
  if (remeasureMode === 'HOLD') return 'HOLD';
  if (observeEval && observeEval.ok === true) return 'PASS';
  return 'DENY';
}
/** Aliases for DA/CY API compatibility. */
export const decisionForAggregation = decisionForRemeasure;
export const decisionForHonesty = decisionForRemeasure;
export const decisionForRitual = decisionForRemeasure;

/**
 * Complexity Inventory Remeasure Port — hermetic.
 */
export class ComplexityInventoryRemeasurePort {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new ComplexityInventoryRemeasurePolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });
    this._injectedInventory = options.inventory || options.honesty || null;
    this._inventoryModulePath =
      options.inventoryModulePath || options.honestyModulePath || null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    this._resolvedInventory = null;
    /** @type {Map<string, object>} */
    this.decisions = new Map();
    /** @type {Array<object>} */
    this.receipts = [];
    this._lastReceiptHash = null;
    this._governSeq = 0;
  }

  async resolveInventory() {
    if (this._injectedInventory?.buildInventorySurface) {
      this._resolvedInventory = {
        ...this._injectedInventory,
        INVENTORY_PRODUCTION_READY:
          this._injectedInventory.INVENTORY_PRODUCTION_READY || 'NO',
        source: 'injected'
      };
      return this._resolvedInventory;
    }
    if (this._injectedInventory?.buildHonestySurface) {
      this._resolvedInventory = {
        buildInventorySurface: (input) =>
          adaptDaDouble(this._injectedInventory.buildHonestySurface(input)),
        INVENTORY_PRODUCTION_READY: 'NO',
        source: 'injected-honesty'
      };
      return this._resolvedInventory;
    }
    if (this._preferBuiltinDouble) {
      this._resolvedInventory = {
        buildInventorySurface: builtinComplexityInventoryDouble,
        INVENTORY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedInventory;
    }
    if (!this._resolvedInventory) {
      const soft = await softImportCeilingSurfaces(this._inventoryModulePath);
      this._resolvedInventory = soft || {
        buildInventorySurface: builtinComplexityInventoryDouble,
        INVENTORY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
    }
    return this._resolvedInventory;
  }

  _sealReceipt(fields) {
    const receipt = buildComplexityInventoryRemeasureReceipt(
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
    const freezeObserve = forceFreezeObserve(plan?.freezeObserve || {});
    const ceilingHold = forceCeilingHold(plan?.ceilingHold || {});
    const mode =
      plan?.remeasureMode != null
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
      remeasureMode: mode,
      aggregationMode: mode,
      honestyMode: mode,
      phase: plan?.phase != null ? String(plan.phase) : null,
      inventoryDigest:
        plan?.inventoryDigest != null &&
        String(plan.inventoryDigest).trim() !== ''
          ? String(plan.inventoryDigest)
          : plan?.observabilityDigest != null &&
              String(plan.observabilityDigest).trim() !== ''
            ? String(plan.observabilityDigest)
            : plan?.honestyDigest != null &&
                String(plan.honestyDigest).trim() !== ''
              ? String(plan.honestyDigest)
              : this.hashFn({ deny: true, planId: plan?.planId || null }),
      observedSurfaces,
      inventoryOk: extra.inventoryOk ?? false,
      ceilingHoldOk: extra.ceilingHoldOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
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
        freezePin: DF_FREEZE_PIN_SHORT
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      remeasureMode: mode || undefined,
      aggregationMode: mode || undefined,
      honestyMode: mode || undefined,
      ritualMode: mode || undefined,
      observedSurfaces,
      observedSurfaceCodes: extra.observedSurfaceCodes || [],
      observedPorts: observedSurfaces,
      observedPortCodes: extra.observedSurfaceCodes || [],
      inventoryOk: extra.inventoryOk ?? false,
      ceilingHoldOk: extra.ceilingHoldOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      freezeObserve,
      ceilingHold,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
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
      safeAutomationIds: [...DF_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern a complexity inventory remeasure plan → PASS | DENY | HOLD + DF-RCPT-*.
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal =
        evaluation.code === DF_CODES.AUTO_SEAL_CLAIM_DENY ||
        evaluation.code === DF_CODES.AUTO_SEAL_L30_CLAIM_DENY ||
        evaluation.code === DF_CODES.AUTO_CLOSE_L30_CLAIM_DENY;
      const autoProd =
        evaluation.code === DF_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === DF_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      const tipPin =
        evaluation.code === DF_CODES.TIP_PIN_REWRITE_CLAIM_DENY ||
        evaluation.code === DF_CODES.TIP_REWRITE_CLAIM_DENY;
      const ghe = evaluation.code === DF_CODES.GHE_CLAIM_DENY;
      const l29 = evaluation.code === DF_CODES.L29_REOPEN_CLAIM_DENY;
      const delAuth = evaluation.code === DF_CODES.DELETE_AUTH_CLAIM_DENY;
      const mass =
        evaluation.code === DF_CODES.MASS_PRUNE_CLAIM_DENY ||
        evaluation.code === DF_CODES.UNSUPERVISED_DELETE_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        tipPinRewriteRefused: tipPin,
        gheClaimRefused: ghe,
        autoCloseL30Refused:
          evaluation.code === DF_CODES.AUTO_CLOSE_L30_CLAIM_DENY ||
          evaluation.code === DF_CODES.AUTO_SEAL_L30_CLAIM_DENY,
        l29ReopenRefused: l29,
        deleteAuthRefused: delAuth,
        massPruneRefused: mass,
        humanGateHeld: autoSeal || autoProd || delAuth || mass,
        refuseCodes: [evaluation.code],
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
      remeasureMode,
      phase,
      inventoryDigest: planDigest,
      observedSurfaces,
      observedSurfaceCodes,
      observeOk: gateObserveOk,
      ackMissingObserveSurfaces,
      honestyOk: gateHonestyOk,
      inventoryOk: gateInventoryOk,
      ceilingHoldOk: gateCeilingOk,
      reasons: planReasons
    } = evaluation;

    let observe = null;
    if (
      remeasureMode === 'HOLD' &&
      (!observedSurfaces || observedSurfaces.length === 0)
    ) {
      const freezeObserve = softObserveFreezeNonClaims(plan || {});
      const ceilingHold = forceCeilingHold(plan?.ceilingHold || {});
      observe = {
        schema: 'eos.complexity-inventory-remeasure-observe.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        freeze_pin: DF_FREEZE_PIN,
        freeze_observe: freezeObserve,
        ceiling_hold: ceilingHold,
        observe: { ok: true, missing: [], observed: [] },
        inventory: { ok: true },
        ceiling: { ok: true, schemasAtCeiling: true },
        honesty: { ok: true },
        aggregation: { ok: true },
        pending_ports: ['DG pending', 'DH pending', 'DI pending', 'DJ pending'],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L30 auto-close / ≠ L29 reopen',
          'NON-CLAIM: HOLD observe ≠ tip-pin rewrite (freeze soft-observe only)',
          'NON-CLAIM: HOLD observe ≠ delete authorization / ≠ mass prune'
        ],
        note: 'HOLD observe — Complexity Inventory Remeasure; ≠ automatic closure; ≠ tip-pin rewrite; ≠ delete auth'
      };
    } else {
      const runner = await this.resolveInventory();
      observe = runner.buildInventorySurface({
        observedSurfaces,
        observedPorts: observedSurfaces,
        honestyOk: gateHonestyOk !== false,
        inventoryOk: gateInventoryOk !== false,
        ceilingHoldOk: gateCeilingOk !== false,
        pendingPorts: ['DG pending', 'DH pending', 'DI pending', 'DJ pending'],
        surface: 'complexity-inventory-remeasure',
        freezeObserve: plan?.freezeObserve,
        ceilingHold: plan?.ceilingHold
      });
      observe = {
        ...observe,
        PRODUCTION_READY: 'NO',
        freeze_pin: DF_FREEZE_PIN,
        freeze_observe: softObserveFreezeNonClaims({
          freezeObserve: {
            ...(observe.freeze_observe || {}),
            ...(plan?.freezeObserve || {})
          }
        }),
        ceiling_hold: forceCeilingHold({
          ...(observe.ceiling_hold || {}),
          ...(plan?.ceilingHold || {})
        })
      };
      if (!observe.observe || typeof observe.observe !== 'object') {
        observe = {
          ...observe,
          observe: {
            ok: gateObserveOk === true,
            missing: DF_REQUIRED_OBSERVE_SURFACES.filter(
              (c) => !(observedSurfaceCodes || []).includes(c)
            ),
            observed: [...(observedSurfaceCodes || [])]
          },
          honesty: observe.honesty || { ok: gateHonestyOk !== false },
          inventory: observe.inventory || {
            ok: gateObserveOk === true && gateInventoryOk !== false
          },
          ceiling: observe.ceiling || {
            ok: gateObserveOk === true && gateCeilingOk !== false,
            schemasAtCeiling: true
          }
        };
      }
      if (!observe.inventory) {
        observe = {
          ...observe,
          inventory: {
            ok:
              observe.observe?.ok === true &&
              observe.honesty?.ok !== false
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

    const observeEval = evaluateObserveOk(observe, {
      ackMissingObserveSurfaces,
      ackMissingObserveLabels: ackMissingObserveSurfaces
    });

    // ACTIVE with incomplete required observe cannot PASS even with gate ack
    let decision = decisionForRemeasure(remeasureMode, observeEval);
    if (remeasureMode === 'ACTIVE' && !gateObserveOk && decision === 'PASS') {
      decision = 'DENY';
      observeEval.ok = false;
      if (
        !observeEval.refuseCodes.includes(
          DF_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES
        )
      ) {
        observeEval.refuseCodes.push(
          DF_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES
        );
      }
      observeEval.primaryRefuse =
        DF_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_SURFACES;
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
          code: DF_CODES.INVENTORY_REFUSE_DENY,
          reason: `Complexity inventory remeasure/observe refused: ${observeEval.primaryRefuse || 'unknown'} (≠ delete auth / ≠ tip-pin rewrite / ≠ PRODUCTION_READY flip)`
        },
        {
          inventoryOk: false,
          ceilingHoldOk: false,
          honestyOk: observeEval.honestyOk,
          observedSurfaces,
          observedSurfaceCodes,
          refuseCodes: observeEval.refuseCodes.length
            ? observeEval.refuseCodes
            : [DF_REFUSE_CODES.INVENTORY_NOT_OK],
          observe,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? DF_CODES.GOVERN_PASS : DF_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `complexity-inventory-remeasure govern ${decision}: changeId=${changeId} remeasureMode=${remeasureMode} phase=${phase} planId=${planId}`,
      `freeze soft-observe: pin=${DF_FREEZE_PIN_SHORT} readOnly=true (≠ tip-pin rewrite)`,
      'NON-CLAIM: remeasure PASS ≠ delete auth ≠ mass prune ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L30 auto-close ≠ L29 reopen',
      'A5_PRESERVE_FUNDACION_ALWAYS_DENY + A6_PRESERVE_HUMAN_PROD_GATE held',
      'A7_REFUSE_TIP_PIN_REWRITE + A8_REFUSE_L29_REOPEN + A9_REFUSE_GHE_CLAIM + A10_REFUSE_AUTO_CLOSE_L30 + A11_REFUSE_DELETE_AUTH + A12_REFUSE_PRODUCTION_READY_FLIP + A13_REFUSE_MASS_PRUNE + A14_HOLD_SCHEMAS_AT_CEILING held',
      `freeze pin ${DF_FREEZE_PIN_SHORT} (L30 audit #413 soft-observe; no tip-refresh / no tip-pin rewrite from this package)`,
      'inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A); schemas AT_CEILING 35/35'
    ];

    const inventoryDigest =
      planDigest ||
      this.hashFn({
        changeId,
        remeasureMode,
        phase,
        observedSurfaces,
        refuseCodes: observeEval.refuseCodes,
        decision,
        freezeObserve: {
          pinShort: DF_FREEZE_PIN_SHORT,
          readOnly: true,
          deleteAuthRefused: true
        },
        ceilingHold: {
          schemasAtCeiling: true,
          slimHold: true
        }
      });

    const inventoryPlanDigest = this.hashFn({
      planId,
      changeId,
      inventoryDigest,
      remeasureMode,
      phase,
      decision,
      observeEval,
      observedSurfaceCodes
    });

    const record = Object.freeze({
      planId,
      changeId,
      inventoryDigest,
      remeasureMode,
      phase,
      decision,
      inventoryOk: observeEval.inventoryOk || gateObserveOk,
      ceilingHoldOk: observeEval.ceilingHoldOk || gateObserveOk,
      honestyOk: observeEval.honestyOk,
      observedSurfaces: Object.freeze([...observedSurfaces]),
      observedSurfaceCodes: Object.freeze([...observedSurfaceCodes]),
      refuseCodes: Object.freeze([...observeEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      inventoryPlanDigest,
      governedAt: new Date().toISOString()
    });
    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      remeasureMode,
      aggregationMode: remeasureMode,
      honestyMode: remeasureMode,
      phase,
      inventoryDigest,
      observedSurfaces,
      requiredObserveSet: [...DF_REQUIRED_OBSERVE_SURFACES],
      inventoryOk: record.inventoryOk,
      ceilingHoldOk: record.ceilingHoldOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      humanGateHeld: false,
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
      inventoryPlanDigest,
      meta: {
        code,
        reasons,
        freezePin: DF_FREEZE_PIN_SHORT,
        freezePinFull: DF_FREEZE_PIN,
        schemasAtCeiling: true,
        inventorySource: this._resolvedInventory?.source || 'snapshot',
        observedSurfaceCodes,
        safeAutomationIds: [...DF_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      remeasureMode,
      aggregationMode: remeasureMode,
      honestyMode: remeasureMode,
      ritualMode: remeasureMode,
      phase,
      inventoryDigest,
      observabilityDigest: inventoryDigest,
      honestyDigest: inventoryDigest,
      inventoryPlanDigest,
      observabilityPlanDigest: inventoryPlanDigest,
      honestyPlanDigest: inventoryPlanDigest,
      observedSurfaces,
      observedSurfaceCodes,
      observedPorts: observedSurfaces,
      observedPortCodes: observedSurfaceCodes,
      inventoryOk: record.inventoryOk,
      ceilingHoldOk: record.ceilingHoldOk,
      honestyOk: record.honestyOk,
      freezeObserve,
      ceilingHold,
      refuseCodes: observeEval.refuseCodes,
      nonClaimChips,
      pendingPorts,
      reasons,
      receipt,
      observe,
      safeAutomationIds: [...DF_SAFE_AUTOMATION_IDS]
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
      const verifyRes = verifyComplexityInventoryRemeasureReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: DF_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: DF_CODES.TRAIL_BREAK,
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
      code: DF_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  DF_PORT_PRODUCTION_READY,
  DF_PORT_KIND,
  DF_PRODUCTION_READY,
  DF_RECEIPT_KIND,
  DF_CODES,
  DF_SAFE_AUTOMATION_IDS,
  DF_REFUSE_CODES,
  DF_FREEZE_PIN,
  DF_FREEZE_PIN_SHORT,
  DF_DEFAULT_OBSERVE_SURFACES,
  DF_CEILING_SURFACE_FIXTURES,
  DF_FREEZE_NONCLAIM_LABELS,
  DF_FREEZE_OBSERVE_TEMPLATE,
  DF_CEILING_HOLD_TEMPLATE,
  softImportCeilingSurfaces,
  softComposeCeilingSurfaces,
  softObserveFreezeNonClaims,
  builtinComplexityInventoryDouble,
  evaluateObserveOk,
  decisionForRemeasure,
  decisionForAggregation,
  decisionForHonesty,
  decisionForRitual,
  ComplexityInventoryRemeasurePort
};
