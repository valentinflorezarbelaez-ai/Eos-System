/**
 * @module provider-failover-resilience-router
 * SPEC-0046 / Mission AO — Provider Failover & Resilience Router.
 *
 * Injectable router over AD+AE: ordered provider candidates, health/deny
 * probes, budget-aware failover under AE-like ECR, hermetic fakes only.
 * Secrets env-only (Law VI) — never persist provider secrets into EVD
 * bodies or federation envelopes.
 *
 * NON-CLAIM:
 *   provider failover ≠ PRODUCTION_READY LLM ops
 *   failover router ≠ SLA product
 *   failover ≠ multi-cloud billing
 *   not AP/AQ/AR
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  probeProvider,
  AO_PROBE_KIND,
  AO_PROBE_PRODUCTION_READY
} from './provider-health-probe.js';

/** @type {'NO'} */
export const AO_PRODUCTION_READY = 'NO';

export const AO_KIND = 'eos-provider-failover-resilience-router';

export const AO_CODES = Object.freeze({
  OK: 'OK',
  COMPLETED: 'COMPLETED',
  DENY: 'DENY',
  PROVIDER_PROBE_FAIL: 'PROVIDER_PROBE_FAIL',
  ECR_DENY: 'ECR_DENY',
  FAILOVER_EXHAUSTED: 'FAILOVER_EXHAUSTED',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  HITL_REQUIRED: 'HITL_REQUIRED'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for AO failover router failures.
 */
export class ProviderFailoverResilienceError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AO_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'ProviderFailoverResilienceError';
    this.code = code;
    this.details = sanitizeAoPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAoPayload(obj) {
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
    if (/^eos-[a-z0-9-]{8,}$/i.test(value)) return value;
    if (LONG_B64_RE.test(value) && !value.includes('-')) return REDACTED;
    if (LONG_B64_RE.test(value) && /^[A-Za-z0-9+/=]{40,}$/.test(value)) {
      return REDACTED;
    }
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
      /^(tokens|tokensIn|tokensOut|costUnits|remaining|attempts|failoverCount|invokeCount|providerId|activeProviderId)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(digest|sha256|bodySha256|receiptId|receiptDigest)$/i.test(k)
    ) {
      out[k] =
        typeof v === 'string' ? redactSecretSubstrings(v) : sanitizeDeep(v, seen);
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
 * Redact secret-looking substrings. Vendor-style key prefix built at
 * runtime (Law VI — never embed static vendor-key literals).
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
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
 * Stable JSON stringify (sorted keys) for digests.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(/** @type {Record<string, unknown>} */ (value)[k]);
  }
  return out;
}

/**
 * Default FNV-1a style hex digest (hermetic; no crypto dep required).
 * @param {unknown} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Expand to 64 hex chars deterministically for receipt digests
  let out = (h >>> 0).toString(16).padStart(8, '0');
  let h2 = h ^ 0xdeadbeef;
  for (let i = 0; i < s.length; i++) {
    h2 ^= s.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  out += (h2 >>> 0).toString(16).padStart(8, '0');
  let h3 = h2 ^ 0xcafebabe;
  for (let i = 0; i < s.length; i++) {
    h3 ^= s.charCodeAt(i);
    h3 = Math.imul(h3, 0x01000193);
  }
  out += (h3 >>> 0).toString(16).padStart(8, '0');
  let h4 = h3 ^ 0x0ddba11;
  for (let i = 0; i < s.length; i++) {
    h4 ^= s.charCodeAt(i);
    h4 = Math.imul(h4, 0x01000193);
  }
  out += (h4 >>> 0).toString(16).padStart(8, '0');
  // pad/repeat to 64
  while (out.length < 64) out += out;
  return out.slice(0, 64);
}

/**
 * Create a hermetic AE-like ECR stub for tests / standalone use.
 * @param {object} [options]
 * @param {number} [options.ceiling=100]
 * @param {number} [options.used=0]
 */
export function createMemoryEcrMeter(options = {}) {
  let used = Number(options.used) || 0;
  const ceiling =
    options.ceiling != null ? Number(options.ceiling) : 100;
  return {
    kind: 'eos-ao-ecr-meter-stub',
    PRODUCTION_READY: AO_PRODUCTION_READY,
    canSpend(n = 1) {
      const cost = Number(n) || 0;
      if (cost < 0) return false;
      return used + cost <= ceiling;
    },
    record(n = 1) {
      const cost = Number(n) || 0;
      if (cost < 0) return { ok: false, remaining: ceiling - used };
      if (used + cost > ceiling) {
        return { ok: false, remaining: Math.max(0, ceiling - used) };
      }
      used += cost;
      return { ok: true, remaining: ceiling - used, used };
    },
    remaining() {
      return Math.max(0, ceiling - used);
    },
    getUsed() {
      return used;
    },
    getCeiling() {
      return ceiling;
    }
  };
}

/**
 * Detect secret-like fields in a request that must not enter receipts.
 * @param {unknown} obj
 * @returns {boolean}
 */
function containsSecretFields(obj, seen = new WeakSet()) {
  if (obj == null || typeof obj !== 'object') return false;
  if (seen.has(obj)) return false;
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.some((v) => containsSecretFields(v, seen));
  }
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) return true;
    if (typeof v === 'string') {
      const vendorPrefix = ['s', 'k', '-'].join('');
      if (v.startsWith(vendorPrefix) && v.length >= 12) return true;
      if (/^Bearer\s+[A-Za-z0-9._\-+=/]{8,}/i.test(v)) return true;
    }
    if (containsSecretFields(v, seen)) return true;
  }
  return false;
}

/**
 * Normalize spend units from a request.
 * @param {object} request
 * @returns {number}
 */
function estimateSpend(request) {
  if (request == null || typeof request !== 'object') return 1;
  if (request.tokens != null) return Math.max(1, Number(request.tokens) || 1);
  if (request.costUnits != null)
    return Math.max(1, Number(request.costUnits) || 1);
  const tin = Number(request.tokensIn) || 0;
  const tout = Number(request.tokensOut) || 0;
  if (tin + tout > 0) return tin + tout;
  return 1;
}

/**
 * @param {object} [options]
 * @param {Array<{ id: string, invoke: Function, probe?: Function }>} [options.providers]
 * @param {{ canSpend(n: number): boolean, record(n: number): object, remaining(): number }} [options.ecr]
 * @param {() => string|number} [options.now]
 * @param {(payload: unknown) => string} [options.hash]
 * @param {(receipt: object) => object} [options.receiptSealer]
 * @param {boolean} [options.requireProviders]
 * @param {boolean} [options.requireEcr]
 * @param {boolean} [options.throwOnDeny]
 * @param {boolean} [options.hitlOnExhaust]
 * @param {boolean} [options.rejectSecretsInRequest]
 */
export function createProviderFailoverResilienceRouter(options = {}) {
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const receiptSealer =
    typeof options.receiptSealer === 'function'
      ? options.receiptSealer
      : null;
  const throwOnDeny = options.throwOnDeny === true;
  const hitlOnExhaust = options.hitlOnExhaust !== false;
  const rejectSecretsInRequest = options.rejectSecretsInRequest !== false;
  const requireProviders = options.requireProviders === true;
  const requireEcr = options.requireEcr === true;

  /** @type {Array<{ id: string, invoke: Function, probe?: Function }>} */
  let providers = Array.isArray(options.providers)
    ? options.providers.map(normalizeProvider).filter(Boolean)
    : [];

  const ecr =
    options.ecr && typeof options.ecr === 'object' ? options.ecr : null;

  /** @type {object[]} */
  const receipts = [];
  /** @type {object[]} */
  const attemptsLog = [];

  let invokeCount = 0;
  let failoverCount = 0;
  let activeIndex = 0;
  let exhausted = false;

  /**
   * @param {unknown} p
   * @returns {{ id: string, invoke: Function, probe?: Function }|null}
   */
  function normalizeProvider(p) {
    if (p == null || typeof p !== 'object') return null;
    const id = p.id != null ? String(p.id).trim() : '';
    if (!id) return null;
    return {
      id,
      invoke: typeof p.invoke === 'function' ? p.invoke : null,
      probe: typeof p.probe === 'function' ? p.probe : undefined,
      // keep raw for probe helper
      _raw: p
    };
  }

  function listProviders() {
    return providers.map((p, i) => ({
      id: p.id,
      index: i,
      active: i === activeIndex,
      hasInvoke: typeof p.invoke === 'function',
      hasProbe: typeof p.probe === 'function'
    }));
  }

  function getActiveProviderId() {
    if (!providers.length) return null;
    if (activeIndex < 0 || activeIndex >= providers.length) return null;
    return providers[activeIndex].id;
  }

  /**
   * Reorder providers by id list (must be subset / permutation of known ids).
   * @param {string[]} ids
   */
  function setOrder(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return denyResult(AO_CODES.INVALID_REQUEST, {
        reason: 'setOrder requires non-empty id array'
      });
    }
    const byId = new Map(providers.map((p) => [p.id, p]));
    /** @type {typeof providers} */
    const next = [];
    for (const id of ids) {
      const key = String(id);
      const p = byId.get(key);
      if (!p) {
        return denyResult(AO_CODES.INVALID_REQUEST, {
          reason: `unknown provider id in setOrder: ${key}`,
          id: key
        });
      }
      next.push(p);
      byId.delete(key);
    }
    // Append any remaining providers not listed (stable tail)
    for (const p of byId.values()) next.push(p);
    providers = next;
    activeIndex = 0;
    exhausted = false;
    return sanitizeAoPayload({
      ok: true,
      code: AO_CODES.OK,
      order: providers.map((p) => p.id),
      activeProviderId: getActiveProviderId(),
      PRODUCTION_READY: AO_PRODUCTION_READY,
      kind: AO_KIND
    });
  }

  /**
   * @param {object} body
   * @returns {object}
   */
  function sealReceipt(body = {}) {
    const at = String(nowFn());
    const base = sanitizeAoPayload({
      ...body,
      kind: AO_KIND,
      PRODUCTION_READY: AO_PRODUCTION_READY,
      at,
      sealed: true,
      activeProviderId: getActiveProviderId(),
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false
    });
    const digest = hashFn({
      code: base.code,
      at: base.at,
      activeProviderId: base.activeProviderId,
      phase: base.phase,
      attempts: base.attempts
    });
    let receipt = { ...base, receiptDigest: digest, receiptId: `AO-RCPT-${digest.slice(0, 12)}` };
    if (receiptSealer) {
      receipt = sanitizeAoPayload(receiptSealer(receipt));
    }
    // Final Law VI pass — never allow secrets into sealed receipt
    receipt = sanitizeAoPayload(receipt);
    receipts.push(receipt);
    return receipt;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function denyResult(code, extra = {}) {
    const hitl =
      code === AO_CODES.FAILOVER_EXHAUSTED ||
      code === AO_CODES.ECR_DENY ||
      code === AO_CODES.HITL_REQUIRED
        ? hitlOnExhaust
        : false;
    const receipt = sealReceipt({
      ok: false,
      allow: false,
      code,
      phase: 'DENY',
      hitlRequired: hitl || code === AO_CODES.HITL_REQUIRED,
      ...extra
    });
    const result = sanitizeAoPayload({
      ok: false,
      allow: false,
      code,
      hitlRequired: receipt.hitlRequired,
      receipt,
      PRODUCTION_READY: AO_PRODUCTION_READY,
      kind: AO_KIND,
      ...extra
    });
    if (throwOnDeny) {
      throw new ProviderFailoverResilienceError(
        `AO deny: ${code}`,
        code,
        extra
      );
    }
    return result;
  }

  async function probeActive() {
    if (requireProviders && providers.length === 0) {
      return denyResult(AO_CODES.MISSING_DEP, { dep: 'providers' });
    }
    if (!providers.length) {
      return denyResult(AO_CODES.MISSING_DEP, { dep: 'providers' });
    }
    const p = providers[activeIndex] || providers[0];
    const probe = await probeProvider(p._raw || p, { now: nowFn });
    if (!probe.ok) {
      return sanitizeAoPayload({
        ok: false,
        code: AO_CODES.PROVIDER_PROBE_FAIL,
        providerId: p.id,
        probe,
        PRODUCTION_READY: AO_PRODUCTION_READY,
        kind: AO_KIND
      });
    }
    return sanitizeAoPayload({
      ok: true,
      code: AO_CODES.OK,
      providerId: p.id,
      probe,
      PRODUCTION_READY: AO_PRODUCTION_READY,
      kind: AO_KIND
    });
  }

  /**
   * Core route/invoke — try providers in order under ECR.
   * @param {object} request
   */
  async function route(request = {}) {
    invokeCount += 1;

    if (request == null || typeof request !== 'object') {
      return denyResult(AO_CODES.INVALID_REQUEST, {
        reason: 'route/invoke requires an object request'
      });
    }

    if (requireProviders && providers.length === 0) {
      return denyResult(AO_CODES.MISSING_DEP, { dep: 'providers' });
    }
    if (requireEcr && !ecr) {
      return denyResult(AO_CODES.MISSING_DEP, { dep: 'ecr' });
    }
    if (!providers.length) {
      return denyResult(AO_CODES.MISSING_DEP, { dep: 'providers' });
    }

    // Law VI: reject requests that try to smuggle secrets into EVD/receipt path
    if (rejectSecretsInRequest && containsSecretFields(request)) {
      // Still allow routing if secrets are only in a dedicated `credentials`
      // envelope that we strip — but NEVER persist them. We DENY persistence
      // by stripping into a sanitized working copy; explicit SECRET_LEAK when
      // request asks to persistSecrets / includeSecretsInReceipt.
      if (
        request.persistSecrets === true ||
        request.includeSecretsInReceipt === true ||
        request.sealSecrets === true
      ) {
        return denyResult(AO_CODES.SECRET_LEAK_FORBIDDEN, {
          reason: 'provider secrets must not enter EVD/receipt bodies (Law VI)'
        });
      }
    }

    if (exhausted) {
      return denyResult(AO_CODES.FAILOVER_EXHAUSTED, {
        reason: 'all allowlisted providers previously exhausted',
        hitlRequired: true,
        attempts: attemptsLog.slice()
      });
    }

    const spend = estimateSpend(request);
    /** @type {object[]} */
    const attempts = [];
    const startIndex = Math.max(0, activeIndex);

    // Global ECR ceiling check first
    if (ecr && typeof ecr.canSpend === 'function' && !ecr.canSpend(spend)) {
      exhausted = true;
      return denyResult(AO_CODES.ECR_DENY, {
        reason: 'ECR ceiling hit — no remaining budget for any provider',
        remaining: typeof ecr.remaining === 'function' ? ecr.remaining() : undefined,
        spend,
        hitlRequired: true
      });
    }

    for (let i = startIndex; i < providers.length; i++) {
      const provider = providers[i];
      activeIndex = i;

      // Per-attempt ECR gate (budget may have been consumed by prior attempt)
      if (ecr && typeof ecr.canSpend === 'function' && !ecr.canSpend(spend)) {
        attempts.push({
          providerId: provider.id,
          code: AO_CODES.ECR_DENY,
          ok: false
        });
        attemptsLog.push(attempts[attempts.length - 1]);
        exhausted = true;
        failoverCount += 1;
        return denyResult(AO_CODES.ECR_DENY, {
          reason: 'ECR deny during failover chain',
          remaining:
            typeof ecr.remaining === 'function' ? ecr.remaining() : undefined,
          spend,
          attempts,
          hitlRequired: true
        });
      }

      // Health / deny probe
      const probe = await probeProvider(provider._raw || provider, {
        now: nowFn
      });
      if (!probe.ok) {
        attempts.push({
          providerId: provider.id,
          code: AO_CODES.PROVIDER_PROBE_FAIL,
          ok: false,
          probeCode: probe.code
        });
        attemptsLog.push(attempts[attempts.length - 1]);
        failoverCount += 1;
        continue; // WHEN probe fails → next allowlisted provider
      }

      if (typeof provider.invoke !== 'function') {
        attempts.push({
          providerId: provider.id,
          code: AO_CODES.MISSING_DEP,
          ok: false,
          dep: 'invoke'
        });
        attemptsLog.push(attempts[attempts.length - 1]);
        failoverCount += 1;
        continue;
      }

      try {
        // Strip secrets from the request passed to invoke working copy for receipt
        const safeRequest = sanitizeAoPayload({
          ...request,
          // drop credential bags if present
          apiKey: undefined,
          token: undefined,
          authorization: undefined,
          secret: undefined,
          credentials: undefined,
          persistSecrets: undefined,
          includeSecretsInReceipt: undefined,
          sealSecrets: undefined
        });

        const rawResult = await provider.invoke(safeRequest);
        // Record spend only on successful invoke
        if (ecr && typeof ecr.record === 'function') {
          const rec = ecr.record(spend);
          if (rec && rec.ok === false) {
            // Race: ceiling hit at record time — treat as ECR_DENY (no silent continue)
            attempts.push({
              providerId: provider.id,
              code: AO_CODES.ECR_DENY,
              ok: false,
              phase: 'record'
            });
            attemptsLog.push(attempts[attempts.length - 1]);
            exhausted = true;
            return denyResult(AO_CODES.ECR_DENY, {
              reason: 'ECR record denied after invoke',
              attempts,
              hitlRequired: true
            });
          }
        }

        attempts.push({
          providerId: provider.id,
          code: AO_CODES.COMPLETED,
          ok: true
        });
        attemptsLog.push(attempts[attempts.length - 1]);

        const receipt = sealReceipt({
          ok: true,
          allow: true,
          code: AO_CODES.COMPLETED,
          phase: 'ROUTE',
          providerId: provider.id,
          attempts,
          spend,
          remaining:
            ecr && typeof ecr.remaining === 'function'
              ? ecr.remaining()
              : undefined
        });

        return sanitizeAoPayload({
          ok: true,
          allow: true,
          code: AO_CODES.COMPLETED,
          providerId: provider.id,
          activeProviderId: provider.id,
          result: sanitizeAoPayload(rawResult),
          attempts,
          spend,
          receipt,
          PRODUCTION_READY: AO_PRODUCTION_READY,
          kind: AO_KIND,
          failoverCount,
          nonClaim: nonClaimFlags()
        });
      } catch (err) {
        const code = err && err.code ? String(err.code) : AO_CODES.DENY;
        // ECR deny raised by provider / wrapper → failover if budget remains
        if (code === AO_CODES.ECR_DENY || code === 'ECR_TRIPPED') {
          attempts.push({
            providerId: provider.id,
            code: AO_CODES.ECR_DENY,
            ok: false,
            message: sanitizeErrorMessage(err.message || '')
          });
          attemptsLog.push(attempts[attempts.length - 1]);
          failoverCount += 1;
          // If no remaining budget globally, stop
          if (ecr && typeof ecr.canSpend === 'function' && !ecr.canSpend(spend)) {
            exhausted = true;
            return denyResult(AO_CODES.ECR_DENY, {
              reason: 'ECR deny on active provider; ceiling exhausted',
              attempts,
              hitlRequired: true
            });
          }
          continue; // WHEN ECR denies further spend on active → next provider
        }

        attempts.push({
          providerId: provider.id,
          code: code === 'PROVIDER_PROBE_FAIL' ? AO_CODES.PROVIDER_PROBE_FAIL : AO_CODES.DENY,
          ok: false,
          message: sanitizeErrorMessage(err.message || 'invoke failed')
        });
        attemptsLog.push(attempts[attempts.length - 1]);
        failoverCount += 1;
        continue;
      }
    }

    // IF all allowlisted providers exhausted → DENY + seal receipt (no unbounded retry)
    exhausted = true;
    return denyResult(AO_CODES.FAILOVER_EXHAUSTED, {
      reason: 'all allowlisted providers exhausted',
      attempts,
      hitlRequired: true,
      unboundedRetry: false
    });
  }

  async function invoke(request) {
    return route(request);
  }

  function nonClaimFlags() {
    return {
      failoverNotProductionReadyLlmOps: true,
      failoverNotSlaProduct: true,
      failoverNotMultiCloudBilling: true,
      notApAqAr: true,
      fundacionDelta0: true,
      antigravityFirst: true,
      cloudAgentOut: true,
      lawViEnvOnly: true
    };
  }

  function health() {
    return sanitizeAoPayload({
      ok: !exhausted,
      kind: AO_KIND,
      PRODUCTION_READY: AO_PRODUCTION_READY,
      activeProviderId: getActiveProviderId(),
      providerCount: providers.length,
      providers: listProviders(),
      invokeCount,
      failoverCount,
      exhausted,
      ecrRemaining:
        ecr && typeof ecr.remaining === 'function' ? ecr.remaining() : null,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      probeKind: AO_PROBE_KIND,
      probeProductionReady: AO_PROBE_PRODUCTION_READY,
      nonClaim: nonClaimFlags()
    });
  }

  function getState() {
    return sanitizeAoPayload({
      kind: AO_KIND,
      PRODUCTION_READY: AO_PRODUCTION_READY,
      activeProviderId: getActiveProviderId(),
      order: providers.map((p) => p.id),
      invokeCount,
      failoverCount,
      exhausted,
      recentAttempts: attemptsLog.slice(-10),
      receiptCount: receipts.length,
      ecr: ecr
        ? {
            remaining:
              typeof ecr.remaining === 'function' ? ecr.remaining() : null,
            present: true
          }
        : { present: false },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      nonClaim: nonClaimFlags()
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizeAoPayload(r));
  }

  return {
    kind: AO_KIND,
    PRODUCTION_READY: AO_PRODUCTION_READY,
    route,
    invoke,
    probeActive,
    setOrder,
    getActiveProviderId,
    listProviders,
    sealReceipt,
    health,
    getState,
    getReceipts,
    sanitizeAoPayload,
    /** @internal test helper — reset exhausted latch */
    _resetExhaustedForTest() {
      exhausted = false;
    },
    /** @internal */
    _getFailoverCount() {
      return failoverCount;
    }
  };
}

export {
  probeProvider,
  createProviderHealthProbe,
  AO_PROBE_KIND,
  AO_PROBE_PRODUCTION_READY,
  AO_PROBE_CODES
} from './provider-health-probe.js';

export default createProviderFailoverResilienceRouter;
