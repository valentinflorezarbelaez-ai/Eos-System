/**
 * @module control-plane-observability-aggregation-port
 * SPEC-0110 / Mission DA — Control-Plane Observability Aggregation Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic Control-Plane Observability Aggregation Port:
 *   - Validates plan via policy gate
 *   - Soft-observes freeze NON-CLAIM labels/fixtures (read-only; do NOT rewrite tip pins)
 *   - Soft-imports CV/CW/CX/CY honesty when present (compose) else builtin fixture double
 *   - Aggregates observe labels / honesty signals across L28 CV–CY (+ optional CQ–CT)
 *   - aggregationMode / honestyMode / ritualMode: ACTIVE | HOLD
 *   - Decision: PASS | DENY | HOLD
 *   - Seals DA-RCPT-* receipts with forced freeze soft-observe (pin 2d6ab2d2)
 *   - Explicit honesty: aggregation PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate
 *
 * NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 * ≠ GHE / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM.
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DA_PRODUCTION_READY,
  DA_RECEIPT_KIND,
  DA_FREEZE_PIN,
  DA_FREEZE_PIN_SHORT,
  DA_REQUIRED_OBSERVE_PORTS,
  DA_FREEZE_NONCLAIM_LABELS,
  DA_FREEZE_OBSERVE_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  buildControlPlaneObservabilityAggregationReceipt,
  verifyControlPlaneObservabilityAggregationReceipt
} from './control-plane-observability-aggregation-receipt.js';

import {
  ControlPlaneObservabilityAggregationPolicyGate,
  DA_CODES,
  evaluateRequiredObserveSet
} from './control-plane-observability-aggregation-policy-gate.js';

/** @type {'NO'} */
export const DA_PORT_PRODUCTION_READY = 'NO';
export const DA_PORT_KIND = 'eos-control-plane-observability-aggregation-port';
export {
  DA_FREEZE_PIN,
  DA_FREEZE_PIN_SHORT,
  DA_FREEZE_NONCLAIM_LABELS,
  DA_FREEZE_OBSERVE_TEMPLATE
};

export const DA_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_AGGREGATION_PROBE',
  'A2_FREEZE_NONCLAIM_OBSERVE_PROBE',
  'A3_CV_CW_CX_CY_SOFT_IMPORT_PROBE',
  'A4_NON_CLAIM_CHIP_PROBE',
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L28_REOPEN',
  'A9_REFUSE_GHE_CLAIM',
  'A10_REFUSE_AUTO_CLOSE_L29',
  'A11_REFUSE_EXTERNAL_APM',
  'A12_REFUSE_PRODUCTION_READY_FLIP'
]);

export const DA_REFUSE_CODES = Object.freeze({
  MISSING_REQUIRED_OBSERVE_LABELS: 'MISSING_REQUIRED_OBSERVE_LABELS',
  AGGREGATION_NOT_OK: 'AGGREGATION_NOT_OK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L28_REOPEN_REFUSED: 'L28_REOPEN_REFUSED',
  TIP_PIN_REWRITE_REFUSED: 'TIP_PIN_REWRITE_REFUSED',
  GHE_CLAIM_REFUSED: 'GHE_CLAIM_REFUSED',
  AUTO_CLOSE_L29_REFUSED: 'AUTO_CLOSE_L29_REFUSED',
  EXTERNAL_APM_REFUSED: 'EXTERNAL_APM_REFUSED'
});

export const DA_DEFAULT_OBSERVE_LABELS = Object.freeze([
  'CV:honesty-observe',
  'CW:continuity-observe',
  'CX:local-verify-observe',
  'CY:control-plane-honesty-observe',
  'CQ:billing-blocked-observe',
  'CR:observe',
  'CS:observe',
  'CT:observe'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import CV/CW/CX/CY honesty when co-located (compose; don't fork).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportCvCwCxCyHonesty(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'hud-doctor-honesty-ritual-port.js'),
    path.join(__dirname, 'cross-port-continuity-orchestration-port.js'),
    path.join(__dirname, 'billing-blocked-local-verify-ritual-port.js'),
    path.join(__dirname, 'mission-os-control-plane-honesty-port.js'),
    path.resolve(
      '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    ),
    path.resolve(
      '/workspace/eos-mission-cw/src/core/composition/cross-port-continuity-orchestration-port.js'
    ),
    path.resolve(
      '/workspace/eos-mission-cx/src/core/composition/billing-blocked-local-verify-ritual-port.js'
    ),
    path.resolve(
      '/workspace/eos-mission-cy/src/core/composition/mission-os-control-plane-honesty-port.js'
    )
  );
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      if (typeof mod.builtinHonestyDouble === 'function') {
        return {
          buildHonestySurface: mod.builtinHonestyDouble,
          HONESTY_PRODUCTION_READY: 'NO',
          source: 'soft-import',
          path: candidate
        };
      }
      if (typeof mod.builtinContinuityHonestyDouble === 'function') {
        return {
          buildHonestySurface: mod.builtinContinuityHonestyDouble,
          HONESTY_PRODUCTION_READY: 'NO',
          source: 'soft-import',
          path: candidate
        };
      }
      if (typeof mod.builtinLocalVerifyHonestyDouble === 'function') {
        return {
          buildHonestySurface: mod.builtinLocalVerifyHonestyDouble,
          HONESTY_PRODUCTION_READY: 'NO',
          source: 'soft-import',
          path: candidate
        };
      }
      if (typeof mod.builtinResidualHonestyDouble === 'function') {
        return {
          buildHonestySurface: mod.builtinResidualHonestyDouble,
          HONESTY_PRODUCTION_READY: 'NO',
          source: 'soft-import',
          path: candidate
        };
      }
      if (typeof mod.buildHonestySurface === 'function') {
        return {
          buildHonestySurface: mod.buildHonestySurface,
          HONESTY_PRODUCTION_READY: mod.HONESTY_PRODUCTION_READY || 'NO',
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

/**
 * Soft-compose CV/CW/CX/CY (+ optional CQ/CR/CS/CT) observe labels (fixtures when absent).
 * @param {string[]} [requested]
 * @returns {{ labels: string[], source: string }}
 */
export function softComposeObserveLabels(requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return { labels: requested.map(String), source: 'plan' };
  }
  return { labels: [...DA_DEFAULT_OBSERVE_LABELS], source: 'fixture-default' };
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
      : [...DA_FREEZE_NONCLAIM_LABELS]
  });
}

/**
 * Builtin observability aggregation double for hermetic PASS|DENY|HOLD.
 * @param {object} input
 * @returns {object}
 */
export function builtinObservabilityAggregationDouble(input = {}) {
  const observedPorts = Array.isArray(input.observedPorts)
    ? input.observedPorts.map(String)
    : [...DA_DEFAULT_OBSERVE_LABELS];
  const codes = observedPorts
    .map((p) => String(p).trim().toUpperCase().split(/[:|/.\\s_-]/)[0])
    .filter(Boolean);
  const observe = evaluateRequiredObserveSet(codes);
  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map(String)
    : ['DB pending', 'DC pending', 'DD pending', 'DE pending'];
  const freezeObserve = softObserveFreezeNonClaims(input);

  const non_claim_chips = [
    'NON-CLAIM: Control-Plane Observability Aggregation ≠ PRODUCTION_READY flip',
    'NON-CLAIM: aggregation ≠ tip-pin rewrite (freeze soft-observe 2d6ab2d2 only)',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L29 auto-close / ≠ L28 reopen',
    'NON-CLAIM: ≠ GHE / ≠ external APM',
    'NON-CLAIM: freeze NON-CLAIM surfaces observed as labels only — no tip rewrite'
  ];
  if (!observe.ok) {
    non_claim_chips.push(
      `NON-CLAIM chip: missing required observe (${observe.missing.join(',')}) — not closed by labels alone`
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by aggregation port`
    );
  }

  return {
    schema: 'eos.control-plane-observability-aggregation-observe.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    freeze_pin: DA_FREEZE_PIN,
    freeze_pin_short: DA_FREEZE_PIN_SHORT,
    freeze_observe: freezeObserve,
    observe: {
      ok: observe.ok,
      missing: observe.missing,
      observed: codes
    },
    honesty: { ok: input.honestyOk !== false },
    aggregation: {
      ok: input.aggregationOk !== false && observe.ok
    },
    residual_honesty: {
      ok: input.residualHonestyOk !== false && observe.ok
    },
    pending_ports: pendingPorts,
    non_claim_chips,
    observe_note:
      'Mission DA builtin observability-aggregation double — CV+CW+CX+CY required observe; freeze NON-CLAIM soft-observe read-only; L17–L28 CLOSED retained; L29 axis open after tip-open; ≠ tip-pin rewrite ≠ L29 auto-close',
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
  const aggregationOk = surface?.aggregation?.ok !== false;
  const residualHonestyOk = surface?.residual_honesty?.ok !== false;
  const ackMissing = acks.ackMissingObserveLabels === true;

  if (!observeOk && !ackMissing) {
    refuses.push(DA_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS);
  }
  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(DA_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }
  if (
    surface?.freeze_observe?.readOnly === false ||
    (surface?.freeze_observe?.pin != null &&
      String(surface.freeze_observe.pin) !== DA_FREEZE_PIN &&
      String(surface.freeze_observe.pin) !== DA_FREEZE_PIN_SHORT &&
      !String(surface.freeze_observe.pin).startsWith(DA_FREEZE_PIN_SHORT))
  ) {
    refuses.push(DA_REFUSE_CODES.TIP_PIN_REWRITE_REFUSED);
  }
  if (!honestyOk) refuses.push(DA_REFUSE_CODES.HONESTY_NOT_OK);
  if (!aggregationOk && observeOk) {
    refuses.push(DA_REFUSE_CODES.AGGREGATION_NOT_OK);
  }
  if (!residualHonestyOk && observeOk && aggregationOk) {
    refuses.push(DA_REFUSE_CODES.AGGREGATION_NOT_OK);
  }
  return {
    ok: refuses.length === 0,
    refuseCodes: refuses,
    observeOk,
    honestyOk,
    aggregationOk,
    residualHonestyOk,
    primaryRefuse: refuses.length ? refuses[0] : null
  };
}

/**
 * Map aggregationMode + observe eval → decision.
 * @param {string} aggregationMode
 * @param {{ ok: boolean }|null} observeEval
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForAggregation(aggregationMode, observeEval) {
  if (aggregationMode === 'HOLD') return 'HOLD';
  if (observeEval && observeEval.ok === true) return 'PASS';
  return 'DENY';
}
/** Aliases for CY/CX API compatibility. */
export const decisionForHonesty = decisionForAggregation;
export const decisionForRitual = decisionForAggregation;

/**
 * Control-Plane Observability Aggregation Port — hermetic.
 */
export class ControlPlaneObservabilityAggregationPort {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new ControlPlaneObservabilityAggregationPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });
    this._injectedHonesty = options.honesty || null;
    this._honestyModulePath = options.honestyModulePath || null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    this._resolvedHonesty = null;
    /** @type {Map<string, object>} */
    this.decisions = new Map();
    /** @type {Array<object>} */
    this.receipts = [];
    this._lastReceiptHash = null;
    this._governSeq = 0;
  }

  async resolveHonesty() {
    if (this._injectedHonesty?.buildHonestySurface) {
      this._resolvedHonesty = {
        ...this._injectedHonesty,
        HONESTY_PRODUCTION_READY:
          this._injectedHonesty.HONESTY_PRODUCTION_READY || 'NO',
        source: 'injected'
      };
      return this._resolvedHonesty;
    }
    if (this._preferBuiltinDouble) {
      this._resolvedHonesty = {
        buildHonestySurface: builtinObservabilityAggregationDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedHonesty;
    }
    if (!this._resolvedHonesty) {
      const soft = await softImportCvCwCxCyHonesty(this._honestyModulePath);
      this._resolvedHonesty = soft || {
        buildHonestySurface: builtinObservabilityAggregationDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
    }
    return this._resolvedHonesty;
  }

  _sealReceipt(fields) {
    const receipt = buildControlPlaneObservabilityAggregationReceipt(
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
    const observedPorts = extra.observedPorts || [];
    const freezeObserve = forceFreezeObserve(plan?.freezeObserve || {});
    const mode =
      plan?.aggregationMode != null
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
      aggregationMode: mode,
      honestyMode: mode,
      phase: plan?.phase != null ? String(plan.phase) : null,
      observabilityDigest:
        plan?.observabilityDigest != null &&
        String(plan.observabilityDigest).trim() !== ''
          ? String(plan.observabilityDigest)
          : plan?.honestyDigest != null &&
              String(plan.honestyDigest).trim() !== ''
            ? String(plan.honestyDigest)
            : this.hashFn({ deny: true, planId: plan?.planId || null }),
      observedPorts,
      aggregationOk: extra.aggregationOk ?? false,
      residualHonestyOk: extra.residualHonestyOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL29Refused: extra.autoCloseL29Refused === true,
      l28ReopenRefused: extra.l28ReopenRefused === true,
      freezeObserve,
      reasons,
      meta: {
        code: evaluation.code,
        reason: evaluation.reason,
        freezePin: DA_FREEZE_PIN_SHORT
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      aggregationMode: mode || undefined,
      honestyMode: mode || undefined,
      ritualMode: mode || undefined,
      observedPorts,
      observedPortCodes: extra.observedPortCodes || [],
      aggregationOk: extra.aggregationOk ?? false,
      residualHonestyOk: extra.residualHonestyOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      freezeObserve,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL29Refused: extra.autoCloseL29Refused === true,
      l28ReopenRefused: extra.l28ReopenRefused === true,
      reasons,
      receipt,
      observe: extra.observe || null,
      safeAutomationIds: [...DA_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern an observability aggregation plan → PASS | DENY | HOLD + DA-RCPT-*.
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal =
        evaluation.code === DA_CODES.AUTO_SEAL_CLAIM_DENY ||
        evaluation.code === DA_CODES.AUTO_SEAL_L29_CLAIM_DENY ||
        evaluation.code === DA_CODES.AUTO_CLOSE_L29_CLAIM_DENY;
      const autoProd =
        evaluation.code === DA_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === DA_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      const tipPin =
        evaluation.code === DA_CODES.TIP_PIN_REWRITE_CLAIM_DENY ||
        evaluation.code === DA_CODES.TIP_REWRITE_CLAIM_DENY;
      const ghe = evaluation.code === DA_CODES.GHE_CLAIM_DENY;
      const l28 = evaluation.code === DA_CODES.L28_REOPEN_CLAIM_DENY;
      const apm = evaluation.code === DA_CODES.EXTERNAL_APM_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        tipPinRewriteRefused: tipPin,
        gheClaimRefused: ghe,
        autoCloseL29Refused:
          evaluation.code === DA_CODES.AUTO_CLOSE_L29_CLAIM_DENY ||
          evaluation.code === DA_CODES.AUTO_SEAL_L29_CLAIM_DENY,
        l28ReopenRefused: l28,
        humanGateHeld: autoSeal || autoProd,
        refuseCodes: [evaluation.code],
        observedPorts: Array.isArray(plan?.observedPorts)
          ? plan.observedPorts.map(String)
          : []
      });
    }

    this._governSeq += 1;
    const {
      planId,
      changeId,
      aggregationMode,
      phase,
      observabilityDigest: planDigest,
      observedPorts,
      observedPortCodes,
      observeOk: gateObserveOk,
      ackMissingObserveLabels,
      honestyOk: gateHonestyOk,
      aggregationOk: gateAggregationOk,
      residualHonestyOk: gateResidualOk,
      reasons: planReasons
    } = evaluation;

    let observe = null;
    if (
      aggregationMode === 'HOLD' &&
      (!observedPorts || observedPorts.length === 0)
    ) {
      const freezeObserve = softObserveFreezeNonClaims(plan || {});
      observe = {
        schema: 'eos.control-plane-observability-aggregation-observe.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        freeze_pin: DA_FREEZE_PIN,
        freeze_observe: freezeObserve,
        observe: { ok: true, missing: [], observed: [] },
        honesty: { ok: true },
        aggregation: { ok: true },
        residual_honesty: { ok: true },
        pending_ports: ['DB pending', 'DC pending', 'DD pending', 'DE pending'],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L29 auto-close / ≠ L28 reopen',
          'NON-CLAIM: HOLD observe ≠ tip-pin rewrite (freeze soft-observe only)'
        ],
        note: 'HOLD observe — Control-Plane Observability Aggregation; ≠ automatic closure; ≠ tip-pin rewrite'
      };
    } else {
      const runner = await this.resolveHonesty();
      observe = runner.buildHonestySurface({
        observedPorts,
        honestyOk: gateHonestyOk !== false,
        aggregationOk: gateAggregationOk !== false,
        residualHonestyOk: gateResidualOk !== false,
        pendingPorts: ['DB pending', 'DC pending', 'DD pending', 'DE pending'],
        surface: 'control-plane-observability-aggregation',
        freezeObserve: plan?.freezeObserve
      });
      observe = {
        ...observe,
        PRODUCTION_READY: 'NO',
        freeze_pin: DA_FREEZE_PIN,
        freeze_observe: softObserveFreezeNonClaims({
          freezeObserve: {
            ...(observe.freeze_observe || {}),
            ...(plan?.freezeObserve || {})
          }
        })
      };
      if (!observe.observe || typeof observe.observe !== 'object') {
        observe = {
          ...observe,
          observe: {
            ok: gateObserveOk === true,
            missing: DA_REQUIRED_OBSERVE_PORTS.filter(
              (c) => !(observedPortCodes || []).includes(c)
            ),
            observed: [...(observedPortCodes || [])]
          },
          honesty: observe.honesty || { ok: gateHonestyOk !== false },
          aggregation: observe.aggregation || {
            ok: gateObserveOk === true && gateAggregationOk !== false
          },
          residual_honesty: observe.residual_honesty || {
            ok: gateObserveOk === true && gateResidualOk !== false
          }
        };
      }
      // Ensure aggregation field exists even when soft-import returns CY residual shape
      if (!observe.aggregation) {
        observe = {
          ...observe,
          aggregation: {
            ok:
              observe.residual_honesty?.ok !== false &&
              observe.observe?.ok === true
          }
        };
      }
    }

    const observeEval = evaluateObserveOk(observe, {
      ackMissingObserveLabels
    });

    // ACTIVE with incomplete required CV+CW+CX+CY observe cannot PASS even with gate ack
    let decision = decisionForAggregation(aggregationMode, observeEval);
    if (aggregationMode === 'ACTIVE' && !gateObserveOk && decision === 'PASS') {
      decision = 'DENY';
      observeEval.ok = false;
      if (
        !observeEval.refuseCodes.includes(
          DA_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        )
      ) {
        observeEval.refuseCodes.push(
          DA_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        );
      }
      observeEval.primaryRefuse =
        DA_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS;
    }

    const nonClaimChips = Array.isArray(observe?.non_claim_chips)
      ? observe.non_claim_chips.map(String)
      : [];
    const pendingPorts = Array.isArray(observe?.pending_ports)
      ? observe.pending_ports.map(String)
      : [];
    const freezeObserve = forceFreezeObserve(plan?.freezeObserve || {});

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: DA_CODES.AGGREGATION_REFUSE_DENY,
          reason: `Observability aggregation/observe refused: ${observeEval.primaryRefuse || 'unknown'} (≠ PRODUCTION_READY flip / ≠ tip-pin rewrite)`
        },
        {
          aggregationOk: false,
          residualHonestyOk: false,
          honestyOk: observeEval.honestyOk,
          observedPorts,
          observedPortCodes,
          refuseCodes: observeEval.refuseCodes.length
            ? observeEval.refuseCodes
            : [DA_REFUSE_CODES.AGGREGATION_NOT_OK],
          observe,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? DA_CODES.GOVERN_PASS : DA_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `control-plane-observability-aggregation govern ${decision}: changeId=${changeId} aggregationMode=${aggregationMode} phase=${phase} planId=${planId}`,
      `freeze soft-observe: pin=${DA_FREEZE_PIN_SHORT} readOnly=true (≠ tip-pin rewrite)`,
      'NON-CLAIM: aggregation PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L29 auto-close ≠ L28 reopen ≠ external APM',
      'A5_PRESERVE_FUNDACION_ALWAYS_DENY + A6_PRESERVE_HUMAN_PROD_GATE held',
      'A7_REFUSE_TIP_PIN_REWRITE + A8_REFUSE_L28_REOPEN + A9_REFUSE_GHE_CLAIM + A10_REFUSE_AUTO_CLOSE_L29 + A11_REFUSE_EXTERNAL_APM + A12_REFUSE_PRODUCTION_READY_FLIP held',
      `freeze pin ${DA_FREEZE_PIN_SHORT} (L29 audit #401 soft-observe; no tip-refresh / no tip-pin rewrite from this package)`
    ];

    const observabilityDigest =
      planDigest ||
      this.hashFn({
        changeId,
        aggregationMode,
        phase,
        observedPorts,
        refuseCodes: observeEval.refuseCodes,
        decision,
        freezeObserve: {
          pinShort: DA_FREEZE_PIN_SHORT,
          readOnly: true
        }
      });

    const observabilityPlanDigest = this.hashFn({
      planId,
      changeId,
      observabilityDigest,
      aggregationMode,
      phase,
      decision,
      observeEval,
      observedPortCodes
    });

    const record = Object.freeze({
      planId,
      changeId,
      observabilityDigest,
      aggregationMode,
      phase,
      decision,
      aggregationOk: observeEval.aggregationOk || gateObserveOk,
      residualHonestyOk: observeEval.residualHonestyOk || gateObserveOk,
      honestyOk: observeEval.honestyOk,
      observedPorts: Object.freeze([...observedPorts]),
      observedPortCodes: Object.freeze([...observedPortCodes]),
      refuseCodes: Object.freeze([...observeEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      observabilityPlanDigest,
      governedAt: new Date().toISOString()
    });
    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      aggregationMode,
      honestyMode: aggregationMode,
      phase,
      observabilityDigest,
      observedPorts,
      requiredObserveSet: [...DA_REQUIRED_OBSERVE_PORTS],
      aggregationOk: record.aggregationOk,
      residualHonestyOk: record.residualHonestyOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      humanGateHeld: false,
      autoSealRefused: false,
      autoProductionFlipRefused: false,
      tipPinRewriteRefused: false,
      gheClaimRefused: false,
      autoCloseL29Refused: false,
      l28ReopenRefused: false,
      freezeObserve,
      reasons,
      observabilityPlanDigest,
      meta: {
        code,
        reasons,
        freezePin: DA_FREEZE_PIN_SHORT,
        freezePinFull: DA_FREEZE_PIN,
        honestySource: this._resolvedHonesty?.source || 'snapshot',
        observedPortCodes,
        safeAutomationIds: [...DA_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      aggregationMode,
      honestyMode: aggregationMode,
      ritualMode: aggregationMode,
      phase,
      observabilityDigest,
      honestyDigest: observabilityDigest,
      observabilityPlanDigest,
      honestyPlanDigest: observabilityPlanDigest,
      observedPorts,
      observedPortCodes,
      aggregationOk: record.aggregationOk,
      residualHonestyOk: record.residualHonestyOk,
      honestyOk: record.honestyOk,
      freezeObserve,
      refuseCodes: observeEval.refuseCodes,
      nonClaimChips,
      pendingPorts,
      reasons,
      receipt,
      observe,
      safeAutomationIds: [...DA_SAFE_AUTOMATION_IDS]
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
      const verifyRes = verifyControlPlaneObservabilityAggregationReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: DA_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: DA_CODES.TRAIL_BREAK,
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
      code: DA_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  DA_PORT_PRODUCTION_READY,
  DA_PORT_KIND,
  DA_PRODUCTION_READY,
  DA_RECEIPT_KIND,
  DA_CODES,
  DA_SAFE_AUTOMATION_IDS,
  DA_REFUSE_CODES,
  DA_FREEZE_PIN,
  DA_FREEZE_PIN_SHORT,
  DA_DEFAULT_OBSERVE_LABELS,
  DA_FREEZE_NONCLAIM_LABELS,
  DA_FREEZE_OBSERVE_TEMPLATE,
  softImportCvCwCxCyHonesty,
  softComposeObserveLabels,
  softObserveFreezeNonClaims,
  builtinObservabilityAggregationDouble,
  evaluateObserveOk,
  decisionForAggregation,
  decisionForHonesty,
  decisionForRitual,
  ControlPlaneObservabilityAggregationPort
};
