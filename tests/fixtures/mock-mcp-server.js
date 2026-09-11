#!/usr/bin/env node
/**
 * Tiny mock MCP stdio server for Mission G dispatcher tests.
 * Speaks Content-Length framed JSON-RPC 2.0.
 * Tools: echo — returns { content: [{ type: "text", text: JSON.stringify(args) }] }
 */

import { Buffer } from 'node:buffer';

let buffer = Buffer.alloc(0);

function writeMessage(msg) {
  const body = Buffer.from(JSON.stringify(msg), 'utf8');
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
  process.stdout.write(Buffer.concat([header, body]));
}

function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  // Notifications (no id) — ignore
  if (msg.id === undefined || msg.id === null) {
    return;
  }

  const { id, method, params } = msg;

  if (method === 'initialize') {
    writeMessage({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'mock-mcp-server', version: '0.0.1' }
      }
    });
    return;
  }

  if (method === 'tools/list') {
    writeMessage({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'echo',
            description: 'Echo tool arguments as JSON text content',
            inputSchema: {
              type: 'object',
              additionalProperties: true
            }
          }
        ]
      }
    });
    return;
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments ?? {};
    if (name !== 'echo') {
      writeMessage({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown tool: ${name}` }
      });
      return;
    }
    writeMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(args) }]
      }
    });
    return;
  }

  writeMessage({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` }
  });
}

function drain() {
  while (true) {
    let headerEnd = -1;
    for (let i = 0; i + 3 < buffer.length; i++) {
      if (
        buffer[i] === 0x0d &&
        buffer[i + 1] === 0x0a &&
        buffer[i + 2] === 0x0d &&
        buffer[i + 3] === 0x0a
      ) {
        headerEnd = i;
        break;
      }
    }
    if (headerEnd === -1) return;

    const headerText = buffer.subarray(0, headerEnd).toString('utf8');
    const match = /Content-Length:\s*(\d+)/i.exec(headerText);
    if (!match) {
      // Drop garbage until next potential header
      buffer = buffer.subarray(headerEnd + 4);
      continue;
    }
    const contentLength = Number(match[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + contentLength;
    if (buffer.length < bodyEnd) return;

    const body = buffer.subarray(bodyStart, bodyEnd).toString('utf8');
    buffer = buffer.subarray(bodyEnd);

    try {
      handleMessage(JSON.parse(body));
    } catch (err) {
      // Ignore malformed; stderr only
      process.stderr.write(`mock-mcp-server parse error: ${err.message}\n`);
    }
  }
}

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  drain();
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Keep alive until stdin closes
process.stdin.resume();
