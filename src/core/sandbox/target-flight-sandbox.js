/**
 * @module target-flight-sandbox
 * SPEC-0031 / Mission Z — Governed Target Flight Sandbox.
 *
 * Factory createTargetFlightSandbox(options) conforming to ITargetFlightSandbox:
 *   kind: 'eos-governed-target-flight-sandbox'
 *   PRODUCTION_READY: 'NO'
 *
 * Inject: gatekeeper, rollbackEngine, writeGateway (optional T-style),
 * HashChainedLedger (hash-chained receipts, sealEvd style),
 * isRealFundacionPath (default deny).
 *
 * Lifecycle:
 *   IDLE → PREFLIGHT → SANDBOX_ACTIVE → MUTATING → VERIFYING
 *        → COMMITTED | ROLLED_BACK | ESCALATED_HITL | DENIED
 *
 * Mutations apply in an ephemeral in-memory tree (or temp dir under
 * os.tmpdir). NEVER real Fundacion. Prefer NOT rewriting write-barrier
 * or external-write-gateway — inject / compose.
 *
 * NON-CLAIM:
 *   not PRODUCTION_READY
 *   simulation ≠ Fundacion Δ opened
 *   sandbox ≠ live Fundacion writes
 *   Level-2 receipts ≠ PRODUCTION_READY
 *   Target Flight Sandbox ≠ writes to Fundacion real
 *   Does NOT claim CloudAgent path or PRODUCTION_READY=YES
 *   Does NOT weaken write-barrier FUNDACION_ALWAYS_DENY for real Fundacion
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {
  createPreconditionGatekeeper,
  PRECONDITION_KEYS,
  GATEKEEPER_PRODUCTION_READY
} from './precondition-gatekeeper.js';
import {
  createFlightRollbackEngine,
  defaultIsRealFundacionPath as engineIsFundacion,
  cloneEntries,
  applyPlanToEntries,
  FlightRollbackError
} from './flight-rollback-engine.js';

/** @type {'NO'} */
export const TARGET_FLIGHT_PRODUCTION_READY = 'NO';

export const TARGET_FLIGHT_KIND = 'eos-governed-target-flight-sandbox';

export const TARGET_FLIGHT_STATES = Object.freeze({
  IDLE: 'IDLE',
  PREFLIGHT: 'PREFLIGHT',
  SANDBOX_ACTIVE: 'SANDBOX_ACTIVE',
  MUTATING: 'MUTATING',
  VERIFYING: 'VERIFYING',
  COMMITTED: 'COMMITTED',
  ROLLED_BACK: 'ROLLED_BACK',
  ESCALATED_HITL: 'ESCALATED_HITL',
  DENIED: 'DENIED'
});

export const TARGET_FLIGHT_CODES = Object.freeze({
  PREFLIGHT_OK: 'PREFLIGHT_OK',
  PREFLIGHT_DENIED: 'PREFLIGHT_DENIED',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  FLIGHT_DENIED: 'FLIGHT_DENIED',
  FLIGHT_UNAUTHORIZED: 'FLIGHT_UNAUTHORIZED',
  FLIGHT_VERIFY_FAILED: 'FLIGHT_VERIFY_FAILED',
  FLIGHT_ROLLBACK_FAILED: 'FLIGHT_ROLLBACK_FAILED',
  FLIGHT_INVALID_STATE: 'FLIGHT_INVALID_STATE',
  FLIGHT_APPLY_FAILED: 'FLIGHT_APPLY_FAILED',
  FLIGHT_COMMITTED: 'FLIGHT_COMMITTED',
  FLIGHT_ROLLED_BACK: 'FLIGHT_ROLLED_BACK',
  FLIGHT_ESCALATED_HITL: 'FLIGHT_ESCALATED_HITL',
  MUTATION_APPLIED: 'MUTATION_APPLIED',
  VERIFY_OK: 'VERIFY_OK'
});

const GENESIS_PREV = '0'.repeat(64);

/**
 * Typed error for target-flight sandbox failures.
 */
export class TargetFlightSandboxError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = TARGET_FLIGHT_CODES.FLIGHT_DENIED, details = {}) {
    super(message);
    this.name = 'TargetFlightSandboxError';
    this.code = code;
    Object.assign(this, details);
  }
}

/**
 * SHA-256 hex — sealEvd / SpecBoot receipt style.
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
 * Windows-safe path normalize.
 * @param {string} input
 * @returns {string}
 */
export function normalizeSandboxPath(input) {
  return String(input || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .toLowerCase();
}

/**
 * Default detector for real Fundacion paths (Documents/Fundacion + /Fundacion/).
 * Same semantics as T-gate / write-barrier `isFundacionPath`.
 * @param {string} p
 * @returns {boolean}
 */
export function defaultIsRealFundacionPath(p) {
  return engineIsFundacion(p);
}

/**
 * Always-deny helper for real Fundacion-looking paths.
 * @param {string} targetPath
 * @param {(p: string) => boolean} [isRealFundacionPath]
 * @returns {{ allowed: false, reason: 'FUNDACION_ALWAYS_DENY', path: string, PRODUCTION_READY: 'NO' } | null}
 */
export function denyRealFundacion(targetPath, isRealFundacionPath = defaultIsRealFundacionPath) {
  if (isRealFundacionPath(targetPath)) {
    return {
      allowed: false,
      reason: TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY,
      path: String(targetPath || ''),
      PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY
    };
  }
  return null;
}

/**
 * Collect Fundacion-looking paths from a mutation plan.
 * @param {object} plan
 * @param {(p: string) => boolean} isRealFundacionPath
 * @returns {string[]}
 */
function fundacionPathsInPlan(plan, isRealFundacionPath) {
  const hits = [];
  if (!plan || typeof plan !== 'object') return hits;
  const writes = { ...(plan.writes || {}), ...(plan.files || {}) };
  for (const p of Object.keys(writes)) {
    if (isRealFundacionPath(p)) hits.push(p);
  }
  for (const p of plan.deletes || []) {
    if (isRealFundacionPath(p)) hits.push(p);
  }
  for (const op of plan.ops || []) {
    if (op?.path && isRealFundacionPath(op.path)) hits.push(op.path);
  }
  return hits;
}

/**
 * Hash-chained ledger (sealEvd style). Each event:
 *   bodySha256 = sha256(canonical JSON of { type, at, payload })
 *   sha256     = sha256(prevHash + bodySha256)   // chain link
 *   prevHash   = previous event.sha256 (genesis = 64 zeros)
 *
 * @param {object} [opts]
 * @param {(payload: any) => string} [opts.hash]
 * @param {() => string|Date} [opts.now]
 * @returns {object}
 */
export function createHashChainedLedger(opts = {}) {
  const hashFn = typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn = typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  /** @type {object[]} */
  const events = [];
  let tip = GENESIS_PREV;
  let seq = 0;

  function isoNow() {
    const v = nowFn();
    return v instanceof Date ? v.toISOString() : String(v);
  }

  /**
   * @param {string} type
   * @param {object} [payload]
   * @returns {object}
   */
  function append(type, payload = {}) {
    const at = isoNow();
    const body = { type: String(type || 'EVENT'), at, payload };
    const bodySha256 = hashFn(body);
    const sha256 = hashFn(`${tip}${bodySha256}`);
    seq += 1;
    const event = {
      seq,
      type: body.type,
      at,
      prevHash: tip,
      sha256,
      bodySha256,
      payload
    };
    events.push(event);
    tip = sha256;
    return event;
  }

  function getEvents() {
    return events.map((e) => ({ ...e, payload: { ...e.payload } }));
  }

  function getTip() {
    return tip;
  }

  function verifyChain() {
    let prev = GENESIS_PREV;
    for (const ev of events) {
      if (ev.prevHash !== prev) {
        return { ok: false, reason: 'PREV_HASH_BREAK', at: ev.seq };
      }
      const body = { type: ev.type, at: ev.at, payload: ev.payload };
      const bodySha256 = hashFn(body);
      const sha256 = hashFn(`${prev}${bodySha256}`);
      if (ev.bodySha256 !== bodySha256 || ev.sha256 !== sha256) {
        return { ok: false, reason: 'HASH_MISMATCH', at: ev.seq };
      }
      prev = ev.sha256;
    }
    return { ok: true, length: events.length, tip };
  }

  return {
    append,
    getEvents,
    getTip,
    verifyChain,
    kind: 'eos-hash-chained-ledger',
    PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY
  };
}

/**
 * Create a governed Target Flight Sandbox (ITargetFlightSandbox).
 *
 * @param {object} [options]
 * @param {object} [options.gatekeeper] createPreconditionGatekeeper instance
 * @param {object} [options.rollbackEngine] createFlightRollbackEngine instance
 * @param {object} [options.writeGateway] optional T-style gateway (authorize / runGovernedWrite)
 * @param {object} [options.ledger] optional HashChainedLedger
 * @param {(p: string) => boolean} [options.isRealFundacionPath]
 * @param {object} [options.initialTree] seed ephemeral tree
 * @param {Function} [options.applyMutation]
 * @param {Function} [options.verify]
 * @param {Function} [options.hash]
 * @param {Function} [options.now]
 * @param {Function} [options.onReceipt]
 * @returns {object}
 */
export function createTargetFlightSandbox(options = {}) {
  const hashFn = typeof options.hash === 'function' ? options.hash : defaultHash;
  const nowFn = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const onReceipt = typeof options.onReceipt === 'function' ? options.onReceipt : null;
  const isRealFundacionPath =
    typeof options.isRealFundacionPath === 'function'
      ? options.isRealFundacionPath
      : defaultIsRealFundacionPath;

  const gatekeeper = options.gatekeeper || createPreconditionGatekeeper();
  const rollbackEngine =
    options.rollbackEngine ||
    createFlightRollbackEngine({
      tree: options.initialTree || {},
      now: nowFn
    });
  const writeGateway =
    options.writeGateway && typeof options.writeGateway === 'object'
      ? options.writeGateway
      : null;
  const ledger = options.ledger || createHashChainedLedger({ hash: hashFn, now: nowFn });

  let state = TARGET_FLIGHT_STATES.IDLE;
  /** @type {string[]} */
  const stateLog = [];
  /** @type {object[]} */
  const receipts = [];
  /** @type {object|null} */
  let snapshot = null;
  /** @type {string|null} */
  let targetPath = null;
  /** @type {object|null} */
  let mutationPlan = null;
  /** @type {object|null} */
  let lastPreconditions = null;
  /** @type {string|null} */
  let lastFault = null;
  /** @type {object|null} */
  let lastResult = null;
  let busy = false;
  const createdAt = isoNow(nowFn);
  const worktreeHint = path.join(os.tmpdir(), 'eos-target-flight-sandbox');

  function transition(next) {
    state = next;
    stateLog.push(next);
  }

  function record(type, payload = {}) {
    const event = ledger.append(type, payload);
    const receipt = {
      type,
      at: event.at,
      seq: event.seq,
      prevHash: event.prevHash,
      sha256: event.sha256,
      bodySha256: event.bodySha256,
      payload,
      PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY
    };
    receipts.push(receipt);
    if (onReceipt) onReceipt(receipt);
    return receipt;
  }

  function denyResult(code, extra = {}) {
    lastFault = code;
    if (state !== TARGET_FLIGHT_STATES.DENIED &&
        state !== TARGET_FLIGHT_STATES.ROLLED_BACK &&
        state !== TARGET_FLIGHT_STATES.ESCALATED_HITL &&
        state !== TARGET_FLIGHT_STATES.COMMITTED) {
      transition(TARGET_FLIGHT_STATES.DENIED);
    }
    const result = {
      ok: false,
      allowed: false,
      reason: code,
      state,
      PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
      fundacionDeltaOpened: false,
      hermeticFixtureOnly: true,
      ...extra
    };
    lastResult = result;
    return result;
  }

  /**
   * Preflight: gatekeeper + deny real Fundacion + capture snapshot.
   * @param {object} args
   * @returns {Promise<object>}
   */
  async function preflight({
    preconditions,
    targetPath: rawPath,
    mutationPlan: plan,
    tree
  } = {}) {
    if (busy) {
      throw new TargetFlightSandboxError(
        'FLIGHT_INVALID_STATE: sandbox busy',
        TARGET_FLIGHT_CODES.FLIGHT_INVALID_STATE,
        { state }
      );
    }
    if (state !== TARGET_FLIGHT_STATES.IDLE) {
      throw new TargetFlightSandboxError(
        `FLIGHT_INVALID_STATE: preflight requires IDLE, got ${state}`,
        TARGET_FLIGHT_CODES.FLIGHT_INVALID_STATE,
        { state }
      );
    }

    busy = true;
    transition(TARGET_FLIGHT_STATES.PREFLIGHT);
    targetPath = rawPath == null ? '' : String(rawPath);
    mutationPlan = plan && typeof plan === 'object' ? plan : {};
    lastPreconditions = preconditions && typeof preconditions === 'object' ? preconditions : {};

    try {
      // 1) Real Fundacion — ALWAYS DENY (even if all 6 preconditions pass)
      const fundacionDeny = denyRealFundacion(targetPath, isRealFundacionPath);
      if (fundacionDeny) {
        record(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, {
          path: fundacionDeny.path,
          reason: TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY
        });
        return denyResult(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, {
          path: fundacionDeny.path,
          missing: []
        });
      }
      const planHits = fundacionPathsInPlan(mutationPlan, isRealFundacionPath);
      if (planHits.length > 0) {
        record(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, {
          path: planHits[0],
          reason: TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY
        });
        return denyResult(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, {
          path: planHits[0],
          missing: []
        });
      }

      // 2) Six Level-2 preconditions (fail-closed)
      const evalResult = gatekeeper.evaluate
        ? gatekeeper.evaluate(lastPreconditions)
        : { ok: false, missing: [...PRECONDITION_KEYS] };
      const missing = Array.isArray(evalResult?.missing) ? evalResult.missing : [];
      if (!evalResult?.ok || missing.length > 0) {
        record(TARGET_FLIGHT_CODES.PRECONDITION_FAILED, { missing });
        return denyResult(TARGET_FLIGHT_CODES.PRECONDITION_FAILED, { missing });
      }

      // 3) Optional T-style writeGateway compose (do not rewrite T)
      if (writeGateway) {
        const authorize =
          writeGateway.authorizeExternalWrite ||
          writeGateway.authorize ||
          null;
        if (typeof authorize === 'function') {
          const verdict = await authorize({
            projectId: lastPreconditions.projectId || 'sandbox-flight',
            targetPath,
            receipts: lastPreconditions
          });
          if (verdict && verdict.allowed === false) {
            const reason = verdict.reason || TARGET_FLIGHT_CODES.FLIGHT_DENIED;
            record(TARGET_FLIGHT_CODES.PREFLIGHT_DENIED, { reason, path: targetPath });
            return denyResult(reason, {
              path: targetPath,
              missing: verdict.missing || [],
              writeGateway: true
            });
          }
        }
      }

      // 4) Seed ephemeral tree + capture snapshot (never Fundacion)
      if (tree && typeof tree === 'object') {
        await rollbackEngine.captureSnapshot(tree);
      } else if (options.initialTree && typeof options.initialTree === 'object') {
        await rollbackEngine.captureSnapshot(options.initialTree);
      } else {
        await rollbackEngine.captureSnapshot(rollbackEngine.getTree ? rollbackEngine.getTree() : {});
      }
      snapshot = rollbackEngine.captureSnapshot();

      record(TARGET_FLIGHT_CODES.PREFLIGHT_OK, {
        path: targetPath,
        snapshotSha256: snapshot.sha256,
        preconditions: { ...evalResult.preconditions }
      });
      transition(TARGET_FLIGHT_STATES.SANDBOX_ACTIVE);
      const result = {
        ok: true,
        allowed: true,
        reason: TARGET_FLIGHT_CODES.PREFLIGHT_OK,
        state,
        snapshot,
        sha256: snapshot.sha256,
        path: targetPath,
        PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
        fundacionDeltaOpened: false,
        hermeticFixtureOnly: true,
        missing: []
      };
      lastResult = result;
      return result;
    } finally {
      busy = false;
    }
  }

  /**
   * Execute a governed flight against the ephemeral sandbox tree.
   * Requires SANDBOX_ACTIVE. On verify fail → atomic rollback + ledger event.
   * @param {object} [args]
   * @returns {Promise<object>}
   */
  async function executeFlight({
    mutationPlan: plan,
    verify,
    applyMutation
  } = {}) {
    if (busy) {
      throw new TargetFlightSandboxError(
        'FLIGHT_INVALID_STATE: sandbox busy',
        TARGET_FLIGHT_CODES.FLIGHT_INVALID_STATE,
        { state }
      );
    }
    if (state !== TARGET_FLIGHT_STATES.SANDBOX_ACTIVE) {
      lastFault = TARGET_FLIGHT_CODES.FLIGHT_UNAUTHORIZED;
      const err = new TargetFlightSandboxError(
        `FLIGHT_UNAUTHORIZED: executeFlight requires SANDBOX_ACTIVE, got ${state}`,
        TARGET_FLIGHT_CODES.FLIGHT_UNAUTHORIZED,
        { state }
      );
      record(TARGET_FLIGHT_CODES.FLIGHT_UNAUTHORIZED, { state, reason: 'executeFlight without active sandbox' });
      if (state === TARGET_FLIGHT_STATES.IDLE) {
        transition(TARGET_FLIGHT_STATES.DENIED);
      }
      throw err;
    }

    busy = true;
    const usePlan = plan && typeof plan === 'object' ? plan : mutationPlan || {};
    mutationPlan = usePlan;

    try {
      const planHits = fundacionPathsInPlan(usePlan, isRealFundacionPath);
      if (planHits.length > 0) {
        record(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, { path: planHits[0] });
        return denyResult(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, { path: planHits[0] });
      }

      transition(TARGET_FLIGHT_STATES.MUTATING);
      try {
        if (typeof applyMutation === 'function') {
          await applyMutation({
            tree: rollbackEngine.getTree(),
            plan: usePlan,
            snapshot,
            targetPath
          });
        } else if (typeof options.applyMutation === 'function') {
          await options.applyMutation({
            tree: rollbackEngine.getTree(),
            plan: usePlan,
            snapshot,
            targetPath
          });
        } else {
          await rollbackEngine.applyMutation(usePlan);
        }
      } catch (err) {
        lastFault = TARGET_FLIGHT_CODES.FLIGHT_APPLY_FAILED;
        record(TARGET_FLIGHT_CODES.FLIGHT_APPLY_FAILED, {
          message: err?.message || String(err),
          code: err?.code
        });
        transition(TARGET_FLIGHT_STATES.ESCALATED_HITL);
        const result = {
          ok: false,
          reason: TARGET_FLIGHT_CODES.FLIGHT_APPLY_FAILED,
          state,
          PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
          fundacionDeltaOpened: false,
          cause: err
        };
        lastResult = result;
        return result;
      }
      record(TARGET_FLIGHT_CODES.MUTATION_APPLIED, {
        path: targetPath,
        snapshotSha256: snapshot?.sha256
      });

      transition(TARGET_FLIGHT_STATES.VERIFYING);
      const verifyFn = typeof verify === 'function' ? verify : options.verify;
      let verifyResult = { ok: true, skipped: true };
      if (typeof verifyFn === 'function') {
        try {
          verifyResult = await verifyFn({
            tree: rollbackEngine.getTree(),
            plan: usePlan,
            snapshot,
            targetPath
          });
        } catch (err) {
          verifyResult = { ok: false, thrown: true, message: err?.message || String(err) };
        }
      }
      const verifyOk =
        verifyResult === true ||
        verifyResult?.ok === true ||
        verifyResult?.passed === true;

      if (!verifyOk) {
        lastFault = TARGET_FLIGHT_CODES.FLIGHT_VERIFY_FAILED;
        record(TARGET_FLIGHT_CODES.FLIGHT_VERIFY_FAILED, {
          verifyResult: verifyResult && typeof verifyResult === 'object' ? { ok: false } : verifyResult
        });
        try {
          await rollbackEngine.rollback(snapshot);
          record(TARGET_FLIGHT_CODES.FLIGHT_ROLLED_BACK, {
            snapshotSha256: snapshot?.sha256
          });
          transition(TARGET_FLIGHT_STATES.ROLLED_BACK);
          const result = {
            ok: false,
            reason: TARGET_FLIGHT_CODES.FLIGHT_VERIFY_FAILED,
            rolledBack: true,
            state,
            snapshot,
            tree: rollbackEngine.getTree(),
            PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
            fundacionDeltaOpened: false,
            hermeticFixtureOnly: true
          };
          lastResult = result;
          return result;
        } catch (err) {
          lastFault = TARGET_FLIGHT_CODES.FLIGHT_ROLLBACK_FAILED;
          record(TARGET_FLIGHT_CODES.FLIGHT_ROLLBACK_FAILED, {
            message: err?.message || String(err)
          });
          transition(TARGET_FLIGHT_STATES.ESCALATED_HITL);
          const result = {
            ok: false,
            reason: TARGET_FLIGHT_CODES.FLIGHT_ROLLBACK_FAILED,
            state,
            PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
            fundacionDeltaOpened: false,
            cause: err
          };
          lastResult = result;
          return result;
        }
      }

      record(TARGET_FLIGHT_CODES.VERIFY_OK, { snapshotSha256: snapshot?.sha256 });
      record(TARGET_FLIGHT_CODES.FLIGHT_COMMITTED, {
        snapshotSha256: snapshot?.sha256,
        path: targetPath
      });
      transition(TARGET_FLIGHT_STATES.COMMITTED);
      const result = {
        ok: true,
        reason: TARGET_FLIGHT_CODES.FLIGHT_COMMITTED,
        state,
        snapshot,
        tree: rollbackEngine.getTree(),
        PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
        fundacionDeltaOpened: false,
        hermeticFixtureOnly: true,
        kind: TARGET_FLIGHT_KIND
      };
      lastResult = result;
      return result;
    } finally {
      busy = false;
    }
  }

  /**
   * Convenience: preflight then executeFlight when preflight ok.
   * @param {object} args
   * @returns {Promise<object>}
   */
  async function run(args = {}) {
    const pf = await preflight(args);
    if (!pf.ok) return pf;
    return executeFlight(args);
  }

  /**
   * Fail-closed write attempt against the ephemeral tree.
   * Unauthorized (wrong state / Fundacion path / no preflight) → DENIED.
   * @param {{ path: string, content?: string }} args
   * @returns {Promise<object>}
   */
  async function attemptWrite({ path: writePath, content } = {}) {
    const p = String(writePath || '');
    if (isRealFundacionPath(p)) {
      record(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, { path: p });
      if (
        state !== TARGET_FLIGHT_STATES.COMMITTED &&
        state !== TARGET_FLIGHT_STATES.ROLLED_BACK &&
        state !== TARGET_FLIGHT_STATES.ESCALATED_HITL
      ) {
        if (state !== TARGET_FLIGHT_STATES.DENIED) transition(TARGET_FLIGHT_STATES.DENIED);
      }
      lastFault = TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY;
      return {
        ok: false,
        allowed: false,
        reason: TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY,
        path: p,
        state,
        PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY
      };
    }
    if (state !== TARGET_FLIGHT_STATES.SANDBOX_ACTIVE && state !== TARGET_FLIGHT_STATES.MUTATING) {
      record(TARGET_FLIGHT_CODES.FLIGHT_UNAUTHORIZED, { path: p, state });
      lastFault = TARGET_FLIGHT_CODES.FLIGHT_UNAUTHORIZED;
      if (state === TARGET_FLIGHT_STATES.IDLE) transition(TARGET_FLIGHT_STATES.DENIED);
      return {
        ok: false,
        allowed: false,
        reason: TARGET_FLIGHT_CODES.FLIGHT_UNAUTHORIZED,
        path: p,
        state,
        PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY
      };
    }
    await rollbackEngine.applyMutation({ writes: { [p]: content == null ? '' : String(content) } });
    record(TARGET_FLIGHT_CODES.MUTATION_APPLIED, { path: p, via: 'attemptWrite' });
    return {
      ok: true,
      allowed: true,
      path: p,
      state,
      PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY
    };
  }

  function getState() {
    return {
      state,
      kind: TARGET_FLIGHT_KIND,
      PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
      stateLog: [...stateLog],
      snapshotSha256: snapshot?.sha256 || null,
      targetPath,
      lastFault,
      receiptCount: receipts.length,
      ledgerTip: ledger.getTip ? ledger.getTip() : null,
      createdAt,
      fundacionDeltaOpened: false
    };
  }

  function getReceipts() {
    return receipts.map((r) => ({ ...r, payload: { ...(r.payload || {}) } }));
  }

  function getLedger() {
    return ledger;
  }

  function getSnapshot() {
    return snapshot
      ? { sha256: snapshot.sha256, entries: cloneEntries(snapshot.entries), at: snapshot.at }
      : null;
  }

  function getTree() {
    return rollbackEngine.getTree ? rollbackEngine.getTree() : {};
  }

  function health() {
    return {
      kind: TARGET_FLIGHT_KIND,
      PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
      state,
      fundacionDeltaOpened: false,
      fundacionAlwaysDenyIntact: true,
      hermeticFixtureOnly: true,
      cloudAgent: false,
      level2ReceiptsMeanProductionReady: false,
      simulationIsNotFundacionDelta: true,
      sandboxIsNotLiveFundacionWrites: true,
      worktree: worktreeHint,
      worktreeIsTmpdir: normalizeSandboxPath(worktreeHint).startsWith(
        normalizeSandboxPath(os.tmpdir())
      ),
      snapshotSha256: snapshot?.sha256 || null,
      receiptCount: receipts.length,
      ledgerTip: ledger.getTip ? ledger.getTip() : null,
      preconditions: [...PRECONDITION_KEYS],
      ports: {
        gatekeeper: Boolean(gatekeeper),
        rollbackEngine: Boolean(rollbackEngine),
        writeGateway: Boolean(writeGateway),
        ledger: Boolean(ledger)
      },
      lastFault,
      createdAt
    };
  }

  function status() {
    return health();
  }

  return {
    kind: TARGET_FLIGHT_KIND,
    PRODUCTION_READY: TARGET_FLIGHT_PRODUCTION_READY,
    preflight,
    executeFlight,
    run,
    attemptWrite,
    health,
    status,
    getState,
    getReceipts,
    getLedger,
    getSnapshot,
    getTree
  };
}

/**
 * @param {Function} nowFn
 * @returns {string}
 */
function isoNow(nowFn) {
  const v = nowFn();
  return v instanceof Date ? v.toISOString() : String(v);
}

export {
  createPreconditionGatekeeper,
  PRECONDITION_KEYS,
  GATEKEEPER_PRODUCTION_READY,
  createFlightRollbackEngine,
  applyPlanToEntries,
  FlightRollbackError
};

export default createTargetFlightSandbox;
