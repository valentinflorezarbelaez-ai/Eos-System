/**
 * Mission G / SPEC-0011 — MCP Tool Dispatcher tests (node:test).
 * Zero external deps; uses PassThrough streams + mock-mcp-server fixture.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import {
  PRODUCTION_READY,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_OUTPUT_BYTES,
  McpDispatcherError,
  assertServerInEnvelope,
  encodeFramedMessage,
  McpStdioClient,
  McpToolDispatcher
} from '../src/core/mcp/mcp-tool-dispatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE = path.join(__dirname, 'fixtures', 'mock-mcp-server.js');

function envelopeWith(...servers) {
  return {
    schema: 'eos.mcp_capability_envelope.v1',
    resolvedServers: Object.freeze([...servers]),
    status: 'RESOLVED',
    PRODUCTION_READY: 'NO'
  };
}

function mockServerConfig(extra = {}) {
  return {
    servers: {
      'mock-echo': {
        command: process.execPath,
        args: [FIXTURE],
        ...extra
      }
    }
  };
}

/** Pair of linked PassThroughs: client writes to serverIn, reads from serverOut. */
function linkedStreams() {
  const serverIn = new PassThrough();
  const serverOut = new PassThrough();
  return {
    // Client view
    reader: serverOut,
    writer: serverIn,
    // Server-side helpers
    serverIn,
    serverOut,
    respond(msg) {
      serverOut.write(encodeFramedMessage(msg));
    }
  };
}

describe('assertServerInEnvelope', () => {
  it('1. accepts a server listed in envelope.resolvedServers', () => {
    assert.doesNotThrow(() =>
      assertServerInEnvelope('eos-local', envelopeWith('eos-local', 'engram'))
    );
  });

  it('2. rejects missing/unresolved server with MCP_SERVER_NOT_RESOLVED', () => {
    assert.throws(
      () => assertServerInEnvelope('unknown', envelopeWith('eos-local')),
      (err) => err instanceof McpDispatcherError && err.code === 'MCP_SERVER_NOT_RESOLVED'
    );
    assert.throws(
      () => assertServerInEnvelope('eos-local', null),
      (err) => err instanceof McpDispatcherError && err.code === 'MCP_SERVER_NOT_RESOLVED'
    );
    assert.throws(
      () => assertServerInEnvelope('eos-local', { resolvedServers: [] }),
      (err) => err instanceof McpDispatcherError && err.code === 'MCP_SERVER_NOT_RESOLVED'
    );
  });
});

describe('McpStdioClient over PassThrough', () => {
  it('3. initialize + listTools over mock streams', async () => {
    const streams = linkedStreams();
    const client = new McpStdioClient({
      reader: streams.reader,
      writer: streams.writer,
      timeoutMs: 2000
    });

    // Drive a tiny inline fake server on serverIn
    let buf = Buffer.alloc(0);
    streams.serverIn.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      // Parse one or more frames naively
      while (true) {
        const text = buf.toString('utf8');
        const sep = text.indexOf('\r\n\r\n');
        if (sep === -1) break;
        const header = text.slice(0, sep);
        const m = /Content-Length:\s*(\d+)/i.exec(header);
        if (!m) break;
        const len = Number(m[1]);
        const bodyStart = sep + 4;
        if (buf.length < bodyStart + len) break;
        const body = buf.subarray(bodyStart, bodyStart + len).toString('utf8');
        buf = buf.subarray(bodyStart + len);
        const msg = JSON.parse(body);
        if (msg.method === 'initialize') {
          streams.respond({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              serverInfo: { name: 'inline', version: '0' }
            }
          });
        } else if (msg.method === 'tools/list') {
          streams.respond({
            jsonrpc: '2.0',
            id: msg.id,
            result: { tools: [{ name: 'ping' }] }
          });
        }
        // notifications/initialized has no id — ignore
      }
    });

    const init = await client.initialize();
    assert.equal(init.protocolVersion, '2024-11-05');
    const tools = await client.listTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, 'ping');
    await client.close();
  });
});

describe('McpToolDispatcher spawn / fixture', () => {
  it('4. tools/call echo roundtrip via spawn of fixture', async () => {
    const dispatcher = new McpToolDispatcher({
      availableConfig: mockServerConfig(),
      timeoutMs: 5000
    });
    const env = envelopeWith('mock-echo');
    const out = await dispatcher.dispatch({
      serverName: 'mock-echo',
      toolName: 'echo',
      arguments: { hello: 'world', n: 42 },
      envelope: env
    });
    assert.equal(out.serverName, 'mock-echo');
    assert.equal(out.toolName, 'echo');
    assert.ok(out.result?.content?.[0]?.text);
    const echoed = JSON.parse(out.result.content[0].text);
    assert.deepEqual(echoed, { hello: 'world', n: 42 });
    assert.equal(out.meta.PRODUCTION_READY, 'NO');
    await dispatcher.dispose();
  });

  it('5. timeout fires (mock that never responds) → MCP_TIMEOUT', async () => {
    const streams = linkedStreams();
    // Never respond to requests
    streams.serverIn.on('data', () => {});

    const client = new McpStdioClient({
      reader: streams.reader,
      writer: streams.writer,
      timeoutMs: 80
    });

    await assert.rejects(
      () => client.initialize(),
      (err) => err instanceof McpDispatcherError && err.code === 'MCP_TIMEOUT'
    );
    await client.close();
  });

  it('6. dispatch rejects unresolved server before spawn', async () => {
    let spawned = false;
    const dispatcher = new McpToolDispatcher({
      availableConfig: mockServerConfig(),
      spawnFn: (...args) => {
        spawned = true;
        return spawn(...args);
      }
    });

    await assert.rejects(
      () =>
        dispatcher.dispatch({
          serverName: 'mock-echo',
          toolName: 'echo',
          arguments: {},
          envelope: envelopeWith('other-server')
        }),
      (err) => err instanceof McpDispatcherError && err.code === 'MCP_SERVER_NOT_RESOLVED'
    );
    assert.equal(spawned, false);
    await dispatcher.dispose();
  });

  it('7. dispatch rejects missing server config', async () => {
    const dispatcher = new McpToolDispatcher({
      availableConfig: { servers: {} },
      timeoutMs: 1000
    });
    await assert.rejects(
      () =>
        dispatcher.dispatch({
          serverName: 'ghost',
          toolName: 'echo',
          arguments: {},
          envelope: envelopeWith('ghost')
        }),
      (err) =>
        err instanceof McpDispatcherError && err.code === 'MCP_SERVER_CONFIG_MISSING'
    );
    await dispatcher.dispose();
  });

  it('8. process crash/exit → fail-closed MCP_PROCESS_EXIT', async () => {
    const crashScript = `
      process.stdin.resume();
      setTimeout(() => process.exit(1), 30);
    `;
    const dispatcher = new McpToolDispatcher({
      availableConfig: {
        servers: {
          crashy: {
            command: process.execPath,
            args: ['-e', crashScript]
          }
        }
      },
      timeoutMs: 3000
    });

    await assert.rejects(
      () =>
        dispatcher.dispatch({
          serverName: 'crashy',
          toolName: 'echo',
          arguments: {},
          envelope: envelopeWith('crashy')
        }),
      (err) =>
        err instanceof McpDispatcherError &&
        (err.code === 'MCP_PROCESS_EXIT' || err.code === 'MCP_TIMEOUT')
    );
    await dispatcher.dispose();
  });

  it('9. bounded output: oversized frame → MCP_OUTPUT_OVERFLOW', async () => {
    const streams = linkedStreams();
    const client = new McpStdioClient({
      reader: streams.reader,
      writer: streams.writer,
      timeoutMs: 2000,
      maxOutputBytes: 64
    });

    const pending = client.initialize();

    // Write a huge framed payload that exceeds maxOutputBytes
    const huge = 'x'.repeat(200);
    const body = Buffer.from(
      JSON.stringify({ jsonrpc: '2.0', id: 1, result: { huge } }),
      'utf8'
    );
    const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
    streams.serverOut.write(Buffer.concat([header, body]));

    await assert.rejects(
      () => pending,
      (err) => err instanceof McpDispatcherError && err.code === 'MCP_OUTPUT_OVERFLOW'
    );
    await client.close();
  });

  it('10. PRODUCTION_READY banner / module exports sanity + listTools via dispatcher', async () => {
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DEFAULT_TIMEOUT_MS, 10000);
    assert.equal(DEFAULT_MAX_OUTPUT_BYTES, 1024 * 1024);
    assert.equal(typeof McpToolDispatcher, 'function');
    assert.equal(typeof McpStdioClient, 'function');
    assert.equal(typeof encodeFramedMessage, 'function');

    const dispatcher = new McpToolDispatcher({
      availableConfig: mockServerConfig(),
      timeoutMs: 5000
    });
    const listed = await dispatcher.listTools({
      serverName: 'mock-echo',
      envelope: envelopeWith('mock-echo')
    });
    assert.equal(listed.serverName, 'mock-echo');
    assert.ok(Array.isArray(listed.tools));
    assert.ok(listed.tools.some((t) => t.name === 'echo'));
    assert.equal(listed.meta.PRODUCTION_READY, 'NO');
    await dispatcher.dispose();
  });

  it('11. RPC error from server surfaces as MCP_PROTOCOL_ERROR', async () => {
    const streams = linkedStreams();
    const client = new McpStdioClient({
      reader: streams.reader,
      writer: streams.writer,
      timeoutMs: 2000
    });

    let buf = Buffer.alloc(0);
    streams.serverIn.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      const text = buf.toString('utf8');
      const sep = text.indexOf('\r\n\r\n');
      if (sep === -1) return;
      const header = text.slice(0, sep);
      const m = /Content-Length:\s*(\d+)/i.exec(header);
      if (!m) return;
      const len = Number(m[1]);
      const bodyStart = sep + 4;
      if (buf.length < bodyStart + len) return;
      const msg = JSON.parse(buf.subarray(bodyStart, bodyStart + len).toString('utf8'));
      buf = buf.subarray(bodyStart + len);
      streams.respond({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32000, message: 'boom' }
      });
    });

    await assert.rejects(
      () => client.initialize(),
      (err) => err instanceof McpDispatcherError && err.code === 'MCP_PROTOCOL_ERROR'
    );
    await client.close();
  });
});
