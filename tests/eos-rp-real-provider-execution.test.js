/**
 * @file eos-rp-real-provider-execution.test.js
 * @description Real Provider Execution (RP) — Slice 1 (PR 1): OpenRouterAdapter,
 * registry model→adapter mapping, and Law VI env-gate allowlist names.
 * Hermetic: mock fetchImpl doubles ONLY. ZERO real network in CI.
 * PRODUCTION_READY: NO
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LlmPort,
  LlmAuthError,
  LlmTimeoutError,
  LlmRateLimitError,
  LlmProviderError,
  LlmSchemaValidationError
} from '../src/core/ports/llm-port.js';
import { OpenRouterAdapter } from '../src/core/adapters/llm/openrouter-adapter.js';
import {
  LlmAdapterRegistry,
  MODEL_ROUTING_MAP
} from '../src/core/adapters/llm/adapter-registry.js';
import { GeminiAdapter } from '../src/core/adapters/llm/gemini-adapter.js';
import {
  createEnvGate,
  DEFAULT_ALLOWLISTED_ENV_KEYS,
  DEFAULT_ALLOWLISTED_ADAPTERS
} from '../src/core/secrets/env-gate.js';
import { createSecretRuntimeBroker } from '../src/core/secrets/secret-runtime-broker.js';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/** Fake env key (Law VI: never a real vendor-shaped literal). */
const FAKE_KEY = 'env-fake-openrouter-key-001';

/**
 * Build a hermetic fetch double that records the request.
 * @param {object} [opts]
 * @param {number} [opts.status=200]
 * @param {object} [opts.jsonBody]
 * @param {Error} [opts.throwError] - when set, the double rejects with it
 * @param {(url: string, opts: object) => void} [opts.onRequest]
 */
function makeFetchDouble(opts = {}) {
  const calls = [];
  const impl = async (url, requestOpts) => {
    calls.push({ url, requestOpts });
    if (opts.onRequest) opts.onRequest(url, requestOpts);
    if (opts.throwError) throw opts.throwError;
    return {
      ok: opts.status ? opts.status < 400 : true,
      status: opts.status || 200,
      statusText: opts.statusText || 'OK',
      json: async () => (opts.jsonBody !== undefined ? opts.jsonBody : {})
    };
  };
  impl.calls = calls;
  return impl;
}

/** Standard OpenRouter chat-completion success body. */
function successBody(content = 'Hello from OpenRouter!') {
  return {
    id: 'gen-rp-1',
    choices: [
      { index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }
    ],
    usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 }
  };
}

/** Minimal request shape shared by infer tests. */
function baseRequest(overrides = {}) {
  return {
    model: 'anthropic/claude-3.5-sonnet',
    messages: [{ role: 'user', content: 'Summarize the EOS architecture.' }],
    request_id: 'rp-test-1',
    ...overrides
  };
}

describe('OpenRouterAdapter (LlmPort contract)', () => {
  test('getName returns OPENROUTER and adapter is an LlmPort', () => {
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY });
    assert.equal(adapter.getName(), 'OPENROUTER');
    assert.ok(adapter instanceof LlmPort);
  });

  test('getCapabilities reports provider OPENROUTER with pricing', () => {
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY });
    const caps = adapter.getCapabilities('anthropic/claude-3.5-sonnet');
    assert.equal(caps.provider, 'OPENROUTER');
    assert.equal(caps.model_name, 'anthropic/claude-3.5-sonnet');
    assert.equal(typeof caps.pricing_usd_per_million.input_tokens, 'number');
    assert.equal(typeof caps.pricing_usd_per_million.output_tokens, 'number');
    assert.ok(caps.pricing_usd_per_million.input_tokens > 0);
  });

  test('receiveSecret stores the runtime secret from the broker handshake', () => {
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY });
    adapter.receiveSecret('runtime-secret-abc', {
      envKey: 'OPENROUTER_API_KEY',
      adapterId: 'adapter-openrouter'
    });
    assert.equal(adapter.__runtimeSecret, 'runtime-secret-abc');
  });

  test('infer POSTs to the OpenRouter endpoint with Bearer auth and mapped body', async () => {
    const fetchImpl = makeFetchDouble({ jsonBody: successBody() });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    const result = await adapter.infer(baseRequest());

    assert.equal(fetchImpl.calls.length, 1);
    const { url, requestOpts: reqOpts } = fetchImpl.calls[0];
    assert.equal(url, OPENROUTER_ENDPOINT);
    assert.equal(reqOpts.method, 'POST');
    assert.equal(reqOpts.headers.Authorization, `Bearer ${FAKE_KEY}`);
    assert.equal(reqOpts.headers['Content-Type'], 'application/json');

    const body = JSON.parse(reqOpts.body);
    assert.equal(body.model, 'anthropic/claude-3.5-sonnet');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Summarize the EOS architecture.' }]);
    assert.equal(body.max_tokens, 4096);
    assert.equal(body.temperature, 0.2);
    assert.equal(body.response_format, undefined);
    assert.ok(reqOpts.signal, 'abort signal must be wired');

    // LlmResponse shape
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.provider, 'OPENROUTER');
    assert.equal(result.raw_text, 'Hello from OpenRouter!');
    assert.equal(result.structured_output, null);
    assert.equal(result.request_id, 'rp-test-1');
    assert.deepEqual(result.errors, []);
    assert.equal(typeof result.latency_ms, 'number');
  });

  test('usage maps prompt_tokens/completion_tokens and computes cost from capabilities', async () => {
    const fetchImpl = makeFetchDouble({ jsonBody: successBody() });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    const result = await adapter.infer(baseRequest());
    const caps = adapter.getCapabilities('anthropic/claude-3.5-sonnet');

    assert.deepEqual(result.usage, {
      input_tokens: 12,
      output_tokens: 7,
      total_tokens: 19,
      estimated_cost_usd: Number(
        (
          12 * (caps.pricing_usd_per_million.input_tokens / 1e6) +
          7 * (caps.pricing_usd_per_million.output_tokens / 1e6)
        ).toFixed(6)
      )
    });
  });

  test('structured_output_schema sets response_format json_object and parses content', async () => {
    const fetchImpl = makeFetchDouble({
      jsonBody: successBody('{"status":"APPROVED","score":98}')
    });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    const result = await adapter.infer(
      baseRequest({ structured_output_schema: { type: 'object' } })
    );

    const { requestOpts: reqOpts } = fetchImpl.calls[0];
    assert.equal(JSON.parse(reqOpts.body).response_format.type, 'json_object');
    assert.deepEqual(result.structured_output, { status: 'APPROVED', score: 98 });
  });

  test('invalid structured JSON throws LlmSchemaValidationError', async () => {
    const fetchImpl = makeFetchDouble({ jsonBody: successBody('{not json') });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    await assert.rejects(
      () => adapter.infer(baseRequest({ structured_output_schema: { type: 'object' } })),
      (err) => err instanceof LlmSchemaValidationError && err.code === 'LLM_SCHEMA_VALIDATION_FAILED'
    );
  });

  test('no textual content throws LlmProviderError with finish reason', async () => {
    const fetchImpl = makeFetchDouble({
      jsonBody: {
        id: 'gen-rp-2',
        choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'length' }],
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 }
      }
    });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    await assert.rejects(
      () => adapter.infer(baseRequest()),
      (err) =>
        err instanceof LlmProviderError &&
        err.code === 'LLM_PROVIDER_FAILURE' &&
        err.message.includes('no textual content') &&
        err.message.includes('length')
    );
  });

  test('missing key throws LlmAuthError before any network I/O', async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const fetchImpl = makeFetchDouble({ jsonBody: successBody() });
    const adapter = new OpenRouterAdapter({ fetchImpl });
    try {
      await assert.rejects(
        () => adapter.infer(baseRequest()),
        (err) => err instanceof LlmAuthError && err.code === 'LLM_AUTH_DENIED'
      );
    } finally {
      if (prev !== undefined) process.env.OPENROUTER_API_KEY = prev;
      else delete process.env.OPENROUTER_API_KEY;
    }
    assert.equal(fetchImpl.calls.length, 0);
  });

  test('401 and 403 map to LlmAuthError, 429 to LlmRateLimitError, 500 to LlmProviderError', async () => {
    const cases = [
      { status: 401, ErrorType: LlmAuthError, code: 'LLM_AUTH_DENIED' },
      { status: 403, ErrorType: LlmAuthError, code: 'LLM_AUTH_DENIED' },
      { status: 429, ErrorType: LlmRateLimitError, code: 'LLM_RATE_LIMITED' },
      { status: 500, ErrorType: LlmProviderError, code: 'LLM_PROVIDER_FAILURE' }
    ];

    for (const c of cases) {
      const fetchImpl = makeFetchDouble({
        status: c.status,
        statusText: 'ERR',
        jsonBody: { error: { message: `provider says ${c.status}` } }
      });
      const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });
      await assert.rejects(
        () => adapter.infer(baseRequest()),
        (err) => err instanceof c.ErrorType && err.code === c.code,
        `expected ${c.code} for status ${c.status}`
      );
    }
  });

  test('aborted request maps to LlmTimeoutError', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    const fetchImpl = makeFetchDouble({ throwError: abortErr });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    await assert.rejects(
      () => adapter.infer(baseRequest()),
      (err) => err instanceof LlmTimeoutError && err.code === 'LLM_TIMEOUT'
    );
  });

  test('network failure maps to LlmProviderError', async () => {
    const fetchImpl = makeFetchDouble({ throwError: new TypeError('fetch failed') });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    await assert.rejects(
      () => adapter.infer(baseRequest()),
      (err) => err instanceof LlmProviderError && err.code === 'LLM_PROVIDER_FAILURE'
    );
  });

  test('probe returns ok on a minimal successful call', async () => {
    const fetchImpl = makeFetchDouble({
      jsonBody: {
        id: 'gen-probe-1',
        choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      }
    });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    const probe = await adapter.probe({ timeoutMs: 2000, retries: 1 });
    assert.equal(probe.ok, true);
    assert.equal(typeof probe.latency_ms, 'number');

    const body = JSON.parse(fetchImpl.calls[0].requestOpts.body);
    assert.equal(body.max_tokens, 1);
  });

  test('probe maps persistent timeout to LlmTimeoutError', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const fetchImpl = makeFetchDouble({ throwError: abortErr });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    await assert.rejects(
      () => adapter.probe({ timeoutMs: 25, retries: 2 }),
      (err) => err instanceof LlmTimeoutError && err.code === 'LLM_TIMEOUT'
    );
    assert.ok(fetchImpl.calls.length >= 1, 'probe must attempt the network double');
  });

  test('probe maps auth failure to LlmAuthError without retrying', async () => {
    const fetchImpl = makeFetchDouble({
      status: 401,
      statusText: 'Unauthorized',
      jsonBody: { error: { message: 'bad key' } }
    });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    await assert.rejects(
      () => adapter.probe({ timeoutMs: 2000, retries: 2 }),
      (err) => err instanceof LlmAuthError && err.code === 'LLM_AUTH_DENIED'
    );
    assert.equal(fetchImpl.calls.length, 1);
  });
});

describe('OpenRouterAdapter (TRIANGULATE: credential precedence & redaction)', () => {
  /**
   * Set process.env.OPENROUTER_API_KEY (null deletes it) and return a restore fn.
   * @param {string|null} nextEnv
   * @returns {() => void}
   */
  function withEnvKey(nextEnv) {
    const prev = process.env.OPENROUTER_API_KEY;
    if (nextEnv === null) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = nextEnv;
    return () => {
      if (prev === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = prev;
    };
  }

  test('receiveSecret runtime secret takes precedence over apiKey and env', async () => {
    const adapter = new OpenRouterAdapter({ apiKey: 'constructor-key' });
    adapter.receiveSecret('runtime-secret-zzz', {
      envKey: 'OPENROUTER_API_KEY',
      adapterId: 'adapter-openrouter'
    });
    const restore = withEnvKey('env-key');
    try {
      const fetchImpl = makeFetchDouble({ jsonBody: successBody() });
      adapter.fetchImpl = fetchImpl;

      await adapter.infer(baseRequest());

      assert.equal(fetchImpl.calls[0].requestOpts.headers.Authorization, 'Bearer runtime-secret-zzz');
    } finally {
      restore();
    }
  });

  test('apiKey beats process.env fallback', async () => {
    const adapter = new OpenRouterAdapter({ apiKey: 'constructor-key' });
    const restore = withEnvKey('env-key');
    try {
      const fetchImpl = makeFetchDouble({ jsonBody: successBody() });
      adapter.fetchImpl = fetchImpl;

      await adapter.infer(baseRequest());

      assert.equal(fetchImpl.calls[0].requestOpts.headers.Authorization, 'Bearer constructor-key');
    } finally {
      restore();
    }
  });

  test('process.env.OPENROUTER_API_KEY works when no explicit key is provided', async () => {
    const adapter = new OpenRouterAdapter({});
    const restore = withEnvKey('env-key');
    try {
      const fetchImpl = makeFetchDouble({ jsonBody: successBody() });
      adapter.fetchImpl = fetchImpl;

      await adapter.infer(baseRequest());

      assert.equal(fetchImpl.calls[0].requestOpts.headers.Authorization, 'Bearer env-key');
    } finally {
      restore();
    }
  });

  test('adapter error dumps contain zero secrets and zero prompt content', async () => {
    const secret = 'super-secret-key-value-123456';
    const prompt = 'A TOP-SECRET PROMPT THAT MUST NEVER LEAK';
    const fetchImpl = makeFetchDouble({
      status: 401,
      statusText: 'Unauthorized',
      jsonBody: {
        error: { message: `invalid api key ${secret} for request containing ${prompt}` }
      }
    });
    const adapter = new OpenRouterAdapter({ apiKey: secret, fetchImpl });

    await assert.rejects(
      () => adapter.infer(baseRequest({ messages: [{ role: 'user', content: prompt }] })),
      (err) => {
        assert.ok(err instanceof LlmAuthError);
        const dump = err.message + JSON.stringify(err.details);
        assert.equal(dump.includes(secret), false, 'key must never appear in error dump');
        assert.equal(dump.includes(prompt), false, 'prompt must never appear in error dump');
        return true;
      }
    );
  });

  test('adapter response never carries PRODUCTION_READY (gate stays at router layer)', async () => {
    const fetchImpl = makeFetchDouble({ jsonBody: successBody() });
    const adapter = new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl });

    const result = await adapter.infer(baseRequest());

    assert.equal('PRODUCTION_READY' in result, false);
  });
});

describe('Law VI env-gate allowlist (provider key NAMES only)', () => {
  test('DEFAULT_ALLOWLISTED_ENV_KEYS includes GEMINI_API_KEY and OPENROUTER_API_KEY', () => {
    assert.ok(DEFAULT_ALLOWLISTED_ENV_KEYS.includes('GEMINI_API_KEY'));
    assert.ok(DEFAULT_ALLOWLISTED_ENV_KEYS.includes('OPENROUTER_API_KEY'));
  });

  test('DEFAULT_ALLOWLISTED_ADAPTERS includes adapter-gemini and adapter-openrouter', () => {
    assert.ok(DEFAULT_ALLOWLISTED_ADAPTERS.includes('adapter-gemini'));
    assert.ok(DEFAULT_ALLOWLISTED_ADAPTERS.includes('adapter-openrouter'));
  });

  test('checkInject approves the OpenRouter env-key/adapter pair', () => {
    const gate = createEnvGate();
    const r = gate.checkInject('OPENROUTER_API_KEY', 'adapter-openrouter');
    assert.equal(r.ok, true);
    assert.equal(r.code, 'OK');
  });

  test('checkInject approves the Gemini env-key/adapter pair', () => {
    const gate = createEnvGate();
    const r = gate.checkInject('GEMINI_API_KEY', 'adapter-gemini');
    assert.equal(r.ok, true);
    assert.equal(r.code, 'OK');
  });

  test('broker inject delivers the secret to the adapter and never into the receipt', () => {
    const broker = createSecretRuntimeBroker({ env: { OPENROUTER_API_KEY: FAKE_KEY } });
    let received = null;
    const adapter = {
      receiveSecret(value, meta) {
        received = { value, meta };
      }
    };

    const r = broker.injectToAdapter('adapter-openrouter', 'OPENROUTER_API_KEY', adapter);

    assert.equal(r.ok, true);
    assert.equal(received.value, FAKE_KEY);
    assert.equal(received.meta.envKey, 'OPENROUTER_API_KEY');
    assert.equal(received.meta.adapterId, 'adapter-openrouter');
    assert.equal(JSON.stringify(r.receipt).includes(FAKE_KEY), false);
  });

  test('custom allowlists stay isolated — defaults are additive, not inherited', () => {
    const gate = createEnvGate({
      allowlistedEnvKeys: ['CUSTOM_ENV_X'],
      allowlistedAdapters: ['adapter-custom-1']
    });
    assert.equal(gate.checkInject('OPENROUTER_API_KEY', 'adapter-openrouter').ok, false);
    assert.equal(gate.checkInject('CUSTOM_ENV_X', 'adapter-custom-1').ok, true);
  });
});

describe('LlmAdapterRegistry model→adapter routing map', () => {
  test('registry registers OpenRouterAdapter and resolves it by key', () => {
    const registry = new LlmAdapterRegistry();

    const openrouter = registry.getAdapter('OPENROUTER');
    assert.ok(openrouter instanceof OpenRouterAdapter);
    assert.equal(openrouter.getName(), 'OPENROUTER');
  });

  test('resolveModel maps claude-3-5-sonnet → OPENROUTER/anthropic/claude-3.5-sonnet', () => {
    const registry = new LlmAdapterRegistry();
    assert.deepEqual(registry.resolveModel('claude-3-5-sonnet'), {
      adapterKey: 'OPENROUTER',
      model: 'anthropic/claude-3.5-sonnet'
    });
  });

  test('resolveModel maps gpt-4o → OPENROUTER/openai/gpt-4o', () => {
    const registry = new LlmAdapterRegistry();
    assert.deepEqual(registry.resolveModel('gpt-4o'), {
      adapterKey: 'OPENROUTER',
      model: 'openai/gpt-4o'
    });
  });

  test('resolveModel maps gemini-1-5-pro → GOOGLE_GEMINI/gemini-1.5-pro (direct)', () => {
    const registry = new LlmAdapterRegistry();
    assert.deepEqual(registry.resolveModel('gemini-1-5-pro'), {
      adapterKey: 'GOOGLE_GEMINI',
      model: 'gemini-1.5-pro'
    });
  });

  test('resolveModel returns null for unmapped matrix ids (router → ADAPTER_NOT_FOUND)', () => {
    const registry = new LlmAdapterRegistry();
    assert.equal(registry.resolveModel('unknown-model-xyz'), null);
    assert.equal(registry.resolveModel(''), null);
    assert.equal(registry.resolveModel(null), null);
  });

  test('MODEL_ROUTING_MAP is a frozen object with the three matrix ids', () => {
    assert.ok(MODEL_ROUTING_MAP && typeof MODEL_ROUTING_MAP === 'object');
    assert.deepEqual(Object.keys(MODEL_ROUTING_MAP).sort(), [
      'claude-3-5-sonnet',
      'gemini-1-5-pro',
      'gpt-4o'
    ]);
    assert.ok(Object.isFrozen(MODEL_ROUTING_MAP));
  });

  test('getAdapter canonical aliases and prefix matching stay unchanged', () => {
    const registry = new LlmAdapterRegistry();
    assert.ok(registry.getAdapter('GOOGLE') instanceof GeminiAdapter);
    assert.ok(registry.getAdapter('GOOGLE_GEMINI') instanceof GeminiAdapter);
    assert.ok(registry.getAdapter('gemini-2.0-flash') instanceof GeminiAdapter);
    assert.throws(() => registry.getAdapter(''), /ADAPTER_NOT_FOUND/);
  });

  test('src/core/index.js re-exports OpenRouterAdapter', async () => {
    const core = await import('../src/core/index.js');
    assert.ok(core.OpenRouterAdapter === OpenRouterAdapter);
  });
});