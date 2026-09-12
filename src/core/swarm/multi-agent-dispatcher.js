/**
 * @module multi-agent-dispatcher
 * SPEC-0032 / Mission AA — Multi-Agent Swarm Dispatcher.
 *
 * Factory createMultiAgentDispatcher(options) conforming to IMultiAgentDispatcher:
 *   kind: 'eos-multi-agent-swarm-dispatcher'
 *   PRODUCTION_READY: 'NO'
 *
 * Personas (injectable run ports):
 *   architect / planner → plan(change)
 *   builder / coder     → build(plan, handoff)
 *   verifier / qa       → verify(artifact, handoff)
 *
 * Runtime enforcement: BUILDER != VERIFIER — if builder_id === verifier_id
 * → fail-closed ESCALATED / DENIED (never allow same agent both roles).
 *
 * Flow: dispatch(change) → architect plan → handoff envelope → builder →
 * handoff → verifier; on verify fail optional loop back to builder with
 * budget maxRounds (default 2, clamp ≥1).
 *
 * BoundedOutputFilter: inject boundedOutputFilter or simple
 * observeTokens({used, budget}) / filterOutbound(text). Over budget →
 * fail-closed TOKEN_BUDGET_EXCEEDED. Default BoundedOutputFilter included
 * in-module (no new npm deps).
 *
 * Concurrency: in-process; maxConcurrent default 1 (capped at 3);
 * no unbounded swarm.
 *
 * Hash-chained receipts optional (prevHash style).
 *
 * NON-CLAIM:
 *   not CloudAgent fleet
 *   not unbounded swarm
 *   not PRODUCTION_READY
 *   dispatcher ≠ production multi-agent autonomy
 *   handoff receipts ≠ PRODUCTION_READY
 *   Fundacion Δ=0 — hermetic fixtures only
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createHash, randomUUID } from 'node:crypto';
import {
  validateAgentHandoffEnvelope,
  normalizeRole,
  assertAgentHandoffEnvelope,
  AgentHandoffValidationError,
  HANDOFF_SCHEMA_VERSION,
  HANDOFF_VALIDATOR_PRODUCTION_READY,
  CANONICAL_ROLES
} from './agent-handoff-validator.js';

/** @type {'NO'} */
export const DISPATCHER_PRODUCTION_READY = 'NO';

export const DISPATCHER_KIND = 'eos-multi-agent-swarm-dispatcher';

export const DISPATCHER_STATES = Object.freeze({
  IDLE: 'IDLE',
  PLANNING: 'PLANNING',
  BUILDING: 'BUILDING',
  VERIFYING: 'VERIFYING',
  COMPLETED: 'COMPLETED',
  ESCALATED_HITL: 'ESCALATED_HITL',
  DENIED: 'DENIED',
  BUSY: 'BUSY'
});

export const DISPATCHER_CODES = Object.freeze({
  DISPATCH_OK: 'DISPATCH_OK',
  DISPATCH_DENIED: 'DISPATCH_DENIED',
  BUILDER_EQUALS_VERIFIER: 'BUILDER_EQUALS_VERIFIER',
  TOKEN_BUDGET_EXCEEDED: 'TOKEN_BUDGET_EXCEEDED',
  ESCALATED_HITL: 'ESCALATED_HITL',
  MAX_CONCURRENT_EXCEEDED: 'MAX_CONCURRENT_EXCEEDED',
  DISPATCHER_BUSY: 'DISPATCHER_BUSY',
  INVALID_HANDOFF: 'INVALID_HANDOFF',
  MISSING_PERSONA: 'MISSING_PERSONA',
  PLAN_FAILED: 'PLAN_FAILED',
  BUILD_FAILED: 'BUILD_FAILED',
  VERIFY_FAILED: 'VERIFY_FAILED',
  VERIFY_RECOVERED: 'VERIFY_RECOVERED',
  HANDOFF_ISSUED: 'HANDOFF_ISSUED',
  ROUND_STARTED: 'ROUND_STARTED'
});

const GENESIS_PREV = '0'.repeat(64);
const MAX_CONCURRENT_CAP = 3;

/**
 * Typed error for multi-agent dispatcher failures.
 */
export class MultiAgentDispatcherError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = DISPATCHER_CODES.DISPATCH_DENIED, details = {}) {
    super(message);
    this.name = 'MultiAgentDispatcherError';
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
 * Clamp maxRounds to integer ≥ 1 (default 2).
 * @param {unknown} raw
 * @param {number} [fallback=2]
 * @returns {number}
 */
export function clampMaxRounds(raw, fallback = 2) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

/**
 * Clamp maxConcurrent to integer in [1, MAX_CONCURRENT_CAP] (default 1).
 * @param {unknown} raw
 * @param {number} [fallback=1]
 * @returns {number}
 */
export function clampMaxConcurrent(raw, fallback = 1) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_CONCURRENT_CAP, Math.max(1, Math.floor(n)));
}

/**
 * Default BoundedOutputFilter — tracks token usage against a budget.
 * No new npm deps. Rough estimate: whitespace-split words ≈ tokens,
 * or caller supplies used via observeTokens.
 *
 * @param {object} [opts]
 * @param {number} [opts.budget=4096]
 * @param {number} [opts.used=0]
 * @returns {{ observeTokens, filterOutbound, getUsage, reset, kind, PRODUCTION_READY }}
 */
export function createBoundedOutputFilter(opts = {}) {
  const budget = Math.max(
    0,
    Number.isFinite(Number(opts.budget)) ? Math.floor(Number(opts.budget)) : 4096
  );
  let used = Math.max(
    0,
    Number.isFinite(Number(opts.used)) ? Math.floor(Number(opts.used)) : 0
  );

  function estimateTokens(text) {
    const s = text == null ? '' : String(text);
    if (!s) return 0;
    // Rough whitespace / punctuation split — hermetic, no deps
    return s.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * @param {{ used?: number, budget?: number, delta?: number }} args
   * @returns {{ ok: boolean, used: number, budget: number, reason?: string }}
   */
  function observeTokens(args = {}) {
    if (Number.isFinite(Number(args.budget))) {
      // budget is immutable after create; observing a higher request is ignored
    }
    if (Number.isFinite(Number(args.used))) {
      used = Math.max(used, Math.floor(Number(args.used)));
    }
    if (Number.isFinite(Number(args.delta))) {
      used += Math.max(0, Math.floor(Number(args.delta)));
    }
    if (used > budget) {
      return {
        ok: false,
        used,
        budget,
        reason: DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED,
        PRODUCTION_READY: DISPATCHER_PRODUCTION_READY
      };
    }
    return {
      ok: true,
      used,
      budget,
      PRODUCTION_READY: DISPATCHER_PRODUCTION_READY
    };
  }

  /**
   * Filter outbound text; counts estimated tokens against budget.
   * @param {string} text
   * @returns {{ ok: boolean, text?: string, used: number, budget: number, reason?: string }}
   */
  function filterOutbound(text) {
    const delta = estimateTokens(text);
    const obs = observeTokens({ delta });
    if (!obs.ok) {
      return {
        ok: false,
        used: obs.used,
        budget: obs.budget,
        reason: DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED,
        PRODUCTION_READY: DISPATCHER_PRODUCTION_READY
      };
    }
    return {
      ok: true,
      text: text == null ? '' : String(text),
      used: obs.used,
      budget: obs.budget,
      PRODUCTION_READY: DISPATCHER_PRODUCTION_READY
    };
  }

  function getUsage() {
    return { used, budget, remaining: Math.max(0, budget - used) };
  }

  function reset() {
    used = 0;
  }

  return {
    kind: 'eos-bounded-output-filter',
    PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
    observeTokens,
    filterOutbound,
    getUsage,
    reset,
    estimateTokens
  };
}

/**
 * Resolve persona run port from options (architect|planner, builder|coder, verifier|qa).
 * @param {object} options
 * @param {'architect'|'builder'|'verifier'} slot
 * @returns {{ id: string, run: Function }|null}
 */
function resolvePersona(options, slot) {
  const aliases =
    slot === 'architect'
      ? ['architect', 'planner']
      : slot === 'builder'
        ? ['builder', 'coder']
        : ['verifier', 'qa'];

  for (const key of aliases) {
    const p = options[key];
    if (p && typeof p === 'object') {
      const run =
        typeof p.run === 'function'
          ? p.run
          : typeof p.plan === 'function' && slot === 'architect'
            ? p.plan
            : typeof p.build === 'function' && slot === 'builder'
              ? p.build
              : typeof p.verify === 'function' && slot === 'verifier'
                ? p.verify
                : null;
      if (!run) continue;
      const id =
        typeof p.id === 'string' && p.id.trim()
          ? p.id.trim()
          : typeof p.agentId === 'string' && p.agentId.trim()
            ? p.agentId.trim()
            : `${slot}-default`;
      return { id, run, raw: p, slot };
    }
  }
  // Also accept options.personas.{architect|builder|verifier}
  const personas = options.personas && typeof options.personas === 'object' ? options.personas : null;
  if (personas) {
    for (const key of aliases) {
      const p = personas[key];
      if (p && typeof p === 'object') {
        const run =
          typeof p.run === 'function'
            ? p.run
            : typeof p.plan === 'function' && slot === 'architect'
              ? p.plan
              : typeof p.build === 'function' && slot === 'builder'
                ? p.build
                : typeof p.verify === 'function' && slot === 'verifier'
                  ? p.verify
                  : null;
        if (!run) continue;
        const id =
          typeof p.id === 'string' && p.id.trim()
            ? p.id.trim()
            : typeof p.agentId === 'string' && p.agentId.trim()
              ? p.agentId.trim()
              : `${slot}-default`;
        return { id, run, raw: p, slot };
      }
    }
  }
  return null;
}

/**
 * Create Multi-Agent Swarm Dispatcher (IMultiAgentDispatcher).
 *
 * @param {object} [options]
 * @param {object} [options.architect] / options.planner — { id, run|plan }
 * @param {object} [options.builder] / options.coder — { id, run|build }
 * @param {object} [options.verifier] / options.qa — { id, run|verify }
 * @param {object} [options.personas]
 * @param {object} [options.boundedOutputFilter]
 * @param {number} [options.tokenBudget]
 * @param {number} [options.maxRounds=2]
 * @param {number} [options.maxConcurrent=1] capped at 3
 * @param {Function} [options.hash]
 * @param {Function} [options.now]
 * @param {Function} [options.onReceipt]
 * @param {Function} [options.idFactory] handoff id factory
 * @returns {object}
 */
export function createMultiAgentDispatcher(options = {}) {
  const hashFn = typeof options.hash === 'function' ? options.hash : defaultHash;
  const nowFn =
    typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const onReceipt = typeof options.onReceipt === 'function' ? options.onReceipt : null;
  const idFactory =
    typeof options.idFactory === 'function'
      ? options.idFactory
      : () => randomUUID();

  const maxRounds = clampMaxRounds(options.maxRounds, 2);
  const maxConcurrent = clampMaxConcurrent(options.maxConcurrent, 1);

  const architect = resolvePersona(options, 'architect');
  const builder = resolvePersona(options, 'builder');
  const verifier = resolvePersona(options, 'verifier');

  const boundedOutputFilter =
    options.boundedOutputFilter && typeof options.boundedOutputFilter === 'object'
      ? options.boundedOutputFilter
      : createBoundedOutputFilter({
          budget: Number.isFinite(Number(options.tokenBudget))
            ? Number(options.tokenBudget)
            : 4096
        });

  let state = DISPATCHER_STATES.IDLE;
  /** @type {string[]} */
  const stateLog = [];
  /** @type {object[]} */
  const receipts = [];
  /** @type {object[]} */
  const handoffs = [];
  /** @type {string|null} */
  let lastFault = null;
  /** @type {object|null} */
  let lastResult = null;
  let activeCount = 0;
  let dispatchCount = 0;
  let tip = GENESIS_PREV;
  const createdAt = isoNow(nowFn);

  function transition(next) {
    state = next;
    stateLog.push(next);
  }

  function record(type, payload = {}) {
    const at = isoNow(nowFn);
    const body = { type: String(type || 'EVENT'), at, payload };
    const bodySha256 = hashFn(body);
    const sha256 = hashFn(`${tip}${bodySha256}`);
    const receipt = {
      type: body.type,
      at,
      seq: receipts.length + 1,
      prevHash: tip,
      sha256,
      bodySha256,
      payload,
      PRODUCTION_READY: DISPATCHER_PRODUCTION_READY
    };
    tip = sha256;
    receipts.push(receipt);
    if (onReceipt) onReceipt(receipt);
    return receipt;
  }

  function denyResult(code, extra = {}) {
    lastFault = code;
    if (
      state !== DISPATCHER_STATES.DENIED &&
      state !== DISPATCHER_STATES.ESCALATED_HITL &&
      state !== DISPATCHER_STATES.COMPLETED
    ) {
      const next =
        code === DISPATCHER_CODES.ESCALATED_HITL ||
        code === DISPATCHER_CODES.BUILDER_EQUALS_VERIFIER
          ? code === DISPATCHER_CODES.ESCALATED_HITL
            ? DISPATCHER_STATES.ESCALATED_HITL
            : DISPATCHER_STATES.DENIED
          : code === DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED ||
              code === DISPATCHER_CODES.MAX_CONCURRENT_EXCEEDED ||
              code === DISPATCHER_CODES.DISPATCHER_BUSY
            ? DISPATCHER_STATES.DENIED
            : DISPATCHER_STATES.DENIED;
      // BUILDER_EQUALS_VERIFIER → DENIED (or ESCALATED per fail-closed)
      if (code === DISPATCHER_CODES.BUILDER_EQUALS_VERIFIER) {
        transition(DISPATCHER_STATES.DENIED);
      } else if (code === DISPATCHER_CODES.ESCALATED_HITL) {
        transition(DISPATCHER_STATES.ESCALATED_HITL);
      } else {
        transition(next);
      }
    }
    const result = {
      ok: false,
      allowed: false,
      reason: code,
      state,
      PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
      fundacionDeltaOpened: false,
      cloudAgent: false,
      unboundedSwarm: false,
      ...extra
    };
    lastResult = result;
    return result;
  }

  /**
   * Issue a validated AgentHandoffEnvelope V3 and record custody chain.
   * @param {object} args
   * @returns {object} normalized envelope
   */
  function issueHandoff({
    fromRole,
    toRole,
    fromAgentId,
    toAgentId,
    payload,
    taskRef,
    changeId
  }) {
    const envelope = {
      schemaVersion: HANDOFF_SCHEMA_VERSION,
      handoffId: String(idFactory()),
      fromRole,
      toRole,
      fromAgentId: String(fromAgentId),
      toAgentId: String(toAgentId),
      payload: payload && typeof payload === 'object' ? payload : {},
      issuedAt: isoNow(nowFn),
      custody: { prevHash: tip }
    };
    if (typeof taskRef === 'string') envelope.taskRef = taskRef;
    if (typeof changeId === 'string') envelope.changeId = changeId;

    const validated = validateAgentHandoffEnvelope(envelope);
    if (!validated.ok) {
      throw new AgentHandoffValidationError(
        `AgentHandoffEnvelope invalid: ${validated.errors.join('; ')}`,
        DISPATCHER_CODES.INVALID_HANDOFF,
        { errors: validated.errors }
      );
    }
    const normalized = validated.normalized;
    const receipt = record(DISPATCHER_CODES.HANDOFF_ISSUED, {
      handoffId: normalized.handoffId,
      fromRole: normalized.fromRole,
      toRole: normalized.toRole,
      fromAgentId: normalized.fromAgentId,
      toAgentId: normalized.toAgentId
    });
    normalized.custody = {
      prevHash: receipt.prevHash,
      sha256: receipt.sha256
    };
    handoffs.push({ ...normalized, payload: { ...normalized.payload } });
    return normalized;
  }

  /**
   * Apply BoundedOutputFilter to outbound text; fail-closed on over-budget.
   * @param {unknown} text
   * @returns {{ ok: true, text: string } | { ok: false, result: object }}
   */
  function gateOutbound(text) {
    if (
      boundedOutputFilter &&
      typeof boundedOutputFilter.filterOutbound === 'function'
    ) {
      const filtered = boundedOutputFilter.filterOutbound(
        text == null ? '' : String(text)
      );
      if (filtered && filtered.ok === false) {
        record(DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED, {
          used: filtered.used,
          budget: filtered.budget
        });
        return {
          ok: false,
          result: denyResult(DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED, {
            used: filtered.used,
            budget: filtered.budget
          })
        };
      }
      return { ok: true, text: filtered?.text ?? String(text ?? '') };
    }
    if (
      boundedOutputFilter &&
      typeof boundedOutputFilter.observeTokens === 'function'
    ) {
      const words = String(text ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const obs = boundedOutputFilter.observeTokens({ delta: words });
      if (obs && obs.ok === false) {
        record(DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED, {
          used: obs.used,
          budget: obs.budget
        });
        return {
          ok: false,
          result: denyResult(DISPATCHER_CODES.TOKEN_BUDGET_EXCEEDED, {
            used: obs.used,
            budget: obs.budget
          })
        };
      }
    }
    return { ok: true, text: text == null ? '' : String(text) };
  }

  /**
   * Core dispatch: architect → builder → verifier (+ optional retry loop).
   * @param {object} [change]
   * @returns {Promise<object>}
   */
  async function dispatch(change = {}) {
    // Concurrency gate
    if (activeCount >= maxConcurrent) {
      record(DISPATCHER_CODES.MAX_CONCURRENT_EXCEEDED, {
        activeCount,
        maxConcurrent
      });
      lastFault = DISPATCHER_CODES.MAX_CONCURRENT_EXCEEDED;
      return {
        ok: false,
        allowed: false,
        reason: DISPATCHER_CODES.MAX_CONCURRENT_EXCEEDED,
        state: DISPATCHER_STATES.BUSY,
        PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
        fundacionDeltaOpened: false,
        cloudAgent: false,
        unboundedSwarm: false,
        activeCount,
        maxConcurrent
      };
    }

    // BUILDER != VERIFIER — fail-closed before any work
    if (!builder || !verifier || !architect) {
      const missing = [];
      if (!architect) missing.push('architect');
      if (!builder) missing.push('builder');
      if (!verifier) missing.push('verifier');
      record(DISPATCHER_CODES.MISSING_PERSONA, { missing });
      transition(DISPATCHER_STATES.DENIED);
      return denyResult(DISPATCHER_CODES.MISSING_PERSONA, { missing });
    }

    if (builder.id === verifier.id) {
      record(DISPATCHER_CODES.BUILDER_EQUALS_VERIFIER, {
        builderId: builder.id,
        verifierId: verifier.id
      });
      // Fail-closed DENIED / ESCALATED — never allow same agent both roles
      transition(DISPATCHER_STATES.DENIED);
      lastFault = DISPATCHER_CODES.BUILDER_EQUALS_VERIFIER;
      const result = {
        ok: false,
        allowed: false,
        reason: DISPATCHER_CODES.BUILDER_EQUALS_VERIFIER,
        state: DISPATCHER_STATES.DENIED,
        escalated: true,
        PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
        fundacionDeltaOpened: false,
        cloudAgent: false,
        unboundedSwarm: false,
        builderId: builder.id,
        verifierId: verifier.id
      };
      lastResult = result;
      return result;
    }

    activeCount += 1;
    dispatchCount += 1;
    const changeId =
      typeof change.changeId === 'string'
        ? change.changeId
        : typeof change.id === 'string'
          ? change.id
          : `change-${dispatchCount}`;
    const taskRef =
      typeof change.taskRef === 'string' ? change.taskRef : changeId;

    try {
      // ── Architect / Planner ──────────────────────────────────────────
      transition(DISPATCHER_STATES.PLANNING);
      record(DISPATCHER_CODES.ROUND_STARTED, { changeId, phase: 'plan' });

      let planResult;
      try {
        planResult = await architect.run({
          change,
          role: 'ARCHITECT',
          agentId: architect.id
        });
      } catch (err) {
        record(DISPATCHER_CODES.PLAN_FAILED, {
          message: err?.message || String(err)
        });
        return denyResult(DISPATCHER_CODES.PLAN_FAILED, { cause: err });
      }

      const planOk =
        planResult === true ||
        planResult?.ok === true ||
        planResult?.plan != null;
      if (!planOk) {
        record(DISPATCHER_CODES.PLAN_FAILED, {
          planResult: planResult && typeof planResult === 'object' ? { ok: false } : planResult
        });
        return denyResult(DISPATCHER_CODES.PLAN_FAILED, { planResult });
      }

      const plan =
        planResult && typeof planResult === 'object' && planResult.plan != null
          ? planResult.plan
          : planResult;

      // Gate architect outbound summary through token filter
      const planText =
        typeof plan === 'string'
          ? plan
          : JSON.stringify(plan && typeof plan === 'object' ? plan : {});
      const planGate = gateOutbound(planText);
      if (!planGate.ok) return planGate.result;

      const planHandoff = issueHandoff({
        fromRole: 'ARCHITECT',
        toRole: 'BUILDER',
        fromAgentId: architect.id,
        toAgentId: builder.id,
        payload: { plan, changeId, phase: 'plan→build' },
        taskRef,
        changeId
      });

      // ── Builder loop with verify ─────────────────────────────────────
      let artifact = null;
      let verifyResult = null;
      let recovered = false;
      let roundsUsed = 0;

      for (let round = 1; round <= maxRounds; round += 1) {
        roundsUsed = round;
        transition(DISPATCHER_STATES.BUILDING);
        record(DISPATCHER_CODES.ROUND_STARTED, {
          changeId,
          phase: 'build',
          round
        });

        let buildResult;
        try {
          buildResult = await builder.run({
            change,
            plan,
            handoff: planHandoff,
            role: 'BUILDER',
            agentId: builder.id,
            round,
            previousVerify: verifyResult
          });
        } catch (err) {
          record(DISPATCHER_CODES.BUILD_FAILED, {
            message: err?.message || String(err),
            round
          });
          return denyResult(DISPATCHER_CODES.BUILD_FAILED, {
            cause: err,
            round
          });
        }

        const buildOk =
          buildResult === true ||
          buildResult?.ok === true ||
          buildResult?.artifact != null;
        if (!buildOk) {
          record(DISPATCHER_CODES.BUILD_FAILED, { round });
          return denyResult(DISPATCHER_CODES.BUILD_FAILED, {
            buildResult,
            round
          });
        }

        artifact =
          buildResult && typeof buildResult === 'object' && 'artifact' in buildResult
            ? buildResult.artifact
            : buildResult;

        const buildText =
          typeof artifact === 'string'
            ? artifact
            : JSON.stringify(artifact && typeof artifact === 'object' ? artifact : {});
        const buildGate = gateOutbound(buildText);
        if (!buildGate.ok) return buildGate.result;

        const buildHandoff = issueHandoff({
          fromRole: 'BUILDER',
          toRole: 'VERIFIER',
          fromAgentId: builder.id,
          toAgentId: verifier.id,
          payload: { artifact, plan, changeId, phase: 'build→verify', round },
          taskRef,
          changeId
        });

        transition(DISPATCHER_STATES.VERIFYING);
        record(DISPATCHER_CODES.ROUND_STARTED, {
          changeId,
          phase: 'verify',
          round
        });

        try {
          verifyResult = await verifier.run({
            change,
            plan,
            artifact,
            handoff: buildHandoff,
            role: 'VERIFIER',
            agentId: verifier.id,
            round
          });
        } catch (err) {
          verifyResult = {
            ok: false,
            thrown: true,
            message: err?.message || String(err)
          };
        }

        const verifyOk =
          verifyResult === true ||
          verifyResult?.ok === true ||
          verifyResult?.passed === true;

        if (verifyOk) {
          if (round > 1) {
            recovered = true;
            record(DISPATCHER_CODES.VERIFY_RECOVERED, { round, changeId });
          }
          // Optional verifier→architect completion handoff (custody)
          issueHandoff({
            fromRole: 'VERIFIER',
            toRole: 'ARCHITECT',
            fromAgentId: verifier.id,
            toAgentId: architect.id,
            payload: {
              artifact,
              changeId,
              phase: 'verify→done',
              round,
              recovered
            },
            taskRef,
            changeId
          });

          transition(DISPATCHER_STATES.COMPLETED);
          record(DISPATCHER_CODES.DISPATCH_OK, {
            changeId,
            roundsUsed,
            recovered,
            handoffCount: handoffs.length
          });
          const result = {
            ok: true,
            reason: DISPATCHER_CODES.DISPATCH_OK,
            state: DISPATCHER_STATES.COMPLETED,
            changeId,
            plan,
            artifact,
            verifyResult,
            roundsUsed,
            recovered,
            handoffs: handoffs.map((h) => ({
              handoffId: h.handoffId,
              fromRole: h.fromRole,
              toRole: h.toRole
            })),
            PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
            fundacionDeltaOpened: false,
            cloudAgent: false,
            unboundedSwarm: false,
            kind: DISPATCHER_KIND
          };
          lastResult = result;
          return result;
        }

        record(DISPATCHER_CODES.VERIFY_FAILED, {
          round,
          changeId,
          willRetry: round < maxRounds
        });

        if (round < maxRounds) {
          // Loop back to builder with prior verify context (via next iteration)
          continue;
        }
      }

      // Exhausted rounds → ESCALATED_HITL
      record(DISPATCHER_CODES.ESCALATED_HITL, {
        changeId,
        roundsUsed,
        reason: 'maxRounds exhausted'
      });
      transition(DISPATCHER_STATES.ESCALATED_HITL);
      lastFault = DISPATCHER_CODES.ESCALATED_HITL;
      const escalated = {
        ok: false,
        reason: DISPATCHER_CODES.ESCALATED_HITL,
        state: DISPATCHER_STATES.ESCALATED_HITL,
        changeId,
        roundsUsed,
        maxRounds,
        artifact,
        verifyResult,
        PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
        fundacionDeltaOpened: false,
        cloudAgent: false,
        unboundedSwarm: false
      };
      lastResult = escalated;
      return escalated;
    } finally {
      activeCount = Math.max(0, activeCount - 1);
      if (
        state !== DISPATCHER_STATES.COMPLETED &&
        state !== DISPATCHER_STATES.DENIED &&
        state !== DISPATCHER_STATES.ESCALATED_HITL
      ) {
        // leave terminal state as-is; otherwise idle when drained
        if (activeCount === 0 && state !== DISPATCHER_STATES.IDLE) {
          // keep last terminal; no-op
        }
      }
    }
  }

  /** Alias for dispatch. */
  async function run(change) {
    return dispatch(change);
  }

  function getState() {
    return {
      state,
      kind: DISPATCHER_KIND,
      PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
      stateLog: [...stateLog],
      activeCount,
      maxConcurrent,
      maxRounds,
      dispatchCount,
      handoffCount: handoffs.length,
      receiptCount: receipts.length,
      lastFault,
      ledgerTip: tip,
      createdAt,
      fundacionDeltaOpened: false,
      cloudAgent: false,
      unboundedSwarm: false,
      builderId: builder?.id || null,
      verifierId: verifier?.id || null,
      architectId: architect?.id || null
    };
  }

  function getReceipts() {
    return receipts.map((r) => ({ ...r, payload: { ...(r.payload || {}) } }));
  }

  function getHandoffs() {
    return handoffs.map((h) => ({
      ...h,
      payload: { ...(h.payload || {}) },
      custody: h.custody ? { ...h.custody } : undefined
    }));
  }

  function health() {
    return {
      kind: DISPATCHER_KIND,
      PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
      state,
      fundacionDeltaOpened: false,
      cloudAgent: false,
      unboundedSwarm: false,
      notCloudAgentFleet: true,
      notUnboundedSwarm: true,
      notProductionReady: true,
      builderEqualsVerifierForbidden: true,
      maxConcurrent,
      maxConcurrentCap: MAX_CONCURRENT_CAP,
      maxRounds,
      activeCount,
      handoffCount: handoffs.length,
      receiptCount: receipts.length,
      ledgerTip: tip,
      tokenUsage:
        typeof boundedOutputFilter.getUsage === 'function'
          ? boundedOutputFilter.getUsage()
          : null,
      ports: {
        architect: Boolean(architect),
        builder: Boolean(builder),
        verifier: Boolean(verifier),
        boundedOutputFilter: Boolean(boundedOutputFilter)
      },
      personas: {
        architectId: architect?.id || null,
        builderId: builder?.id || null,
        verifierId: verifier?.id || null
      },
      lastFault,
      createdAt,
      canonicalRoles: [...CANONICAL_ROLES]
    };
  }

  function status() {
    return health();
  }

  return {
    kind: DISPATCHER_KIND,
    PRODUCTION_READY: DISPATCHER_PRODUCTION_READY,
    dispatch,
    run,
    health,
    status,
    getState,
    getReceipts,
    getHandoffs,
    // expose issueHandoff for tests / advanced inject
    issueHandoff,
    validateEnvelope: validateAgentHandoffEnvelope
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
  validateAgentHandoffEnvelope,
  normalizeRole,
  assertAgentHandoffEnvelope,
  AgentHandoffValidationError,
  HANDOFF_SCHEMA_VERSION,
  HANDOFF_VALIDATOR_PRODUCTION_READY,
  CANONICAL_ROLES
};

export default createMultiAgentDispatcher;
