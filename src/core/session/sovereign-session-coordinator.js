/**
 * @module sovereign-session-coordinator
 * SPEC-0028 / Mission W — Sovereign Session Coordinator.
 *
 * Orchestrates an EOS sovereign session by injecting Mission Q/R/S/T/V ports
 * (worker daemon, FDIR sentinel, SpecBoot runner, external write gateway,
 * FDIR remediation loop) without rewriting those modules. Lifecycle:
 * IDLE → INITIALIZING → SESSION_ACTIVE → CLOSING → SEALED → COMPLETED
 * | ESCALATED_HITL.
 *
 * On SpecBoot APPLY/VERIFY failure, invokes remediation (maxAttempts≤3)
 * before escalating to HITL. Close drains workers (drain:true) + sentinel,
 * then seals a consolidated EVD custody receipt (SHA-256).
 *
 * NON-CLAIM:
 *   This is the **eos-sovereign-session-coordinator** overlay.
 *   It is NOT agy-daemon, NOT a rewrite of Q/R/S/T/V modules,
 *   NOT PRODUCTION_READY, and MUST NOT be read as AGY DAEMON_PRESENT.
 *   Fundacion Δ=0 — hermetic fixtures only; never touches real Fundacion.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const SOVEREIGN_SESSION_PRODUCTION_READY = 'NO';

export const SOVEREIGN_SESSION_KIND = 'eos-sovereign-session-coordinator';

export const SOVEREIGN_SESSION_STATES = Object.freeze({
  IDLE: 'IDLE',
  INITIALIZING: 'INITIALIZING',
  SESSION_ACTIVE: 'SESSION_ACTIVE',
  CLOSING: 'CLOSING',
  SEALED: 'SEALED',
  COMPLETED: 'COMPLETED',
  ESCALATED_HITL: 'ESCALATED_HITL'
});

export const SOVEREIGN_SESSION_CODES = Object.freeze({
  SESSION_OPENED: 'SESSION_OPENED',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  SESSION_ESCALATED_HITL: 'SESSION_ESCALATED_HITL',
  SESSION_CHANGE_OK: 'SESSION_CHANGE_OK',
  SESSION_APPLY_FAILED: 'SESSION_APPLY_FAILED',
  SESSION_VERIFY_FAILED: 'SESSION_VERIFY_FAILED',
  SESSION_REMEDIATION_RESOLVED: 'SESSION_REMEDIATION_RESOLVED',
  SESSION_WRITE_DENIED: 'SESSION_WRITE_DENIED',
  SESSION_WRITE_ROLLED_BACK: 'SESSION_WRITE_ROLLED_BACK',
  SESSION_SENTINEL_QUARANTINE: 'SESSION_SENTINEL_QUARANTINE',
  SESSION_DEPENDENCY: 'SESSION_DEPENDENCY',
  SESSION_INVALID_STATE: 'SESSION_INVALID_STATE',
  SESSION_BUSY: 'SESSION_BUSY',
  SESSION_SEALED: 'SESSION_SEALED'
});

/**
 * Typed error for sovereign session coordinator failures.
 */
export class SovereignSessionCoordinatorError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = 'SOVEREIGN_SESSION_ERROR', details = {}) {
    super(message);
    this.name = 'SovereignSessionCoordinatorError';
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
 * Clamp remediation attempts to integer ≥ 1 (default 3).
 * @param {unknown} raw
 * @param {number} [fallback=3]
 * @returns {number}
 */
export function clampMaxRemediationAttempts(raw, fallback = 3) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

/**
 * Create a sovereign session coordinator.
 *
 * Injected ports (all optional; missing critical ports fail-closed):
 * - workerDaemon: { start(), stop({drain:true}), health? }  // Mission Q
 * - sentinel: { start?, tick?, stop?, health?, quarantine? }  // Mission R
 * - specboot: { run(change)|runCycle|start? }  // Mission S
 * - remediation: { run(failureContext)|start? }  // Mission V
 * - writeGateway: { authorize|authorizeExternalWrite, write|runGovernedWrite, rollback? }  // Mission T
 *
 * @param {object} [opts]
 * @param {object} [opts.workerDaemon]
 * @param {object} [opts.sentinel]
 * @param {object} [opts.specboot]
 * @param {object} [opts.remediation]
 * @param {object} [opts.writeGateway]
 * @param {number} [opts.maxRemediationAttempts=3]
 * @param {(payload: any) => string} [opts.hash]
 * @param {() => string|Date} [opts.now]
 * @param {(receipt: object) => void} [opts.onReceipt]
 * @param {boolean} [opts.requireWorker=true] when true, missing workerDaemon fails openSession
 * @param {boolean} [opts.requireSpecboot=true] when true, missing specboot fails runChange
 * @returns {object} coordinator instance
 */
export function createSovereignSessionCoordinator(opts = {}) {
  const maxRemediationAttempts = clampMaxRemediationAttempts(
    opts.maxRemediationAttempts,
    3
  );
  const hashFn = typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const onReceipt =
    typeof opts.onReceipt === 'function' ? opts.onReceipt : null;

  const workerDaemon =
    opts.workerDaemon && typeof opts.workerDaemon === 'object'
      ? opts.workerDaemon
      : null;
  const sentinel =
    opts.sentinel && typeof opts.sentinel === 'object' ? opts.sentinel : null;
  const specboot =
    opts.specboot && typeof opts.specboot === 'object' ? opts.specboot : null;
  const remediation =
    opts.remediation && typeof opts.remediation === 'object'
      ? opts.remediation
      : null;
  const writeGateway =
    opts.writeGateway && typeof opts.writeGateway === 'object'
      ? opts.writeGateway
      : null;

  const requireWorker = opts.requireWorker !== false;
  const requireSpecboot = opts.requireSpecboot !== false;

  let state = SOVEREIGN_SESSION_STATES.IDLE;
  /** @type {string[]} */
  const stateLog = [];
  /** @type {object[]} */
  const receipts = [];
  /** @type {object[]} */
  const changeResults = [];
  /** @type {object|null} */
  let sessionCtx = null;
  /** @type {string|null} */
  let sessionId = null;
  /** @type {string|null} */
  let lastFault = null;
  /** @type {object|null} */
  let sealedEvd = null;
  /** @type {object|null} */
  let lastResult = null;
  let busy = false;
  let changesRun = 0;
  let remediationsInvoked = 0;
  const createdAt = isoNow(nowFn);

  function transition(next) {
    state = next;
    stateLog.push(next);
  }

  function snapshot() {
    return {
      state,
      kind: SOVEREIGN_SESSION_KIND,
      PRODUCTION_READY: SOVEREIGN_SESSION_PRODUCTION_READY,
      sessionId,
      changesRun,
      remediationsInvoked,
      maxRemediationAttempts,
      receiptCount: receipts.length,
      lastFault,
      sealed: sealedEvd
        ? { id: sealedEvd.id, sha256: sealedEvd.sha256, custody: sealedEvd.custody }
        : null,
      createdAt,
      stateLog: [...stateLog],
      ports: {
        workerDaemon: Boolean(workerDaemon),
        sentinel: Boolean(sentinel),
        specboot: Boolean(specboot),
        remediation: Boolean(remediation),
        writeGateway: Boolean(writeGateway)
      }
    };
  }

  /**
   * Seal an in-memory audit/EVD receipt (SHA-256 body hash).
   * @param {object} partial
   * @returns {object}
   */
  function sealReceipt(partial) {
    const body = {
      kind: SOVEREIGN_SESSION_KIND,
      PRODUCTION_READY: 'NO',
      at: isoNow(nowFn),
      sessionId,
      phase: partial.phase,
      status: partial.status,
      code: partial.code,
      changeId: partial.changeId ?? null,
      detail: summarizePort(partial.detail),
      ...((partial.extra && typeof partial.extra === 'object')
        ? partial.extra
        : {})
    };
    const bodySha256 = hashFn(body);
    const receipt = {
      ...body,
      bodySha256,
      sha256: bodySha256,
      id: `SSC-${String(receipts.length + 1).padStart(4, '0')}`
    };
    receipts.push(receipt);
    if (onReceipt) {
      try {
        onReceipt(receipt);
      } catch {
        // observer faults must not crash the coordinator
      }
    }
    return receipt;
  }

  function assertActiveOrThrow(op) {
    if (state !== SOVEREIGN_SESSION_STATES.SESSION_ACTIVE) {
      throw new SovereignSessionCoordinatorError(
        `SESSION_INVALID_STATE: ${op} requires SESSION_ACTIVE (have ${state})`,
        SOVEREIGN_SESSION_CODES.SESSION_INVALID_STATE,
        { state, op }
      );
    }
  }

  /**
   * Open / start a sovereign session: boot worker + sentinel → SESSION_ACTIVE.
   * Alias: startSession(ctx)
   * @param {object} [ctx]
   * @returns {Promise<object>}
   */
  async function openSession(ctx = {}) {
    if (busy) {
      throw new SovereignSessionCoordinatorError(
        'SESSION_BUSY: coordinator already busy',
        SOVEREIGN_SESSION_CODES.SESSION_BUSY
      );
    }
    if (
      state !== SOVEREIGN_SESSION_STATES.IDLE &&
      state !== SOVEREIGN_SESSION_STATES.COMPLETED &&
      state !== SOVEREIGN_SESSION_STATES.ESCALATED_HITL
    ) {
      throw new SovereignSessionCoordinatorError(
        `SESSION_INVALID_STATE: openSession from ${state}`,
        SOVEREIGN_SESSION_CODES.SESSION_INVALID_STATE,
        { state }
      );
    }

    busy = true;
    lastFault = null;
    sealedEvd = null;
    lastResult = null;
    changeResults.length = 0;
    changesRun = 0;
    remediationsInvoked = 0;
    sessionCtx = ctx && typeof ctx === 'object' ? { ...ctx } : { raw: ctx };
    sessionId =
      sessionCtx.sessionId ||
      `SSC-SESSION-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    transition(SOVEREIGN_SESSION_STATES.INITIALIZING);

    try {
      if (requireWorker && !workerDaemon) {
        lastFault = SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY;
        transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
        const receipt = sealReceipt({
          phase: 'INITIALIZING',
          status: 'ESCALATED_HITL',
          code: SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY,
          extra: { missing: ['workerDaemon'], reason: 'critical port missing' }
        });
        lastResult = escalateResult('missing workerDaemon', receipt);
        return lastResult;
      }

      if (workerDaemon && typeof workerDaemon.start === 'function') {
        await Promise.resolve(workerDaemon.start());
      } else if (requireWorker) {
        lastFault = SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY;
        transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
        const receipt = sealReceipt({
          phase: 'INITIALIZING',
          status: 'ESCALATED_HITL',
          code: SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY,
          extra: { missing: ['workerDaemon.start'] }
        });
        lastResult = escalateResult('workerDaemon.start missing', receipt);
        return lastResult;
      }

      if (sentinel && typeof sentinel.start === 'function') {
        await Promise.resolve(sentinel.start());
      }

      transition(SOVEREIGN_SESSION_STATES.SESSION_ACTIVE);
      const receipt = sealReceipt({
        phase: 'INITIALIZING',
        status: 'SESSION_ACTIVE',
        code: SOVEREIGN_SESSION_CODES.SESSION_OPENED,
        detail: {
          workerStarted: Boolean(workerDaemon),
          sentinelStarted: Boolean(sentinel && typeof sentinel.start === 'function')
        }
      });

      lastResult = {
        ok: true,
        status: SOVEREIGN_SESSION_STATES.SESSION_ACTIVE,
        state: SOVEREIGN_SESSION_STATES.SESSION_ACTIVE,
        sessionId,
        code: SOVEREIGN_SESSION_CODES.SESSION_OPENED,
        PRODUCTION_READY: 'NO',
        kind: SOVEREIGN_SESSION_KIND,
        receipt,
        health: snapshot()
      };
      return lastResult;
    } catch (err) {
      lastFault = err?.message || String(err);
      transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
      const receipt = sealReceipt({
        phase: 'INITIALIZING',
        status: 'ESCALATED_HITL',
        code: SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL,
        extra: { error: lastFault }
      });
      lastResult = escalateResult(lastFault, receipt);
      return lastResult;
    } finally {
      busy = false;
    }
  }

  async function startSession(ctx) {
    return openSession(ctx);
  }

  /**
   * Dispatch an OpenSpec change via SpecBoot. On APPLY/VERIFY failure,
   * invoke remediation (≤ maxRemediationAttempts) before escalating.
   * @param {object|string} openspecChange
   * @returns {Promise<object>}
   */
  async function runChange(openspecChange) {
    assertActiveOrThrow('runChange');

    if (busy) {
      throw new SovereignSessionCoordinatorError(
        'SESSION_BUSY: runChange already in flight',
        SOVEREIGN_SESSION_CODES.SESSION_BUSY
      );
    }

    if (requireSpecboot && !specboot) {
      lastFault = SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY;
      transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
      const receipt = sealReceipt({
        phase: 'RUN_CHANGE',
        status: 'ESCALATED_HITL',
        code: SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY,
        extra: { missing: ['specboot'] }
      });
      lastResult = escalateResult('missing specboot', receipt);
      return lastResult;
    }

    const change =
      typeof openspecChange === 'string'
        ? { changeId: openspecChange }
        : openspecChange && typeof openspecChange === 'object'
          ? { ...openspecChange }
          : { raw: openspecChange };
    const changeId = change.changeId || change.id || 'unknown-change';

    busy = true;
    changesRun += 1;

    try {
      // Optional sentinel tick / quarantine probe during session
      if (sentinel && typeof sentinel.tick === 'function') {
        const tickResult = await Promise.resolve(sentinel.tick());
        if (isSentinelQuarantine(tickResult)) {
          if (typeof sentinel.quarantine === 'function') {
            await Promise.resolve(
              sentinel.quarantine(
                tickResult.pathKey || changeId,
                tickResult.reason || SOVEREIGN_SESSION_CODES.SESSION_SENTINEL_QUARANTINE
              )
            );
          }
          lastFault = SOVEREIGN_SESSION_CODES.SESSION_SENTINEL_QUARANTINE;
          transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
          const receipt = sealReceipt({
            phase: 'SENTINEL',
            status: 'ESCALATED_HITL',
            code: SOVEREIGN_SESSION_CODES.SESSION_SENTINEL_QUARANTINE,
            changeId,
            detail: tickResult
          });
          lastResult = escalateResult('sentinel quarantine during session', receipt);
          return lastResult;
        }
      }

      // Optional write-gateway authorize path (when change requests external write)
      if (change.externalWrite && writeGateway) {
        const writeOutcome = await invokeWriteGateway(change.externalWrite);
        if (!writeOutcome.ok) {
          lastFault = writeOutcome.code || SOVEREIGN_SESSION_CODES.SESSION_WRITE_DENIED;
          transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
          const receipt = sealReceipt({
            phase: 'WRITE_GATEWAY',
            status: 'ESCALATED_HITL',
            code: lastFault,
            changeId,
            detail: writeOutcome
          });
          lastResult = escalateResult(lastFault, receipt);
          return lastResult;
        }
      } else if (change.externalWrite && !writeGateway) {
        lastFault = SOVEREIGN_SESSION_CODES.SESSION_WRITE_DENIED;
        transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
        const receipt = sealReceipt({
          phase: 'WRITE_GATEWAY',
          status: 'ESCALATED_HITL',
          code: SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY,
          changeId,
          extra: { missing: ['writeGateway'] }
        });
        lastResult = escalateResult('writeGateway missing for externalWrite', receipt);
        return lastResult;
      }

      // SpecBoot dispatch
      let bootResult;
      try {
        bootResult = await invokeSpecboot(change);
      } catch (err) {
        bootResult = {
          ok: false,
          failed: true,
          phase: err?.phase || detectFailPhase(err),
          error: err?.message || String(err),
          code: err?.code || SOVEREIGN_SESSION_CODES.SESSION_APPLY_FAILED
        };
      }

      if (isSpecbootOk(bootResult)) {
        const receipt = sealReceipt({
          phase: 'RUN_CHANGE',
          status: 'OK',
          code: SOVEREIGN_SESSION_CODES.SESSION_CHANGE_OK,
          changeId,
          detail: bootResult
        });
        const result = {
          ok: true,
          status: 'OK',
          state,
          sessionId,
          changeId,
          code: SOVEREIGN_SESSION_CODES.SESSION_CHANGE_OK,
          bootResult: summarizePort(bootResult),
          PRODUCTION_READY: 'NO',
          kind: SOVEREIGN_SESSION_KIND,
          receipt,
          health: snapshot()
        };
        changeResults.push(result);
        lastResult = result;
        return result;
      }

      // APPLY / VERIFY failure → remediation loop (max ≤3)
      const failPhase = String(
        bootResult?.phase || bootResult?.failedPhase || 'APPLY'
      ).toUpperCase();
      const failCode =
        failPhase.includes('VERIFY')
          ? SOVEREIGN_SESSION_CODES.SESSION_VERIFY_FAILED
          : SOVEREIGN_SESSION_CODES.SESSION_APPLY_FAILED;

      sealReceipt({
        phase: failPhase,
        status: 'FAILED',
        code: failCode,
        changeId,
        detail: bootResult
      });

      if (!remediation) {
        lastFault = failCode;
        transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
        const receipt = sealReceipt({
          phase: 'REMEDIATION',
          status: 'ESCALATED_HITL',
          code: SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL,
          changeId,
          extra: {
            reason: 'specboot failed and remediation port missing',
            failPhase
          }
        });
        lastResult = escalateResult('remediation missing after SpecBoot fail', receipt);
        return lastResult;
      }

      remediationsInvoked += 1;
      const failureContext = {
        changeId,
        failPhase,
        bootResult: summarizePort(bootResult),
        sessionId,
        maxAttempts: maxRemediationAttempts,
        PRODUCTION_READY: 'NO',
        kind: SOVEREIGN_SESSION_KIND,
        fault: failCode
      };

      let remResult;
      try {
        remResult = await invokeRemediation(failureContext);
      } catch (err) {
        remResult = {
          ok: false,
          status: 'ESCALATED_HITL',
          error: err?.message || String(err)
        };
      }

      if (isRemediationResolved(remResult)) {
        const receipt = sealReceipt({
          phase: 'REMEDIATION',
          status: 'RESOLVED',
          code: SOVEREIGN_SESSION_CODES.SESSION_REMEDIATION_RESOLVED,
          changeId,
          detail: remResult
        });
        const result = {
          ok: true,
          status: 'REMEDIATED',
          state,
          sessionId,
          changeId,
          code: SOVEREIGN_SESSION_CODES.SESSION_REMEDIATION_RESOLVED,
          bootResult: summarizePort(bootResult),
          remediation: summarizePort(remResult),
          PRODUCTION_READY: 'NO',
          kind: SOVEREIGN_SESSION_KIND,
          receipt,
          health: snapshot()
        };
        changeResults.push(result);
        lastResult = result;
        return result;
      }

      // Remediation exhausted → ESCALATED_HITL
      lastFault = SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL;
      transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
      const receipt = sealReceipt({
        phase: 'REMEDIATION',
        status: 'ESCALATED_HITL',
        code: SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL,
        changeId,
        detail: remResult,
        extra: { reason: 'remediation exhausted', maxRemediationAttempts }
      });
      lastResult = escalateResult('remediation exhausted', receipt);
      return lastResult;
    } finally {
      busy = false;
    }
  }

  /**
   * Close session: CLOSING (drain worker+sentinel) → SEALED (EVD) → COMPLETED.
   * Alias: seal(opts)
   * @param {object} [closeOpts]
   * @returns {Promise<object>}
   */
  async function closeSession(closeOpts = {}) {
    if (
      state === SOVEREIGN_SESSION_STATES.COMPLETED ||
      state === SOVEREIGN_SESSION_STATES.SEALED
    ) {
      return lastResult || {
        ok: true,
        status: state,
        sealedEvd,
        PRODUCTION_READY: 'NO',
        kind: SOVEREIGN_SESSION_KIND
      };
    }

    // Allow close from SESSION_ACTIVE or ESCALATED_HITL (still seal custody)
    if (
      state !== SOVEREIGN_SESSION_STATES.SESSION_ACTIVE &&
      state !== SOVEREIGN_SESSION_STATES.ESCALATED_HITL &&
      state !== SOVEREIGN_SESSION_STATES.CLOSING
    ) {
      throw new SovereignSessionCoordinatorError(
        `SESSION_INVALID_STATE: closeSession from ${state}`,
        SOVEREIGN_SESSION_CODES.SESSION_INVALID_STATE,
        { state }
      );
    }

    const wasEscalated = state === SOVEREIGN_SESSION_STATES.ESCALATED_HITL;
    busy = true;
    transition(SOVEREIGN_SESSION_STATES.CLOSING);

    try {
      const drainCalls = { worker: false, sentinel: false };

      if (workerDaemon && typeof workerDaemon.stop === 'function') {
        await Promise.resolve(workerDaemon.stop({ drain: true }));
        drainCalls.worker = true;
      }
      if (sentinel && typeof sentinel.stop === 'function') {
        await Promise.resolve(sentinel.stop({ drain: true }));
        drainCalls.sentinel = true;
      }

      // Consolidated EVD with custody
      const custodyBody = {
        kind: SOVEREIGN_SESSION_KIND,
        PRODUCTION_READY: 'NO',
        sessionId,
        at: isoNow(nowFn),
        changesRun,
        remediationsInvoked,
        changeResults: changeResults.map((c) => ({
          changeId: c.changeId,
          code: c.code,
          ok: c.ok,
          status: c.status
        })),
        receipts: receipts.map((r) => ({
          id: r.id,
          code: r.code,
          sha256: r.sha256,
          phase: r.phase
        })),
        drainCalls,
        wasEscalated,
        fundacionDelta: 0,
        hermetic: true
      };
      const custodySha = hashFn(custodyBody);
      sealedEvd = {
        id: `EVD-SSC-${sessionId || 'anon'}`,
        kind: SOVEREIGN_SESSION_KIND,
        PRODUCTION_READY: 'NO',
        sessionId,
        at: custodyBody.at,
        sha256: custodySha,
        bodySha256: custodySha,
        custody: {
          algorithm: 'sha256',
          digest: custodySha,
          receiptCount: receipts.length,
          changesRun,
          remediationsInvoked
        },
        body: custodyBody
      };

      transition(SOVEREIGN_SESSION_STATES.SEALED);
      sealReceipt({
        phase: 'SEAL',
        status: 'SEALED',
        code: SOVEREIGN_SESSION_CODES.SESSION_SEALED,
        detail: {
          sha256: sealedEvd.sha256,
          custody: sealedEvd.custody
        }
      });

      if (wasEscalated || closeOpts.forceEscalated) {
        transition(SOVEREIGN_SESSION_STATES.ESCALATED_HITL);
        lastResult = {
          ok: false,
          status: SOVEREIGN_SESSION_STATES.ESCALATED_HITL,
          state: SOVEREIGN_SESSION_STATES.ESCALATED_HITL,
          sessionId,
          sealedEvd: {
            id: sealedEvd.id,
            sha256: sealedEvd.sha256,
            custody: sealedEvd.custody
          },
          hitlRequired: true,
          code: SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL,
          PRODUCTION_READY: 'NO',
          kind: SOVEREIGN_SESSION_KIND,
          health: snapshot()
        };
        return lastResult;
      }

      transition(SOVEREIGN_SESSION_STATES.COMPLETED);
      lastResult = {
        ok: true,
        status: SOVEREIGN_SESSION_STATES.COMPLETED,
        state: SOVEREIGN_SESSION_STATES.COMPLETED,
        sessionId,
        sealedEvd: {
          id: sealedEvd.id,
          sha256: sealedEvd.sha256,
          custody: sealedEvd.custody
        },
        code: SOVEREIGN_SESSION_CODES.SESSION_COMPLETED,
        PRODUCTION_READY: 'NO',
        kind: SOVEREIGN_SESSION_KIND,
        drainCalls,
        health: snapshot()
      };
      return lastResult;
    } finally {
      busy = false;
    }
  }

  async function seal(closeOpts) {
    return closeSession(closeOpts);
  }

  function getState() {
    return state;
  }

  function health() {
    const h = snapshot();
    h.PRODUCTION_READY = 'NO';
    h.cloudAgent = false;
    h.usesCloudAgent = false;
    h.agyDaemonPresent = false;
    h.fundacionDelta = 0;
    return h;
  }

  function status() {
    return snapshot();
  }

  function getReceipts() {
    return receipts.map((r) => ({ ...r }));
  }

  function getSealedEvd() {
    return sealedEvd ? { ...sealedEvd, custody: { ...sealedEvd.custody } } : null;
  }

  function escalateResult(reason, receipt) {
    return {
      ok: false,
      status: SOVEREIGN_SESSION_STATES.ESCALATED_HITL,
      state: SOVEREIGN_SESSION_STATES.ESCALATED_HITL,
      sessionId,
      hitlRequired: true,
      reason: String(reason || 'escalated'),
      code: SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL,
      PRODUCTION_READY: 'NO',
      kind: SOVEREIGN_SESSION_KIND,
      receipt: receipt || null,
      health: snapshot()
    };
  }

  async function invokeSpecboot(change) {
    const runner = specboot;
    if (!runner) {
      throw new SovereignSessionCoordinatorError(
        'SESSION_DEPENDENCY: specboot missing',
        SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY
      );
    }
    if (typeof runner.run === 'function') {
      return Promise.resolve(runner.run(change));
    }
    if (typeof runner.runCycle === 'function') {
      return Promise.resolve(
        runner.runCycle(change.changeId || change.id || change, change)
      );
    }
    if (typeof runner.start === 'function') {
      return Promise.resolve(runner.start(change));
    }
    throw new SovereignSessionCoordinatorError(
      'SESSION_DEPENDENCY: specboot has no run/runCycle/start',
      SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY
    );
  }

  async function invokeRemediation(failureContext) {
    const loop = remediation;
    if (typeof loop.run === 'function') {
      return Promise.resolve(loop.run(failureContext));
    }
    if (typeof loop.start === 'function') {
      return Promise.resolve(loop.start(failureContext));
    }
    throw new SovereignSessionCoordinatorError(
      'SESSION_DEPENDENCY: remediation has no run/start',
      SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY
    );
  }

  async function invokeWriteGateway(writeReq) {
    const gw = writeGateway;
    const authorize =
      typeof gw.authorize === 'function'
        ? gw.authorize.bind(gw)
        : typeof gw.authorizeExternalWrite === 'function'
          ? gw.authorizeExternalWrite.bind(gw)
          : null;
    const write =
      typeof gw.write === 'function'
        ? gw.write.bind(gw)
        : typeof gw.runGovernedWrite === 'function'
          ? gw.runGovernedWrite.bind(gw)
          : null;
    const rollback =
      typeof gw.rollback === 'function'
        ? gw.rollback.bind(gw)
        : typeof gw.rollbackDiff === 'function'
          ? gw.rollbackDiff.bind(gw)
          : null;

    if (authorize) {
      const verdict = await Promise.resolve(authorize(writeReq));
      if (
        verdict &&
        (verdict.allowed === false ||
          verdict.ok === false ||
          verdict.denied === true)
      ) {
        return {
          ok: false,
          code: SOVEREIGN_SESSION_CODES.SESSION_WRITE_DENIED,
          reason: verdict.reason || 'denied',
          verdict: summarizePort(verdict)
        };
      }
    }

    if (!write) {
      // authorize-only path succeeded (or no authorize) — treat as ok if authorize passed
      if (authorize) return { ok: true, authorizedOnly: true };
      return {
        ok: false,
        code: SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY,
        reason: 'writeGateway.write missing'
      };
    }

    try {
      const result = await Promise.resolve(write(writeReq));
      if (result && (result.ok === false || result.allowed === false)) {
        if (rollback) {
          await Promise.resolve(
            rollback({ ...writeReq, reason: 'write_denied_or_failed' })
          );
          return {
            ok: false,
            code: SOVEREIGN_SESSION_CODES.SESSION_WRITE_ROLLED_BACK,
            reason: result.reason || 'write failed',
            rolledBack: true
          };
        }
        return {
          ok: false,
          code: SOVEREIGN_SESSION_CODES.SESSION_WRITE_DENIED,
          reason: result.reason || 'write failed'
        };
      }
      return { ok: true, result: summarizePort(result) };
    } catch (err) {
      let rolledBack = false;
      if (rollback) {
        try {
          await Promise.resolve(
            rollback({ ...writeReq, reason: err?.message || 'write_threw' })
          );
          rolledBack = true;
        } catch {
          // rollback fault recorded below
        }
      }
      return {
        ok: false,
        code: rolledBack
          ? SOVEREIGN_SESSION_CODES.SESSION_WRITE_ROLLED_BACK
          : SOVEREIGN_SESSION_CODES.SESSION_WRITE_DENIED,
        reason: err?.message || String(err),
        rolledBack
      };
    }
  }

  return {
    openSession,
    startSession,
    runChange,
    closeSession,
    seal,
    health,
    status,
    getState,
    getReceipts,
    getSealedEvd,
    PRODUCTION_READY: SOVEREIGN_SESSION_PRODUCTION_READY,
    kind: SOVEREIGN_SESSION_KIND,
    get state() {
      return state;
    },
    get sessionId() {
      return sessionId;
    },
    get maxRemediationAttempts() {
      return maxRemediationAttempts;
    }
  };
}

export { createSovereignSessionCoordinator as SovereignSessionCoordinator };

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
    'changeId',
    'phase',
    'reason',
    'allowed',
    'verified',
    'fault',
    'message',
    'hitlRequired',
    'attempts',
    'pathKey',
    'rolledBack',
    'quarantine',
    'unauthorized'
  ]) {
    if (value[key] !== undefined) out[key] = value[key];
  }
  return Object.keys(out).length > 0 ? out : { ok: value.ok !== false };
}

function isSpecbootOk(result) {
  if (result == null) return false;
  if (result.ok === true || result.success === true) return true;
  if (result.failed === true || result.ok === false) return false;
  const s = String(result.status || result.phase || '').toUpperCase();
  return (
    s === 'OK' ||
    s === 'COMMIT_READY' ||
    s === 'READY-FOR-HITL-PR' ||
    s === 'PASS' ||
    s === 'PASSED' ||
    s === 'ARCHIVED'
  );
}

function isRemediationResolved(result) {
  if (result == null) return false;
  if (result.ok === true) return true;
  const s = String(result.status || '').toUpperCase();
  return s === 'RESOLVED' || s === 'OK' || s === 'PASS';
}

function isSentinelQuarantine(tickResult) {
  if (!tickResult || typeof tickResult !== 'object') return false;
  return (
    tickResult.quarantine === true ||
    tickResult.quarantined === true ||
    tickResult.unauthorized === true ||
    tickResult.code === 'UNAUDITED_MUTATION_QUARANTINED' ||
    tickResult.code === 'ORPHAN_LINK_DETECTED' ||
    String(tickResult.status || '').toUpperCase() === 'QUARANTINED'
  );
}

function detectFailPhase(err) {
  const msg = String(err?.message || err?.code || '').toUpperCase();
  if (msg.includes('VERIFY')) return 'VERIFY';
  if (msg.includes('APPLY')) return 'APPLY';
  return 'APPLY';
}
