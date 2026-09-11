/**
 * @file gemini-tool-bridge.js
 * @description SPEC-0014 Mission I — native Gemini tool execution bridge for compute worker.
 *
 * Routes gemini_query / gemini_structured (serverName eos-gemini) through queryGemini
 * without MCP stdio. Zero npm deps. Injectable fetch/query for hermetic tests.
 *
 * PRODUCTION_READY: NO | Fundacion Delta=0
 */

import { createHash } from 'node:crypto';
import { queryGemini as defaultQueryGemini } from '../providers/gemini-provider.js';

export const PRODUCTION_READY = 'NO';
export const GEMINI_TOOL_TIMEOUT_MS = 30000;
export const GEMINI_TOOL_MAX_BYTES = 2 * 1024 * 1024;
export const GEMINI_TOOL_NAMES = Object.freeze(['gemini_query', 'gemini_structured']);

const TOOL_DESCRIPTIONS = Object.freeze({
  gemini_query: {
    name: 'gemini_query',
    description: 'Invoke Google Gemini generateContent with a free-text prompt (text/plain).',
    inputSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'User prompt text' },
        systemInstruction: { type: 'string', description: 'Optional system instruction' },
        temperature: { type: 'number', description: 'Optional generation temperature' }
      }
    }
  },
  gemini_structured: {
    name: 'gemini_structured',
    description:
      'Invoke Google Gemini generateContent forcing JSON mode (responseMimeType application/json).',
    inputSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'User prompt text' },
        systemInstruction: { type: 'string', description: 'Optional system instruction' },
        temperature: { type: 'number', description: 'Optional generation temperature' }
      }
    }
  }
});

export class GeminiToolBridgeError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code = 'GEMINI_TOOL_BRIDGE_ERROR', details = {}) {
    super(message);
    this.name = 'GeminiToolBridgeError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Deterministic canonical JSON (sorted keys) for hashing.
 * @param {*} data
 * @returns {string}
 */
function canonicalJson(data) {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return '[' + data.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(data).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(data[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * @param {string|object} data
 * @returns {string}
 */
function sha256Hex(data) {
  const content = typeof data === 'string' ? data : canonicalJson(data);
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Strip secrets / apiKey-like fields from args before hashing.
 * @param {object} args
 * @returns {object}
 */
function sanitizeArgsForHash(args = {}) {
  const src = args && typeof args === 'object' ? args : {};
  const out = {};
  for (const key of Object.keys(src).sort()) {
    const lower = key.toLowerCase();
    if (
      lower === 'apikey' ||
      lower === 'api_key' ||
      lower === 'authorization' ||
      lower === 'token' ||
      lower === 'secret' ||
      lower.includes('apikey') ||
      lower.includes('api_key')
    ) {
      continue;
    }
    out[key] = src[key];
  }
  return out;
}

/**
 * UTF-8 byte length of prompt (+ optional systemInstruction).
 * @param {object} args
 * @returns {number}
 */
function inputByteLength(args = {}) {
  const prompt = args && typeof args.prompt === 'string' ? args.prompt : '';
  const sys =
    args && typeof args.systemInstruction === 'string' ? args.systemInstruction : '';
  return Buffer.byteLength(prompt, 'utf8') + Buffer.byteLength(sys, 'utf8');
}

/**
 * @returns {{ name: string, description: string, inputSchema: object }[]}
 */
export function listGeminiTools() {
  return GEMINI_TOOL_NAMES.map((name) => ({ ...TOOL_DESCRIPTIONS[name] }));
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isGeminiToolName(name) {
  return GEMINI_TOOL_NAMES.includes(String(name || ''));
}

/**
 * Validate gemini tool args; throw GeminiToolBridgeError on failure.
 * @param {string} toolName
 * @param {object} args
 */
export function assertGeminiToolInput(toolName, args) {
  const name = String(toolName || '');
  if (!isGeminiToolName(name)) {
    throw new GeminiToolBridgeError(
      `UNKNOWN_GEMINI_TOOL: '${name}' is not a Gemini tool`,
      'UNKNOWN_GEMINI_TOOL'
    );
  }
  const a = args && typeof args === 'object' ? args : {};
  if (!a.prompt || typeof a.prompt !== 'string' || !a.prompt.trim()) {
    throw new GeminiToolBridgeError(
      'PROMPT_REQUIRED: prompt must be a non-empty string',
      'PROMPT_REQUIRED'
    );
  }
  if (a.systemInstruction != null && typeof a.systemInstruction !== 'string') {
    throw new GeminiToolBridgeError(
      'INVALID_SYSTEM_INSTRUCTION: systemInstruction must be a string when provided',
      'INVALID_ARGS'
    );
  }
  if (a.temperature != null && !Number.isFinite(Number(a.temperature))) {
    throw new GeminiToolBridgeError(
      'INVALID_TEMPERATURE: temperature must be a finite number when provided',
      'INVALID_ARGS'
    );
  }
  const bytes = inputByteLength(a);
  if (bytes > GEMINI_TOOL_MAX_BYTES) {
    throw new GeminiToolBridgeError(
      `PAYLOAD_OVERSIZE: prompt(+systemInstruction) is ${bytes} bytes (max ${GEMINI_TOOL_MAX_BYTES})`,
      'PAYLOAD_OVERSIZE',
      { bytes, maxBytes: GEMINI_TOOL_MAX_BYTES }
    );
  }
  return true;
}

/**
 * @param {string} toolName
 * @param {object} args
 * @returns {string} sha256 hex
 */
export function hashGeminiToolInput(toolName, args) {
  return sha256Hex({
    toolName: String(toolName || ''),
    arguments: sanitizeArgsForHash(args)
  });
}

/**
 * Wrap provider errors into GeminiToolBridgeError (preserve known codes).
 * @param {*} err
 * @returns {GeminiToolBridgeError}
 */
function wrapProviderError(err) {
  if (err instanceof GeminiToolBridgeError) return err;
  const code = err && err.code ? String(err.code) : 'GEMINI_PROVIDER_ERROR';
  const message = String(err && err.message ? err.message : err);
  return new GeminiToolBridgeError(message, code, {
    originalError: err,
    originalName: err && err.name ? err.name : undefined
  });
}

/**
 * Execute a Gemini native tool.
 *
 * @param {object} opts
 * @param {string} opts.toolName
 * @param {object} [opts.arguments]
 * @param {Function} [opts.queryGeminiImpl]
 * @param {Function} [opts.fetchImpl]
 * @param {string} [opts.apiKey]
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.maxBytes]
 * @returns {Promise<object>}
 */
export async function executeGeminiTool({
  toolName,
  arguments: args = {},
  queryGeminiImpl,
  fetchImpl,
  apiKey,
  timeoutMs = GEMINI_TOOL_TIMEOUT_MS,
  maxBytes = GEMINI_TOOL_MAX_BYTES
} = {}) {
  const name = String(toolName || '');
  assertGeminiToolInput(name, args);

  const resolvedKey =
    apiKey !== undefined && apiKey !== null
      ? apiKey
      : process.env.GEMINI_API_KEY;
  if (!resolvedKey || typeof resolvedKey !== 'string' || !String(resolvedKey).trim()) {
    throw new GeminiToolBridgeError(
      'KEY_MISSING: GEMINI_API_KEY not configured in environment or options',
      'KEY_MISSING'
    );
  }

  const queryFn =
    typeof queryGeminiImpl === 'function' ? queryGeminiImpl : defaultQueryGemini;
  const input_hash = hashGeminiToolInput(name, args);
  const started = Date.now();
  const jsonMode = name === 'gemini_structured';

  const callOpts = {
    prompt: args.prompt,
    temperature: args.temperature != null ? Number(args.temperature) : undefined,
    jsonMode,
    apiKey: String(resolvedKey).trim(),
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : GEMINI_TOOL_TIMEOUT_MS,
    maxBytes: Number.isFinite(maxBytes) ? maxBytes : GEMINI_TOOL_MAX_BYTES
  };
  if (args.systemInstruction != null) {
    callOpts.systemInstruction = args.systemInstruction;
  }
  if (typeof fetchImpl === 'function') {
    callOpts.fetchImpl = fetchImpl;
  }

  let result;
  try {
    result = await queryFn(callOpts);
  } catch (err) {
    throw wrapProviderError(err);
  }

  const duration_ms = Date.now() - started;
  return {
    toolName: name,
    ok: true,
    result: {
      text: result && result.text != null ? result.text : '',
      data: result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : null,
      model: result && result.model != null ? result.model : null,
      usage: result && Object.prototype.hasOwnProperty.call(result, 'usage') ? result.usage : null
    },
    custody: {
      tool: name,
      input_hash,
      duration_ms,
      status: 'VERIFIED',
      PRODUCTION_READY: 'NO'
    }
  };
}
