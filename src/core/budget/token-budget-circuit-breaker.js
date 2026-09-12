/**
 * @module token-budget-circuit-breaker
 * SPEC-0036 / Mission AE — Token-Budget Circuit Breaker / ECR.
 *
 * Session-scoped budget gate for the execution loop. Trips fail-closed on
 * token and/or estimated-cost threshold exceed; DENY with HITL escalate.
 * Optional injectable BoundedOutputFilter (AA-compatible observe semantics).
 *
 * Law VI: no secrets in state dumps / receipts / errors.
 *
 * NON-CLAIM:
 *   ECR ≠ billing platform
 *   ECR ≠ PRODUCTION_READY
 *   not AF/AG/AH
 *   Fundacion Δ=0
 *   not unbounded spend / not CloudAgent
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const ECR_PRODUCTION_READY = 'NO';

export const ECR_KIND = 'eos-token-budget-circuit-breaker';

export const ECR_CODES = Object.freeze({
  OK: 'OK',
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  TOKEN_BUDGET_EXCEEDED: 'TOKEN_BUDGET_EXCEEDED',
  ECR_TRIPPED: 'ECR_TRIPPED',
  COST_BUDGET_EXCEEDED: 'COST_BUDGET_EXCEEDED',
  RESET_DENIED: 'RESET_DENIED',
  INVALID_USAGE: 'INVALID_USAGE'
});

/** Secret-shaped keys only — do NOT match budget counters (tokens, tokenThreshold). */
const SECRET_KEY_RE =
  /^(?:api[_-]?key|access[_-]?token|auth[_-]?token|id[_-]?token|refresh[_-]?token|authorization|secret|password|credential|private[_-]?key)$/i;

const SECRET_KEY_PARTIAL_RE =
  /(?:api[_-]?key|authorization|password|credential|private[_-]?key|accessToken|idToken|refreshToken|authToken)/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * @param {string} key
 * @returns {boolean}
 */
function isSecretKey(key) {
  const k = String(key);
  // Budget / usage counters are not secrets
  if (
    /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits)$/i.test(
      k
    )
  ) {
    return false;
  }
  if (SECRET_KEY_RE.test(k)) return true;
  // Bare "token" (exact) is a secret; "tokens" is a counter
  if (/^token$/i.test(k)) return true;
  return SECRET_KEY_PARTIAL_RE.test(k);
}

/**
 * Typed error for ECR / token-budget circuit breaker.
 */
export class TokenBudgetCircuitBreakerError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = ECR_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'TokenBudgetCircuitBreakerError';
    this.code = code;
    this.details = sanitizeEcrPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeEcrPayload(obj) {
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
    if (isSecretKey(k)) {
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
 * @param {unknown} n
 * @param {number} fallback
 * @returns {number}
 */
function finiteNonNeg(n, fallback) {
  if (!Number.isFinite(Number(n))) return fallback;
  return Math.max(0, Number(n));
}

/**
 * Thin AA-compatible BoundedOutputFilter (observe / filterOutbound).
 * Self-contained — no swarm dependency. Prefer injectable AA filter when
 * present on host; this is the hermetic default for AE.
 *
 * @param {object} [opts]
 * @param {number} [opts.budget=4096]
 * @param {number} [opts.used=0]
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
    return s.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * @param {{ used?: number, budget?: number, delta?: number }} args
   */
  function observeTokens(args = {}) {
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
        reason: ECR_CODES.TOKEN_BUDGET_EXCEEDED,
        PRODUCTION_READY: ECR_PRODUCTION_READY
      };
    }
    return {
      ok: true,
      used,
      budget,
      PRODUCTION_READY: ECR_PRODUCTION_READY
    };
  }

  function filterOutbound(text) {
    const delta = estimateTokens(text);
    const obs = observeTokens({ delta });
    if (!obs.ok) {
      return {
        ok: false,
        used: obs.used,
        budget: obs.budget,
        reason: ECR_CODES.TOKEN_BUDGET_EXCEEDED,
        PRODUCTION_READY: ECR_PRODUCTION_READY
      };
    }
    return {
      ok: true,
      text: text == null ? '' : String(text),
      used: obs.used,
      budget: obs.budget,
      PRODUCTION_READY: ECR_PRODUCTION_READY
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
    PRODUCTION_READY: ECR_PRODUCTION_READY,
    observeTokens,
    filterOutbound,
    getUsage,
    reset,
    estimateTokens
  };
}

/**
 * Factory — Token-Budget Circuit Breaker / ECR.
 *
 * @param {object} [options]
 * @param {number} [options.tokenThreshold=4096] — max tokens (in+out cumulative)
 * @param {number} [options.maxTokens] — alias of tokenThreshold
 * @param {number} [options.costThreshold] — max estimated cost units (optional)
 * @param {number} [options.maxCostUnits] — alias of costThreshold
 * @param {boolean} [options.allowReset=false] — reset only via explicit opt-in / HITL
 * @param {boolean} [options.hitlRequiredOnTrip=true]
 * @param {object} [options.boundedOutputFilter] — injectable AA-compatible filter
 * @param {boolean} [options.wireBoundedFilter=true] — sync observe into optional filter
 * @param {number} [options.initialTokens=0]
 * @param {number} [options.initialCost=0]
 */
export function createTokenBudgetCircuitBreaker(options = {}) {
  const tokenThreshold = Math.max(
    0,
    Math.floor(
      finiteNonNeg(
        options.tokenThreshold ?? options.maxTokens,
        4096
      )
    )
  );
  const costRaw = options.costThreshold ?? options.maxCostUnits;
  const costThreshold =
    costRaw == null || costRaw === ''
      ? null
      : Math.max(0, finiteNonNeg(costRaw, 0));

  const allowReset = options.allowReset === true;
  const hitlRequiredOnTrip = options.hitlRequiredOnTrip !== false;
  const wireBoundedFilter = options.wireBoundedFilter !== false;

  const boundedOutputFilter =
    options.boundedOutputFilter &&
    typeof options.boundedOutputFilter === 'object'
      ? options.boundedOutputFilter
      : null;

  /** @type {{ tokensUsed: number, costUsed: number, tripped: boolean, tripReceipt: object|null, recordCount: number, lastProvider: string|null, lastIntent: string|null, tripAt: string|null, tripCode: string|null }} */
  const state = {
    tokensUsed: Math.max(
      0,
      Math.floor(finiteNonNeg(options.initialTokens, 0))
    ),
    costUsed: Math.max(0, finiteNonNeg(options.initialCost, 0)),
    tripped: false,
    tripReceipt: null,
    recordCount: 0,
    lastProvider: null,
    lastIntent: null,
    tripAt: null,
    tripCode: null
  };

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function buildReceipt(code, extra = {}) {
    return sanitizeEcrPayload({
      code,
      threshold: {
        tokens: tokenThreshold,
        cost: costThreshold
      },
      used: {
        tokens: state.tokensUsed,
        cost: state.costUsed
      },
      at: new Date().toISOString(),
      PRODUCTION_READY: ECR_PRODUCTION_READY,
      kind: ECR_KIND,
      hitlRequired: hitlRequiredOnTrip,
      ...extra
    });
  }

  /**
   * Fail-closed trip. Idempotent once tripped.
   * @param {string} [code]
   * @param {object} [extra]
   */
  function trip(code = ECR_CODES.ECR_TRIPPED, extra = {}) {
    const resolved =
      code === ECR_CODES.TOKEN_BUDGET_EXCEEDED ||
      code === ECR_CODES.COST_BUDGET_EXCEEDED
        ? code
        : ECR_CODES.ECR_TRIPPED;
    if (!state.tripped) {
      state.tripped = true;
      state.tripAt = new Date().toISOString();
      state.tripCode = resolved;
      state.tripReceipt = buildReceipt(resolved, extra);
    }
    return denyResult(state.tripCode || resolved);
  }

  /**
   * @param {string} code
   */
  function denyResult(code) {
    return sanitizeEcrPayload({
      ok: false,
      allow: false,
      code,
      reason: code,
      hitlRequired: true,
      tripped: true,
      used: { tokens: state.tokensUsed, cost: state.costUsed },
      threshold: { tokens: tokenThreshold, cost: costThreshold },
      receipt: state.tripReceipt,
      PRODUCTION_READY: ECR_PRODUCTION_READY,
      kind: ECR_KIND
    });
  }

  function allowResult() {
    return sanitizeEcrPayload({
      ok: true,
      allow: true,
      code: ECR_CODES.ALLOW,
      hitlRequired: false,
      tripped: false,
      used: { tokens: state.tokensUsed, cost: state.costUsed },
      threshold: { tokens: tokenThreshold, cost: costThreshold },
      remaining: {
        tokens: Math.max(0, tokenThreshold - state.tokensUsed),
        cost:
          costThreshold == null
            ? null
            : Math.max(0, costThreshold - state.costUsed)
      },
      PRODUCTION_READY: ECR_PRODUCTION_READY,
      kind: ECR_KIND
    });
  }

  /**
   * Evaluate thresholds without mutating trip (unless already tripped).
   */
  function evaluateExceed() {
    if (state.tokensUsed > tokenThreshold) {
      return ECR_CODES.TOKEN_BUDGET_EXCEEDED;
    }
    if (costThreshold != null && state.costUsed > costThreshold) {
      return ECR_CODES.COST_BUDGET_EXCEEDED;
    }
    return null;
  }

  /**
   * Gate check — if already tripped or currently over threshold → DENY.
   * Over-threshold check also trips (fail-closed).
   */
  function check() {
    if (state.tripped) {
      return denyResult(state.tripCode || ECR_CODES.ECR_TRIPPED);
    }
    const exceed = evaluateExceed();
    if (exceed) {
      return trip(exceed);
    }
    return allowResult();
  }

  /**
   * Fast allow probe (does not trip on latent exceed — prefer check()).
   * Returns boolean; if tripped, false.
   */
  function shouldAllow() {
    if (state.tripped) return false;
    return evaluateExceed() == null;
  }

  /**
   * Record usage; may trip on exceed. Fail-closed if already tripped.
   * @param {object} [usage]
   * @param {number} [usage.tokensIn]
   * @param {number} [usage.tokensOut]
   * @param {number} [usage.tokens] — direct total delta
   * @param {number} [usage.costUnits]
   * @param {string} [usage.provider]
   * @param {string} [usage.intent]
   */
  function recordUsage(usage = {}) {
    if (usage == null || typeof usage !== 'object') {
      throw new TokenBudgetCircuitBreakerError(
        'recordUsage requires an object',
        ECR_CODES.INVALID_USAGE
      );
    }

    if (state.tripped) {
      return denyResult(state.tripCode || ECR_CODES.ECR_TRIPPED);
    }

    const tokensIn = Math.max(0, Math.floor(finiteNonNeg(usage.tokensIn, 0)));
    const tokensOut = Math.max(0, Math.floor(finiteNonNeg(usage.tokensOut, 0)));
    const tokensDirect = Number.isFinite(Number(usage.tokens))
      ? Math.max(0, Math.floor(Number(usage.tokens)))
      : 0;
    const deltaTokens = tokensDirect > 0 ? tokensDirect : tokensIn + tokensOut;
    const deltaCost = Math.max(0, finiteNonNeg(usage.costUnits, 0));

    state.tokensUsed += deltaTokens;
    state.costUsed += deltaCost;
    state.recordCount += 1;
    if (usage.provider != null) {
      state.lastProvider = String(usage.provider);
    }
    if (usage.intent != null) {
      state.lastIntent = String(usage.intent);
    }

    // Mirror into BoundedOutputFilter observe semantics when wired
    if (
      wireBoundedFilter &&
      boundedOutputFilter &&
      typeof boundedOutputFilter.observeTokens === 'function' &&
      deltaTokens > 0
    ) {
      const obs = boundedOutputFilter.observeTokens({ delta: deltaTokens });
      if (obs && obs.ok === false) {
        return trip(ECR_CODES.TOKEN_BUDGET_EXCEEDED, {
          observe: {
            used: obs.used,
            budget: obs.budget,
            reason: obs.reason || ECR_CODES.TOKEN_BUDGET_EXCEEDED
          }
        });
      }
    }

    const exceed = evaluateExceed();
    if (exceed) {
      return trip(exceed);
    }
    return allowResult();
  }

  /**
   * Reset only via explicit opt-in / HITL path.
   * Default fail-closed after trip until reset with allowReset or { confirm: true }.
   * @param {object} [opts]
   * @param {boolean} [opts.confirm] — HITL confirm when allowReset was false at create
   * @param {boolean} [opts.hitlConfirmed] — alias of confirm
   */
  function reset(opts = {}) {
    const confirmed =
      opts === true ||
      (opts && typeof opts === 'object' &&
        (opts.confirm === true || opts.hitlConfirmed === true));

    if (!allowReset && !confirmed) {
      return sanitizeEcrPayload({
        ok: false,
        code: ECR_CODES.RESET_DENIED,
        reason: ECR_CODES.RESET_DENIED,
        hitlRequired: true,
        tripped: state.tripped,
        message:
          'reset requires allowReset=true at create or explicit HITL confirm',
        PRODUCTION_READY: ECR_PRODUCTION_READY,
        kind: ECR_KIND
      });
    }

    state.tokensUsed = 0;
    state.costUsed = 0;
    state.tripped = false;
    state.tripReceipt = null;
    state.tripAt = null;
    state.tripCode = null;
    state.recordCount = 0;
    state.lastProvider = null;
    state.lastIntent = null;

    if (
      boundedOutputFilter &&
      typeof boundedOutputFilter.reset === 'function'
    ) {
      boundedOutputFilter.reset();
    }

    return sanitizeEcrPayload({
      ok: true,
      code: ECR_CODES.OK,
      reset: true,
      hitlRequired: false,
      tripped: false,
      PRODUCTION_READY: ECR_PRODUCTION_READY,
      kind: ECR_KIND
    });
  }

  function health() {
    return sanitizeEcrPayload({
      ok: !state.tripped,
      kind: ECR_KIND,
      PRODUCTION_READY: ECR_PRODUCTION_READY,
      tripped: state.tripped,
      hitlRequired: state.tripped ? true : false,
      tokenThreshold,
      costThreshold,
      used: { tokens: state.tokensUsed, cost: state.costUsed },
      allowReset,
      boundedOutputFilter: Boolean(boundedOutputFilter),
      nonClaim: {
        ecrNotBillingPlatform: true,
        ecrNotProductionReady: true,
        notAfAgAh: true,
        fundacionDelta0: true,
        notCloudAgent: true
      }
    });
  }

  function getState() {
    return sanitizeEcrPayload({
      kind: ECR_KIND,
      PRODUCTION_READY: ECR_PRODUCTION_READY,
      tripped: state.tripped,
      tripCode: state.tripCode,
      tripAt: state.tripAt,
      tripReceipt: state.tripReceipt,
      tokenThreshold,
      costThreshold,
      used: { tokens: state.tokensUsed, cost: state.costUsed },
      recordCount: state.recordCount,
      lastProvider: state.lastProvider,
      lastIntent: state.lastIntent,
      allowReset,
      hitlRequiredOnTrip,
      boundedOutputFilter: Boolean(boundedOutputFilter),
      // Never dump secrets / env values
      nonClaim: {
        ecrNotBillingPlatform: true,
        ecrNotProductionReady: true,
        notAfAgAh: true,
        fundacionDelta0: true,
        notCloudAgent: true
      }
    });
  }

  return {
    kind: ECR_KIND,
    PRODUCTION_READY: ECR_PRODUCTION_READY,
    recordUsage,
    check,
    trip,
    reset,
    health,
    getState,
    shouldAllow,
    /** @internal */
    sanitizeEcrPayload,
    getBoundedOutputFilter: () => boundedOutputFilter
  };
}

/** Alias — ECR */
export const createECR = createTokenBudgetCircuitBreaker;
export const createEcr = createTokenBudgetCircuitBreaker;

export default createTokenBudgetCircuitBreaker;
