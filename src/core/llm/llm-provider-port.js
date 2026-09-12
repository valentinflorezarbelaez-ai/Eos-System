/**
 * @module llm-provider-port
 * SPEC-0035 / Mission AD — LLM Provider Port & Model Routing Adapter.
 *
 * Injectable port over openai | anthropic | gemini | ollama | fake.
 * Real adapters are thin stubs that FAIL-CLOSED without env keys
 * (no network in default CI path). Fake provider always available.
 *
 * Law VI: sanitize/redact apiKey/token/authorization from errors and
 * getState dumps. API keys NEVER hardcoded — env names documented only.
 *
 * NON-CLAIM:
 *   live LLM ≠ PRODUCTION_READY
 *   keys never in repo
 *   not AE/AF/AG/AH
 *   not full eos-shell live loop (AF)
 *   Fundacion Δ=0
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createFakeLlmProvider } from './fake-llm-provider.js';
import {
  createModelRouter,
  ModelRouterError,
  ROUTING_CODES,
  KNOWN_PROVIDER_IDS
} from './model-router.js';

/** @type {'NO'} */
export const LLM_PRODUCTION_READY = 'NO';

export const LLM_KIND = 'eos-llm-provider-port';

export const LLM_PROVIDER_IDS = Object.freeze([...KNOWN_PROVIDER_IDS]);

export const LLM_CODES = Object.freeze({
  OK: 'OK',
  COMPLETED: 'COMPLETED',
  MISSING_PROVIDER_CREDENTIAL: 'MISSING_PROVIDER_CREDENTIAL',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  UNKNOWN_PROVIDER: 'UNKNOWN_PROVIDER',
  ALL_PROVIDERS_FAILED: 'ALL_PROVIDERS_FAILED',
  ROUTING_SSOT_INVALID: 'ROUTING_SSOT_INVALID',
  INVALID_REQUEST: 'INVALID_REQUEST',
  DENY: 'DENY'
});

/** Documented env key names only — never secret values. */
export const LLM_ENV_KEYS = Object.freeze({
  openai: Object.freeze(['OPENAI_API_KEY']),
  anthropic: Object.freeze(['ANTHROPIC_API_KEY']),
  gemini: Object.freeze(['GEMINI_API_KEY', 'GOOGLE_API_KEY']),
  ollama: Object.freeze(['OLLAMA_BASE_URL']),
  fake: Object.freeze([])
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for LLM provider port failures.
 */
export class LlmProviderPortError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = LLM_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'LlmProviderPortError';
    this.code = code;
    this.details = sanitizeLlmPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeLlmPayload(obj) {
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
    if (LONG_B64_RE.test(value)) return REDACTED;
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
    if (SECRET_KEY_RE.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * Redact obvious secret patterns inside free-form strings (e.g. error messages).
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  // Bearer tokens / sk- style / long hex
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  out = out.replace(
    /\b(sk-[A-Za-z0-9]{8,})\b/g,
    REDACTED
  );
  out = out.replace(
    /\b(api[_-]?key|token|authorization)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
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
 * Read first present env var from list (via injectable env map).
 * @param {NodeJS.ProcessEnv|Record<string,string|undefined>} env
 * @param {readonly string[]} names
 * @returns {{ name: string, present: boolean }}
 */
function firstEnvPresent(env, names) {
  for (const name of names) {
    const v = env[name];
    if (v != null && String(v).trim() !== '') {
      return { name, present: true };
    }
  }
  return { name: names[0] || '', present: false };
}

/**
 * Thin stub adapter: fails closed without credentials; never performs network I/O.
 * @param {string} providerId
 * @param {object} opts
 * @param {Record<string,string|undefined>} opts.env
 * @param {boolean} [opts.allowNetwork]
 */
function createStubAdapter(providerId, opts) {
  const envKeys = LLM_ENV_KEYS[providerId] || [];
  const env = opts.env || {};
  const allowNetwork = opts.allowNetwork === true;

  function credentialStatus() {
    // ollama: OLLAMA_BASE_URL is a URL (ok to document); absence → unavailable
    if (providerId === 'ollama') {
      const st = firstEnvPresent(env, envKeys);
      return {
        required: envKeys,
        present: st.present,
        // URL itself is not a secret; never echo value into state
        hint: st.present ? 'OLLAMA_BASE_URL set' : 'OLLAMA_BASE_URL missing'
      };
    }
    if (providerId === 'fake') {
      return { required: [], present: true, hint: 'hermetic' };
    }
    const st = firstEnvPresent(env, envKeys);
    return {
      required: [...envKeys],
      present: st.present,
      hint: st.present ? `${st.name} set` : `${envKeys.join(' or ')} missing`
    };
  }

  return {
    id: providerId,
    kind: `eos-llm-stub-${providerId}`,
    PRODUCTION_READY: LLM_PRODUCTION_READY,

    async complete(_request = {}) {
      const cred = credentialStatus();
      if (!cred.present) {
        throw new LlmProviderPortError(
          `provider ${providerId} missing required credential env`,
          LLM_CODES.MISSING_PROVIDER_CREDENTIAL,
          { provider: providerId, requiredEnv: cred.required }
        );
      }
      if (!allowNetwork) {
        // Default CI / hermetic path: even with env present, stubs do not call network.
        throw new LlmProviderPortError(
          `provider ${providerId} unavailable (network disabled; stub fail-closed)`,
          LLM_CODES.PROVIDER_UNAVAILABLE,
          { provider: providerId, network: false, stub: true }
        );
      }
      throw new LlmProviderPortError(
        `provider ${providerId} live transport not implemented in Mission AD (use AF+)`,
        LLM_CODES.PROVIDER_UNAVAILABLE,
        { provider: providerId, stub: true }
      );
    },

    async health() {
      const cred = credentialStatus();
      return {
        ok: cred.present,
        provider: providerId,
        PRODUCTION_READY: LLM_PRODUCTION_READY,
        credentialPresent: cred.present,
        requiredEnv: cred.required,
        network: false,
        stub: true,
        hint: cred.hint
      };
    },

    getState() {
      const cred = credentialStatus();
      return sanitizeLlmPayload({
        provider: providerId,
        PRODUCTION_READY: LLM_PRODUCTION_READY,
        credentialPresent: cred.present,
        requiredEnv: cred.required,
        network: false,
        stub: true
      });
    }
  };
}

/**
 * Build default providers map (fake always real; others stubs).
 * @param {object} options
 * @param {Record<string,string|undefined>} options.env
 * @param {boolean} [options.allowNetwork]
 * @param {object} [options.fakeOptions]
 */
function buildDefaultProviders(options) {
  return {
    fake: createFakeLlmProvider(options.fakeOptions || {}),
    openai: createStubAdapter('openai', options),
    anthropic: createStubAdapter('anthropic', options),
    gemini: createStubAdapter('gemini', options),
    ollama: createStubAdapter('ollama', options)
  };
}

/**
 * @param {object} [options]
 * @param {Record<string, object>} [options.providers] — injectable adapters map
 * @param {string} [options.routingPath]
 * @param {string} [options.routingMarkdown]
 * @param {object} [options.routingConfig]
 * @param {Record<string,string|undefined>} [options.env]
 * @param {boolean} [options.allowNetwork] — default false (CI fail-closed)
 * @param {boolean} [options.throwOnAllFailed] — default true
 * @param {object} [options.fakeOptions]
 * @param {string} [options.defaultProvider]
 */
export function createLlmProviderPort(options = {}) {
  const env = options.env || process.env;
  const allowNetwork = options.allowNetwork === true;
  const throwOnAllFailed = options.throwOnAllFailed !== false;

  const defaults = buildDefaultProviders({
    env,
    allowNetwork,
    fakeOptions: options.fakeOptions
  });

  /** @type {Record<string, object>} */
  const providers = {
    ...defaults,
    ...(options.providers && typeof options.providers === 'object'
      ? options.providers
      : {})
  };

  // Ensure fake always present
  if (!providers.fake) {
    providers.fake = createFakeLlmProvider(options.fakeOptions || {});
  }

  let router;
  try {
    router = createModelRouter({
      routingPath: options.routingPath,
      routingMarkdown: options.routingMarkdown,
      config: options.routingConfig
    });
  } catch (err) {
    const code =
      err instanceof ModelRouterError
        ? err.code
        : ROUTING_CODES.ROUTING_SSOT_INVALID;
    throw new LlmProviderPortError(
      err.message || 'routing SSOT invalid',
      code === ROUTING_CODES.ROUTING_SSOT_MISSING
        ? LLM_CODES.ROUTING_SSOT_INVALID
        : LLM_CODES.ROUTING_SSOT_INVALID,
      sanitizeLlmPayload({ cause: err.code || 'ROUTING_ERROR' })
    );
  }

  /** @type {{ lastProvider: string|null, lastIntent: string|null, completeCount: number, failures: object[] }} */
  const state = {
    lastProvider: null,
    lastIntent: null,
    completeCount: 0,
    failures: []
  };

  function listProviders() {
    return Object.keys(providers)
      .sort()
      .map((id) => {
        const p = providers[id];
        return {
          id,
          kind: p.kind || `eos-llm-provider-${id}`,
          PRODUCTION_READY: p.PRODUCTION_READY || LLM_PRODUCTION_READY
        };
      });
  }

  /**
   * @param {string|object} intentOrQuery
   */
  function resolveRoute(intentOrQuery) {
    const query =
      typeof intentOrQuery === 'string'
        ? { intent: intentOrQuery }
        : intentOrQuery && typeof intentOrQuery === 'object'
          ? intentOrQuery
          : {};
    const route = router.resolveRoute(query);
    // Validate preferred / chain members against known ids when present in map or KNOWN list
    for (const id of route.providers) {
      if (!providers[id] && !LLM_PROVIDER_IDS.includes(id)) {
        throw new LlmProviderPortError(
          `unknown provider in route: ${id}`,
          LLM_CODES.UNKNOWN_PROVIDER,
          { provider: id }
        );
      }
    }
    return {
      ...route,
      kind: LLM_KIND,
      PRODUCTION_READY: LLM_PRODUCTION_READY
    };
  }

  /**
   * @param {string} providerId
   */
  function getProviderOrThrow(providerId) {
    const id = String(providerId || '').trim().toLowerCase();
    if (!id) {
      throw new LlmProviderPortError(
        'provider id required',
        LLM_CODES.UNKNOWN_PROVIDER
      );
    }
    if (!providers[id]) {
      throw new LlmProviderPortError(
        `unknown provider: ${id}`,
        LLM_CODES.UNKNOWN_PROVIDER,
        { provider: id }
      );
    }
    return { id, adapter: providers[id] };
  }

  /**
   * Complete with routing + dynamic fallback.
   * @param {object} request
   * @param {string} [request.prompt]
   * @param {string} [request.intent]
   * @param {string|string[]} [request.preferred]
   * @param {string} [request.provider] — force single provider (no fallback)
   * @param {boolean} [request.fallback=true]
   */
  async function complete(request = {}) {
    if (request == null || typeof request !== 'object') {
      throw new LlmProviderPortError(
        'complete requires an object request',
        LLM_CODES.INVALID_REQUEST
      );
    }

    const intent = request.intent != null ? String(request.intent) : 'default';
    state.lastIntent = intent;

    /** @type {string[]} */
    let chain;
    if (request.provider) {
      const { id } = getProviderOrThrow(request.provider);
      chain = [id];
    } else {
      const route = resolveRoute({
        intent,
        preferred: request.preferred
      });
      chain = route.providers;
    }

    const useFallback = request.fallback !== false;
    const attemptIds = useFallback ? chain : [chain[0]];
    /** @type {object[]} */
    const failures = [];

    for (const providerId of attemptIds) {
      let adapter;
      try {
        ({ adapter } = getProviderOrThrow(providerId));
      } catch (err) {
        failures.push({
          provider: providerId,
          code: err.code || LLM_CODES.UNKNOWN_PROVIDER,
          message: sanitizeErrorMessage(err.message)
        });
        if (!useFallback) break;
        continue;
      }

      try {
        const result = await adapter.complete({
          ...request,
          intent
        });
        state.lastProvider = providerId;
        state.completeCount += 1;
        return sanitizeLlmPayload({
          ok: true,
          code: LLM_CODES.COMPLETED,
          provider: providerId,
          intent,
          attempted: attemptIds,
          failures: failures.length ? failures : undefined,
          result,
          PRODUCTION_READY: LLM_PRODUCTION_READY,
          kind: LLM_KIND
        });
      } catch (err) {
        const code = err.code || LLM_CODES.PROVIDER_UNAVAILABLE;
        // Unknown provider is hard DENY even in fallback chain
        if (code === LLM_CODES.UNKNOWN_PROVIDER) {
          throw err instanceof LlmProviderPortError
            ? err
            : new LlmProviderPortError(err.message, code, {
                provider: providerId
              });
        }
        failures.push({
          provider: providerId,
          code,
          message: sanitizeErrorMessage(err.message)
        });
        state.failures = failures.slice(-20);
        if (!useFallback) {
          throw err instanceof LlmProviderPortError
            ? err
            : new LlmProviderPortError(
                err.message,
                code,
                sanitizeLlmPayload({ provider: providerId })
              );
        }
      }
    }

    const exhaust = new LlmProviderPortError(
      `all providers failed for intent=${intent}`,
      LLM_CODES.ALL_PROVIDERS_FAILED,
      { intent, attempted: attemptIds, failures }
    );
    if (throwOnAllFailed) throw exhaust;
    return sanitizeLlmPayload({
      ok: false,
      code: LLM_CODES.ALL_PROVIDERS_FAILED,
      intent,
      attempted: attemptIds,
      failures,
      PRODUCTION_READY: LLM_PRODUCTION_READY,
      kind: LLM_KIND
    });
  }

  async function health() {
    const entries = {};
    for (const id of Object.keys(providers).sort()) {
      const p = providers[id];
      try {
        entries[id] = p.health ? await p.health() : { ok: true, provider: id };
      } catch (err) {
        entries[id] = {
          ok: false,
          provider: id,
          code: err.code || LLM_CODES.PROVIDER_UNAVAILABLE,
          message: sanitizeErrorMessage(err.message)
        };
      }
    }
    return sanitizeLlmPayload({
      ok: true,
      kind: LLM_KIND,
      PRODUCTION_READY: LLM_PRODUCTION_READY,
      providers: entries,
      routing: router.getState(),
      completeCount: state.completeCount,
      lastProvider: state.lastProvider,
      lastIntent: state.lastIntent,
      nonClaim: {
        liveLlmNotProductionReady: true,
        keysNeverInRepo: true,
        notAeAfAgAh: true,
        fundacionDelta0: true
      }
    });
  }

  function getState() {
    return sanitizeLlmPayload({
      kind: LLM_KIND,
      PRODUCTION_READY: LLM_PRODUCTION_READY,
      providerIds: Object.keys(providers).sort(),
      routing: router.getState(),
      completeCount: state.completeCount,
      lastProvider: state.lastProvider,
      lastIntent: state.lastIntent,
      recentFailures: state.failures.slice(-5),
      envKeyNames: { ...LLM_ENV_KEYS },
      allowNetwork,
      // Never dump env values
      nonClaim: {
        liveLlmNotProductionReady: true,
        keysNeverInRepo: true,
        notAeAfAgAh: true,
        fundacionDelta0: true
      }
    });
  }

  return {
    kind: LLM_KIND,
    PRODUCTION_READY: LLM_PRODUCTION_READY,
    complete,
    health,
    getState,
    listProviders,
    resolveRoute,
    /** @internal test/helper */
    sanitizeLlmPayload,
    getRouter: () => router
  };
}

export {
  createModelRouter,
  ModelRouterError,
  ROUTING_CODES,
  loadRoutingSsot,
  parseRoutingYaml,
  parseRoutingDocument
} from './model-router.js';

export {
  createFakeLlmProvider,
  createFakeLlmProvider as createFakeProvider,
  FAKE_LLM_PROVIDER_ID,
  FAKE_LLM_PRODUCTION_READY
} from './fake-llm-provider.js';

export default createLlmProviderPort;
