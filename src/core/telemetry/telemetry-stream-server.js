/**
 * @module telemetry-stream-server
 * SPEC-0033 / Mission AB — Live Streaming & Visual Telemetry Server.
 *
 * Factory createTelemetryStreamServer(options) conforming to ITelemetryStreamServer:
 *   kind: 'eos-telemetry-stream-server'
 *   PRODUCTION_READY: 'NO'
 *
 * Pure node:http SSE (+ optional JSON-RPC over POST). Loopback-only bind
 * (127.0.0.1 / ::1). Fail-closed on non-loopback host. Law VI secret
 * sanitization before broadcast (deep clone + redact).
 *
 * Event types: session.state, agent.step, fdir.cycle, custody.receipt,
 *              shell.status (optional).
 *
 * Methods: start(), stop(), publish(type, payload), health(), getState(),
 *          getClients().
 *
 * NON-CLAIM:
 *   not public internet ops
 *   not PRODUCTION_READY
 *   localhost-first only
 *   Fundacion Δ=0 — hermetic fixtures only
 *   SSE broadcast ≠ production telemetry platform
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';

/** @type {'NO'} */
export const TELEMETRY_PRODUCTION_READY = 'NO';

export const TELEMETRY_KIND = 'eos-telemetry-stream-server';

export const TELEMETRY_EVENT_TYPES = Object.freeze({
  SESSION_STATE: 'session.state',
  AGENT_STEP: 'agent.step',
  FDIR_CYCLE: 'fdir.cycle',
  CUSTODY_RECEIPT: 'custody.receipt',
  SHELL_STATUS: 'shell.status'
});

export const TELEMETRY_CODES = Object.freeze({
  OK: 'OK',
  STARTED: 'STARTED',
  STOPPED: 'STOPPED',
  PUBLISHED: 'PUBLISHED',
  NOT_RUNNING: 'NOT_RUNNING',
  ALREADY_RUNNING: 'ALREADY_RUNNING',
  NON_LOOPBACK_HOST: 'NON_LOOPBACK_HOST',
  INVALID_EVENT_TYPE: 'INVALID_EVENT_TYPE',
  BIND_DENIED: 'BIND_DENIED',
  CLIENT_OPEN: 'CLIENT_OPEN',
  CLIENT_CLOSED: 'CLIENT_CLOSED'
});

const SECRET_KEY_RE =
  /token|secret|password|api[_-]?key|authorization|credential/i;

/** Long base64-ish blobs (≥40 chars of base64 alphabet). */
const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

const REDACTED = '[REDACTED]';

/**
 * Typed error for telemetry stream server failures.
 */
export class TelemetryStreamServerError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = TELEMETRY_CODES.NOT_RUNNING, details = {}) {
    super(message);
    this.name = 'TelemetryStreamServerError';
    this.code = code;
    this.details = details;
  }
}

/**
 * True if host is loopback (127.0.0.1, ::1, or localhost).
 * Rejects 0.0.0.0, ::, empty, and any public/LAN bind target.
 * @param {string|undefined|null} host
 * @returns {boolean}
 */
export function isLoopbackHost(host) {
  if (host == null) return false;
  const h = String(host).trim().toLowerCase();
  if (!h) return false;
  if (LOOPBACK_HOSTS.has(h)) return true;
  // IPv4-mapped IPv6 loopback
  if (h === '::ffff:127.0.0.1') return true;
  return false;
}

/**
 * Deep-clone + Law VI secret sanitization.
 * Redacts keys matching SECRET_KEY_RE and long base64-ish string values.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeTelemetryPayload(obj) {
  return sanitizeDeep(obj, new WeakSet());
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {unknown}
 */
function sanitizeDeep(value, seen) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (LONG_B64_RE.test(value)) return REDACTED;
    return value;
  }
  if (typeof value !== 'object') return value;
  if (seen.has(/** @type {object} */ (value))) return '[Circular]';
  seen.add(/** @type {object} */ (value));

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v, seen));
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * @param {string} type
 * @returns {boolean}
 */
function isKnownEventType(type) {
  return Object.values(TELEMETRY_EVENT_TYPES).includes(type);
}

/**
 * Create a localhost-first SSE (+ optional JSON-RPC) telemetry stream server.
 *
 * @param {object} [options]
 * @param {string} [options.host='127.0.0.1']
 * @param {number} [options.port=0]  0 = ephemeral
 * @param {string} [options.path='/events']  SSE path (also accepts /v1/stream)
 * @param {string} [options.rpcPath='/rpc']
 * @param {boolean} [options.enableRpc=true]
 * @param {() => string} [options.idFactory]
 * @param {(err: Error) => void} [options.onError]
 * @returns {import('./telemetry-stream-server.js').TelemetryStreamServer}
 */
export function createTelemetryStreamServer(options = {}) {
  const hostOpt = options.host != null ? String(options.host) : '127.0.0.1';
  const portOpt =
    options.port != null && Number.isFinite(Number(options.port))
      ? Number(options.port)
      : 0;
  const ssePath = options.path || '/events';
  const rpcPath = options.rpcPath || '/rpc';
  const enableRpc = options.enableRpc !== false;
  const idFactory =
    typeof options.idFactory === 'function' ? options.idFactory : () => randomUUID();
  const onError =
    typeof options.onError === 'function' ? options.onError : () => {};

  /** Fail-closed at construction if non-loopback requested. */
  if (!isLoopbackHost(hostOpt)) {
    throw new TelemetryStreamServerError(
      `NON_LOOPBACK_HOST: refused to bind host=${hostOpt} (localhost-first only; not public internet ops)`,
      TELEMETRY_CODES.NON_LOOPBACK_HOST,
      { host: hostOpt }
    );
  }

  /** Normalize localhost → 127.0.0.1 for consistent bind. */
  const bindHost = hostOpt === 'localhost' || hostOpt === '::1' ? '127.0.0.1' : hostOpt;

  /** @type {import('node:http').Server | null} */
  let server = null;
  let running = false;
  /** @type {number|null} */
  let boundPort = null;
  /** @type {Map<string, { res: import('node:http').ServerResponse, id: string, openedAt: string }>} */
  const clients = new Map();
  /** @type {object[]} */
  const recentEvents = [];
  const MAX_RECENT = 64;
  let seq = 0;
  let startedAt = null;

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  function handleRequest(req, res) {
    const url = new URL(req.url || '/', `http://${bindHost}`);
    const pathname = url.pathname;

    if (
      req.method === 'GET' &&
      (pathname === ssePath ||
        pathname === '/events' ||
        pathname === '/v1/stream')
    ) {
      openSseClient(res);
      return;
    }

    if (enableRpc && req.method === 'POST' && pathname === rpcPath) {
      handleRpc(req, res);
      return;
    }

    if (req.method === 'GET' && (pathname === '/health' || pathname === '/')) {
      const body = JSON.stringify(health());
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
      });
      res.end(body);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND', PRODUCTION_READY: 'NO' }));
  }

  /**
   * @param {import('node:http').ServerResponse} res
   */
  function openSseClient(res) {
    const id = idFactory();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Eos-Kind': TELEMETRY_KIND,
      'X-Eos-Production-Ready': 'NO'
    });
    res.write(`: eos-telemetry-stream-server connected\n\n`);
    res.write(
      `event: hello\ndata: ${JSON.stringify({
        kind: TELEMETRY_KIND,
        PRODUCTION_READY: 'NO',
        clientId: id,
        notPublicInternetOps: true,
        localhostFirstOnly: true
      })}\n\n`
    );

    const entry = { res, id, openedAt: new Date().toISOString() };
    clients.set(id, entry);

    const keepAlive = setInterval(() => {
      try {
        if (!res.writableEnded) res.write(`: keepalive ${Date.now()}\n\n`);
      } catch {
        /* ignore */
      }
    }, 15000);

    const cleanup = () => {
      clearInterval(keepAlive);
      clients.delete(id);
    };
    res.on('close', cleanup);
    res.on('error', cleanup);
  }

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  function handleRpc(req, res) {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      } catch {
        writeJson(res, 400, {
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' },
          id: null
        });
        return;
      }
      const id = body.id ?? null;
      const method = body.method;
      /** @type {unknown} */
      let result;
      try {
        if (method === 'ping') {
          result = { pong: true, PRODUCTION_READY: 'NO', kind: TELEMETRY_KIND };
        } else if (method === 'health') {
          result = health();
        } else if (method === 'subscribe') {
          result = {
            ok: true,
            hint: 'open GET /events or /v1/stream for SSE',
            ssePath,
            PRODUCTION_READY: 'NO'
          };
        } else {
          writeJson(res, 200, {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id
          });
          return;
        }
        writeJson(res, 200, { jsonrpc: '2.0', result, id });
      } catch (err) {
        onError(/** @type {Error} */ (err));
        writeJson(res, 200, {
          jsonrpc: '2.0',
          error: { code: -32000, message: String(err && err.message) },
          id
        });
      }
    });
  }

  /**
   * @param {import('node:http').ServerResponse} res
   * @param {number} status
   * @param {object} obj
   */
  function writeJson(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body)
    });
    res.end(body);
  }

  /**
   * Broadcast a sanitized SSE event to all connected clients.
   * @param {string} type
   * @param {unknown} payload
   * @param {{ throwIfStopped?: boolean }} [opts]
   */
  function publish(type, payload, opts = {}) {
    const throwIfStopped = opts.throwIfStopped !== false;
    if (!running) {
      if (throwIfStopped) {
        throw new TelemetryStreamServerError(
          'NOT_RUNNING: publish refused (fail-closed; start() first)',
          TELEMETRY_CODES.NOT_RUNNING,
          { type }
        );
      }
      return {
        ok: false,
        code: TELEMETRY_CODES.NOT_RUNNING,
        PRODUCTION_READY: 'NO'
      };
    }
    if (type == null || typeof type !== 'string' || !type.trim()) {
      throw new TelemetryStreamServerError(
        'INVALID_EVENT_TYPE: type required',
        TELEMETRY_CODES.INVALID_EVENT_TYPE,
        { type }
      );
    }

    const eventType = String(type).trim();
    const sanitized = sanitizeTelemetryPayload(payload);
    seq += 1;
    const envelope = {
      seq,
      type: eventType,
      payload: sanitized,
      ts: new Date().toISOString(),
      kind: TELEMETRY_KIND,
      PRODUCTION_READY: 'NO'
    };
    recentEvents.push(envelope);
    if (recentEvents.length > MAX_RECENT) recentEvents.shift();

    const data = `event: ${eventType}\ndata: ${JSON.stringify(envelope)}\nid: ${seq}\n\n`;
    for (const { res } of clients.values()) {
      try {
        if (!res.writableEnded) res.write(data);
      } catch (err) {
        onError(/** @type {Error} */ (err));
      }
    }
    return {
      ok: true,
      code: TELEMETRY_CODES.PUBLISHED,
      seq,
      type: eventType,
      clients: clients.size,
      knownType: isKnownEventType(eventType),
      PRODUCTION_READY: 'NO'
    };
  }

  function health() {
    return {
      ok: true,
      kind: TELEMETRY_KIND,
      PRODUCTION_READY: TELEMETRY_PRODUCTION_READY,
      notProductionReady: true,
      running,
      host: bindHost,
      port: boundPort,
      clients: clients.size,
      seq,
      eventTypes: Object.values(TELEMETRY_EVENT_TYPES),
      ssePath,
      rpcPath: enableRpc ? rpcPath : null,
      publicBind: false,
      loopbackOnly: true,
      localhostFirstOnly: true,
      notPublicInternetOps: true,
      cloudAgent: false,
      fundacionDelta: 0,
      startedAt
    };
  }

  function getState() {
    return {
      kind: TELEMETRY_KIND,
      PRODUCTION_READY: TELEMETRY_PRODUCTION_READY,
      running,
      host: bindHost,
      port: boundPort,
      clients: clients.size,
      seq,
      recentCount: recentEvents.length,
      notPublicInternetOps: true,
      localhostFirstOnly: true
    };
  }

  function getClients() {
    return [...clients.values()].map((c) => ({
      id: c.id,
      openedAt: c.openedAt
    }));
  }

  /**
   * @returns {Promise<{ ok: true, host: string, port: number, PRODUCTION_READY: 'NO' }>}
   */
  function start() {
    if (running) {
      return Promise.resolve({
        ok: true,
        host: bindHost,
        port: /** @type {number} */ (boundPort),
        code: TELEMETRY_CODES.ALREADY_RUNNING,
        PRODUCTION_READY: 'NO'
      });
    }
    // Re-check fail-closed (defense in depth — never 0.0.0.0)
    if (!isLoopbackHost(bindHost)) {
      return Promise.reject(
        new TelemetryStreamServerError(
          `BIND_DENIED: host ${bindHost} is not loopback`,
          TELEMETRY_CODES.BIND_DENIED,
          { host: bindHost }
        )
      );
    }

    return new Promise((resolve, reject) => {
      server = http.createServer(handleRequest);
      server.on('error', (err) => {
        onError(err);
        reject(
          new TelemetryStreamServerError(
            `BIND_DENIED: ${err.message}`,
            TELEMETRY_CODES.BIND_DENIED,
            { host: bindHost, cause: String(err.message) }
          )
        );
      });
      server.listen(portOpt, bindHost, () => {
        const addr = server.address();
        boundPort =
          addr && typeof addr === 'object' ? addr.port : portOpt || null;
        running = true;
        startedAt = new Date().toISOString();
        resolve({
          ok: true,
          host: bindHost,
          port: /** @type {number} */ (boundPort),
          code: TELEMETRY_CODES.STARTED,
          PRODUCTION_READY: 'NO',
          notPublicInternetOps: true,
          localhostFirstOnly: true
        });
      });
    });
  }

  /**
   * @returns {Promise<{ ok: true, code: string, PRODUCTION_READY: 'NO' }>}
   */
  function stop() {
    return new Promise((resolve) => {
      for (const { res } of clients.values()) {
        try {
          res.end();
        } catch {
          /* ignore */
        }
      }
      clients.clear();
      const finish = () => {
        running = false;
        boundPort = null;
        startedAt = null;
        server = null;
        resolve({
          ok: true,
          code: TELEMETRY_CODES.STOPPED,
          PRODUCTION_READY: 'NO'
        });
      };
      if (server) {
        const s = server;
        s.close(() => finish());
        // Force-close lingering connections (Node ≥18)
        if (typeof s.closeAllConnections === 'function') {
          try {
            s.closeAllConnections();
          } catch {
            /* ignore */
          }
        }
      } else {
        finish();
      }
    });
  }

  return {
    kind: TELEMETRY_KIND,
    PRODUCTION_READY: TELEMETRY_PRODUCTION_READY,
    start,
    stop,
    publish,
    health,
    getState,
    getClients,
    /** @internal test/helper */
    getRecentEvents: () => recentEvents.slice(),
    getBindHost: () => bindHost
  };
}

export default createTelemetryStreamServer;
