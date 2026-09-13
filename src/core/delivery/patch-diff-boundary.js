/**
 * @module patch-diff-boundary
 * SPEC-0060 / Mission BC — Path normalize, allowlist check helpers,
 * Fundacion detect, secret scrub for Governed Patch / Diff Apply Port.
 *
 * Hermetic in-process only — NO real git apply / NO GH API.
 * Compose/extend AX seals + AQ notarization observe via injectable ports
 * at the port layer — do NOT rewrite AX/AQ modules into this payload.
 *
 * NON-CLAIM:
 *   boundary ≠ unsupervised auto-merge SaaS /
 *   ≠ GH Actions replacement /
 *   ≠ PRODUCTION_READY delivery product
 *   not BD/BE/BF/BG; Fundacion Δ=0; Antigravity-first;
 *   L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED);
 *   L19 OPEN; Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BC_BOUNDARY_PRODUCTION_READY = 'NO';

export const BC_BOUNDARY_KIND = 'eos-governed-patch-diff-boundary';

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
 * Collect target / path-like fields from a patch request or target list.
 * @param {unknown} value
 * @returns {string[]}
 */
export function collectTargetPaths(value) {
  if (value == null) return [];
  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    /** @type {string[]} */
    const out = [];
    for (const item of value) {
      out.push(...collectTargetPaths(item));
    }
    return out;
  }
  if (typeof value === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    const keys = [
      'path',
      'target',
      'targetPath',
      'file',
      'filePath',
      'writePath',
      'artifactPath'
    ];
    /** @type {string[]} */
    const out = [];
    for (const k of keys) {
      if (o[k] != null && String(o[k]).trim() !== '') {
        out.push(String(o[k]));
      }
    }
    if (Array.isArray(o.targets)) out.push(...collectTargetPaths(o.targets));
    if (Array.isArray(o.files)) out.push(...collectTargetPaths(o.files));
    if (Array.isArray(o.hunks)) {
      for (const h of o.hunks) {
        out.push(...collectTargetPaths(h));
      }
    }
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
    return collectTargetPaths(o).some((p) => /fundacion/i.test(p));
  }
  return /fundacion/i.test(String(value));
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
 * Detect Law VI / secret leakage in a patch body string.
 * Uses runtime-synthesized vendor prefix (never static contiguous literal).
 * Also DENY on bare env-fake-token patterns when treatFakeAsLeak=true.
 * @param {unknown} body
 * @param {object} [opts]
 * @param {boolean} [opts.treatFakeAsLeak]
 * @returns {{ leak: boolean, reason: string|null }}
 */
export function detectSecretLeakage(body, opts = {}) {
  if (body == null) return { leak: false, reason: null };
  const text =
    typeof body === 'string' ? body : safeJsonBlob(body);
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(`\\b${vendorPrefix}[A-Za-z0-9]{8,}\\b`);
  if (vendorRe.test(text)) {
    return { leak: true, reason: 'Law VI forbidden provider prefix in patch body' };
  }
  if (/\bBearer\s+[A-Za-z0-9._\-+=/]{16,}/i.test(text)) {
    return { leak: true, reason: 'Bearer token leakage in patch body' };
  }
  if (opts.treatFakeAsLeak === true && /\benv-fake-token-\d+\b/i.test(text)) {
    return { leak: true, reason: 'fake-token pattern in patch body' };
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
 * Normalize a structured or unified-diff-like patch into a plain object.
 * @param {unknown} patch
 * @returns {{ ok: boolean, patch: object|null, reason: string|null }}
 */
export function normalizePatch(patch) {
  if (patch == null) {
    return { ok: false, patch: null, reason: 'patch required' };
  }
  if (typeof patch === 'string') {
    const text = patch.trim();
    if (!text) {
      return { ok: false, patch: null, reason: 'empty patch' };
    }
    // Minimal unified-diff acceptance: must mention --- / +++ or diff --git
    const looksUnified =
      /^diff --git /m.test(text) ||
      (/^--- /m.test(text) && /^\+\+\+ /m.test(text));
    if (!looksUnified && !text.includes('@@')) {
      return { ok: false, patch: null, reason: 'malformed unified diff' };
    }
    const paths = extractUnifiedPaths(text);
    return {
      ok: true,
      patch: {
        kind: 'unified-diff',
        text,
        targets: paths,
        hunks: paths.map((p) => ({ path: p }))
      },
      reason: null
    };
  }
  if (typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, patch: null, reason: 'malformed patch' };
  }
  const o = /** @type {Record<string, unknown>} */ (patch);
  if (o.malformed === true || o.invalid === true) {
    return { ok: false, patch: null, reason: 'malformed patch' };
  }
  const targets = collectTargetPaths(o);
  if (
    o.kind == null &&
    o.text == null &&
    o.diff == null &&
    o.hunks == null &&
    o.files == null &&
    targets.length === 0 &&
    o.ops == null
  ) {
    return { ok: false, patch: null, reason: 'malformed patch' };
  }
  return {
    ok: true,
    patch: {
      kind: o.kind != null ? String(o.kind) : 'structured',
      text: o.text != null ? String(o.text) : o.diff != null ? String(o.diff) : null,
      targets,
      hunks: Array.isArray(o.hunks) ? o.hunks : targets.map((p) => ({ path: p })),
      ops: Array.isArray(o.ops) ? o.ops : undefined,
      meta: o.meta != null && typeof o.meta === 'object' ? o.meta : undefined
    },
    reason: null
  };
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractUnifiedPaths(text) {
  /** @type {string[]} */
  const out = [];
  const re = /^\+\+\+\s+(?:b\/)?(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const p = String(m[1]).trim();
    if (p && p !== '/dev/null') out.push(p.replace(/\\/g, '/'));
  }
  if (out.length === 0) {
    const re2 = /^diff --git\s+a\/(.+?)\s+b\/(.+)$/gm;
    while ((m = re2.exec(text)) !== null) {
      out.push(String(m[2]).trim().replace(/\\/g, '/'));
    }
  }
  return out;
}

/**
 * Apply a hermetic structured patch onto an in-memory filesystem map.
 * Only allowlisted relative paths under a virtual root may be written.
 * @param {object} patch
 * @param {Record<string, string>} fsMap
 * @param {string[]} targets
 * @returns {{ fs: Record<string, string>, applied: string[] }}
 */
export function applyHermeticPatch(patch, fsMap = {}, targets = []) {
  /** @type {Record<string, string>} */
  const fs = { ...fsMap };
  /** @type {string[]} */
  const applied = [];
  const paths =
    targets.length > 0
      ? targets
      : Array.isArray(patch.targets)
        ? patch.targets.map(String)
        : [];
  for (const raw of paths) {
    const rawS = String(raw).replace(/\\/g, '/');
    const n = rawS.startsWith('memory://')
      ? rawS
      : normalizePath(rawS).path.replace(/^\//, '');
    if (!n) continue;
    const existing = fs[n] != null ? String(fs[n]) : '';
    if (patch.text && typeof patch.text === 'string') {
      // Simulate apply: append a marker + keep prior content hermetically
      fs[n] = existing
        ? `${existing}\n/* BC-APPLIED */\n`
        : `/* BC-APPLIED:${n} */\n`;
    } else if (Array.isArray(patch.ops)) {
      for (const op of patch.ops) {
        if (!op || typeof op !== 'object') continue;
        const opPath = normalizePath(op.path || n).path.replace(/^\//, '');
        if (opPath !== n) continue;
        if (op.type === 'set' || op.op === 'set') {
          fs[n] = String(op.content ?? op.value ?? '');
        } else if (op.type === 'append' || op.op === 'append') {
          fs[n] = `${existing}${op.content ?? op.value ?? ''}`;
        } else {
          fs[n] = existing
            ? `${existing}\n/* BC-APPLIED */\n`
            : `/* BC-APPLIED:${n} */\n`;
        }
      }
      if (fs[n] == null) {
        fs[n] = `/* BC-APPLIED:${n} */\n`;
      }
    } else {
      fs[n] = existing
        ? `${existing}\n/* BC-APPLIED */\n`
        : `/* BC-APPLIED:${n} */\n`;
    }
    applied.push(n);
  }
  return { fs, applied };
}

export default {
  BC_BOUNDARY_KIND,
  BC_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  normalizePath,
  collectTargetPaths,
  isFundacionPath,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  normalizePatch,
  applyHermeticPatch
};
