/**
 * @file eos-rp-real-provider-execution.test.js
 * @description Real Provider Execution (RP) — Slice 1+2 (PR 1+2): OpenRouterAdapter,
 * registry model→adapter mapping, Law VI env-gate allowlist names, and the real
 * dispatch path (`enrutarMisionReal` + ECR budget gate + error bridge + health probe).
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
  LlmSchemaValidationError,
  LlmBudgetError
} from '../src/core/ports/llm-port.js';
import { OpenRouterAdapter } from '../src/core/adapters/llm/openrouter-adapter.js';
import { EOSProviderRouter } from '../src/core/provider-router.js';
import {
  LlmAdapterRegistry,
  MODEL_ROUTING_MAP
} from '../src/core/adapters/llm/adapter-registry.js';
import { GeminiAdapter } from '../src/core/adapters/llm/gemini-adapter.js';
import { createEcrBudgetGate } from '../src/core/budget/ecr-budget-gate.js';
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

// ─────────────────────────────────────────────────────────────────────────────
// Slice 2 (PR 2): real dispatch through the router — enrutarMisionReal (D1/D2/D6),
// ECR budget gate (spec: Budget gate before network I/O), error bridge (D4),
// and probeProviderHealth (D5). All transport hermetic via fetchImpl doubles.
// ─────────────────────────────────────────────────────────────────────────────

/** AbortError-shaped failure for timeout simulation (matches fetch abort). */
function abortError() {
  const err = new Error('The operation was aborted');
  err.name = 'AbortError';
  return err;
}

/** LlmResponse-shaped success for the hermetic gemini fallback double. */
function geminiSuccessBody() {
  return {
    schema_version: '1.0.0',
    provider: 'GOOGLE',
    model: 'gemini-1.5-pro',
    request_id: 'rp-fallback-1',
    status: 'COMPLETED',
    structured_output: null,
    raw_text: 'from fake gemini',
    usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5, estimated_cost_usd: 0.00001 },
    latency_ms: 11,
    timestamp: new Date().toISOString(),
    errors: []
  };
}

/**
 * Hermetic GOOGLE_GEMINI double for router fallback tests: controllable queue of
 * LlmResponse objects or errors. Implements receiveSecret to prove the broker
 * handshake reaches the adapter. NEVER performs network I/O.
 */
class FakeGeminiAdapter extends LlmPort {
  constructor(queue = []) {
    super();
    this.queue = [...queue];
    this.injectedSecret = null;
    this.inferCalls = 0;
  }

  getName() {
    return 'GOOGLE_GEMINI';
  }

  getCapabilities() {
    return {
      provider: 'GOOGLE',
      model_name: 'gemini-1.5-pro',
      capabilities: { max_output_tokens: 8192 },
      pricing_usd_per_million: { input_tokens: 1.25, output_tokens: 5 }
    };
  }

  receiveSecret(value, _meta) {
    this.injectedSecret = value;
  }

  async infer(request) {
    this.inferCalls += 1;
    const next = this.queue.shift();
    if (next instanceof Error) throw next;
    return next || geminiSuccessBody();
  }
}

/**
 * Build a router wired with a fetch-double-backed OPENROUTER adapter, a hermetic
 * broker env map, and an ECR gate — zero real network possible.
 * @param {object} [opts]
 * @param {Record<string,string>} [opts.env] broker env (default no keys)
 * @param {boolean} [opts.openrouter=true] register double-backed OPENROUTER
 * @param {'default'|'fake'} [opts.gemini='default'] registry gemini entry
 * @param {object} [opts.fetchOpts] makeFetchDouble options for OPENROUTER
 * @param {object} [opts.gate] createEcrBudgetGate options
 */
function makeRouter(opts = {}) {
  const registry = new LlmAdapterRegistry();
  const fetchImpl = makeFetchDouble(opts.fetchOpts || { jsonBody: successBody() });
  if (opts.openrouter !== false) {
    registry.registerAdapter(new OpenRouterAdapter({ apiKey: FAKE_KEY, fetchImpl }));
  }
  if (opts.gemini === 'fake') {
    registry.registerAdapter(new FakeGeminiAdapter(opts.geminiQueue || []));
  }
  const broker = createSecretRuntimeBroker({ env: opts.env || {} });
  const ecrGate = createEcrBudgetGate(opts.gate || { tokenThreshold: 100000 });
  const router = new EOSProviderRouter({
    registry,
    secretBroker: broker,
    ecrGate,
    timeoutMs: 5000
  });
  return { router, registry, broker, ecrGate, fetchImpl };
}

describe('EOSProviderRouter.enrutarMisionReal (dispatch + ECR budget gate)', () => {
  test('successful PRIMARY dispatch returns the D6 receipt with usage and PRODUCTION_READY NO', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY }
    });

    const receipt = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      messages: [{ role: 'user', content: 'Summarize the EOS architecture.' }],
      request_id: 'rp-dispatch-1'
    });

    assert.equal(receipt.status, 'SUCCESS');
    assert.equal(receipt.executed, true);
    assert.equal(receipt.proveedorUtilizado, 'claude-3-5-sonnet');
    assert.equal(receipt.modo, 'PRIMARY');
    assert.equal(typeof receipt.latency_ms, 'number');
    assert.deepEqual(receipt.usage, {
      input_tokens: 12,
      output_tokens: 7,
      total_tokens: 19,
      estimated_cost_usd: 0.000141
    });
    assert.equal(receipt.PRODUCTION_READY, 'NO');

    // Real dispatch happened: one network call, mapped model, broker-delivered key
    assert.equal(fetchImpl.calls.length, 1);
    const { url, requestOpts: reqOpts } = fetchImpl.calls[0];
    assert.equal(url, OPENROUTER_ENDPOINT);
    assert.equal(reqOpts.headers.Authorization, `Bearer ${FAKE_KEY}`);
    assert.equal(JSON.parse(reqOpts.body).model, 'anthropic/claude-3.5-sonnet');
  });

  test('unmapped task type returns ADAPTER_NOT_FOUND with zero network I/O', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY }
    });

    const receipt = await router.enrutarMisionReal('UNKNOWN_TASK_XYZ', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'ADAPTER_NOT_FOUND');
    assert.equal(receipt.executed, false);
    assert.equal(receipt.sideEffects, 'NONE');
    assert.equal(fetchImpl.calls.length, 0);
  });

  test('missing credentials return NO_CREDENTIALS with zero network I/O', async () => {
    const { router, fetchImpl } = makeRouter({ env: {} });

    const receipt = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'NO_CREDENTIALS');
    assert.equal(receipt.executed, false);
    assert.equal(fetchImpl.calls.length, 0);
  });

  test('exhausted ECR budget returns BUDGET_EXCEEDED before any network call', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY },
      gate: { tokenThreshold: 100, initialTokens: 200 }
    });

    const receipt = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'BUDGET_EXCEEDED');
    assert.equal(receipt.executed, false);
    assert.equal(fetchImpl.calls.length, 0, 'double must never be called when ECR denies');
  });

  test('fallback retry after primary timeout succeeds with modo FALLBACK (calls within sanctioned count)', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY, GEMINI_API_KEY: 'fake-gemini-key' },
      fetchOpts: { throwError: abortError() },
      gemini: 'fake',
      geminiQueue: [geminiSuccessBody()]
    });

    // CONTRACT_SYNTHESIS: primary gpt-4o → OPENROUTER (times out), fallback gemini-1-5-pro
    const receipt = await router.enrutarMisionReal('CONTRACT_SYNTHESIS', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'SUCCESS');
    assert.equal(receipt.modo, 'FALLBACK');
    assert.equal(receipt.proveedorUtilizado, 'gemini-1-5-pro');
    assert.deepEqual(receipt.usage, {
      input_tokens: 3,
      output_tokens: 2,
      total_tokens: 5,
      estimated_cost_usd: 0.00001
    });
    assert.ok(fetchImpl.calls.length <= 2, 'sanctioned fallback count never exceeded');
    assert.equal(fetchImpl.calls.length, 1);
  });

  test('primary and fallback both time out → PROVIDER_TIMEOUT after exactly 2 network calls', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY },
      fetchOpts: { throwError: abortError() }
    });

    // ARCHITECTURE_DEEP: primary claude-3-5-sonnet + fallback gpt-4o, both OPENROUTER
    const receipt = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'PROVIDER_TIMEOUT');
    assert.equal(receipt.executed, false);
    assert.equal(receipt.providerCode, 'LLM_TIMEOUT');
    assert.equal(fetchImpl.calls.length, 2, 'total network calls must equal the sanctioned count');
  });
});

describe('EOSProviderRouter.enrutarMisionReal (LlmPort error bridge D4)', () => {
  test('auth denied maps to PROVIDER_UNAVAILABLE with providerCode LLM_AUTH_DENIED and no retry', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY },
      fetchOpts: { status: 401, statusText: 'Unauthorized', jsonBody: { error: { message: 'bad key' } } }
    });

    const receipt = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'PROVIDER_UNAVAILABLE');
    assert.equal(receipt.providerCode, 'LLM_AUTH_DENIED');
    assert.equal(receipt.executed, false);
    assert.equal(fetchImpl.calls.length, 1, 'auth rejection must NOT retry the fallback');
  });

  test('rate limit on primary and fallback maps to PROVIDER_UNAVAILABLE with providerCode LLM_RATE_LIMITED after 2 calls', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY },
      fetchOpts: { status: 429, statusText: 'Rate Limited', jsonBody: { error: { message: 'slow down' } } }
    });

    const receipt = await router.enrutarMisionReal('ARCHITECTURE_DEEP', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'PROVIDER_UNAVAILABLE');
    assert.equal(receipt.providerCode, 'LLM_RATE_LIMITED');
    assert.equal(fetchImpl.calls.length, 2);
  });

  test('LLM_BUDGET_EXCEEDED maps to BUDGET_EXCEEDED with providerCode and no retry', async () => {
    // CONTEXT_MASSIVE primary gemini-1-5-pro → GOOGLE_GEMINI fake double (hermetic):
    // a raw LlmBudgetError reaches the router bridge the same way a native adapter
    // budget rejection would.
    const { router, fetchImpl } = makeRouter({
      env: { GEMINI_API_KEY: 'fake-gemini-key', OPENROUTER_API_KEY: FAKE_KEY },
      gemini: 'fake',
      geminiQueue: [new LlmBudgetError('provider budget exceeded', { tokens: 99999 })]
    });

    const receipt = await router.enrutarMisionReal('CONTEXT_MASSIVE', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'BUDGET_EXCEEDED');
    assert.equal(receipt.providerCode, 'LLM_BUDGET_EXCEEDED');
    assert.equal(fetchImpl.calls.length, 0, 'budget errors are not retryable and never fall through to fallback');
  });

  test('schema validation failure maps to PROVIDER_UNAVAILABLE with providerCode LLM_SCHEMA_VALIDATION_FAILED and no retry', async () => {
    // GeminiAdapter surfaces structured-output parse failures as LlmSchemaValidationError;
    // the fake double reproduces that exact adapter-level error for the router bridge.
    const { router, fetchImpl } = makeRouter({
      env: { GEMINI_API_KEY: 'fake-gemini-key', OPENROUTER_API_KEY: FAKE_KEY },
      gemini: 'fake',
      geminiQueue: [new LlmSchemaValidationError('bad json', { rawText: 'not json' })]
    });

    const receipt = await router.enrutarMisionReal('CONTEXT_MASSIVE', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'PROVIDER_UNAVAILABLE');
    assert.equal(receipt.providerCode, 'LLM_SCHEMA_VALIDATION_FAILED');
    assert.equal(fetchImpl.calls.length, 0);
  });

  test('provider failure on primary is retried on the fallback (modo FALLBACK)', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY, GEMINI_API_KEY: 'fake-gemini-key' },
      fetchOpts: { throwError: new LlmProviderError('upstream 500', { status: 500 }) },
      gemini: 'fake',
      geminiQueue: [geminiSuccessBody()]
    });

    const receipt = await router.enrutarMisionReal('CONTRACT_SYNTHESIS', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(receipt.status, 'SUCCESS');
    assert.equal(receipt.modo, 'FALLBACK');
    assert.equal(fetchImpl.calls.length, 1);
  });

  test('keys and prompts never appear in receipts or error envelopes (opaque redaction)', async () => {
    const secret = 'super-secret-key-value-123456';
    const prompt = 'TOP-SECRET-PROMPT-CONTENT-987654';

    // Router-level redaction: an adapter may echo the PROMPT unredacted (Gemini's
    // native errors do) — the router bridge must strip full prompt content.
    const pending = makeRouter({
      env: { GEMINI_API_KEY: secret },
      gemini: 'fake',
      geminiQueue: [new LlmAuthError(`provider echoed [${prompt}] back`, { status: 401 })]
    });
    const receiptA = await pending.router.enrutarMisionReal('CONTEXT_MASSIVE', {
      messages: [{ role: 'user', content: prompt }]
    });
    assert.equal(receiptA.status, 'PROVIDER_UNAVAILABLE');
    assert.equal(receiptA.providerCode, 'LLM_AUTH_DENIED');
    assert.equal(
      JSON.stringify(receiptA).includes(prompt),
      false,
      'prompt must never appear in the envelope'
    );

    // Adapter-level redaction: a provider error body echoing the KEY is redacted by
    // OpenRouterAdapter before the router surfaces it; router strips prompt too.
    const { router: routerB, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY },
      fetchOpts: {
        status: 401,
        statusText: 'Unauthorized',
        jsonBody: { error: { message: `echo ${FAKE_KEY} and ${prompt}` } }
      }
    });
    const receiptB = await routerB.enrutarMisionReal('ARCHITECTURE_DEEP', {
      messages: [{ role: 'user', content: prompt }]
    });
    assert.equal(receiptB.status, 'PROVIDER_UNAVAILABLE');
    const dumpB = JSON.stringify(receiptB);
    assert.equal(dumpB.includes(FAKE_KEY), false, 'key must never appear in the envelope');
    assert.equal(dumpB.includes(prompt), false, 'prompt must never appear in the envelope');
    assert.equal(fetchImpl.calls.length, 1);
  });
});

describe('EOSProviderRouter.probeProviderHealth (D5 timed probe + degradation)', () => {
  test('configured OpenRouter probe returns SUCCESS with latency, credentials, PRODUCTION_READY NO, and probe body max_tokens 1', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY }
    });

    const result = await router.probeProviderHealth('OPENROUTER');

    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual(result.credentials, { present: true });
    assert.equal(typeof result.latency_ms, 'number');
    assert.equal(result.PRODUCTION_READY, 'NO');
    assert.equal(fetchImpl.calls.length, 1);
    assert.equal(JSON.parse(fetchImpl.calls[0].requestOpts.body).max_tokens, 1);
  });

  test('unknown provider returns PROVIDER_UNAVAILABLE without throwing', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY }
    });

    const result = await router.probeProviderHealth('no-such-provider-xyz');

    assert.equal(result.status, 'PROVIDER_UNAVAILABLE');
    assert.deepEqual(result.credentials, { present: false });
    assert.equal(result.PRODUCTION_READY, 'NO');
    assert.equal(fetchImpl.calls.length, 0);
  });

  test('unconfigured provider returns NO_CREDENTIALS fail-closed without network', async () => {
    const { router, fetchImpl } = makeRouter({ env: {} });

    const result = await router.probeProviderHealth('OPENROUTER');

    assert.equal(result.status, 'NO_CREDENTIALS');
    assert.deepEqual(result.credentials, { present: false });
    assert.equal(fetchImpl.calls.length, 0);
  });

  test('persistent probe timeout retries then reports PROVIDER_TIMEOUT with exactly 2 network calls', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { OPENROUTER_API_KEY: FAKE_KEY },
      fetchOpts: { throwError: abortError() }
    });

    const result = await router.probeProviderHealth('OPENROUTER', { timeoutMs: 100, retries: 2 });

    assert.equal(result.status, 'PROVIDER_TIMEOUT');
    assert.equal(result.providerCode, 'LLM_TIMEOUT');
    assert.equal(fetchImpl.calls.length, 2, 'timeout retries = retries limit');
  });

  test('Gemini presence-only probe reports SUCCESS with credentials present (no network)', async () => {
    const { router, fetchImpl } = makeRouter({
      env: { GEMINI_API_KEY: 'fake-gemini-key' }
    });

    const result = await router.probeProviderHealth('GOOGLE_GEMINI');

    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual(result.credentials, { present: true });
    assert.equal(result.latency_ms, 0);
    assert.equal(result.PRODUCTION_READY, 'NO');
    assert.equal(fetchImpl.calls.length, 0, 'presence-only path must never touch the network');
  });

  test('Gemini without credentials reports NO_CREDENTIALS fail-closed', async () => {
    const { router } = makeRouter({ env: {} });

    const result = await router.probeProviderHealth('GOOGLE_GEMINI');

    assert.equal(result.status, 'NO_CREDENTIALS');
    assert.deepEqual(result.credentials, { present: false });
  });
});

describe('EOSProviderRouter zero-network fail-closed (TRIANGULATE)', () => {
  test('all fail-closed paths keep the fetch double at zero network calls (double spy)', async () => {
    const { router, fetchImpl } = makeRouter({
      env: {},
      gate: { tokenThreshold: 100, initialTokens: 200 }
    });

    const a = await router.enrutarMisionReal('UNKNOWN_TASK_XYZ', { messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(a.status, 'ADAPTER_NOT_FOUND');

    const b = await router.enrutarMisionReal('ARCHITECTURE_DEEP', { messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(b.status, 'NO_CREDENTIALS');

    const c = await router.enrutarMisionReal('TDD_COMPLEX', { messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(c.status, 'NO_CREDENTIALS');

    const d = await router.probeProviderHealth('mystery-provider');
    assert.equal(d.status, 'PROVIDER_UNAVAILABLE');

    const e = await router.probeProviderHealth('OPENROUTER');
    assert.equal(e.status, 'NO_CREDENTIALS');

    assert.equal(fetchImpl.calls.length, 0, 'zero real network across every fail-closed path');
  });
});