/**
 * @module env-gate
 * SPEC-0052 / Mission AU — Law VI Env Gate.
 *
 * Allowlist of process-env keys + allowlisted provider-adapter IDs.
 * DENY unknown env keys and unknown adapters. Hermetic: injectable
 * env map only — never reads live process.env unless caller injects it.
 *
 * NON-CLAIM:
 *   env-gate ≠ vault / KMS / secret-manager SaaS / cloud IAM
 *   not AV/AW
 *   Fundacion Δ=0
 *   Antigravity-first (no cloud-agent path)
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AU_ENV_GATE_PRODUCTION_READY = 'NO';

export const AU_ENV_GATE_KIND = 'eos-law-vi-env-gate';

export const AU_ENV_GATE_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  ENV_KEY_NOT_ALLOWLISTED: 'ENV_KEY_NOT_ALLOWLISTED',
  ADAPTER_NOT_ALLOWLISTED: 'ADAPTER_NOT_ALLOWLISTED',
  INVALID_REQUEST: 'INVALID_REQUEST'
});

/** Default allowlisted env keys (provider secrets — names only, never values). */
export const DEFAULT_ALLOWLISTED_ENV_KEYS = Object.freeze([
  'EOS_PROVIDER_TOKEN_A',
  'EOS_PROVIDER_TOKEN_B',
  'EOS_PROVIDER_TOKEN_C',
  'EOS_LLM_ADAPTER_TOKEN',
  'EOS_FAKE_PROVIDER_ENV',
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY'
]);

/** Default allowlisted adapter IDs that may receive inject-only secrets. */
export const DEFAULT_ALLOWLISTED_ADAPTERS = Object.freeze([
  'adapter-provider-a',
  'adapter-provider-b',
  'adapter-provider-c',
  'adapter-llm-failover',
  'adapter-hermetic-fake',
  'adapter-gemini',
  'adapter-openrouter'
]);

/**
 * Create an env-gate over injectable allowlists.
 * @param {object} [opts]
 * @param {string[]} [opts.allowlistedEnvKeys]
 * @param {string[]} [opts.allowlistedAdapters]
 * @returns {object}
 */
export function createEnvGate(opts = {}) {
  const envKeys = new Set(
    (opts.allowlistedEnvKeys || DEFAULT_ALLOWLISTED_ENV_KEYS).map(String)
  );
  const adapters = new Set(
    (opts.allowlistedAdapters || DEFAULT_ALLOWLISTED_ADAPTERS).map(String)
  );

  /**
   * @param {unknown} envKey
   * @returns {{ ok: boolean, code: string, envKey?: string, reason?: string }}
   */
  function checkEnvKey(envKey) {
    if (envKey == null || typeof envKey !== 'string' || !envKey.trim()) {
      return {
        ok: false,
        code: AU_ENV_GATE_CODES.INVALID_REQUEST,
        reason: 'envKey required'
      };
    }
    const key = String(envKey).trim();
    if (!envKeys.has(key)) {
      return {
        ok: false,
        code: AU_ENV_GATE_CODES.ENV_KEY_NOT_ALLOWLISTED,
        envKey: key,
        reason: 'env key not allowlisted'
      };
    }
    return { ok: true, code: AU_ENV_GATE_CODES.OK, envKey: key };
  }

  /**
   * @param {unknown} adapterId
   * @returns {{ ok: boolean, code: string, adapterId?: string, reason?: string }}
   */
  function checkAdapter(adapterId) {
    if (
      adapterId == null ||
      typeof adapterId !== 'string' ||
      !adapterId.trim()
    ) {
      return {
        ok: false,
        code: AU_ENV_GATE_CODES.INVALID_REQUEST,
        reason: 'adapterId required'
      };
    }
    const id = String(adapterId).trim();
    if (!adapters.has(id)) {
      return {
        ok: false,
        code: AU_ENV_GATE_CODES.ADAPTER_NOT_ALLOWLISTED,
        adapterId: id,
        reason: 'adapter not allowlisted'
      };
    }
    return { ok: true, code: AU_ENV_GATE_CODES.OK, adapterId: id };
  }

  /**
   * Combined gate: both env key and adapter must pass.
   * @param {string} envKey
   * @param {string} adapterId
   * @returns {{ ok: boolean, code: string, envKey?: string, adapterId?: string, reason?: string }}
   */
  function checkInject(envKey, adapterId) {
    const a = checkAdapter(adapterId);
    if (!a.ok) return a;
    const e = checkEnvKey(envKey);
    if (!e.ok) return e;
    return {
      ok: true,
      code: AU_ENV_GATE_CODES.OK,
      envKey: e.envKey,
      adapterId: a.adapterId
    };
  }

  return {
    kind: AU_ENV_GATE_KIND,
    PRODUCTION_READY: AU_ENV_GATE_PRODUCTION_READY,
    checkEnvKey,
    checkAdapter,
    checkInject,
    listAllowlistedEnvKeys: () => [...envKeys].sort(),
    listAllowlistedAdapters: () => [...adapters].sort(),
    isEnvKeyAllowlisted: (k) => envKeys.has(String(k)),
    isAdapterAllowlisted: (a) => adapters.has(String(a))
  };
}

export default {
  AU_ENV_GATE_KIND,
  AU_ENV_GATE_PRODUCTION_READY,
  AU_ENV_GATE_CODES,
  DEFAULT_ALLOWLISTED_ENV_KEYS,
  DEFAULT_ALLOWLISTED_ADAPTERS,
  createEnvGate
};
