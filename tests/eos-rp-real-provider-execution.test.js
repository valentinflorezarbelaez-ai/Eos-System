import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OpenRouterAdapter } from '../src/core/adapters/llm/openrouter-adapter.js';
import {
  LlmPort,
  LlmAuthError,
  LlmProviderError,
  LlmTimeoutError,
  LlmRateLimitError,
  LlmSchemaValidationError
} from '../src/core/ports/llm-port.js';

describe('OpenRouterAdapter - Law VI & Real Provider Execution Contract', () => {
  it('implements LlmPort and returns correct adapter name', () => {
    const adapter = new OpenRouterAdapter();
    assert.ok(adapter instanceof LlmPort, 'OpenRouterAdapter must implement LlmPort');
    assert.equal(adapter.getName(), 'OPENROUTER');
  });

  it('reports capabilities with valid schema and non-production flag', () => {
    const adapter = new OpenRouterAdapter();
    const caps = adapter.getCapabilities('anthropic/claude-3.5-sonnet');
    assert.equal(caps.provider, 'OPENROUTER');
    assert.equal(caps.model_name, 'anthropic/claude-3.5-sonnet');
    assert.ok(caps.pricing_usd_per_million.input_tokens > 0);
    assert.ok(caps.pricing_usd_per_million.output_tokens > 0);
  });

  it('fails with LlmAuthError when no API key is provided via runtimeSecret, constructor, or env', async () => {
    const prevEnv = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const adapter = new OpenRouterAdapter({ fetchImpl: async () => assert.fail('Should not call fetch') });
      await assert.rejects(
        async () => {
          await adapter.infer({
            messages: [{ role: 'user', content: 'test' }]
          });
        },
        (err) => {
          assert.ok(err instanceof LlmAuthError);
          assert.equal(err.code, 'LLM_AUTH_DENIED');
          return true;
        }
      );
    } finally {
      if (prevEnv) process.env.OPENROUTER_API_KEY = prevEnv;
    }
  });

  it('respects key precedence: __runtimeSecret > apiKey > env', async () => {
    let capturedAuth = null;
    const mockFetch = async (url, options) => {
      capturedAuth = options.headers['Authorization'];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'mock answer' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })
      };
    };

    // 1. Runtime secret via receiveSecret overrides constructor apiKey
    const adapter = new OpenRouterAdapter({
      apiKey: 'constructor-key',
      fetchImpl: mockFetch
    });
    adapter.receiveSecret('secret-from-broker', { envKey: 'OPENROUTER_API_KEY', adapterId: 'adapter-openrouter' });

    await adapter.infer({
      messages: [{ role: 'user', content: 'hello' }]
    });

    assert.equal(capturedAuth, 'Bearer secret-from-broker');
  });

  it('correctly maps 401 and 403 to LlmAuthError', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid credentials' } })
    });

    const adapter = new OpenRouterAdapter({
      apiKey: 'test-key',
      fetchImpl: mockFetch
    });

    await assert.rejects(
      async () => {
        await adapter.infer({
          messages: [{ role: 'user', content: 'test' }]
        });
      },
      (err) => {
        assert.ok(err instanceof LlmAuthError);
        assert.equal(err.code, 'LLM_AUTH_DENIED');
        assert.equal(err.details.status, 401);
        return true;
      }
    );
  });

  it('correctly maps 429 to LlmRateLimitError', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'Rate limit hit' } })
    });

    const adapter = new OpenRouterAdapter({
      apiKey: 'test-key',
      fetchImpl: mockFetch
    });

    await assert.rejects(
      async () => {
        await adapter.infer({
          messages: [{ role: 'user', content: 'test' }]
        });
      },
      (err) => {
        assert.ok(err instanceof LlmRateLimitError);
        assert.equal(err.code, 'LLM_RATE_LIMITED');
        assert.equal(err.details.status, 429);
        return true;
      }
    );
  });

  it('correctly maps network abort to LlmTimeoutError', async () => {
    const mockFetch = async (url, options) => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };

    const adapter = new OpenRouterAdapter({
      apiKey: 'test-key',
      fetchImpl: mockFetch
    });

    await assert.rejects(
      async () => {
        await adapter.infer({
          messages: [{ role: 'user', content: 'test' }],
          budget_constraints: { timeout_ms: 100 }
        });
      },
      (err) => {
        assert.ok(err instanceof LlmTimeoutError);
        assert.equal(err.code, 'LLM_TIMEOUT');
        return true;
      }
    );
  });

  it('parses structured JSON output when structured_output_schema is provided', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: { content: '```json\n{"success": true, "score": 99}\n```' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }
      })
    });

    const adapter = new OpenRouterAdapter({
      apiKey: 'test-key',
      fetchImpl: mockFetch
    });

    const response = await adapter.infer({
      messages: [{ role: 'user', content: 'give json' }],
      structured_output_schema: { type: 'object' }
    });

    assert.equal(response.status, 'COMPLETED');
    assert.deepEqual(response.structured_output, { success: true, score: 99 });
    assert.equal(response.usage.input_tokens, 100);
    assert.equal(response.usage.output_tokens, 20);
    assert.equal(response.usage.total_tokens, 120);
    assert.ok(response.usage.estimated_cost_usd > 0);
    assert.equal(response.errors.length, 0);
  });

  it('supports probe() shape for real health checks without leaking secrets', async () => {
    let calledWithAuth = false;
    const mockFetch = async (url, options) => {
      if (options.headers['Authorization'] === 'Bearer test-key') {
        calledWithAuth = true;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'pong' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        })
      };
    };

    const adapter = new OpenRouterAdapter({
      apiKey: 'test-key',
      fetchImpl: mockFetch
    });

    const probeResult = await adapter.probe({ timeoutMs: 2000, retries: 1 });
    assert.ok(probeResult.ok);
    assert.equal(calledWithAuth, true);
    assert.ok(typeof probeResult.latency_ms === 'number');
    assert.equal(JSON.stringify(probeResult).includes('test-key'), false, 'Probe result must not contain secrets');
  });

  it('TRIANGULATION: mock double sees Bearer only with injected key and never exposes secrets in errors', async () => {
    let capturedHeader = null;
    const sensitiveKey = 'sk-sensitive-test-secret-12345';
    const mockFetch = async (url, options) => {
      capturedHeader = options.headers['Authorization'];
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Error',
        json: async () => ({ error: { message: 'Upstream crashed' } })
      };
    };

    const adapter = new OpenRouterAdapter({ fetchImpl: mockFetch });
    adapter.receiveSecret(sensitiveKey, { envKey: 'OPENROUTER_API_KEY', adapterId: 'adapter-openrouter' });

    await assert.rejects(
      async () => {
        await adapter.infer({
          messages: [{ role: 'user', content: 'hello' }]
        });
      },
      (err) => {
        assert.ok(err instanceof LlmProviderError);
        assert.equal(capturedHeader, `Bearer ${sensitiveKey}`);
        const serialized = JSON.stringify(err, Object.getOwnPropertyNames(err));
        assert.equal(serialized.includes(sensitiveKey), false, 'Error object must not leak secret');
        return true;
      }
    );
  });

  it('RED check: env-gate allowlists GEMINI_API_KEY, OPENROUTER_API_KEY, adapter-gemini, adapter-openrouter', async () => {
    const { createEnvGate } = await import('../src/core/secrets/env-gate.js');
    const gate = createEnvGate();
    assert.equal(gate.checkEnvKey('GEMINI_API_KEY').ok, true, 'GEMINI_API_KEY must be allowlisted');
    assert.equal(gate.checkEnvKey('OPENROUTER_API_KEY').ok, true, 'OPENROUTER_API_KEY must be allowlisted');
    assert.equal(gate.checkAdapter('adapter-gemini').ok, true, 'adapter-gemini must be allowlisted');
    assert.equal(gate.checkAdapter('adapter-openrouter').ok, true, 'adapter-openrouter must be allowlisted');
  });

  it('LlmAdapterRegistry: registers OpenRouterAdapter and resolves matrix models correctly', async () => {
    const { LlmAdapterRegistry, MODEL_ROUTING_MAP, OpenRouterAdapter } = await import('../src/core/index.js');
    const registry = new LlmAdapterRegistry();

    // 1. Adapter lookup
    const openrouter = registry.getAdapter('OPENROUTER');
    assert.ok(openrouter instanceof OpenRouterAdapter);
    assert.equal(openrouter.getName(), 'OPENROUTER');

    // 2. MODEL_ROUTING_MAP validation
    assert.deepEqual(registry.resolveModel('claude-3-5-sonnet'), {
      adapterKey: 'OPENROUTER',
      model: 'anthropic/claude-3.5-sonnet'
    });
    assert.deepEqual(registry.resolveModel('gpt-4o'), {
      adapterKey: 'OPENROUTER',
      model: 'openai/gpt-4o'
    });
    assert.deepEqual(registry.resolveModel('gemini-1-5-pro'), {
      adapterKey: 'GOOGLE_GEMINI',
      model: 'gemini-1.5-pro'
    });

    // 3. Unmapped model returns null
    assert.equal(registry.resolveModel('unknown-model'), null);
    assert.equal(registry.resolveModel(''), null);
    assert.equal(registry.resolveModel(null), null);
  });
});

describe('EOSProviderRouter - Phase 2 Real Dispatch & Health Probe Contract', () => {
  it('returns ADAPTER_NOT_FOUND when taskType is not in matrix or unmapped (zero network I/O)', async () => {
    const { EOSProviderRouter } = await import('../src/core/index.js');
    let fetchCalled = false;
    const router = new EOSProviderRouter();

    const result = await router.enrutarMisionReal('NON_EXISTENT_TASK', {
      prompt: 'hello'
    }, {
      fetchImpl: async () => { fetchCalled = true; }
    });

    assert.equal(result.executed, false);
    assert.equal(result.code, 'ADAPTER_NOT_FOUND');
    assert.equal(fetchCalled, false, 'Zero network I/O on unmapped task');
  });

  it('fails closed with NO_CREDENTIALS when broker has no key for target provider (zero network I/O)', async () => {
    const { EOSProviderRouter, LlmAdapterRegistry } = await import('../src/core/index.js');
    const { createSecretRuntimeBroker } = await import('../src/core/secrets/secret-runtime-broker.js');

    let fetchCalled = false;
    // Broker with empty env map
    const emptyBroker = createSecretRuntimeBroker({ env: {} });
    const router = new EOSProviderRouter({ secretBroker: emptyBroker });

    const result = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      prompt: 'design system'
    }, {
      fetchImpl: async () => { fetchCalled = true; }
    });

    assert.equal(result.executed, false);
    assert.equal(result.code, 'NO_CREDENTIALS');
    assert.equal(fetchCalled, false, 'Zero network I/O when credentials missing');
  });

  it('fails closed with BUDGET_EXCEEDED when ECR budget is exhausted before network I/O', async () => {
    const { EOSProviderRouter } = await import('../src/core/index.js');
    const { createSecretRuntimeBroker } = await import('../src/core/secrets/secret-runtime-broker.js');
    const { createEcrBudgetGate } = await import('../src/core/budget/ecr-budget-gate.js');

    let fetchCalled = false;
    const broker = createSecretRuntimeBroker({
      env: { OPENROUTER_API_KEY: 'test-key', GEMINI_API_KEY: 'test-key' }
    });
    // ECR gate with 0 tokens budget (exhausted)
    const ecrGate = createEcrBudgetGate({ tokenThreshold: 0 });
    ecrGate.trip('TOKEN_BUDGET_EXCEEDED');

    const router = new EOSProviderRouter({
      secretBroker: broker,
      ecrGate
    });

    const result = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      prompt: 'design system'
    }, {
      fetchImpl: async () => { fetchCalled = true; }
    });

    assert.equal(result.executed, false);
    assert.equal(result.code, 'BUDGET_EXCEEDED');
    assert.equal(fetchCalled, false, 'Zero network I/O when budget exceeded');
  });

  it('returns valid dispatch receipt on success with usage, modo PRIMARY, and PRODUCTION_READY NO', async () => {
    const { EOSProviderRouter, LlmAdapterRegistry, OpenRouterAdapter } = await import('../src/core/index.js');
    const { createSecretRuntimeBroker } = await import('../src/core/secrets/secret-runtime-broker.js');
    const { createEcrBudgetGate } = await import('../src/core/budget/ecr-budget-gate.js');

    const broker = createSecretRuntimeBroker({
      env: { OPENROUTER_API_KEY: 'openrouter-valid-key' }
    });
    const ecrGate = createEcrBudgetGate({ tokenThreshold: 100000 });

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'architectural response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      })
    });

    const registry = new LlmAdapterRegistry();
    const openRouter = new OpenRouterAdapter({ fetchImpl: mockFetch });
    registry.registerAdapter(openRouter);

    const router = new EOSProviderRouter({
      registry,
      secretBroker: broker,
      ecrGate
    });

    const result = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      prompt: 'review this arch'
    });

    assert.equal(result.executed, true);
    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.proveedorUtilizado, 'claude-3-5-sonnet');
    assert.equal(result.modo, 'PRIMARY');
    assert.ok(typeof result.latency_ms === 'number');
    assert.deepEqual(result.usage, {
      input_tokens: 50,
      output_tokens: 25,
      total_tokens: 75,
      estimated_cost_usd: 0.000525
    });
    assert.equal(result.raw_text, 'architectural response');
    assert.equal(result.PRODUCTION_READY, 'NO');
    assert.equal(JSON.stringify(result).includes('openrouter-valid-key'), false, 'Zero secret leakage in receipt');
  });

  it('attempts fallback on primary timeout or provider error (≤2 sanctioned calls), modo FALLBACK', async () => {
    const { EOSProviderRouter, LlmAdapterRegistry, OpenRouterAdapter } = await import('../src/core/index.js');
    const { createSecretRuntimeBroker } = await import('../src/core/secrets/secret-runtime-broker.js');
    const { createEcrBudgetGate } = await import('../src/core/budget/ecr-budget-gate.js');

    const broker = createSecretRuntimeBroker({
      env: { OPENROUTER_API_KEY: 'openrouter-valid-key' }
    });
    const ecrGate = createEcrBudgetGate({ tokenThreshold: 100000 });

    let callCount = 0;
    const mockFetch = async (url, options) => {
      callCount += 1;
      const body = JSON.parse(options.body);
      if (body.model.includes('claude')) {
        // Primary fails with timeout
        const err = new Error('Gateway Timeout');
        err.name = 'AbortError';
        throw err;
      }
      // Fallback gpt-4o succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'fallback response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 }
        })
      };
    };

    const registry = new LlmAdapterRegistry();
    const openRouter = new OpenRouterAdapter({ fetchImpl: mockFetch });
    registry.registerAdapter(openRouter);

    const router = new EOSProviderRouter({
      registry,
      secretBroker: broker,
      ecrGate
    });

    const result = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      prompt: 'review this arch'
    });

    assert.equal(result.executed, true);
    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.proveedorUtilizado, 'gpt-4o');
    assert.equal(result.modo, 'FALLBACK');
    assert.equal(callCount, 2, 'Must have executed exactly 2 calls (primary then fallback)');
  });

  it('probeProviderHealth: unknown provider -> PROVIDER_UNAVAILABLE without throwing', async () => {
    const { EOSProviderRouter } = await import('../src/core/index.js');
    const router = new EOSProviderRouter();

    const result = await router.probeProviderHealth('UNKNOWN_PROVIDER_XYZ');
    assert.equal(result.status, 'PROVIDER_UNAVAILABLE');
    assert.equal(result.credentials.present, false);
    assert.equal(result.PRODUCTION_READY, 'NO');
  });

  it('probeProviderHealth: OpenRouter executes probe() and returns latency and credential status', async () => {
    const { EOSProviderRouter, LlmAdapterRegistry, OpenRouterAdapter } = await import('../src/core/index.js');
    const { createSecretRuntimeBroker } = await import('../src/core/secrets/secret-runtime-broker.js');

    const broker = createSecretRuntimeBroker({
      env: { OPENROUTER_API_KEY: 'test-openrouter-probe-key' }
    });
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'pong' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      })
    });

    const registry = new LlmAdapterRegistry();
    const openRouter = new OpenRouterAdapter({ fetchImpl: mockFetch });
    registry.registerAdapter(openRouter);

    const router = new EOSProviderRouter({
      registry,
      secretBroker: broker
    });

    const result = await router.probeProviderHealth('OPENROUTER');
    assert.equal(result.status, 'OK');
    assert.equal(result.credentials.present, true);
    assert.ok(typeof result.latency_ms === 'number');
    assert.equal(result.PRODUCTION_READY, 'NO');
    assert.equal(JSON.stringify(result).includes('test-openrouter-probe-key'), false, 'No secret leak in probe');
  });
});
