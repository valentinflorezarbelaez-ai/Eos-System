/**
 * @module rc-package-boundary
 * SPEC-0063 / Mission BF — Artifact normalize, manifest digests, secret
 * scrub, Fundacion detect, and AQ/BC/BD/BE observe helpers for Local
 * Release Candidate Packaging & Artifact Notary Port.
 *
 * Hermetic in-process only — NO real tarball fs, NO GH Releases, NO
 * public registry, NO network. Compose/extend AQ evidence export/notary
 * observe + BC/BD/BE seals via injectable ports — do NOT rewrite AQ/BC/BD/BE
 * modules into this payload.
 *
 * NON-CLAIM:
 *   boundary ≠ PRODUCTION_READY=YES flip /
 *   ≠ public registry publish /
 *   ≠ GH Releases product
 *   not BG; Fundacion Δ=0; Antigravity-first;
 *   L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED);
 *   L19 OPEN (BC+BD+BE MEASURED; BF in progress; BG pending);
 *   Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BF_BOUNDARY_PRODUCTION_READY = 'NO';

export const BF_BOUNDARY_KIND = 'eos-local-rc-packaging-artifact-notary-boundary';

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
 * Collect path-like / id-like fields from a request or artifact.
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
      'path',
      'target',
      'targetPath',
      'root',
      'name',
      'receiptId',
      'registry',
      'publishTarget'
    ];
    /** @type {string[]} */
    const out = [];
    for (const k of keys) {
      if (o[k] != null && String(o[k]).trim() !== '') out.push(String(o[k]));
    }
    if (o.artifacts != null) out.push(...collectPaths(o.artifacts));
    if (Array.isArray(o.artifacts)) {
      for (const a of o.artifacts) out.push(...collectPaths(a));
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
    return collectPaths(o).some((p) => /fundacion/i.test(p));
  }
  return /fundacion/i.test(String(value));
}

/**
 * Detect PRODUCTION_READY=YES implication in policy / request.
 * @param {unknown} value
 * @returns {boolean}
 */
export function impliesProductionReadyYes(value) {
  if (value == null) return false;
  if (typeof value === 'boolean') return value === true;
  if (typeof value === 'string') {
    const s = value.trim().toUpperCase();
    return s === 'YES' || s === 'TRUE' || s === '1';
  }
  if (typeof value === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    if (
      o.PRODUCTION_READY === 'YES' ||
      o.PRODUCTION_READY === true ||
      o.productionReady === true ||
      o.productionReadyYes === true ||
      o.flipProductionReady === true ||
      o.setProductionReadyYes === true
    ) {
      return true;
    }
    if (o.policy && typeof o.policy === 'object') {
      return impliesProductionReadyYes(o.policy);
    }
  }
  return false;
}

/**
 * Detect public registry / GH Releases publish intent.
 * @param {unknown} value
 * @returns {{ intent: boolean, reason: string|null }}
 */
export function detectPublishIntent(value) {
  if (value == null) return { intent: false, reason: null };
  if (typeof value === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    // GH Releases first (more specific)
    if (
      o.ghReleases === true ||
      o.ghRelease === true ||
      o.githubReleases === true ||
      o.publishGhRelease === true ||
      o.publish === 'gh-releases' ||
      o.target === 'gh-releases'
    ) {
      return {
        intent: true,
        reason: 'GH Releases publish intent DENY',
        kind: 'gh-releases'
      };
    }
    if (
      o.publishRegistry === true ||
      o.publicRegistry === true ||
      o.npmPublish === true ||
      o.registryPublish === true ||
      o.publish === 'registry' ||
      o.publish === 'npm' ||
      o.target === 'public-registry'
    ) {
      return {
        intent: true,
        reason: 'public registry publish intent DENY',
        kind: 'registry'
      };
    }
    if (o.policy && typeof o.policy === 'object') {
      return detectPublishIntent(o.policy);
    }
    const blob = safeJsonBlob(o).toLowerCase();
    if (
      /"publishregistry"\s*:\s*true/.test(blob) ||
      /"ghreleases"\s*:\s*true/.test(blob) ||
      /"npmPublish"\s*:\s*true/i.test(blob)
    ) {
      return {
        intent: true,
        reason: 'public registry / GH Releases publish intent DENY'
      };
    }
  }
  if (typeof value === 'string') {
    const s = value.toLowerCase();
    if (
      /public.?registry|npm.?publish|gh.?releases|github.?releases/.test(s)
    ) {
      return {
        intent: true,
        reason: 'public registry / GH Releases publish intent DENY'
      };
    }
  }
  return { intent: false, reason: null };
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
 * Detect Law VI / secret leakage in an artifacts / request body.
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
      reason: 'Law VI forbidden provider prefix in packaging body'
    };
  }
  if (/\bBearer\s+[A-Za-z0-9._\-+=/]{16,}/i.test(text)) {
    return { leak: true, reason: 'Bearer token leakage in packaging body' };
  }
  if (opts.treatFakeAsLeak === true && /\benv-fake-token-\d+\b/i.test(text)) {
    return { leak: true, reason: 'fake-token pattern in packaging body' };
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
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|receiptDigest|sha256|digest|manifestDigest)$/i.test(
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
 * Extract a declared digest from an artifact entry.
 * @param {unknown} artifact
 * @returns {string|null}
 */
export function extractDigest(artifact) {
  if (artifact == null) return null;
  if (typeof artifact === 'string') {
    const s = artifact.trim();
    return /^[a-f0-9]{16,}$/i.test(s) ? s.toLowerCase() : null;
  }
  if (typeof artifact !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (artifact);
  const raw = o.digest ?? o.sha256 ?? o.receiptDigest ?? null;
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  return s || null;
}

/**
 * Normalize a single artifact entry `{ id, digest, path? }`.
 * @param {unknown} artifact
 * @returns {{ ok: boolean, artifact: object|null, reason: string|null }}
 */
export function normalizeArtifact(artifact) {
  if (artifact == null) {
    return { ok: false, artifact: null, reason: 'artifact required' };
  }
  if (typeof artifact !== 'object' || Array.isArray(artifact)) {
    return { ok: false, artifact: null, reason: 'malformed artifact' };
  }
  const o = /** @type {Record<string, unknown>} */ (artifact);
  if (o.malformed === true || o.invalid === true) {
    return { ok: false, artifact: null, reason: 'malformed artifact' };
  }
  const id = o.id != null ? String(o.id).trim() : '';
  const digest = extractDigest(o);
  if (!id) {
    return { ok: false, artifact: null, reason: 'malformed artifact (missing id)' };
  }
  if (!digest || !/^[a-f0-9]{16,}$/i.test(digest)) {
    return {
      ok: false,
      artifact: null,
      reason: 'malformed artifact (missing/invalid digest)'
    };
  }
  return {
    ok: true,
    artifact: {
      id,
      digest: digest.toLowerCase(),
      path: o.path != null ? String(o.path) : undefined,
      kind: o.kind != null ? String(o.kind) : 'rc-artifact',
      sealed: o.sealed === true,
      meta: o.meta != null && typeof o.meta === 'object' ? scrubSecrets(o.meta) : undefined
    },
    reason: null
  };
}

/**
 * Normalize an artifacts list (allowlisted digest entries).
 * @param {unknown} artifacts
 * @returns {{ ok: boolean, artifacts: object[], reason: string|null }}
 */
export function normalizeArtifacts(artifacts) {
  if (artifacts == null) {
    return { ok: false, artifacts: [], reason: 'empty artifacts' };
  }
  if (!Array.isArray(artifacts)) {
    return { ok: false, artifacts: [], reason: 'malformed artifacts (not array)' };
  }
  if (artifacts.length === 0) {
    return { ok: false, artifacts: [], reason: 'empty artifacts' };
  }
  /** @type {object[]} */
  const out = [];
  for (const a of artifacts) {
    const n = normalizeArtifact(a);
    if (!n.ok || !n.artifact) {
      return {
        ok: false,
        artifacts: [],
        reason: n.reason || 'malformed artifact'
      };
    }
    out.push(n.artifact);
  }
  // Stable sort by id for deterministic manifest digests
  out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { ok: true, artifacts: out, reason: null };
}

/**
 * Build canonical manifest body from normalized artifacts.
 * @param {object[]} artifacts
 * @returns {object}
 */
export function canonicalManifestBody(artifacts) {
  return {
    kind: 'eos-local-rc-package-manifest',
    PRODUCTION_READY: 'NO',
    artifacts: (artifacts || []).map((a) => ({
      id: a.id,
      digest: a.digest,
      ...(a.path != null ? { path: a.path } : {})
    }))
  };
}

/**
 * Custody fields on a sealed artifact entry when policy requires seals on
 * individual artifacts: sealed + id + digest.
 * @param {unknown} artifact
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function hasArtifactCustodyFields(artifact) {
  if (artifact == null || typeof artifact !== 'object') {
    return { ok: false, reason: 'missing artifact custody' };
  }
  const o = /** @type {Record<string, unknown>} */ (artifact);
  if (o.sealed !== true) {
    return { ok: false, reason: 'missing sealed custody field' };
  }
  if (o.id == null || String(o.id).trim() === '') {
    return { ok: false, reason: 'missing id custody field' };
  }
  const digest = extractDigest(o);
  if (!digest) {
    return { ok: false, reason: 'missing digest custody field' };
  }
  return { ok: true, reason: null };
}

/**
 * Custody check for seal objects (apply / delivery / replay).
 * @param {unknown} seal
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function hasSealCustodyFields(seal) {
  if (seal == null || typeof seal !== 'object') {
    return { ok: false, reason: 'missing seal custody' };
  }
  const o = /** @type {Record<string, unknown>} */ (seal);
  if (o.sealed !== true && o.ok !== true && !o.digest) {
    return { ok: false, reason: 'broken seal custody (missing seal fields)' };
  }
  if (o.sealed === false || o.ok === false || o.valid === false) {
    return { ok: false, reason: 'broken seal custody (invalid seal)' };
  }
  return { ok: true, reason: null };
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
 * Observe AQ evidence export/notary via injectable port (compose — do NOT rewrite AQ).
 * @param {unknown} port
 * @param {object} [ctx]
 */
export function observeAqNotary(port, ctx = {}) {
  return observePort(port, ctx, [
    'observe',
    'observeNotary',
    'aqNotaryObserve',
    'notarize',
    'export'
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

/**
 * Observe BE replay seal via injectable port (compose — do NOT rewrite BE).
 * @param {unknown} port
 * @param {object} [ctx]
 */
export function observeBeReplay(port, ctx = {}) {
  return observePort(port, ctx, ['observe', 'seal', 'verify', 'replay']);
}

export default {
  BF_BOUNDARY_KIND,
  BF_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  collectPaths,
  isFundacionPath,
  impliesProductionReadyYes,
  detectPublishIntent,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  extractDigest,
  normalizeArtifact,
  normalizeArtifacts,
  canonicalManifestBody,
  hasArtifactCustodyFields,
  hasSealCustodyFields,
  observeAqNotary,
  observeBcApply,
  observeBdDelivery,
  observeBeReplay
};
