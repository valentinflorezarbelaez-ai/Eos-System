/**
 * @module GeminiAdapter
 * @description Google Gemini LLM Adapter implementing LlmPort.
 * Provides zero-dependency HTTP communication with Google Generative Language API
 * using native fetch, strictly enforcing timeout limits, structured output extraction,
 * usage accounting, and classified failure semantics.
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

export class GeminiAdapter extends LlmPort {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] Explicit API key (defaults to process.env.GOOGLE_AI_API_KEY or GEMINI_API_KEY)
   * @param {string} [options.defaultModel='gemini-2.0-flash']
   * @param {string} [options.baseUrl='https://generativelanguage.googleapis.com/v1beta']
   * @param {number} [options.defaultTimeoutMs=15000]
   */
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || null;
    this.defaultModel = options.defaultModel || 'gemini-2.0-flash';
    this.baseUrl = options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultTimeoutMs = options.defaultTimeoutMs || 15000;
  }

  getName() {
    return 'GOOGLE_GEMINI';
  }

  getCapabilities(modelName = this.defaultModel) {
    const isPro = modelName.includes('pro');
    const inputCost = isPro ? 1.25 : 0.10;
    const outputCost = isPro ? 5.00 : 0.40;

    const profile = {
      schema_version: '1.0.0',
      model_id: `MOD-GOOGLE-${modelName.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
      provider: 'GOOGLE',
      model_name: modelName,
      capabilities: {
        max_context_window_tokens: isPro ? 2097152 : 1048576,
        max_output_tokens: 8192,
        supports_tool_calling: true,
        supports_structured_json: true,
        supports_vision: true,
        reasoning_depth: isPro ? 'DEEP_COGNITIVE_REASONING' : 'STANDARD_ENGINEERING'
      },
      performance_profile: {
        p95_latency_ms: isPro ? 1800 : 800,
        throughput_tokens_per_sec: isPro ? 60 : 120,
        observed_error_rate_pct: 0.1
      },
      pricing_usd_per_million: {
        input_tokens: inputCost,
        output_tokens: outputCost
      },
      privacy_profile: {
        zero_data_retention: false,
        on_premise_available: false,
        compliance_certifications: ['SOC2', 'ISO27001']
      },
      compatibility_status: 'DISCOVERED_FUNCTIONAL',
      evidence: {
        benchmark_receipt_id: null,
        sha256_hash: calculateSha256(JSON.stringify({ provider: 'GOOGLE', model: modelName }))
      }
    };

    return profile;
  }

  /**
   * Executes governed inference against Gemini API
   * @param {object} request
   * @returns {Promise<object>} LlmResponse
   */
  async infer(request) {
    if (!request || typeof request !== 'object') {
      throw new LlmProviderError('INVALID_REQUEST: Request payload must be a valid object.');
    }

    const apiKey = this.apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new LlmAuthError('API_KEY_MISSING: Google AI API Key is not configured in environment or constructor.');
    }

    const model = request.model || this.defaultModel;
    const timeoutMs = request.budget_constraints?.timeout_ms || this.defaultTimeoutMs;
    const endpoint = `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    // Transform messages to Gemini API format
    let systemInstruction = null;
    const contents = [];

    for (const msg of (request.messages || [])) {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: [{ text: msg.content }]
        };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    if (contents.length === 0) {
      throw new LlmProviderError('EMPTY_MESSAGES: At least one user/assistant message is required.');
    }

    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: request.budget_constraints?.max_output_tokens || 4096
    };

    if (request.structured_output_schema) {
      generationConfig.responseMimeType = 'application/json';
    }

    const bodyPayload = {
      contents,
      generationConfig
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = systemInstruction;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
    } catch (networkErr) {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      if (networkErr.name === 'AbortError' || controller.signal.aborted) {
        throw new LlmTimeoutError(`Gemini request timed out after ${timeoutMs}ms`, { timeoutMs, durationMs });
      }
      throw new LlmProviderError(`Network connection to Gemini failed: ${networkErr.message}`, { durationMs });
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
        throw new LlmAuthError(`Gemini Authentication Failed (${status}): ${errorMsg}`, { status, durationMs });
      }
      if (status === 429) {
        throw new LlmRateLimitError(`Gemini Rate Limit Exceeded (429): ${errorMsg}`, { status, durationMs });
      }
      throw new LlmProviderError(`Gemini API Error (${status}): ${errorMsg}`, { status, durationMs });
    }

    const responseJson = await response.json();
    const candidate = responseJson.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      const finishReason = candidate?.finishReason || 'NO_CONTENT';
      throw new LlmProviderError(`Gemini produced no textual content. Finish reason: ${finishReason}`, { finishReason, durationMs });
    }

    const rawText = candidate.content.parts[0].text;
    let structuredOutput = null;

    if (request.structured_output_schema) {
      try {
        // Strip markdown code fences if model enclosed JSON in ```json ... ```
        const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        structuredOutput = JSON.parse(cleanedText);
      } catch (jsonErr) {
        throw new LlmSchemaValidationError(`Failed to parse structured JSON output from Gemini: ${jsonErr.message}`, {
          rawText,
          durationMs
        });
      }
    }

    const usageMeta = responseJson.usageMetadata || {};
    const inputTokens = usageMeta.promptTokenCount || Math.ceil(JSON.stringify(contents).length / 4);
    const outputTokens = usageMeta.candidatesTokenCount || Math.ceil(rawText.length / 4);
    const totalTokens = usageMeta.totalTokenCount || (inputTokens + outputTokens);

    const caps = this.getCapabilities(model);
    const inputRate = (caps.pricing_usd_per_million.input_tokens || 0.10) / 1000000;
    const outputRate = (caps.pricing_usd_per_million.output_tokens || 0.40) / 1000000;
    const estimatedCostUsd = Number(((inputTokens * inputRate) + (outputTokens * outputRate)).toFixed(6));

    return {
      schema_version: '1.0.0',
      provider: 'GOOGLE',
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
}
