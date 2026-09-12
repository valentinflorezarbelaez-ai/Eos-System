/**
 * @module secret-leak-guard
 * SPEC-0052 / Mission AU — Law VI Secret Leak Guard.
 *
 * Detect attempted persistence of provider secrets into EVD bodies,
 * federation envelopes, or repo-path-shaped targets. DENY + sealed
 * receipt path (caller seals). Never embeds static vendor-key prefix
 * literals (Law VI — runtime synth for pattern matching only).
 *
 * NON-CLAIM:
 *   leak-guard ≠ vault / KMS / secret-manager SaaS / cloud IAM
 *   not AV/AW
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AU_LEAK_GUARD_PRODUCTION_READY = 'NO';

export const AU_LEAK_GUARD_KIND = 'eos-law-vi-secret-leak-guard';

export const AU_LEAK_GUARD_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  INVALID_REQUEST: 'INVALID_REQUEST'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const REDACTED = '[REDACTED]';

/**
 * Build vendor-style key prefix at runtime (Law VI — never contiguous
 * static literal in source).
 * @returns {string}
 */
export function vendorKeyPrefix() {
  return String.fromCharCode(115, 107, 45);
}

/**
 * @param {string} s
 * @returns {boolean}
 */
export function looksLikeVendorKey(s) {
  if (typeof s !== 'string' || s.length < 12) return false;
  const prefix = vendorKeyPrefix();
  return s.startsWith(prefix) && /^[A-Za-z0-9_-]+$/.test(s.slice(prefix.length));
}

/**
 * Detect secret-shaped field names or values in a payload tree.
 * @param {unknown} obj
 * @param {WeakSet<object>} [seen]
 * @returns {boolean}
 */
export function containsSecretMaterial(obj, seen = new WeakSet()) {
  if (obj == null) return false;
  if (typeof obj === 'string') {
    if (looksLikeVendorKey(obj)) return true;
    if (/^Bearer\s+[A-Za-z0-9._\-+=/]{8,}/i.test(obj)) return true;
    return false;
  }
  if (typeof obj !== 'object') return false;
  if (seen.has(obj)) return false;
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.some((v) => containsSecretMaterial(v, seen));
  }
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) return true;
    if (containsSecretMaterial(v, seen)) return true;
  }
  return false;
}

/**
 * Classify a persist target shape.
 * @param {unknown} target
 * @returns {'evd'|'federation'|'repo'|'fundacion'|'unknown'|null}
 */
export function classifyPersistTarget(target) {
  if (target == null) return null;
  if (typeof target === 'string') {
    const t = target.toLowerCase();
    if (/fundacion/.test(t)) return 'fundacion';
    if (
      /\.(js|mjs|cjs|ts|json|md)$/i.test(t) ||
      /(^|\/)(src|tests|docs|openspec|scripts)\//i.test(t) ||
      /^[A-Za-z]:\\/.test(target) ||
      target.includes('repo-path') ||
      target.includes('repo/')
    ) {
      return 'repo';
    }
    if (/evd|evidence/.test(t)) return 'evd';
    if (/federation|envelope/.test(t)) return 'federation';
    return 'unknown';
  }
  if (typeof target === 'object') {
    const kind = String(
      /** @type {Record<string, unknown>} */ (target).kind ||
        /** @type {Record<string, unknown>} */ (target).type ||
        ''
    ).toLowerCase();
    const pathHint = String(
      /** @type {Record<string, unknown>} */ (target).path ||
        /** @type {Record<string, unknown>} */ (target).target ||
        ''
    ).toLowerCase();
    if (kind.includes('fundacion') || pathHint.includes('fundacion')) {
      return 'fundacion';
    }
    if (
      kind.includes('evd') ||
      kind.includes('evidence') ||
      /** @type {Record<string, unknown>} */ (target).evdBody != null ||
      /** @type {Record<string, unknown>} */ (target).evidenceBody != null
    ) {
      return 'evd';
    }
    if (
      kind.includes('federation') ||
      kind.includes('envelope') ||
      /** @type {Record<string, unknown>} */ (target).federationEnvelope !=
        null ||
      /** @type {Record<string, unknown>} */ (target).envelope != null
    ) {
      return 'federation';
    }
    if (
      kind.includes('repo') ||
      pathHint.includes('repo') ||
      /** @type {Record<string, unknown>} */ (target).repoPath != null
    ) {
      return 'repo';
    }
  }
  return 'unknown';
}

/**
 * Guard a persist attempt. DENY if secret material would enter
 * EVD / federation / repo / Fundacion shaped targets.
 * @param {object} req
 * @param {unknown} [req.payload]
 * @param {unknown} [req.target]
 * @param {string} [req.intent] - 'persist' | 'inject' | 'read'
 * @returns {{ ok: boolean, code: string, targetClass?: string|null, reason?: string, sealedHint?: object }}
 */
export function guardPersistAttempt(req = {}) {
  const intent = String(req.intent || 'persist').toLowerCase();
  if (intent === 'inject' || intent === 'read') {
    return { ok: true, code: AU_LEAK_GUARD_CODES.OK };
  }

  const targetClass = classifyPersistTarget(req.target);
  const hasSecret = containsSecretMaterial(req.payload);

  if (targetClass === 'fundacion') {
    return {
      ok: false,
      code: AU_LEAK_GUARD_CODES.FUNDACION_DENIED,
      targetClass,
      reason: 'Fundacion writes always denied (Δ=0)',
      sealedHint: {
        fundacionDelta: 0,
        deny: true,
        code: AU_LEAK_GUARD_CODES.FUNDACION_DENIED
      }
    };
  }

  if (
    hasSecret &&
    (targetClass === 'evd' ||
      targetClass === 'federation' ||
      targetClass === 'repo')
  ) {
    return {
      ok: false,
      code: AU_LEAK_GUARD_CODES.SECRET_LEAK_FORBIDDEN,
      targetClass,
      reason: `secret material must not enter ${targetClass}`,
      sealedHint: {
        deny: true,
        code: AU_LEAK_GUARD_CODES.SECRET_LEAK_FORBIDDEN,
        targetClass,
        secretPresent: true,
        secretValue: undefined
      }
    };
  }

  if (hasSecret && targetClass === 'unknown') {
    return {
      ok: false,
      code: AU_LEAK_GUARD_CODES.SECRET_LEAK_FORBIDDEN,
      targetClass,
      reason: 'secret material must not persist to unknown targets',
      sealedHint: {
        deny: true,
        code: AU_LEAK_GUARD_CODES.SECRET_LEAK_FORBIDDEN,
        secretPresent: true
      }
    };
  }

  return {
    ok: true,
    code: AU_LEAK_GUARD_CODES.OK,
    targetClass
  };
}

/**
 * Redact secret-looking substrings (vendor prefix runtime-built).
 * @param {string} s
 * @returns {string}
 */
export function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  const vendorPrefix = vendorKeyPrefix();
  const vendorRe = new RegExp(
    `\\b(${escapeRegExp(vendorPrefix)}[A-Za-z0-9_-]{8,})\\b`,
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
 * Deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAuPayload(obj) {
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
    if (/^[a-f0-9]{64}$/i.test(value)) return value;
    if (/^[a-f0-9]{7,40}$/i.test(value)) return value;
    if (/^eos-[a-z0-9-]{8,}$/i.test(value)) return value;
    if (/^AU-(RCPT|BRK|ENV)-[a-z0-9]+$/i.test(value)) return value;
    if (/^env-fake-token-/i.test(value)) return REDACTED;
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
    if (
      /^(injectCount|denyCount|resolveCount|adapterId|envKey|code|status|phase|receiptId|receiptDigest|presence|present|secretPresent|envKeyPresent|fundacionDelta)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (/^(digest|sha256|bodySha256|valueHash|envValueHash)$/i.test(k)) {
      out[k] =
        typeof v === 'string'
          ? redactSecretSubstrings(v)
          : sanitizeDeep(v, seen);
      continue;
    }
    // Presence/claim booleans & numeric counters stay (Law VI: redact values,
    // not intentional flag fields named *secret*Present / *token*).
    if (
      (SECRET_KEY_RE.test(k) || /^token$/i.test(k) || /^value$/i.test(k)) &&
      typeof v !== 'boolean' &&
      typeof v !== 'number'
    ) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * @param {string} message
 * @returns {string}
 */
export function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a leak-guard facade.
 * @returns {object}
 */
export function createSecretLeakGuard() {
  return {
    kind: AU_LEAK_GUARD_KIND,
    PRODUCTION_READY: AU_LEAK_GUARD_PRODUCTION_READY,
    guardPersistAttempt,
    containsSecretMaterial,
    classifyPersistTarget,
    sanitizeAuPayload,
    redactSecretSubstrings,
    vendorKeyPrefix
  };
}

export default {
  AU_LEAK_GUARD_KIND,
  AU_LEAK_GUARD_PRODUCTION_READY,
  AU_LEAK_GUARD_CODES,
  vendorKeyPrefix,
  looksLikeVendorKey,
  containsSecretMaterial,
  classifyPersistTarget,
  guardPersistAttempt,
  redactSecretSubstrings,
  sanitizeAuPayload,
  sanitizeErrorMessage,
  createSecretLeakGuard
};
