import http from 'node:http';
import { authorizeApiKey } from './api-key-gate.js';
import { handleGatewayRpc } from './readonly-gateway.js';

const MAX_BODY_BYTES = 1024 * 1024;

function bearerToken(header) {
  if (!header || typeof header !== 'string') return '';
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header.trim());
  return match ? match[1] : '';
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const allowOrigin = typeof origin === 'string' && origin.length > 0 ? origin : '*';
  return {
    'access-control-allow-origin': allowOrigin,
    vary: 'origin',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '600'
  };
}

function sendJson(req, res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
    ...corsHeaders(req)
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error('BODY_TOO_LARGE');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createHttpGateway({ invokeTool, storePath, env = {} }) {
  return http.createServer(async (req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (req.method === 'OPTIONS' && pathname === '/mcp') {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }
    if (req.method !== 'POST' || pathname !== '/mcp') {
      sendJson(req, res, 404, { error: 'NOT_FOUND' });
      return;
    }

    let raw = '';
    try {
      raw = await readBody(req);
    } catch {
      sendJson(req, res, 400, { error: 'BAD_REQUEST' });
      return;
    }

    const auth = authorizeApiKey({
      presented: bearerToken(req.headers.authorization),
      storePath
    });
    if (!auth.ok) {
      sendJson(req, res, 401, { error: 'UNAUTHORIZED' });
      return;
    }

    let request;
    try {
      request = JSON.parse(raw);
    } catch {
      sendJson(req, res, 400, { error: 'BAD_REQUEST' });
      return;
    }

    try {
      const response = await handleGatewayRpc({
        request,
        env,
        storePath,
        invokeTool,
        authenticated: true
      });
      if (!response) {
        sendJson(req, res, 202, { ok: true });
        return;
      }
      sendJson(req, res, 200, response);
    } catch {
      sendJson(req, res, 500, { error: 'INTERNAL_ERROR' });
    }
  });
}

export function startHttpGateway({ invokeTool, storePath, env = process.env, port, host }) {
  const listenHost = host || env.EOS_MCP_HTTP_HOST || '127.0.0.1';
  const listenPort = Number.isInteger(port)
    ? port
    : Number(env.EOS_MCP_HTTP_PORT || 8787);
  const server = createHttpGateway({ invokeTool, storePath, env });
  server.listen(listenPort, listenHost, () => {
    const addr = server.address();
    const boundHost = addr && typeof addr === 'object' ? addr.address : listenHost;
    const boundPort = addr && typeof addr === 'object' ? addr.port : listenPort;
    process.stderr.write(`eos-local HTTP gateway on http://${boundHost}:${boundPort}/mcp\n`);
  });
  return server;
}
