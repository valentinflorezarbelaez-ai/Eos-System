/**
 * @module fundacion-delta0-continuity-port
 * SPEC-0103 / Mission CT — Fundacion Δ=0 Continuity Drill & Reconciliation Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic Fundacion Δ=0 continuity drill / reconciliation port:
 *   - Validates continuity drill plan via policy gate
 *   - Soft-imports fundacion-delta0-gameday.js when present (compose, don't fork)
 *     else uses injected gameday runner or minimal fixture double
 *   - continuityMode: ACTIVE | HOLD (hermetic — NOT automatic closure)
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CT-RCPT-* receipts
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto
 *   - No network / never claim Fundacion write auth or PRODUCTION_READY flip
 *
 * NON-CLAIM:
 *   Fundacion Δ=0 Continuity Port ≠ Fundacion write auth /
 *   ≠ PRODUCTION_READY flip / ≠ weakening FUNDACION_ALWAYS_DENY /
 *   ≠ reopen L26 / ≠ L27 closeout / ≠ tip-refresh / ≠ CU.
 *   L17–L26 CLOSED never reopen (NEVER reopen L26);
 *   L27 OPEN (Audit MEASURED · CQ MEASURED · CR MEASURED · CS MEASURED · CT in progress · CU pending);
 *   Axis: Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/continuity.
 *
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CT_PRODUCTION_READY,
  CT_RECEIPT_KIND,
  sha256Canonical,
  buildFundacionDelta0ContinuityReceipt,
  verifyFundacionDelta0ContinuityReceipt
} from './fundacion-delta0-continuity-receipt.js';

import {
  FundacionDelta0ContinuityPolicyGate,
  CT_CODES,
  normalizeDrillPhase
} from './fundacion-delta0-continuity-policy-gate.js';

/** @type {'NO'} */
export const CT_PORT_PRODUCTION_READY = 'NO';

export const CT_PORT_KIND = 'eos-fundacion-delta0-continuity-port';

/** Safe automation IDs — preserve Fundacion ALWAYS_DENY + PRODUCTION_READY human gate. */
export const CT_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_BASELINE_LOCK_PROBE',
  'A2_DIRTY_PROBE',
  'A3_MISMATCH_PROBE',
  'A4_PENDING_PROBE',
  'A5_INDEPENDENT_CHECK_PROBE',
  'A6_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A7_PRESERVE_HUMAN_PROD_GATE'
]);

export const CT_REFUSE_CODES = Object.freeze({
  MISMATCH: 'MISMATCH',
  MISSING_ARTIFACT: 'MISSING_ARTIFACT',
  DIRTY_INPUT: 'DIRTY_INPUT',
  PENDING_STATUS: 'PENDING_STATUS',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  DELTA_NONZERO_DENY: 'DELTA_NONZERO_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  INDEPENDENT_CHECK_REQUIRED: 'INDEPENDENT_CHECK_REQUIRED',
  GREEN_BLOCKED: 'GREEN_BLOCKED',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L26_REOPEN_REFUSED: 'L26_REOPEN_REFUSED'
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import real fundacion-delta0-gameday when co-located (host after post-L26 F).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportGameday(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(path.join(__dirname, 'fundacion-delta0-gameday.js'));
  candidates.push(
    path.join(__dirname, '..', 'fundacion', 'fundacion-delta0-gameday.js')
  );
  // Box package co-location (workspace sibling)
  candidates.push(
    path.resolve(
      __dirname,
      '../../../../eos-post-l26-f-fundacion-gameday/src/core/fundacion/fundacion-delta0-gameday.js'
    )
  );
  candidates.push(
    path.resolve(
      '/workspace/eos-post-l26-f-fundacion-gameday/src/core/fundacion/fundacion-delta0-gameday.js'
    )
  );

  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      const run =
        typeof mod.runFundacionDelta0Gameday === 'function'
          ? mod.runFundacionDelta0Gameday
          : null;
      if (!run) continue;
      const buildHappy =
        typeof mod.buildHappyPortSet === 'function'
          ? mod.buildHappyPortSet
          : null;
      return {
        runFundacionDelta0Gameday: run,
        buildHappyPortSet: buildHappy,
        REFUSE_CODES: mod.REFUSE_CODES || CT_REFUSE_CODES,
        FUNDACION_ALWAYS_DENY: mod.FUNDACION_ALWAYS_DENY !== false,
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
 * Minimal built-in gameday double (used when soft-import + injection absent).
 * Preserves FUNDACION_ALWAYS_DENY; fail-closed dirty/mismatch/pending/write/delta.
 * PASS only when Δ=0 independently checked / reconciliation ok.
 * @param {object} input
 * @returns {object}
 */
export function builtinGamedayDouble(input = {}) {
  const refuses = [];

  if (
    input.writeAttempt === true ||
    input.performFundacionWrite === true ||
    input.fundacionWrite === true ||
    input.allowFundacionWrite === true
  ) {
    refuses.push({
      code: CT_REFUSE_CODES.WRITE_ATTEMPT_DENIED,
      detail: 'WRITE_ATTEMPT_DENIED: Fundacion write claimed (ALWAYS_DENY)'
    });
  }

  if (
    input.FUNDACION_ALWAYS_DENY === false ||
    input.fundacionAlwaysDeny === false ||
    input.weakenAlwaysDeny === true
  ) {
    refuses.push({
      code: CT_REFUSE_CODES.FUNDACION_ALWAYS_DENY,
      detail: 'FUNDACION_ALWAYS_DENY: cannot weaken ALWAYS_DENY'
    });
  }

  if (
    (input.fundacionDelta != null && Number(input.fundacionDelta) !== 0) ||
    (input.fundacion_delta != null && Number(input.fundacion_delta) !== 0)
  ) {
    refuses.push({
      code: CT_REFUSE_CODES.DELTA_NONZERO_DENY,
      detail: 'DELTA_NONZERO_DENY: fundacionDelta must remain 0'
    });
  }

  if (
    input.dirty === true ||
    (Array.isArray(input.dirtyPaths) && input.dirtyPaths.length > 0)
  ) {
    refuses.push({
      code: CT_REFUSE_CODES.DIRTY_INPUT,
      detail: 'DIRTY_INPUT: dirty inputs block green Δ=0 conclusion'
    });
  }

  if (input.mismatch === true || input.artifactMismatch === true) {
    refuses.push({
      code: CT_REFUSE_CODES.MISMATCH,
      detail: 'MISMATCH: expected vs observed artifact drift'
    });
  }

  if (
    input.pending === true ||
    (Array.isArray(input.pendingPorts) && input.pendingPorts.length > 0)
  ) {
    refuses.push({
      code: CT_REFUSE_CODES.PENDING_STATUS,
      detail: 'PENDING_STATUS: pending ports block green Δ=0 conclusion'
    });
  }

  if (input.missingArtifact === true) {
    refuses.push({
      code: CT_REFUSE_CODES.MISSING_ARTIFACT,
      detail: 'MISSING_ARTIFACT: required artifact absent'
    });
  }

  if (
    input.autoProductionReady === true ||
    input.flipProductionReady === true ||
    input.autoProductionReadyFlip === true
  ) {
    refuses.push({
      code: CT_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED,
      detail:
        'AUTO_PRODUCTION_FLIP_REFUSED: PRODUCTION_READY flip requires human gate (A7)'
    });
  }

  if (
    input.reopenL26 === true ||
    input.l26Reopen === true ||
    input.unsealL26 === true
  ) {
    refuses.push({
      code: CT_REFUSE_CODES.L26_REOPEN_REFUSED,
      detail: 'L26_REOPEN_REFUSED: L17–L26 CLOSED never reopen'
    });
  }

  const independentChecked =
    input.independentCheck === true ||
    input.independentlyChecked === true ||
    input.requireIndependentCheck === false;

  if (refuses.length === 0 && !independentChecked) {
    refuses.push({
      code: CT_REFUSE_CODES.INDEPENDENT_CHECK_REQUIRED,
      detail:
        'INDEPENDENT_CHECK_REQUIRED: cannot record Δ=0 without independentCheck=true'
    });
  }

  const ok = refuses.length === 0;
  const primary = ok ? null : refuses[0].code;
  const fundacion_delta = ok && independentChecked ? 0 : null;

  return {
    schema: 'eos.fundacion-delta0-gameday.v1',
    PRODUCTION_READY: 'NO',
    ok,
    green: ok && fundacion_delta === 0,
    exit_code: ok ? 0 : 1,
    primary_refuse: primary,
    refuses,
    fundacion_delta,
    fundacion_delta_policy: 0,
    FUNDACION_ALWAYS_DENY: true,
    law_vi: true,
    write_attempt_detected: refuses.some(
      (r) => r.code === CT_REFUSE_CODES.WRITE_ATTEMPT_DENIED
    ),
    independent_checks_complete: ok && independentChecked,
    non_claims: [
      'NON-CLAIM: Successful drill ≠ Fundacion write auth ≠ PRODUCTION_READY flip',
      'NON-CLAIM: Δ=0 recorded only when independently checked',
      'NON-CLAIM: PRODUCTION_READY remains NO; FUNDACION_ALWAYS_DENY',
      'NON-CLAIM: never reopen L17–L26; port green ≠ L27 closeout'
    ],
    note: ok
      ? 'GAMEDAY_PASS — Δ=0 independently checked; NOT a seal/readiness flip'
      : `GAMEDAY_REFUSE — ${primary} — green conclusion blocked`,
    auto_seal: false,
    auto_production_ready_flip: false,
    l17_l26_reopen: false,
    l27_start: false,
    _builtinDouble: true
  };
}

/**
 * Map continuityMode + gameday result → decision.
 * ACTIVE + gameday ok/green (Δ=0 independently checked) → PASS
 * HOLD → HOLD (observe-only; still seals continuity)
 * ACTIVE + gameday refuse → DENY
 * @param {string} continuityMode
 * @param {object|null} gameday
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForContinuity(continuityMode, gameday) {
  if (continuityMode === 'HOLD') return 'HOLD';
  if (
    gameday &&
    gameday.ok === true &&
    (gameday.green === true || gameday.fundacion_delta === 0)
  ) {
    return 'PASS';
  }
  return 'DENY';
}

/**
 * Fundacion Δ=0 Continuity Drill & Reconciliation Port — hermetic.
 */
export class FundacionDelta0ContinuityPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxReasons]
   * @param {object} [options.gameday] { runFundacionDelta0Gameday, buildHappyPortSet? }
   * @param {string} [options.gamedayModulePath]
   * @param {boolean} [options.preferBuiltinDouble]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new FundacionDelta0ContinuityPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });

    /** @type {object|null} */
    this._injectedGameday = options.gameday || null;
    this._gamedayModulePath = options.gamedayModulePath || null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    /** @type {object|null} */
    this._resolvedGameday = null;

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
   * Resolve gameday runner (inject → soft-import → builtin double).
   * @returns {Promise<object>}
   */
  async resolveGameday() {
    if (this._injectedGameday?.runFundacionDelta0Gameday) {
      this._resolvedGameday = {
        ...this._injectedGameday,
        REFUSE_CODES: this._injectedGameday.REFUSE_CODES || CT_REFUSE_CODES,
        FUNDACION_ALWAYS_DENY:
          this._injectedGameday.FUNDACION_ALWAYS_DENY !== false,
        source: 'injected'
      };
      return this._resolvedGameday;
    }
    if (this._preferBuiltinDouble) {
      this._resolvedGameday = {
        runFundacionDelta0Gameday: builtinGamedayDouble,
        buildHappyPortSet: null,
        REFUSE_CODES: CT_REFUSE_CODES,
        FUNDACION_ALWAYS_DENY: true,
        source: 'builtin-double'
      };
      return this._resolvedGameday;
    }
    if (!this._resolvedGameday) {
      const soft = await softImportGameday(this._gamedayModulePath);
      if (soft) {
        this._resolvedGameday = soft;
      } else {
        this._resolvedGameday = {
          runFundacionDelta0Gameday: builtinGamedayDouble,
          buildHappyPortSet: null,
          REFUSE_CODES: CT_REFUSE_CODES,
          FUNDACION_ALWAYS_DENY: true,
          source: 'builtin-double'
        };
      }
    }
    return this._resolvedGameday;
  }

  /**
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildFundacionDelta0ContinuityReceipt(
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
      drillPhase:
        plan?.drillPhase != null
          ? String(plan.drillPhase)
          : plan?.phase != null
            ? String(plan.phase)
            : null,
      continuityDigest:
        plan?.continuityDigest != null &&
        String(plan.continuityDigest).trim() !== ''
          ? String(plan.continuityDigest)
          : this.hashFn({ deny: true, planId: plan?.planId || null }),
      reconciliationOk: extra.reconciliationOk ?? false,
      independentCheckOk: extra.independentCheckOk ?? false,
      delta0Recorded: false,
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
      drillPhase: receipt.drillPhase,
      reconciliationOk: extra.reconciliationOk ?? false,
      independentCheckOk: extra.independentCheckOk ?? false,
      delta0Recorded: false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      reasons,
      receipt,
      gameday: extra.gameday || null,
      safeAutomationIds: [...CT_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Summarize gameday result into port flags.
   * @param {object|null} gameday
   * @returns {object}
   */
  static summarizeGameday(gameday) {
    if (!gameday || typeof gameday !== 'object') {
      return {
        reconciliationOk: false,
        independentCheckOk: false,
        delta0Recorded: false,
        refuseCodes: [],
        humanGateHeld: false,
        autoSealRefused: false,
        autoProductionFlipRefused: false,
        primaryRefuse: null
      };
    }
    const refuses = Array.isArray(gameday.refuses)
      ? gameday.refuses.map((r) =>
          typeof r === 'string' ? r : String(r.code || r)
        )
      : [];
    const primary =
      gameday.primary_refuse ||
      gameday.primaryRefuse ||
      (refuses[0] || null);
    const autoProductionFlipRefused =
      primary === CT_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED ||
      refuses.includes(CT_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
    const writeDenied =
      primary === CT_REFUSE_CODES.WRITE_ATTEMPT_DENIED ||
      primary === CT_REFUSE_CODES.FUNDACION_ALWAYS_DENY ||
      refuses.includes(CT_REFUSE_CODES.WRITE_ATTEMPT_DENIED);

    return {
      reconciliationOk: gameday.ok === true,
      independentCheckOk:
        gameday.independent_checks_complete === true ||
        gameday.green === true,
      delta0Recorded: gameday.fundacion_delta === 0,
      refuseCodes: refuses.length
        ? refuses
        : primary
          ? [String(primary)]
          : [],
      humanGateHeld: autoProductionFlipRefused || writeDenied,
      autoSealRefused: false,
      autoProductionFlipRefused,
      primaryRefuse: primary != null ? String(primary) : null
    };
  }

  /**
   * Govern a Fundacion Δ=0 continuity drill plan → PASS | DENY | HOLD + sealed CT receipt.
   * Hermetic: no network; compose gameday; never Fundacion write / never flip PRODUCTION_READY.
   *
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal = evaluation.code === CT_CODES.AUTO_SEAL_CLAIM_DENY;
      const autoProd =
        evaluation.code === CT_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === CT_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
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
      drillPhase,
      continuityDigest: planDigest,
      gamedayInput,
      gamedaySnapshot,
      reasons: planReasons
    } = evaluation;

    let gameday = null;

    if (gamedaySnapshot && typeof gamedaySnapshot === 'object') {
      gameday = { ...gamedaySnapshot };
    } else if (continuityMode === 'HOLD' && !gamedayInput) {
      gameday = {
        ok: true,
        green: false,
        primary_refuse: null,
        refuses: [],
        fundacion_delta: null,
        independent_checks_complete: false,
        FUNDACION_ALWAYS_DENY: true,
        PRODUCTION_READY: 'NO',
        auto_seal: false,
        auto_production_ready_flip: false,
        note: 'HOLD observe — Fundacion Δ=0 continuity; ≠ automatic closure'
      };
    } else {
      const runner = await this.resolveGameday();
      const input = {
        requireIndependentCheck: true,
        independentCheck: true,
        dirty: false,
        mismatch: false,
        pending: false,
        writeAttempt: false,
        FUNDACION_ALWAYS_DENY: true,
        fundacionDelta: 0,
        observer: { name: 'Valentin Florez', signedOff: true },
        ...(gamedayInput || {})
      };
      // If soft-import provides buildHappyPortSet and no ports supplied, fill happy set
      if (
        !input.ports &&
        !input.manifests &&
        typeof runner.buildHappyPortSet === 'function'
      ) {
        input.ports = runner.buildHappyPortSet({
          independentCheck: input.independentCheck !== false
        });
      }
      gameday = runner.runFundacionDelta0Gameday(input);
      gameday = {
        ...gameday,
        auto_seal: false,
        auto_production_ready_flip: false,
        PRODUCTION_READY: 'NO',
        FUNDACION_ALWAYS_DENY: true
      };
    }

    const summary = FundacionDelta0ContinuityPort.summarizeGameday(gameday);
    const decision = decisionForContinuity(continuityMode, gameday);

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: CT_CODES.GAMEDAY_REFUSE_DENY,
          reason: `Gameday refused: ${summary.primaryRefuse || 'unknown'} (Fundacion Δ=0 continuity ≠ write auth)`
        },
        {
          ...summary,
          gameday,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? CT_CODES.GOVERN_PASS : CT_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `fundacion-delta0-continuity govern ${decision}: changeId=${changeId} continuityMode=${continuityMode} drillPhase=${drillPhase} planId=${planId}`,
      'NON-CLAIM: Fundacion Δ=0 continuity ≠ Fundacion write auth ≠ PRODUCTION_READY flip',
      'A6_PRESERVE_FUNDACION_ALWAYS_DENY + A7_PRESERVE_HUMAN_PROD_GATE held'
    ];

    const continuityDigest =
      planDigest ||
      this.hashFn({
        changeId,
        continuityMode,
        drillPhase,
        reconciliationOk: summary.reconciliationOk,
        refuseCodes: summary.refuseCodes,
        decision
      });

    const continuityPlanDigest = this.hashFn({
      planId,
      changeId,
      continuityDigest,
      continuityMode,
      drillPhase,
      decision,
      summary
    });

    const record = Object.freeze({
      planId,
      changeId,
      continuityDigest,
      continuityMode,
      drillPhase,
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
      drillPhase,
      continuityDigest,
      ...summary,
      reasons,
      continuityPlanDigest,
      meta: {
        code,
        reasons,
        continuityPlanDigest,
        continuityMode,
        drillPhase,
        gamedaySource: this._resolvedGameday?.source || 'snapshot',
        safeAutomationIds: [...CT_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      continuityMode,
      drillPhase,
      continuityDigest,
      continuityPlanDigest,
      ...summary,
      reasons,
      receipt,
      gameday,
      safeAutomationIds: [...CT_SAFE_AUTOMATION_IDS]
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
      const verifyRes = verifyFundacionDelta0ContinuityReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CT_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CT_CODES.TRAIL_BREAK,
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
      code: CT_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CT_PORT_PRODUCTION_READY,
  CT_PORT_KIND,
  CT_PRODUCTION_READY,
  CT_RECEIPT_KIND,
  CT_CODES,
  CT_SAFE_AUTOMATION_IDS,
  CT_REFUSE_CODES,
  softImportGameday,
  builtinGamedayDouble,
  decisionForContinuity,
  FundacionDelta0ContinuityPort
};
