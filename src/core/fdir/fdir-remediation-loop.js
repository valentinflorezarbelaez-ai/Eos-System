/**
 * @module fdir-remediation-loop
 * SPEC-0027 / Mission V — Autonomous FDIR Remediation Loop.
 *
 * Governed diagnose → remediate → verify cycle that consumes a failure
 * context, retries up to maxAttempts, seals SHA-256 audit receipts per
 * cycle (sealEvd-compatible body hash style), and fail-closed escalates
 * to HITL when the attempt budget is exhausted. Optional Mission R
 * sentinel integration quarantines unauthorized mutations / orphans
 * before accepting a remediation attempt.
 *
 * NON-CLAIM:
 *   This is the **eos-fdir-remediation-loop** overlay.
 *   It is NOT agy-daemon, NOT eos-compute-worker-runtime,
 *   NOT the live EOSSentinelDaemon graph, NOT Mission R sentinel itself
 *   (it may *consume* an injected sentinel), and MUST NOT be read as
 *   PRODUCTION_READY or AGY DAEMON_PRESENT.
 *   Prefer not mutating fdir-sentinel-runtime.js / sentinel-daemon.js /
 *   fdir.js / fdir-ontology.js.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 * Hermetic: fixtures in memory/scratch only — no real Fundacion paths.
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FDIR_REMEDIATION_LOOP_PRODUCTION_READY = 'NO';

export const FDIR_REMEDIATION_KIND = 'eos-fdir-remediation-loop';

export const FDIR_REMEDIATION_STATES = Object.freeze({
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  DIAGNOSING: 'DIAGNOSING',
  REMEDIATING: 'REMEDIATING',
  REVERIFYING: 'REVERIFYING',
  RESOLVED: 'RESOLVED',
  ESCALATED_HITL: 'ESCALATED_HITL'
});

export const FDIR_REMEDIATION_CODES = Object.freeze({
  REMEDIATION_RESOLVED: 'REMEDIATION_RESOLVED',
  REMEDIATION_ESCALATED_HITL: 'REMEDIATION_ESCALATED_HITL',
  REMEDIATION_ATTEMPT_FAILED: 'REMEDIATION_ATTEMPT_FAILED',
  REMEDIATION_SENTINEL_QUARANTINE: 'REMEDIATION_SENTINEL_QUARANTINE',
  REMEDIATION_DEPENDENCY: 'REMEDIATION_DEPENDENCY',
  REMEDIATION_BUSY: 'REMEDIATION_BUSY',
  REMEDIATION_INVALID_STATE: 'REMEDIATION_INVALID_STATE'
});

/**
 * Typed error for FDIR remediation loop failures.
 */
export class FdirRemediationLoopError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = 'FDIR_REMEDIATION_ERROR', details = {}) {
    super(message);
    this.name = 'FdirRemediationLoopError';
    this.code = code;
    Object.assign(this, details);
  }
}

/**
 * Default SHA-256 hex — sealEvd / SpecBoot receipt style.
 * @param {string|Buffer|object} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const body =
    typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : JSON.stringify(payload);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Clamp maxAttempts to an integer ≥ 1.
 * @param {unknown} raw
 * @param {number} [fallback=3]
 * @returns {number}
 */
export function clampMaxAttempts(raw, fallback = 3) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

/**
 * Create a governed FDIR remediation loop.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=3] clamped ≥1
 * @param {(ctx: object) => Promise<object>|object} [opts.diagnose] REQUIRED
 * @param {(ctx: object, diagnosis: object) => Promise<object>|object} [opts.remediate] REQUIRED
 * @param {(ctx: object, remediation: object) => Promise<object>|object} [opts.verify] REQUIRED
 * @param {object} [opts.sentinel] optional Mission R–style sentinel
 * @param {(plan: object, ctx: object) => Promise<object>|object} [opts.sentinel.checkRemediation]
 * @param {(pathKey: string, reason: string) => Promise<void>|void} [opts.sentinel.quarantine]
 * @param {(payload: any) => string} [opts.hash]
 * @param {() => string|Date} [opts.now]
 * @param {(receipt: object) => void} [opts.onReceipt]
 * @returns {object} loop instance
 */
export function createFdirRemediationLoop(opts = {}) {
  const maxAttempts = clampMaxAttempts(opts.maxAttempts, 3);
  const hashFn = typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const onReceipt =
    typeof opts.onReceipt === 'function' ? opts.onReceipt : null;

  const diagnoseFn =
    typeof opts.diagnose === 'function' ? opts.diagnose : null;
  const remediateFn =
    typeof opts.remediate === 'function' ? opts.remediate : null;
  const verifyFn = typeof opts.verify === 'function' ? opts.verify : null;

  const sentinel =
    opts.sentinel && typeof opts.sentinel === 'object' ? opts.sentinel : null;

  let state = FDIR_REMEDIATION_STATES.IDLE;
  let attempts = 0;
  let cycles = 0;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  const stateLog = [];
  /** @type {object|null} */
  let lastDiagnosis = null;
  /** @type {object|null} */
  let lastRemediation = null;
  /** @type {object|null} */
  let lastVerify = null;
  /** @type {string|null} */
  let lastFault = null;
  /** @type {object|null} */
  let lastResult = null;
  let busy = false;
  const createdAt = isoNow(nowFn);

  function transition(next) {
    state = next;
    stateLog.push(next);
  }

  function snapshot() {
    return {
      state,
      kind: FDIR_REMEDIATION_KIND,
      PRODUCTION_READY: FDIR_REMEDIATION_LOOP_PRODUCTION_READY,
      maxAttempts,
      attempts,
      cycles,
      receiptCount: receipts.length,
      lastFault,
      lastDiagnosis: lastDiagnosis ? { ...lastDiagnosis } : null,
      createdAt,
      stateLog: [...stateLog]
    };
  }

  function requirePorts() {
    if (!diagnoseFn || !remediateFn || !verifyFn) {
      const missing = [];
      if (!diagnoseFn) missing.push('diagnose');
      if (!remediateFn) missing.push('remediate');
      if (!verifyFn) missing.push('verify');
      lastFault = FDIR_REMEDIATION_CODES.REMEDIATION_DEPENDENCY;
      throw new FdirRemediationLoopError(
        `REMEDIATION_DEPENDENCY: missing ports: ${missing.join(', ')}`,
        FDIR_REMEDIATION_CODES.REMEDIATION_DEPENDENCY,
        { missing }
      );
    }
  }

  /**
   * Seal one audit receipt for a cycle (SHA-256 body hash, sealEvd style).
   * @param {object} partial
   * @returns {object}
   */
  function sealReceipt(partial) {
    const body = {
      kind: FDIR_REMEDIATION_KIND,
      PRODUCTION_READY: 'NO',
      at: isoNow(nowFn),
      attempt: partial.attempt,
      phase: partial.phase,
      status: partial.status,
      code: partial.code,
      diagnosis: partial.diagnosis ?? null,
      remediation: summarizePort(partial.remediation),
      verify: summarizePort(partial.verify),
      failureContext: summarizePort(partial.failureContext),
      sentinel: partial.sentinel ?? null,
      ...((partial.extra && typeof partial.extra === 'object')
        ? partial.extra
        : {})
    };
    const bodySha256 = hashFn(body);
    const receipt = {
      ...body,
      bodySha256,
      sha256: bodySha256,
      id: `FDIR-REM-${String(receipts.length + 1).padStart(4, '0')}`
    };
    receipts.push(receipt);
    if (onReceipt) {
      try {
        onReceipt(receipt);
      } catch {
        // observer faults must not crash the loop
      }
    }
    return receipt;
  }

  /**
   * Optional sentinel gate: if remediation plan would introduce unauthorized
   * mutations / orphans, quarantine and fail the attempt.
   * @param {object} remediation
   * @param {object} ctx
   * @returns {Promise<{ok: boolean, quarantined?: boolean, reason?: string, detail?: object}>}
   */
  async function sentinelGate(remediation, ctx) {
    if (!sentinel) return { ok: true, quarantined: false };

    if (typeof sentinel.checkRemediation === 'function') {
      const verdict = await Promise.resolve(
        sentinel.checkRemediation(remediation, ctx)
      );
      const deny =
        verdict &&
        (verdict.ok === false ||
          verdict.quarantine === true ||
          verdict.unauthorized === true ||
          verdict.orphans === true ||
          (Array.isArray(verdict.orphans) && verdict.orphans.length > 0));
      if (deny) {
        const reason =
          verdict.reason ||
          FDIR_REMEDIATION_CODES.REMEDIATION_SENTINEL_QUARANTINE;
        if (typeof sentinel.quarantine === 'function') {
          const pathKey =
            verdict.pathKey ||
            remediation?.pathKey ||
            ctx?.pathKey ||
            'remediation-plan';
          await Promise.resolve(sentinel.quarantine(pathKey, reason));
        }
        return {
          ok: false,
          quarantined: true,
          reason,
          detail: verdict
        };
      }
      return { ok: true, quarantined: false, detail: verdict };
    }

    // If only quarantine port present without checker — no-op pass
    return { ok: true, quarantined: false };
  }

  function isVerifyOk(verifyResult) {
    if (verifyResult == null) return false;
    if (verifyResult.ok === true || verifyResult.success === true) return true;
    if (verifyResult.verified === true) return true;
    const s = String(verifyResult.status || '').toUpperCase();
    return s === 'OK' || s === 'RESOLVED' || s === 'PASS' || s === 'PASSED';
  }

  /**
   * Run one full remediation cycle against a failure context.
   * Alias: start(failureContext)
   * @param {object} [failureContext]
   * @returns {Promise<object>}
   */
  async function run(failureContext = {}) {
    requirePorts();

    if (busy) {
      throw new FdirRemediationLoopError(
        'REMEDIATION_BUSY: loop already running',
        FDIR_REMEDIATION_CODES.REMEDIATION_BUSY
      );
    }

    busy = true;
    attempts = 0;
    lastDiagnosis = null;
    lastRemediation = null;
    lastVerify = null;
    lastFault = null;
    cycles += 1;
    transition(FDIR_REMEDIATION_STATES.RUNNING);

    const ctx = failureContext && typeof failureContext === 'object'
      ? { ...failureContext }
      : { raw: failureContext };

    try {
      while (attempts < maxAttempts) {
        attempts += 1;
        let diagnosis = null;
        let remediation = null;
        let verifyResult = null;

        // DIAGNOSING
        transition(FDIR_REMEDIATION_STATES.DIAGNOSING);
        try {
          diagnosis = await Promise.resolve(
            diagnoseFn({
              ...ctx,
              attempt: attempts,
              maxAttempts,
              PRODUCTION_READY: 'NO',
              kind: FDIR_REMEDIATION_KIND
            })
          );
        } catch (err) {
          lastFault = err?.message || String(err);
          sealReceipt({
            attempt: attempts,
            phase: 'DIAGNOSING',
            status: 'FAILED',
            code: FDIR_REMEDIATION_CODES.REMEDIATION_ATTEMPT_FAILED,
            failureContext: ctx,
            extra: { error: lastFault }
          });
          continue;
        }
        lastDiagnosis = diagnosis;

        // REMEDIATING
        transition(FDIR_REMEDIATION_STATES.REMEDIATING);
        try {
          remediation = await Promise.resolve(
            remediateFn(
              {
                ...ctx,
                attempt: attempts,
                maxAttempts,
                PRODUCTION_READY: 'NO',
                kind: FDIR_REMEDIATION_KIND
              },
              diagnosis
            )
          );
        } catch (err) {
          lastFault = err?.message || String(err);
          sealReceipt({
            attempt: attempts,
            phase: 'REMEDIATING',
            status: 'FAILED',
            code: FDIR_REMEDIATION_CODES.REMEDIATION_ATTEMPT_FAILED,
            diagnosis,
            failureContext: ctx,
            extra: { error: lastFault }
          });
          continue;
        }
        lastRemediation = remediation;

        // Sentinel gate (optional)
        const gate = await sentinelGate(remediation, {
          ...ctx,
          attempt: attempts,
          diagnosis
        });
        if (!gate.ok) {
          lastFault = gate.reason || FDIR_REMEDIATION_CODES.REMEDIATION_SENTINEL_QUARANTINE;
          sealReceipt({
            attempt: attempts,
            phase: 'REMEDIATING',
            status: 'QUARANTINED',
            code: FDIR_REMEDIATION_CODES.REMEDIATION_SENTINEL_QUARANTINE,
            diagnosis,
            remediation,
            failureContext: ctx,
            sentinel: {
              quarantined: true,
              reason: gate.reason,
              detail: summarizePort(gate.detail)
            }
          });
          // Fail this attempt; if budget exhausted, escalate below
          if (attempts >= maxAttempts) break;
          continue;
        }

        // REVERIFYING
        transition(FDIR_REMEDIATION_STATES.REVERIFYING);
        try {
          verifyResult = await Promise.resolve(
            verifyFn(
              {
                ...ctx,
                attempt: attempts,
                maxAttempts,
                PRODUCTION_READY: 'NO',
                kind: FDIR_REMEDIATION_KIND
              },
              remediation
            )
          );
        } catch (err) {
          lastFault = err?.message || String(err);
          sealReceipt({
            attempt: attempts,
            phase: 'REVERIFYING',
            status: 'FAILED',
            code: FDIR_REMEDIATION_CODES.REMEDIATION_ATTEMPT_FAILED,
            diagnosis,
            remediation,
            failureContext: ctx,
            extra: { error: lastFault }
          });
          continue;
        }
        lastVerify = verifyResult;

        if (isVerifyOk(verifyResult)) {
          transition(FDIR_REMEDIATION_STATES.RESOLVED);
          const receipt = sealReceipt({
            attempt: attempts,
            phase: 'REVERIFYING',
            status: 'RESOLVED',
            code: FDIR_REMEDIATION_CODES.REMEDIATION_RESOLVED,
            diagnosis,
            remediation,
            verify: verifyResult,
            failureContext: ctx
          });
          lastResult = {
            status: FDIR_REMEDIATION_STATES.RESOLVED,
            ok: true,
            attempts,
            maxAttempts,
            receipts: getReceipts(),
            diagnosis: lastDiagnosis,
            remediation: lastRemediation,
            verify: lastVerify,
            PRODUCTION_READY: 'NO',
            kind: FDIR_REMEDIATION_KIND,
            code: FDIR_REMEDIATION_CODES.REMEDIATION_RESOLVED,
            lastReceipt: receipt,
            health: snapshot()
          };
          return lastResult;
        }

        lastFault = FDIR_REMEDIATION_CODES.REMEDIATION_ATTEMPT_FAILED;
        sealReceipt({
          attempt: attempts,
          phase: 'REVERIFYING',
          status: 'FAILED',
          code: FDIR_REMEDIATION_CODES.REMEDIATION_ATTEMPT_FAILED,
          diagnosis,
          remediation,
          verify: verifyResult,
          failureContext: ctx
        });
      }

      // Budget exhausted → ESCALATED_HITL (fail-closed, no throw storm)
      transition(FDIR_REMEDIATION_STATES.ESCALATED_HITL);
      const receipt = sealReceipt({
        attempt: attempts,
        phase: 'ESCALATE',
        status: 'ESCALATED_HITL',
        code: FDIR_REMEDIATION_CODES.REMEDIATION_ESCALATED_HITL,
        diagnosis: lastDiagnosis,
        remediation: lastRemediation,
        verify: lastVerify,
        failureContext: ctx,
        extra: { reason: 'maxAttempts exhausted', maxAttempts }
      });
      lastFault = FDIR_REMEDIATION_CODES.REMEDIATION_ESCALATED_HITL;
      lastResult = {
        status: FDIR_REMEDIATION_STATES.ESCALATED_HITL,
        ok: false,
        attempts,
        maxAttempts,
        receipts: getReceipts(),
        diagnosis: lastDiagnosis,
        remediation: lastRemediation,
        verify: lastVerify,
        PRODUCTION_READY: 'NO',
        kind: FDIR_REMEDIATION_KIND,
        code: FDIR_REMEDIATION_CODES.REMEDIATION_ESCALATED_HITL,
        hitlRequired: true,
        lastReceipt: receipt,
        health: snapshot()
      };
      return lastResult;
    } finally {
      busy = false;
    }
  }

  /** Alias for run — start(failureContext). */
  async function start(failureContext) {
    return run(failureContext);
  }

  function status() {
    return snapshot();
  }

  function health() {
    const h = snapshot();
    h.PRODUCTION_READY = 'NO';
    h.cloudAgent = false;
    h.usesCloudAgent = false;
    h.agyDaemonPresent = false;
    return h;
  }

  function getReceipts() {
    return receipts.map((r) => ({ ...r }));
  }

  function reset() {
    if (busy) {
      throw new FdirRemediationLoopError(
        'REMEDIATION_BUSY: cannot reset while running',
        FDIR_REMEDIATION_CODES.REMEDIATION_BUSY
      );
    }
    transition(FDIR_REMEDIATION_STATES.IDLE);
    attempts = 0;
    lastDiagnosis = null;
    lastRemediation = null;
    lastVerify = null;
    lastFault = null;
    lastResult = null;
    return snapshot();
  }

  return {
    start,
    run,
    status,
    health,
    getReceipts,
    reset,
    PRODUCTION_READY: FDIR_REMEDIATION_LOOP_PRODUCTION_READY,
    kind: FDIR_REMEDIATION_KIND,
    get state() {
      return state;
    },
    get maxAttempts() {
      return maxAttempts;
    },
    get attempts() {
      return attempts;
    }
  };
}

export { createFdirRemediationLoop as FdirRemediationLoop };

function isoNow(nowFn) {
  const v = nowFn();
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function summarizePort(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return { value: String(value) };
  const out = {};
  for (const key of [
    'ok',
    'success',
    'status',
    'code',
    'id',
    'pathKey',
    'action',
    'reason',
    'verified',
    'fault',
    'message'
  ]) {
    if (value[key] !== undefined) out[key] = value[key];
  }
  return Object.keys(out).length > 0 ? out : { ok: value.ok !== false };
}
