/**
 * @module local-ci-continuity-port
 * SPEC-0100 / Mission CQ — Local CI Continuity Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic local-CI continuity port:
 *   - Validates continuity plan via policy gate
 *   - Soft-imports local-ci-surrogate.js when present (compose, don't rewrite)
 *     else uses injected surrogate or minimal fixture double
 *   - continuityMode: ACTIVE | HOLD (hermetic — NOT GHA green)
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CQ-RCPT-* receipts with forced ci_environment:
 *       github_actions=BILLING_BLOCKED, local_surrogate=ACTIVE,
 *       github_actions_verdict=NOT_RUN
 *   - No network / no GH API / never claim GH green
 *
 * NON-CLAIM:
 *   Local CI Continuity Port ≠ GitHub Actions green /
 *   ≠ GHE required-check enforcement /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES /
 *   ≠ reopen L26 / ≠ L27 closeout.
 *   L17–L26 CLOSED never reopen (NEVER reopen L26);
 *   L27 OPEN (Audit MEASURED · CQ in progress · CR–CU pending);
 *   Axis: Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/ci.
 *
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CQ_PRODUCTION_READY,
  CQ_RECEIPT_KIND,
  sha256Canonical,
  forceCiEnvironment,
  buildLocalCiContinuityReceipt,
  verifyLocalCiContinuityReceipt
} from './local-ci-continuity-receipt.js';

import {
  LocalCiContinuityPolicyGate,
  CQ_CODES
} from './local-ci-continuity-policy-gate.js';

/** @type {'NO'} */
export const CQ_PORT_PRODUCTION_READY = 'NO';

export const CQ_PORT_KIND = 'eos-local-ci-continuity-port';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import real local-ci-surrogate when co-located (host after post-L26 C).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportSurrogate(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(path.join(__dirname, 'local-ci-surrogate.js'));

  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      if (typeof mod.runLocalCiSurrogate === 'function') {
        return {
          runLocalCiSurrogate: mod.runLocalCiSurrogate,
          buildCiEnvironment:
            typeof mod.buildCiEnvironment === 'function'
              ? mod.buildCiEnvironment
              : null,
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
 * Minimal built-in fixture double (used when soft-import + injection absent).
 * Preserves BILLING_BLOCKED encoding; fail-closed dirty/stale/drift/verify.
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function builtinSurrogateDouble(input = {}) {
  const failures = [];

  if (input.dirty === true) {
    failures.push({ code: 'DIRTY_TREE', detail: 'DIRTY_TREE' });
  }
  if (input.stale === true || input.freezeStale === true) {
    failures.push({ code: 'STALE_FREEZE', detail: 'STALE_FREEZE' });
  }
  if (input.drift === true || input.missionPackDrift === true) {
    failures.push({ code: 'MISSION_PACK_DRIFT', detail: 'MISSION_PACK_DRIFT' });
  }

  let verifyOk = true;
  if (input.recordedResult && typeof input.recordedResult === 'object') {
    verifyOk =
      input.recordedResult.ok === true &&
      Number(input.recordedResult.exitCode ?? 1) === 0;
  } else if (input.verifyFail === true) {
    verifyOk = false;
  } else if (
    input.skipVerifyStrict !== true &&
    input.assumeVerifyPass !== true &&
    input.recordedResult == null &&
    typeof input.runner !== 'function'
  ) {
    failures.push({
      code: 'MISSING_PREREQUISITES',
      detail: 'missing verify evidence'
    });
    verifyOk = false;
  }

  if (
    !verifyOk &&
    !failures.some((f) => f.code === 'MISSING_PREREQUISITES')
  ) {
    failures.push({
      code: 'VERIFY_STRICT_FAIL',
      detail: 'verify:strict failed'
    });
  }

  if (input.missingEvidence === true) {
    failures.push({ code: 'MISSING_EVIDENCE', detail: 'missing evidence' });
  }

  const ok = failures.length === 0;
  const primary = ok ? null : failures[0].code;
  const ci_environment = forceCiEnvironment(input.ciEnvironmentOverrides);

  return {
    schema: 'eos.local-ci-surrogate.v1',
    PRODUCTION_READY: 'NO',
    ok,
    exit_code: ok ? 0 : 1,
    primary_failure: primary,
    failures,
    ci_environment,
    dirty: { dirty: input.dirty === true, blocked: input.dirty === true },
    freeze_lag: {
      stale: input.stale === true || input.freezeStale === true,
      lag_label: input.stale || input.freezeStale ? 'STALE' : 'MATCH'
    },
    mission_pack: {
      drift: {
        drifted: input.drift === true || input.missionPackDrift === true
      }
    },
    verify_strict: {
      ok: verifyOk,
      exit_code: verifyOk ? 0 : 6,
      source: 'builtin-double'
    },
    non_claims: [
      'NON-CLAIM: Local success ≠ GitHub Actions success ≠ production readiness'
    ],
    note: ok
      ? 'LOCAL_SURROGATE_PASS — BILLING_BLOCKED; NOT GHA green'
      : `LOCAL_SURROGATE_FAIL — ${primary}`,
    fundacion_delta: 0,
    law_vi: true,
    _builtinDouble: true
  };
}

/**
 * Map continuityMode + surrogate result → decision.
 * ACTIVE + surrogate ok → PASS
 * HOLD → HOLD (observe-only; still seals BILLING_BLOCKED)
 * ACTIVE + surrogate fail → DENY
 * @param {string} continuityMode
 * @param {object|null} gate
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForContinuity(continuityMode, gate) {
  if (continuityMode === 'HOLD') return 'HOLD';
  if (gate && gate.ok === true) return 'PASS';
  return 'DENY';
}

/**
 * Local CI Continuity Port — hermetic.
 */
export class LocalCiContinuityPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxReasons]
   * @param {object} [options.surrogate] { runLocalCiSurrogate, buildCiEnvironment? }
   * @param {string} [options.surrogateModulePath]
   * @param {boolean} [options.preferBuiltinDouble]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new LocalCiContinuityPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });

    /** @type {object|null} */
    this._injectedSurrogate = options.surrogate || null;
    this._surrogateModulePath = options.surrogateModulePath || null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    /** @type {object|null} */
    this._resolvedSurrogate = null;

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
   * Resolve surrogate runner (inject → soft-import → builtin double).
   * @returns {Promise<object>}
   */
  async resolveSurrogate() {
    if (this._injectedSurrogate?.runLocalCiSurrogate) {
      this._resolvedSurrogate = {
        ...this._injectedSurrogate,
        source: 'injected'
      };
      return this._resolvedSurrogate;
    }
    if (this._preferBuiltinDouble) {
      this._resolvedSurrogate = {
        runLocalCiSurrogate: builtinSurrogateDouble,
        buildCiEnvironment: forceCiEnvironment,
        source: 'builtin-double'
      };
      return this._resolvedSurrogate;
    }
    if (!this._resolvedSurrogate) {
      const soft = await softImportSurrogate(this._surrogateModulePath);
      if (soft) {
        this._resolvedSurrogate = soft;
      } else {
        this._resolvedSurrogate = {
          runLocalCiSurrogate: builtinSurrogateDouble,
          buildCiEnvironment: forceCiEnvironment,
          source: 'builtin-double'
        };
      }
    }
    return this._resolvedSurrogate;
  }

  /**
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildLocalCiContinuityReceipt(
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
    const ciEnvironment = forceCiEnvironment(plan?.ciEnvironment || {});
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      runId: plan?.runId != null ? String(plan.runId) : null,
      decision: 'DENY',
      continuityMode:
        plan?.continuityMode != null ? String(plan.continuityMode) : null,
      continuityDigest:
        plan?.continuityDigest != null &&
        String(plan.continuityDigest).trim() !== ''
          ? String(plan.continuityDigest)
          : this.hashFn({ deny: true, planId: plan?.planId || null }),
      ciEnvironment,
      surrogateOk: extra.surrogateOk ?? false,
      primaryFailure: extra.primaryFailure || evaluation.code,
      dirty: extra.dirty === true,
      stale: extra.stale === true,
      drift: extra.drift === true,
      verifyOk: extra.verifyOk ?? null,
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      runId: plan?.runId != null ? String(plan.runId) : undefined,
      continuityMode:
        plan?.continuityMode != null
          ? String(plan.continuityMode)
          : undefined,
      ciEnvironment,
      surrogateOk: extra.surrogateOk ?? false,
      primaryFailure: extra.primaryFailure || evaluation.code,
      dirty: extra.dirty === true,
      stale: extra.stale === true,
      drift: extra.drift === true,
      verifyOk: extra.verifyOk ?? null,
      reasons,
      receipt,
      gate: extra.gate || null
    };
  }

  /**
   * Extract dirty/stale/drift/verify flags from a surrogate gate result.
   * @param {object|null} gate
   * @returns {object}
   */
  static summarizeGate(gate) {
    if (!gate || typeof gate !== 'object') {
      return {
        surrogateOk: false,
        primaryFailure: null,
        dirty: false,
        stale: false,
        drift: false,
        verifyOk: null
      };
    }
    return {
      surrogateOk: gate.ok === true,
      primaryFailure: gate.primary_failure || null,
      dirty: gate.dirty?.dirty === true || gate.dirty?.blocked === true,
      stale: gate.freeze_lag?.stale === true,
      drift: gate.mission_pack?.drift?.drifted === true,
      verifyOk:
        gate.verify_strict?.ok === true
          ? true
          : gate.verify_strict?.ok === false
            ? false
            : null
    };
  }

  /**
   * Govern a local-CI continuity plan → PASS | DENY | HOLD + sealed CQ receipt.
   * Hermetic: no network, no GH API; compose surrogate semantics; never GH green.
   *
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._governSeq += 1;
    const {
      planId,
      runId,
      continuityMode,
      continuityDigest: planDigest,
      ciEnvironment,
      surrogateInput,
      gateSnapshot,
      reasons: planReasons
    } = evaluation;

    let gate = null;

    if (gateSnapshot && typeof gateSnapshot === 'object') {
      // Pre-recorded surrogate snapshot (tests / host evidence)
      gate = {
        ...gateSnapshot,
        ci_environment: forceCiEnvironment(
          gateSnapshot.ci_environment || ciEnvironment
        )
      };
    } else if (continuityMode === 'HOLD' && !surrogateInput) {
      // HOLD observe-only without running surrogate
      gate = {
        ok: true,
        primary_failure: null,
        dirty: { dirty: false },
        freeze_lag: { stale: false },
        mission_pack: { drift: { drifted: false } },
        verify_strict: { ok: null, source: 'hold_observe' },
        ci_environment: ciEnvironment,
        note: 'HOLD observe — BILLING_BLOCKED; NOT GHA green'
      };
    } else {
      const surrogate = await this.resolveSurrogate();
      const input = {
        assumeVerifyPass: true,
        skipVerifyStrict: false,
        ...(surrogateInput || {})
      };
      gate = await surrogate.runLocalCiSurrogate(input);
      // Force ci_environment honesty even if surrogate returns overrides
      gate = {
        ...gate,
        ci_environment: forceCiEnvironment(
          gate?.ci_environment || ciEnvironment
        )
      };
    }

    const summary = LocalCiContinuityPort.summarizeGate(gate);
    const decision = decisionForContinuity(continuityMode, gate);

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: CQ_CODES.SURROGATE_FAIL_DENY,
          reason: `Surrogate gate failed: ${summary.primaryFailure || 'unknown'} (local ≠ GHA green)`
        },
        { ...summary, gate, reasons: planReasons }
      );
    }

    const code =
      decision === 'PASS' ? CQ_CODES.GOVERN_PASS : CQ_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `local-ci-continuity govern ${decision}: runId=${runId} continuityMode=${continuityMode} planId=${planId}`,
      'ci_environment: github_actions=BILLING_BLOCKED local_surrogate=ACTIVE github_actions_verdict=NOT_RUN'
    ];

    const continuityDigest =
      planDigest ||
      this.hashFn({
        runId,
        continuityMode,
        ciEnvironment,
        surrogateOk: summary.surrogateOk,
        primaryFailure: summary.primaryFailure,
        dirty: summary.dirty,
        stale: summary.stale,
        drift: summary.drift,
        verifyOk: summary.verifyOk
      });

    const continuityPlanDigest = this.hashFn({
      planId,
      runId,
      continuityDigest,
      continuityMode,
      decision,
      summary
    });

    const record = Object.freeze({
      planId,
      runId,
      continuityDigest,
      continuityMode,
      decision,
      ciEnvironment,
      ...summary,
      reasons: Object.freeze([...reasons]),
      continuityPlanDigest,
      governedAt: new Date().toISOString()
    });

    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      runId,
      decision,
      continuityMode,
      continuityDigest,
      ciEnvironment,
      ...summary,
      reasons,
      continuityPlanDigest,
      meta: {
        code,
        reasons,
        continuityPlanDigest,
        continuityMode,
        surrogateSource: this._resolvedSurrogate?.source || 'snapshot'
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      runId,
      continuityMode,
      continuityDigest,
      continuityPlanDigest,
      ciEnvironment,
      ...summary,
      reasons,
      receipt,
      gate
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
      const verifyRes = verifyLocalCiContinuityReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CQ_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CQ_CODES.TRAIL_BREAK,
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
      code: CQ_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CQ_PORT_PRODUCTION_READY,
  CQ_PORT_KIND,
  CQ_PRODUCTION_READY,
  CQ_RECEIPT_KIND,
  CQ_CODES,
  softImportSurrogate,
  builtinSurrogateDouble,
  decisionForContinuity,
  LocalCiContinuityPort
};
