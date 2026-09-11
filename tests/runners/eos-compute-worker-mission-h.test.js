/**
 * @file eos-compute-worker-mission-h.test.js
 * @description SPEC-0012 Mission H — McpToolDispatcher × compute worker integration.
 * PRODUCTION_READY: NO
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  parseCheckboxTasks,
  buildComputePlan,
  executeComputeRun,
  sealComputeRunCustody,
  normalizeToolCalls,
  hashToolOutputs,
  dispatchToolCall
} from '../../scripts/runners/eos-compute-worker.js';
import { parseCliArgs } from '../../scripts/runners/eos-compute-worker-cli.js';
import { EvidenceCustody } from '../../src/core/sdd/evidence-custody.js';
import {
  McpToolDispatcher,
  McpDispatcherError
} from '../../src/core/mcp/mcp-tool-dispatcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';
const CHANGE_ID = 'eos-mission-h-worker-tool-dispatch';
const MOCK_SERVER_PATH = path.join(ROOT, 'tests', 'fixtures', 'mock-mcp-server.js');

const MOCK_AVAILABLE = {
  servers: {
    StitchMCP: { command: 'npx' },
    'chrome-devtools-mcp': { command: 'npx' },
    github: { command: 'npx' },
    engram: { command: 'engram' },
    'eos-local': { command: 'node' },
    'mock-echo': { command: 'node', args: [MOCK_SERVER_PATH] }
  }
};

function tempCustodyDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-h-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Wire tool dispatch @needs(VCS)\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-h-builder',
    verifierId: 'mission-h-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
    ],
    availableConfig: MOCK_AVAILABLE,
    ...overrides
  });
}

function fakeSuccessDispatcher(result = { echoed: true }) {
  return {
    async dispatch({ serverName, toolName, arguments: args }) {
      return {
        serverName,
        toolName,
        result: { ...result, args: args || {} },
        meta: { durationMs: 1, PRODUCTION_READY: 'NO' }
      };
    }
  };
}

test('Mission H: empty toolCalls → no dispatcher needed → COMPLETED', async () => {
  const plan = basePlan({ toolCalls: [] });
  assert.deepEqual(plan.toolCalls, []);
  assert.deepEqual(normalizeToolCalls(plan), []);

  let applyCalls = 0;
  const result = await executeComputeRun({
    plan,
    enforceMcp: true,
    applyDiff: async () => {
      applyCalls += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true, exitCode: 0 }),
    custodyBaseDir: tempCustodyDir()
    // no toolDispatcher
  });

  assert.equal(applyCalls, 1);
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(Array.isArray(result.toolOutputs));
  assert.equal(result.toolOutputs.length, 0);
});

test('Mission H: toolCalls with mock dispatcher success → toolOutputs present', async () => {
  const plan = basePlan({
    toolCalls: [{ serverName: 'mock-echo', toolName: 'echo', arguments: { x: 1 } }]
  });
  // Ensure envelope authorizes mock-echo for gate (fake dispatcher skips real gate)
  plan.mcpEnvelope = {
    ...plan.mcpEnvelope,
    resolvedServers: [...(plan.mcpEnvelope.resolvedServers || []), 'mock-echo']
  };

  const result = await executeComputeRun({
    plan,
    toolDispatcher: fakeSuccessDispatcher({ hello: 'world' }),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.toolOutputs.length, 1);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[0].serverName, 'mock-echo');
  assert.equal(result.toolOutputs[0].toolName, 'echo');
  assert.deepEqual(result.toolOutputs[0].result.hello, 'world');
  assert.ok(result.custodyReceipt.payload.tool_execution_hashes);
});

test('Mission H: unresolved server → MCP_TOOL_DISPATCH_FAILED', async () => {
  const plan = basePlan({
    toolCalls: [{ serverName: 'not-in-envelope', toolName: 'echo', arguments: {} }]
  });
  // Envelope does NOT include not-in-envelope
  const throwing = {
    async dispatch() {
      throw new McpDispatcherError(
        "MCP_SERVER_NOT_RESOLVED: server 'not-in-envelope' is not in envelope.resolvedServers",
        'MCP_SERVER_NOT_RESOLVED'
      );
    }
  };

  let applyCalls = 0;
  const result = await executeComputeRun({
    plan,
    toolDispatcher: throwing,
    applyDiff: async () => {
      applyCalls += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => ({ rolledBack: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(applyCalls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'MCP_TOOL_DISPATCH_FAILED');
  assert.equal(result.errorCode, 'MCP_SERVER_NOT_RESOLVED');
  assert.equal(result.toolOutputs.length, 1);
  assert.equal(result.toolOutputs[0].ok, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
});

test('Mission H: dispatcher missing but toolCalls set → MCP_TOOL_DISPATCHER_REQUIRED', async () => {
  const plan = basePlan({
    toolCalls: [{ serverName: 'mock-echo', toolName: 'echo' }]
  });

  let applyCalls = 0;
  const result = await executeComputeRun({
    plan,
    // toolDispatcher omitted
    applyDiff: async () => {
      applyCalls += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(applyCalls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'MCP_TOOL_DISPATCHER_REQUIRED');
  assert.equal(result.errorCode, 'MCP_TOOL_DISPATCHER_REQUIRED');
  assert.equal(result.PRODUCTION_READY, 'NO');
});

test('Mission H: tool failure triggers rollbackDiff', async () => {
  const plan = basePlan({
    toolCalls: [{ serverName: 'mock-echo', toolName: 'boom' }]
  });
  let rollbackCalls = 0;
  const result = await executeComputeRun({
    plan,
    toolDispatcher: {
      async dispatch() {
        throw new McpDispatcherError('tool exploded', 'MCP_PROTOCOL_ERROR');
      }
    },
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => {
      rollbackCalls += 1;
      return { rolledBack: true };
    },
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'MCP_TOOL_DISPATCH_FAILED');
  assert.equal(rollbackCalls, 1);
});

test('Mission H: sealComputeRunCustody includes tool_execution_hashes', () => {
  const plan = basePlan();
  const custody = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: tempCustodyDir()
  });
  const toolOutputs = [
    { serverName: 'mock-echo', toolName: 'echo', ok: true, result: { a: 1 } }
  ];
  const sealed = sealComputeRunCustody(plan, { ok: true }, { custody, toolOutputs });
  assert.ok(sealed.payload.tool_execution_hashes);
  assert.equal(sealed.payload.tool_execution_hashes.length, 1);
  assert.match(sealed.payload.tool_execution_hashes[0], /^[a-f0-9]{64}$/);
  assert.ok(sealed.payload.receipt_hash);

  const { hashes } = hashToolOutputs(toolOutputs);
  assert.deepEqual(sealed.payload.tool_execution_hashes, hashes);
});

test('Mission H: receipt_hash changes when toolOutputs differ', () => {
  const plan = basePlan();
  const custodyA = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: tempCustodyDir()
  });
  const custodyB = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: tempCustodyDir()
  });

  // Freeze receipt_id timing by monkey-patching Date.now briefly is brittle;
  // instead compare hashes of the tool_execution_hashes-bearing payloads via hashToolOutputs.
  const outA = [{ serverName: 's', toolName: 't', ok: true, result: { v: 1 } }];
  const outB = [{ serverName: 's', toolName: 't', ok: true, result: { v: 2 } }];
  const ha = hashToolOutputs(outA).hashes[0];
  const hb = hashToolOutputs(outB).hashes[0];
  assert.notEqual(ha, hb);

  const sealedA = sealComputeRunCustody(plan, { ok: true }, { custody: custodyA, toolOutputs: outA });
  const sealedB = sealComputeRunCustody(plan, { ok: true }, { custody: custodyB, toolOutputs: outB });
  assert.notEqual(sealedA.payload.receipt_hash, sealedB.payload.receipt_hash);
  assert.notDeepEqual(
    sealedA.payload.tool_execution_hashes,
    sealedB.payload.tool_execution_hashes
  );
});

test('Mission H CLI: parseCliArgs parses --dispatch-tool=server:echo:{"x":1}', () => {
  const parsed = parseCliArgs([
    `--change=${CHANGE_ID}`,
    '--dispatch-tool=server:echo:{"x":1}'
  ]);
  assert.equal(parsed.dispatchTools.length, 1);
  assert.equal(parsed.dispatchTools[0].serverName, 'server');
  assert.equal(parsed.dispatchTools[0].toolName, 'echo');
  assert.deepEqual(parsed.dispatchTools[0].arguments, { x: 1 });
});

test('Mission H CLI: parse multiple --dispatch-tool', () => {
  const parsed = parseCliArgs([
    '--dispatch-tool=alpha:ping:{}',
    '--dispatch-tool=beta:echo:{"y":2}',
    '--dispatch-tool=gamma:list'
  ]);
  assert.equal(parsed.dispatchTools.length, 3);
  assert.equal(parsed.dispatchTools[0].serverName, 'alpha');
  assert.equal(parsed.dispatchTools[0].toolName, 'ping');
  assert.deepEqual(parsed.dispatchTools[0].arguments, {});
  assert.equal(parsed.dispatchTools[1].serverName, 'beta');
  assert.deepEqual(parsed.dispatchTools[1].arguments, { y: 2 });
  assert.equal(parsed.dispatchTools[2].serverName, 'gamma');
  assert.equal(parsed.dispatchTools[2].toolName, 'list');
  assert.deepEqual(parsed.dispatchTools[2].arguments, {});
});

test('Mission H: live dispatch via McpToolDispatcher + mock-mcp-server echo', async () => {
  assert.ok(fs.existsSync(MOCK_SERVER_PATH), 'mock-mcp-server fixture must exist');

  const plan = basePlan({
    toolCalls: [{ serverName: 'mock-echo', toolName: 'echo', arguments: { hello: 'mission-h' } }]
  });
  plan.mcpEnvelope = {
    ...plan.mcpEnvelope,
    status: 'RESOLVED',
    resolvedServers: [...new Set([...(plan.mcpEnvelope.resolvedServers || []), 'mock-echo'])]
  };

  const dispatcher = new McpToolDispatcher({
    availableConfig: MOCK_AVAILABLE,
    timeoutMs: 5000
  });

  try {
    const result = await executeComputeRun({
      plan,
      toolDispatcher: dispatcher,
      enforceMcp: true,
      applyDiff: async () => ({ applied: true }),
      runVerifier: async () => ({ ok: true, exitCode: 0 }),
      custodyBaseDir: tempCustodyDir()
    });

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.ok, true);
    assert.equal(result.toolOutputs.length, 1);
    assert.equal(result.toolOutputs[0].ok, true);
    assert.equal(result.toolOutputs[0].toolName, 'echo');
    // echo returns content[{type:text,text:JSON.stringify(args)}]
    const content = result.toolOutputs[0].result && result.toolOutputs[0].result.content;
    assert.ok(Array.isArray(content));
    assert.match(content[0].text, /mission-h/);
    assert.ok(result.custodyReceipt.payload.tool_execution_hashes.length >= 1);
  } finally {
    await dispatcher.dispose();
  }
});

test('Mission H: Happy COMPLETED with Mission-E-like RESOLVED envelope without tools', async () => {
  const plan = basePlan();
  assert.equal(plan.mcpEnvelope.status, 'RESOLVED');
  assert.ok(!plan.toolCalls || plan.toolCalls.length === 0);

  const custody = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: tempCustodyDir()
  });
  const result = await executeComputeRun({
    plan,
    enforceMcp: true,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true, exitCode: 0 }),
    custody
  });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.custodyReceipt.payload.mcp_envelope);
  assert.equal(result.toolOutputs.length, 0);
});

test('Mission H: dispatchToolCall alias + normalizeToolCalls prefer override', async () => {
  const plan = basePlan({
    toolCalls: [{ serverName: 'from-plan', toolName: 'a' }]
  });
  const override = [{ serverName: 'from-arg', toolName: 'b', arguments: { z: 9 } }];
  const normalized = normalizeToolCalls(plan, override);
  assert.equal(normalized[0].serverName, 'from-arg');
  assert.deepEqual(normalized[0].arguments, { z: 9 });

  const out = await dispatchToolCall(
    fakeSuccessDispatcher({ ok: 1 }),
    { serverName: 's', toolName: 't', arguments: { q: 1 } },
    plan.mcpEnvelope
  );
  assert.equal(out.result.ok, 1);
});
