/**
 * @module OpenRouterAdapter
 * @description OpenRouter LLM Adapter implementing LlmPort.
 * Provides OpenAI-compatible HTTP communication with OpenRouter API
 * with injectable fetchImpl, strict Law VI credential governance via receiveSecret,
 * structured JSON schema support, usage accounting, and classified failure semantics.
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

export class OpenRouterAdapter extends LlmPort {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] Explicit API key (fallback if no runtime secret or env)
   * @param {string} [options.defaultModel='anthropic/claude-3.5-sonnet']
   * @param {string} [options.baseUrl='https://openrouter.ai/api/v1']
   * @param {number} [options.defaultTimeoutMs=15000]
   * @param {Function} [options.fetchImpl] Injectable fetch implementation for hermetic testing
   */
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || null;
    this.defaultModel = options.defaultModel || 'anthropic/claude-3.5-sonnet';
    this.baseUrl = options.baseUrl || 'https://openrouter.ai/api/v1';
    this.defaultTimeoutMs = options.defaultTimeoutMs || 15000;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.__runtimeSecret = null;
  }

  getName() {
    return 'OPENROUTER';
  }

  /**
   * Law VI secret injection point from secret broker.
   * @param {string} value
   * @param {object} [metadata]
   */
  receiveSecret(value, metadata = {}) {
    this.__runtimeSecret = value;
  }

  getCapabilities(modelName = this.defaultModel) {
    const isClaude = modelName.includes('claude');
    const isGpt4o = modelName.includes('gpt-4o');

    let inputCost = 3.00;
    let outputCost = 15.00;

    if (isGpt4o) {
      inputCost = 2.50;
      outputCost = 10.00;
    } else if (isClaude) {
      inputCost = 3.00;
      outputCost = 15.00;
    }

    return {
      schema_version: '1.0.0',
      model_id: `MOD-OPENROUTER-${modelName.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
      provider: 'OPENROUTER',
      model_name: modelName,
      capabilities: {
        max_context_window_tokens: isClaude ? 200000 : 128000,
        max_output_tokens: 8192,
        supports_tool_calling: true,
        supports_structured_json: true,
        supports_vision: true,
        reasoning_depth: 'DEEP_COGNITIVE_REASONING'
      },
      performance_profile: {
        p95_latency_ms: 1200,
        throughput_tokens_per_sec: 80,
        observed_error_rate_pct: 0.1
      },
      pricing_usd_per_million: {
        input_tokens: inputCost,
        output_tokens: outputCost
      },
      privacy_profile: {
        zero_data_retention: false,
        on_premise_available: false,
        compliance_certifications: ['SOC2']
      },
      compatibility_status: 'DISCOVERED_FUNCTIONAL',
      evidence: {
        benchmark_receipt_id: null,
        sha256_hash: calculateSha256(JSON.stringify({ provider: 'OPENROUTER', model: modelName }))
      }
    };
  }

  /**
   * Executes governed inference against OpenRouter API
   * @param {object} request Conforming to llm-request contract
   * @returns {Promise<object>} LlmResponse
   */
  async infer(request) {
    if (!request || typeof request !== 'object') {
      throw new LlmProviderError('INVALID_REQUEST: Request payload must be a valid object.');
    }

    const apiKey = this.__runtimeSecret || this.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new LlmAuthError('API_KEY_MISSING: OpenRouter API Key is not configured in runtime secret, options, or environment.');
    }

    const model = request.model || this.defaultModel;
    const timeoutMs = request.budget_constraints?.timeout_ms || this.defaultTimeoutMs;
    const endpoint = `${this.baseUrl}/chat/completions`;

    const messages = request.messages || [];
    if (messages.length === 0) {
      throw new LlmProviderError('EMPTY_MESSAGES: At least one user/assistant message is required.');
    }

    const bodyPayload = {
      model,
      messages,
      temperature: 0.2,
      max_tokens: request.budget_constraints?.max_output_tokens || 4096
    };

    if (request.structured_output_schema) {
      bodyPayload.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    let response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://eos.system',
          'X-Title': 'EOS Sovereign Control Plane'
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
    } catch (networkErr) {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      if (networkErr.name === 'AbortError' || controller.signal.aborted) {
        throw new LlmTimeoutError(`OpenRouter request timed out after ${timeoutMs}ms`, { timeoutMs, durationMs });
      }
      throw new LlmProviderError(`Network connection to OpenRouter failed: ${networkErr.message}`, { durationMs });
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

      const errorMsg = errorBody.error?.message || response.statusText;
      const status = response.status;

      if (status === 401 || status === 403) {
        throw new LlmAuthError(`OpenRouter Authentication Failed (${status}): ${errorMsg}`, { status, durationMs });
      }
      if (status === 429) {
        throw new LlmRateLimitError(`OpenRouter Rate Limit Exceeded (429): ${errorMsg}`, { status, durationMs });
      }
      throw new LlmProviderError(`OpenRouter API Error (${status}): ${errorMsg}`, { status, durationMs });
    }

    const responseJson = await response.json();
    const choice = responseJson.choices?.[0];

    if (!choice || !choice.message?.content) {
      const finishReason = choice?.finish_reason || 'NO_CONTENT';
      throw new LlmProviderError(`OpenRouter produced no textual content. Finish reason: ${finishReason}`, { finishReason, durationMs });
    }

    const rawText = choice.message.content;
    let structuredOutput = null;

    if (request.structured_output_schema) {
      try {
        const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        structuredOutput = JSON.parse(cleanedText);
      } catch (jsonErr) {
        throw new LlmSchemaValidationError(`Failed to parse structured JSON output from OpenRouter: ${jsonErr.message}`, {
          rawText,
          durationMs
        });
      }
    }

    const usageMeta = responseJson.usage || {};
    const inputTokens = usageMeta.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
    const outputTokens = usageMeta.completion_tokens || Math.ceil(rawText.length / 4);
    const totalTokens = usageMeta.total_tokens || (inputTokens + outputTokens);

    const caps = this.getCapabilities(model);
    const inputRate = (caps.pricing_usd_per_million.input_tokens || 3.00) / 1000000;
    const outputRate = (caps.pricing_usd_per_million.output_tokens || 15.00) / 1000000;
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
   * Health probe executing minimal inference with timeout/retry bounds.
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs=5000]
   * @param {number} [opts.retries=2]
   * @returns {Promise<{ ok: boolean, latency_ms: number, status: string }>}
   */
  async probe(opts = {}) {
    const timeoutMs = opts.timeoutMs || 5000;
    const retries = typeof opts.retries === 'number' ? opts.retries : 2;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const startTime = Date.now();
      try {
        await this.infer({
          messages: [{ role: 'user', content: 'ping' }],
          budget_constraints: {
            max_output_tokens: 1,
            timeout_ms: timeoutMs
          }
        });
        return {
          ok: true,
          latency_ms: Date.now() - startTime,
          status: 'OK'
        };
      } catch (err) {
        lastError = err;
        if (err instanceof LlmAuthError) {
          throw err;
        }
      }
    }

    throw lastError;
  }
}
