import test from 'node:test';
import assert from 'node:assert/strict';

import { GeminiAdapter } from '../../../../src/core/adapters/llm/gemini-adapter.js';
import {
  LlmAuthError,
  LlmProviderError,
  LlmTimeoutError,
  LlmRateLimitError,
  LlmSchemaValidationError
} from '../../../../src/core/ports/llm-port.js';

test('GeminiAdapter - constructor', (t) => {
  const originalEnv = process.env.GOOGLE_AI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;

  const adapter1 = new GeminiAdapter();
  assert.equal(adapter1.apiKey, null);
  assert.equal(adapter1.defaultModel, 'gemini-2.0-flash');

  const adapter2 = new GeminiAdapter({ apiKey: 'test-key', defaultModel: 'gemini-pro' });
  assert.equal(adapter2.apiKey, 'test-key');
  assert.equal(adapter2.defaultModel, 'gemini-pro');

  if (originalEnv) process.env.GOOGLE_AI_API_KEY = originalEnv;
});

test('GeminiAdapter - getName', (t) => {
  const adapter = new GeminiAdapter();
  assert.equal(adapter.getName(), 'GOOGLE_GEMINI');
});

test('GeminiAdapter - getCapabilities', (t) => {
  const adapter = new GeminiAdapter();
  const caps = adapter.getCapabilities();

  assert.equal(caps.provider, 'GOOGLE');
  assert.equal(caps.model_name, 'gemini-2.0-flash');
  assert.equal(caps.capabilities.supports_structured_json, true);

  const capsPro = adapter.getCapabilities('gemini-1.5-pro');
  assert.equal(capsPro.capabilities.reasoning_depth, 'DEEP_COGNITIVE_REASONING');
});

test('GeminiAdapter - infer validation errors', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  await assert.rejects(
    async () => await adapter.infer(null),
    LlmProviderError
  );

  await assert.rejects(
    async () => await adapter.infer({ messages: [] }),
    LlmProviderError
  );

  const adapterNoAuth = new GeminiAdapter({ apiKey: null });
  const originalEnv = process.env.GOOGLE_AI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;

  await assert.rejects(
    async () => await adapterNoAuth.infer({ messages: [{ role: 'user', content: 'test' }] }),
    LlmAuthError
  );

  if (originalEnv) process.env.GOOGLE_AI_API_KEY = originalEnv;
});

test('GeminiAdapter - infer success', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: 'Hello world' }] },
          finishReason: 'STOP'
        }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30
        }
      })
    };
  };

  try {
    const res = await adapter.infer({
      messages: [{ role: 'user', content: 'Hi' }]
    });

    assert.equal(res.status, 'COMPLETED');
    assert.equal(res.raw_text, 'Hello world');
    assert.equal(res.usage.input_tokens, 10);
  } finally {
    global.fetch = originalFetch;
  }
});

test('GeminiAdapter - infer structured output success', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: '```json\n{"hello": "world"}\n```' }] },
          finishReason: 'STOP'
        }]
      })
    };
  };

  try {
    const res = await adapter.infer({
      structured_output_schema: { type: 'object' },
      messages: [{ role: 'user', content: 'Hi' }]
    });

    assert.equal(res.status, 'COMPLETED');
    assert.deepEqual(res.structured_output, { hello: 'world' });
  } finally {
    global.fetch = originalFetch;
  }
});

test('GeminiAdapter - infer structured output JSON parse error', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: 'invalid json' }] },
          finishReason: 'STOP'
        }]
      })
    };
  };

  try {
    await assert.rejects(
      async () => await adapter.infer({
        structured_output_schema: { type: 'object' },
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      LlmSchemaValidationError
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('GeminiAdapter - infer API Errors (401)', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    return {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid API key' } })
    };
  };

  try {
    await assert.rejects(
      async () => await adapter.infer({
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      LlmAuthError
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('GeminiAdapter - infer API Errors (429)', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    return {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'Quota exceeded' } })
    };
  };

  try {
    await assert.rejects(
      async () => await adapter.infer({
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      LlmRateLimitError
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('GeminiAdapter - infer generic API error', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    return {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({})
    };
  };

  try {
    await assert.rejects(
      async () => await adapter.infer({
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      LlmProviderError
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('GeminiAdapter - network error / timeout', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key', defaultTimeoutMs: 100 });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  };

  try {
    await assert.rejects(
      async () => await adapter.infer({
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      LlmTimeoutError
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('GeminiAdapter - no content candidate', async (t) => {
  const adapter = new GeminiAdapter({ apiKey: 'test-key' });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [] }, // No text
          finishReason: 'SAFETY'
        }]
      })
    };
  };

  try {
    await assert.rejects(
      async () => await adapter.infer({
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      LlmProviderError
    );
  } finally {
    global.fetch = originalFetch;
  }
});
