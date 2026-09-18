/**
 * @module OpenRouterAdapter
 * @description OpenRouter LLM Adapter implementing LlmPort.
 * Zero-dependency HTTP communication with the OpenRouter API
 * (OpenAI-compatible `POST /api/v1/chat/completions`) using native fetch.
 * Credentials arrive via Law VI secret broker `receiveSecret` handshake.
 * Injectable `fetchImpl` for hermetic CI; strict timeout enforcement;
 * structured output extraction; usage accounting; classified failures.
 * Keys and prompts are NEVER serialized into errors or responses.
 * PRODUCTION_READY: NO
 */

import {
  LlmPort,
  LlmAuthError,
  LlmProviderError,
  LlmTimeoutError,
  LlmRateLimitError,
  LlmSchemaValidationError
} from '../../ports/llm-port.js';
import { calculateSha256 } from '../../sdd/epistemic-evidence-engine.js';

/** OpenRouter pricing in USD per million tokens (published list rates). */
const OPENROUTER_PRICING_USD_PER_MILLION = Object.freeze({
  'anthropic/claude-3.5-sonnet': Object.freeze({ input: 3.0, output: 15.0 }),
  'openai/gpt-4o': Object.freeze({ input: 2.5, output: 10.0 })
});

const DEFAULT_PRICING_USD_PER_MILLION = Object.freeze({ input: 0.5, output: 1.5 });

const OPENROUTER_DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterAdapter extends LlmPort {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] Explicit API key (fallback chain: __runtimeSecret → apiKey → process.env.OPENROUTER_API_KEY)
   * @param {string} [options.defaultModel='openrouter/auto']
   * @param {string} [options.baseUrl='https://openrouter.ai/api/v1']
   * @param {number} [options.defaultTimeoutMs=30000]
   * @param {typeof fetch} [options.fetchImpl] Injectable transport double (hermetic tests)
   */
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || null;
    this.__runtimeSecret = null;
    this.defaultModel = options.defaultModel || 'openrouter/auto';
    this.baseUrl = options.baseUrl || 'https://openrouter.ai/api/v1';
    this.defaultTimeoutMs = options.defaultTimeoutMs || 30000;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
  }

  getName() {
    return 'OPENROUTER';
  }

  /**
   * Law VI broker handshake — runtime secret (highest precedence).
   * @param {string} value
   * @param {{ envKey?: string, adapterId?: string }} [_meta]
   */
  receiveSecret(value, _meta = {}) {
    this.__runtimeSecret = value;
  }

  /**
   * @param {string} [modelName]
   * @returns {object} Capability profile conforming to model-capability.schema.json
   */
  getCapabilities(modelName = this.defaultModel) {
    const pricing =
      OPENROUTER_PRICING_USD_PER_MILLION[modelName] ||
      DEFAULT_PRICING_USD_PER_MILLION;

    const profile = {
      schema_version: '1.0.0',
      model_id: `MOD-OPENROUTER-${modelName.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
      provider: 'OPENROUTER',
      model_name: modelName,
      capabilities: {
        max_context_window_tokens: 200000,
        max_output_tokens: 4096,
        supports_tool_calling: true,
        supports_structured_json: true,
        supports_vision: true,
        reasoning_depth: 'STANDARD_ENGINEERING'
      },
      performance_profile: {
        p95_latency_ms: 2500,
        throughput_tokens_per_sec: 80,
        observed_error_rate_pct: 0.5
      },
      pricing_usd_per_million: {
        input_tokens: pricing.input,
        output_tokens: pricing.output
      },
      privacy_profile: {
        zero_data_retention: false,
        on_premise_available: false,
        compliance_certifications: ['SOC2', 'ISO27001']
      },
      compatibility_status: 'DISCOVERED_FUNCTIONAL',
      evidence: {
        benchmark_receipt_id: null,
        sha256_hash: calculateSha256(JSON.stringify({ provider: 'OPENROUTER', model: modelName }))
      }
    };

    return profile;
  }

  /** @returns {string} Effective key under the documented precedence chain. */
  _effectiveKey() {
    return this.__runtimeSecret || this.apiKey || process.env.OPENROUTER_API_KEY || null;
  }

  /**
   * Redact the effective key from any surfaced text (Law VI: key never serialized).
   * @param {string|null|undefined} text
   * @returns {string} Redacted text (or '' when input was falsy)
   */
  _redact(text) {
    if (text == null) return '';
    let out = String(text);
    const key = this._effectiveKey();
    if (key && key.length >= 4) {
      out = out.split(key).join('[REDACTED]');
    }
    return out;
  }

  /**
   * Execute the HTTP round-trip with timeout and error classification.
   * Never includes key or request messages in errors.
   * @param {object} body
   * @param {number} timeoutMs
   * @param {string[]} [redactTerms] Prompt/context fragments to redact if echoed back
   * @returns {Promise<{ json: object, durationMs: number }>}
   */
  async _post(body, timeoutMs, redactTerms = []) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    /** Redact key and any echoed prompt fragments from surfaced text. */
    const redact = (text) => {
      let out = this._redact(text);
      for (const term of redactTerms) {
        if (term && term.length >= 4) {
          out = out.split(term).join('[REDACTED]');
        }
      }
      return out;
    };

    const effectiveKey = this._effectiveKey();

    let response;
    try {
      response = await this.fetchImpl(this.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (networkErr) {
      const durationMs = Date.now() - startTime;
      if (networkErr.name === 'AbortError' || controller.signal.aborted) {
        throw new LlmTimeoutError(
          `OpenRouter request timed out after ${timeoutMs}ms`,
          { timeoutMs, durationMs }
        );
      }
      throw new LlmProviderError(
        `Network connection to OpenRouter failed: ${redact(networkErr.message)}`,
        { durationMs }
      );
    } finally {
      clearTimeout(timer);
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText };
      }

      const errorMsg = redact(errorBody.error?.message || response.statusText);
      const status = response.status;

      if (status === 401 || status === 403) {
        throw new LlmAuthError(`OpenRouter Authentication Failed (${status}): ${errorMsg}`, {
          status,
          durationMs
        });
      }
      if (status === 429) {
        throw new LlmRateLimitError(`OpenRouter Rate Limit Exceeded (429): ${errorMsg}`, {
          status,
          durationMs
        });
      }
      throw new LlmProviderError(`OpenRouter API Error (${status}): ${errorMsg}`, {
        status,
        durationMs
      });
    }

    const json = await response.json();
    return { json, durationMs };
  }

  /**
   * Executes governed inference against the OpenRouter API.
   * @param {object} request Conforming to llm-request.schema.json
   * @returns {Promise<object>} LlmResponse (status COMPLETED, errors: [])
   */
  async infer(request) {
    if (!request || typeof request !== 'object') {
      throw new LlmProviderError('INVALID_REQUEST: Request payload must be a valid object.');
    }

    const apiKey = this._effectiveKey();
    if (!apiKey) {
      throw new LlmAuthError('API_KEY_MISSING: OpenRouter API Key is not configured.');
    }

    const model = request.model || this.defaultModel;
    const timeoutMs = request.budget_constraints?.timeout_ms || this.defaultTimeoutMs;
    const messages = Array.isArray(request.messages) ? request.messages : [];

    if (messages.length === 0) {
      throw new LlmProviderError('EMPTY_MESSAGES: At least one message is required.');
    }

    const body = {
      model,
      messages,
      max_tokens: request.budget_constraints?.max_output_tokens || 4096,
      temperature: 0.2
    };

    if (request.structured_output_schema) {
      body.response_format = { type: 'json_object' };
    }

    const redactTerms = messages
      .map((m) => m?.content)
      .filter((t) => typeof t === 'string' && t.length >= 4);

    const { json, durationMs } = await this._post(body, timeoutMs, redactTerms);

    const choice = json.choices?.[0];
    const rawText = choice?.message?.content;

    if (typeof rawText !== 'string' || rawText.trim() === '') {
      const finishReason = choice?.finish_reason || 'NO_CONTENT';
      throw new LlmProviderError(
        `OpenRouter produced no textual content. Finish reason: ${finishReason}`,
        { finishReason, durationMs }
      );
    }

    let structuredOutput = null;
    if (request.structured_output_schema) {
      try {
        const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        structuredOutput = JSON.parse(cleanedText);
      } catch (jsonErr) {
        throw new LlmSchemaValidationError(
          `Failed to parse structured JSON output from OpenRouter: ${this._redact(jsonErr.message)}`,
          { durationMs }
        );
      }
    }

    const rawUsage = json.usage || {};
    const inputTokens = rawUsage.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
    const outputTokens = rawUsage.completion_tokens || Math.ceil(rawText.length / 4);
    const totalTokens = rawUsage.total_tokens || (inputTokens + outputTokens);

    const caps = this.getCapabilities(model);
    const inputRate = (caps.pricing_usd_per_million.input_tokens || 0.5) / 1000000;
    const outputRate = (caps.pricing_usd_per_million.output_tokens || 1.5) / 1000000;
    const estimatedCostUsd = Number(((inputTokens * inputRate) + (outputTokens * outputRate)).toFixed(6));

    return {
      schema_version: '1.0.0',
      provider: 'OPENROUTER',
      model,
      request_id: request.request_id,
      status: 'COMPLETED',
      structured_output: structuredOutput,
      raw_text: rawText,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd
      },
      latency_ms: durationMs,
      timestamp: new Date().toISOString(),
      errors: []
    };
  }

  /**
   * Real health probe: minimal `max_tokens: 1` call with timeout/retry.
   * Retries only on timeout; classified errors surface otherwise.
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs]
   * @param {number} [opts.retries=2] Number of attempts
   * @returns {Promise<{ ok: true, latency_ms: number }>}
   */
  async probe({ timeoutMs = this.defaultTimeoutMs, retries = 2 } = {}) {
    const attempts = Math.max(1, retries);
    let lastTimeoutError = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const startTime = Date.now();
      try {
        await this._post(
          {
            model: this.defaultModel,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
            temperature: 0.2
          },
          timeoutMs
        );
        return { ok: true, latency_ms: Date.now() - startTime };
      } catch (err) {
        if (err instanceof LlmTimeoutError) {
          lastTimeoutError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastTimeoutError;
  }
}