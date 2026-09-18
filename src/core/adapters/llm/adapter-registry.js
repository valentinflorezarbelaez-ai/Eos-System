/**
 * @module LlmAdapterRegistry
 * @description Central governed registry for LLM provider adapters in EOS.
 * Manages provider discovery, model routing validation, and capability lookups.
 */

import { GeminiAdapter } from './gemini-adapter.js';
import { OpenRouterAdapter } from './openrouter-adapter.js';

/**
 * Matrix model id → adapter mapping (design D2).
 * Registry ids do not match matrix ids; the router resolves via `resolveModel`.
 * Keys are the EOS provider matrix ids; values name the registered adapter
 * (`adapter.getName()`) and the provider-side model id.
 */
export const MODEL_ROUTING_MAP = Object.freeze({
  'claude-3-5-sonnet': Object.freeze({
    adapterKey: 'OPENROUTER',
    model: 'anthropic/claude-3.5-sonnet'
  }),
  'gpt-4o': Object.freeze({
    adapterKey: 'OPENROUTER',
    model: 'openai/gpt-4o'
  }),
  'gemini-1-5-pro': Object.freeze({
    adapterKey: 'GOOGLE_GEMINI',
    model: 'gemini-1.5-pro'
  })
});

export class LlmAdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.modelToAdapter = new Map();

    // Register canonical defaults
    this.registerAdapter(new GeminiAdapter());
    this.registerAdapter(new OpenRouterAdapter());
  }

  /**
   * Resolve a matrix model id to {adapterKey, model}.
   * @param {string|null|undefined} matrixId
   * @returns {{ adapterKey: string, model: string } | null} null when unmapped
   */
  resolveModel(matrixId) {
    if (matrixId == null || typeof matrixId !== 'string') return null;
    const entry = MODEL_ROUTING_MAP[matrixId.trim()];
    if (!entry) return null;
    return { adapterKey: entry.adapterKey, model: entry.model };
  }

  /**
   * Registers a provider adapter implementing LlmPort
   * @param {import('../../ports/llm-port.js').LlmPort} adapter
   */
  registerAdapter(adapter) {
    if (!adapter || typeof adapter.getName !== 'function' || typeof adapter.infer !== 'function') {
      throw new Error('ADAPTER_REGISTRY_ERROR: Invalid adapter. Must implement LlmPort contract.');
    }

    const name = adapter.getName().toUpperCase();
    this.adapters.set(name, adapter);

    // Map default supported models
    try {
      const caps = adapter.getCapabilities();
      if (caps && caps.model_name) {
        this.modelToAdapter.set(caps.model_name.toLowerCase(), adapter);
      }
    } catch {
      // Ignore if adapter requires runtime args for capabilities
    }
  }

  /**
   * Retrieves an adapter by provider name or model name
   * @param {string} providerOrModel
   * @returns {import('../../ports/llm-port.js').LlmPort}
   */
  getAdapter(providerOrModel) {
    if (!providerOrModel || typeof providerOrModel !== 'string') {
      throw new Error('ADAPTER_NOT_FOUND: Provider or model identifier must be a non-empty string.');
    }

    const clean = providerOrModel.trim();
    const upper = clean.toUpperCase();
    const lower = clean.toLowerCase();

    // 1. Direct provider match
    if (this.adapters.has(upper)) {
      return this.adapters.get(upper);
    }

    // 2. Canonical aliases (e.g. GOOGLE -> GOOGLE_GEMINI)
    if (upper === 'GOOGLE' || upper === 'GEMINI') {
      if (this.adapters.has('GOOGLE_GEMINI')) return this.adapters.get('GOOGLE_GEMINI');
    }

    // 3. Model mapping
    if (this.modelToAdapter.has(lower)) {
      return this.modelToAdapter.get(lower);
    }

    // 4. Model prefix matching (e.g., 'gemini-2.0-flash' matches GOOGLE_GEMINI)
    if (lower.startsWith('gemini')) {
      if (this.adapters.has('GOOGLE_GEMINI')) return this.adapters.get('GOOGLE_GEMINI');
    }

    throw new Error(`ADAPTER_NOT_FOUND: No registered LLM adapter for provider or model '${providerOrModel}'.`);
  }

  /**
   * Lists all available registered adapters and their capabilities
   * @returns {Array<object>}
   */
  listCapabilities() {
    const list = [];
    for (const adapter of this.adapters.values()) {
      try {
        list.push(adapter.getCapabilities());
      } catch {
        list.push({ provider: adapter.getName(), error: 'Dynamic capabilities required' });
      }
    }
    return list;
  }
}
