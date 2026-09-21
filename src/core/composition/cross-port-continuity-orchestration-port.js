/**
 * @module cross-port-continuity-orchestration-port
 * SPEC-0106 / Mission CW — Cross-Port Continuity Orchestration Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic Cross-Port Continuity Orchestration Port:
 *   - Validates plan via policy gate
 *   - Soft-imports CV honesty when present (compose; don't fork)
 *     else uses injected honesty or builtin fixture double
 *   - Soft-composes CQ/CR/CS/CT/CU as observe labels only
 *     (do NOT require live CQ–CT govern for happy path;
 *      do NOT rewrite CU seam-pack or CQ–CT product modules)
 *   - orchestrationMode: ACTIVE | HOLD
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CW-RCPT-* receipts
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate
 *
 * NON-CLAIM: ≠ GHE / ≠ CU rewrite / ≠ L27 reopen / ≠ PRODUCTION_READY /
 * ≠ L28 closeout / ≠ tip-refresh / ≠ CX.
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CW_PRODUCTION_READY,
  CW_RECEIPT_KIND,
  CW_FREEZE_PIN,
  CW_FREEZE_PIN_SHORT,
  CW_REQUIRED_CONTINUITY_PORTS,
  sha256Canonical,
  buildCrossPortContinuityOrchestrationReceipt,
  verifyCrossPortContinuityOrchestrationReceipt
} from './cross-port-continuity-orchestration-receipt.js';

import {
  CrossPortContinuityOrchestrationPolicyGate,
  CW_CODES,
  evaluateContinuitySet
} from './cross-port-continuity-orchestration-policy-gate.js';

/** @type {'NO'} */
export const CW_PORT_PRODUCTION_READY = 'NO';
export const CW_PORT_KIND = 'eos-cross-port-continuity-orchestration-port';
export { CW_FREEZE_PIN, CW_FREEZE_PIN_SHORT };

export const CW_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_CONTINUITY_PROBE',
  'A2_CQ_CT_OBSERVE_PROBE',
  'A3_CU_SEAM_OBSERVE_PROBE',
  'A4_CV_HONESTY_OBSERVE_PROBE',
  'A5_NON_CLAIM_CHIP_PROBE',
  'A6_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A7_PRESERVE_HUMAN_PROD_GATE',
  'A8_REFUSE_TIP_REWRITE',
  'A9_REFUSE_L27_REOPEN',
  'A10_REFUSE_CU_REWRITE',
  'A11_REFUSE_GHE_CLAIM',
  'A12_REFUSE_AUTO_SEAL_L28'
]);

export const CW_REFUSE_CODES = Object.freeze({
  MISSING_REQUIRED_OBSERVE_LABELS: 'MISSING_REQUIRED_OBSERVE_LABELS',
  CONTINUITY_NOT_OK: 'CONTINUITY_NOT_OK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L27_REOPEN_REFUSED: 'L27_REOPEN_REFUSED',
  TIP_REWRITE_REFUSED: 'TIP_REWRITE_REFUSED',
  CU_REWRITE_REFUSED: 'CU_REWRITE_REFUSED',
  GHE_CLAIM_REFUSED: 'GHE_CLAIM_REFUSED',
  AUTO_SEAL_L28_REFUSED: 'AUTO_SEAL_L28_REFUSED'
});

export const CW_DEFAULT_OBSERVE_LABELS = Object.freeze([
  'CQ:observe',
  'CR:observe',
  'CS:observe',
  'CT:observe',
  'CU:seam-observe',
  'CV:honesty-observe'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import CV honesty when co-located (compose; don't fork).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportCvHonesty(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'hud-doctor-honesty-ritual-port.js'),
    path.join(__dirname, '..', 'observability', 'doctor-hud-honesty.js'),
    path.resolve('/workspace/eos-cv-refs/doctor-hud-honesty.js'),
    path.resolve('/workspace/eos-mission-cv/src/core/composition/hud-doctor-honesty-ritual-port.js'),
    path.resolve(__dirname, '../../../../eos-cv-refs/doctor-hud-honesty.js')
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
 * Soft-compose CQ/CR/CS/CT/CU/CV observe labels (fixtures when absent).
 * @param {string[]} [requested]
 * @returns {{ labels: string[], source: string }}
 */
export function softComposeObserveLabels(requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return { labels: requested.map(String), source: 'plan' };
  }
  return { labels: [...CW_DEFAULT_OBSERVE_LABELS], source: 'fixture-default' };
}

/**
 * Builtin continuity/honesty double for hermetic PASS|DENY|HOLD.
 * @param {object} input
 * @returns {object}
 */
export function builtinContinuityHonestyDouble(input = {}) {
  const observedPorts = Array.isArray(input.observedPorts)
    ? input.observedPorts.map(String)
    : [...CW_DEFAULT_OBSERVE_LABELS];
  const codes = observedPorts
    .map((p) => String(p).trim().toUpperCase().split(/[:|/.\\s_-]/)[0])
    .filter(Boolean);
  const continuity = evaluateContinuitySet(codes);
  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map(String)
    : ['CX pending'];

  const non_claim_chips = [
    'NON-CLAIM: cross-port continuity orchestration ≠ GHE enforcement',
    'NON-CLAIM: cross-port continuity orchestration ≠ CU rewrite / ≠ L27 reopen',
    'NON-CLAIM: cross-port continuity orchestration ≠ PRODUCTION_READY flip (remains NO)',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L28 closeout / ≠ tip-refresh / ≠ CX',
    'NON-CLAIM: CQ–CT–CU observe labels only — no live product govern required'
  ];
  if (!continuity.ok) {
    non_claim_chips.push(
      `NON-CLAIM chip: missing continuity observe (${continuity.missing.join(',')}) — not closed by labels alone`
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by orchestration`
    );
  }

  return {
    schema: 'eos.cross-port-continuity-observe.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    freeze_pin: CW_FREEZE_PIN,
    freeze_pin_short: CW_FREEZE_PIN_SHORT,
    continuity: {
      ok: continuity.ok,
      missing: continuity.missing,
      observed: codes
    },
    honesty: { ok: input.honestyOk !== false },
    pending_ports: pendingPorts,
    non_claim_chips,
    observe_note:
      'Mission CW builtin continuity/honesty double — CQ–CT–CU + CV as labels; L17–L27 CLOSED retained; L28 OPEN',
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
  const continuityOk = surface?.continuity?.ok === true;
  const honestyOk = surface?.honesty?.ok !== false;
  const ackMissing = acks.ackMissingObserveLabels === true;

  if (!continuityOk && !ackMissing) {
    refuses.push(CW_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS);
  }
  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(CW_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }
  const ok = refuses.length === 0 && honestyOk;
  if (!honestyOk) refuses.push(CW_REFUSE_CODES.HONESTY_NOT_OK);
  return {
    ok: refuses.length === 0,
    refuseCodes: refuses,
    continuityOk,
    honestyOk,
    primaryRefuse: refuses.length ? refuses[0] : null
  };
}

/**
 * Map orchestrationMode + observe eval → decision.
 * @param {string} orchestrationMode
 * @param {{ ok: boolean }|null} observeEval
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForOrchestration(orchestrationMode, observeEval) {
  if (orchestrationMode === 'HOLD') return 'HOLD';
  if (observeEval && observeEval.ok === true) return 'PASS';
  return 'DENY';
}

/**
 * Cross-Port Continuity Orchestration Port — hermetic.
 */
export class CrossPortContinuityOrchestrationPort {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new CrossPortContinuityOrchestrationPolicyGate({
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
        buildHonestySurface: builtinContinuityHonestyDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedHonesty;
    }
    if (!this._resolvedHonesty) {
      const soft = await softImportCvHonesty(this._honestyModulePath);
      this._resolvedHonesty = soft || {
        buildHonestySurface: builtinContinuityHonestyDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
    }
    return this._resolvedHonesty;
  }

  _sealReceipt(fields) {
    const receipt = buildCrossPortContinuityOrchestrationReceipt(
      { ...fields, prevReceiptHash: this._lastReceiptHash },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  _deny(plan, evaluation, extra = {}) {
    const reasons = [evaluation.reason, ...(extra.reasons || [])].filter(Boolean);
    const observedPorts = extra.observedPorts || [];
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      changeId: plan?.changeId != null ? String(plan.changeId) : null,
      decision: 'DENY',
      orchestrationMode:
        plan?.orchestrationMode != null ? String(plan.orchestrationMode) : null,
      phase: plan?.phase != null ? String(plan.phase) : null,
      continuityDigest:
        plan?.continuityDigest != null &&
        String(plan.continuityDigest).trim() !== ''
          ? String(plan.continuityDigest)
          : this.hashFn({ deny: true, planId: plan?.planId || null }),
      observedPorts,
      continuityOk: extra.continuityOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      cuRewriteRefused: extra.cuRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      reasons,
      meta: {
        code: evaluation.code,
        reason: evaluation.reason,
        freezePin: CW_FREEZE_PIN_SHORT
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      orchestrationMode:
        plan?.orchestrationMode != null
          ? String(plan.orchestrationMode)
          : undefined,
      observedPorts,
      observedPortCodes: extra.observedPortCodes || [],
      continuityOk: extra.continuityOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      cuRewriteRefused: extra.cuRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      reasons,
      receipt,
      observe: extra.observe || null,
      safeAutomationIds: [...CW_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern a continuity orchestration plan → PASS | DENY | HOLD + CW-RCPT-*.
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal =
        evaluation.code === CW_CODES.AUTO_SEAL_CLAIM_DENY ||
        evaluation.code === CW_CODES.AUTO_SEAL_L28_CLAIM_DENY;
      const autoProd =
        evaluation.code === CW_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === CW_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      const cu =
        evaluation.code === CW_CODES.CU_REWRITE_CLAIM_DENY;
      const ghe = evaluation.code === CW_CODES.GHE_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        cuRewriteRefused: cu,
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
      orchestrationMode,
      phase,
      continuityDigest: planDigest,
      observedPorts,
      observedPortCodes,
      continuityOk: gateContinuityOk,
      ackMissingObserveLabels,
      honestyOk: gateHonestyOk,
      reasons: planReasons
    } = evaluation;

    let observe = null;
    if (orchestrationMode === 'HOLD' && (!observedPorts || observedPorts.length === 0)) {
      observe = {
        schema: 'eos.cross-port-continuity-observe.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        freeze_pin: CW_FREEZE_PIN,
        continuity: { ok: true, missing: [], observed: [] },
        honesty: { ok: true },
        pending_ports: ['CX pending'],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L28 closeout / ≠ CX'
        ],
        note: 'HOLD observe — cross-port continuity; ≠ automatic closure'
      };
    } else {
      const runner = await this.resolveHonesty();
      observe = runner.buildHonestySurface({
        observedPorts,
        honestyOk: gateHonestyOk !== false,
        pendingPorts: ['CX pending'],
        surface: 'orchestration'
      });
      observe = { ...observe, PRODUCTION_READY: 'NO' };
      // Soft-imported CV honesty surfaces lack continuity.*; overlay from gate
      // observe labels so CQ↔CR↔CS↔CT continuity remains authoritative.
      if (!observe.continuity || typeof observe.continuity !== 'object') {
        observe = {
          ...observe,
          continuity: {
            ok: gateContinuityOk === true,
            missing: CW_REQUIRED_CONTINUITY_PORTS.filter(
              (c) => !(observedPortCodes || []).includes(c)
            ),
            observed: [...(observedPortCodes || [])]
          },
          honesty: observe.honesty || { ok: gateHonestyOk !== false }
        };
      }
    }

    const observeEval = evaluateObserveOk(observe, {
      ackMissingObserveLabels
    });

    // ACTIVE with incomplete continuity cannot PASS even with gate ack —
    // ack only lets the gate through; port still DENYs for incomplete set.
    let decision = decisionForOrchestration(orchestrationMode, observeEval);
    if (
      orchestrationMode === 'ACTIVE' &&
      !gateContinuityOk &&
      decision === 'PASS'
    ) {
      decision = 'DENY';
      observeEval.ok = false;
      if (!observeEval.refuseCodes.includes(CW_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS)) {
        observeEval.refuseCodes.push(CW_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS);
      }
      observeEval.primaryRefuse = CW_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS;
    }

    const nonClaimChips = Array.isArray(observe?.non_claim_chips)
      ? observe.non_claim_chips.map(String)
      : [];
    const pendingPorts = Array.isArray(observe?.pending_ports)
      ? observe.pending_ports.map(String)
      : [];

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code:
            observeEval.primaryRefuse ===
            CW_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
              ? CW_CODES.CONTINUITY_REFUSE_DENY
              : CW_CODES.CONTINUITY_REFUSE_DENY,
          reason: `Continuity/observe refused: ${observeEval.primaryRefuse || 'unknown'} (≠ PRODUCTION_READY flip)`
        },
        {
          continuityOk: false,
          honestyOk: observeEval.honestyOk,
          observedPorts,
          observedPortCodes,
          refuseCodes: observeEval.refuseCodes.length
            ? observeEval.refuseCodes
            : [CW_REFUSE_CODES.CONTINUITY_NOT_OK],
          observe,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? CW_CODES.GOVERN_PASS : CW_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `cross-port-continuity-orchestration govern ${decision}: changeId=${changeId} orchestrationMode=${orchestrationMode} phase=${phase} planId=${planId}`,
      'NON-CLAIM: cross-port continuity ≠ GHE ≠ CU rewrite ≠ L27 reopen ≠ PRODUCTION_READY flip',
      'A6_PRESERVE_FUNDACION_ALWAYS_DENY + A7_PRESERVE_HUMAN_PROD_GATE held',
      'A8_REFUSE_TIP_REWRITE + A9_REFUSE_L27_REOPEN + A10_REFUSE_CU_REWRITE + A11_REFUSE_GHE_CLAIM + A12_REFUSE_AUTO_SEAL_L28 held',
      `freeze pin ${CW_FREEZE_PIN_SHORT} (no tip-refresh / no CX from this package)`
    ];

    const continuityDigest =
      planDigest ||
      this.hashFn({
        changeId,
        orchestrationMode,
        phase,
        observedPorts,
        refuseCodes: observeEval.refuseCodes,
        decision
      });

    const continuityPlanDigest = this.hashFn({
      planId,
      changeId,
      continuityDigest,
      orchestrationMode,
      phase,
      decision,
      observeEval,
      observedPortCodes
    });

    const record = Object.freeze({
      planId,
      changeId,
      continuityDigest,
      orchestrationMode,
      phase,
      decision,
      continuityOk: observeEval.continuityOk || gateContinuityOk,
      honestyOk: observeEval.honestyOk,
      observedPorts: Object.freeze([...observedPorts]),
      observedPortCodes: Object.freeze([...observedPortCodes]),
      refuseCodes: Object.freeze([...observeEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      continuityPlanDigest,
      governedAt: new Date().toISOString()
    });
    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      orchestrationMode,
      phase,
      continuityDigest,
      observedPorts,
      requiredContinuitySet: [...CW_REQUIRED_CONTINUITY_PORTS],
      continuityOk: record.continuityOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      humanGateHeld: false,
      autoSealRefused: false,
      autoProductionFlipRefused: false,
      cuRewriteRefused: false,
      gheClaimRefused: false,
      reasons,
      continuityPlanDigest,
      meta: {
        code,
        reasons,
        freezePin: CW_FREEZE_PIN_SHORT,
        freezePinFull: CW_FREEZE_PIN,
        honestySource: this._resolvedHonesty?.source || 'snapshot',
        observedPortCodes,
        safeAutomationIds: [...CW_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      orchestrationMode,
      phase,
      continuityDigest,
      continuityPlanDigest,
      observedPorts,
      observedPortCodes,
      continuityOk: record.continuityOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      nonClaimChips,
      pendingPorts,
      reasons,
      receipt,
      observe,
      safeAutomationIds: [...CW_SAFE_AUTOMATION_IDS]
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
      const verifyRes = verifyCrossPortContinuityOrchestrationReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CW_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CW_CODES.TRAIL_BREAK,
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
      code: CW_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CW_PORT_PRODUCTION_READY,
  CW_PORT_KIND,
  CW_PRODUCTION_READY,
  CW_RECEIPT_KIND,
  CW_CODES,
  CW_SAFE_AUTOMATION_IDS,
  CW_REFUSE_CODES,
  CW_FREEZE_PIN,
  CW_FREEZE_PIN_SHORT,
  CW_DEFAULT_OBSERVE_LABELS,
  softImportCvHonesty,
  softComposeObserveLabels,
  builtinContinuityHonestyDouble,
  evaluateObserveOk,
  decisionForOrchestration,
  CrossPortContinuityOrchestrationPort
};
