/**
 * Process-level MCP handshake for the real stdio entrypoint.
 * Importing EosMcpServer does not prove Cursor can speak to the process.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJsonLines(stream, count, child, stderrRef) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const lines = [];
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(
        `timeout waiting for ${count} JSON lines, got ${lines.length}; stdout=${buf.slice(0, 500)} stderr=${stderrRef.value.slice(0, 500)}`
      ));
    }, 15000);
    function onData(chunk) {
      buf += chunk.toString();
      let nl = buf.indexOf('\n');
      while (nl !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) lines.push(line);
        if (lines.length >= count) {
          cleanup();
          resolve(lines);
          return;
        }
        nl = buf.indexOf('\n');
      }
    }
    function onExit(code) {
      cleanup();
      reject(new Error(`server exited ${code} before ${count} JSON lines; stdout=${buf} stderr=${stderrRef.value.slice(0, 800)}`));
    }
    function cleanup() {
      clearTimeout(timer);
      stream.off('data', onData);
      child.off('exit', onExit);
    }
    stream.on('data', onData);
    child.on('exit', onExit);
  });
}

test('MCP stdio process answers initialize and tools/list with JSON only on stdout', async () => {
  const child = spawn(process.execPath, [path.join(root, 'src', 'mcp-server.js')], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      EOS_MODE: 'read-only',
      EOS_AUTONOMY_LEVEL: 'LEVEL_0',
      EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
    }
  });
  const stderrRef = { value: '' };
  child.stderr.on('data', (chunk) => {
    stderrRef.value += chunk.toString();
  });

  const initLine = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'eos-mcp-probe', version: '0' }
    }
  });
  child.stdin.write(`${initLine}\n`);

  let initLines;
  try {
    initLines = await readJsonLines(child.stdout, 1, child, stderrRef);
    const init = JSON.parse(initLines[0]);
    assert.equal(init.jsonrpc, '2.0');
    assert.equal(init.id, 1);
    assert.equal(init.result.protocolVersion, '2024-11-05');
    assert.equal(init.result.serverInfo.name, 'eos-mission-os');
    assert.equal(init.result.capabilities.tools !== undefined, true);

    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`);
    const listLines = await readJsonLines(child.stdout, 1, child, stderrRef);
    const listed = JSON.parse(listLines[0]);
    assert.equal(listed.id, 2);
    assert.equal(Array.isArray(listed.result.tools), true);
    assert.equal(listed.result.tools.some((tool) => tool.name === 'eos.kernel.boot'), true);
    assert.equal(initLines[0].trim().startsWith('{'), true);
    assert.equal(listLines[0].trim().startsWith('{'), true);
  } finally {
    child.kill('SIGTERM');
  }
});
