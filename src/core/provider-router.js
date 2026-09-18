/**
 * @module EOSProviderRouter
 * @description Multi-Model Provider Router for EOS & J.A.R.V.I.S.
 * Classifies, optimizes, and distributes cognitive engineering workloads across frontier models.
 * Enforces strict redundancy, SLA budgets, and deterministic fallback policies.
 *
 * Real provider execution path (design D1-D6): additive `enrutarMisionReal` +
 * `probeProviderHealth` dispatch through `LlmAdapterRegistry` with the Law VI secret
 * broker and the ECR budget gate. `enrutarMision` / `forzarFallo*` simulation contract
 * stays byte-identical (hermetic flag tests). PRODUCTION_READY: NO
 */

import {
  LlmAuthError,
  LlmBudgetError,
  LlmProviderError,
  LlmRateLimitError,
  LlmSchemaValidationError,
  LlmTimeoutError
} from './ports/llm-port.js';
import { sanitizeEcrPayload } from './budget/ecr-budget-gate.js';

/** Stable fail-closed taxonomy surfaced by the real path (spec: Error taxonomy). */
const ROUTER_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  ADAPTER_NOT_FOUND: 'ADAPTER_NOT_FOUND',
  NO_CREDENTIALS: 'NO_CREDENTIALS',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE'
});

const PRODUCTION_READY = 'NO';

/** Adapter key → Law VI allowlisted env key NAME (design D3; names only). */
const ADAPTER_ENV_KEYS = Object.freeze({
  OPENROUTER: 'OPENROUTER_API_KEY',
  GOOGLE_GEMINI: 'GEMINI_API_KEY'
});

/** Adapter key → broker adapter id (design D3; allowlisted in env-gate). */
const ADAPTER_IDS = Object.freeze({
  OPENROUTER: 'adapter-openrouter',
  GOOGLE_GEMINI: 'adapter-gemini'
});

/** Retryable LlmPort codes — fallback retry ONLY on these (design D6). */
const RETRYABLE_CODES = new Set(['LLM_TIMEOUT', 'LLM_PROVIDER_FAILURE', 'LLM_RATE_LIMITED']);

/** LlmPort → router error bridge (design D4). */
const LLM_TO_ROUTER_BRIDGE = Object.freeze({
  LLM_TIMEOUT: { status: ROUTER_STATUS.PROVIDER_TIMEOUT, providerCode: 'LLM_TIMEOUT' },
  LLM_AUTH_DENIED: { status: ROUTER_STATUS.PROVIDER_UNAVAILABLE, providerCode: 'LLM_AUTH_DENIED' },
  LLM_RATE_LIMITED: { status: ROUTER_STATUS.PROVIDER_UNAVAILABLE, providerCode: 'LLM_RATE_LIMITED' },
  LLM_PROVIDER_FAILURE: { status: ROUTER_STATUS.PROVIDER_UNAVAILABLE, providerCode: 'LLM_PROVIDER_FAILURE' },
  LLM_SCHEMA_VALIDATION_FAILED: {
    status: ROUTER_STATUS.PROVIDER_UNAVAILABLE,
    providerCode: 'LLM_SCHEMA_VALIDATION_FAILED'
  },
  LLM_BUDGET_EXCEEDED: { status: ROUTER_STATUS.BUDGET_EXCEEDED, providerCode: 'LLM_BUDGET_EXCEEDED' }
});

/**
 * Resolve the stable LlmPort error code from a thrown value (code field first,
 * then instanceof — doubles may throw class instances without a code).
 * @param {unknown} err
 * @returns {string|null}
 */
function llmErrorCode(err) {
  if (err && typeof err.code === 'string' && err.code) return err.code;
  if (err instanceof LlmTimeoutError) return 'LLM_TIMEOUT';
  if (err instanceof LlmBudgetError) return 'LLM_BUDGET_EXCEEDED';
  if (err instanceof LlmAuthError) return 'LLM_AUTH_DENIED';
  if (err instanceof LlmRateLimitError) return 'LLM_RATE_LIMITED';
  if (err instanceof LlmSchemaValidationError) return 'LLM_SCHEMA_VALIDATION_FAILED';
  if (err instanceof LlmProviderError) return 'LLM_PROVIDER_FAILURE';
  return null;
}

/**
 * Bridge a LlmPort error to the router taxonomy (design D4). Unknown/plain
 * errors fail closed as PROVIDER_UNAVAILABLE with no provider code.
 * @param {unknown} err
 * @returns {{ status: string, providerCode?: string }}
 */
function bridgeError(err) {
  const mapped = LLM_TO_ROUTER_BRIDGE[llmErrorCode(err)];
  if (mapped) return mapped;
  return { status: ROUTER_STATUS.PROVIDER_UNAVAILABLE, providerCode: undefined };
}

/**
 * Collect prompt fragments for opaque redaction (full prompts never leave the router).
 * @param {unknown} messages
 * @returns {string[]}
 */
function extractPromptTerms(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((m) => (m && typeof m.content === 'string' ? m.content : null))
    .filter((t) => t && t.length >= 4);
}

/**
 * Build a text redactor: ECR secret-shape sanitization first, then prompt terms.
 * @param {string[]} terms
 * @returns {(text: unknown) => string}
 */
function makeRedactor(terms) {
  return (text) => {
    let out = String(text == null ? '' : text);
    const cleaned = sanitizeEcrPayload(out);
    if (typeof cleaned === 'string') out = cleaned;
    for (const term of terms) {
      if (term && term.length >= 4) out = out.split(term).join('[REDACTED]');
    }
    return out;
  };
}

/**
 * Fail-closed envelope (design D6 MCP shape): `{status, code, executed:false,
 * sideEffects:'NONE', reason, PRODUCTION_READY}` plus optional bridge fields.
 * @param {string} status
 * @param {string} reason
 * @param {object} [extra]
 * @returns {object}
 */
function failureEnvelope(status, reason, extra = {}) {
  return {
    status,
    code: status,
    executed: false,
    sideEffects: 'NONE',
    reason,
    PRODUCTION_READY,
    ...extra
  };
}

export class EOSProviderRouter {
  /**
   * @param {object} [config]
   * @param {number} [config.timeoutMs=5000] Request timeout threshold
   * @param {object} [config.registry] LlmAdapterRegistry (real dispatch path)
   * @param {object} [config.secretBroker] Law VI secret runtime broker (real path)
   * @param {object} [config.ecrGate] ECR budget gate (real path; missing → spend denied)
   */
  constructor(config = {}) {
    this.timeoutMs = config.timeoutMs || 5000;
    this.matrix = {
      'ARCHITECTURE_DEEP': { primary: 'claude-3-5-sonnet', fallback: 'gpt-4o' },
      'TDD_COMPLEX':       { primary: 'claude-3-5-sonnet', fallback: 'gpt-4o' },
      'CONTRACT_SYNTHESIS':{ primary: 'gpt-4o',             fallback: 'gemini-1-5-pro' },
      'CONTEXT_MASSIVE':   { primary: 'gemini-1-5-pro',     fallback: 'gpt-4o' }
    };

    // Real provider execution path (slice 2): optional injected dependencies.
    // Absent dependencies fail closed — the real path NEVER simulates success.
    this.registry = config.registry || null;
    this.secretBroker = config.secretBroker || null;
    this.ecrGate = config.ecrGate || null;
  }

  /**
   * Evaluates the optimal model and executes deterministic routing with automated fallback
   * @param {string} tipoTarea - Task classification category
   * @param {boolean} [forzarFalloPrimario=false] - For failure simulation and resilience testing
   * @param {boolean} [forzarFalloFallback=false] - For dual failure simulation
   * @returns {Promise<object>}
   */
  async enrutarMision(tipoTarea, forzarFalloPrimario = false, forzarFalloFallback = false) {
    const mapeo = this.matrix[tipoTarea];
    if (!mapeo) {
      throw new Error(`🚨 ROUTER FAULT: Tipo de tarea desconocido o no indexado: ${tipoTarea}`);
    }

    console.log(`📡 [EOS ROUTER] > Clasificando tarea [${tipoTarea}]. Proveedor objetivo: ${mapeo.primary}`);

    try {
      if (forzarFalloPrimario) {
        throw new Error('Timeout de red excedido en el nodo primario.');
      }

      return {
        estado: 'SUCCESS',
        proveedorUtilizado: mapeo.primary,
        modo: 'PRIMARY',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`⚠️ [EOS ROUTER] > Fallo en proveedor primario (${mapeo.primary}): ${error.message}. Activando contingencia...`);

      if (forzarFalloFallback) {
        throw new Error(`🚨 FATAL_ROUTING_FAILURE: Todos los proveedores de contingencia fallaron para [${tipoTarea}].`);
      }

      return {
        estado: 'SUCCESS',
        proveedorUtilizado: mapeo.fallback,
        modo: 'FALLBACK',
        mensaje: `Flujo recuperado mediante degradación limpia hacia ${mapeo.fallback}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * REAL dispatch path (design D1/D2/D3/D6) — additive, never touches the
   * simulation contract above.
   *
   * Data flow: matrix → `registry.resolveModel` → Law VI broker presence + inject →
   * ECR `beforeCall` gate → adapter `infer()` (injectable fetchImpl) → ECR
   * `afterCall` usage record → D6 receipt. Every fail-closed path performs ZERO
   * network I/O. Fallback retry is sanctioned for timeout/provider/rate-limit only
   * and never exceeds the attempt list (primary + one fallback = ≤2 network calls).
   *
   * @param {string} taskType - matrix task classification key
   * @param {object} [request] - `{ messages, request_id?, structured_output_schema?, timeout_ms?, max_output_tokens? }`
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs]
   * @param {number} [opts.maxOutputTokens]
   * @param {number} [opts.fallbackRetries=1] - 0 disables the retry fallback
   * @returns {Promise<object>} D6 receipt (`status:'SUCCESS'`) or fail-closed envelope
   */
  async enrutarMisionReal(taskType, request = {}, opts = {}) {
    const mapeo = this.matrix[taskType];
    if (!mapeo || !this.registry || typeof this.registry.resolveModel !== 'function') {
      return failureEnvelope(
        ROUTER_STATUS.ADAPTER_NOT_FOUND,
        'no routing mapping or registry for the requested task type'
      );
    }

    const primary = this.registry.resolveModel(mapeo.primary);
    if (!primary) {
      return failureEnvelope(
        ROUTER_STATUS.ADAPTER_NOT_FOUND,
        `no adapter for primary model '${mapeo.primary}'`
      );
    }

    // Sanctioned attempt list: primary + retry fallback (design D6) — never more.
    const attempts = [{ matrixId: mapeo.primary, resolved: primary }];
    if (opts.fallbackRetries !== 0) {
      const fallback = this.registry.resolveModel(mapeo.fallback);
      if (fallback) attempts.push({ matrixId: mapeo.fallback, resolved: fallback });
    }

    const redact = makeRedactor(extractPromptTerms(request.messages));
    let lastFailure = null;

    for (let i = 0; i < attempts.length; i += 1) {
      const attemptResult = await this._dispatchAttempt(
        attempts[i],
        request,
        taskType,
        opts,
        redact
      );
      if (attemptResult.ok) {
        return this._buildSuccessReceipt(
          attemptResult,
          i === 0 ? 'PRIMARY' : 'FALLBACK'
        );
      }
      lastFailure = attemptResult;
      if (!attemptResult.retryable) break;
    }

    return lastFailure.envelope;
  }

  /**
   * Single dispatch attempt: registry adapter → broker credentials → ECR gate →
   * infer → afterCall usage record. Pure network boundary is the adapter's
   * injectable fetchImpl; the double spy asserts zero calls on fail-closed paths.
   * @param {{ matrixId: string, resolved: { adapterKey: string, model: string } }} attempt
   * @param {object} request
   * @param {string} taskType
   * @param {object} opts
   * @param {(text: unknown) => string} redact
   * @returns {Promise<{ ok: true, matrixId: string, response: object } | { ok: false, retryable: boolean, envelope: object }>}
   */
  async _dispatchAttempt(attempt, request, taskType, opts, redact) {
    const { matrixId, resolved } = attempt;
    const { adapterKey, model } = resolved;
    const envKey = ADAPTER_ENV_KEYS[adapterKey];
    const adapterId = ADAPTER_IDS[adapterKey];

    // Credential governance unavailable → fail closed, never simulate.
    if (!this.secretBroker || !envKey || !adapterId) {
      return {
        ok: false,
        retryable: false,
        envelope: failureEnvelope(
          ROUTER_STATUS.NO_CREDENTIALS,
          'credential governance unavailable for adapter'
        )
      };
    }

    let adapter;
    try {
      adapter = this.registry.getAdapter(adapterKey);
    } catch {
      return {
        ok: false,
        retryable: false,
        envelope: failureEnvelope(
          ROUTER_STATUS.ADAPTER_NOT_FOUND,
          `no registered adapter for '${adapterKey}'`
        )
      };
    }

    // Law VI: presence gate first (zero I/O), then inject-only delivery to the adapter.
    const presence = this.secretBroker.resolveSecret(envKey);
    if (!presence || !presence.ok || !presence.present) {
      return {
        ok: false,
        retryable: false,
        envelope: failureEnvelope(
          ROUTER_STATUS.NO_CREDENTIALS,
          'provider credentials are not configured'
        )
      };
    }

    const injected = this.secretBroker.injectToAdapter(adapterId, envKey, adapter);
    if (!injected || !injected.ok) {
      const status =
        injected && injected.code === 'MISSING_ENV'
          ? ROUTER_STATUS.NO_CREDENTIALS
          : ROUTER_STATUS.PROVIDER_UNAVAILABLE;
      return {
        ok: false,
        retryable: false,
        envelope: failureEnvelope(
          status,
          `credential injection denied (${injected && injected.code ? injected.code : 'DENY'})`
        )
      };
    }

    // ECR budget gate BEFORE any network I/O (spec: Budget gate before network I/O).
    if (!this.ecrGate || typeof this.ecrGate.beforeCall !== 'function') {
      return {
        ok: false,
        retryable: false,
        envelope: failureEnvelope(
          ROUTER_STATUS.BUDGET_EXCEEDED,
          'budget gate unavailable — spend denied'
        )
      };
    }
    const gate = this.ecrGate.beforeCall({ intent: taskType, provider: adapterKey });
    if (!gate || gate.ok !== true || gate.allow !== true) {
      return {
        ok: false,
        retryable: false,
        envelope: failureEnvelope(
          ROUTER_STATUS.BUDGET_EXCEEDED,
          `ECR denied before network I/O (${gate && gate.code ? gate.code : 'DENY'})`
        )
      };
    }

    // Real inference; adapter redacts its own key, the bridge redacts prompts.
    let response;
    try {
      response = await adapter.infer(this._buildInferRequest(request, model, opts));
    } catch (err) {
      const mapped = bridgeError(err);
      const providerCode = mapped.providerCode
        ? { providerCode: mapped.providerCode }
        : {};
      return {
        ok: false,
        retryable: RETRYABLE_CODES.has(llmErrorCode(err)),
        envelope: failureEnvelope(
          mapped.status,
          redact(err && err.message ? err.message : mapped.status),
          providerCode
        )
      };
    }

    // Record usage AFTER the successful call only (apply contract; D6).
    try {
      const usage = response.usage || {};
      this.ecrGate.afterCall({
        tokensIn: usage.input_tokens,
        tokensOut: usage.output_tokens,
        costUnits: usage.estimated_cost_usd,
        provider: adapterKey,
        intent: taskType
      });
    } catch {
      // Usage recording must never void a completed call; the receipt carries usage.
    }

    return { ok: true, matrixId, response };
  }

  /**
   * Build the LlmPort infer request from the router request + resolved model.
   * @param {object} request
   * @param {string} model
   * @param {object} opts
   * @returns {object}
   */
  _buildInferRequest(request, model, opts) {
    const inferRequest = {
      model,
      messages: Array.isArray(request.messages) ? request.messages : [],
      request_id: request.request_id || `rp-${Date.now().toString(36)}`,
      budget_constraints: {
        timeout_ms: opts.timeoutMs || request.timeout_ms || this.timeoutMs,
        max_output_tokens: opts.maxOutputTokens || request.max_output_tokens || 4096
      }
    };
    if (request.structured_output_schema) {
      inferRequest.structured_output_schema = request.structured_output_schema;
    }
    return inferRequest;
  }

  /**
   * D6 receipt — explicit usage copy; never spreads unknown response fields.
   * @param {{ matrixId: string, response: object }} result
   * @param {'PRIMARY'|'FALLBACK'} modo
   * @returns {object}
   */
  _buildSuccessReceipt({ matrixId, response }, modo) {
    const usage = response.usage || {};
    return {
      status: ROUTER_STATUS.SUCCESS,
      executed: true,
      proveedorUtilizado: matrixId,
      modo,
      latency_ms: response.latency_ms,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost_usd: usage.estimated_cost_usd
      },
      PRODUCTION_READY
    };
  }

  /**
   * REAL timed health probe (design D5). Unknown/unconfigured providers degrade
   * gracefully (never throw). Gemini has no injectable transport → governed
   * presence-only (zero network). Returns credential presence + latency + no secrets.
   * @param {string} providerId - adapter key, alias, or model id resolvable by the registry
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs]
   * @param {number} [opts.retries=2]
   * @returns {Promise<object>}
   */
  async probeProviderHealth(providerId, opts = {}) {
    const timeoutMs = opts.timeoutMs || this.timeoutMs;
    const retries = opts.retries != null ? opts.retries : 2;

    const degraded = (status) => ({
      provider: String(providerId),
      status,
      credentials: { present: false },
      latency_ms: 0,
      PRODUCTION_READY
    });

    if (!this.registry || typeof this.registry.getAdapter !== 'function') {
      return degraded(ROUTER_STATUS.PROVIDER_UNAVAILABLE);
    }

    let adapter;
    try {
      adapter = this.registry.getAdapter(providerId);
    } catch {
      return degraded(ROUTER_STATUS.PROVIDER_UNAVAILABLE);
    }

    // Law VI broker presence governs every probe, including Gemini's presence-only path.
    const presence =
      this.secretBroker && typeof this.secretBroker.resolveSecret === 'function'
        ? this.secretBroker.resolveSecret(ADAPTER_ENV_KEYS[adapter.getName()])
        : null;
    if (!presence || !presence.ok || !presence.present) {
      return degraded(ROUTER_STATUS.NO_CREDENTIALS);
    }

    // D5: no injectable transport (Gemini) → presence-only, zero network.
    if (typeof adapter.probe !== 'function') {
      return {
        provider: adapter.getName(),
        status: ROUTER_STATUS.SUCCESS,
        credentials: { present: true },
        latency_ms: 0,
        PRODUCTION_READY
      };
    }

    try {
      const probe = await adapter.probe({ timeoutMs, retries });
      return {
        provider: adapter.getName(),
        status: ROUTER_STATUS.SUCCESS,
        credentials: { present: true },
        latency_ms: probe.latency_ms,
        PRODUCTION_READY
      };
    } catch (err) {
      const mapped = bridgeError(err);
      const providerCode = mapped.providerCode
        ? { providerCode: mapped.providerCode }
        : {};
      return {
        provider: adapter.getName(),
        status: mapped.status,
        credentials: { present: true },
        latency_ms: 0,
        PRODUCTION_READY,
        ...providerCode
      };
    }
  }
}
