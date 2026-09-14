/**
 * @module operator-dashboard-policy-gate
 * SPEC-0067 / Mission BJ — Fail-closed preconditions for Operator Dashboard /
 * HUD Fabric: schema, freshness, integrity, Fundacion DENY, malformed DENY,
 * empty/missing surface DENY, stale/mismatched surface → DEGRADED/FAIL.
 *
 * DENY/health codes: MALFORMED_PAYLOAD, EMPTY_SURFACE_ID, MISSING_SURFACE,
 * STALE_SURFACE, MISMATCHED_SURFACE, PROVIDER_THROW, FUNDACION_DENY,
 * POLICY_DENY, DENY, OK, DEGRADED, FAIL.
 *
 * NON-CLAIM:
 *   policy-gate ≠ observability SaaS (Grafana/Datadog/Prometheus) /
 *   ≠ external web GUI/HTTP server /
 *   ≠ PRODUCTION_READY=YES
 *   BH+BI MEASURED acknowledged; not BK–BL; Fundacion Δ=0 (ALWAYS DENY default);
 *   Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/observability (BJ-owned operator-dashboard-* files).
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BJ_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BJ_POLICY_GATE_KIND = 'eos-operator-dashboard-policy-gate';

export const BJ_HEALTH = Object.freeze({
  OK: 'OK',
  DEGRADED: 'DEGRADED',
  FAIL: 'FAIL'
});

export const BJ_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DEGRADED: 'DEGRADED',
  FAIL: 'FAIL',
  DENY: 'DENY',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  EMPTY_SURFACE_ID: 'EMPTY_SURFACE_ID',
  MISSING_SURFACE: 'MISSING_SURFACE',
  STALE_SURFACE: 'STALE_SURFACE',
  MISMATCHED_SURFACE: 'MISMATCHED_SURFACE',
  PROVIDER_THROW: 'PROVIDER_THROW',
  FUNDACION_DENY: 'FUNDACION_DENY',
  POLICY_DENY: 'POLICY_DENY',
  SNAPSHOT_OK: 'SNAPSHOT_OK'
});

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BJ_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyMalformed(
  reason = 'malformed dashboard payload',
  extra = {}
) {
  return deny(BJ_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyEmptySurfaceId(
  reason = 'surfaceId is required (non-empty)',
  extra = {}
) {
  return deny(BJ_POLICY_CODES.EMPTY_SURFACE_ID, reason, extra);
}

export function denyMissingSurface(
  reason = 'required surface is missing / unregistered',
  extra = {}
) {
  return deny(BJ_POLICY_CODES.MISSING_SURFACE, reason, extra);
}

export function denyStaleSurface(
  reason = 'surface report is stale',
  extra = {}
) {
  return deny(BJ_POLICY_CODES.STALE_SURFACE, reason, {
    health: BJ_HEALTH.DEGRADED,
    ...extra
  });
}

export function denyMismatchedSurface(
  reason = 'surface report mismatched / integrity fail',
  extra = {}
) {
  return deny(BJ_POLICY_CODES.MISMATCHED_SURFACE, reason, {
    health: BJ_HEALTH.FAIL,
    ...extra
  });
}

export function denyProviderThrow(
  reason = 'surface provider threw',
  extra = {}
) {
  return deny(BJ_POLICY_CODES.PROVIDER_THROW, reason, {
    health: BJ_HEALTH.DEGRADED,
    ...extra
  });
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BJ_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BJ_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * Fail-closed gate for registerSurface.
 * @param {string} surfaceId
 * @param {unknown} providerFn
 * @param {object} [req]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateRegister(surfaceId, providerFn, req = {}) {
  if (req != null && typeof req === 'object') {
    if (req.fundacion === true || req.writeFundacion === true) {
      return denyFundacion();
    }
  }
  if (surfaceId == null || String(surfaceId).trim() === '') {
    return denyEmptySurfaceId();
  }
  if (typeof providerFn !== 'function') {
    return denyMalformed('registerSurface() requires a provider function');
  }
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BJ_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0
  };
}

/**
 * Fail-closed gate for generateSnapshot request.
 * @param {object} req
 * @param {object} [opts]
 * @param {number} [opts.registeredCount]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateSnapshot(req, opts = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('generateSnapshot() requires an object request (or {})');
  }
  if (req.fundacion === true || req.writeFundacion === true) {
    return denyFundacion();
  }
  if (req.forceMalformed === true) {
    return denyMalformed('forced malformed snapshot');
  }
  const registeredCount =
    typeof opts.registeredCount === 'number' ? opts.registeredCount : null;
  if (registeredCount === 0 && req.allowEmpty !== true) {
    return denyMissingSurface('no surfaces registered for snapshot');
  }
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BJ_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0
  };
}

/**
 * Evaluate a single surface provider report into health + score.
 * Fail-closed: throw → DEGRADED; stale → DEGRADED; mismatch → FAIL;
 * missing → FAIL; drift flag → DEGRADED.
 * @param {string} surfaceId
 * @param {object|null} report
 * @param {Error|null} [thrown]
 * @param {object} [opts]
 * @returns {{ health: string, score: number|null, reason: string|null, code: string, ok: boolean }}
 */
export function evaluateSurfaceReport(surfaceId, report, thrown = null, opts = {}) {
  if (thrown) {
    return {
      health: BJ_HEALTH.DEGRADED,
      score: null,
      reason: `provider threw: ${thrown.message || String(thrown)}`,
      code: BJ_POLICY_CODES.PROVIDER_THROW,
      ok: false
    };
  }
  if (report == null || typeof report !== 'object') {
    return {
      health: BJ_HEALTH.FAIL,
      score: null,
      reason: `missing/null report for surface ${surfaceId}`,
      code: BJ_POLICY_CODES.MISSING_SURFACE,
      ok: false
    };
  }
  if (report.mismatched === true || report.integrity === false) {
    return {
      health: BJ_HEALTH.FAIL,
      score: typeof report.score === 'number' ? report.score : null,
      reason: report.reason != null ? String(report.reason) : 'mismatched surface',
      code: BJ_POLICY_CODES.MISMATCHED_SURFACE,
      ok: false
    };
  }
  if (report.stale === true) {
    return {
      health: BJ_HEALTH.DEGRADED,
      score: typeof report.score === 'number' ? report.score : null,
      reason: report.reason != null ? String(report.reason) : 'stale surface',
      code: BJ_POLICY_CODES.STALE_SURFACE,
      ok: false
    };
  }
  if (report.drift === true || report.health === BJ_HEALTH.DEGRADED) {
    return {
      health: BJ_HEALTH.DEGRADED,
      score: typeof report.score === 'number' ? report.score : null,
      reason:
        report.reason != null
          ? String(report.reason)
          : report.drift === true
            ? 'drift reported'
            : 'degraded health',
      code: BJ_POLICY_CODES.DEGRADED,
      ok: false
    };
  }
  if (report.health === BJ_HEALTH.FAIL || report.ok === false) {
    return {
      health: BJ_HEALTH.FAIL,
      score: typeof report.score === 'number' ? report.score : null,
      reason: report.reason != null ? String(report.reason) : 'surface FAIL',
      code: BJ_POLICY_CODES.FAIL,
      ok: false
    };
  }
  const maxAgeMs =
    typeof opts.maxAgeMs === 'number' ? opts.maxAgeMs : null;
  const nowMs = typeof opts.nowMs === 'number' ? opts.nowMs : null;
  if (
    maxAgeMs != null &&
    nowMs != null &&
    report.timestamp != null
  ) {
    const ts = Date.parse(String(report.timestamp));
    if (!Number.isNaN(ts) && nowMs - ts > maxAgeMs) {
      return {
        health: BJ_HEALTH.DEGRADED,
        score: typeof report.score === 'number' ? report.score : null,
        reason: `stale by freshness: age>${maxAgeMs}ms`,
        code: BJ_POLICY_CODES.STALE_SURFACE,
        ok: false
      };
    }
  }
  return {
    health: BJ_HEALTH.OK,
    score: typeof report.score === 'number' ? report.score : 1,
    reason: null,
    code: BJ_POLICY_CODES.OK,
    ok: true
  };
}

/**
 * Aggregate per-surface health into overallHealth.
 * Any FAIL → FAIL; else any DEGRADED → DEGRADED; else OK.
 * @param {Record<string, { health: string }>} surfaceScores
 * @returns {string}
 */
export function aggregateOverallHealth(surfaceScores = {}) {
  const values = Object.values(surfaceScores || {});
  if (values.length === 0) return BJ_HEALTH.FAIL;
  let hasDegraded = false;
  for (const v of values) {
    const h = v && v.health != null ? String(v.health) : BJ_HEALTH.FAIL;
    if (h === BJ_HEALTH.FAIL) return BJ_HEALTH.FAIL;
    if (h === BJ_HEALTH.DEGRADED) hasDegraded = true;
  }
  return hasDegraded ? BJ_HEALTH.DEGRADED : BJ_HEALTH.OK;
}

/**
 * Create a policy-gate surface.
 * @param {object} [opts]
 * @returns {object}
 */
export function createOperatorDashboardPolicyGate(opts = {}) {
  return {
    kind: BJ_POLICY_GATE_KIND,
    PRODUCTION_READY: BJ_POLICY_GATE_PRODUCTION_READY,
    codes: BJ_POLICY_CODES,
    health: BJ_HEALTH,
    deny,
    denyMalformed,
    denyEmptySurfaceId,
    denyMissingSurface,
    denyStaleSurface,
    denyMismatchedSurface,
    denyProviderThrow,
    denyFundacion,
    denyPolicy,
    gateRegister: (surfaceId, providerFn, req = {}) =>
      gateRegister(surfaceId, providerFn, req),
    gateSnapshot: (req, extra = {}) =>
      gateSnapshot(req, { ...opts, ...extra }),
    evaluateSurfaceReport,
    aggregateOverallHealth,
    // NON-CLAIM surface
    observabilitySaas: false,
    grafanaDatadogPrometheus: false,
    externalWebGui: false,
    httpServer: false,
    productionReadyYes: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  BJ_POLICY_GATE_KIND,
  BJ_POLICY_GATE_PRODUCTION_READY,
  BJ_HEALTH,
  BJ_POLICY_CODES,
  deny,
  denyMalformed,
  denyEmptySurfaceId,
  denyMissingSurface,
  denyStaleSurface,
  denyMismatchedSurface,
  denyProviderThrow,
  denyFundacion,
  denyPolicy,
  gateRegister,
  gateSnapshot,
  evaluateSurfaceReport,
  aggregateOverallHealth,
  createOperatorDashboardPolicyGate
};
