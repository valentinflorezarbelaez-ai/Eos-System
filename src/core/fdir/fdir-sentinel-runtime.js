/**
 * @module fdir-sentinel-runtime
 * SPEC-0023 / Mission R — Governed FDIR Sentinel Runtime.
 *
 * 24/7-capable watch loop overlay that monitors SHA-256 baselines of
 * control-plane directive/ledger paths, detects orphan links
 * (ORPHAN_LINK_DETECTED), and fail-closed auto-quarantines unaudited
 * mutations — via injectable ports (hashFile / detectOrphans / quarantine).
 *
 * NON-CLAIM (T7 / U5 / N6 honesty):
 *   This module is the **eos-fdir-sentinel-runtime** overlay.
 *   It is NOT agy-daemon, NOT eos-compute-worker-runtime,
 *   NOT the live EOSSentinelDaemon graph (src/core/sentinel-daemon.js),
 *   and MUST NOT be read as AGY DAEMON_PRESENT.
 *   N6 construct-only lock on sentinel-daemon / fdir / fdir-ontology remains
 *   unchanged — this overlay does not rewrite those surfaces.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 * Prefer not mutating sentinel-daemon.js / fdir.js / fdir-ontology.js.
 *
 * Quarantine policy (documented + tested):
 *   On BASELINE_HASH_MISMATCH, quarantine is applied and events recorded;
 *   state remains RUNNING with quarantines++ unless haltOnQuarantine:true,
 *   which transitions to QUARANTINED and blocks further ticks.
 */

/** @type {'NO'} */
export const FDIR_SENTINEL_RUNTIME_PRODUCTION_READY = 'NO';

export const FDIR_SENTINEL_KIND = 'eos-fdir-sentinel-runtime';

export const FDIR_SENTINEL_STATES = Object.freeze({
  STOPPED: 'STOPPED',
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  DRAINING: 'DRAINING',
  FAILED: 'FAILED',
  QUARANTINED: 'QUARANTINED'
});

export const FDIR_SENTINEL_CODES = Object.freeze({
  ORPHAN_LINK_DETECTED: 'ORPHAN_LINK_DETECTED',
  UNAUDITED_MUTATION_QUARANTINED: 'UNAUDITED_MUTATION_QUARANTINED',
  BASELINE_HASH_MISMATCH: 'BASELINE_HASH_MISMATCH',
  SENTINEL_NOT_RUNNING: 'SENTINEL_NOT_RUNNING',
  SENTINEL_BUSY: 'SENTINEL_BUSY'
});

/**
 * Typed error for FDIR sentinel runtime lifecycle / tick failures.
 */
export class FdirSentinelRuntimeError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'FDIR_SENTINEL_ERROR') {
    super(message);
    this.name = 'FdirSentinelRuntimeError';
    this.code = code;
  }
}

/**
 * @typedef {{ sha256: string, content?: string }} BaselineEntry
 * @typedef {Record<string, BaselineEntry>} BaselineMap
 * @typedef {{ type?: string, code: string, pathKey?: string, from?: string, to?: string, relation?: string, reason?: string, at: string, seq: number }} SentinelEvent
 */

/**
 * Create a governed FDIR sentinel runtime (watch / quarantine overlay).
 *
 * @param {object} [opts]
 * @param {BaselineMap} [opts.baselines]
 * @param {(pathKey: string) => Promise<string>|string} [opts.hashFile]
 * @param {() => Promise<Array<{from:string,to:string,relation?:string}>>|Array<{from:string,to:string,relation?:string}>} [opts.detectOrphans]
 * @param {(pathKey: string, reason: string) => Promise<void>|void} [opts.quarantine] REQUIRED for mismatch path
 * @param {(orphan: object) => Promise<void>|void} [opts.purgeOrphan] optional
 * @param {(evt: SentinelEvent) => void} [opts.onEvent]
 * @param {number} [opts.maxInFlightTicks=1]
 * @param {boolean} [opts.haltOnQuarantine=false]
 * @param {{ setInterval: Function, clearInterval: Function }} [opts.scheduler] optional; omitted → no real timer
 * @param {number} [opts.intervalMs=5000]
 * @returns {object} runtime instance
 */
export function createFdirSentinelRuntime(opts = {}) {
  const maxInFlightTicks =
    Number.isFinite(opts.maxInFlightTicks) && opts.maxInFlightTicks > 0
      ? Math.floor(opts.maxInFlightTicks)
      : 1;

  const haltOnQuarantine = opts.haltOnQuarantine === true;
  const intervalMs =
    Number.isFinite(opts.intervalMs) && opts.intervalMs > 0
      ? Math.floor(opts.intervalMs)
      : 5000;

  /** @type {BaselineMap} */
  let baselines = normalizeBaselines(opts.baselines);

  const hashFile =
    typeof opts.hashFile === 'function'
      ? opts.hashFile
      : async () => {
          throw new FdirSentinelRuntimeError(
            'hashFile port not injected',
            'FDIR_SENTINEL_DEPENDENCY'
          );
        };

  const detectOrphans =
    typeof opts.detectOrphans === 'function'
      ? opts.detectOrphans
      : async () => [];

  const quarantine =
    typeof opts.quarantine === 'function' ? opts.quarantine : null;

  const purgeOrphan =
    typeof opts.purgeOrphan === 'function' ? opts.purgeOrphan : null;

  const onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : null;

  const scheduler =
    opts.scheduler &&
    typeof opts.scheduler.setInterval === 'function' &&
    typeof opts.scheduler.clearInterval === 'function'
      ? opts.scheduler
      : null;

  let state = FDIR_SENTINEL_STATES.STOPPED;
  let startedAt = null;
  let ticks = 0;
  let mismatches = 0;
  let orphansDetected = 0;
  let quarantines = 0;
  let inFlight = 0;
  /** @type {string|null} */
  let lastFault = null;
  /** @type {SentinelEvent[]} */
  const events = [];
  let seq = 0;
  /** @type {ReturnType<typeof setInterval>|null} */
  let timerHandle = null;
  /** @type {Set<Promise<unknown>>} */
  const inFlightPromises = new Set();

  function normalizeBaselines(raw) {
    /** @type {BaselineMap} */
    const out = Object.create(null);
    if (!raw || typeof raw !== 'object') return out;
    for (const [key, val] of Object.entries(raw)) {
      if (val == null) continue;
      if (typeof val === 'string') {
        out[key] = { sha256: val };
      } else if (typeof val === 'object' && typeof val.sha256 === 'string') {
        out[key] = {
          sha256: val.sha256,
          ...(val.content !== undefined ? { content: val.content } : {})
        };
      }
    }
    return out;
  }

  function emit(partial) {
    seq += 1;
    /** @type {SentinelEvent} */
    const evt = {
      ...partial,
      at: new Date().toISOString(),
      seq
    };
    events.push(evt);
    if (onEvent) {
      try {
        onEvent(evt);
      } catch {
        // observer faults must not crash the watch loop
      }
    }
    return evt;
  }

  function snapshot() {
    return {
      state,
      kind: FDIR_SENTINEL_KIND,
      PRODUCTION_READY: FDIR_SENTINEL_RUNTIME_PRODUCTION_READY,
      ticks,
      mismatches,
      orphansDetected,
      quarantines,
      quarantineCount: quarantines,
      startedAt,
      inFlight,
      maxInFlightTicks,
      lastFault,
      haltOnQuarantine
    };
  }

  /**
   * Transition to RUNNING. May start a real timer only when scheduler injected.
   * Without scheduler, state becomes RUNNING with no timer (test / tick-driven).
   * @param {BaselineMap} [nextBaselines]
   * @returns {object} status snapshot
   */
  function start(nextBaselines) {
    if (
      state === FDIR_SENTINEL_STATES.DRAINING ||
      state === FDIR_SENTINEL_STATES.STARTING
    ) {
      throw new FdirSentinelRuntimeError(
        `SENTINEL_INVALID_TRANSITION: cannot start from ${state}`,
        'SENTINEL_BUSY'
      );
    }
    if (state === FDIR_SENTINEL_STATES.QUARANTINED && haltOnQuarantine) {
      throw new FdirSentinelRuntimeError(
        `SENTINEL_INVALID_TRANSITION: cannot start from QUARANTINED (haltOnQuarantine)`,
        FDIR_SENTINEL_CODES.SENTINEL_NOT_RUNNING
      );
    }

    state = FDIR_SENTINEL_STATES.STARTING;
    if (nextBaselines !== undefined) {
      baselines = normalizeBaselines(nextBaselines);
    }
    startedAt = new Date().toISOString();
    lastFault = null;
    state = FDIR_SENTINEL_STATES.RUNNING;

    if (scheduler && !timerHandle) {
      timerHandle = scheduler.setInterval(() => {
        void tick().catch(() => {
          /* interval ticks absorb errors into lastFault via tick path */
        });
      }, intervalMs);
    }

    return snapshot();
  }

  /**
   * Stop the runtime. drain:true waits for in-flight tick settle.
   * @param {{ drain?: boolean }} [stopOpts]
   * @returns {Promise<object>}
   */
  async function stop(stopOpts = {}) {
    const drain = stopOpts?.drain === true;

    if (timerHandle && scheduler) {
      scheduler.clearInterval(timerHandle);
      timerHandle = null;
    }

    if (state === FDIR_SENTINEL_STATES.STOPPED) {
      return snapshot();
    }

    if (drain && inFlight > 0) {
      state = FDIR_SENTINEL_STATES.DRAINING;
      try {
        await Promise.allSettled([...inFlightPromises]);
      } finally {
        state = FDIR_SENTINEL_STATES.STOPPED;
      }
      return snapshot();
    }

    state = FDIR_SENTINEL_STATES.STOPPED;
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

  function getEvents() {
    return events.slice();
  }

  /**
   * One watch cycle — primary hermetic test entry.
   * @returns {Promise<object>} tick result summary
   */
  async function tick() {
    if (state === FDIR_SENTINEL_STATES.QUARANTINED) {
      throw new FdirSentinelRuntimeError(
        `SENTINEL_NOT_RUNNING: state=${state}`,
        FDIR_SENTINEL_CODES.SENTINEL_NOT_RUNNING
      );
    }
    if (state !== FDIR_SENTINEL_STATES.RUNNING) {
      throw new FdirSentinelRuntimeError(
        `SENTINEL_NOT_RUNNING: state=${state}`,
        FDIR_SENTINEL_CODES.SENTINEL_NOT_RUNNING
      );
    }
    if (inFlight >= maxInFlightTicks) {
      throw new FdirSentinelRuntimeError(
        `SENTINEL_BUSY: inFlight=${inFlight} maxInFlightTicks=${maxInFlightTicks}`,
        FDIR_SENTINEL_CODES.SENTINEL_BUSY
      );
    }

    inFlight += 1;
    let settle;
    const tracked = new Promise((resolve) => {
      settle = resolve;
    });
    inFlightPromises.add(tracked);

    /** @type {{ mismatches: string[], orphans: object[], quarantined: string[] }} */
    const result = { mismatches: [], orphans: [], quarantined: [] };

    try {
      // Re-check after scheduling (race with stop)
      if (state !== FDIR_SENTINEL_STATES.RUNNING) {
        throw new FdirSentinelRuntimeError(
          `SENTINEL_NOT_RUNNING: state=${state}`,
          FDIR_SENTINEL_CODES.SENTINEL_NOT_RUNNING
        );
      }

      const keys = Object.keys(baselines);
      for (const pathKey of keys) {
        const expected = baselines[pathKey].sha256;
        let actual;
        try {
          actual = await Promise.resolve(hashFile(pathKey));
        } catch (err) {
          lastFault = err?.message || String(err);
          throw err;
        }
        if (String(actual) !== String(expected)) {
          mismatches += 1;
          result.mismatches.push(pathKey);
          lastFault = FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH;

          emit({
            code: FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH,
            type: 'baseline',
            pathKey,
            reason: `expected=${expected} actual=${actual}`
          });

          if (typeof quarantine !== 'function') {
            throw new FdirSentinelRuntimeError(
              'quarantine port required for BASELINE_HASH_MISMATCH fail-closed path',
              'FDIR_SENTINEL_DEPENDENCY'
            );
          }

          await Promise.resolve(
            quarantine(pathKey, FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH)
          );
          quarantines += 1;
          result.quarantined.push(pathKey);

          emit({
            code: FDIR_SENTINEL_CODES.UNAUDITED_MUTATION_QUARANTINED,
            type: 'quarantine',
            pathKey,
            reason: FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH
          });

          if (haltOnQuarantine) {
            state = FDIR_SENTINEL_STATES.QUARANTINED;
          }
        }
      }

      // Orphan detection (isolation signal; purge optional)
      if (state === FDIR_SENTINEL_STATES.RUNNING || state === FDIR_SENTINEL_STATES.QUARANTINED) {
        // Still report orphans even if we just entered QUARANTINED mid-tick
        // only when we haven't halted before orphan phase — if halt mid-loop,
        // we still finish current tick's orphan scan for observability.
      }
      const orphans = await Promise.resolve(detectOrphans());
      const orphanList = Array.isArray(orphans) ? orphans : [];
      for (const orphan of orphanList) {
        orphansDetected += 1;
        result.orphans.push(orphan);
        emit({
          code: FDIR_SENTINEL_CODES.ORPHAN_LINK_DETECTED,
          type: 'orphan',
          from: orphan?.from,
          to: orphan?.to,
          relation: orphan?.relation,
          pathKey: orphan?.from || orphan?.to
        });
        if (purgeOrphan) {
          try {
            await Promise.resolve(purgeOrphan(orphan));
          } catch (err) {
            lastFault = err?.message || String(err);
          }
        }
      }

      ticks += 1;
      return {
        ok: result.mismatches.length === 0,
        ...result,
        health: snapshot()
      };
    } finally {
      inFlight = Math.max(0, inFlight - 1);
      inFlightPromises.delete(tracked);
      settle();
    }
  }

  /**
   * Optional thin adapter: drive ticks via an existing EOSSentinelDaemon's
   * ejecutarLatido when injected. Unit tests MUST NOT require the live daemon
   * graph — prefer injectable ports above.
   *
   * @param {{ ejecutarLatido?: Function, iniciar?: Function, detener?: Function }} eosSentinelDaemon
   * @returns {{ tickViaDaemon: Function, startDaemon: Function, stopDaemon: Function }}
   */
  function bindExistingSentinelDaemon(eosSentinelDaemon) {
    if (!eosSentinelDaemon || typeof eosSentinelDaemon !== 'object') {
      throw new FdirSentinelRuntimeError(
        'BIND_REQUIRES_DAEMON',
        'FDIR_SENTINEL_DEPENDENCY'
      );
    }
    return {
      async tickViaDaemon(...args) {
        if (typeof eosSentinelDaemon.ejecutarLatido === 'function') {
          return eosSentinelDaemon.ejecutarLatido(...args);
        }
        return tick();
      },
      async startDaemon(lineasBase) {
        if (typeof eosSentinelDaemon.iniciar === 'function') {
          await eosSentinelDaemon.iniciar(lineasBase);
        }
        return start(
          lineasBase && typeof lineasBase === 'object'
            ? Object.fromEntries(
                Object.entries(lineasBase).map(([k, v]) => [
                  k,
                  typeof v === 'string' ? { sha256: v } : v
                ])
              )
            : undefined
        );
      },
      stopDaemon() {
        if (typeof eosSentinelDaemon.detener === 'function') {
          eosSentinelDaemon.detener();
        }
        return stop();
      }
    };
  }

  return {
    start,
    stop,
    status,
    health,
    tick,
    getEvents,
    bindExistingSentinelDaemon,
    PRODUCTION_READY: FDIR_SENTINEL_RUNTIME_PRODUCTION_READY,
    kind: FDIR_SENTINEL_KIND,
    get state() {
      return state;
    }
  };
}

export { createFdirSentinelRuntime as FdirSentinelRuntime };
