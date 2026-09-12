/**
 * @module secret-runtime-broker
 * SPEC-0052 / Mission AU — Law VI Secret Runtime Broker / Env Gate.
 *
 * Typed runtime broker over AO (+ AD concepts): resolveSecret(name) from
 * injected env map only; injectToAdapter(adapterId, envKey); never return
 * secrets into receipt bodies (redact). DENY if secret would enter
 * EVD/federation/repo bodies. Hermetic fake env. PRODUCTION_READY=NO.
 *
 * NON-CLAIM:
 *   runtime broker ≠ vault / KMS / secret-manager SaaS / cloud IAM
 *   not AV/AW
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: never embed static vendor-key prefix literals in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AU_CEILING
 */

import {
  AU_ENV_GATE_KIND,
  AU_ENV_GATE_PRODUCTION_READY,
  AU_ENV_GATE_CODES,
  DEFAULT_ALLOWLISTED_ENV_KEYS,
  DEFAULT_ALLOWLISTED_ADAPTERS,
  createEnvGate
} from './env-gate.js';
import {
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
} from './secret-leak-guard.js';
import {
  AU_RECEIPT_KIND,
  AU_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  hashSecretPresence,
  buildBrokerReceipt
} from './broker-receipt.js';

/** @type {'NO'} */
export const AU_PRODUCTION_READY = 'NO';

export const AU_KIND = 'eos-law-vi-secret-runtime-broker';

export const AU_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  MISSING_ENV: 'MISSING_ENV',
  ADAPTER_NOT_ALLOWLISTED: 'ADAPTER_NOT_ALLOWLISTED',
  ENV_KEY_NOT_ALLOWLISTED: 'ENV_KEY_NOT_ALLOWLISTED',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_DEP: 'MISSING_DEP',
  FUNDACION_DENIED: 'FUNDACION_DENIED'
});

/**
 * Typed error for AU secret runtime broker failures.
 */
export class SecretRuntimeBrokerError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AU_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'SecretRuntimeBrokerError';
    this.code = code;
    this.details = sanitizeAuPayload(details);
  }
}

/**
 * Create Law VI secret runtime broker.
 *
 * @param {object} [opts]
 * @param {Record<string, string>} [opts.env] - hermetic env map (required for inject)
 * @param {ReturnType<typeof createEnvGate>} [opts.envGate]
 * @param {string[]} [opts.allowlistedEnvKeys]
 * @param {string[]} [opts.allowlistedAdapters]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @param {boolean} [opts.throwOnDeny]
 * @param {boolean} [opts.requireEnv]
 * @returns {object}
 */
export function createSecretRuntimeBroker(opts = {}) {
  const envGate =
    opts.envGate ||
    createEnvGate({
      allowlistedEnvKeys: opts.allowlistedEnvKeys,
      allowlistedAdapters: opts.allowlistedAdapters
    });
  const leakGuard = createSecretLeakGuard();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const throwOnDeny = opts.throwOnDeny === true;
  const requireEnv = opts.requireEnv !== false;

  /** @type {Record<string, string>} */
  let envMap =
    opts.env && typeof opts.env === 'object'
      ? { ...opts.env }
      : {};

  /** @type {Map<string, { adapterId: string, envKey: string, injectedAt: string }>} */
  const injectedAdapters = new Map();

  let resolveCount = 0;
  let injectCount = 0;
  let denyCount = 0;

  /**
   * @param {object} result
   * @returns {object}
   */
  function maybeThrow(result) {
    if (!result.ok && throwOnDeny) {
      throw new SecretRuntimeBrokerError(
        result.reason || result.code || 'DENY',
        result.code || AU_CODES.DENY,
        sanitizeAuPayload({
          adapterId: result.adapterId,
          envKey: result.envKey,
          targetClass: result.targetClass
        })
      );
    }
    return result;
  }

  /**
   * Seal a receipt without secret values.
   * @param {object} body
   * @returns {object}
   */
  function sealReceipt(body) {
    return buildBrokerReceipt(body, { hash: hashFn, now: nowFn });
  }

  /**
   * Replace hermetic env map (tests / restart).
   * @param {Record<string, string>} next
   */
  function setEnv(next) {
    if (next == null || typeof next !== 'object') {
      throw new SecretRuntimeBrokerError(
        'env map required',
        AU_CODES.INVALID_REQUEST
      );
    }
    envMap = { ...next };
  }

  /**
   * Resolve a secret by env key name from injected env map only.
   * Returns presence + hash in public result; raw value ONLY via
   * internal path used by injectToAdapter (never on receipt).
   * @param {string} name
   * @returns {object}
   */
  function resolveSecret(name) {
    resolveCount += 1;

    if (requireEnv && (envMap == null || typeof envMap !== 'object')) {
      denyCount += 1;
      const receipt = sealReceipt({
        ok: false,
        code: AU_CODES.MISSING_DEP,
        phase: 'RESOLVE',
        envKey: name != null ? String(name) : null,
        reason: 'env map missing',
        deny: true
      });
      return maybeThrow({
        ok: false,
        code: AU_CODES.MISSING_DEP,
        reason: 'env map missing',
        receipt
      });
    }

    const gate = envGate.checkEnvKey(name);
    if (!gate.ok) {
      denyCount += 1;
      const code =
        gate.code === AU_ENV_GATE_CODES.ENV_KEY_NOT_ALLOWLISTED
          ? AU_CODES.ENV_KEY_NOT_ALLOWLISTED
          : AU_CODES.INVALID_REQUEST;
      const receipt = sealReceipt({
        ok: false,
        code,
        phase: 'RESOLVE',
        envKey: name != null ? String(name) : null,
        reason: gate.reason,
        deny: true
      });
      return maybeThrow({
        ok: false,
        code,
        envKey: gate.envKey,
        reason: gate.reason,
        receipt
      });
    }

    const raw = envMap[gate.envKey];
    if (raw == null || raw === '') {
      denyCount += 1;
      const receipt = sealReceipt({
        ok: false,
        code: AU_CODES.MISSING_ENV,
        phase: 'RESOLVE',
        envKey: gate.envKey,
        envKeyPresent: false,
        reason: 'env value missing',
        deny: true
      });
      return maybeThrow({
        ok: false,
        code: AU_CODES.MISSING_ENV,
        envKey: gate.envKey,
        reason: 'env value missing',
        receipt
      });
    }

    const envValueHash = hashSecretPresence(raw, hashFn);
    const receipt = sealReceipt({
      ok: true,
      code: AU_CODES.OK,
      phase: 'RESOLVE',
      envKey: gate.envKey,
      envKeyPresent: true,
      envValueHash,
      secretPresent: true
    });

    // Public API: never return raw secret on resolve result body
    return {
      ok: true,
      code: AU_CODES.OK,
      envKey: gate.envKey,
      present: true,
      envValueHash,
      receipt
      // deliberately no `value`
    };
  }

  /**
   * Internal: resolve raw value for inject-only path.
   * @param {string} envKey
   * @returns {{ ok: boolean, code: string, value?: string, envValueHash?: string, reason?: string, receipt?: object }}
   */
  function resolveRawForInject(envKey) {
    const gate = envGate.checkEnvKey(envKey);
    if (!gate.ok) {
      const code =
        gate.code === AU_ENV_GATE_CODES.ENV_KEY_NOT_ALLOWLISTED
          ? AU_CODES.ENV_KEY_NOT_ALLOWLISTED
          : AU_CODES.INVALID_REQUEST;
      return { ok: false, code, reason: gate.reason };
    }
    const raw = envMap[gate.envKey];
    if (raw == null || raw === '') {
      return {
        ok: false,
        code: AU_CODES.MISSING_ENV,
        reason: 'env value missing'
      };
    }
    return {
      ok: true,
      code: AU_CODES.OK,
      value: String(raw),
      envValueHash: hashSecretPresence(raw, hashFn)
    };
  }

  /**
   * Inject secret from env into allowlisted adapter at call time.
   * Secret is passed only to adapter.receiveSecret / adapter.inject;
   * never appears on the returned receipt.
   * @param {string} adapterId
   * @param {string} envKey
   * @param {object} [adapter] - optional adapter with receiveSecret(value)
   * @returns {object}
   */
  function injectToAdapter(adapterId, envKey, adapter = null) {
    injectCount += 1;

    const gate = envGate.checkInject(envKey, adapterId);
    if (!gate.ok) {
      denyCount += 1;
      let code = AU_CODES.DENY;
      if (gate.code === AU_ENV_GATE_CODES.ADAPTER_NOT_ALLOWLISTED) {
        code = AU_CODES.ADAPTER_NOT_ALLOWLISTED;
      } else if (gate.code === AU_ENV_GATE_CODES.ENV_KEY_NOT_ALLOWLISTED) {
        code = AU_CODES.ENV_KEY_NOT_ALLOWLISTED;
      } else if (gate.code === AU_ENV_GATE_CODES.INVALID_REQUEST) {
        code = AU_CODES.INVALID_REQUEST;
      }
      const receipt = sealReceipt({
        ok: false,
        code,
        phase: 'INJECT',
        adapterId: adapterId != null ? String(adapterId) : null,
        envKey: envKey != null ? String(envKey) : null,
        reason: gate.reason,
        deny: true
      });
      return maybeThrow({
        ok: false,
        code,
        adapterId: gate.adapterId,
        envKey: gate.envKey,
        reason: gate.reason,
        receipt
      });
    }

    const resolved = resolveRawForInject(gate.envKey);
    if (!resolved.ok) {
      denyCount += 1;
      const receipt = sealReceipt({
        ok: false,
        code: resolved.code,
        phase: 'INJECT',
        adapterId: gate.adapterId,
        envKey: gate.envKey,
        envKeyPresent: false,
        reason: resolved.reason,
        deny: true
      });
      return maybeThrow({
        ok: false,
        code: resolved.code,
        adapterId: gate.adapterId,
        envKey: gate.envKey,
        reason: resolved.reason,
        receipt
      });
    }

    // Deliver to adapter only (inject-only)
    if (adapter && typeof adapter === 'object') {
      if (typeof adapter.receiveSecret === 'function') {
        adapter.receiveSecret(resolved.value, {
          envKey: gate.envKey,
          adapterId: gate.adapterId
        });
      } else if (typeof adapter.inject === 'function') {
        adapter.inject(resolved.value, {
          envKey: gate.envKey,
          adapterId: gate.adapterId
        });
      } else {
        // ephemeral slot — not persisted
        adapter.__runtimeSecret = resolved.value;
      }
    }

    injectedAdapters.set(gate.adapterId, {
      adapterId: gate.adapterId,
      envKey: gate.envKey,
      injectedAt: String(nowFn())
    });

    const receipt = sealReceipt({
      ok: true,
      code: AU_CODES.OK,
      phase: 'INJECT',
      adapterId: gate.adapterId,
      envKey: gate.envKey,
      envKeyPresent: true,
      envValueHash: resolved.envValueHash,
      secretPresent: true
    });

    // Assert receipt never carries raw value
    const sanitized = sanitizeAuPayload(receipt);
    return {
      ok: true,
      code: AU_CODES.OK,
      adapterId: gate.adapterId,
      envKey: gate.envKey,
      present: true,
      envValueHash: resolved.envValueHash,
      receipt: sanitized
    };
  }

  /**
   * Attempt to persist a payload to a target — DENY secret leaks.
   * @param {object} req
   * @param {unknown} [req.payload]
   * @param {unknown} [req.target]
   * @param {string} [req.intent]
   * @returns {object}
   */
  function attemptPersist(req = {}) {
    const guard = guardPersistAttempt(req);
    if (!guard.ok) {
      denyCount += 1;
      const code =
        guard.code === AU_LEAK_GUARD_CODES.FUNDACION_DENIED
          ? AU_CODES.FUNDACION_DENIED
          : AU_CODES.SECRET_LEAK_FORBIDDEN;
      const receipt = sealReceipt({
        ok: false,
        code,
        phase: 'PERSIST_GUARD',
        targetClass: guard.targetClass,
        secretPresent: true,
        reason: guard.reason,
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow({
        ok: false,
        code,
        targetClass: guard.targetClass,
        reason: guard.reason,
        receipt
      });
    }
    const receipt = sealReceipt({
      ok: true,
      code: AU_CODES.OK,
      phase: 'PERSIST_GUARD',
      targetClass: guard.targetClass,
      deny: false,
      decision: 'ALLOW_NON_SECRET'
    });
    return {
      ok: true,
      code: AU_CODES.OK,
      targetClass: guard.targetClass,
      receipt
    };
  }

  /**
   * Fundacion write — ALWAYS DENY.
   * @param {unknown} [_payload]
   * @returns {object}
   */
  function writeFundacion(_payload) {
    denyCount += 1;
    const receipt = sealReceipt({
      ok: false,
      code: AU_CODES.FUNDACION_DENIED,
      phase: 'FUNDACION',
      targetClass: 'fundacion',
      reason: 'Fundacion writes always denied (Δ=0)',
      deny: true,
      decision: 'DENY'
    });
    return maybeThrow({
      ok: false,
      code: AU_CODES.FUNDACION_DENIED,
      targetClass: 'fundacion',
      reason: 'Fundacion writes always denied (Δ=0)',
      fundacionDelta: 0,
      receipt
    });
  }

  /**
   * @returns {object}
   */
  function getState() {
    return sanitizeAuPayload({
      kind: AU_KIND,
      PRODUCTION_READY: AU_PRODUCTION_READY,
      resolveCount,
      injectCount,
      denyCount,
      injectedAdapterIds: [...injectedAdapters.keys()].sort(),
      allowlistedEnvKeys: envGate.listAllowlistedEnvKeys(),
      allowlistedAdapters: envGate.listAllowlistedAdapters(),
      envKeyNames: Object.keys(envMap).sort(),
      // presence only — never values
      envPresence: Object.fromEntries(
        Object.keys(envMap)
          .sort()
          .map((k) => [k, envMap[k] != null && envMap[k] !== ''])
      ),
      fundacionDelta: 0,
      cloudAgent: false,
      vaultClaim: false,
      kmsClaim: false,
      secretManagerClaim: false,
      cloudIamClaim: false
    });
  }

  /**
   * @returns {object}
   */
  function health() {
    return {
      kind: AU_KIND,
      PRODUCTION_READY: AU_PRODUCTION_READY,
      ok: true,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      vaultClaim: false,
      kmsClaim: false,
      secretManagerClaim: false,
      cloudIamClaim: false
    };
  }

  return {
    kind: AU_KIND,
    PRODUCTION_READY: AU_PRODUCTION_READY,
    codes: AU_CODES,
    resolveSecret,
    injectToAdapter,
    attemptPersist,
    writeFundacion,
    setEnv,
    sealReceipt,
    getState,
    health,
    sanitize: sanitizeAuPayload,
    envGate,
    leakGuard
  };
}

// Re-exports for test convenience (single import surface)
export {
  AU_ENV_GATE_KIND,
  AU_ENV_GATE_PRODUCTION_READY,
  AU_ENV_GATE_CODES,
  DEFAULT_ALLOWLISTED_ENV_KEYS,
  DEFAULT_ALLOWLISTED_ADAPTERS,
  createEnvGate,
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
  createSecretLeakGuard,
  AU_RECEIPT_KIND,
  AU_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  hashSecretPresence,
  buildBrokerReceipt
};

export default {
  AU_KIND,
  AU_PRODUCTION_READY,
  AU_CODES,
  SecretRuntimeBrokerError,
  createSecretRuntimeBroker
};
