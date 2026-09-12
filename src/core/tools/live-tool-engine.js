/**
 * @module live-tool-engine
 * SPEC-0038 / Mission AG — Live Tool Engine.
 *
 * Hermetic tool-call bus with native (in-process) and mcp (injectable
 * mcpClient port — fake in tests) dispatch modes. Fail-closed on unknown
 * tools and missing/unauthorized auth. Law VI: sanitize inputs AND outputs
 * (deep redact token/secret/password/api_key/authorization); never echo
 * secrets in receipts.
 *
 * Does NOT implement AH. No live network in CI — hermetic fakes only.
 *
 * NON-CLAIM:
 *   tool bus ≠ unbounded fleet
 *   tool bus ≠ CloudAgent
 *   tool bus ≠ PRODUCTION_READY
 *   not AH / Antigravity-first
 *   Fundacion Δ=0
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createToolCustodyReceipt } from './tool-custody-receipt.js';

/** @type {'NO'} */
export const AG_PRODUCTION_READY = 'NO';

export const AG_KIND = 'eos-live-tool-engine';

export const AG_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  UNKNOWN_TOOL: 'UNKNOWN_TOOL',
  TOOL_UNAUTHORIZED: 'TOOL_UNAUTHORIZED',
  TOOL_ERROR: 'TOOL_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MCP_UNAVAILABLE: 'MCP_UNAVAILABLE',
  ANOMALY: 'ANOMALY'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for live tool engine failures.
 */
export class LiveToolEngineError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AG_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'LiveToolEngineError';
    this.code = code;
    this.details = sanitizeAgPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / I/O.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAgPayload(obj) {
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
    return redactSecretSubstrings(value);
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
    // Numeric budget/usage counters are not secrets even if key contains "token"
    if (
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * Redact secret-looking substrings inside free-form strings.
 * Built without embedding static vendor-key fixtures in source (Law VI / AF11 lesson).
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  // Match vendor-style key prefixes at runtime via concat (never as static literals)
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(
    `\\b(${vendorPrefix}[A-Za-z0-9]{8,})\\b`,
    'g'
  );
  out = out.replace(vendorRe, REDACTED);
  out = out.replace(
    /\b(api[_-]?key|token|authorization|secret|password)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
    (_m, k) => `${k}=${REDACTED}`
  );
  return out;
}

/**
 * @param {string} message
 * @returns {string}
 */
function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

/**
 * Create the Live Tool Engine (tool-call bus).
 *
 * @param {object} [options]
 * @param {'native'|'mcp'} [options.mode='native'] — default dispatch mode
 * @param {{ callTool(name, input, ctx?): Promise<object>|object, listTools?(): string[] }} [options.mcpClient] — injectable MCP port (fake in tests)
 * @param {() => string} [options.now] — injectable clock
 * @param {boolean} [options.throwOnDeny=false]
 */
export function createLiveToolEngine(options = {}) {
  const defaultMode =
    options.mode === 'mcp' ? 'mcp' : 'native';
  const mcpClient =
    options.mcpClient && typeof options.mcpClient === 'object'
      ? options.mcpClient
      : null;
  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();
  const throwOnDeny = options.throwOnDeny === true;

  /** @type {Map<string, { name: string, handler: Function, auth?: object|null, mode?: string }>} */
  const tools = new Map();

  /** @type {object[]} */
  const receipts = [];

  /** @type {{ invokes: number, lastCode: string|null, lastOk: boolean|null, lastReceiptId: string|null, denials: number }} */
  const state = {
    invokes: 0,
    lastCode: null,
    lastOk: null,
    lastReceiptId: null,
    denials: 0
  };

  /**
   * @param {object} partial
   * @param {object} [extra]
   */
  function emitReceipt(partial, extra = {}) {
    const receiptId = `ag-rcpt-${state.invokes}-${Date.now()}`;
    const sealed = createToolCustodyReceipt(
      {
        tool: partial.tool,
        ok: partial.ok === true,
        code: partial.code,
        at: now(),
        receiptId
      },
      sanitizeAgPayload({
        kind: AG_KIND,
        mode: partial.mode,
        message: partial.message,
        ...extra
      })
    );
    // Ensure no secret-looking keys survived on the sealed receipt
    const clean = /** @type {object} */ (sanitizeAgPayload(sealed));
    receipts.push(clean);
    if (receipts.length > 50) receipts.shift();
    state.lastReceiptId = clean.receiptId;
    return clean;
  }

  /**
   * @param {string} code
   * @param {object} extra
   */
  function denyResult(code, extra = {}) {
    state.invokes += 1;
    state.lastCode = code;
    state.lastOk = false;
    state.denials += 1;
    const receipt = emitReceipt(
      {
        tool: extra.tool || 'unknown',
        ok: false,
        code,
        mode: extra.mode || defaultMode,
        message: extra.message
      },
      { reason: extra.reason }
    );
    const result = sanitizeAgPayload({
      ok: false,
      allow: false,
      code,
      kind: AG_KIND,
      PRODUCTION_READY: AG_PRODUCTION_READY,
      tool: extra.tool || 'unknown',
      receipt,
      ...extra
    });
    if (throwOnDeny) {
      throw new LiveToolEngineError(
        extra.message || `invoke DENY: ${code}`,
        code,
        { receipt, ...extra }
      );
    }
    return result;
  }

  /**
   * Register a native (or mcp-routed) tool.
   * @param {{ name: string, handler: Function, auth?: { required?: boolean, token?: string, role?: string }|null, mode?: 'native'|'mcp' }} def
   */
  function registerTool(def) {
    if (!def || typeof def !== 'object' || !def.name) {
      throw new LiveToolEngineError(
        'registerTool requires { name, handler }',
        AG_CODES.INVALID_INPUT
      );
    }
    const name = String(def.name);
    if (typeof def.handler !== 'function' && def.mode !== 'mcp') {
      // native requires handler; mcp may rely on mcpClient.callTool
      if (defaultMode !== 'mcp' && def.mode !== 'mcp') {
        throw new LiveToolEngineError(
          `registerTool('${name}') requires handler for native mode`,
          AG_CODES.INVALID_INPUT
        );
      }
    }
    tools.set(name, {
      name,
      handler: typeof def.handler === 'function' ? def.handler : null,
      auth: def.auth != null ? def.auth : null,
      mode: def.mode === 'mcp' ? 'mcp' : def.mode === 'native' ? 'native' : undefined
    });
    return {
      ok: true,
      code: AG_CODES.OK,
      name,
      PRODUCTION_READY: AG_PRODUCTION_READY
    };
  }

  function listTools() {
    return Array.from(tools.keys()).sort();
  }

  /**
   * Check auth for a registered tool.
   * @param {object} toolDef
   * @param {object} [ctx]
   */
  function checkAuth(toolDef, ctx = {}) {
    const auth = toolDef.auth;
    if (!auth) return { ok: true };
    const required = auth.required !== false; // present auth object → required by default
    if (!required) return { ok: true };

    const provided =
      (ctx && (ctx.auth || ctx.authorization || ctx.token || ctx.apiKey)) ||
      null;

    if (provided == null) {
      return { ok: false, reason: 'missing auth' };
    }

    if (typeof auth.token === 'string') {
      const got =
        typeof provided === 'string'
          ? provided
          : provided.token || provided.authorization || provided.apiKey;
      if (got !== auth.token) {
        return { ok: false, reason: 'token mismatch' };
      }
    }

    if (typeof auth.role === 'string') {
      const role =
        typeof provided === 'object' && provided
          ? provided.role
          : ctx.role;
      if (role !== auth.role) {
        return { ok: false, reason: 'role mismatch' };
      }
    }

    if (typeof auth.check === 'function') {
      try {
        const ok = auth.check(ctx, provided);
        if (ok !== true) return { ok: false, reason: 'auth.check denied' };
      } catch {
        return { ok: false, reason: 'auth.check error' };
      }
    }

    return { ok: true };
  }

  /**
   * Invoke a registered tool.
   * @param {string} name
   * @param {object} [input]
   * @param {object} [ctx]
   */
  async function invoke(name, input = {}, ctx = {}) {
    if (name == null || String(name).trim() === '') {
      return denyResult(AG_CODES.INVALID_INPUT, {
        tool: 'unknown',
        message: 'invoke requires a tool name'
      });
    }
    const toolName = String(name);
    const toolDef = tools.get(toolName);
    if (!toolDef) {
      return denyResult(AG_CODES.UNKNOWN_TOOL, {
        tool: toolName,
        message: `unknown tool: ${toolName}`,
        reason: 'UNKNOWN_TOOL'
      });
    }

    const authResult = checkAuth(toolDef, ctx || {});
    if (!authResult.ok) {
      return denyResult(AG_CODES.TOOL_UNAUTHORIZED, {
        tool: toolName,
        message: `unauthorized for tool: ${toolName}`,
        reason: authResult.reason || 'TOOL_UNAUTHORIZED'
      });
    }

    const mode =
      (ctx && ctx.mode) ||
      toolDef.mode ||
      defaultMode;

    // Law VI: sanitize inputs before dispatch (never echo secrets to handlers
    // receipts — handlers still receive a sanitized copy for safety)
    const safeInput = /** @type {object} */ (sanitizeAgPayload(input || {}));

    let rawResult;
    try {
      if (mode === 'mcp') {
        if (!mcpClient || typeof mcpClient.callTool !== 'function') {
          return denyResult(AG_CODES.MCP_UNAVAILABLE, {
            tool: toolName,
            mode: 'mcp',
            message: 'mcp mode requires injectable mcpClient.callTool (fake in tests)',
            reason: 'MCP_UNAVAILABLE'
          });
        }
        rawResult = await Promise.resolve(
          mcpClient.callTool(toolName, safeInput, ctx)
        );
      } else {
        // native
        if (typeof toolDef.handler !== 'function') {
          return denyResult(AG_CODES.ANOMALY, {
            tool: toolName,
            mode: 'native',
            message: `native tool '${toolName}' has no handler`,
            reason: 'NO_HANDLER'
          });
        }
        rawResult = await Promise.resolve(
          toolDef.handler(safeInput, ctx)
        );
      }
    } catch (err) {
      return denyResult(AG_CODES.TOOL_ERROR, {
        tool: toolName,
        mode,
        message: sanitizeErrorMessage(err.message || 'tool handler failed'),
        reason: err.code || 'TOOL_ERROR'
      });
    }

    // Law VI: sanitize outputs
    const safeOutput = sanitizeAgPayload(rawResult);

    const ok =
      safeOutput == null
        ? true
        : typeof safeOutput === 'object'
          ? safeOutput.ok !== false
          : true;
    const code =
      typeof safeOutput === 'object' && safeOutput && safeOutput.code
        ? String(safeOutput.code)
        : ok
          ? AG_CODES.OK
          : AG_CODES.DENY;

    state.invokes += 1;
    state.lastCode = code;
    state.lastOk = ok;
    if (!ok) state.denials += 1;

    const receipt = emitReceipt(
      {
        tool: toolName,
        ok,
        code,
        mode,
        message: ok ? 'invoke ok' : 'invoke returned ok:false'
      },
      {}
    );

    return sanitizeAgPayload({
      ok,
      allow: ok,
      code,
      kind: AG_KIND,
      PRODUCTION_READY: AG_PRODUCTION_READY,
      tool: toolName,
      mode,
      result: safeOutput,
      // sanitized echo of input keys only (values already redacted)
      input: safeInput,
      receipt
    });
  }

  async function health() {
    return sanitizeAgPayload({
      ok: true,
      kind: AG_KIND,
      PRODUCTION_READY: AG_PRODUCTION_READY,
      mode: defaultMode,
      toolCount: tools.size,
      tools: listTools(),
      invokes: state.invokes,
      denials: state.denials,
      lastCode: state.lastCode,
      lastOk: state.lastOk,
      mcpClient: !!(mcpClient && typeof mcpClient.callTool === 'function'),
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      nonClaim: {
        toolBusNotUnboundedFleet: true,
        toolBusNotCloudAgent: true,
        toolBusNotProductionReady: true,
        notAh: true,
        fundacionDelta0: true,
        antigravityFirst: true
      }
    });
  }

  function getState() {
    return sanitizeAgPayload({
      kind: AG_KIND,
      PRODUCTION_READY: AG_PRODUCTION_READY,
      mode: defaultMode,
      toolCount: tools.size,
      tools: listTools(),
      invokes: state.invokes,
      denials: state.denials,
      lastCode: state.lastCode,
      lastOk: state.lastOk,
      lastReceiptId: state.lastReceiptId,
      receiptCount: receipts.length,
      recentReceipts: receipts.slice(-5),
      mcpClientPresent: !!(mcpClient && typeof mcpClient.callTool === 'function'),
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      nonClaim: {
        toolBusNotUnboundedFleet: true,
        toolBusNotCloudAgent: true,
        toolBusNotProductionReady: true,
        notAh: true,
        fundacionDelta0: true,
        antigravityFirst: true
      }
    });
  }

  function getReceipts() {
    return receipts.slice();
  }

  return {
    kind: AG_KIND,
    PRODUCTION_READY: AG_PRODUCTION_READY,
    registerTool,
    listTools,
    invoke,
    health,
    getState,
    getReceipts,
    /** @internal */
    sanitizeAgPayload
  };
}

export default createLiveToolEngine;
