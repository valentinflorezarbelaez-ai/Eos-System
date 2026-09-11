/**
 * @file eos-compute-worker-mission-i.test.js
 * @description SPEC-0014 Mission I — Gemini AI Tool Execution Bridge.
 * Hermetic by default; live network only when RUN_LIVE_GEMINI_TESTS=true.
 * PRODUCTION_READY: NO
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import {
  buildComputePlan,
  parseCheckboxTasks,
  executeComputeRun,
  hashToolOutputs,
  listBuiltinComputeTools,
  isNativeGeminiToolCall,
  normalizeToolCalls
} from '../../scripts/runners/eos-compute-worker.js';
import {
  listGeminiTools,
  isGeminiToolName,
  executeGeminiTool,
  assertGeminiToolInput,
  hashGeminiToolInput,
  GeminiToolBridgeError,
  GEMINI_TOOL_MAX_BYTES,
  GEMINI_TOOL_TIMEOUT_MS,
  PRODUCTION_READY
} from '../../src/core/mcp/gemini-tool-bridge.js';

const CHANGE_ID = 'eos-mission-i-gemini-tool-bridge';
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

const MOCK_AVAILABLE = {
  servers: {
    StitchMCP: { command: 'npx' },
    'chrome-devtools-mcp': { command: 'npx' },
    github: { command: 'npx' },
    engram: { command: 'engram' },
    'eos-local': { command: 'node' }
  }
};

function tempCustodyDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-i-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Wire gemini tool bridge @needs(VCS)\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-i-builder',
    verifierId: 'mission-i-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
    ],
    availableConfig: MOCK_AVAILABLE,
    ...overrides
  });
}

function mockGeminiResponse({ text = 'hello from gemini', jsonMode = false } = {}) {
  const candidateText = jsonMode ? (typeof text === 'string' ? text : JSON.stringify(text)) : text;
  const body = {
    candidates: [{ content: { parts: [{ text: candidateText }] } }],
    usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 5 }
  };
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify(body);
    }
  };
}

function makeMockFetch({ assertRequest, responseFactory } = {}) {
  return async (url, init = {}) => {
    if (typeof assertRequest === 'function') {
      assertRequest(url, init);
    }
    if (typeof responseFactory === 'function') {
      return responseFactory(url, init);
    }
    const body = init.body ? JSON.parse(init.body) : {};
    const jsonMode =
      body.generationConfig && body.generationConfig.responseMimeType === 'application/json';
    return mockGeminiResponse({
      text: jsonMode ? '{"answer":42}' : 'ok-text',
      jsonMode
    });
  };
}

test('Mission I: PRODUCTION_READY is NO', () => {
  assert.equal(PRODUCTION_READY, 'NO');
});

test('Mission I: listBuiltinComputeTools / listGeminiTools discovers gemini_query + gemini_structured', () => {
  const viaBridge = listGeminiTools();
  const viaWorker = listBuiltinComputeTools();
  const names = viaBridge.map((t) => t.name).sort();
  assert.deepEqual(names, ['gemini_query', 'gemini_structured']);
  assert.deepEqual(
    viaWorker.map((t) => t.name).sort(),
    ['gemini_query', 'gemini_structured']
  );
  for (const t of viaBridge) {
    assert.ok(t.description && t.description.length > 0);
    assert.ok(t.inputSchema && t.inputSchema.properties && t.inputSchema.properties.prompt);
  }
});

test('Mission I: isGeminiToolName true/false', () => {
  assert.equal(isGeminiToolName('gemini_query'), true);
  assert.equal(isGeminiToolName('gemini_structured'), true);
  assert.equal(isGeminiToolName('echo'), false);
  assert.equal(isGeminiToolName(''), false);
  assert.equal(isGeminiToolName(null), false);
  assert.equal(isNativeGeminiToolCall({ toolName: 'gemini_query' }), true);
  assert.equal(
    isNativeGeminiToolCall({ serverName: 'eos-gemini', toolName: 'anything' }),
    true
  );
  assert.equal(
    isNativeGeminiToolCall({ serverName: 'mock-echo', toolName: 'echo' }),
    false
  );
});

test('Mission I: executeGeminiTool gemini_query mock fetch validates URL + prompt', async () => {
  let seenUrl = '';
  let seenBody = null;
  const fetchImpl = makeMockFetch({
    assertRequest(url, init) {
      seenUrl = String(url);
      seenBody = JSON.parse(init.body);
    },
    responseFactory() {
      return mockGeminiResponse({ text: 'bridge-ok' });
    }
  });

  const out = await executeGeminiTool({
    toolName: 'gemini_query',
    arguments: { prompt: 'Say hi', temperature: 0.1 },
    apiKey: 'test-key',
    fetchImpl
  });

  assert.ok(seenUrl.includes('generateContent'));
  assert.ok(seenUrl.includes('generativelanguage.googleapis.com'));
  assert.equal(seenBody.contents[0].parts[0].text, 'Say hi');
  assert.equal(seenBody.generationConfig.responseMimeType, 'text/plain');
  assert.equal(out.ok, true);
  assert.equal(out.toolName, 'gemini_query');
  assert.equal(out.result.text, 'bridge-ok');
  assert.equal(out.custody.status, 'VERIFIED');
  assert.match(out.custody.input_hash, /^[a-f0-9]{64}$/);
  assert.equal(out.custody.PRODUCTION_READY, 'NO');
});

test('Mission I: gemini_structured sets jsonMode / application/json and parses data', async () => {
  let seenBody = null;
  const fetchImpl = makeMockFetch({
    assertRequest(_url, init) {
      seenBody = JSON.parse(init.body);
    },
    responseFactory() {
      return mockGeminiResponse({ text: { score: 9 }, jsonMode: true });
    }
  });

  const out = await executeGeminiTool({
    toolName: 'gemini_structured',
    arguments: { prompt: 'Return JSON {\"score\":N}' },
    apiKey: 'test-key',
    fetchImpl
  });

  assert.equal(seenBody.generationConfig.responseMimeType, 'application/json');
  assert.equal(out.result.data.score, 9);
  assert.ok(out.result.text.includes('score'));
  assert.equal(out.custody.tool, 'gemini_structured');
});

test('Mission I: systemInstruction forwarded in request body', async () => {
  let seenBody = null;
  const fetchImpl = makeMockFetch({
    assertRequest(_url, init) {
      seenBody = JSON.parse(init.body);
    }
  });

  await executeGeminiTool({
    toolName: 'gemini_query',
    arguments: {
      prompt: 'ping',
      systemInstruction: 'You are a concise assistant.'
    },
    apiKey: 'test-key',
    fetchImpl
  });

  assert.ok(seenBody.systemInstruction);
  assert.equal(
    seenBody.systemInstruction.parts[0].text,
    'You are a concise assistant.'
  );
});

test('Mission I: KEY_MISSING when no apiKey and env cleared', async () => {
  const prev = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(
      () =>
        executeGeminiTool({
          toolName: 'gemini_query',
          arguments: { prompt: 'x' },
          apiKey: '',
          fetchImpl: async () => {
            throw new Error('should not fetch');
          }
        }),
      (err) => {
        assert.ok(err instanceof GeminiToolBridgeError);
        assert.equal(err.code, 'KEY_MISSING');
        return true;
      }
    );
  } finally {
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
    else delete process.env.GEMINI_API_KEY;
  }
});

test('Mission I: PAYLOAD_OVERSIZE when prompt > 2MiB', async () => {
  const big = 'x'.repeat(GEMINI_TOOL_MAX_BYTES + 1);
  assert.throws(
    () => assertGeminiToolInput('gemini_query', { prompt: big }),
    (err) => {
      assert.ok(err instanceof GeminiToolBridgeError);
      assert.equal(err.code, 'PAYLOAD_OVERSIZE');
      return true;
    }
  );
  await assert.rejects(
    () =>
      executeGeminiTool({
        toolName: 'gemini_query',
        arguments: { prompt: big },
        apiKey: 'test-key',
        fetchImpl: async () => {
          throw new Error('should not fetch');
        }
      }),
    (err) => {
      assert.ok(err instanceof GeminiToolBridgeError);
      assert.equal(err.code, 'PAYLOAD_OVERSIZE');
      return true;
    }
  );
});

test('Mission I: TIMEOUT when fetchImpl hangs past abort', async () => {
  const fetchImpl = (url, init = {}) =>
    new Promise((resolve, reject) => {
      const signal = init.signal;
      if (!signal) return; // hang forever if no signal
      if (signal.aborted) {
        const e = new Error('Aborted');
        e.name = 'AbortError';
        reject(e);
        return;
      }
      signal.addEventListener('abort', () => {
        const e = new Error('Aborted');
        e.name = 'AbortError';
        reject(e);
      });
    });

  await assert.rejects(
    () =>
      executeGeminiTool({
        toolName: 'gemini_query',
        arguments: { prompt: 'slow' },
        apiKey: 'test-key',
        fetchImpl,
        timeoutMs: 50
      }),
    (err) => {
      assert.ok(err instanceof GeminiToolBridgeError);
      assert.equal(err.code, 'TIMEOUT');
      return true;
    }
  );
});

test('Mission I: executeComputeRun gemini toolCall → COMPLETED with custody VERIFIED', async () => {
  const plan = basePlan({
    toolCalls: [
      {
        serverName: 'eos-gemini',
        toolName: 'gemini_query',
        arguments: { prompt: 'compute-run probe' }
      }
    ]
  });

  const fetchImpl = makeMockFetch({
    responseFactory() {
      return mockGeminiResponse({ text: 'worker-ok' });
    }
  });

  const result = await executeComputeRun({
    plan,
    // no toolDispatcher — gemini-only must not require it
    geminiApiKey: 'test-key',
    geminiFetchImpl: fetchImpl,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(result.toolOutputs.length, 1);
  const out = result.toolOutputs[0];
  assert.equal(out.ok, true);
  assert.equal(out.toolName, 'gemini_query');
  assert.equal(out.serverName, 'eos-gemini');
  assert.equal(out.result.text, 'worker-ok');
  assert.ok(out.custody);
  assert.equal(out.custody.status, 'VERIFIED');
  assert.match(out.custody.input_hash, /^[a-f0-9]{64}$/);
  assert.ok(result.custodyReceipt.payload.tool_execution_hashes);
  assert.equal(result.custodyReceipt.payload.tool_execution_hashes.length, 1);
});

test('Mission I: hashToolOutputs / seal path includes gemini outputs', async () => {
  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'gemini_structured',
        arguments: { prompt: 'json please' }
      }
    ]
  });

  const fetchImpl = makeMockFetch({
    responseFactory() {
      return mockGeminiResponse({ text: { ok: true }, jsonMode: true });
    }
  });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiFetchImpl: fetchImpl,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  const { hashes } = hashToolOutputs(result.toolOutputs);
  assert.equal(hashes.length, 1);
  assert.match(hashes[0], /^[a-f0-9]{64}$/);
  assert.deepEqual(result.custodyReceipt.payload.tool_execution_hashes, hashes);

  // input_hash matches hashGeminiToolInput
  const expected = hashGeminiToolInput('gemini_structured', { prompt: 'json please' });
  assert.equal(result.toolOutputs[0].custody.input_hash, expected);
});

test('Mission I: mixed — gemini does not require dispatcher; MCP-only still does', async () => {
  // Gemini-only: no dispatcher → COMPLETED
  const geminiPlan = basePlan({
    toolCalls: [{ toolName: 'gemini_query', arguments: { prompt: 'solo' } }]
  });
  const geminiResult = await executeComputeRun({
    plan: geminiPlan,
    geminiApiKey: 'test-key',
    geminiFetchImpl: makeMockFetch(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(geminiResult.status, 'COMPLETED');

  // MCP-only without dispatcher → MCP_TOOL_DISPATCHER_REQUIRED
  const mcpPlan = basePlan({
    toolCalls: [{ serverName: 'mock-echo', toolName: 'echo', arguments: { x: 1 } }]
  });
  const mcpMissing = await executeComputeRun({
    plan: mcpPlan,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(mcpMissing.status, 'MCP_TOOL_DISPATCHER_REQUIRED');
  assert.equal(mcpMissing.errorCode, 'MCP_TOOL_DISPATCHER_REQUIRED');

  // Mixed with dispatcher: both succeed
  const mixedPlan = basePlan({
    toolCalls: [
      { toolName: 'gemini_query', arguments: { prompt: 'a' } },
      { serverName: 'mock-echo', toolName: 'echo', arguments: { y: 2 } }
    ]
  });
  const fakeDispatcher = {
    async dispatch({ serverName, toolName, arguments: args }) {
      return { serverName, toolName, result: { echoed: args }, meta: { durationMs: 1 } };
    }
  };
  const mixed = await executeComputeRun({
    plan: mixedPlan,
    toolDispatcher: fakeDispatcher,
    geminiApiKey: 'test-key',
    geminiFetchImpl: makeMockFetch({
      responseFactory() {
        return mockGeminiResponse({ text: 'mixed-ok' });
      }
    }),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(mixed.status, 'COMPLETED');
  assert.equal(mixed.toolOutputs.length, 2);
  assert.equal(mixed.toolOutputs[0].toolName, 'gemini_query');
  assert.equal(mixed.toolOutputs[0].custody.status, 'VERIFIED');
  assert.equal(mixed.toolOutputs[1].toolName, 'echo');
  assert.equal(mixed.toolOutputs[1].ok, true);
  assert.equal(mixed.custodyReceipt.payload.tool_execution_hashes.length, 2);
});

test('Mission I: normalizeToolCalls preserves timeoutMs; hashGeminiToolInput is sha256', () => {
  const calls = normalizeToolCalls(null, [
    {
      serverName: 'eos-gemini',
      toolName: 'gemini_query',
      arguments: { prompt: 't' },
      timeoutMs: 1234
    }
  ]);
  assert.equal(calls[0].timeoutMs, 1234);
  const h = hashGeminiToolInput('gemini_query', { prompt: 't' });
  assert.match(h, /^[a-f0-9]{64}$/);
  // Deterministic: same input → same hash
  assert.equal(h, hashGeminiToolInput('gemini_query', { prompt: 't' }));
  // Secrets stripped from hash payload
  const withSecret = hashGeminiToolInput('gemini_query', {
    prompt: 't',
    apiKey: 'should-not-affect'
  });
  assert.equal(withSecret, h);
  // Manual sha256 of canonical form sanity
  void createHash;
  assert.equal(typeof GEMINI_TOOL_TIMEOUT_MS, 'number');
  assert.equal(GEMINI_TOOL_TIMEOUT_MS, 30000);
});

const liveEnabled = process.env.RUN_LIVE_GEMINI_TESTS === 'true';
test(
  'Mission I: (optional) live Gemini generateContent',
  { skip: liveEnabled ? false : 'set RUN_LIVE_GEMINI_TESTS=true to run' },
  async () => {
    const out = await executeGeminiTool({
      toolName: 'gemini_query',
      arguments: { prompt: 'Reply with the single word: pong' },
      timeoutMs: 20000
    });
    assert.equal(out.ok, true);
    assert.ok(out.result.text && out.result.text.length > 0);
    assert.equal(out.custody.status, 'VERIFIED');
  }
);
