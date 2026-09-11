/**
 * @file src/core/mcp/mcp-tool-dispatcher.js
 * @description SPEC-0011 MCP Tool Dispatcher — Tier-2 stdio JSON-RPC 2.0 client
 * with Content-Length framing over child_process.
 *
 * L0: Ponytail Tier 2 pure Node.js standard library (no external npm dependencies).
 * Invariants: PRODUCTION_READY=NO | Fundacion Delta=0 | AT_CEILING (no new JSON schemas).
 */

import { spawn as defaultSpawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

/** @typedef {import('node:stream').Readable} Readable */
/** @typedef {import('node:stream').Writable} Writable */

export const PRODUCTION_READY = 'NO';

export const DEFAULT_TIMEOUT_MS = 10000;
export const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;

export const PROTOCOL_VERSION = '2024-11-05';
export const CLIENT_INFO = Object.freeze({
  name: 'eos-mcp-tool-dispatcher',
  version: '0.6.0'
});

export class McpDispatcherError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'MCP_PROTOCOL_ERROR') {
    super(message);
    this.name = 'McpDispatcherError';
    this.code = code;
  }
}

/**
 * Fail-closed envelope gate: serverName must appear in envelope.resolvedServers.
 * Missing/empty envelope also rejects.
 * @param {string} serverName
 * @param {object} envelope
 */
export function assertServerInEnvelope(serverName, envelope) {
  if (!envelope || typeof envelope !== 'object') {
    throw new McpDispatcherError(
      `MCP_SERVER_NOT_RESOLVED: missing capability envelope for server '${serverName}'`,
      'MCP_SERVER_NOT_RESOLVED'
    );
  }
  const resolved = envelope.resolvedServers;
  if (!Array.isArray(resolved) || resolved.length === 0) {
    throw new McpDispatcherError(
      `MCP_SERVER_NOT_RESOLVED: empty resolvedServers; cannot authorize '${serverName}'`,
      'MCP_SERVER_NOT_RESOLVED'
    );
  }
  if (!resolved.includes(serverName)) {
    throw new McpDispatcherError(
      `MCP_SERVER_NOT_RESOLVED: server '${serverName}' is not in envelope.resolvedServers`,
      'MCP_SERVER_NOT_RESOLVED'
    );
  }
}

/**
 * Encode a JSON-RPC message with MCP Content-Length framing.
 * @param {object} message
 * @returns {Buffer}
 */
export function encodeFramedMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
  return Buffer.concat([header, body]);
}

/**
 * Incremental Content-Length frame parser over a byte stream.
 */
class FrameParser {
  /**
   * @param {{ maxOutputBytes: number, onFrame: (obj: object) => void, onError: (err: Error) => void }} opts
   */
  constructor({ maxOutputBytes, onFrame, onError }) {
    this.maxOutputBytes = maxOutputBytes;
    this.onFrame = onFrame;
    this.onError = onError;
    this.buffer = Buffer.alloc(0);
    this.accumulatedBytes = 0;
    this.closed = false;
  }

  /**
   * @param {Buffer|string} chunk
   */
  push(chunk) {
    if (this.closed) return;
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.accumulatedBytes += buf.length;
    if (this.accumulatedBytes > this.maxOutputBytes) {
      this.closed = true;
      this.onError(
        new McpDispatcherError(
          `MCP_OUTPUT_OVERFLOW: framed stdout exceeded ${this.maxOutputBytes} bytes`,
          'MCP_OUTPUT_OVERFLOW'
        )
      );
      return;
    }
    this.buffer = Buffer.concat([this.buffer, buf]);
    this._drain();
  }

  _drain() {
    while (!this.closed) {
      const headerEnd = indexOfHeaderEnd(this.buffer);
      if (headerEnd === -1) return;

      const headerText = this.buffer.subarray(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(headerText);
      if (!match) {
        this.closed = true;
        this.onError(
          new McpDispatcherError(
            'MCP_PROTOCOL_ERROR: missing Content-Length header',
            'MCP_PROTOCOL_ERROR'
          )
        );
        return;
      }

      const contentLength = Number(match[1]);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        this.closed = true;
        this.onError(
          new McpDispatcherError(
            'MCP_PROTOCOL_ERROR: invalid Content-Length',
            'MCP_PROTOCOL_ERROR'
          )
        );
        return;
      }

      const bodyStart = headerEnd + 4; // \r\n\r\n
      const bodyEnd = bodyStart + contentLength;
      if (this.buffer.length < bodyEnd) return;

      const bodyBuf = this.buffer.subarray(bodyStart, bodyEnd);
      this.buffer = this.buffer.subarray(bodyEnd);

      let parsed;
      try {
        parsed = JSON.parse(bodyBuf.toString('utf8'));
      } catch (err) {
        this.closed = true;
        this.onError(
          new McpDispatcherError(
            `MCP_PROTOCOL_ERROR: malformed JSON body (${err.message})`,
            'MCP_PROTOCOL_ERROR'
          )
        );
        return;
      }
      this.onFrame(parsed);
    }
  }
}

/**
 * @param {Buffer} buf
 * @returns {number}
 */
function indexOfHeaderEnd(buf) {
  // Look for \r\n\r\n
  for (let i = 0; i + 3 < buf.length; i++) {
    if (
      buf[i] === 0x0d &&
      buf[i + 1] === 0x0a &&
      buf[i + 2] === 0x0d &&
      buf[i + 3] === 0x0a
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * MCP stdio JSON-RPC client over arbitrary reader/writer streams.
 */
export class McpStdioClient extends EventEmitter {
  /**
   * @param {object} options
   * @param {Readable} options.reader
   * @param {Writable} options.writer
   * @param {number} [options.timeoutMs]
   * @param {number} [options.maxOutputBytes]
   */
  constructor({ reader, writer, timeoutMs, maxOutputBytes } = {}) {
    super();
    if (!reader || !writer) {
      throw new McpDispatcherError(
        'MCP_PROTOCOL_ERROR: reader and writer are required',
        'MCP_PROTOCOL_ERROR'
      );
    }
    this.reader = reader;
    this.writer = writer;
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this._nextId = 1;
    /** @type {Map<number, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>} */
    this._pending = new Map();
    this._closed = false;
    this._fatal = null;
    this._initialized = false;

    this._parser = new FrameParser({
      maxOutputBytes: this.maxOutputBytes,
      onFrame: (msg) => this._onMessage(msg),
      onError: (err) => this._failAll(err)
    });

    this._onData = (chunk) => this._parser.push(chunk);
    this._onReaderEnd = () => {
      if (this._pending.size > 0) {
        this._failAll(
          new McpDispatcherError(
            'MCP_PROCESS_EXIT: stdout closed before JSON-RPC response',
            'MCP_PROCESS_EXIT'
          )
        );
      }
    };
    this._onReaderError = (err) => {
      this._failAll(
        new McpDispatcherError(
          `MCP_PROTOCOL_ERROR: reader error (${err.message})`,
          'MCP_PROTOCOL_ERROR'
        )
      );
    };

    this.reader.on('data', this._onData);
    this.reader.on('end', this._onReaderEnd);
    this.reader.on('error', this._onReaderError);
  }

  /**
   * Notify client that the backing process exited unexpectedly.
   * @param {number|null} [code]
   * @param {string|null} [signal]
   */
  notifyProcessExit(code = null, signal = null) {
    if (this._closed || this._pending.size === 0) return;
    this._failAll(
      new McpDispatcherError(
        `MCP_PROCESS_EXIT: subprocess exited (code=${code}, signal=${signal}) before response`,
        'MCP_PROCESS_EXIT'
      )
    );
  }

  /**
   * @param {object} [params]
   * @param {{ name?: string, version?: string }} [params.clientInfo]
   */
  async initialize({ clientInfo } = {}) {
    const result = await this._request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: clientInfo?.name || CLIENT_INFO.name,
        version: clientInfo?.version || CLIENT_INFO.version
      }
    });
    this._notify('notifications/initialized');
    this._initialized = true;
    return result;
  }

  async listTools() {
    this._ensureInitialized();
    const result = await this._request('tools/list', {});
    return result?.tools ?? [];
  }

  /**
   * @param {string} name
   * @param {object} [args]
   */
  async callTool(name, args = {}) {
    this._ensureInitialized();
    return this._request('tools/call', { name, arguments: args });
  }

  async close() {
    if (this._closed) return;
    this._closed = true;
    this.reader.off('data', this._onData);
    this.reader.off('end', this._onReaderEnd);
    this.reader.off('error', this._onReaderError);
    for (const [, entry] of this._pending) {
      clearTimeout(entry.timer);
      entry.reject(
        new McpDispatcherError('MCP_PROTOCOL_ERROR: client closed', 'MCP_PROTOCOL_ERROR')
      );
    }
    this._pending.clear();
  }

  _ensureInitialized() {
    if (!this._initialized) {
      throw new McpDispatcherError(
        'MCP_PROTOCOL_ERROR: client not initialized; call initialize() first',
        'MCP_PROTOCOL_ERROR'
      );
    }
  }

  /**
   * @param {string} method
   * @param {object} params
   */
  _request(method, params) {
    if (this._closed) {
      return Promise.reject(
        new McpDispatcherError('MCP_PROTOCOL_ERROR: client is closed', 'MCP_PROTOCOL_ERROR')
      );
    }
    if (this._fatal) {
      return Promise.reject(this._fatal);
    }

    const id = this._nextId++;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(
          new McpDispatcherError(
            `MCP_TIMEOUT: no response for '${method}' within ${this.timeoutMs}ms`,
            'MCP_TIMEOUT'
          )
        );
      }, this.timeoutMs);

      this._pending.set(id, { resolve, reject, timer });

      try {
        const framed = encodeFramedMessage(message);
        const ok = this.writer.write(framed);
        if (ok === false) {
          // Backpressure: still fine; data is buffered. No special handling needed.
        }
      } catch (err) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(
          new McpDispatcherError(
            `MCP_PROTOCOL_ERROR: write failed (${err.message})`,
            'MCP_PROTOCOL_ERROR'
          )
        );
      }
    });
  }

  /**
   * @param {string} method
   * @param {object} [params]
   */
  _notify(method, params) {
    if (this._closed) return;
    const message = { jsonrpc: '2.0', method };
    if (params !== undefined) message.params = params;
    try {
      this.writer.write(encodeFramedMessage(message));
    } catch {
      // Notifications are best-effort; fatal path handled by subsequent requests.
    }
  }

  /**
   * @param {object} msg
   */
  _onMessage(msg) {
    if (!msg || typeof msg !== 'object') {
      this._failAll(
        new McpDispatcherError('MCP_PROTOCOL_ERROR: non-object frame', 'MCP_PROTOCOL_ERROR')
      );
      return;
    }

    // Ignore notifications / requests from server (no id matching)
    if (msg.id === undefined || msg.id === null) {
      this.emit('notification', msg);
      return;
    }

    const pending = this._pending.get(msg.id);
    if (!pending) {
      // Orphan response — ignore
      return;
    }

    clearTimeout(pending.timer);
    this._pending.delete(msg.id);

    if (msg.error) {
      const errMsg =
        typeof msg.error === 'object'
          ? msg.error.message || JSON.stringify(msg.error)
          : String(msg.error);
      pending.reject(
        new McpDispatcherError(`MCP_PROTOCOL_ERROR: ${errMsg}`, 'MCP_PROTOCOL_ERROR')
      );
      return;
    }

    pending.resolve(msg.result);
  }

  /**
   * @param {Error} err
   */
  _failAll(err) {
    if (this._fatal) return;
    this._fatal = err instanceof McpDispatcherError
      ? err
      : new McpDispatcherError(err.message, 'MCP_PROTOCOL_ERROR');
    for (const [, entry] of this._pending) {
      clearTimeout(entry.timer);
      entry.reject(this._fatal);
    }
    this._pending.clear();
    // Only emit when a listener is present — bare EventEmitter 'error'
    // would otherwise become an uncaughtException.
    if (this.listenerCount('error') > 0) {
      this.emit('error', this._fatal);
    }
  }
}

/**
 * High-level dispatcher: envelope gate → spawn → handshake → tools/call|list → teardown.
 */
export class McpToolDispatcher {
  /**
   * @param {object} [options]
   * @param {{ servers?: Record<string, { command: string, args?: string[], env?: object }> }} [options.availableConfig]
   * @param {number} [options.timeoutMs]
   * @param {number} [options.maxOutputBytes]
   * @param {typeof defaultSpawn} [options.spawnFn]
   */
  constructor({ availableConfig, timeoutMs, maxOutputBytes, spawnFn } = {}) {
    this.availableConfig = availableConfig || { servers: {} };
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.spawnFn = spawnFn || defaultSpawn;
    /** @type {Set<import('node:child_process').ChildProcess>} */
    this._children = new Set();
  }

  /**
   * @param {object} args
   * @param {string} args.serverName
   * @param {string} args.toolName
   * @param {object} [args.arguments]
   * @param {object} args.envelope
   */
  async dispatch({ serverName, toolName, arguments: toolArgs = {}, envelope }) {
    assertServerInEnvelope(serverName, envelope);
    const started = Date.now();
    const { client, child, cleanup } = this._spawnSession(serverName);

    try {
      await client.initialize();
      const result = await client.callTool(toolName, toolArgs);
      return {
        serverName,
        toolName,
        result,
        meta: {
          durationMs: Date.now() - started,
          protocolVersion: PROTOCOL_VERSION,
          PRODUCTION_READY
        }
      };
    } finally {
      await cleanup();
    }
  }

  /**
   * @param {object} args
   * @param {string} args.serverName
   * @param {object} args.envelope
   */
  async listTools({ serverName, envelope }) {
    assertServerInEnvelope(serverName, envelope);
    const { client, cleanup } = this._spawnSession(serverName);

    try {
      await client.initialize();
      const tools = await client.listTools();
      return {
        serverName,
        tools,
        meta: {
          protocolVersion: PROTOCOL_VERSION,
          PRODUCTION_READY
        }
      };
    } finally {
      await cleanup();
    }
  }

  async dispose() {
    const kids = [...this._children];
    this._children.clear();
    for (const child of kids) {
      try {
        if (!child.killed) child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
  }

  /**
   * @param {string} serverName
   * @private
   */
  _spawnSession(serverName) {
    const servers = (this.availableConfig && this.availableConfig.servers) || {};
    const cfg = servers[serverName];
    if (!cfg || !cfg.command) {
      throw new McpDispatcherError(
        `MCP_SERVER_CONFIG_MISSING: no command configured for server '${serverName}'`,
        'MCP_SERVER_CONFIG_MISSING'
      );
    }

    const args = Array.isArray(cfg.args) ? cfg.args : [];
    const env = cfg.env ? { ...process.env, ...cfg.env } : process.env;

    const child = this.spawnFn(cfg.command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });
    this._children.add(child);

    if (!child.stdin || !child.stdout) {
      this._children.delete(child);
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      throw new McpDispatcherError(
        'MCP_PROTOCOL_ERROR: spawn did not provide stdio pipes',
        'MCP_PROTOCOL_ERROR'
      );
    }

    // Drain stderr to avoid pipe fill; ignore noise
    if (child.stderr) {
      child.stderr.on('data', () => {});
    }

    const client = new McpStdioClient({
      reader: child.stdout,
      writer: child.stdin,
      timeoutMs: this.timeoutMs,
      maxOutputBytes: this.maxOutputBytes
    });

    const onExit = (code, signal) => {
      client.notifyProcessExit(code, signal);
    };
    child.once('exit', onExit);
    child.once('error', (err) => {
      client._failAll(
        new McpDispatcherError(
          `MCP_PROCESS_EXIT: spawn error (${err.message})`,
          'MCP_PROCESS_EXIT'
        )
      );
    });

    const cleanup = async () => {
      child.off('exit', onExit);
      try {
        await client.close();
      } catch {
        // ignore
      }
      this._children.delete(child);
      if (!child.killed && child.exitCode === null) {
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }
    };

    return { client, child, cleanup };
  }
}

export default {
  PRODUCTION_READY,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_OUTPUT_BYTES,
  PROTOCOL_VERSION,
  CLIENT_INFO,
  McpDispatcherError,
  assertServerInEnvelope,
  encodeFramedMessage,
  McpStdioClient,
  McpToolDispatcher
};
