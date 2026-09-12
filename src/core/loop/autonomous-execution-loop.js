/**
 * @module autonomous-execution-loop
 * SPEC-0037 / Mission AF — Autonomous Execution Loop.
 *
 * Hermetic orchestration seam that wires injectable ports:
 *   AD llmPort · AE budgetGate/ecr · W session · X shell · AA swarm · Z flight · HITL
 *
 * Does NOT rewrite W/X/AA/Z wholesale. Missing deps fail-closed when a step
 * requires them. Fake LLM only in tests; no live network LLM in CI.
 *
 * Law VI: sanitize/redact apiKey/token/authorization from errors and dumps.
 *
 * NON-CLAIM:
 *   live LLM loop ≠ PRODUCTION_READY
 *   not AG/AH
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   not CloudAgent / Antigravity-first
 *   autonomy ≠ "resuelve cualquier repo"
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const AF_PRODUCTION_READY = 'NO';

export const AF_KIND = 'eos-autonomous-execution-loop';

export const AF_CODES = Object.freeze({
  OK: 'OK',
  COMPLETED: 'COMPLETED',
  DENY: 'DENY',
  ECR_TRIPPED: 'ECR_TRIPPED',
  TOKEN_BUDGET_EXCEEDED: 'TOKEN_BUDGET_EXCEEDED',
  HITL_REQUIRED: 'HITL_REQUIRED',
  MISSING_DEP: 'MISSING_DEP',
  PROVIDER_FAILED: 'PROVIDER_FAILED',
  INVALID_INTENT: 'INVALID_INTENT',
  ANOMALY: 'ANOMALY',
  FUNDACION_DENY: 'FUNDACION_DENY'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for autonomous execution loop failures.
 */
export class AutonomousExecutionLoopError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AF_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'AutonomousExecutionLoopError';
    this.code = code;
    this.details = sanitizeAfPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAfPayload(obj) {
  return sanitizeDeep(obj, new WeakSet());
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {unknown}
 */
function sanitizeDeep(value, seen) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (LONG_B64_RE.test(value)) return REDACTED;
    return redactSecretSubstrings(value);
  }
  if (typeof value !== 'object') return value;
  if (seen.has(/** @type {object} */ (value))) return '[Circular]';
  seen.add(/** @type {object} */ (value));

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v, seen));
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    // Budget counters are not secrets even if key contains "token"
    if (
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  out = out.replace(/\b(sk-[A-Za-z0-9]{8,})\b/g, REDACTED);
  out = out.replace(
    /\b(api[_-]?key|token|authorization)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
    (_m, k) => `${k}=${REDACTED}`
  );
  return out;
}

/**
 * @param {string} message
 * @returns {string}
 */
function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

/**
 * Default HITL: ALWAYS DENY (fail-closed).
 * @param {object} _request
 * @returns {boolean}
 */
function defaultHitlDeny(_request) {
  return false;
}

/**
 * Fail-closed stub when a required dep is missing.
 * @param {string} name
 */
function missingDepStub(name) {
  return {
    kind: `eos-af-missing-${name}`,
    PRODUCTION_READY: AF_PRODUCTION_READY,
    __missing: true,
    async complete() {
      throw new AutonomousExecutionLoopError(
        `missing required dep: ${name}`,
        AF_CODES.MISSING_DEP,
        { dep: name }
      );
    },
    beforeCall() {
      return {
        ok: false,
        allow: false,
        code: AF_CODES.MISSING_DEP,
        dep: name
      };
    },
    afterCall() {
      return { ok: false, code: AF_CODES.MISSING_DEP, dep: name };
    },
    shouldAllow() {
      return false;
    },
    allow() {
      return false;
    },
    check() {
      return {
        ok: false,
        allow: false,
        code: AF_CODES.MISSING_DEP,
        dep: name
      };
    }
  };
}

/**
 * Normalize budget beforeCall / check result.
 * @param {object} result
 */
function normalizeBudgetResult(result) {
  if (result == null || typeof result !== 'object') {
    return { ok: false, allow: false, code: AF_CODES.ANOMALY };
  }
  const allow =
    result.allow === true ||
    result.ok === true ||
    result.code === 'ALLOW' ||
    result.code === AF_CODES.OK;
  const deny =
    result.allow === false ||
    result.ok === false ||
    result.tripped === true ||
    [
      'ECR_TRIPPED',
      'TOKEN_BUDGET_EXCEEDED',
      'COST_BUDGET_EXCEEDED',
      'DENY'
    ].includes(String(result.code || ''));
  return {
    ...result,
    allow: allow && !deny,
    ok: allow && !deny,
    code:
      result.code ||
      (allow && !deny ? AF_CODES.OK : AF_CODES.ECR_TRIPPED)
  };
}

/**
 * Extract usage from LLM complete result for afterCall.
 * @param {object} llmResult
 */
function extractUsage(llmResult) {
  const usage =
    llmResult?.result?.usage ||
    llmResult?.usage ||
    {};
  const promptTokens = Number(usage.promptTokens || usage.tokensIn || 0) || 0;
  const completionTokens =
    Number(usage.completionTokens || usage.tokensOut || 0) || 0;
  const totalTokens =
    Number(usage.totalTokens || usage.tokens || 0) ||
    promptTokens + completionTokens;
  return {
    tokensIn: promptTokens,
    tokensOut: completionTokens,
    tokens: totalTokens,
    costUnits: Number(usage.costUnits || 0) || 0,
    provider: llmResult?.provider || llmResult?.result?.provider || 'unknown',
    intent: llmResult?.intent
  };
}

/**
 * Create the autonomous execution loop.
 *
 * @param {object} [options]
 * @param {object} [options.llmPort] — AD createLlmProviderPort / Fake
 * @param {object} [options.budgetGate] — AE createEcrBudgetGate
 * @param {object} [options.ecr] — alias for budgetGate / breaker
 * @param {object} [options.session] — W sovereign-session minimal: begin/step/end/getState
 * @param {object} [options.shell] — X minimal: enqueueIntent or executeCommand
 * @param {object} [options.swarm] — AA optional dispatch
 * @param {object} [options.flight] — Z optional targetFlight run
 * @param {{ approve(request): boolean|Promise<boolean> }} [options.hitl] — default DENY
 * @param {boolean} [options.enableSwarm=false]
 * @param {boolean} [options.enableFlight=false]
 * @param {boolean} [options.requireLlm=true]
 * @param {boolean} [options.requireBudget=true]
 * @param {boolean} [options.throwOnDeny=false] — if true, throw on DENY paths
 * @param {() => string} [options.now] — injectable clock
 */
export function createAutonomousExecutionLoop(options = {}) {
  const llmPort = options.llmPort || null;
  const budgetGate =
    options.budgetGate ||
    options.ecr ||
    null;
  const session = options.session || null;
  const shell = options.shell || null;
  const swarm = options.swarm || null;
  const flight = options.flight || null;
  const hitl =
    options.hitl && typeof options.hitl.approve === 'function'
      ? options.hitl
      : { approve: defaultHitlDeny };

  const enableSwarm = options.enableSwarm === true;
  const enableFlight = options.enableFlight === true;
  const requireLlm = options.requireLlm !== false;
  const requireBudget = options.requireBudget !== false;
  const throwOnDeny = options.throwOnDeny === true;
  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  /** @type {object[]} */
  const receipts = [];
  /** @type {{ cycles: number, lastCode: string|null, lastOk: boolean|null, anomalies: number }} */
  const state = {
    cycles: 0,
    lastCode: null,
    lastOk: null,
    anomalies: 0,
    lastReceiptId: null
  };

  function resolveBudget() {
    if (budgetGate && typeof budgetGate === 'object') return budgetGate;
    if (requireBudget) return missingDepStub('budgetGate');
    return null;
  }

  function resolveLlm() {
    if (llmPort && typeof llmPort === 'object') return llmPort;
    if (requireLlm) return missingDepStub('llmPort');
    return null;
  }

  /**
   * Emit a sealed receipt and push to history.
   * @param {object} partial
   */
  function emitReceipt(partial) {
    const receipt = sanitizeAfPayload({
      id: `af-rcpt-${state.cycles}-${Date.now()}`,
      at: now(),
      kind: AF_KIND,
      PRODUCTION_READY: AF_PRODUCTION_READY,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      ...partial
    });
    receipts.push(receipt);
    if (receipts.length > 50) receipts.shift();
    state.lastReceiptId = receipt.id;
    return receipt;
  }

  /**
   * Build DENY cycle result.
   * @param {string} code
   * @param {object} extra
   */
  function denyResult(code, extra = {}) {
    state.cycles += 1;
    state.lastCode = code;
    state.lastOk = false;
    if (
      code === AF_CODES.MISSING_DEP ||
      code === AF_CODES.ANOMALY ||
      code === AF_CODES.PROVIDER_FAILED
    ) {
      state.anomalies += 1;
    }
    const receipt = emitReceipt({
      ok: false,
      allow: false,
      code,
      ...extra
    });
    const result = sanitizeAfPayload({
      ok: false,
      allow: false,
      code,
      kind: AF_KIND,
      PRODUCTION_READY: AF_PRODUCTION_READY,
      receipt,
      ...extra
    });
    if (throwOnDeny) {
      throw new AutonomousExecutionLoopError(
        extra.message || `cycle DENY: ${code}`,
        code,
        { receipt, ...extra }
      );
    }
    return result;
  }

  /**
   * Single autonomous cycle.
   *
   * Order:
   *   1. budgetGate.beforeCall / shouldAllow — DENY → ECR_TRIPPED / TOKEN_BUDGET_EXCEEDED
   *   2. HITL if intent.requiresHitl or policy — DENY → HITL_REQUIRED
   *   3. llmPort.complete (fake in tests)
   *   4. optional swarm / flight behind flags
   *   5. budgetGate.afterCall recordUsage
   *   6. emit receipt / getState
   *
   * @param {object} intent
   */
  async function runCycle(intent = {}) {
    if (intent == null || typeof intent !== 'object') {
      return denyResult(AF_CODES.INVALID_INTENT, {
        message: 'runCycle requires an object intent'
      });
    }

    // Hard Fundacion deny — never open Fundacion writes from this loop
    if (
      intent.fundacionWrite === true ||
      intent.target === 'fundacion' ||
      intent.path === 'Documents/Fundacion' ||
      (typeof intent.path === 'string' &&
        /fundacion/i.test(intent.path))
    ) {
      return denyResult(AF_CODES.FUNDACION_DENY, {
        message: 'Fundacion ALWAYS DENY — no Fundacion writes from AF loop',
        fundacion: 'ALWAYS_DENY'
      });
    }

    const budget = resolveBudget();
    const llm = resolveLlm();

    // ── 1. Budget gate ──────────────────────────────────────────────────────
    if (budget) {
      if (budget.__missing) {
        return denyResult(AF_CODES.MISSING_DEP, {
          dep: 'budgetGate',
          message: 'budgetGate required but not injected'
        });
      }
      let pre;
      try {
        if (typeof budget.beforeCall === 'function') {
          pre = normalizeBudgetResult(budget.beforeCall({ intent }));
        } else if (typeof budget.check === 'function') {
          pre = normalizeBudgetResult(budget.check());
        } else if (typeof budget.shouldAllow === 'function') {
          const allowed = budget.shouldAllow();
          pre = {
            allow: allowed === true,
            ok: allowed === true,
            code: allowed === true ? AF_CODES.OK : AF_CODES.ECR_TRIPPED
          };
        } else if (typeof budget.allow === 'function') {
          const allowed = budget.allow();
          pre = {
            allow: allowed === true,
            ok: allowed === true,
            code: allowed === true ? AF_CODES.OK : AF_CODES.ECR_TRIPPED
          };
        } else {
          return denyResult(AF_CODES.ANOMALY, {
            message: 'budgetGate missing beforeCall/check/shouldAllow',
            dep: 'budgetGate'
          });
        }
      } catch (err) {
        return denyResult(AF_CODES.ANOMALY, {
          message: sanitizeErrorMessage(err.message || 'budget beforeCall failed'),
          cause: err.code || 'BUDGET_ERROR'
        });
      }

      if (!pre.allow) {
        const code =
          pre.code === 'TOKEN_BUDGET_EXCEEDED' ||
          pre.code === AF_CODES.TOKEN_BUDGET_EXCEEDED
            ? AF_CODES.TOKEN_BUDGET_EXCEEDED
            : pre.code === 'COST_BUDGET_EXCEEDED'
              ? AF_CODES.TOKEN_BUDGET_EXCEEDED
              : AF_CODES.ECR_TRIPPED;
        return denyResult(code, {
          message: 'budget gate DENY before LLM call',
          budget: pre,
          hitlRequired: true
        });
      }
    }

    // ── 2. HITL gate ────────────────────────────────────────────────────────
    const requiresHitl =
      intent.requiresHitl === true ||
      intent.hitl === true ||
      intent.policy === 'hitl' ||
      (intent.policy &&
        typeof intent.policy === 'object' &&
        intent.policy.requiresHitl === true);

    if (requiresHitl) {
      let approved = false;
      try {
        approved = await Promise.resolve(
          hitl.approve({
            intent,
            kind: AF_KIND,
            reason: 'intent.requiresHitl'
          })
        );
      } catch (err) {
        return denyResult(AF_CODES.HITL_REQUIRED, {
          message: sanitizeErrorMessage(err.message || 'HITL approve failed'),
          hitlRequired: true,
          approved: false
        });
      }
      if (approved !== true) {
        return denyResult(AF_CODES.HITL_REQUIRED, {
          message: 'HITL gate DENY (default fail-closed)',
          hitlRequired: true,
          approved: false
        });
      }
    }

    // ── 3. LLM complete ─────────────────────────────────────────────────────
    if (llm && llm.__missing) {
      return denyResult(AF_CODES.MISSING_DEP, {
        dep: 'llmPort',
        message: 'llmPort required but not injected'
      });
    }

    let llmResult = null;
    if (llm && typeof llm.complete === 'function') {
      try {
        llmResult = await llm.complete({
          prompt: intent.prompt != null ? String(intent.prompt) : '',
          intent: intent.intent != null ? String(intent.intent) : 'default',
          provider: intent.provider,
          preferred: intent.preferred,
          model: intent.model,
          maxTokens: intent.maxTokens,
          meta: intent.meta
        });
        if (llmResult && llmResult.ok === false) {
          return denyResult(AF_CODES.PROVIDER_FAILED, {
            message: 'llmPort.complete returned ok:false after fallbacks',
            llm: sanitizeAfPayload(llmResult)
          });
        }
      } catch (err) {
        return denyResult(AF_CODES.PROVIDER_FAILED, {
          message: sanitizeErrorMessage(
            err.message || 'llmPort.complete failed'
          ),
          cause: err.code || 'PROVIDER_ERROR'
        });
      }
    } else if (requireLlm) {
      return denyResult(AF_CODES.MISSING_DEP, {
        dep: 'llmPort',
        message: 'llmPort.complete not available'
      });
    }

    // ── Optional session / shell stubs (non-fatal if absent) ────────────────
    let sessionStep = null;
    if (session && typeof session.step === 'function') {
      try {
        sessionStep = await Promise.resolve(session.step(intent));
      } catch {
        /* session optional — anomaly counted but cycle continues if LLM ok */
        state.anomalies += 1;
      }
    } else if (session && typeof session.begin === 'function') {
      try {
        sessionStep = await Promise.resolve(session.begin(intent));
      } catch {
        state.anomalies += 1;
      }
    }

    let shellStep = null;
    if (shell) {
      try {
        if (typeof shell.enqueueIntent === 'function') {
          shellStep = await Promise.resolve(shell.enqueueIntent(intent));
        } else if (typeof shell.executeCommand === 'function' && intent.command) {
          shellStep = await Promise.resolve(shell.executeCommand(intent.command));
        }
      } catch {
        state.anomalies += 1;
      }
    }

    // ── 4. Optional swarm / flight behind flags ─────────────────────────────
    let swarmResult = null;
    if (enableSwarm) {
      if (!swarm || typeof swarm.dispatch !== 'function') {
        return denyResult(AF_CODES.MISSING_DEP, {
          dep: 'swarm',
          message: 'enableSwarm=true but swarm.dispatch missing'
        });
      }
      try {
        swarmResult = await Promise.resolve(
          swarm.dispatch(intent.change || intent)
        );
      } catch (err) {
        return denyResult(AF_CODES.ANOMALY, {
          message: sanitizeErrorMessage(err.message || 'swarm.dispatch failed'),
          cause: err.code || 'SWARM_ERROR'
        });
      }
    }

    let flightResult = null;
    if (enableFlight) {
      const runFn =
        (flight && typeof flight.run === 'function' && flight.run.bind(flight)) ||
        (flight &&
          typeof flight.targetFlight === 'function' &&
          flight.targetFlight.bind(flight)) ||
        (flight &&
          typeof flight.runFlight === 'function' &&
          flight.runFlight.bind(flight)) ||
        null;
      if (!runFn) {
        return denyResult(AF_CODES.MISSING_DEP, {
          dep: 'flight',
          message: 'enableFlight=true but flight.run/targetFlight missing'
        });
      }
      try {
        flightResult = await Promise.resolve(runFn(intent.flight || intent));
      } catch (err) {
        return denyResult(AF_CODES.ANOMALY, {
          message: sanitizeErrorMessage(err.message || 'flight run failed'),
          cause: err.code || 'FLIGHT_ERROR'
        });
      }
    }

    // ── 5. Budget afterCall ─────────────────────────────────────────────────
    let budgetAfter = null;
    if (budget && typeof budget.afterCall === 'function') {
      try {
        const usage = extractUsage(llmResult || {});
        usage.intent =
          intent.intent != null ? String(intent.intent) : usage.intent;
        budgetAfter = budget.afterCall(usage);
        if (
          budgetAfter &&
          (budgetAfter.allow === false ||
            budgetAfter.tripped === true ||
            budgetAfter.ok === false)
        ) {
          // Recorded usage tripped — cycle completed LLM but budget now DENY;
          // surface as trip receipt while still returning completed+trip info.
          state.cycles += 1;
          state.lastCode = AF_CODES.TOKEN_BUDGET_EXCEEDED;
          state.lastOk = false;
          const receipt = emitReceipt({
            ok: false,
            allow: false,
            code:
              budgetAfter.code === 'ECR_TRIPPED'
                ? AF_CODES.ECR_TRIPPED
                : AF_CODES.TOKEN_BUDGET_EXCEEDED,
            phase: 'afterCall',
            llm: llmResult,
            budgetAfter,
            hitlRequired: true,
            sessionStep,
            shellStep,
            swarmResult,
            flightResult
          });
          return sanitizeAfPayload({
            ok: false,
            allow: false,
            code:
              budgetAfter.code === 'ECR_TRIPPED'
                ? AF_CODES.ECR_TRIPPED
                : AF_CODES.TOKEN_BUDGET_EXCEEDED,
            kind: AF_KIND,
            PRODUCTION_READY: AF_PRODUCTION_READY,
            receipt,
            llm: llmResult,
            budgetAfter,
            hitlRequired: true,
            sessionStep,
            shellStep,
            swarmResult,
            flightResult
          });
        }
      } catch (err) {
        return denyResult(AF_CODES.ANOMALY, {
          message: sanitizeErrorMessage(err.message || 'budget afterCall failed'),
          cause: err.code || 'BUDGET_AFTER_ERROR',
          llm: llmResult
        });
      }
    }

    // ── 6. Success receipt ──────────────────────────────────────────────────
    state.cycles += 1;
    state.lastCode = AF_CODES.COMPLETED;
    state.lastOk = true;
    const receipt = emitReceipt({
      ok: true,
      allow: true,
      code: AF_CODES.COMPLETED,
      llm: llmResult,
      budgetAfter,
      sessionStep,
      shellStep,
      swarmResult,
      flightResult,
      intent: {
        intent: intent.intent,
        requiresHitl: !!requiresHitl,
        enableSwarm,
        enableFlight
      }
    });

    return sanitizeAfPayload({
      ok: true,
      allow: true,
      code: AF_CODES.COMPLETED,
      kind: AF_KIND,
      PRODUCTION_READY: AF_PRODUCTION_READY,
      receipt,
      llm: llmResult,
      budgetAfter,
      sessionStep,
      shellStep,
      swarmResult,
      flightResult
    });
  }

  async function health() {
    const deps = {
      llmPort: !!(llmPort && !llmPort.__missing),
      budgetGate: !!(budgetGate && !budgetGate.__missing),
      session: !!session,
      shell: !!shell,
      swarm: !!swarm,
      flight: !!flight,
      hitl: typeof hitl.approve === 'function'
    };
    return sanitizeAfPayload({
      ok: true,
      kind: AF_KIND,
      PRODUCTION_READY: AF_PRODUCTION_READY,
      deps,
      cycles: state.cycles,
      lastCode: state.lastCode,
      lastOk: state.lastOk,
      anomalies: state.anomalies,
      enableSwarm,
      enableFlight,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      nonClaim: {
        liveLlmLoopNotProductionReady: true,
        notAgAh: true,
        fundacionDelta0: true,
        notCloudAgent: true,
        autonomyNotSolveAnyRepo: true
      }
    });
  }

  function getState() {
    return sanitizeAfPayload({
      kind: AF_KIND,
      PRODUCTION_READY: AF_PRODUCTION_READY,
      cycles: state.cycles,
      lastCode: state.lastCode,
      lastOk: state.lastOk,
      anomalies: state.anomalies,
      lastReceiptId: state.lastReceiptId,
      receiptCount: receipts.length,
      recentReceipts: receipts.slice(-5),
      enableSwarm,
      enableFlight,
      requireLlm,
      requireBudget,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      depsPresent: {
        llmPort: !!llmPort,
        budgetGate: !!budgetGate,
        session: !!session,
        shell: !!shell,
        swarm: !!swarm,
        flight: !!flight
      },
      nonClaim: {
        liveLlmLoopNotProductionReady: true,
        notAgAh: true,
        fundacionDelta0: true,
        notCloudAgent: true,
        autonomyNotSolveAnyRepo: true
      }
    });
  }

  return {
    kind: AF_KIND,
    PRODUCTION_READY: AF_PRODUCTION_READY,
    runCycle,
    health,
    getState,
    /** @internal */
    sanitizeAfPayload,
    getReceipts: () => receipts.slice()
  };
}

export default createAutonomousExecutionLoop;
