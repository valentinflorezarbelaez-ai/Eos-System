/**
 * @module specboot-continuity-port
 * SPEC-0102 / Mission CS — SpecBoot Operator Continuity Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic SpecBoot operator continuity port:
 *   - Validates continuity plan via policy gate
 *   - Soft-imports specboot-friction-gate.js when present (compose, don't rewrite)
 *     else uses injected friction runner or minimal fixture double
 *   - continuityMode: ACTIVE | HOLD (hermetic — NOT automatic closure)
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CS-RCPT-* receipts
 *   - Preserves human gates A6 (seal) + A7 (PRODUCTION_READY) — refuse auto
 *   - No network / never claim automatic closure or PRODUCTION_READY flip
 *
 * NON-CLAIM:
 *   SpecBoot Operator Continuity Port ≠ automatic closure /
 *   ≠ PRODUCTION_READY flip / ≠ full SpecBoot CLI rewrite /
 *   ≠ Fundacion writes (Δ=0) / ≠ reopen L26 / ≠ L27 closeout.
 *   L17–L26 CLOSED never reopen (NEVER reopen L26);
 *   L27 OPEN (Audit MEASURED · CQ MEASURED · CR MEASURED · CS in progress · CT–CU pending);
 *   Axis: Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/specboot.
 *
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CS_PRODUCTION_READY,
  CS_RECEIPT_KIND,
  sha256Canonical,
  buildSpecbootContinuityReceipt,
  verifySpecbootContinuityReceipt
} from './specboot-continuity-receipt.js';

import {
  SpecbootContinuityPolicyGate,
  CS_CODES,
  normalizeLidrStep
} from './specboot-continuity-policy-gate.js';

/** @type {'NO'} */
export const CS_PORT_PRODUCTION_READY = 'NO';

export const CS_PORT_KIND = 'eos-specboot-continuity-port';

/** Safe automation IDs — preserve A6 seal + A7 PRODUCTION_READY human gates. */
export const CS_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_PREREQ_PROBE',
  'A2_DIRTY_PROBE',
  'A3_STALE_PROBE',
  'A4_OWNERSHIP_PROBE',
  'A5_STRUCTURED_REFUSE',
  'A6_PRESERVE_HUMAN_SEAL_GATE',
  'A7_PRESERVE_HUMAN_PROD_GATE'
]);

export const CS_REFUSE_CODES = Object.freeze({
  MISSING_PREREQUISITES: 'MISSING_PREREQUISITES',
  DIRTY_STATE: 'DIRTY_STATE',
  STALE_INPUTS: 'STALE_INPUTS',
  AMBIGUOUS_OWNERSHIP: 'AMBIGUOUS_OWNERSHIP',
  HUMAN_GATE_REQUIRED: 'HUMAN_GATE_REQUIRED',
  INVALID_STEP: 'INVALID_STEP',
  AUTO_SEAL_REFUSED: 'AUTO_SEAL_REFUSED',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED'
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import real specboot-friction-gate when co-located (host after post-L26 E).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportFrictionGate(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(path.join(__dirname, 'specboot-friction-gate.js'));

  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      const run =
        typeof mod.runSpecbootFrictionGate === 'function'
          ? mod.runSpecbootFrictionGate
          : null;
      if (!run) continue;
      const evaluateHuman =
        typeof mod.evaluateHumanGate === 'function'
          ? mod.evaluateHumanGate
          : null;
      return {
        runSpecbootFrictionGate: run,
        evaluateHumanGate: evaluateHuman,
        REFUSE_CODES: mod.REFUSE_CODES || CS_REFUSE_CODES,
        SAFE_AUTOMATION_IDS:
          mod.SAFE_AUTOMATION_IDS || CS_SAFE_AUTOMATION_IDS,
        LIDR_STEPS: mod.LIDR_STEPS || null,
        source: 'soft-import',
        path: candidate
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Minimal built-in friction double (used when soft-import + injection absent).
 * Preserves A6/A7 refuse-auto; fail-closed dirty/stale/ownership/prereqs.
 * @param {object} input
 * @returns {object}
 */
export function builtinFrictionDouble(input = {}) {
  const refuses = [];
  const step = normalizeLidrStep(input.step || input.lidrStep) || input.step;

  const wantsSeal =
    step === 'seal' || input.claim === 'seal' || input.autoSeal === true;
  const wantsProdFlip =
    step === 'production_ready_flip' ||
    input.claim === 'production_ready' ||
    input.autoProductionReady === true ||
    input.flipProductionReady === true ||
    input.autoProductionReadyFlip === true;

  let humanGate = {
    required: false,
    acked: null,
    blocked: false,
    reason: null
  };

  if (wantsSeal) {
    if (input.humanSealAck === true) {
      humanGate = {
        required: true,
        acked: true,
        blocked: false,
        reason: null,
        diagnostic: 'human seal ack present — gate does not seal; HITL only'
      };
    } else {
      humanGate = {
        required: true,
        acked: false,
        blocked: true,
        reason: CS_REFUSE_CODES.AUTO_SEAL_REFUSED,
        diagnostic:
          'AUTO_SEAL_REFUSED: seal requires explicit humanSealAck=true (A6)'
      };
      refuses.push({
        code: CS_REFUSE_CODES.AUTO_SEAL_REFUSED,
        detail: humanGate.diagnostic
      });
    }
  } else if (wantsProdFlip) {
    if (input.humanProductionReadyAck === true) {
      humanGate = {
        required: true,
        acked: true,
        blocked: false,
        reason: null,
        diagnostic:
          'human PRODUCTION_READY ack present — gate still emits NO; flip HITL only'
      };
    } else {
      humanGate = {
        required: true,
        acked: false,
        blocked: true,
        reason: CS_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED,
        diagnostic:
          'AUTO_PRODUCTION_FLIP_REFUSED: PRODUCTION_READY flip requires humanProductionReadyAck (A7)'
      };
      refuses.push({
        code: CS_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED,
        detail: humanGate.diagnostic
      });
    }
  } else if (step === 'publish' && input.humanPublishAck !== true) {
    humanGate = {
      required: true,
      acked: false,
      blocked: true,
      reason: CS_REFUSE_CODES.HUMAN_GATE_REQUIRED,
      diagnostic: 'HUMAN_GATE_REQUIRED: publish requires humanPublishAck=true'
    };
    refuses.push({
      code: CS_REFUSE_CODES.HUMAN_GATE_REQUIRED,
      detail: humanGate.diagnostic
    });
  } else if (step === 'commit' && input.humanCommitAck !== true) {
    humanGate = {
      required: true,
      acked: false,
      blocked: true,
      reason: CS_REFUSE_CODES.HUMAN_GATE_REQUIRED,
      diagnostic: 'HUMAN_GATE_REQUIRED: commit requires humanCommitAck=true'
    };
    refuses.push({
      code: CS_REFUSE_CODES.HUMAN_GATE_REQUIRED,
      detail: humanGate.diagnostic
    });
  }

  if (!step) {
    refuses.push({
      code: CS_REFUSE_CODES.INVALID_STEP,
      detail: `INVALID_STEP: '${input.step || input.lidrStep}'`
    });
  }

  if (input.skipPrereqCheck !== true && input.missingPrereqs === true) {
    refuses.push({
      code: CS_REFUSE_CODES.MISSING_PREREQUISITES,
      detail: 'MISSING_PREREQUISITES: caller-marked missingPrereqs=true'
    });
  }

  if (input.skipDirtyCheck !== true && input.dirty === true) {
    refuses.push({
      code: CS_REFUSE_CODES.DIRTY_STATE,
      detail: 'DIRTY_STATE: working tree dirty'
    });
  }

  if (input.skipStaleCheck !== true && input.stale === true) {
    refuses.push({
      code: CS_REFUSE_CODES.STALE_INPUTS,
      detail: 'STALE_INPUTS: change tip stale vs HEAD'
    });
  }

  if (input.skipOwnershipCheck !== true) {
    const owners = Array.isArray(input.owners)
      ? input.owners
      : input.primaryOwner
        ? [input.primaryOwner]
        : [];
    if (owners.length === 0 && !input.primaryOwner) {
      refuses.push({
        code: CS_REFUSE_CODES.AMBIGUOUS_OWNERSHIP,
        detail: 'AMBIGUOUS_OWNERSHIP: no owner declared'
      });
    } else if (owners.length > 1 && !input.primaryOwner) {
      refuses.push({
        code: CS_REFUSE_CODES.AMBIGUOUS_OWNERSHIP,
        detail: 'AMBIGUOUS_OWNERSHIP: multiple owners without primaryOwner'
      });
    }
  }

  const ok = refuses.length === 0;
  const primary = ok ? null : refuses[0].code;

  return {
    schema: 'eos.specboot-friction-gate.v1',
    PRODUCTION_READY: 'NO',
    ok,
    exit_code: ok ? 0 : 1,
    step: step || null,
    change_id: input.changeId || null,
    primary_refuse: primary,
    refuses,
    prerequisites: {
      ok: !refuses.some((r) => r.code === CS_REFUSE_CODES.MISSING_PREREQUISITES)
    },
    dirty: {
      dirty: input.dirty === true,
      blocked: input.dirty === true
    },
    stale: {
      stale: input.stale === true,
      blocked: input.stale === true
    },
    ownership: {
      ok: !refuses.some((r) => r.code === CS_REFUSE_CODES.AMBIGUOUS_OWNERSHIP),
      primary: input.primaryOwner || null
    },
    human_gate: humanGate,
    non_claims: [
      'NON-CLAIM: SpecBoot continuity ≠ automatic closure ≠ PRODUCTION_READY flip'
    ],
    note: ok
      ? `FRICTION_GATE_PASS — step=${step}; human gates for seal/readiness still required`
      : `FRICTION_GATE_REFUSE — ${primary}`,
    fundacion_delta: 0,
    law_vi: true,
    auto_seal: false,
    auto_production_ready_flip: false,
    _builtinDouble: true
  };
}

/**
 * Builtin evaluateHumanGate double (A6/A7).
 * @param {object} input
 * @returns {object}
 */
export function builtinEvaluateHumanGate(input = {}) {
  const gate = builtinFrictionDouble(input);
  return (
    gate.human_gate || {
      required: false,
      acked: null,
      blocked: false,
      reason: null
    }
  );
}

/**
 * Map continuityMode + friction result → decision.
 * ACTIVE + friction ok → PASS
 * HOLD → HOLD (observe-only; still seals continuity)
 * ACTIVE + friction refuse → DENY
 * @param {string} continuityMode
 * @param {object|null} friction
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForContinuity(continuityMode, friction) {
  if (continuityMode === 'HOLD') return 'HOLD';
  if (friction && friction.ok === true) return 'PASS';
  return 'DENY';
}

/**
 * SpecBoot Operator Continuity Port — hermetic.
 */
export class SpecbootContinuityPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxReasons]
   * @param {object} [options.friction] { runSpecbootFrictionGate, evaluateHumanGate? }
   * @param {string} [options.frictionModulePath]
   * @param {boolean} [options.preferBuiltinDouble]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new SpecbootContinuityPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });

    /** @type {object|null} */
    this._injectedFriction = options.friction || null;
    this._frictionModulePath = options.frictionModulePath || null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    /** @type {object|null} */
    this._resolvedFriction = null;

    /** @type {Map<string, object>} */
    this.decisions = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._governSeq = 0;
  }

  /**
   * Resolve friction runner (inject → soft-import → builtin double).
   * @returns {Promise<object>}
   */
  async resolveFriction() {
    if (this._injectedFriction?.runSpecbootFrictionGate) {
      this._resolvedFriction = {
        ...this._injectedFriction,
        REFUSE_CODES:
          this._injectedFriction.REFUSE_CODES || CS_REFUSE_CODES,
        SAFE_AUTOMATION_IDS:
          this._injectedFriction.SAFE_AUTOMATION_IDS ||
          CS_SAFE_AUTOMATION_IDS,
        source: 'injected'
      };
      return this._resolvedFriction;
    }
    if (this._preferBuiltinDouble) {
      this._resolvedFriction = {
        runSpecbootFrictionGate: builtinFrictionDouble,
        evaluateHumanGate: builtinEvaluateHumanGate,
        REFUSE_CODES: CS_REFUSE_CODES,
        SAFE_AUTOMATION_IDS: CS_SAFE_AUTOMATION_IDS,
        source: 'builtin-double'
      };
      return this._resolvedFriction;
    }
    if (!this._resolvedFriction) {
      const soft = await softImportFrictionGate(this._frictionModulePath);
      if (soft) {
        this._resolvedFriction = soft;
      } else {
        this._resolvedFriction = {
          runSpecbootFrictionGate: builtinFrictionDouble,
          evaluateHumanGate: builtinEvaluateHumanGate,
          REFUSE_CODES: CS_REFUSE_CODES,
          SAFE_AUTOMATION_IDS: CS_SAFE_AUTOMATION_IDS,
          source: 'builtin-double'
        };
      }
    }
    return this._resolvedFriction;
  }

  /**
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildSpecbootContinuityReceipt(
      {
        ...fields,
        prevReceiptHash: this._lastReceiptHash
      },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * @private
   */
  _deny(plan, evaluation, extra = {}) {
    const reasons = [evaluation.reason, ...(extra.reasons || [])].filter(
      Boolean
    );
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      changeId: plan?.changeId != null ? String(plan.changeId) : null,
      decision: 'DENY',
      continuityMode:
        plan?.continuityMode != null ? String(plan.continuityMode) : null,
      lidrStep:
        plan?.lidrStep != null
          ? String(plan.lidrStep)
          : plan?.step != null
            ? String(plan.step)
            : null,
      continuityDigest:
        plan?.continuityDigest != null &&
        String(plan.continuityDigest).trim() !== ''
          ? String(plan.continuityDigest)
          : this.hashFn({ deny: true, planId: plan?.planId || null }),
      frictionOk: extra.frictionOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      continuityMode:
        plan?.continuityMode != null
          ? String(plan.continuityMode)
          : undefined,
      lidrStep: receipt.lidrStep,
      frictionOk: extra.frictionOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      reasons,
      receipt,
      friction: extra.friction || null,
      safeAutomationIds: [...CS_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Summarize friction gate result into port flags.
   * @param {object|null} friction
   * @returns {object}
   */
  static summarizeFriction(friction) {
    if (!friction || typeof friction !== 'object') {
      return {
        frictionOk: false,
        refuseCodes: [],
        humanGateHeld: false,
        autoSealRefused: false,
        autoProductionFlipRefused: false,
        primaryRefuse: null
      };
    }
    const refuses = Array.isArray(friction.refuses)
      ? friction.refuses.map((r) =>
          typeof r === 'string' ? r : String(r.code || r)
        )
      : [];
    const primary =
      friction.primary_refuse ||
      friction.primaryRefuse ||
      (refuses[0] || null);
    const autoSealRefused =
      primary === CS_REFUSE_CODES.AUTO_SEAL_REFUSED ||
      refuses.includes(CS_REFUSE_CODES.AUTO_SEAL_REFUSED);
    const autoProductionFlipRefused =
      primary === CS_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED ||
      refuses.includes(CS_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
    const humanGateHeld =
      friction.human_gate?.blocked === true ||
      autoSealRefused ||
      autoProductionFlipRefused ||
      primary === CS_REFUSE_CODES.HUMAN_GATE_REQUIRED;

    return {
      frictionOk: friction.ok === true,
      refuseCodes: refuses.length
        ? refuses
        : primary
          ? [String(primary)]
          : [],
      humanGateHeld,
      autoSealRefused,
      autoProductionFlipRefused,
      primaryRefuse: primary != null ? String(primary) : null
    };
  }

  /**
   * Govern a SpecBoot continuity plan → PASS | DENY | HOLD + sealed CS receipt.
   * Hermetic: no network; compose friction-gate; never auto-seal / never flip PRODUCTION_READY.
   *
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal = evaluation.code === CS_CODES.AUTO_SEAL_CLAIM_DENY;
      const autoProd =
        evaluation.code === CS_CODES.PRODUCTION_READY_FLIP_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        humanGateHeld: autoSeal || autoProd,
        refuseCodes: [evaluation.code]
      });
    }

    this._governSeq += 1;
    const {
      planId,
      changeId,
      continuityMode,
      lidrStep,
      continuityDigest: planDigest,
      frictionInput,
      frictionSnapshot,
      reasons: planReasons
    } = evaluation;

    let friction = null;

    if (frictionSnapshot && typeof frictionSnapshot === 'object') {
      friction = { ...frictionSnapshot };
    } else if (continuityMode === 'HOLD' && !frictionInput) {
      friction = {
        ok: true,
        primary_refuse: null,
        refuses: [],
        step: lidrStep,
        change_id: changeId,
        auto_seal: false,
        auto_production_ready_flip: false,
        PRODUCTION_READY: 'NO',
        note: 'HOLD observe — SpecBoot continuity; ≠ automatic closure'
      };
    } else {
      const runner = await this.resolveFriction();
      const input = {
        step: lidrStep,
        changeId,
        skipPrereqCheck: false,
        skipDirtyCheck: false,
        skipStaleCheck: false,
        skipOwnershipCheck: false,
        primaryOwner: 'Valentin Florez',
        owners: ['Valentin Florez'],
        dirty: false,
        stale: false,
        ...(frictionInput || {})
      };
      input.step = lidrStep;
      input.changeId = changeId;
      friction = runner.runSpecbootFrictionGate(input);
      friction = {
        ...friction,
        auto_seal: false,
        auto_production_ready_flip: false,
        PRODUCTION_READY: 'NO'
      };
    }

    const summary = SpecbootContinuityPort.summarizeFriction(friction);
    const decision = decisionForContinuity(continuityMode, friction);

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: CS_CODES.FRICTION_REFUSE_DENY,
          reason: `Friction gate refused: ${summary.primaryRefuse || 'unknown'} (SpecBoot continuity ≠ automatic closure)`
        },
        {
          ...summary,
          friction,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? CS_CODES.GOVERN_PASS : CS_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `specboot-continuity govern ${decision}: changeId=${changeId} continuityMode=${continuityMode} lidrStep=${lidrStep} planId=${planId}`,
      'NON-CLAIM: SpecBoot continuity ≠ automatic closure ≠ PRODUCTION_READY flip',
      'A6_PRESERVE_HUMAN_SEAL_GATE + A7_PRESERVE_HUMAN_PROD_GATE held'
    ];

    const continuityDigest =
      planDigest ||
      this.hashFn({
        changeId,
        continuityMode,
        lidrStep,
        frictionOk: summary.frictionOk,
        refuseCodes: summary.refuseCodes,
        decision
      });

    const continuityPlanDigest = this.hashFn({
      planId,
      changeId,
      continuityDigest,
      continuityMode,
      lidrStep,
      decision,
      summary
    });

    const record = Object.freeze({
      planId,
      changeId,
      continuityDigest,
      continuityMode,
      lidrStep,
      decision,
      ...summary,
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
      continuityMode,
      lidrStep,
      continuityDigest,
      ...summary,
      reasons,
      continuityPlanDigest,
      meta: {
        code,
        reasons,
        continuityPlanDigest,
        continuityMode,
        lidrStep,
        frictionSource: this._resolvedFriction?.source || 'snapshot',
        safeAutomationIds: [...CS_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      continuityMode,
      lidrStep,
      continuityDigest,
      continuityPlanDigest,
      ...summary,
      reasons,
      receipt,
      friction,
      safeAutomationIds: [...CS_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Alias for govern() — evaluate(plan) → PASS|DENY|HOLD.
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async evaluate(plan) {
    return this.govern(plan);
  }

  /**
   * Retrieve a stored govern record by planId.
   * @param {string} planId
   * @returns {object|null}
   */
  getDecision(planId) {
    const record = this.decisions.get(planId);
    return record ? record : null;
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifyTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifySpecbootContinuityReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CS_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CS_CODES.TRAIL_BREAK,
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
      code: CS_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CS_PORT_PRODUCTION_READY,
  CS_PORT_KIND,
  CS_PRODUCTION_READY,
  CS_RECEIPT_KIND,
  CS_CODES,
  CS_SAFE_AUTOMATION_IDS,
  CS_REFUSE_CODES,
  softImportFrictionGate,
  builtinFrictionDouble,
  builtinEvaluateHumanGate,
  decisionForContinuity,
  SpecbootContinuityPort
};
