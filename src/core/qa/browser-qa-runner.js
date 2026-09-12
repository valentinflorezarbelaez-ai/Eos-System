/**
 * @file browser-qa-runner.js
 * @description SPEC-0016 Mission K — Autonomous Chrome DevTools Browser QA Runner.
 *
 * Runs navigate → collectCwv → runA11yScan → captureScreenshot through an
 * injectable clientImpl (no live Chrome/DevTools by default). Zero npm deps.
 * Hermetic tests ALWAYS inject clientImpl — never hit network in the default suite.
 *
 * Default mockable client shape:
 * ```js
 * clientImpl = {
 *   navigate: async (url) => ({ ok: true }),
 *   collectCwv: async () => ({ lcpMs: 1200, cls: 0.01 }),
 *   runA11yScan: async () => ({ violations: [] }), // or [{ id, impact, description, nodes }]
 *   captureScreenshot: async () => ({ mimeType: 'image/png', base64: '...' }) // or { buffer: Buffer }
 * }
 * ```
 *
 * Live path (opt-in only): RUN_LIVE_BROWSER_QA_TESTS=true and/or
 * BROWSER_QA_ALLOW_LIVE=true. Without explicit clientImpl (or that opt-in),
 * fail-closed with CLIENT_IMPL_REQUIRED.
 *
 * Soft QA failures (CWV/a11y): return ok:false + custody.status FAILED (no throw).
 * Infra errors (bad url, missing methods, timeout): throw BrowserQaRunnerError.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

export const PRODUCTION_READY = 'NO';
export const BROWSER_QA_TIMEOUT_MS = 30000;
export const BROWSER_QA_LCP_GOOD_MS = 2500;
export const BROWSER_QA_CLS_GOOD = 0.1;
export const BROWSER_QA_A11Y_STANDARD = 'WCAG2.1-AA';

const REQUIRED_CLIENT_METHODS = Object.freeze([
  'navigate',
  'collectCwv',
  'runA11yScan',
  'captureScreenshot'
]);

export class BrowserQaRunnerError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code = 'BROWSER_QA_RUNNER_ERROR', details = {}) {
    super(message);
    this.name = 'BrowserQaRunnerError';
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
 * @param {string|object|Buffer|Uint8Array} data
 * @returns {string}
 */
function sha256Hex(data) {
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    return createHash('sha256').update(data).digest('hex');
  }
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
 * @param {string} url
 * @param {object} [options]
 * @returns {string} sha256 hex
 */
export function hashBrowserQaInput(url, options = {}) {
  return sha256Hex({
    url: String(url || ''),
    options: sanitizeArgsForHash(options)
  });
}

/**
 * Evaluate Core Web Vitals against good thresholds (fail-closed on null/NaN).
 * @param {{ lcpMs?: *, cls?: * }} metrics
 * @returns {{ lcpMs: *, cls: *, lcpPass: boolean, clsPass: boolean, pass: boolean }}
 */
export function evaluateCwv({ lcpMs, cls } = {}) {
  // Fail-closed: null/undefined must not coerce via Number(null)===0
  const lcpNum =
    lcpMs == null || (typeof lcpMs !== 'number' && typeof lcpMs !== 'string')
      ? NaN
      : typeof lcpMs === 'number'
        ? lcpMs
        : Number(lcpMs);
  const clsNum =
    cls == null || (typeof cls !== 'number' && typeof cls !== 'string')
      ? NaN
      : typeof cls === 'number'
        ? cls
        : Number(cls);
  const lcpPass =
    Number.isFinite(lcpNum) && lcpNum >= 0 && lcpNum <= BROWSER_QA_LCP_GOOD_MS;
  const clsPass =
    Number.isFinite(clsNum) && clsNum >= 0 && clsNum <= BROWSER_QA_CLS_GOOD;
  return {
    lcpMs: Number.isFinite(lcpNum) ? lcpNum : lcpMs,
    cls: Number.isFinite(clsNum) ? clsNum : cls,
    lcpPass,
    clsPass,
    pass: lcpPass && clsPass
  };
}

/**
 * Evaluate a11y scan against WCAG 2.1 AA (pass iff zero violations; non-array fail-closed).
 * @param {{ violations?: * }} scan
 * @returns {{ standard: string, violationCount: number, pass: boolean, violations?: * }}
 */
export function evaluateA11y({ violations } = {}) {
  if (!Array.isArray(violations)) {
    return {
      standard: BROWSER_QA_A11Y_STANDARD,
      violationCount: -1,
      pass: false
    };
  }
  return {
    standard: BROWSER_QA_A11Y_STANDARD,
    violationCount: violations.length,
    pass: violations.length === 0
  };
}

/**
 * @param {*} err
 * @returns {BrowserQaRunnerError}
 */
function wrapClientError(err) {
  if (err instanceof BrowserQaRunnerError) return err;
  const code = err && err.code ? String(err.code) : 'BROWSER_QA_CLIENT_ERROR';
  const message = String(err && err.message ? err.message : err);
  return new BrowserQaRunnerError(message, code, {
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
  const ms = Number.isFinite(timeoutMs) ? timeoutMs : BROWSER_QA_TIMEOUT_MS;
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new BrowserQaRunnerError(
              `TIMEOUT: Browser QA request exceeded ${ms}ms`,
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
 * Validate url: non-empty http(s), about:blank, or file: for hermetic mocks.
 * @param {*} url
 * @returns {string}
 */
function assertUrl(url) {
  if (url == null || typeof url !== 'string' || !String(url).trim()) {
    throw new BrowserQaRunnerError(
      'URL_REQUIRED: url must be a non-empty string',
      'URL_REQUIRED'
    );
  }
  const trimmed = String(url).trim();
  const lower = trimmed.toLowerCase();
  const ok =
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower === 'about:blank' ||
    lower.startsWith('file:');
  if (!ok) {
    throw new BrowserQaRunnerError(
      `URL_INVALID: url must be http(s), about:blank, or file: (got '${trimmed}')`,
      'URL_INVALID',
      { url: trimmed }
    );
  }
  return trimmed;
}

/**
 * Resolve clientImpl fail-closed for hermetic CI.
 * Live path requires BROWSER_QA_ALLOW_LIVE=true (still needs a real clientImpl
 * from the caller — no network by default).
 * @param {object|undefined} clientImpl
 * @returns {object}
 */
function resolveClientImpl(clientImpl) {
  if (clientImpl && typeof clientImpl === 'object') {
    return clientImpl;
  }
  const allowLive = process.env.BROWSER_QA_ALLOW_LIVE === 'true';
  throw new BrowserQaRunnerError(
    allowLive
      ? 'CLIENT_IMPL_REQUIRED: BROWSER_QA_ALLOW_LIVE=true but no clientImpl provided'
      : 'CLIENT_IMPL_REQUIRED: inject clientImpl for hermetic use, or set BROWSER_QA_ALLOW_LIVE=true with a live clientImpl',
    'CLIENT_IMPL_REQUIRED'
  );
}

/**
 * Ensure required client methods exist.
 * @param {object} client
 */
function assertClientMethods(client) {
  for (const method of REQUIRED_CLIENT_METHODS) {
    if (typeof client[method] !== 'function') {
      throw new BrowserQaRunnerError(
        `CLIENT_METHOD_MISSING: clientImpl.${method} is required`,
        'CLIENT_METHOD_MISSING',
        { method }
      );
    }
  }
}

/**
 * Build screenshot receipt from captureScreenshot result (no raw bytes in return).
 * @param {*} shot
 * @returns {{ mimeType: string, byteLength: number, sha256: string, capturedAt: string }}
 */
function buildScreenshotReceipt(shot) {
  if (!shot || typeof shot !== 'object') {
    throw new BrowserQaRunnerError(
      'SCREENSHOT_INVALID: captureScreenshot must return an object',
      'SCREENSHOT_INVALID'
    );
  }
  const mimeType =
    typeof shot.mimeType === 'string' && shot.mimeType.trim()
      ? shot.mimeType.trim()
      : 'image/png';

  let bytes;
  if (Buffer.isBuffer(shot.buffer)) {
    bytes = shot.buffer;
  } else if (shot.buffer instanceof Uint8Array) {
    bytes = Buffer.from(shot.buffer);
  } else if (typeof shot.base64 === 'string') {
    bytes = Buffer.from(shot.base64, 'base64');
  } else if (typeof shot.data === 'string') {
    bytes = Buffer.from(shot.data, 'base64');
  } else {
    throw new BrowserQaRunnerError(
      'SCREENSHOT_INVALID: captureScreenshot must provide base64 or buffer',
      'SCREENSHOT_INVALID'
    );
  }

  return {
    mimeType,
    byteLength: bytes.byteLength,
    sha256: sha256Hex(bytes),
    capturedAt: new Date().toISOString()
  };
}

/**
 * Run browser QA: navigate → CWV → a11y → screenshot under a shared timeout budget.
 *
 * Soft QA fails (CWV/a11y) return ok:false + custody FAILED.
 * Infra errors throw BrowserQaRunnerError.
 *
 * @param {object} opts
 * @param {string} opts.url
 * @param {object} [opts.clientImpl]
 * @param {number} [opts.timeoutMs]
 * @param {object} [opts.viewport]
 * @returns {Promise<object>}
 */
export async function runBrowserQa({
  url,
  clientImpl,
  timeoutMs = BROWSER_QA_TIMEOUT_MS,
  viewport
} = {}) {
  const validatedUrl = assertUrl(url);
  const client = resolveClientImpl(clientImpl);
  assertClientMethods(client);

  const hashOptions = {};
  if (viewport !== undefined) hashOptions.viewport = viewport;
  if (timeoutMs !== undefined && timeoutMs !== BROWSER_QA_TIMEOUT_MS) {
    hashOptions.timeoutMs = timeoutMs;
  }
  const input_hash = hashBrowserQaInput(validatedUrl, hashOptions);
  const started = Date.now();
  const budgetMs = Number.isFinite(timeoutMs) ? timeoutMs : BROWSER_QA_TIMEOUT_MS;

  const remaining = () => {
    const left = budgetMs - (Date.now() - started);
    return left > 0 ? left : 0;
  };

  let navigateResult;
  let cwvRaw;
  let a11yRaw;
  let shotRaw;

  try {
    navigateResult = await withTimeout(client.navigate(validatedUrl), remaining());
    cwvRaw = await withTimeout(client.collectCwv(), remaining());
    a11yRaw = await withTimeout(client.runA11yScan(), remaining());
    shotRaw = await withTimeout(client.captureScreenshot(), remaining());
  } catch (err) {
    throw wrapClientError(err);
  }

  const cwv = evaluateCwv(cwvRaw && typeof cwvRaw === 'object' ? cwvRaw : {});
  const violations =
    a11yRaw && typeof a11yRaw === 'object' && Array.isArray(a11yRaw.violations)
      ? a11yRaw.violations
      : a11yRaw && typeof a11yRaw === 'object'
        ? a11yRaw.violations
        : undefined;
  const a11yEval = evaluateA11y({ violations });
  const a11y = {
    standard: BROWSER_QA_A11Y_STANDARD,
    violations: Array.isArray(violations) ? violations : [],
    violationCount: a11yEval.violationCount < 0 ? 0 : a11yEval.violationCount,
    pass: a11yEval.pass
  };

  let screenshot;
  try {
    screenshot = buildScreenshotReceipt(shotRaw);
  } catch (err) {
    throw wrapClientError(err);
  }

  // navigateResult reserved for future diagnostics; soft QA uses cwv/a11y only
  void navigateResult;

  const ok = Boolean(cwv.pass && a11y.pass && screenshot && screenshot.sha256);
  const duration_ms = Date.now() - started;

  return {
    ok,
    url: validatedUrl,
    cwv,
    a11y,
    screenshot,
    custody: {
      tool: 'browser_qa_run',
      input_hash,
      duration_ms,
      status: ok ? 'VERIFIED' : 'FAILED',
      PRODUCTION_READY: 'NO'
    }
  };
}

// ---------------------------------------------------------------------------
// SPEC-0018 Mission M — Native tool bridge surface (mirrors stitch-tool-bridge)
// Soft QA failures stay return-shaped (ok:false); only infra throws.
// ---------------------------------------------------------------------------

export const BROWSER_QA_TOOL_NAMES = Object.freeze(['browser_qa_run']);

const BROWSER_QA_TOOL_DESCRIPTIONS = Object.freeze({
  browser_qa_run: {
    name: 'browser_qa_run',
    description:
      'Run autonomous Browser QA (navigate → CWV → a11y → screenshot) against a URL via injectable clientImpl.',
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
          description: 'Target URL (http(s), about:blank, or file: for hermetic mocks)'
        },
        viewport: {
          type: 'object',
          description: 'Optional viewport hint passed through to hashing/client'
        },
        timeoutMs: {
          type: 'number',
          description: 'Optional per-call timeout override (ms)'
        }
      }
    }
  }
});

/**
 * @returns {{ name: string, description: string, inputSchema: object }[]}
 */
export function listBrowserQaTools() {
  return BROWSER_QA_TOOL_NAMES.map((name) => ({
    ...BROWSER_QA_TOOL_DESCRIPTIONS[name]
  }));
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isBrowserQaToolName(name) {
  return BROWSER_QA_TOOL_NAMES.includes(String(name || ''));
}

/**
 * Execute a native Browser QA tool via runBrowserQa.
 * Soft QA (CWV/a11y) returns ok:false without throw.
 * Infra errors throw BrowserQaRunnerError.
 *
 * @param {object} opts
 * @param {string} opts.toolName
 * @param {object} [opts.arguments]
 * @param {object} [opts.clientImpl]
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<object>} runBrowserQa result (ok, cwv, a11y, screenshot, custody)
 */
export async function executeBrowserQaTool({
  toolName,
  arguments: args = {},
  clientImpl,
  timeoutMs = BROWSER_QA_TIMEOUT_MS
} = {}) {
  const name = String(toolName || '');
  if (!isBrowserQaToolName(name)) {
    throw new BrowserQaRunnerError(
      `UNKNOWN_BROWSER_QA_TOOL: '${name}' is not a Browser QA tool`,
      'UNKNOWN_BROWSER_QA_TOOL'
    );
  }
  const a = args && typeof args === 'object' ? args : {};
  return runBrowserQa({
    url: a.url,
    clientImpl,
    timeoutMs: a.timeoutMs != null ? a.timeoutMs : timeoutMs,
    viewport: a.viewport
  });
}
