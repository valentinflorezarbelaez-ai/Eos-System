/**
 * @module hud-doctor-honesty-ritual-port
 * SPEC-0105 / Mission CV — HUD/Doctor Honesty Ritual Composition Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic HUD/Doctor Honesty Ritual Composition Port:
 *   - Validates honesty ritual plan via policy gate
 *   - Soft-imports doctor-hud-honesty.js when present (compose, don't fork)
 *     else uses injected honesty module or minimal fixture double
 *   - ritualMode: ACTIVE | HOLD (hermetic — NOT automatic closure)
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CV-RCPT-* receipts
 *   - Composes B honesty chips (freeze lag, dirty-defer, NON-CLAIM, pending-port)
 *   - CQ–CT observe as optional labels only (do not require live CQ–CT govern)
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto
 *   - No network / never claim tip rewrite / L27 reopen / PRODUCTION_READY flip
 *
 * NON-CLAIM:
 *   HUD/Doctor Honesty Ritual Composition Port ≠ PRODUCTION_READY flip /
 *   ≠ L27 reopen / ≠ tip rewrite / ≠ GHE / ≠ L28 closeout / ≠ tip-refresh / ≠ CW.
 *   L17–L27 CLOSED never reopen (NEVER reopen L27);
 *   L28 OPEN (Audit MEASURED · CV in progress · CW–CZ pending);
 *   Axis: Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/composition.
 * Do NOT wholesale-replace operator-doctor.js / operator-hud.js.
 *
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CV_PRODUCTION_READY,
  CV_RECEIPT_KIND,
  sha256Canonical,
  buildHudDoctorHonestyRitualReceipt,
  verifyHudDoctorHonestyRitualReceipt
} from './hud-doctor-honesty-ritual-receipt.js';

import {
  HudDoctorHonestyRitualPolicyGate,
  CV_CODES
} from './hud-doctor-honesty-ritual-policy-gate.js';

/** @type {'NO'} */
export const CV_PORT_PRODUCTION_READY = 'NO';

export const CV_PORT_KIND = 'eos-hud-doctor-honesty-ritual-port';

/** Safe automation IDs — preserve Fundacion ALWAYS_DENY + PRODUCTION_READY human gate. */
export const CV_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_HONESTY_PROBE',
  'A2_DIRTY_DEFER_PROBE',
  'A3_FREEZE_LAG_PROBE',
  'A4_NON_CLAIM_CHIP_PROBE',
  'A5_PENDING_PORT_PROBE',
  'A6_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A7_PRESERVE_HUMAN_PROD_GATE',
  'A8_REFUSE_TIP_REWRITE',
  'A9_REFUSE_L27_REOPEN'
]);

export const CV_REFUSE_CODES = Object.freeze({
  DIRTY_WITHOUT_ACK: 'DIRTY_WITHOUT_ACK',
  FREEZE_LAG_UNMEASURED_WITHOUT_ACK: 'FREEZE_LAG_UNMEASURED_WITHOUT_ACK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L27_REOPEN_REFUSED: 'L27_REOPEN_REFUSED',
  TIP_REWRITE_REFUSED: 'TIP_REWRITE_REFUSED'
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import real doctor-hud-honesty when co-located (host after post-L26 B).
 * Prefer ../observability/doctor-hud-honesty.js when present on host.
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportHonesty(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  // Host co-location (compose; do not wholesale-replace operator-doctor/hud)
  candidates.push(
    path.join(__dirname, '..', 'observability', 'doctor-hud-honesty.js')
  );
  candidates.push(path.join(__dirname, 'doctor-hud-honesty.js'));
  // Box package co-location (workspace sibling refs)
  candidates.push(
    path.resolve('/workspace/eos-cv-refs/doctor-hud-honesty.js')
  );
  candidates.push(
    path.resolve(
      __dirname,
      '../../../../eos-cv-refs/doctor-hud-honesty.js'
    )
  );

  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      const build =
        typeof mod.buildHonestySurface === 'function'
          ? mod.buildHonestySurface
          : null;
      if (!build) continue;
      return {
        buildHonestySurface: build,
        measureRevisionLag:
          typeof mod.measureRevisionLag === 'function'
            ? mod.measureRevisionLag
            : null,
        evaluateDirtyState:
          typeof mod.evaluateDirtyState === 'function'
            ? mod.evaluateDirtyState
            : null,
        collectNonClaimChips:
          typeof mod.collectNonClaimChips === 'function'
            ? mod.collectNonClaimChips
            : null,
        HONESTY_SCHEMA: mod.HONESTY_SCHEMA || 'eos.doctor-hud-honesty.v1',
        HONESTY_PRODUCTION_READY: mod.HONESTY_PRODUCTION_READY || 'NO',
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
 * Minimal built-in honesty double (used when soft-import + injection absent).
 * Mirrors post-L26 B surface semantics enough for hermetic PASS|DENY|HOLD.
 * @param {object} input
 * @returns {object}
 */
export function builtinHonestyDouble(input = {}) {
  const freezeRevision = input.freezeRevision
    ? String(input.freezeRevision).toLowerCase()
    : null;
  const sourceRevision = input.sourceRevision
    ? String(input.sourceRevision).toLowerCase()
    : null;
  const lagProvided =
    input.lagCommits !== undefined && input.lagCommits !== null;
  const lagCommits = lagProvided ? Number(input.lagCommits) : null;

  let match = false;
  let lag_measurable = false;
  let lag_label = 'UNKNOWN — missing freeze or source revision';

  if (freezeRevision && sourceRevision) {
    const n = Math.min(freezeRevision.length, sourceRevision.length, 40);
    match = n >= 7 && freezeRevision.slice(0, n) === sourceRevision.slice(0, n);
    if (match) {
      lag_measurable = true;
      lag_label = 'MATCH — source revision equals freeze revision';
    } else if (lagProvided && Number.isFinite(lagCommits)) {
      lag_measurable = true;
      if (lagCommits > 0) {
        lag_label = `HEAD_AHEAD — source is ${lagCommits} commit(s) ahead of freeze`;
      } else if (lagCommits < 0) {
        lag_label = `HEAD_BEHIND — source is ${Math.abs(lagCommits)} commit(s) behind freeze`;
      } else {
        lag_label =
          'DIVERGE — revisions differ but lag_commits=0 (topology unknown)';
      }
    } else {
      lag_label =
        'DIVERGE — freeze ≠ source; lag_commits not measured (provide lagCommits for measurable lag)';
    }
  }

  const dirty = input.dirty === true;
  const dirtyPaths = Array.isArray(input.dirtyPaths)
    ? input.dirtyPaths.map(String)
    : [];
  const allowOptimistic = input.allowOptimisticWhenDirty === true;
  const dirtyState = dirty
    ? {
        dirty: true,
        deferred: true,
        blocked: !allowOptimistic,
        optimistic_allowed: allowOptimistic,
        reason: allowOptimistic
          ? 'DIRTY_DEFER: tree dirty but optimistic override enabled'
          : 'DIRTY_BLOCK: optimistic result deferred/blocked',
        dirty_paths: dirtyPaths
      }
    : {
        dirty: false,
        deferred: false,
        blocked: false,
        optimistic_allowed: true,
        reason: null,
        dirty_paths: dirtyPaths
      };

  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map(String)
    : [];

  const non_claim_chips = [
    'NON-CLAIM: honesty display ≠ L27 reopen or seal change',
    'NON-CLAIM: honesty display ≠ PRODUCTION_READY flip (remains NO)',
    'NON-CLAIM: honesty display ≠ evidence completeness / EVD custody seal',
    'NON-CLAIM: doctor/HUD honesty ≠ verify:strict pass',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L28 closeout / ≠ tip-refresh / ≠ CW'
  ];
  if (dirty) {
    non_claim_chips.push(
      'NON-CLAIM chip: dirty tree — optimistic seal/readiness claims blocked'
    );
  }
  if (!match) {
    non_claim_chips.push(
      'NON-CLAIM chip: freeze≠HEAD lag — tip honesty not auto-restored by display'
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by honesty surface`
    );
  }

  return {
    schema: 'eos.doctor-hud-honesty.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    revision: {
      epistemic: freezeRevision && sourceRevision ? 'OBSERVED' : 'NOT_VERIFIED',
      freeze_revision: freezeRevision,
      freeze_revision_short: freezeRevision ? freezeRevision.slice(0, 7) : null,
      source_revision: sourceRevision,
      source_revision_short: sourceRevision ? sourceRevision.slice(0, 7) : null,
      match,
      lag_commits: match ? 0 : lagCommits,
      lag_measurable: match ? true : lag_measurable,
      lag_label,
      note: 'Informational only; no PRODUCTION_READY claim (_builtinDouble)'
    },
    dirty: dirtyState,
    frozen: match && !dirty,
    pending_ports: pendingPorts,
    optimistic: {
      allowed: !dirty && match && pendingPorts.length === 0,
      deferred: dirty || !match || pendingPorts.length > 0,
      result:
        !dirty && match && pendingPorts.length === 0
          ? 'ALLOW_OBSERVED_ONLY'
          : 'DEFERRED',
      reason: null
    },
    non_claim_chips,
    generated_note:
      'Mission CV builtin honesty double — display only; L17–L27 CLOSED retained; L28 OPEN',
    _builtinDouble: true
  };
}

/**
 * Evaluate honesty surface → ok / refuse codes for ritual decision.
 * @param {object} surface
 * @param {object} [acks] { ackDirtyDefer, ackFreezeLagUnmeasured }
 * @returns {{ ok: boolean, refuseCodes: string[], freezeLagMeasured: boolean, dirtyDeferred: boolean, primaryRefuse: string|null }}
 */
export function evaluateHonestyOk(surface, acks = {}) {
  const refuses = [];
  const dirty = surface?.dirty?.dirty === true;
  const dirtyDeferred = dirty === true;
  const ackDirty =
    acks.ackDirtyDefer === true ||
    surface?.dirty?.optimistic_allowed === true;

  if (dirty && !ackDirty) {
    refuses.push(CV_REFUSE_CODES.DIRTY_WITHOUT_ACK);
  }

  const rev = surface?.revision || {};
  const freezeLagMeasured = rev.lag_measurable === true || rev.match === true;
  const ackLag = acks.ackFreezeLagUnmeasured === true;
  const divergeUnmeasured =
    rev.match === false && rev.lag_measurable !== true;

  if (divergeUnmeasured && !ackLag) {
    refuses.push(CV_REFUSE_CODES.FREEZE_LAG_UNMEASURED_WITHOUT_ACK);
  }

  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(CV_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }

  const ok = refuses.length === 0;
  return {
    ok,
    refuseCodes: refuses,
    freezeLagMeasured,
    dirtyDeferred,
    primaryRefuse: ok ? null : refuses[0]
  };
}

/**
 * Map ritualMode + honesty ok → decision.
 * ACTIVE + honesty ok → PASS
 * HOLD → HOLD (observe-only; still seals ritual)
 * ACTIVE + honesty refuse → DENY
 * @param {string} ritualMode
 * @param {{ ok: boolean }|null} honestyEval
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForRitual(ritualMode, honestyEval) {
  if (ritualMode === 'HOLD') return 'HOLD';
  if (honestyEval && honestyEval.ok === true) return 'PASS';
  return 'DENY';
}

/**
 * HUD/Doctor Honesty Ritual Composition Port — hermetic.
 */
export class HudDoctorHonestyRitualPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxReasons]
   * @param {object} [options.honesty] { buildHonestySurface, ... }
   * @param {string} [options.honestyModulePath]
   * @param {boolean} [options.preferBuiltinDouble]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new HudDoctorHonestyRitualPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });

    /** @type {object|null} */
    this._injectedHonesty = options.honesty || null;
    this._honestyModulePath = options.honestyModulePath || null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    /** @type {object|null} */
    this._resolvedHonesty = null;

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
   * Resolve honesty module (inject → soft-import → builtin double).
   * @returns {Promise<object>}
   */
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
        buildHonestySurface: builtinHonestyDouble,
        measureRevisionLag: null,
        evaluateDirtyState: null,
        collectNonClaimChips: null,
        HONESTY_SCHEMA: 'eos.doctor-hud-honesty.v1',
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedHonesty;
    }
    if (!this._resolvedHonesty) {
      const soft = await softImportHonesty(this._honestyModulePath);
      if (soft) {
        this._resolvedHonesty = soft;
      } else {
        this._resolvedHonesty = {
          buildHonestySurface: builtinHonestyDouble,
          measureRevisionLag: null,
          evaluateDirtyState: null,
          collectNonClaimChips: null,
          HONESTY_SCHEMA: 'eos.doctor-hud-honesty.v1',
          HONESTY_PRODUCTION_READY: 'NO',
          source: 'builtin-double'
        };
      }
    }
    return this._resolvedHonesty;
  }

  /**
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildHudDoctorHonestyRitualReceipt(
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
      ritualMode:
        plan?.ritualMode != null ? String(plan.ritualMode) : null,
      ritualDigest:
        plan?.ritualDigest != null && String(plan.ritualDigest).trim() !== ''
          ? String(plan.ritualDigest)
          : this.hashFn({ deny: true, planId: plan?.planId || null }),
      honestyOk: extra.honestyOk ?? false,
      freezeLagMeasured: extra.freezeLagMeasured ?? null,
      dirtyDeferred: extra.dirtyDeferred ?? null,
      nonClaimChips: extra.nonClaimChips || [],
      pendingPorts: extra.pendingPorts || [],
      cqCtObserveLabels: extra.cqCtObserveLabels || [],
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
      ritualMode:
        plan?.ritualMode != null ? String(plan.ritualMode) : undefined,
      honestyOk: extra.honestyOk ?? false,
      freezeLagMeasured: extra.freezeLagMeasured ?? null,
      dirtyDeferred: extra.dirtyDeferred ?? null,
      nonClaimChips: extra.nonClaimChips || [],
      pendingPorts: extra.pendingPorts || [],
      cqCtObserveLabels: extra.cqCtObserveLabels || [],
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      reasons,
      receipt,
      honesty: extra.honesty || null,
      safeAutomationIds: [...CV_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern an honesty ritual plan → PASS | DENY | HOLD + sealed CV receipt.
   * Hermetic: no network; compose B honesty; never Fundacion write / never flip
   * PRODUCTION_READY / never tip-rewrite / never L27 reopen.
   *
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal = evaluation.code === CV_CODES.AUTO_SEAL_CLAIM_DENY;
      const autoProd =
        evaluation.code === CV_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === CV_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        humanGateHeld: autoSeal || autoProd,
        refuseCodes: [evaluation.code],
        cqCtObserveLabels: Array.isArray(plan?.cqCtObserveLabels)
          ? plan.cqCtObserveLabels.map(String)
          : []
      });
    }

    this._governSeq += 1;
    const {
      planId,
      changeId,
      ritualMode,
      ritualPhase,
      ritualDigest: planDigest,
      honestyInput,
      honestySurface,
      honestySnapshot,
      cqCtObserveLabels,
      ackDirtyDefer,
      ackFreezeLagUnmeasured,
      reasons: planReasons
    } = evaluation;

    let honesty = null;

    if (honestySnapshot && typeof honestySnapshot === 'object') {
      honesty = { ...honestySnapshot };
    } else if (honestySurface && typeof honestySurface === 'object' && honestySurface.schema) {
      honesty = { ...honestySurface };
    } else if (ritualMode === 'HOLD' && !honestyInput && !honestySurface) {
      honesty = {
        schema: 'eos.doctor-hud-honesty.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        revision: {
          epistemic: 'OBSERVED',
          match: true,
          lag_measurable: true,
          lag_commits: 0,
          lag_label: 'HOLD observe — honesty ritual; ≠ automatic closure'
        },
        dirty: {
          dirty: false,
          deferred: false,
          blocked: false,
          optimistic_allowed: true
        },
        pending_ports: [],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L28 closeout'
        ],
        note: 'HOLD observe — HUD/Doctor honesty ritual; ≠ automatic closure'
      };
    } else {
      const runner = await this.resolveHonesty();
      const input = {
        freezeRevision: '62d430fb9f53641809d8825ee9e676f13bc5b48c',
        sourceRevision: '62d430fb9f53641809d8825ee9e676f13bc5b48c',
        lagCommits: 0,
        dirty: false,
        pendingPorts: [],
        surface: 'ritual',
        ...(honestyInput || {})
      };
      honesty = runner.buildHonestySurface(input);
      honesty = {
        ...honesty,
        PRODUCTION_READY: 'NO'
      };
    }

    const honestyEval = evaluateHonestyOk(honesty, {
      ackDirtyDefer,
      ackFreezeLagUnmeasured
    });
    const decision = decisionForRitual(ritualMode, honestyEval);

    const nonClaimChips = Array.isArray(honesty?.non_claim_chips)
      ? honesty.non_claim_chips.map(String)
      : [];
    const pendingPorts = Array.isArray(honesty?.pending_ports)
      ? honesty.pending_ports.map(String)
      : [];

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: CV_CODES.HONESTY_REFUSE_DENY,
          reason: `Honesty refused: ${honestyEval.primaryRefuse || 'unknown'} (HUD/Doctor honesty ritual ≠ PRODUCTION_READY flip)`
        },
        {
          honestyOk: false,
          freezeLagMeasured: honestyEval.freezeLagMeasured,
          dirtyDeferred: honestyEval.dirtyDeferred,
          refuseCodes: honestyEval.refuseCodes.length
            ? honestyEval.refuseCodes
            : [CV_REFUSE_CODES.HONESTY_NOT_OK],
          nonClaimChips,
          pendingPorts,
          cqCtObserveLabels,
          honesty,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? CV_CODES.GOVERN_PASS : CV_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `hud-doctor-honesty-ritual govern ${decision}: changeId=${changeId} ritualMode=${ritualMode} ritualPhase=${ritualPhase} planId=${planId}`,
      'NON-CLAIM: HUD/Doctor honesty ritual ≠ PRODUCTION_READY flip ≠ L27 reopen ≠ tip rewrite',
      'A6_PRESERVE_FUNDACION_ALWAYS_DENY + A7_PRESERVE_HUMAN_PROD_GATE held',
      'A8_REFUSE_TIP_REWRITE + A9_REFUSE_L27_REOPEN held'
    ];

    const ritualDigest =
      planDigest ||
      this.hashFn({
        changeId,
        ritualMode,
        ritualPhase,
        honestyOk: honestyEval.ok,
        freezeLagMeasured: honestyEval.freezeLagMeasured,
        dirtyDeferred: honestyEval.dirtyDeferred,
        refuseCodes: honestyEval.refuseCodes,
        decision
      });

    const honestySurfaceDigest = this.hashFn({
      schema: honesty?.schema || null,
      revision: honesty?.revision || null,
      dirty: honesty?.dirty || null,
      pending_ports: pendingPorts,
      non_claim_chips: nonClaimChips
    });

    const ritualPlanDigest = this.hashFn({
      planId,
      changeId,
      ritualDigest,
      ritualMode,
      ritualPhase,
      decision,
      honestyEval,
      cqCtObserveLabels
    });

    const record = Object.freeze({
      planId,
      changeId,
      ritualDigest,
      ritualMode,
      ritualPhase,
      decision,
      honestyOk: honestyEval.ok,
      freezeLagMeasured: honestyEval.freezeLagMeasured,
      dirtyDeferred: honestyEval.dirtyDeferred,
      nonClaimChips: Object.freeze([...nonClaimChips]),
      pendingPorts: Object.freeze([...pendingPorts]),
      cqCtObserveLabels: Object.freeze([...cqCtObserveLabels]),
      refuseCodes: Object.freeze([...honestyEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      ritualPlanDigest,
      honestySurfaceDigest,
      governedAt: new Date().toISOString()
    });

    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      ritualMode,
      ritualDigest,
      honestyOk: honestyEval.ok,
      freezeLagMeasured: honestyEval.freezeLagMeasured,
      dirtyDeferred: honestyEval.dirtyDeferred,
      nonClaimChips,
      pendingPorts,
      cqCtObserveLabels,
      refuseCodes: honestyEval.refuseCodes,
      humanGateHeld: false,
      autoSealRefused: false,
      autoProductionFlipRefused: false,
      reasons,
      ritualPlanDigest,
      honestySurfaceDigest,
      meta: {
        code,
        reasons,
        ritualPlanDigest,
        ritualMode,
        ritualPhase,
        honestySource: this._resolvedHonesty?.source || 'snapshot',
        cqCtObserveLabels,
        safeAutomationIds: [...CV_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      ritualMode,
      ritualPhase,
      ritualDigest,
      ritualPlanDigest,
      honestyOk: honestyEval.ok,
      freezeLagMeasured: honestyEval.freezeLagMeasured,
      dirtyDeferred: honestyEval.dirtyDeferred,
      nonClaimChips,
      pendingPorts,
      cqCtObserveLabels,
      refuseCodes: honestyEval.refuseCodes,
      reasons,
      receipt,
      honesty,
      safeAutomationIds: [...CV_SAFE_AUTOMATION_IDS]
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
      const verifyRes = verifyHudDoctorHonestyRitualReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CV_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CV_CODES.TRAIL_BREAK,
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
      code: CV_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CV_PORT_PRODUCTION_READY,
  CV_PORT_KIND,
  CV_PRODUCTION_READY,
  CV_RECEIPT_KIND,
  CV_CODES,
  CV_SAFE_AUTOMATION_IDS,
  CV_REFUSE_CODES,
  softImportHonesty,
  builtinHonestyDouble,
  evaluateHonestyOk,
  decisionForRitual,
  HudDoctorHonestyRitualPort
};
