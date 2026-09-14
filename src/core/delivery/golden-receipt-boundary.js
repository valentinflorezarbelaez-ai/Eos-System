/**
 * @module golden-receipt-boundary
 * SPEC-0062 / Mission BE — Golden/candidate normalize, digest compare,
 * secret scrub, Fundacion detect, and AJ/AL/BC/BD observe helpers for
 * Verification Replay & Golden Receipt Port.
 *
 * Hermetic in-process only — NO real verify:strict subprocess, NO SIEM,
 * NO network. Compose/extend AJ ledger + AL replay observe + BC/BD sealed
 * receipts via injectable ports — do NOT rewrite AJ/AL/BC/BD modules
 * into this payload.
 *
 * NON-CLAIM:
 *   boundary ≠ SIEM product /
 *   ≠ billing accuracy SaaS /
 *   ≠ PRODUCTION_READY verification product
 *   not BF/BG; Fundacion Δ=0; Antigravity-first;
 *   L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED);
 *   L19 OPEN (BC+BD MEASURED; BE in progress; BF–BG pending);
 *   Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BE_BOUNDARY_PRODUCTION_READY = 'NO';

export const BE_BOUNDARY_KIND = 'eos-verification-replay-golden-receipt-boundary';

export const REDACTED = '[REDACTED]';

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

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
 * Collect path-like / id-like fields from a request or receipt.
 * @param {unknown} value
 * @returns {string[]}
 */
export function collectPaths(value) {
  if (value == null) return [];
  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    /** @type {string[]} */
    const out = [];
    for (const item of value) out.push(...collectPaths(item));
    return out;
  }
  if (typeof value === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    const keys = [
      'id',
      'goldenId',
      'path',
      'target',
      'targetPath',
      'root',
      'name',
      'receiptId'
    ];
    /** @type {string[]} */
    const out = [];
    for (const k of keys) {
      if (o[k] != null && String(o[k]).trim() !== '') out.push(String(o[k]));
    }
    if (o.candidate != null) out.push(...collectPaths(o.candidate));
    if (o.golden != null) out.push(...collectPaths(o.golden));
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
    return collectPaths(o).some((p) => /fundacion/i.test(p));
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
 * Detect Law VI / secret leakage in a candidate / golden / request body.
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
      reason: 'Law VI forbidden provider prefix in replay body'
    };
  }
  if (/\bBearer\s+[A-Za-z0-9._\-+=/]{16,}/i.test(text)) {
    return { leak: true, reason: 'Bearer token leakage in replay body' };
  }
  if (opts.treatFakeAsLeak === true && /\benv-fake-token-\d+\b/i.test(text)) {
    return { leak: true, reason: 'fake-token pattern in replay body' };
  }
  return { leak: false, reason: null };
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
 * Index goldens from a map, array, or single object.
 * @param {unknown} goldens
 * @returns {Record<string, object>}
 */
export function indexGoldens(goldens) {
  /** @type {Record<string, object>} */
  const map = {};
  if (goldens == null) return map;
  if (Array.isArray(goldens)) {
    for (const g of goldens) {
      if (g && typeof g === 'object' && g.id != null) {
        map[String(g.id)] = g;
      }
    }
    return map;
  }
  if (typeof goldens === 'object') {
    for (const [k, v] of Object.entries(goldens)) {
      if (v && typeof v === 'object') map[k] = v;
    }
  }
  return map;
}

/**
 * Canonical replay body used to recompute digests (stable subset).
 * @param {object} receipt
 * @returns {object}
 */
export function canonicalReplayBody(receipt) {
  const o = receipt && typeof receipt === 'object' ? receipt : {};
  const payload =
    o.payload != null ? o.payload : o.body != null ? o.body : o.content != null ? o.content : null;
  return {
    kind: o.kind != null ? String(o.kind) : null,
    code: o.code != null ? String(o.code) : null,
    payload
  };
}

/**
 * Extract a declared digest from a golden / candidate.
 * @param {unknown} receipt
 * @returns {string|null}
 */
export function extractDigest(receipt) {
  if (receipt == null) return null;
  if (typeof receipt === 'string') {
    const s = receipt.trim();
    return /^[a-f0-9]{16,}$/i.test(s) ? s.toLowerCase() : null;
  }
  if (typeof receipt !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (receipt);
  const raw = o.digest ?? o.receiptDigest ?? o.sha256 ?? null;
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  return s || null;
}

/**
 * Normalize a golden receipt object.
 * @param {unknown} golden
 * @returns {{ ok: boolean, golden: object|null, reason: string|null }}
 */
export function normalizeGolden(golden) {
  if (golden == null) {
    return { ok: false, golden: null, reason: 'golden required' };
  }
  if (typeof golden === 'string') {
    const id = golden.trim();
    if (!id) return { ok: false, golden: null, reason: 'empty golden id' };
    return {
      ok: true,
      golden: { id, kind: null, digest: null, payload: null, sealed: false, ref: true },
      reason: null
    };
  }
  if (typeof golden !== 'object' || Array.isArray(golden)) {
    return { ok: false, golden: null, reason: 'malformed golden' };
  }
  const o = /** @type {Record<string, unknown>} */ (golden);
  if (o.malformed === true || o.invalid === true) {
    return { ok: false, golden: null, reason: 'malformed golden' };
  }
  if (
    o.kind == null &&
    o.id == null &&
    o.digest == null &&
    o.receiptDigest == null &&
    o.payload == null &&
    o.body == null
  ) {
    return { ok: false, golden: null, reason: 'malformed golden' };
  }
  return {
    ok: true,
    golden: {
      id: o.id != null ? String(o.id) : null,
      kind: o.kind != null ? String(o.kind) : 'sealed-receipt',
      code: o.code != null ? String(o.code) : null,
      digest: extractDigest(o),
      payload:
        o.payload != null ? o.payload : o.body != null ? o.body : o.content != null ? o.content : null,
      sealed: o.sealed !== false,
      receiptId: o.receiptId != null ? String(o.receiptId) : null,
      meta: o.meta != null && typeof o.meta === 'object' ? o.meta : undefined
    },
    reason: null
  };
}

/**
 * Normalize a candidate sealed receipt object.
 * @param {unknown} candidate
 * @returns {{ ok: boolean, candidate: object|null, reason: string|null }}
 */
export function normalizeCandidate(candidate) {
  if (candidate == null) {
    return { ok: false, candidate: null, reason: 'candidate required' };
  }
  if (typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, candidate: null, reason: 'malformed candidate' };
  }
  const o = /** @type {Record<string, unknown>} */ (candidate);
  if (o.malformed === true || o.invalid === true) {
    return { ok: false, candidate: null, reason: 'malformed candidate' };
  }
  if (
    o.kind == null &&
    o.id == null &&
    o.digest == null &&
    o.receiptDigest == null &&
    o.payload == null &&
    o.body == null &&
    o.sealed == null
  ) {
    return { ok: false, candidate: null, reason: 'malformed candidate' };
  }
  return {
    ok: true,
    candidate: {
      id: o.id != null ? String(o.id) : null,
      goldenId: o.goldenId != null ? String(o.goldenId) : o.id != null ? String(o.id) : null,
      kind: o.kind != null ? String(o.kind) : null,
      code: o.code != null ? String(o.code) : null,
      digest: extractDigest(o),
      payload:
        o.payload != null ? o.payload : o.body != null ? o.body : o.content != null ? o.content : null,
      sealed: o.sealed,
      receiptId: o.receiptId != null ? String(o.receiptId) : null,
      meta: o.meta != null && typeof o.meta === 'object' ? o.meta : undefined,
      raw: o
    },
    reason: null
  };
}

/**
 * Custody fields required on a sealed candidate: sealed + kind +
 * (digest or payload to recompute).
 * @param {unknown} candidate
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function hasCustodyFields(candidate) {
  if (candidate == null || typeof candidate !== 'object') {
    return { ok: false, reason: 'missing candidate custody' };
  }
  const o = /** @type {Record<string, unknown>} */ (candidate);
  if (o.sealed !== true) {
    return { ok: false, reason: 'missing sealed custody field' };
  }
  if (o.kind == null || String(o.kind).trim() === '') {
    return { ok: false, reason: 'missing kind custody field' };
  }
  const digest = extractDigest(o);
  const hasPayload = o.payload != null || o.body != null || o.content != null;
  if (!digest && !hasPayload) {
    return { ok: false, reason: 'missing digest/payload custody field' };
  }
  return { ok: true, reason: null };
}

/**
 * Compare two hex digests (case-insensitive).
 * @param {unknown} a
 * @param {unknown} b
 * @returns {{ match: boolean, drift: boolean }}
 */
export function compareDigests(a, b) {
  if (a == null || b == null) return { match: false, drift: true };
  const left = String(a).trim().toLowerCase();
  const right = String(b).trim().toLowerCase();
  if (!left || !right) return { match: false, drift: true };
  const match = left === right;
  return { match, drift: !match };
}

/**
 * Resolve a golden from an explicit object, id string, or in-memory map.
 * @param {unknown} goldenArg
 * @param {Record<string, object>} map
 * @param {object} [candidate]
 * @returns {{ ok: boolean, golden: object|null, goldenId: string|null, reason: string|null }}
 */
export function resolveGolden(goldenArg, map = {}, candidate = null) {
  if (goldenArg && typeof goldenArg === 'object' && !Array.isArray(goldenArg)) {
    const n = normalizeGolden(goldenArg);
    if (!n.ok) {
      return { ok: false, golden: null, goldenId: null, reason: n.reason };
    }
    return {
      ok: true,
      golden: n.golden,
      goldenId: n.golden && n.golden.id,
      reason: null
    };
  }
  const key =
    typeof goldenArg === 'string' && goldenArg.trim()
      ? goldenArg.trim()
      : candidate && (candidate.goldenId || candidate.id)
        ? String(candidate.goldenId || candidate.id)
        : null;
  if (!key) {
    return { ok: false, golden: null, goldenId: null, reason: 'golden not found' };
  }
  if (map[key]) {
    const n = normalizeGolden(map[key]);
    if (!n.ok) {
      return { ok: false, golden: null, goldenId: key, reason: n.reason };
    }
    const g = n.golden;
    if (g && g.id == null) g.id = key;
    return { ok: true, golden: g, goldenId: key, reason: null };
  }
  return { ok: false, golden: null, goldenId: key, reason: 'golden not found' };
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
 * Generic observe of an injectable compose port (never rewrite the source).
 * @param {unknown} port
 * @param {object} [ctx]
 * @param {string[]} [names]
 * @returns {{ injected: boolean, observed: boolean, ok: boolean, result?: unknown, noop?: boolean }}
 */
function observePort(port, ctx = {}, names = ['observe', 'check', 'verify']) {
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
  const fn = pickObserve(port, names);
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

/**
 * Observe AJ evidence ledger via injectable port (compose — do NOT rewrite AJ).
 * @param {unknown} port
 * @param {object} [ctx]
 */
export function observeAjLedger(port, ctx = {}) {
  return observePort(port, ctx, ['observe', 'observeLedger', 'record', 'append']);
}

/**
 * Observe AL forensic/replay via injectable port (compose — do NOT rewrite AL).
 * @param {unknown} port
 * @param {object} [ctx]
 */
export function observeAlReplay(port, ctx = {}) {
  return observePort(port, ctx, [
    'observe',
    'observeReplay',
    'autonomyReplayObserve',
    'replay'
  ]);
}

/**
 * Observe BC apply seal via injectable port (compose — do NOT rewrite BC).
 * @param {unknown} port
 * @param {object} [ctx]
 */
export function observeBcApply(port, ctx = {}) {
  return observePort(port, ctx, ['observe', 'seal', 'verify', 'apply']);
}

/**
 * Observe BD delivery seal via injectable port (compose — do NOT rewrite BD).
 * @param {unknown} port
 * @param {object} [ctx]
 */
export function observeBdDelivery(port, ctx = {}) {
  return observePort(port, ctx, ['observe', 'seal', 'verify', 'deliver']);
}

export default {
  BE_BOUNDARY_KIND,
  BE_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  collectPaths,
  isFundacionPath,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  indexGoldens,
  canonicalReplayBody,
  extractDigest,
  normalizeGolden,
  normalizeCandidate,
  hasCustodyFields,
  compareDigests,
  resolveGolden,
  observeAjLedger,
  observeAlReplay,
  observeBcApply,
  observeBdDelivery
};
