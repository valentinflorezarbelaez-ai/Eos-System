import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EosMcpServer } from '../src/mcp-server.js';
import {
  issueApiKey,
  verifyApiKey,
  authorizeApiKey,
  resolveApiKeyStorePath
} from '../src/mcp/api-key-gate.js';
import { handleStdioLine, READONLY_GATEWAY_TOOLS } from '../src/mcp/readonly-gateway.js';
import { createHttpGateway } from '../src/mcp/http-gateway.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function tmpStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-key-'));
  return path.join(dir, 'mcp-api-key.json');
}

function toolRequest(id, name, args = {}) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args }
  };
}

test('hash file does not contain the raw key', () => {
  const storePath = tmpStore();
  const { secret } = issueApiKey({ storePath });
  const raw = fs.readFileSync(storePath, 'utf8');
  assert.equal(raw.includes(secret), false);
  const record = JSON.parse(raw);
  assert.equal(record.kdf, 'scrypt');
  assert.equal(typeof record.hash, 'string');
  assert.equal(record.hash.length > 0, true);
  assert.notEqual(record.hash, secret);
  assert.equal(record.secret, undefined);
  assert.equal(record.key, undefined);
  assert.equal(verifyApiKey(secret, record), true);
  assert.equal(verifyApiKey(`${secret}-wrong`, record), false);

  const gateSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'mcp', 'api-key-gate.js'), 'utf8');
  assert.match(gateSrc, /timingSafeEqual/);
  assert.doesNotMatch(gateSrc, /presented\s*===/);
});

test('key file path is gitignored', () => {
  const probe = path.join(REPO_ROOT, '.eos', 'mcp-api-key.json');
  let status = 0;
  let stderr = '';
  try {
    execFileSync('git', ['check-ignore', '-q', '--', probe], {
      cwd: REPO_ROOT,
      stdio: 'pipe'
    });
  } catch (err) {
    status = err.status ?? 1;
    stderr = String(err.stderr || err.message);
  }
  assert.equal(status, 0, stderr);
});

test('stdio rejects a missing key before any tool runs', async () => {
  const storePath = tmpStore();
  issueApiKey({ storePath });
  const calls = [];
  const response = await handleStdioLine({
    line: JSON.stringify(toolRequest(1, 'eos.authority.check', {
      requiredLevel: 'LEVEL_0',
      grantedLevel: 'LEVEL_1'
    })),
    env: {},
    storePath,
    invokeTool: async (name) => {
      calls.push(name);
      return { status: 'SUCCESS', executed: true };
    }
  });
  assert.equal(calls.length, 0);
  assert.equal(response.error.message, 'UNAUTHORIZED');
  assert.equal(response.result, undefined);
});

test('stdio rejects a wrong key before any tool runs', async () => {
  const storePath = tmpStore();
  issueApiKey({ storePath });
  const calls = [];
  const response = await handleStdioLine({
    line: JSON.stringify(toolRequest(2, 'eos.doctor')),
    env: { EOS_API_KEY: 'eos_this_is_not_the_issued_key' },
    storePath,
    invokeTool: async (name) => {
      calls.push(name);
      return { status: 'SUCCESS', executed: true };
    }
  });
  assert.equal(calls.length, 0);
  assert.equal(response.error.message, 'UNAUTHORIZED');
});

test('stdio accepts the right key and runs a read-only tool', async () => {
  const storePath = tmpStore();
  const { secret } = issueApiKey({ storePath });
  const calls = [];
  const response = await handleStdioLine({
    line: JSON.stringify(toolRequest(3, 'eos.authority.check', {
      requiredLevel: 'LEVEL_0',
      grantedLevel: 'LEVEL_1'
    })),
    env: { EOS_API_KEY: secret },
    storePath,
    invokeTool: async (name, args) => {
      calls.push({ name, args });
      return { status: 'SUCCESS', executed: true, tool: name };
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'eos.authority.check');
  const body = JSON.parse(response.result.content[0].text);
  assert.equal(body.status, 'SUCCESS');
  assert.equal(body.executed, true);
});

test('stdio refuses a write tool even with the right key', async () => {
  const storePath = tmpStore();
  const { secret } = issueApiKey({ storePath });
  const calls = [];
  const response = await handleStdioLine({
    line: JSON.stringify(toolRequest(4, 'eos.mission.start', { goal: 'nope' })),
    env: { EOS_API_KEY: secret },
    storePath,
    invokeTool: async (name) => {
      calls.push(name);
      return { status: 'SUCCESS', executed: true };
    }
  });
  assert.equal(calls.length, 0);
  assert.equal(response.error.message, 'TOOL_NOT_IN_READONLY_GATEWAY');
});

test('gateway advertises only the three read-only tools', async () => {
  const response = await handleStdioLine({
    line: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/list' }),
    env: {},
    storePath: tmpStore(),
    invokeTool: async () => {
      throw new Error('tools/list must not execute a tool');
    }
  });
  const names = response.result.tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, ['eos.authority.check', 'eos.doctor', 'eos.mission.status']);
  assert.deepEqual(
    READONLY_GATEWAY_TOOLS.map((tool) => tool.name).sort(),
    names
  );
});

test('HTTP missing or wrong bearer is 401 and does not run a tool', async () => {
  const storePath = tmpStore();
  const { secret } = issueApiKey({ storePath });
  const calls = [];
  const gateway = createHttpGateway({
    storePath,
    env: {},
    invokeTool: async (name) => {
      calls.push(name);
      return { status: 'SUCCESS', executed: true };
    }
  });
  const port = await listen(gateway);
  try {
    const missing = await postJson(port, toolRequest(6, 'eos.doctor'), {});
    assert.equal(missing.status, 401);
    assert.equal(JSON.parse(missing.body).error, 'UNAUTHORIZED');
    assert.equal(missing.body.includes('eos.doctor'), false);

    const wrong = await postJson(port, toolRequest(7, 'eos.doctor'), {
      authorization: 'Bearer eos_wrong_key_value'
    });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.includes('eos_wrong_key_value'), false);
    assert.equal(calls.length, 0);
    assert.equal(secret.length > 0, true);
  } finally {
    gateway.close();
  }
});

test('HTTP accepts the matching bearer and returns the tool result', async () => {
  const storePath = tmpStore();
  const { secret } = issueApiKey({ storePath });
  const calls = [];
  const gateway = createHttpGateway({
    storePath,
    env: {},
    invokeTool: async (name) => {
      calls.push(name);
      return { status: 'SUCCESS', executed: true, tool: name };
    }
  });
  const port = await listen(gateway);
  try {
    const ok = await postJson(port, toolRequest(8, 'eos.doctor'), {
      authorization: `Bearer ${secret}`
    });
    assert.equal(ok.status, 200);
    const parsed = JSON.parse(ok.body);
    const body = JSON.parse(parsed.result.content[0].text);
    assert.equal(body.tool, 'eos.doctor');
    assert.equal(calls.length, 1);
  } finally {
    gateway.close();
  }
});

test('right key runs the real eos.authority.check handler', async () => {
  const storePath = tmpStore();
  const { secret } = issueApiKey({ storePath });
  const server = new EosMcpServer();
  const response = await handleStdioLine({
    line: JSON.stringify(toolRequest(9, 'eos_authority_check', {
      requiredLevel: 'LEVEL_1',
      grantedLevel: 'LEVEL_2'
    })),
    env: { EOS_API_KEY: secret, EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0' },
    storePath,
    invokeTool: (name, args) => server.handleToolCall(name, args, {
      EOS_MODE: 'read-only',
      EOS_AUTONOMY_LEVEL: 'LEVEL_0',
      EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
    })
  });
  const body = JSON.parse(response.result.content[0].text);
  assert.equal(body.status, 'SUCCESS');
  assert.equal(body.executed, true);
  assert.equal(body.tool, 'eos.authority.check');
  assert.equal(body.auth.authorized, true);
});

test('issue command prints the secret once and not into the hash file', async () => {
  const storePath = tmpStore();
  const { stdout, stderr, status } = await runIssue(storePath);
  assert.equal(status, 0);
  const secret = stdout.trim();
  assert.equal(stdout.split(secret).length - 1, 1);
  assert.equal(stderr.includes(secret), false);
  const raw = fs.readFileSync(storePath, 'utf8');
  assert.equal(raw.includes(secret), false);
  assert.equal(authorizeApiKey({ presented: secret, storePath }).ok, true);
  assert.match(secret, /^eos_[A-Za-z0-9_-]+$/);
});

test('resolveApiKeyStorePath defaults under .eos and honors the override', () => {
  assert.equal(
    resolveApiKeyStorePath('/tmp/eos-root', {}),
    path.join('/tmp/eos-root', '.eos', 'mcp-api-key.json')
  );
  assert.equal(
    resolveApiKeyStorePath('/tmp/eos-root', { EOS_MCP_API_KEY_FILE: '/tmp/custom-key.json' }),
    path.resolve('/tmp/custom-key.json')
  );
});

function runIssue(storePath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      path.join(REPO_ROOT, 'scripts', 'eos-mcp-api-key.js'),
      'issue',
      '--store',
      storePath
    ], { cwd: REPO_ROOT });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ stdout, stderr, status }));
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function postJson(port, payload, headers) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/mcp',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...headers
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
