/**
 * @file stitch-tool-bridge.js
 * @description SPEC-0015 Mission J — Google Stitch UI Generator Bridge for compute worker.
 *
 * Routes stitch_list_projects / stitch_generate_screen / stitch_get_screen /
 * stitch_export_design_md through an injectable clientImpl (no MCP stdio).
 * Zero npm deps. Hermetic tests ALWAYS inject clientImpl — never hit network
 * in the default suite.
 *
 * Default mockable client shape:
 * ```js
 * clientImpl = {
 *   list_projects: async () => ({ projects: [...] }),
 *   generate_screen: async ({ projectId, prompt, deviceType }) => ({ screenId, previewUrl, ... }),
 *   get_screen: async ({ screenId }) => ({ screenId, htmlUrl, screenshotUrl, ... }),
 *   export_design_md: async ({ projectId }) => ({ designMd: '...' })
 * }
 * ```
 *
 * Live path (opt-in only): STITCH_ALLOW_LIVE=true + fetchImpl (and optional
 * STITCH_API_BASE). Without explicit clientImpl or that opt-in, fail-closed
 * with CLIENT_IMPL_REQUIRED.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

export const PRODUCTION_READY = 'NO';
export const STITCH_TOOL_TIMEOUT_MS = 30000;
export const STITCH_TOOL_MAX_BYTES = 2 * 1024 * 1024;
export const STITCH_DEVICE_TYPES = Object.freeze(['DESKTOP', 'MOBILE']);
export const STITCH_TOOL_NAMES = Object.freeze([
  'stitch_list_projects',
  'stitch_generate_screen',
  'stitch_get_screen',
  'stitch_export_design_md'
]);

const TOOL_DESCRIPTIONS = Object.freeze({
  stitch_list_projects: {
    name: 'stitch_list_projects',
    description: 'List Google Stitch projects available to the authenticated client.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  stitch_generate_screen: {
    name: 'stitch_generate_screen',
    description:
      'Generate a UI screen in a Stitch project from a prompt (DESKTOP or MOBILE).',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'prompt'],
      properties: {
        projectId: { type: 'string', description: 'Stitch project id' },
        prompt: { type: 'string', description: 'Screen generation prompt' },
        deviceType: {
          type: 'string',
          enum: ['DESKTOP', 'MOBILE'],
          description: 'Target device type (default MOBILE)'
        }
      }
    }
  },
  stitch_get_screen: {
    name: 'stitch_get_screen',
    description: 'Fetch a generated Stitch screen by screenId (html/screenshot URLs).',
    inputSchema: {
      type: 'object',
      required: ['screenId'],
      properties: {
        screenId: { type: 'string', description: 'Stitch screen id' }
      }
    }
  },
  stitch_export_design_md: {
    name: 'stitch_export_design_md',
    description: 'Export a Stitch project as design markdown (designMd).',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: 'Stitch project id' }
      }
    }
  }
});

/** Map public tool names → clientImpl method names. */
const TOOL_TO_METHOD = Object.freeze({
  stitch_list_projects: 'list_projects',
  stitch_generate_screen: 'generate_screen',
  stitch_get_screen: 'get_screen',
  stitch_export_design_md: 'export_design_md'
});

export class StitchToolBridgeError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code = 'STITCH_TOOL_BRIDGE_ERROR', details = {}) {
    super(message);
    this.name = 'StitchToolBridgeError';
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
 * @returns {{ name: string, description: string, inputSchema: object }[]}
 */
export function listStitchTools() {
  return STITCH_TOOL_NAMES.map((name) => ({ ...TOOL_DESCRIPTIONS[name] }));
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isStitchToolName(name) {
  return STITCH_TOOL_NAMES.includes(String(name || ''));
}

/**
 * @param {string} toolName
 * @param {object} args
 * @returns {string} sha256 hex
 */
export function hashStitchToolInput(toolName, args) {
  return sha256Hex({
    toolName: String(toolName || ''),
    arguments: sanitizeArgsForHash(args)
  });
}

/**
 * @param {*} err
 * @returns {StitchToolBridgeError}
 */
function wrapClientError(err) {
  if (err instanceof StitchToolBridgeError) return err;
  const code = err && err.code ? String(err.code) : 'STITCH_CLIENT_ERROR';
  const message = String(err && err.message ? err.message : err);
  return new StitchToolBridgeError(message, code, {
    originalError: err,
    originalName: err && err.name ? err.name : undefined
  });
}

/**
 * Race a promise against a timeout; reject with TIMEOUT.
 * @param {Promise<*>} promise
 * @param {number} timeoutMs
 * @returns {Promise<*>}
 */
async function withTimeout(promise, timeoutMs) {
  const ms = Number.isFinite(timeoutMs) ? timeoutMs : STITCH_TOOL_TIMEOUT_MS;
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new StitchToolBridgeError(
              `TIMEOUT: Stitch request exceeded ${ms}ms`,
              'TIMEOUT',
              { timeoutMs: ms }
            )
          );
        }, ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Build a fetch-backed live client against STITCH_API_BASE (placeholder).
 * Only used when STITCH_ALLOW_LIVE=true and fetchImpl is provided.
 * @param {Function} fetchImpl
 * @returns {object}
 */
function createFetchClient(fetchImpl) {
  const base =
    (process.env.STITCH_API_BASE && String(process.env.STITCH_API_BASE).trim()) ||
    'https://stitch.placeholder.local/v1';

  async function post(path, body) {
    const res = await fetchImpl(`${base.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      throw new StitchToolBridgeError(
        `STITCH_HTTP_ERROR: ${res.status}`,
        'STITCH_HTTP_ERROR',
        { status: res.status, data }
      );
    }
    return data;
  }

  return {
    list_projects: async () => post('/projects/list', {}),
    generate_screen: async ({ projectId, prompt, deviceType }) =>
      post('/screens/generate', { projectId, prompt, deviceType }),
    get_screen: async ({ screenId }) => post('/screens/get', { screenId }),
    export_design_md: async ({ projectId }) =>
      post('/projects/export_design_md', { projectId })
  };
}

/**
 * Resolve clientImpl fail-closed for hermetic CI.
 * @param {object|undefined} clientImpl
 * @param {Function|undefined} fetchImpl
 * @returns {object}
 */
function resolveClientImpl(clientImpl, fetchImpl) {
  if (clientImpl && typeof clientImpl === 'object') {
    return clientImpl;
  }
  const allowLive = process.env.STITCH_ALLOW_LIVE === 'true';
  if (allowLive && typeof fetchImpl === 'function') {
    return createFetchClient(fetchImpl);
  }
  throw new StitchToolBridgeError(
    'CLIENT_IMPL_REQUIRED: inject clientImpl for hermetic use, or set STITCH_ALLOW_LIVE=true with fetchImpl',
    'CLIENT_IMPL_REQUIRED'
  );
}

/**
 * Build custody envelope for a successful call.
 * @param {string} toolName
 * @param {object} args
 * @param {number} started
 * @returns {object}
 */
function buildCustody(toolName, args, started) {
  return {
    tool: toolName,
    input_hash: hashStitchToolInput(toolName, args),
    duration_ms: Date.now() - started,
    status: 'VERIFIED',
    PRODUCTION_READY: 'NO'
  };
}

/**
 * Validate generate_screen args (fail-closed).
 * @param {object} opts
 */
function assertGenerateScreenArgs({ projectId, prompt, deviceType }) {
  if (projectId == null || typeof projectId !== 'string' || !String(projectId).trim()) {
    throw new StitchToolBridgeError(
      'PROJECT_ID_REQUIRED: projectId must be a non-empty string',
      'PROJECT_ID_REQUIRED'
    );
  }
  if (prompt == null || typeof prompt !== 'string' || !String(prompt).trim()) {
    throw new StitchToolBridgeError(
      'PROMPT_REQUIRED: prompt must be a non-empty string',
      'PROMPT_REQUIRED'
    );
  }
  const bytes = Buffer.byteLength(prompt, 'utf8');
  if (bytes > STITCH_TOOL_MAX_BYTES) {
    throw new StitchToolBridgeError(
      `PAYLOAD_OVERSIZE: prompt is ${bytes} bytes (max ${STITCH_TOOL_MAX_BYTES})`,
      'PAYLOAD_OVERSIZE',
      { bytes, maxBytes: STITCH_TOOL_MAX_BYTES }
    );
  }
  const device = deviceType == null ? 'MOBILE' : String(deviceType);
  if (!STITCH_DEVICE_TYPES.includes(device)) {
    throw new StitchToolBridgeError(
      `INVALID_DEVICE_TYPE: deviceType must be DESKTOP or MOBILE (got '${device}')`,
      'INVALID_DEVICE_TYPE',
      { deviceType: device }
    );
  }
  return { projectId: String(projectId).trim(), prompt, deviceType: device };
}

/**
 * @param {object} [opts]
 * @param {object} [opts.clientImpl]
 * @param {Function} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 */
export async function stitchListProjects({
  clientImpl,
  fetchImpl,
  timeoutMs = STITCH_TOOL_TIMEOUT_MS
} = {}) {
  const toolName = 'stitch_list_projects';
  const args = {};
  const client = resolveClientImpl(clientImpl, fetchImpl);
  if (typeof client.list_projects !== 'function') {
    throw new StitchToolBridgeError(
      'CLIENT_METHOD_MISSING: clientImpl.list_projects is required',
      'CLIENT_METHOD_MISSING'
    );
  }
  const started = Date.now();
  let result;
  try {
    result = await withTimeout(client.list_projects(), timeoutMs);
  } catch (err) {
    throw wrapClientError(err);
  }
  return {
    toolName,
    ok: true,
    result,
    custody: buildCustody(toolName, args, started)
  };
}

/**
 * @param {object} [opts]
 * @param {string} opts.projectId
 * @param {string} opts.prompt
 * @param {string} [opts.deviceType]
 * @param {object} [opts.clientImpl]
 * @param {Function} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 */
export async function stitchGenerateScreen({
  projectId,
  prompt,
  deviceType = 'MOBILE',
  clientImpl,
  fetchImpl,
  timeoutMs = STITCH_TOOL_TIMEOUT_MS
} = {}) {
  const toolName = 'stitch_generate_screen';
  const validated = assertGenerateScreenArgs({ projectId, prompt, deviceType });
  const args = {
    projectId: validated.projectId,
    prompt: validated.prompt,
    deviceType: validated.deviceType
  };
  const client = resolveClientImpl(clientImpl, fetchImpl);
  if (typeof client.generate_screen !== 'function') {
    throw new StitchToolBridgeError(
      'CLIENT_METHOD_MISSING: clientImpl.generate_screen is required',
      'CLIENT_METHOD_MISSING'
    );
  }
  const started = Date.now();
  let result;
  try {
    result = await withTimeout(client.generate_screen(args), timeoutMs);
  } catch (err) {
    throw wrapClientError(err);
  }
  return {
    toolName,
    ok: true,
    result,
    custody: buildCustody(toolName, args, started)
  };
}

/**
 * @param {object} [opts]
 * @param {string} opts.screenId
 * @param {object} [opts.clientImpl]
 * @param {Function} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 */
export async function stitchGetScreen({
  screenId,
  clientImpl,
  fetchImpl,
  timeoutMs = STITCH_TOOL_TIMEOUT_MS
} = {}) {
  const toolName = 'stitch_get_screen';
  if (screenId == null || typeof screenId !== 'string' || !String(screenId).trim()) {
    throw new StitchToolBridgeError(
      'SCREEN_ID_REQUIRED: screenId must be a non-empty string',
      'SCREEN_ID_REQUIRED'
    );
  }
  const args = { screenId: String(screenId).trim() };
  const client = resolveClientImpl(clientImpl, fetchImpl);
  if (typeof client.get_screen !== 'function') {
    throw new StitchToolBridgeError(
      'CLIENT_METHOD_MISSING: clientImpl.get_screen is required',
      'CLIENT_METHOD_MISSING'
    );
  }
  const started = Date.now();
  let result;
  try {
    result = await withTimeout(client.get_screen(args), timeoutMs);
  } catch (err) {
    throw wrapClientError(err);
  }
  return {
    toolName,
    ok: true,
    result,
    custody: buildCustody(toolName, args, started)
  };
}

/**
 * @param {object} [opts]
 * @param {string} opts.projectId
 * @param {object} [opts.clientImpl]
 * @param {Function} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 */
export async function stitchExportDesignMd({
  projectId,
  clientImpl,
  fetchImpl,
  timeoutMs = STITCH_TOOL_TIMEOUT_MS
} = {}) {
  const toolName = 'stitch_export_design_md';
  if (projectId == null || typeof projectId !== 'string' || !String(projectId).trim()) {
    throw new StitchToolBridgeError(
      'PROJECT_ID_REQUIRED: projectId must be a non-empty string',
      'PROJECT_ID_REQUIRED'
    );
  }
  const args = { projectId: String(projectId).trim() };
  const client = resolveClientImpl(clientImpl, fetchImpl);
  if (typeof client.export_design_md !== 'function') {
    throw new StitchToolBridgeError(
      'CLIENT_METHOD_MISSING: clientImpl.export_design_md is required',
      'CLIENT_METHOD_MISSING'
    );
  }
  const started = Date.now();
  let result;
  try {
    result = await withTimeout(client.export_design_md(args), timeoutMs);
  } catch (err) {
    throw wrapClientError(err);
  }
  return {
    toolName,
    ok: true,
    result,
    custody: buildCustody(toolName, args, started)
  };
}

/**
 * Unified dispatcher for tool-registry style callers.
 * @param {object} opts
 * @param {string} opts.toolName
 * @param {object} [opts.arguments]
 * @param {object} [opts.clientImpl]
 * @param {Function} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 */
export async function executeStitchTool({
  toolName,
  arguments: args = {},
  clientImpl,
  fetchImpl,
  timeoutMs = STITCH_TOOL_TIMEOUT_MS
} = {}) {
  const name = String(toolName || '');
  if (!isStitchToolName(name)) {
    throw new StitchToolBridgeError(
      `UNKNOWN_STITCH_TOOL: '${name}' is not a Stitch tool`,
      'UNKNOWN_STITCH_TOOL'
    );
  }
  const a = args && typeof args === 'object' ? args : {};
  const common = { clientImpl, fetchImpl, timeoutMs };

  switch (name) {
    case 'stitch_list_projects':
      return stitchListProjects(common);
    case 'stitch_generate_screen':
      return stitchGenerateScreen({
        projectId: a.projectId,
        prompt: a.prompt,
        deviceType: a.deviceType !== undefined ? a.deviceType : 'MOBILE',
        ...common
      });
    case 'stitch_get_screen':
      return stitchGetScreen({
        screenId: a.screenId,
        ...common
      });
    case 'stitch_export_design_md':
      return stitchExportDesignMd({
        projectId: a.projectId,
        ...common
      });
    default:
      throw new StitchToolBridgeError(
        `UNKNOWN_STITCH_TOOL: '${name}' is not a Stitch tool`,
        'UNKNOWN_STITCH_TOOL'
      );
  }
}

