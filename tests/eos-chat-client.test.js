import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planChatTurn, renderGatewayBody } from '../site/chat-client.js';
import { createHttpGateway } from '../src/mcp/http-gateway.js';
import { issueApiKey } from '../src/mcp/api-key-gate.js';
import os from 'node:os';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DOCTOR_FIXTURE = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    content: [{
      type: 'text',
      text: JSON.stringify({
        doctor: { ok: true },
        VERDICT: 'PASS',
        HOMEDIR_LEAK: 'NO'
      })
    }]
  }
};

test('missing key is refused and builds no request', () => {
  const plan = planChatTurn({ apiKey: '   ', text: 'doctor' });
  assert.equal(plan.ok, false);
  assert.equal(plan.code, 'MISSING_KEY');
  assert.equal(plan.request, undefined);
  assert.equal(plan.message.length > 0, true);
});

test('unknown tool is refused and builds no request', () => {
  const plan = planChatTurn({
    apiKey: 'eos_sample_not_a_committed_secret',
    text: 'ejecuta eos.mission.create'
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.code, 'UNKNOWN_TOOL');
  assert.equal(plan.request, undefined);
  assert.equal(JSON.stringify(plan).includes('eos_sample_not_a_committed_secret'), false);
});

test('a doctor fixture renders the verdict', () => {
  const view = renderGatewayBody(DOCTOR_FIXTURE);
  assert.equal(view.kind, 'doctor');
  assert.match(view.text, /VERDICT:\s*PASS/);
  assert.match(view.text, /HOMEDIR_LEAK:\s*NO/);
});

test('a doctor phrase plans eos.doctor without putting the key in the body', () => {
  const key = 'eos_sample_not_a_committed_secret';
  const plan = planChatTurn({ apiKey: key, text: 'doctor' });
  assert.equal(plan.ok, true);
  assert.equal(plan.tool, 'eos.doctor');
  assert.equal(plan.request.method, 'tools/call');
  assert.equal(plan.request.params.name, 'eos.doctor');
  assert.deepEqual(plan.request.params.arguments, {});
  assert.equal(JSON.stringify(plan.request).includes(key), false);
});

test('the page explains both transports and does not store the key', () => {
  const html = fs.readFileSync(path.join(rootDir, 'site/index.html'), 'utf8');
  const chat = fs.readFileSync(path.join(rootDir, 'site/chat.js'), 'utf8');
  const vercel = fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8');
  assert.match(html, /EOS_API_KEY/);
  assert.match(html, /stdio/i);
  assert.match(html, /Authorization/);
  assert.match(html, /eos\.doctor/);
  assert.match(html, /eos\.mission\.status/);
  assert.match(html, /eos\.authority\.check/);
  assert.match(html, /127\.0\.0\.1:8787/);
  assert.doesNotMatch(html, /paridad|igual a Claude Code|al nivel de/i);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.doesNotMatch(chat, /localStorage|sessionStorage/);
  assert.match(vercel, /\/chat\.js/);
  assert.match(vercel, /\/chat-client\.js/);
  assert.match(vercel, /eos-site/);
});

test('browser preflight is allowed and a missing bearer is still 401', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-chat-key-'));
  const storePath = path.join(dir, 'mcp-api-key.json');
  issueApiKey({ storePath });
  const calls = [];
  const gateway = createHttpGateway({
    storePath,
    env: {},
    invokeTool: async (name) => {
      calls.push(name);
      return { VERDICT: 'PASS' };
    }
  });
  const port = await new Promise((resolve) => {
    gateway.listen(0, '127.0.0.1', () => resolve(gateway.address().port));
  });
  try {
    const preflight = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'OPTIONS',
        headers: {
          origin: 'http://127.0.0.1:4173',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization,content-type'
        }
      }, (res) => {
        res.resume();
        res.on('end', () => resolve(res));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.headers['access-control-allow-origin'], 'http://127.0.0.1:4173');
    assert.match(preflight.headers['access-control-allow-headers'], /authorization/i);

    const denied = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'eos.doctor', arguments: {} }
      });
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
          origin: 'http://127.0.0.1:4173'
        }
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
            allow: res.headers['access-control-allow-origin']
          });
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    assert.equal(denied.status, 401);
    assert.equal(JSON.parse(denied.body).error, 'UNAUTHORIZED');
    assert.equal(denied.allow, 'http://127.0.0.1:4173');
    assert.equal(calls.length, 0);
  } finally {
    gateway.close();
  }
});
