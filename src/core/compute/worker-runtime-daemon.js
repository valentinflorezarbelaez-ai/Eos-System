/**
 * @module worker-runtime-daemon
 * SPEC-0022 / Mission Q — Compute Worker Runtime Daemon.
 *
 * Long-lived in-process lifecycle wrapper around `executeComputeRun` so
 * Mission P Loop×Worker orchestration can talk to a RUNNING compute runtime
 * (start / stop / status / acceptRun). Fail-closed when stopped.
 *
 * NON-CLAIM (T7 / U5 honesty):
 *   This module is the **eos-compute-worker-runtime** daemon.
 *   It is NOT agy-daemon, NOT eos-workstation, and MUST NOT be read as
 *   AGY DAEMON_PRESENT. AGY workstation evidence remains DAEMON_ABSENT unless
 *   an honest agy-daemon install is separately corroborated.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 * Prefer not mutating scripts/runners/eos-compute-worker.js (Mission P pattern).
 */

/** @type {'NO'} */
export const WORKER_RUNTIME_DAEMON_PRODUCTION_READY = 'NO';

export const WORKER_DAEMON_STATES = Object.freeze({
  STOPPED: 'STOPPED',
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  DRAINING: 'DRAINING',
  FAILED: 'FAILED'
});

export const WORKER_RUNTIME_KIND = 'eos-compute-worker-runtime';

/**
 * Typed error for daemon lifecycle / accept failures.
 */
export class WorkerRuntimeDaemonError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'WORKER_DAEMON_ERROR') {
    super(message);
    this.name = 'WorkerRuntimeDaemonError';
    this.code = code;
  }
}

/**
 * Lazy default: import executeComputeRun from the compute worker when not injected.
 * Unit tests MUST inject a mock so they never need Gemini/Stitch/network.
 * @returns {Promise<Function>}
 */
async function defaultExecuteComputeRunLoader() {
  const mod = await import('../../../scripts/runners/eos-compute-worker.js');
  if (typeof mod.executeComputeRun !== 'function') {
    throw new WorkerRuntimeDaemonError(
      'DEFAULT_EXECUTE_COMPUTE_RUN_MISSING',
      'WORKER_DAEMON_DEPENDENCY'
    );
  }
  return mod.executeComputeRun;
}

/**
 * Create an in-process compute worker runtime daemon.
 *
 * @param {object} [opts]
 * @param {Function} [opts.executeComputeRun] Injected run fn (preferred for tests)
 * @param {Function} [opts.runCompute] Alias for executeComputeRun
 * @param {number} [opts.maxInFlight=1] Concurrent accepts (default serial fail-closed)
 * @param {Function} [opts.loadExecuteComputeRun] Async loader for production default
 * @returns {object} daemon instance
 */
export function createWorkerRuntimeDaemon(opts = {}) {
  const maxInFlight =
    Number.isFinite(opts.maxInFlight) && opts.maxInFlight > 0
      ? Math.floor(opts.maxInFlight)
      : 1;

  let injected =
    typeof opts.executeComputeRun === 'function'
      ? opts.executeComputeRun
      : typeof opts.runCompute === 'function'
        ? opts.runCompute
        : null;

  const loadExecuteComputeRun =
    typeof opts.loadExecuteComputeRun === 'function'
      ? opts.loadExecuteComputeRun
      : defaultExecuteComputeRunLoader;

  let state = WORKER_DAEMON_STATES.STOPPED;
  let startedAt = null;
  let runsAccepted = 0;
  let runsCompleted = 0;
  let runsFailed = 0;
  let inFlight = 0;
  /** @type {Set<Promise<unknown>>} */
  const inFlightPromises = new Set();

  function snapshot() {
    return {
      state,
      PRODUCTION_READY: WORKER_RUNTIME_DAEMON_PRODUCTION_READY,
      startedAt,
      runsAccepted,
      runsCompleted,
      runsFailed,
      inFlight,
      maxInFlight,
      kind: WORKER_RUNTIME_KIND
    };
  }

  async function resolveRunner() {
    if (typeof injected === 'function') return injected;
    injected = await loadExecuteComputeRun();
    if (typeof injected !== 'function') {
      throw new WorkerRuntimeDaemonError(
        'EXECUTE_COMPUTE_RUN_UNRESOLVED',
        'WORKER_DAEMON_DEPENDENCY'
      );
    }
    return injected;
  }

  /**
   * Transition STOPPED → RUNNING.
   * @returns {object} status snapshot
   */
  function start() {
    if (state === WORKER_DAEMON_STATES.RUNNING) {
      return snapshot();
    }
    if (
      state === WORKER_DAEMON_STATES.DRAINING ||
      state === WORKER_DAEMON_STATES.STARTING
    ) {
      throw new WorkerRuntimeDaemonError(
        `WORKER_DAEMON_INVALID_TRANSITION: cannot start from ${state}`,
        'WORKER_DAEMON_INVALID_TRANSITION'
      );
    }
    state = WORKER_DAEMON_STATES.STARTING;
    startedAt = new Date().toISOString();
    state = WORKER_DAEMON_STATES.RUNNING;
    return snapshot();
  }

  /**
   * Stop the daemon. When drain:true and work is in flight, enter DRAINING
   * until in-flight settles, then STOPPED. New accepts fail during DRAINING.
   *
   * @param {{ drain?: boolean }} [stopOpts]
   * @returns {Promise<object>} final status snapshot
   */
  async function stop(stopOpts = {}) {
    const drain = stopOpts?.drain === true;

    if (state === WORKER_DAEMON_STATES.STOPPED) {
      return snapshot();
    }

    if (drain && inFlight > 0) {
      state = WORKER_DAEMON_STATES.DRAINING;
      const pending = [...inFlightPromises];
      try {
        await Promise.allSettled(pending);
      } finally {
        state = WORKER_DAEMON_STATES.STOPPED;
      }
      return snapshot();
    }

    // Idle or non-drain: stop immediately (in-flight may still settle; new accepts fail)
    state = WORKER_DAEMON_STATES.STOPPED;
    if (inFlight > 0) {
      await Promise.allSettled([...inFlightPromises]);
    }
    return snapshot();
  }

  function status() {
    return snapshot();
  }

  function health() {
    return snapshot();
  }

  /**
   * Accept a compute run only while RUNNING.
   * @param {...any} args forwarded to executeComputeRun
   * @returns {Promise<any>}
   */
  async function acceptRun(...args) {
    if (state !== WORKER_DAEMON_STATES.RUNNING) {
      throw new WorkerRuntimeDaemonError(
        `WORKER_DAEMON_NOT_RUNNING: state=${state}`,
        'WORKER_DAEMON_NOT_RUNNING'
      );
    }
    if (inFlight >= maxInFlight) {
      throw new WorkerRuntimeDaemonError(
        `WORKER_DAEMON_BUSY: inFlight=${inFlight} maxInFlight=${maxInFlight}`,
        'WORKER_DAEMON_BUSY'
      );
    }

    const runner = await resolveRunner();
    // Re-check after await (fail-closed if stop raced)
    if (state !== WORKER_DAEMON_STATES.RUNNING) {
      throw new WorkerRuntimeDaemonError(
        `WORKER_DAEMON_NOT_RUNNING: state=${state}`,
        'WORKER_DAEMON_NOT_RUNNING'
      );
    }
    if (inFlight >= maxInFlight) {
      throw new WorkerRuntimeDaemonError(
        `WORKER_DAEMON_BUSY: inFlight=${inFlight} maxInFlight=${maxInFlight}`,
        'WORKER_DAEMON_BUSY'
      );
    }

    runsAccepted += 1;
    inFlight += 1;

    let settle;
    const tracked = new Promise((resolve) => {
      settle = resolve;
    });
    inFlightPromises.add(tracked);

    try {
      const result = await runner(...args);
      runsCompleted += 1;
      return result;
    } catch (err) {
      runsFailed += 1;
      // Injected throw keeps daemon RUNNING (unless already stopped/draining)
      throw err;
    } finally {
      inFlight = Math.max(0, inFlight - 1);
      inFlightPromises.delete(tracked);
      settle();
    }
  }

  /**
   * Adapter for Mission P Loop orchestrator injection without editing orchestrator.
   * @returns {{ executeComputeRun: Function }}
   */
  function createLoopComputeAdapter() {
    return {
      executeComputeRun: (...a) => acceptRun(...a)
    };
  }

  return {
    start,
    stop,
    status,
    health,
    acceptRun,
    createLoopComputeAdapter,
    get state() {
      return state;
    }
  };
}

/**
 * Bind a daemon's acceptRun as executeComputeRun for Loop orchestrator opts.
 * @param {ReturnType<typeof createWorkerRuntimeDaemon>} daemon
 * @returns {Function}
 */
export function bindExecuteComputeRun(daemon) {
  if (!daemon || typeof daemon.acceptRun !== 'function') {
    throw new WorkerRuntimeDaemonError(
      'BIND_REQUIRES_DAEMON',
      'WORKER_DAEMON_DEPENDENCY'
    );
  }
  return (...args) => daemon.acceptRun(...args);
}
