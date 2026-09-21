/**
 * @module mission-os-control-plane-honesty-port
 * SPEC-0108 / Mission CY — Mission OS / Control-Plane L0 Residual Honesty Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic Mission OS / Control-Plane L0 Residual Honesty Port:
 *   - Validates plan via policy gate
 *   - Soft-observes freeze NON-CLAIM labels/fixtures (read-only; do NOT rewrite tip pins)
 *   - Soft-imports CV/CW/CX honesty when present (compose) else builtin fixture double
 *   - honestyMode / ritualMode: ACTIVE | HOLD
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CY-RCPT-* receipts with forced freeze soft-observe (pin 487a38bf)
 *   - Explicit honesty: residual honesty PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate
 *
 * NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 * ≠ GHE / ≠ L28 auto-close / ≠ CZ start / ≠ L27 reopen.
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CY_PRODUCTION_READY,
  CY_RECEIPT_KIND,
  CY_FREEZE_PIN,
  CY_FREEZE_PIN_SHORT,
  CY_REQUIRED_OBSERVE_PORTS,
  CY_FREEZE_NONCLAIM_LABELS,
  CY_FREEZE_OBSERVE_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  buildMissionOsControlPlaneHonestyReceipt,
  verifyMissionOsControlPlaneHonestyReceipt
} from './mission-os-control-plane-honesty-receipt.js';

import {
  MissionOsControlPlaneHonestyPolicyGate,
  CY_CODES,
  evaluateRequiredObserveSet
} from './mission-os-control-plane-honesty-policy-gate.js';

/** @type {'NO'} */
export const CY_PORT_PRODUCTION_READY = 'NO';
export const CY_PORT_KIND = 'eos-mission-os-control-plane-honesty-port';
export {
  CY_FREEZE_PIN,
  CY_FREEZE_PIN_SHORT,
  CY_FREEZE_NONCLAIM_LABELS,
  CY_FREEZE_OBSERVE_TEMPLATE
};

export const CY_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_HONESTY_PROBE',
  'A2_FREEZE_NONCLAIM_OBSERVE_PROBE',
  'A3_CV_CW_CX_SOFT_IMPORT_PROBE',
  'A4_NON_CLAIM_CHIP_PROBE',
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L27_REOPEN',
  'A9_REFUSE_GHE_CLAIM',
  'A10_REFUSE_AUTO_CLOSE_L28',
  'A11_REFUSE_CZ_START',
  'A12_REFUSE_PRODUCTION_READY_FLIP'
]);

export const CY_REFUSE_CODES = Object.freeze({
  MISSING_REQUIRED_OBSERVE_LABELS: 'MISSING_REQUIRED_OBSERVE_LABELS',
  RESIDUAL_HONESTY_NOT_OK: 'RESIDUAL_HONESTY_NOT_OK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L27_REOPEN_REFUSED: 'L27_REOPEN_REFUSED',
  TIP_PIN_REWRITE_REFUSED: 'TIP_PIN_REWRITE_REFUSED',
  GHE_CLAIM_REFUSED: 'GHE_CLAIM_REFUSED',
  AUTO_CLOSE_L28_REFUSED: 'AUTO_CLOSE_L28_REFUSED',
  CZ_START_REFUSED: 'CZ_START_REFUSED'
});

export const CY_DEFAULT_OBSERVE_LABELS = Object.freeze([
  'CV:honesty-observe',
  'CW:continuity-observe',
  'CX:local-verify-observe',
  'CQ:billing-blocked-observe',
  'CR:observe',
  'CS:observe',
  'CT:observe'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import CV/CW/CX honesty when co-located (compose; don't fork).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportCvCwCxHonesty(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'hud-doctor-honesty-ritual-port.js'),
    path.join(__dirname, 'cross-port-continuity-orchestration-port.js'),
    path.join(__dirname, 'billing-blocked-local-verify-ritual-port.js'),
    path.resolve(
      '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    ),
    path.resolve(
      '/workspace/eos-mission-cw/src/core/composition/cross-port-continuity-orchestration-port.js'
    ),
    path.resolve(
      '/workspace/eos-mission-cx/src/core/composition/billing-blocked-local-verify-ritual-port.js'
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
 * Soft-compose CV/CW/CX (+ optional CQ/CR/CS/CT) observe labels (fixtures when absent).
 * @param {string[]} [requested]
 * @returns {{ labels: string[], source: string }}
 */
export function softComposeObserveLabels(requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return { labels: requested.map(String), source: 'plan' };
  }
  return { labels: [...CY_DEFAULT_OBSERVE_LABELS], source: 'fixture-default' };
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
      : [...CY_FREEZE_NONCLAIM_LABELS]
  });
}

/**
 * Builtin residual honesty double for hermetic PASS|DENY|HOLD.
 * @param {object} input
 * @returns {object}
 */
export function builtinResidualHonestyDouble(input = {}) {
  const observedPorts = Array.isArray(input.observedPorts)
    ? input.observedPorts.map(String)
    : [...CY_DEFAULT_OBSERVE_LABELS];
  const codes = observedPorts
    .map((p) => String(p).trim().toUpperCase().split(/[:|/.\\s_-]/)[0])
    .filter(Boolean);
  const observe = evaluateRequiredObserveSet(codes);
  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map(String)
    : ['CZ pending'];
  const freezeObserve = softObserveFreezeNonClaims(input);

  const non_claim_chips = [
    'NON-CLAIM: Mission OS control-plane residual honesty ≠ PRODUCTION_READY flip',
    'NON-CLAIM: residual honesty ≠ tip-pin rewrite (freeze soft-observe 487a38bf only)',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L28 auto-close / ≠ CZ start',
    'NON-CLAIM: ≠ GHE / ≠ L27 reopen',
    'NON-CLAIM: freeze NON-CLAIM surfaces observed as labels only — no tip rewrite'
  ];
  if (!observe.ok) {
    non_claim_chips.push(
      `NON-CLAIM chip: missing required observe (${observe.missing.join(',')}) — not closed by labels alone`
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by honesty port`
    );
  }

  return {
    schema: 'eos.mission-os-control-plane-honesty-observe.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    freeze_pin: CY_FREEZE_PIN,
    freeze_pin_short: CY_FREEZE_PIN_SHORT,
    freeze_observe: freezeObserve,
    observe: {
      ok: observe.ok,
      missing: observe.missing,
      observed: codes
    },
    honesty: { ok: input.honestyOk !== false },
    residual_honesty: {
      ok: input.residualHonestyOk !== false && observe.ok
    },
    pending_ports: pendingPorts,
    non_claim_chips,
    observe_note:
      'Mission CY builtin residual-honesty double — CV+CW+CX required observe; freeze NON-CLAIM soft-observe read-only; L17–L27 CLOSED retained; L28 OPEN; ≠ tip-pin rewrite ≠ CZ start',
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
  const residualHonestyOk = surface?.residual_honesty?.ok !== false;
  const ackMissing = acks.ackMissingObserveLabels === true;

  if (!observeOk && !ackMissing) {
    refuses.push(CY_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS);
  }
  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(CY_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }
  if (
    surface?.freeze_observe?.readOnly === false ||
    (surface?.freeze_observe?.pin != null &&
      String(surface.freeze_observe.pin) !== CY_FREEZE_PIN &&
      String(surface.freeze_observe.pin) !== CY_FREEZE_PIN_SHORT)
  ) {
    refuses.push(CY_REFUSE_CODES.TIP_PIN_REWRITE_REFUSED);
  }
  if (!honestyOk) refuses.push(CY_REFUSE_CODES.HONESTY_NOT_OK);
  if (!residualHonestyOk && observeOk) {
    refuses.push(CY_REFUSE_CODES.RESIDUAL_HONESTY_NOT_OK);
  }
  return {
    ok: refuses.length === 0,
    refuseCodes: refuses,
    observeOk,
    honestyOk,
    residualHonestyOk,
    primaryRefuse: refuses.length ? refuses[0] : null
  };
}

/**
 * Map honestyMode + observe eval → decision.
 * @param {string} honestyMode
 * @param {{ ok: boolean }|null} observeEval
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForHonesty(honestyMode, observeEval) {
  if (honestyMode === 'HOLD') return 'HOLD';
  if (observeEval && observeEval.ok === true) return 'PASS';
  return 'DENY';
}
/** Alias for CW/CX API compatibility. */
export const decisionForRitual = decisionForHonesty;

/**
 * Mission OS / Control-Plane L0 Residual Honesty Port — hermetic.
 */
export class MissionOsControlPlaneHonestyPort {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new MissionOsControlPlaneHonestyPolicyGate({
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
        buildHonestySurface: builtinResidualHonestyDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedHonesty;
    }
    if (!this._resolvedHonesty) {
      const soft = await softImportCvCwCxHonesty(this._honestyModulePath);
      this._resolvedHonesty = soft || {
        buildHonestySurface: builtinResidualHonestyDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
    }
    return this._resolvedHonesty;
  }

  _sealReceipt(fields) {
    const receipt = buildMissionOsControlPlaneHonestyReceipt(
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
      plan?.honestyMode != null
        ? String(plan.honestyMode)
        : plan?.ritualMode != null
          ? String(plan.ritualMode)
          : null;
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      changeId: plan?.changeId != null ? String(plan.changeId) : null,
      decision: 'DENY',
      honestyMode: mode,
      phase: plan?.phase != null ? String(plan.phase) : null,
      honestyDigest:
        plan?.honestyDigest != null && String(plan.honestyDigest).trim() !== ''
          ? String(plan.honestyDigest)
          : plan?.ritualDigest != null && String(plan.ritualDigest).trim() !== ''
            ? String(plan.ritualDigest)
            : this.hashFn({ deny: true, planId: plan?.planId || null }),
      observedPorts,
      residualHonestyOk: extra.residualHonestyOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL28Refused: extra.autoCloseL28Refused === true,
      startCzRefused: extra.startCzRefused === true,
      freezeObserve,
      reasons,
      meta: {
        code: evaluation.code,
        reason: evaluation.reason,
        freezePin: CY_FREEZE_PIN_SHORT
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      honestyMode: mode || undefined,
      ritualMode: mode || undefined,
      observedPorts,
      observedPortCodes: extra.observedPortCodes || [],
      residualHonestyOk: extra.residualHonestyOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      freezeObserve,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL28Refused: extra.autoCloseL28Refused === true,
      startCzRefused: extra.startCzRefused === true,
      reasons,
      receipt,
      observe: extra.observe || null,
      safeAutomationIds: [...CY_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern a residual honesty plan → PASS | DENY | HOLD + CY-RCPT-*.
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal =
        evaluation.code === CY_CODES.AUTO_SEAL_CLAIM_DENY ||
        evaluation.code === CY_CODES.AUTO_SEAL_L28_CLAIM_DENY ||
        evaluation.code === CY_CODES.AUTO_CLOSE_L28_CLAIM_DENY;
      const autoProd =
        evaluation.code === CY_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === CY_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      const tipPin =
        evaluation.code === CY_CODES.TIP_PIN_REWRITE_CLAIM_DENY ||
        evaluation.code === CY_CODES.TIP_REWRITE_CLAIM_DENY;
      const ghe = evaluation.code === CY_CODES.GHE_CLAIM_DENY;
      const cz = evaluation.code === CY_CODES.CZ_START_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        tipPinRewriteRefused: tipPin,
        gheClaimRefused: ghe,
        autoCloseL28Refused:
          evaluation.code === CY_CODES.AUTO_CLOSE_L28_CLAIM_DENY ||
          evaluation.code === CY_CODES.AUTO_SEAL_L28_CLAIM_DENY,
        startCzRefused: cz,
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
      honestyMode,
      phase,
      honestyDigest: planDigest,
      observedPorts,
      observedPortCodes,
      observeOk: gateObserveOk,
      ackMissingObserveLabels,
      honestyOk: gateHonestyOk,
      residualHonestyOk: gateResidualOk,
      reasons: planReasons
    } = evaluation;

    let observe = null;
    if (
      honestyMode === 'HOLD' &&
      (!observedPorts || observedPorts.length === 0)
    ) {
      const freezeObserve = softObserveFreezeNonClaims(plan || {});
      observe = {
        schema: 'eos.mission-os-control-plane-honesty-observe.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        freeze_pin: CY_FREEZE_PIN,
        freeze_observe: freezeObserve,
        observe: { ok: true, missing: [], observed: [] },
        honesty: { ok: true },
        residual_honesty: { ok: true },
        pending_ports: ['CZ pending'],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L28 auto-close / ≠ CZ start',
          'NON-CLAIM: HOLD observe ≠ tip-pin rewrite (freeze soft-observe only)'
        ],
        note: 'HOLD observe — Mission OS residual honesty; ≠ automatic closure; ≠ tip-pin rewrite'
      };
    } else {
      const runner = await this.resolveHonesty();
      observe = runner.buildHonestySurface({
        observedPorts,
        honestyOk: gateHonestyOk !== false,
        residualHonestyOk: gateResidualOk !== false,
        pendingPorts: ['CZ pending'],
        surface: 'mission-os-control-plane-honesty',
        freezeObserve: plan?.freezeObserve
      });
      observe = {
        ...observe,
        PRODUCTION_READY: 'NO',
        freeze_pin: CY_FREEZE_PIN,
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
            missing: CY_REQUIRED_OBSERVE_PORTS.filter(
              (c) => !(observedPortCodes || []).includes(c)
            ),
            observed: [...(observedPortCodes || [])]
          },
          honesty: observe.honesty || { ok: gateHonestyOk !== false },
          residual_honesty: observe.residual_honesty || {
            ok: gateObserveOk === true && gateResidualOk !== false
          }
        };
      }
    }

    const observeEval = evaluateObserveOk(observe, {
      ackMissingObserveLabels
    });

    // ACTIVE with incomplete required CV+CW+CX observe cannot PASS even with gate ack
    let decision = decisionForHonesty(honestyMode, observeEval);
    if (honestyMode === 'ACTIVE' && !gateObserveOk && decision === 'PASS') {
      decision = 'DENY';
      observeEval.ok = false;
      if (
        !observeEval.refuseCodes.includes(
          CY_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        )
      ) {
        observeEval.refuseCodes.push(
          CY_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        );
      }
      observeEval.primaryRefuse =
        CY_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS;
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
          code: CY_CODES.RESIDUAL_HONESTY_REFUSE_DENY,
          reason: `Residual honesty/observe refused: ${observeEval.primaryRefuse || 'unknown'} (≠ PRODUCTION_READY flip / ≠ tip-pin rewrite)`
        },
        {
          residualHonestyOk: false,
          honestyOk: observeEval.honestyOk,
          observedPorts,
          observedPortCodes,
          refuseCodes: observeEval.refuseCodes.length
            ? observeEval.refuseCodes
            : [CY_REFUSE_CODES.RESIDUAL_HONESTY_NOT_OK],
          observe,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? CY_CODES.GOVERN_PASS : CY_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `mission-os-control-plane-honesty govern ${decision}: changeId=${changeId} honestyMode=${honestyMode} phase=${phase} planId=${planId}`,
      `freeze soft-observe: pin=${CY_FREEZE_PIN_SHORT} readOnly=true (≠ tip-pin rewrite)`,
      'NON-CLAIM: residual honesty PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L28 auto-close ≠ CZ start',
      'A5_PRESERVE_FUNDACION_ALWAYS_DENY + A6_PRESERVE_HUMAN_PROD_GATE held',
      'A7_REFUSE_TIP_PIN_REWRITE + A8_REFUSE_L27_REOPEN + A9_REFUSE_GHE_CLAIM + A10_REFUSE_AUTO_CLOSE_L28 + A11_REFUSE_CZ_START + A12_REFUSE_PRODUCTION_READY_FLIP held',
      `freeze pin ${CY_FREEZE_PIN_SHORT} (no tip-refresh / no CZ from this package)`
    ];

    const honestyDigest =
      planDigest ||
      this.hashFn({
        changeId,
        honestyMode,
        phase,
        observedPorts,
        refuseCodes: observeEval.refuseCodes,
        decision,
        freezeObserve: {
          pinShort: CY_FREEZE_PIN_SHORT,
          readOnly: true
        }
      });

    const honestyPlanDigest = this.hashFn({
      planId,
      changeId,
      honestyDigest,
      honestyMode,
      phase,
      decision,
      observeEval,
      observedPortCodes
    });

    const record = Object.freeze({
      planId,
      changeId,
      honestyDigest,
      honestyMode,
      phase,
      decision,
      residualHonestyOk: observeEval.residualHonestyOk || gateObserveOk,
      honestyOk: observeEval.honestyOk,
      observedPorts: Object.freeze([...observedPorts]),
      observedPortCodes: Object.freeze([...observedPortCodes]),
      refuseCodes: Object.freeze([...observeEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      honestyPlanDigest,
      governedAt: new Date().toISOString()
    });
    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      honestyMode,
      phase,
      honestyDigest,
      observedPorts,
      requiredObserveSet: [...CY_REQUIRED_OBSERVE_PORTS],
      residualHonestyOk: record.residualHonestyOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      humanGateHeld: false,
      autoSealRefused: false,
      autoProductionFlipRefused: false,
      tipPinRewriteRefused: false,
      gheClaimRefused: false,
      autoCloseL28Refused: false,
      startCzRefused: false,
      freezeObserve,
      reasons,
      honestyPlanDigest,
      meta: {
        code,
        reasons,
        freezePin: CY_FREEZE_PIN_SHORT,
        freezePinFull: CY_FREEZE_PIN,
        honestySource: this._resolvedHonesty?.source || 'snapshot',
        observedPortCodes,
        safeAutomationIds: [...CY_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      honestyMode,
      ritualMode: honestyMode,
      phase,
      honestyDigest,
      honestyPlanDigest,
      observedPorts,
      observedPortCodes,
      residualHonestyOk: record.residualHonestyOk,
      honestyOk: record.honestyOk,
      freezeObserve,
      refuseCodes: observeEval.refuseCodes,
      nonClaimChips,
      pendingPorts,
      reasons,
      receipt,
      observe,
      safeAutomationIds: [...CY_SAFE_AUTOMATION_IDS]
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
      const verifyRes = verifyMissionOsControlPlaneHonestyReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CY_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CY_CODES.TRAIL_BREAK,
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
      code: CY_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CY_PORT_PRODUCTION_READY,
  CY_PORT_KIND,
  CY_PRODUCTION_READY,
  CY_RECEIPT_KIND,
  CY_CODES,
  CY_SAFE_AUTOMATION_IDS,
  CY_REFUSE_CODES,
  CY_FREEZE_PIN,
  CY_FREEZE_PIN_SHORT,
  CY_DEFAULT_OBSERVE_LABELS,
  CY_FREEZE_NONCLAIM_LABELS,
  CY_FREEZE_OBSERVE_TEMPLATE,
  softImportCvCwCxHonesty,
  softComposeObserveLabels,
  softObserveFreezeNonClaims,
  builtinResidualHonestyDouble,
  evaluateObserveOk,
  decisionForHonesty,
  decisionForRitual,
  MissionOsControlPlaneHonestyPort
};
