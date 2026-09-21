/**
 * @module billing-blocked-local-verify-ritual-port
 * SPEC-0107 / Mission CX — Billing-Blocked Local Verify Ritual Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic Billing-Blocked Local Verify Ritual Port:
 *   - Validates plan via policy gate
 *   - Soft-composes CQ BILLING_BLOCKED observe + optional CR/CS/CT/CV/CW
 *     as labels/fixtures (do NOT rewrite CQ product; happy path works
 *     with fixtures when modules absent)
 *   - Soft-imports CV honesty / CW continuity when present (compose)
 *     else uses injected honesty or builtin fixture double
 *   - ritualMode: ACTIVE | HOLD
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CX-RCPT-* receipts with forced BILLING_BLOCKED ciEnvironment
 *   - Explicit honesty: local verify PASS ≠ GHA green ≠ GHE enforcement
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate
 *
 * NON-CLAIM: ≠ GHA green / ≠ GHE / ≠ L27 reopen / ≠ PRODUCTION_READY /
 * ≠ L28 closeout / ≠ tip-refresh / ≠ CY / ≠ CQ rewrite.
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CX_PRODUCTION_READY,
  CX_RECEIPT_KIND,
  CX_FREEZE_PIN,
  CX_FREEZE_PIN_SHORT,
  CX_REQUIRED_OBSERVE_PORTS,
  CX_CI_ENVIRONMENT_TEMPLATE,
  sha256Canonical,
  forceCiEnvironment,
  buildBillingBlockedLocalVerifyRitualReceipt,
  verifyBillingBlockedLocalVerifyRitualReceipt
} from './billing-blocked-local-verify-ritual-receipt.js';

import {
  BillingBlockedLocalVerifyRitualPolicyGate,
  CX_CODES,
  evaluateRequiredObserveSet
} from './billing-blocked-local-verify-ritual-policy-gate.js';

/** @type {'NO'} */
export const CX_PORT_PRODUCTION_READY = 'NO';
export const CX_PORT_KIND = 'eos-billing-blocked-local-verify-ritual-port';
export { CX_FREEZE_PIN, CX_FREEZE_PIN_SHORT, CX_CI_ENVIRONMENT_TEMPLATE };

export const CX_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_VERIFY_RITUAL_PROBE',
  'A2_CQ_BILLING_BLOCKED_OBSERVE_PROBE',
  'A3_CR_CT_OBSERVE_PROBE',
  'A4_CV_CW_SOFT_IMPORT_PROBE',
  'A5_NON_CLAIM_CHIP_PROBE',
  'A6_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A7_PRESERVE_HUMAN_PROD_GATE',
  'A8_REFUSE_TIP_REWRITE',
  'A9_REFUSE_L27_REOPEN',
  'A10_REFUSE_GHA_GREEN_CLAIM',
  'A11_REFUSE_GHE_CLAIM',
  'A12_REFUSE_CQ_REWRITE',
  'A13_REFUSE_AUTO_SEAL_L28'
]);

export const CX_REFUSE_CODES = Object.freeze({
  MISSING_REQUIRED_OBSERVE_LABELS: 'MISSING_REQUIRED_OBSERVE_LABELS',
  LOCAL_VERIFY_NOT_OK: 'LOCAL_VERIFY_NOT_OK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L27_REOPEN_REFUSED: 'L27_REOPEN_REFUSED',
  TIP_REWRITE_REFUSED: 'TIP_REWRITE_REFUSED',
  GHA_GREEN_CLAIM_REFUSED: 'GHA_GREEN_CLAIM_REFUSED',
  GHE_CLAIM_REFUSED: 'GHE_CLAIM_REFUSED',
  CQ_REWRITE_REFUSED: 'CQ_REWRITE_REFUSED',
  AUTO_SEAL_L28_REFUSED: 'AUTO_SEAL_L28_REFUSED'
});

export const CX_DEFAULT_OBSERVE_LABELS = Object.freeze([
  'CQ:billing-blocked-observe',
  'CR:observe',
  'CS:observe',
  'CT:observe',
  'CV:honesty-observe',
  'CW:continuity-observe'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import CV honesty / CW continuity when co-located (compose; don't fork).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportCvCwHonesty(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'hud-doctor-honesty-ritual-port.js'),
    path.join(__dirname, 'cross-port-continuity-orchestration-port.js'),
    path.resolve(
      '/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'
    ),
    path.resolve(
      '/workspace/eos-mission-cw/src/core/composition/cross-port-continuity-orchestration-port.js'
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
 * Soft-compose CQ/CR/CS/CT/CV/CW observe labels (fixtures when absent).
 * @param {string[]} [requested]
 * @returns {{ labels: string[], source: string }}
 */
export function softComposeObserveLabels(requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return { labels: requested.map(String), source: 'plan' };
  }
  return { labels: [...CX_DEFAULT_OBSERVE_LABELS], source: 'fixture-default' };
}

/**
 * Builtin local-verify / BILLING_BLOCKED honesty double for hermetic PASS|DENY|HOLD.
 * @param {object} input
 * @returns {object}
 */
export function builtinLocalVerifyHonestyDouble(input = {}) {
  const observedPorts = Array.isArray(input.observedPorts)
    ? input.observedPorts.map(String)
    : [...CX_DEFAULT_OBSERVE_LABELS];
  const codes = observedPorts
    .map((p) => String(p).trim().toUpperCase().split(/[:|/.\\s_-]/)[0])
    .filter(Boolean);
  const observe = evaluateRequiredObserveSet(codes);
  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map(String)
    : ['CY pending'];

  const non_claim_chips = [
    'NON-CLAIM: billing-blocked local verify ritual ≠ GHA green',
    'NON-CLAIM: billing-blocked local verify ritual ≠ GHE enforcement',
    'NON-CLAIM: local verify PASS ≠ GitHub Actions green ≠ PRODUCTION_READY flip',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L28 closeout / ≠ tip-refresh / ≠ CY',
    'NON-CLAIM: CQ BILLING_BLOCKED observe labels only — no CQ product rewrite'
  ];
  if (!observe.ok) {
    non_claim_chips.push(
      `NON-CLAIM chip: missing required observe (${observe.missing.join(',')}) — not closed by labels alone`
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by ritual`
    );
  }

  return {
    schema: 'eos.billing-blocked-local-verify-observe.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    freeze_pin: CX_FREEZE_PIN,
    freeze_pin_short: CX_FREEZE_PIN_SHORT,
    ci_environment: {
      github_actions: 'BILLING_BLOCKED',
      local_surrogate: 'ACTIVE',
      github_actions_verdict: 'NOT_RUN'
    },
    observe: {
      ok: observe.ok,
      missing: observe.missing,
      observed: codes
    },
    honesty: { ok: input.honestyOk !== false },
    local_verify: { ok: input.localVerifyOk !== false && observe.ok },
    pending_ports: pendingPorts,
    non_claim_chips,
    observe_note:
      'Mission CX builtin local-verify/BILLING_BLOCKED double — CQ+CR/CS/CT/CV/CW as labels; L17–L27 CLOSED retained; L28 OPEN; local PASS ≠ GHA green',
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
  const localVerifyOk = surface?.local_verify?.ok !== false;
  const ackMissing = acks.ackMissingObserveLabels === true;

  if (!observeOk && !ackMissing) {
    refuses.push(CX_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS);
  }
  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(CX_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }
  if (
    surface?.ci_environment?.github_actions === 'PASS' ||
    surface?.ci_environment?.github_actions === 'GREEN' ||
    surface?.ci_environment?.github_actions_verdict === 'PASS'
  ) {
    refuses.push(CX_REFUSE_CODES.GHA_GREEN_CLAIM_REFUSED);
  }
  if (!honestyOk) refuses.push(CX_REFUSE_CODES.HONESTY_NOT_OK);
  if (!localVerifyOk && observeOk) {
    refuses.push(CX_REFUSE_CODES.LOCAL_VERIFY_NOT_OK);
  }
  return {
    ok: refuses.length === 0,
    refuseCodes: refuses,
    observeOk,
    honestyOk,
    localVerifyOk,
    primaryRefuse: refuses.length ? refuses[0] : null
  };
}

/**
 * Map ritualMode + observe eval → decision.
 * @param {string} ritualMode
 * @param {{ ok: boolean }|null} observeEval
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForRitual(ritualMode, observeEval) {
  if (ritualMode === 'HOLD') return 'HOLD';
  if (observeEval && observeEval.ok === true) return 'PASS';
  return 'DENY';
}

/**
 * Billing-Blocked Local Verify Ritual Port — hermetic.
 */
export class BillingBlockedLocalVerifyRitualPort {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new BillingBlockedLocalVerifyRitualPolicyGate({
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
        buildHonestySurface: builtinLocalVerifyHonestyDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedHonesty;
    }
    if (!this._resolvedHonesty) {
      const soft = await softImportCvCwHonesty(this._honestyModulePath);
      this._resolvedHonesty = soft || {
        buildHonestySurface: builtinLocalVerifyHonestyDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
    }
    return this._resolvedHonesty;
  }

  _sealReceipt(fields) {
    const receipt = buildBillingBlockedLocalVerifyRitualReceipt(
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
    const ciEnvironment = forceCiEnvironment(plan?.ciEnvironment || {});
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      changeId: plan?.changeId != null ? String(plan.changeId) : null,
      decision: 'DENY',
      ritualMode:
        plan?.ritualMode != null ? String(plan.ritualMode) : null,
      phase: plan?.phase != null ? String(plan.phase) : null,
      ritualDigest:
        plan?.ritualDigest != null && String(plan.ritualDigest).trim() !== ''
          ? String(plan.ritualDigest)
          : this.hashFn({ deny: true, planId: plan?.planId || null }),
      observedPorts,
      localVerifyOk: extra.localVerifyOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      ghaGreenClaimRefused: extra.ghaGreenClaimRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      ciEnvironment,
      reasons,
      meta: {
        code: evaluation.code,
        reason: evaluation.reason,
        freezePin: CX_FREEZE_PIN_SHORT
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      ritualMode:
        plan?.ritualMode != null ? String(plan.ritualMode) : undefined,
      observedPorts,
      observedPortCodes: extra.observedPortCodes || [],
      localVerifyOk: extra.localVerifyOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      ciEnvironment,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      ghaGreenClaimRefused: extra.ghaGreenClaimRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      reasons,
      receipt,
      observe: extra.observe || null,
      safeAutomationIds: [...CX_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern a local verify ritual plan → PASS | DENY | HOLD + CX-RCPT-*.
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal =
        evaluation.code === CX_CODES.AUTO_SEAL_CLAIM_DENY ||
        evaluation.code === CX_CODES.AUTO_SEAL_L28_CLAIM_DENY;
      const autoProd =
        evaluation.code === CX_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === CX_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      const gha = evaluation.code === CX_CODES.GHA_GREEN_CLAIM_DENY;
      const ghe = evaluation.code === CX_CODES.GHE_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        ghaGreenClaimRefused: gha,
        gheClaimRefused: ghe,
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
      ritualMode,
      phase,
      ritualDigest: planDigest,
      observedPorts,
      observedPortCodes,
      observeOk: gateObserveOk,
      ackMissingObserveLabels,
      honestyOk: gateHonestyOk,
      reasons: planReasons
    } = evaluation;

    let observe = null;
    if (
      ritualMode === 'HOLD' &&
      (!observedPorts || observedPorts.length === 0)
    ) {
      observe = {
        schema: 'eos.billing-blocked-local-verify-observe.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        freeze_pin: CX_FREEZE_PIN,
        ci_environment: {
          github_actions: 'BILLING_BLOCKED',
          local_surrogate: 'ACTIVE',
          github_actions_verdict: 'NOT_RUN'
        },
        observe: { ok: true, missing: [], observed: [] },
        honesty: { ok: true },
        local_verify: { ok: true },
        pending_ports: ['CY pending'],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L28 closeout / ≠ CY',
          'NON-CLAIM: HOLD observe ≠ GHA green (still BILLING_BLOCKED)'
        ],
        note: 'HOLD observe — billing-blocked local verify; ≠ automatic closure; ≠ GHA green'
      };
    } else {
      const runner = await this.resolveHonesty();
      observe = runner.buildHonestySurface({
        observedPorts,
        honestyOk: gateHonestyOk !== false,
        localVerifyOk: true,
        pendingPorts: ['CY pending'],
        surface: 'local-verify-ritual'
      });
      observe = {
        ...observe,
        PRODUCTION_READY: 'NO',
        ci_environment: {
          github_actions: 'BILLING_BLOCKED',
          local_surrogate: 'ACTIVE',
          github_actions_verdict: 'NOT_RUN'
        }
      };
      // Soft-imported CV/CW honesty surfaces may lack observe.*; overlay from gate
      if (!observe.observe || typeof observe.observe !== 'object') {
        observe = {
          ...observe,
          observe: {
            ok: gateObserveOk === true,
            missing: CX_REQUIRED_OBSERVE_PORTS.filter(
              (c) => !(observedPortCodes || []).includes(c)
            ),
            observed: [...(observedPortCodes || [])]
          },
          honesty: observe.honesty || { ok: gateHonestyOk !== false },
          local_verify: observe.local_verify || {
            ok: gateObserveOk === true && gateHonestyOk !== false
          }
        };
      }
    }

    const observeEval = evaluateObserveOk(observe, {
      ackMissingObserveLabels
    });

    // ACTIVE with incomplete required CQ observe cannot PASS even with gate ack —
    // ack only lets the gate through; port still DENYs for incomplete set.
    let decision = decisionForRitual(ritualMode, observeEval);
    if (ritualMode === 'ACTIVE' && !gateObserveOk && decision === 'PASS') {
      decision = 'DENY';
      observeEval.ok = false;
      if (
        !observeEval.refuseCodes.includes(
          CX_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        )
      ) {
        observeEval.refuseCodes.push(
          CX_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        );
      }
      observeEval.primaryRefuse =
        CX_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS;
    }

    const nonClaimChips = Array.isArray(observe?.non_claim_chips)
      ? observe.non_claim_chips.map(String)
      : [];
    const pendingPorts = Array.isArray(observe?.pending_ports)
      ? observe.pending_ports.map(String)
      : [];
    const ciEnvironment = forceCiEnvironment(plan?.ciEnvironment || {});

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: CX_CODES.LOCAL_VERIFY_REFUSE_DENY,
          reason: `Local verify/observe refused: ${observeEval.primaryRefuse || 'unknown'} (≠ GHA green / ≠ PRODUCTION_READY flip)`
        },
        {
          localVerifyOk: false,
          honestyOk: observeEval.honestyOk,
          observedPorts,
          observedPortCodes,
          refuseCodes: observeEval.refuseCodes.length
            ? observeEval.refuseCodes
            : [CX_REFUSE_CODES.LOCAL_VERIFY_NOT_OK],
          observe,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? CX_CODES.GOVERN_PASS : CX_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `billing-blocked-local-verify-ritual govern ${decision}: changeId=${changeId} ritualMode=${ritualMode} phase=${phase} planId=${planId}`,
      'ci_environment: github_actions=BILLING_BLOCKED local_surrogate=ACTIVE github_actions_verdict=NOT_RUN',
      'NON-CLAIM: local verify PASS ≠ GHA green ≠ GHE ≠ PRODUCTION_READY flip',
      'A6_PRESERVE_FUNDACION_ALWAYS_DENY + A7_PRESERVE_HUMAN_PROD_GATE held',
      'A8_REFUSE_TIP_REWRITE + A9_REFUSE_L27_REOPEN + A10_REFUSE_GHA_GREEN_CLAIM + A11_REFUSE_GHE_CLAIM + A12_REFUSE_CQ_REWRITE + A13_REFUSE_AUTO_SEAL_L28 held',
      `freeze pin ${CX_FREEZE_PIN_SHORT} (no tip-refresh / no CY from this package)`
    ];

    const ritualDigest =
      planDigest ||
      this.hashFn({
        changeId,
        ritualMode,
        phase,
        observedPorts,
        refuseCodes: observeEval.refuseCodes,
        decision,
        ciEnvironment: {
          github_actions: 'BILLING_BLOCKED',
          github_actions_verdict: 'NOT_RUN'
        }
      });

    const ritualPlanDigest = this.hashFn({
      planId,
      changeId,
      ritualDigest,
      ritualMode,
      phase,
      decision,
      observeEval,
      observedPortCodes
    });

    const record = Object.freeze({
      planId,
      changeId,
      ritualDigest,
      ritualMode,
      phase,
      decision,
      localVerifyOk: observeEval.localVerifyOk || gateObserveOk,
      honestyOk: observeEval.honestyOk,
      observedPorts: Object.freeze([...observedPorts]),
      observedPortCodes: Object.freeze([...observedPortCodes]),
      refuseCodes: Object.freeze([...observeEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      ritualPlanDigest,
      governedAt: new Date().toISOString()
    });
    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      ritualMode,
      phase,
      ritualDigest,
      observedPorts,
      requiredObserveSet: [...CX_REQUIRED_OBSERVE_PORTS],
      localVerifyOk: record.localVerifyOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      humanGateHeld: false,
      autoSealRefused: false,
      autoProductionFlipRefused: false,
      ghaGreenClaimRefused: false,
      gheClaimRefused: false,
      ciEnvironment,
      reasons,
      ritualPlanDigest,
      meta: {
        code,
        reasons,
        freezePin: CX_FREEZE_PIN_SHORT,
        freezePinFull: CX_FREEZE_PIN,
        honestySource: this._resolvedHonesty?.source || 'snapshot',
        observedPortCodes,
        safeAutomationIds: [...CX_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      ritualMode,
      phase,
      ritualDigest,
      ritualPlanDigest,
      observedPorts,
      observedPortCodes,
      localVerifyOk: record.localVerifyOk,
      honestyOk: record.honestyOk,
      ciEnvironment,
      refuseCodes: observeEval.refuseCodes,
      nonClaimChips,
      pendingPorts,
      reasons,
      receipt,
      observe,
      safeAutomationIds: [...CX_SAFE_AUTOMATION_IDS]
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
      const verifyRes = verifyBillingBlockedLocalVerifyRitualReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CX_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CX_CODES.TRAIL_BREAK,
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
      code: CX_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CX_PORT_PRODUCTION_READY,
  CX_PORT_KIND,
  CX_PRODUCTION_READY,
  CX_RECEIPT_KIND,
  CX_CODES,
  CX_SAFE_AUTOMATION_IDS,
  CX_REFUSE_CODES,
  CX_FREEZE_PIN,
  CX_FREEZE_PIN_SHORT,
  CX_DEFAULT_OBSERVE_LABELS,
  CX_CI_ENVIRONMENT_TEMPLATE,
  softImportCvCwHonesty,
  softComposeObserveLabels,
  builtinLocalVerifyHonestyDouble,
  evaluateObserveOk,
  decisionForRitual,
  BillingBlockedLocalVerifyRitualPort
};
