/**
 * @module provider-health-probe
 * SPEC-0046 / Mission AO — thin provider health/deny probe helper.
 *
 * Hermetic helper for Provider Failover & Resilience Router. Does not
 * perform network I/O; probes injectable provider.probe() or invoke
 * dry-run signals only.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const AO_PROBE_PRODUCTION_READY = 'NO';

export const AO_PROBE_KIND = 'eos-provider-health-probe';

export const AO_PROBE_CODES = Object.freeze({
  OK: 'OK',
  PROVIDER_PROBE_FAIL: 'PROVIDER_PROBE_FAIL',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST'
});

/**
 * Probe a single provider port.
 * @param {object} provider — { id, probe?, invoke? }
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @returns {Promise<{ ok: boolean, code: string, providerId: string, at: string, details?: object }>}
 */
export async function probeProvider(provider, opts = {}) {
  const nowFn =
    typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const at = String(nowFn());

  if (provider == null || typeof provider !== 'object') {
    return {
      ok: false,
      code: AO_PROBE_CODES.MISSING_DEP,
      providerId: '',
      at,
      details: { dep: 'provider' }
    };
  }

  const id = provider.id != null ? String(provider.id) : '';
  if (!id) {
    return {
      ok: false,
      code: AO_PROBE_CODES.INVALID_REQUEST,
      providerId: '',
      at,
      details: { reason: 'provider.id required' }
    };
  }

  try {
    if (typeof provider.probe === 'function') {
      const result = await provider.probe();
      if (result === true || (result && result.ok === true)) {
        return {
          ok: true,
          code: AO_PROBE_CODES.OK,
          providerId: id,
          at,
          details:
            result && typeof result === 'object'
              ? { ...(result.details || {}), probe: true }
              : { probe: true }
        };
      }
      return {
        ok: false,
        code: AO_PROBE_CODES.PROVIDER_PROBE_FAIL,
        providerId: id,
        at,
        details: {
          probe: true,
          reason:
            (result && (result.reason || result.code || result.message)) ||
            'probe returned not-ok'
        }
      };
    }

    // No explicit probe — treat presence of invoke as healthy (hermetic default)
    if (typeof provider.invoke === 'function') {
      return {
        ok: true,
        code: AO_PROBE_CODES.OK,
        providerId: id,
        at,
        details: { probe: false, assumedHealthy: true }
      };
    }

    return {
      ok: false,
      code: AO_PROBE_CODES.MISSING_DEP,
      providerId: id,
      at,
      details: { dep: 'invoke|probe' }
    };
  } catch (err) {
    return {
      ok: false,
      code: AO_PROBE_CODES.PROVIDER_PROBE_FAIL,
      providerId: id,
      at,
      details: {
        reason: err && err.message ? String(err.message) : 'probe threw',
        thrownCode: err && err.code ? String(err.code) : undefined
      }
    };
  }
}

/**
 * Create a reusable probe helper bound to options.
 * @param {object} [options]
 * @param {() => string|number} [options.now]
 */
export function createProviderHealthProbe(options = {}) {
  return {
    kind: AO_PROBE_KIND,
    PRODUCTION_READY: AO_PROBE_PRODUCTION_READY,
    async probe(provider) {
      return probeProvider(provider, { now: options.now });
    }
  };
}

export default createProviderHealthProbe;
