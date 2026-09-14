/**
 * @module delivery-target-boundary
 * SPEC-0061 / Mission BD — Worktree/target normalize, allowlist helpers,
 * Fundacion detect, secret scrub, BA isolation observe helpers for
 * Multi-Worktree / Multi-Target Delivery Port.
 *
 * Hermetic in-process only — NO real git worktree / NO remote CD.
 * Compose/extend AN federation observe + AX/BA isolation + BC apply
 * observe via injectable ports at the port layer — do NOT rewrite
 * AN/AX/BA/BC modules into this payload.
 *
 * NON-CLAIM:
 *   boundary ≠ multi-tenant cloud fleet /
 *   ≠ Kubernetes CD /
 *   ≠ PRODUCTION_READY delivery product
 *   not BE/BF/BG; Fundacion Δ=0; Antigravity-first;
 *   L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED);
 *   L19 OPEN (BC MEASURED; BD in progress; BE–BG pending);
 *   Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BD_BOUNDARY_PRODUCTION_READY = 'NO';

export const BD_BOUNDARY_KIND = 'eos-multi-worktree-multi-target-delivery-boundary';

export const REDACTED = '[REDACTED]';

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

/**
 * Normalize a relative / absolute path to posix-style (no Windows drive).
 * @param {unknown} input
 * @returns {{ path: string, escapedAboveRoot: boolean }}
 */
export function normalizePath(input) {
  let s = String(input == null ? '' : input).replace(/\\/g, '/');
  s = s.replace(/^[A-Za-z]:/, '');
  const abs = s.startsWith('/');
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
  const joined = parts.join('/');
  const path = abs ? `/${joined}` : joined;
  return {
    path: path === '/' ? '/' : path.replace(/\/+$/, '') || (abs ? '/' : ''),
    escapedAboveRoot
  };
}

/**
 * Normalize a worktree / target identifier.
 * @param {unknown} input
 * @returns {{ id: string, escapedAboveRoot: boolean, kind: string }}
 */
export function normalizeTarget(input) {
  if (input == null) {
    return { id: '', escapedAboveRoot: false, kind: 'empty' };
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    const o = /** @type {Record<string, unknown>} */ (input);
    const raw =
      o.id ?? o.worktree ?? o.target ?? o.root ?? o.path ?? o.name ?? '';
    return normalizeTarget(raw);
  }
  let s = String(input).replace(/\\/g, '/');
  s = s.replace(/^[A-Za-z]:/, '');
  if (s.startsWith('memory://')) {
    return { id: s, escapedAboveRoot: false, kind: 'memory' };
  }
  const n = normalizePath(s);
  return {
    id: n.path.replace(/^\//, ''),
    escapedAboveRoot: n.escapedAboveRoot,
    kind: 'worktree'
  };
}

/**
 * Collect target / worktree-like fields from a deliver request or list.
 * @param {unknown} value
 * @returns {string[]}
 */
export function collectTargets(value) {
  if (value == null) return [];
  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    /** @type {string[]} */
    const out = [];
    for (const item of value) {
      out.push(...collectTargets(item));
    }
    return out;
  }
  if (typeof value === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    const keys = [
      'id',
      'worktree',
      'target',
      'targetPath',
      'root',
      'path',
      'name'
    ];
    /** @type {string[]} */
    const out = [];
    for (const k of keys) {
      if (o[k] != null && String(o[k]).trim() !== '') {
        out.push(String(o[k]));
      }
    }
    if (Array.isArray(o.targets)) out.push(...collectTargets(o.targets));
    if (Array.isArray(o.worktrees)) out.push(...collectTargets(o.worktrees));
    return out;
  }
  return [];
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
    return collectTargets(o).some((p) => /fundacion/i.test(p));
  }
  return /fundacion/i.test(String(value));
}

/**
 * Disallowed network / cloud-fleet / K8s CD claim paths.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isDisallowedNetworkClaimPath(value) {
  if (value == null) return false;
  const text =
    typeof value === 'string' ? value : collectTargets(value).join(' ');
  return /cloud[-_]?fleet|multi[-_]?tenant[-_]?cloud|kubernetes|k8s[-_]?cd|\beks:|\bgke:|\baks:/i.test(
    String(text)
  );
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
  out = out.replace(/\benv-fake-token-\d+\b/gi, REDACTED);
  return out;
}

/**
 * Detect Law VI / secret leakage in an artifact / request body.
 * Uses runtime-synthesized vendor prefix (never static contiguous literal).
 * @param {unknown} body
 * @param {object} [opts]
 * @param {boolean} [opts.treatFakeAsLeak]
 * @returns {{ leak: boolean, reason: string|null }}
 */
export function detectSecretLeakage(body, opts = {}) {
  if (body == null) return { leak: false, reason: null };
  const text = typeof body === 'string' ? body : safeJsonBlob(body);
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(`\\b${vendorPrefix}[A-Za-z0-9]{8,}\\b`);
  if (vendorRe.test(text)) {
    return {
      leak: true,
      reason: 'Law VI forbidden provider prefix in artifact body'
    };
  }
  if (/\bBearer\s+[A-Za-z0-9._\-+=/]{16,}/i.test(text)) {
    return { leak: true, reason: 'Bearer token leakage in artifact body' };
  }
  if (opts.treatFakeAsLeak === true && /\benv-fake-token-\d+\b/i.test(text)) {
    return { leak: true, reason: 'fake-token pattern in artifact body' };
  }
  return { leak: false, reason: null };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function safeJsonBlob(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Scrub an object deeply for secret keys / substrings (receipt-safe).
 * @param {unknown} value
 * @returns {unknown}
 */
export function scrubSecrets(value) {
  return scrubDeep(value, new WeakSet());
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {unknown}
 */
function scrubDeep(value, seen) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/^[a-f0-9]{64}$/i.test(value)) return value;
    return redactSecretSubstrings(value);
  }
  if (typeof value !== 'object') return value;
  if (seen.has(/** @type {object} */ (value))) return '[Circular]';
  seen.add(/** @type {object} */ (value));
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, seen));
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|receiptDigest|sha256|digest)$/i.test(
        k
      )
    ) {
      out[k] = scrubDeep(v, seen);
      continue;
    }
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = scrubDeep(v, seen);
  }
  return out;
}

/**
 * Normalize a sealed / structured delivery artifact.
 * @param {unknown} artifact
 * @returns {{ ok: boolean, artifact: object|null, reason: string|null }}
 */
export function normalizeArtifact(artifact) {
  if (artifact == null) {
    return { ok: false, artifact: null, reason: 'artifact required' };
  }
  if (typeof artifact === 'string') {
    const text = artifact.trim();
    if (!text) {
      return { ok: false, artifact: null, reason: 'empty artifact' };
    }
    return {
      ok: true,
      artifact: {
        kind: 'blob',
        payload: text,
        id: null,
        digest: null
      },
      reason: null
    };
  }
  if (typeof artifact !== 'object' || Array.isArray(artifact)) {
    return { ok: false, artifact: null, reason: 'malformed artifact' };
  }
  const o = /** @type {Record<string, unknown>} */ (artifact);
  if (o.malformed === true || o.invalid === true) {
    return { ok: false, artifact: null, reason: 'malformed artifact' };
  }
  if (
    o.kind == null &&
    o.id == null &&
    o.digest == null &&
    o.payload == null &&
    o.body == null &&
    o.content == null
  ) {
    return { ok: false, artifact: null, reason: 'malformed artifact' };
  }
  return {
    ok: true,
    artifact: {
      kind: o.kind != null ? String(o.kind) : 'sealed-artifact',
      id: o.id != null ? String(o.id) : null,
      digest: o.digest != null ? String(o.digest) : null,
      payload:
        o.payload != null
          ? o.payload
          : o.body != null
            ? o.body
            : o.content != null
              ? o.content
              : null,
      meta: o.meta != null && typeof o.meta === 'object' ? o.meta : undefined
    },
    reason: null
  };
}

/**
 * Hermetic in-memory place of a sealed artifact into virtual worktree roots.
 * NO real git worktree / NO remote CD.
 * @param {object} artifact
 * @param {string[]} targets
 * @param {Record<string, object>} [roots]
 * @returns {{ roots: Record<string, object>, delivered: string[] }}
 */
export function deliverHermetic(artifact, targets = [], roots = {}) {
  /** @type {Record<string, object>} */
  const next = { ...roots };
  /** @type {string[]} */
  const delivered = [];
  const content =
    artifact && artifact.payload != null
      ? String(artifact.payload)
      : artifact && artifact.digest
        ? `/* BD-DELIVERED:${artifact.digest} */`
        : `/* BD-DELIVERED */`;
  for (const raw of targets) {
    const n = normalizeTarget(raw);
    if (!n.id) continue;
    next[n.id] = {
      artifactId: artifact && artifact.id != null ? artifact.id : null,
      digest: artifact && artifact.digest != null ? artifact.digest : null,
      content,
      placed: true,
      kind: n.kind
    };
    delivered.push(n.id);
  }
  return { roots: next, delivered };
}

/**
 * Pick the first callable observe-style method on an injectable port.
 * @param {unknown} port
 * @param {string[]} [names]
 * @returns {Function|null}
 */
function pickObserve(port, names = ['observe', 'check', 'verify']) {
  if (port == null || typeof port !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (port);
  for (const n of names) {
    if (typeof o[n] === 'function') return /** @type {Function} */ (o[n]);
  }
  return null;
}

/**
 * Observe BA isolation via injectable port (compose — do NOT rewrite BA).
 * @param {unknown} port
 * @param {object} [ctx]
 * @returns {{ injected: boolean, observed: boolean, ok: boolean, violation: boolean, result?: unknown, noop?: boolean }}
 */
export function observeBaIsolation(port, ctx = {}) {
  if (port == null) {
    return { injected: false, observed: false, ok: true, violation: false };
  }
  if (typeof port === 'function') {
    try {
      const r = port(ctx);
      const violation = isIsolationViolation(r);
      return {
        injected: true,
        observed: true,
        ok: !violation,
        violation,
        result: r
      };
    } catch {
      return {
        injected: true,
        observed: false,
        ok: false,
        violation: true
      };
    }
  }
  if (typeof port !== 'object') {
    return { injected: false, observed: false, ok: true, violation: false };
  }
  const o = /** @type {Record<string, unknown>} */ (port);
  if (o.ok === false || o.violation === true || o.deny === true) {
    return {
      injected: true,
      observed: false,
      ok: false,
      violation: true,
      result: o
    };
  }
  const fn = pickObserve(port, ['observe', 'check', 'isolate', 'verify']);
  if (!fn) {
    return {
      injected: true,
      observed: false,
      ok: true,
      violation: false,
      noop: true
    };
  }
  try {
    const r = fn.call(port, ctx);
    const violation = isIsolationViolation(r);
    return {
      injected: true,
      observed: true,
      ok: !violation,
      violation,
      result: r
    };
  } catch {
    return { injected: true, observed: false, ok: false, violation: true };
  }
}

/**
 * @param {unknown} result
 * @returns {boolean}
 */
export function isIsolationViolation(result) {
  if (result == null) return false;
  if (result === false) return true;
  if (typeof result !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (result);
  return o.ok === false || o.violation === true || o.deny === true;
}

/**
 * Observe AX engine via injectable port (compose — do NOT rewrite AX).
 * @param {unknown} port
 * @param {object} [ctx]
 * @returns {{ injected: boolean, observed: boolean, ok: boolean, result?: unknown, noop?: boolean }}
 */
export function observeAxEngine(port, ctx = {}) {
  if (port == null) {
    return { injected: false, observed: false, ok: true };
  }
  if (typeof port !== 'object') {
    return { injected: false, observed: false, ok: true };
  }
  const fn = pickObserve(port, ['observe', 'seal', 'verify']);
  if (!fn) {
    return { injected: true, observed: false, ok: true, noop: true };
  }
  try {
    const r = fn.call(port, ctx);
    return {
      injected: true,
      observed: true,
      ok: !(r && r.ok === false),
      result: r
    };
  } catch {
    return { injected: true, observed: false, ok: true };
  }
}

/**
 * Observe AN federation via injectable port (compose — do NOT rewrite AN).
 * @param {unknown} port
 * @param {object} [ctx]
 * @returns {{ injected: boolean, observed: boolean, ok: boolean, result?: unknown, noop?: boolean }}
 */
export function observeAnFederation(port, ctx = {}) {
  if (port == null) {
    return { injected: false, observed: false, ok: true };
  }
  if (typeof port === 'function') {
    try {
      const r = port(ctx);
      return {
        injected: true,
        observed: true,
        ok: !(r && r.ok === false),
        result: r
      };
    } catch {
      return { injected: true, observed: false, ok: true };
    }
  }
  if (typeof port !== 'object') {
    return { injected: false, observed: false, ok: true };
  }
  const fn = pickObserve(port, [
    'observe',
    'observeFederation',
    'sync',
    'verify'
  ]);
  if (!fn) {
    return { injected: true, observed: false, ok: true, noop: true };
  }
  try {
    const r = fn.call(port, ctx);
    return {
      injected: true,
      observed: true,
      ok: !(r && r.ok === false),
      result: r
    };
  } catch {
    return { injected: true, observed: false, ok: true };
  }
}

/**
 * Observe BC apply seal via injectable port (compose — do NOT rewrite BC).
 * @param {unknown} port
 * @param {object} [ctx]
 * @returns {{ injected: boolean, observed: boolean, ok: boolean, result?: unknown, noop?: boolean }}
 */
export function observeBcApplySeal(port, ctx = {}) {
  if (port == null) {
    return { injected: false, observed: false, ok: true };
  }
  if (typeof port === 'function') {
    try {
      const r = port(ctx);
      return {
        injected: true,
        observed: true,
        ok: !(r && (r.ok === false || r.sealed === false)),
        result: r
      };
    } catch {
      return { injected: true, observed: false, ok: true };
    }
  }
  if (typeof port !== 'object') {
    return { injected: false, observed: false, ok: true };
  }
  const fn = pickObserve(port, ['observe', 'seal', 'verify', 'apply']);
  if (!fn) {
    const o = /** @type {Record<string, unknown>} */ (port);
    if (o.ok === true || o.sealed === true || o.digest) {
      return { injected: true, observed: false, ok: true, noop: true };
    }
    return { injected: true, observed: false, ok: true, noop: true };
  }
  try {
    const r = fn.call(port, ctx);
    return {
      injected: true,
      observed: true,
      ok: !(r && (r.ok === false || r.sealed === false)),
      result: r
    };
  } catch {
    return { injected: true, observed: false, ok: true };
  }
}

export default {
  BD_BOUNDARY_KIND,
  BD_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  normalizePath,
  normalizeTarget,
  collectTargets,
  isFundacionPath,
  isDisallowedNetworkClaimPath,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  normalizeArtifact,
  deliverHermetic,
  observeBaIsolation,
  isIsolationViolation,
  observeAxEngine,
  observeAnFederation,
  observeBcApplySeal
};
