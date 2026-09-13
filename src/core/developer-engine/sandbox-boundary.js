/**
 * @module sandbox-boundary
 * SPEC-0058 / Mission BA — Path prison + env-scrub helpers for Local
 * Sandboxed Container / Worker Isolation Port.
 *
 * Enforce: filesystem root prison (escape detection), env scrubbing.
 * Hermetic in-process only — no Docker daemon, no K8s client.
 *
 * Compose/extend L9/L10 compute-worker isolation lineage via injectable
 * interfaces at the port layer — do NOT rewrite compute-worker / AX/AY/AZ
 * into this payload.
 *
 * NON-CLAIM:
 *   boundary ≠ K8s multi-tenant cloud /
 *   ≠ managed container SaaS /
 *   ≠ CloudAgent remote fleet
 *   not BB; Fundacion Δ=0; Antigravity-first; L17 CLOSED; L18 OPEN;
 *   AX+AY+AZ MEASURED.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BA_BOUNDARY_PRODUCTION_READY = 'NO';

export const BA_BOUNDARY_KIND = 'eos-local-sandbox-boundary';

export const DEFAULT_ROOT_PRISON = '/prison';

export const REDACTED = '[REDACTED]';

/**
 * Default env keys that survive scrubbing (non-secret process surface).
 */
export const DEFAULT_KEEP_ENV = Object.freeze([
  'PATH',
  'HOME',
  'LANG',
  'TERM',
  'USER',
  'TMPDIR',
  'TMP',
  'TEMP',
  'NODE_ENV',
  'TZ',
  'PWD'
]);

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

/**
 * Normalize a path to posix-style absolute form (no Windows drive).
 * Does not throw. Returns { path, escapedAboveRoot }.
 * @param {unknown} input
 * @returns {{ path: string, escapedAboveRoot: boolean }}
 */
export function normalizeAbs(input) {
  let s = String(input == null ? '' : input).replace(/\\/g, '/');
  s = s.replace(/^[A-Za-z]:/, '');
  if (!s.startsWith('/')) s = `/${s}`;
  const parts = [];
  let escapedAboveRoot = false;
  for (const seg of s.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) {
        escapedAboveRoot = true;
      } else {
        parts.pop();
      }
    } else {
      parts.push(seg);
    }
  }
  const path = `/${parts.join('/')}`;
  return { path: path === '/' ? '/' : path.replace(/\/+$/, '') || '/', escapedAboveRoot };
}

/**
 * Normalize prison root to a stable absolute posix path.
 * @param {unknown} rootPrison
 * @returns {string}
 */
export function normalizePrisonPath(rootPrison) {
  const raw =
    rootPrison == null || String(rootPrison).trim() === ''
      ? DEFAULT_ROOT_PRISON
      : String(rootPrison);
  return normalizeAbs(raw).path;
}

/**
 * True iff candidate is the prison root or a descendant.
 * @param {string} candidate
 * @param {string} prison
 * @returns {boolean}
 */
export function isPathInsidePrison(candidate, prison) {
  const c = normalizeAbs(candidate).path;
  const p = normalizePrisonPath(prison);
  return c === p || c.startsWith(`${p}/`);
}

/**
 * Detect a path-escape attempt relative to the root prison.
 * Relative paths are resolved against the prison.
 * @param {unknown} targetPath
 * @param {unknown} rootPrison
 * @returns {{ escape: boolean, reason: string|null, candidate: string|null, prison: string }}
 */
export function detectEscape(targetPath, rootPrison) {
  const prison = normalizePrisonPath(rootPrison);
  if (targetPath == null || String(targetPath).trim() === '') {
    return { escape: false, reason: null, candidate: null, prison };
  }
  const raw = String(targetPath).replace(/\\/g, '/');
  if (raw.includes('\0')) {
    return {
      escape: true,
      reason: 'null-byte path',
      candidate: raw,
      prison
    };
  }
  const isAbs = raw.startsWith('/') || /^[A-Za-z]:/.test(String(targetPath));
  const joined = isAbs ? raw : `${prison}/${raw}`;
  const norm = normalizeAbs(joined);
  if (norm.escapedAboveRoot || !isPathInsidePrison(norm.path, prison)) {
    return {
      escape: true,
      reason: 'path outside root prison',
      candidate: norm.path,
      prison
    };
  }
  return {
    escape: false,
    reason: null,
    candidate: norm.path,
    prison
  };
}

/**
 * Collect path-like fields from a step for prison checks.
 * @param {object} step
 * @returns {string[]}
 */
export function collectStepPaths(step) {
  if (!step || typeof step !== 'object') return [];
  const keys = [
    'artifactPath',
    'targetPath',
    'cwd',
    'outputPath',
    'writePath',
    'path',
    'workdir'
  ];
  /** @type {string[]} */
  const out = [];
  for (const k of keys) {
    if (step[k] != null && String(step[k]).trim() !== '') {
      out.push(String(step[k]));
    }
  }
  return out;
}

/**
 * True if any collected path escapes the prison.
 * @param {object} step
 * @param {unknown} rootPrison
 * @returns {{ escape: boolean, reason: string|null, candidate: string|null, prison: string }}
 */
export function detectStepEscape(step, rootPrison) {
  const prison = normalizePrisonPath(rootPrison);
  const paths = collectStepPaths(step);
  for (const p of paths) {
    const d = detectEscape(p, prison);
    if (d.escape) return d;
  }
  return { escape: false, reason: null, candidate: null, prison };
}

/**
 * Fundacion path / write signal (ALWAYS DENY at the port).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isFundacionPath(value) {
  if (value == null) return false;
  if (typeof value === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    if (o.fundacion === true || o.writeFundacion === true) return true;
    return collectStepPaths(o).some((p) => /fundacion/i.test(p));
  }
  return /fundacion/i.test(String(value));
}

/**
 * Detect a network-egress attempt on a step (fail-closed: any egress).
 * @param {object} step
 * @returns {boolean}
 */
export function isNetworkAttempt(step) {
  if (!step || typeof step !== 'object') return false;
  if (
    step.network === true ||
    step.egress === true ||
    step.fetch === true ||
    step.connect === true
  ) {
    return true;
  }
  const action = String(step.action || step.kind || '').toLowerCase();
  if (
    /^(fetch|http|https|egress|connect|socket|dns|wget|curl)$/.test(action)
  ) {
    return true;
  }
  const blob = `${step.cmd || ''} ${step.command || ''} ${step.url || ''}`;
  if (/\b(curl|wget|fetch|nc\b|ncat)\b/i.test(blob)) return true;
  if (/https?:\/\//i.test(blob)) return true;
  return false;
}

/**
 * Privileged / breakout / host-mount policy escape (not a path escape).
 * @param {object} step
 * @returns {boolean}
 */
export function isPolicyEscape(step) {
  if (!step || typeof step !== 'object') return false;
  if (
    step.policyEscape === true ||
    step.privileged === true ||
    step.hostPid === true ||
    step.hostNetwork === true ||
    step.hostPath === true ||
    step.hostIpc === true ||
    step.capAdd === true ||
    step.mountHost === true ||
    step.disallowed === true
  ) {
    return true;
  }
  const action = String(step.action || '');
  if (/privileged|breakout|host-mount|sys_admin|cap-add|policy.?escape/i.test(action)) {
    return true;
  }
  return false;
}

/**
 * Redact secret-looking substrings. Vendor-style key prefixes built at
 * runtime via concat (never as static contiguous literals — Law VI).
 * @param {string} s
 * @returns {string}
 */
export function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(`\\b(${vendorPrefix}[A-Za-z0-9]{8,})\\b`, 'g');
  out = out.replace(vendorRe, REDACTED);
  out = out.replace(
    /\b(api[_-]?key|token|authorization|secret|password)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
    (_m, k) => `${k}=${REDACTED}`
  );
  return out;
}

/**
 * Scrub an env map: secret keys → REDACTED; values scanned for secrets.
 * @param {unknown} env
 * @returns {Record<string, string>}
 */
export function scrubEnv(env) {
  if (env == null || typeof env !== 'object' || Array.isArray(env)) {
    return {};
  }
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = redactSecretSubstrings(v == null ? '' : String(v));
  }
  return out;
}

/**
 * True if an env map has been scrubbed (no raw secret keys remain).
 * @param {Record<string, string>} env
 * @returns {boolean}
 */
export function isEnvScrubbed(env) {
  if (!env || typeof env !== 'object') return true;
  for (const [k, v] of Object.entries(env)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      if (v !== REDACTED) return false;
    }
  }
  return true;
}

export default {
  BA_BOUNDARY_KIND,
  BA_BOUNDARY_PRODUCTION_READY,
  DEFAULT_ROOT_PRISON,
  DEFAULT_KEEP_ENV,
  REDACTED,
  normalizeAbs,
  normalizePrisonPath,
  isPathInsidePrison,
  detectEscape,
  collectStepPaths,
  detectStepEscape,
  isFundacionPath,
  isNetworkAttempt,
  isPolicyEscape,
  redactSecretSubstrings,
  scrubEnv,
  isEnvScrubbed
};
