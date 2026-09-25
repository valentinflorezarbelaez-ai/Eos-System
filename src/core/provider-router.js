/**
 * @module EOSProviderRouter
 * @description Multi-Model Provider Router for EOS & J.A.R.V.I.S.
 * Classifies, optimizes, and distributes cognitive engineering workloads across frontier models.
 * Enforces strict redundancy, SLA budgets, and deterministic fallback policies.
 * Additively supports real provider execution with Law VI secret broker, ECR budget gate,
 * and fail-closed error taxonomy.
 */

import { LlmAdapterRegistry } from './adapters/llm/adapter-registry.js';
import { createSecretRuntimeBroker } from './secrets/secret-runtime-broker.js';
import { createEcrBudgetGate } from './budget/ecr-budget-gate.js';
import { sanitizeErrorMessage } from './secrets/secret-leak-guard.js';
import {
  LlmTimeoutError,
  LlmAuthError,
  LlmRateLimitError,
  LlmProviderError,
  LlmSchemaValidationError,
  LlmBudgetError
} from './ports/llm-port.js';

export class EOSProviderRouter {
  /**
   * @param {object} [config]
   * @param {number} [config.timeoutMs=5000] Request timeout threshold
   * @param {LlmAdapterRegistry} [config.registry]
   * @param {ReturnType<typeof createSecretRuntimeBroker>} [config.secretBroker]
   * @param {ReturnType<typeof createEcrBudgetGate>} [config.ecrGate]
   */
  constructor(config = {}) {
    this.timeoutMs = config.timeoutMs || 5000;
    this.matrix = {
      'ARCHITECTURE_DEEP': { primary: 'claude-3-5-sonnet', fallback: 'gpt-4o' },
      'TDD_COMPLEX':       { primary: 'claude-3-5-sonnet', fallback: 'gpt-4o' },
      'CONTRACT_SYNTHESIS':{ primary: 'gpt-4o',             fallback: 'gemini-1-5-pro' },
      'CONTEXT_MASSIVE':   { primary: 'gemini-1-5-pro',     fallback: 'gpt-4o' }
    };

    this.registry = config.registry || new LlmAdapterRegistry();
    this.secretBroker = config.secretBroker || createSecretRuntimeBroker();
    this.ecrGate = config.ecrGate || createEcrBudgetGate();
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
   * Executes real provider dispatch through governed registry, Law VI broker, and ECR budget gate.
   * Additive method preserving original enrutarMision simulation.
   * @param {string} taskType
   * @param {object} [request]
   * @param {object} [opts]
   * @returns {Promise<object>}
   */
  async enrutarMisionReal(taskType, request = {}, opts = {}) {
    const registry = opts.registry || this.registry;
    const secretBroker = opts.secretBroker || this.secretBroker;
    const ecrGate = opts.ecrGate || this.ecrGate;
    const forzarFalloPrimario = opts.forzarFalloPrimario || false;
    const forzarFalloFallback = opts.forzarFalloFallback || false;

    const mapeo = this.matrix[taskType];
    if (!mapeo) {
      return {
        status: 'ADAPTER_NOT_FOUND',
        code: 'ADAPTER_NOT_FOUND',
        executed: false,
        sideEffects: 'NONE',
        PRODUCTION_READY: 'NO'
      };
    }

    const promptText = request.prompt || (Array.isArray(request.messages) ? request.messages[request.messages.length - 1]?.content : '');
    const normalizedMessages = Array.isArray(request.messages) && request.messages.length > 0
      ? request.messages
      : [{ role: 'user', content: promptText || 'Execute task' }];

    const attemptModel = async (modelMatrixId, isFallback) => {
      const resolved = registry.resolveModel(modelMatrixId);
      if (!resolved) {
        return {
          status: 'ADAPTER_NOT_FOUND',
          code: 'ADAPTER_NOT_FOUND',
          executed: false,
          sideEffects: 'NONE',
          PRODUCTION_READY: 'NO'
        };
      }

      // 1. Resolve credentials via Law VI Broker
      const isGemini = resolved.adapterKey === 'GOOGLE_GEMINI';
      const envKey = isGemini ? 'GEMINI_API_KEY' : 'OPENROUTER_API_KEY';
      const adapterId = isGemini ? 'adapter-gemini' : 'adapter-openrouter';

      const brokerSecret = secretBroker.resolveSecret(envKey);
      if (!brokerSecret || !brokerSecret.ok || !brokerSecret.present) {
        return {
          status: 'NO_CREDENTIALS',
          code: 'NO_CREDENTIALS',
          executed: false,
          sideEffects: 'NONE',
          PRODUCTION_READY: 'NO'
        };
      }

      let adapter;
      try {
        adapter = registry.getAdapter(resolved.adapterKey);
      } catch {
        return {
          status: 'ADAPTER_NOT_FOUND',
          code: 'ADAPTER_NOT_FOUND',
          executed: false,
          sideEffects: 'NONE',
          PRODUCTION_READY: 'NO'
        };
      }

      // Inject secret into adapter if receiveSecret available (e.g. OpenRouter)
      if (typeof adapter.receiveSecret === 'function') {
        secretBroker.injectToAdapter(adapterId, envKey, adapter);
      }

      // 2. ECR Budget Gate check before any network I/O
      const beforeGate = ecrGate.beforeCall({
        intent: 'provider-route',
        provider: resolved.adapterKey,
        model: resolved.model
      });

      if (!beforeGate.ok || !beforeGate.allow) {
        return {
          status: 'BUDGET_EXCEEDED',
          code: 'BUDGET_EXCEEDED',
          executed: false,
          sideEffects: 'NONE',
          reason: beforeGate.reason || beforeGate.code,
          PRODUCTION_READY: 'NO'
        };
      }

      // 3. Simulated failure flags check (for hermetic injection testing)
      if ((!isFallback && forzarFalloPrimario) || (isFallback && forzarFalloFallback)) {
        throw new LlmTimeoutError('Timeout de red forzado para pruebas de resiliencia');
      }

      // 4. Execute infer()
      const startTime = Date.now();
      const inferReq = {
        model: resolved.model,
        messages: normalizedMessages,
        budget_constraints: {
          timeout_ms: request.budget_constraints?.timeout_ms || this.timeoutMs,
          max_output_tokens: request.budget_constraints?.max_output_tokens
        },
        structured_output_schema: request.structured_output_schema,
        request_id: request.request_id
      };

      const response = await adapter.infer(inferReq);
      const latencyMs = response.latency_ms || (Date.now() - startTime);

      // 5. ECR usage recording
      ecrGate.afterCall({
        tokensIn: response.usage?.input_tokens || 0,
        tokensOut: response.usage?.output_tokens || 0,
        costUnits: response.usage?.estimated_cost_usd || 0,
        provider: resolved.adapterKey,
        intent: 'provider-route'
      });

      return {
        status: 'SUCCESS',
        executed: true,
        proveedorUtilizado: modelMatrixId,
        modo: isFallback ? 'FALLBACK' : 'PRIMARY',
        latency_ms: latencyMs,
        usage: response.usage,
        raw_text: response.raw_text,
        structured_output: response.structured_output,
        PRODUCTION_READY: 'NO'
      };
    };

    // Primary attempt
    try {
      const primaryRes = await attemptModel(mapeo.primary, false);
      if (primaryRes.executed) {
        return primaryRes;
      }
      // If fail-closed before network (e.g. NO_CREDENTIALS, BUDGET_EXCEEDED, ADAPTER_NOT_FOUND), do not attempt fallback
      if (primaryRes.code === 'NO_CREDENTIALS' || primaryRes.code === 'BUDGET_EXCEEDED' || primaryRes.code === 'ADAPTER_NOT_FOUND') {
        return primaryRes;
      }
    } catch (primaryErr) {
      // Primary threw (network/timeout/provider error) -> attempt fallback if available
      if (mapeo.fallback && mapeo.fallback !== mapeo.primary) {
        try {
          const fallbackRes = await attemptModel(mapeo.fallback, true);
          if (fallbackRes.executed) {
            return fallbackRes;
          }
          if (fallbackRes.code === 'NO_CREDENTIALS' || fallbackRes.code === 'BUDGET_EXCEEDED') {
            return fallbackRes;
          }
        } catch (fallbackErr) {
          return this._mapErrorToReceipt(fallbackErr);
        }
      }
      return this._mapErrorToReceipt(primaryErr);
    }

    return {
      status: 'PROVIDER_UNAVAILABLE',
      code: 'PROVIDER_UNAVAILABLE',
      executed: false,
      sideEffects: 'NONE',
      PRODUCTION_READY: 'NO'
    };
  }

  /**
   * Health probe executing real timed probe with timeout/retry bounds or presence check.
   * @param {string} providerId
   * @returns {Promise<object>}
   */
  async probeProviderHealth(providerId) {
    let adapter;
    try {
      adapter = this.registry.getAdapter(providerId);
    } catch {
      return {
        status: 'PROVIDER_UNAVAILABLE',
        code: 'PROVIDER_UNAVAILABLE',
        latency_ms: 0,
        credentials: { present: false },
        PRODUCTION_READY: 'NO'
      };
    }

    const adapterName = adapter.getName();
    const isGemini = adapterName === 'GOOGLE_GEMINI';
    const envKey = isGemini ? 'GEMINI_API_KEY' : 'OPENROUTER_API_KEY';
    const adapterId = isGemini ? 'adapter-gemini' : 'adapter-openrouter';

    const credCheck = this.secretBroker.resolveSecret(envKey);
    const credPresent = Boolean(credCheck && credCheck.ok && credCheck.present);

    if (!credPresent) {
      return {
        status: 'PROVIDER_UNAVAILABLE',
        code: 'NO_CREDENTIALS',
        latency_ms: 0,
        credentials: { present: false },
        PRODUCTION_READY: 'NO'
      };
    }

    if (typeof adapter.probe === 'function') {
      this.secretBroker.injectToAdapter(adapterId, envKey, adapter);
      const startTime = Date.now();
      try {
        const probeRes = await adapter.probe({ timeoutMs: this.timeoutMs, retries: 2 });
        return {
          status: 'OK',
          code: 'OK',
          latency_ms: typeof probeRes.latency_ms === 'number' ? probeRes.latency_ms : (Date.now() - startTime),
          credentials: { present: true },
          PRODUCTION_READY: 'NO'
        };
      } catch (err) {
        const isTimeout = err instanceof LlmTimeoutError || err?.code === 'LLM_TIMEOUT' || err?.name === 'AbortError';
        return {
          status: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
          code: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
          latency_ms: Date.now() - startTime,
          credentials: { present: true },
          PRODUCTION_READY: 'NO'
        };
      }
    }

    return {
      status: 'OK',
      code: 'OK',
      latency_ms: 0,
      credentials: { present: true },
      PRODUCTION_READY: 'NO'
    };
  }

  /**
   * Internal Error Bridge per D4.
   * Maps LlmPort error codes to Provider Router status and providerCode without leaking secrets.
   * @private
   */
  _mapErrorToReceipt(err) {
    let status = 'PROVIDER_UNAVAILABLE';
    let providerCode = 'LLM_PROVIDER_FAILURE';

    if (err instanceof LlmTimeoutError || err?.code === 'LLM_TIMEOUT' || err?.name === 'AbortError') {
      status = 'PROVIDER_TIMEOUT';
      providerCode = 'LLM_TIMEOUT';
    } else if (err instanceof LlmAuthError || err?.code === 'LLM_AUTH_DENIED') {
      status = 'PROVIDER_UNAVAILABLE';
      providerCode = 'LLM_AUTH_DENIED';
    } else if (err instanceof LlmRateLimitError || err?.code === 'LLM_RATE_LIMITED') {
      status = 'PROVIDER_UNAVAILABLE';
      providerCode = 'LLM_RATE_LIMITED';
    } else if (err instanceof LlmSchemaValidationError || err?.code === 'LLM_SCHEMA_VALIDATION_FAILED') {
      status = 'PROVIDER_UNAVAILABLE';
      providerCode = 'LLM_SCHEMA_VALIDATION_FAILED';
    } else if (err instanceof LlmBudgetError || err?.code === 'LLM_BUDGET_EXCEEDED') {
      status = 'BUDGET_EXCEEDED';
      providerCode = 'LLM_BUDGET_EXCEEDED';
    }

    const cleanMsg = sanitizeErrorMessage(err?.message || 'Provider failure');
    return {
      status,
      code: status,
      executed: false,
      sideEffects: 'NONE',
      providerCode,
      error: cleanMsg,
      PRODUCTION_READY: 'NO'
    };
  }
}
