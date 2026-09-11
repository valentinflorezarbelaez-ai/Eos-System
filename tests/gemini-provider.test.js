/**
 * @file gemini-provider.test.js
 * @description TDD unit and contract tests for native Google Gemini AI Provider (SPEC-0013).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  queryGemini,
  GeminiProviderError,
  DEFAULT_GEMINI_MODEL
} from '../src/core/providers/gemini-provider.js';

describe('Gemini Provider (SPEC-0013)', () => {
  test('throws PROMPT_REQUIRED when prompt is empty or invalid', async () => {
    await assert.rejects(
      async () => queryGemini({ prompt: '' }),
      (err) => err instanceof GeminiProviderError && err.code === 'PROMPT_REQUIRED'
    );
    await assert.rejects(
      async () => queryGemini({ prompt: null }),
      (err) => err instanceof GeminiProviderError && err.code === 'PROMPT_REQUIRED'
    );
  });

  test('throws KEY_MISSING when GEMINI_API_KEY is not configured', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await assert.rejects(
        async () => queryGemini({ prompt: 'Ping', apiKey: null }),
        (err) => err instanceof GeminiProviderError && err.code === 'KEY_MISSING'
      );
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey;
    }
  });

  test('happy path text generation with mocked fetchImpl', async () => {
    let capturedUrl = '';
    let capturedOptions = null;

    const mockFetch = async (url, opts) => {
      capturedUrl = url;
      capturedOptions = opts;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Hello from Gemini Flash!' }]
                }
              }
            ],
            usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 6 }
          })
      };
    };

    const res = await queryGemini({
      prompt: 'Hello',
      apiKey: 'test-api-key',
      fetchImpl: mockFetch
    });

    assert.equal(res.text, 'Hello from Gemini Flash!');
    assert.equal(res.model, DEFAULT_GEMINI_MODEL);
    assert.equal(res.data, null);
    assert.equal(res.usage.promptTokenCount, 5);

    assert.ok(capturedUrl.includes('models/gemini-3.6-flash:generateContent?key=test-api-key'));
    const sentBody = JSON.parse(capturedOptions.body);
    assert.equal(sentBody.contents[0].parts[0].text, 'Hello');
    assert.equal(sentBody.generationConfig.responseMimeType, 'text/plain');
  });

  test('includes systemInstruction when specified', async () => {
    let capturedBody = null;
    const mockFetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] })
      };
    };

    await queryGemini({
      prompt: 'Summarize',
      systemInstruction: 'You are an architect',
      apiKey: 'test-api-key',
      fetchImpl: mockFetch
    });

    assert.equal(capturedBody.systemInstruction.parts[0].text, 'You are an architect');
  });

  test('handles jsonMode and parses structured output', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"status":"APPROVED","score":98}' }]
              }
            }
          ]
        })
    });

    const res = await queryGemini({
      prompt: 'Evaluate',
      jsonMode: true,
      apiKey: 'test-key',
      fetchImpl: mockFetch
    });

    assert.equal(res.text, '{"status":"APPROVED","score":98}');
    assert.deepEqual(res.data, { status: 'APPROVED', score: 98 });
  });

  test('throws JSON_PARSE_ERROR when jsonMode is true but candidate is invalid JSON', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'NOT_VALID_JSON' }]
              }
            }
          ]
        })
    });

    await assert.rejects(
      async () =>
        queryGemini({
          prompt: 'Evaluate',
          jsonMode: true,
          apiKey: 'test-key',
          fetchImpl: mockFetch
        }),
      (err) => err instanceof GeminiProviderError && err.code === 'JSON_PARSE_ERROR'
    );
  });

  test('throws API_ERROR when HTTP status is not ok', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 403,
      text: async () =>
        JSON.stringify({
          error: { code: 403, message: 'API key expired' }
        })
    });

    await assert.rejects(
      async () => queryGemini({ prompt: 'Ping', apiKey: 'bad-key', fetchImpl: mockFetch }),
      (err) =>
        err instanceof GeminiProviderError &&
        err.code === 'API_ERROR' &&
        err.details.status === 403 &&
        err.message.includes('API key expired')
    );
  });

  test('throws PAYLOAD_OVERSIZE if response exceeds maxBytes limit', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      text: async () => 'x'.repeat(500)
    });

    await assert.rejects(
      async () =>
        queryGemini({
          prompt: 'Big',
          apiKey: 'test-key',
          maxBytes: 100,
          fetchImpl: mockFetch
        }),
      (err) => err instanceof GeminiProviderError && err.code === 'PAYLOAD_OVERSIZE'
    );
  });

  test('throws TIMEOUT when fetch is aborted', async () => {
    const mockFetch = async (url, opts) => {
      return new Promise((resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    await assert.rejects(
      async () =>
        queryGemini({
          prompt: 'Slow',
          apiKey: 'test-key',
          timeoutMs: 20,
          fetchImpl: mockFetch
        }),
      (err) => err instanceof GeminiProviderError && err.code === 'TIMEOUT'
    );
  });

  test('live integration test against Google Generative Language API', async (t) => {
    if (!process.env.RUN_LIVE_GEMINI_TESTS || !process.env.GEMINI_API_KEY) {
      t.skip('RUN_LIVE_GEMINI_TESTS not enabled, skipping live network test');
      return;
    }
    const res = await queryGemini({
      prompt: 'Respond with exactly the single word: OK',
      timeoutMs: 30000
    });
    assert.ok(res.text.length > 0);
    assert.equal(res.model, 'gemini-3.6-flash');
  });
});


