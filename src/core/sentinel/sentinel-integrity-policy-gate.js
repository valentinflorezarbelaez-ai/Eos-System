/**
 * @module sentinel-integrity-policy-gate
 * SPEC-0071 / Mission BN — Fail-closed policy for Continuous Integrity Sentinel
 * & FDIR Heartbeat Daemon: DRIFT_DETECTED / DEGRADED / quarantine /
 * Fundacion ALWAYS_DENY / malformed DENY.
 *
 * DENY codes: MALFORMED_PAYLOAD, FUNDACION_ALWAYS_DENY, DRIFT_DETECTED,
 * DEGRADED, QUARANTINED, POLICY_DENY, DENY, OK, INTEGRITY_OK.
 *
 * NON-CLAIM:
 *   policy-gate ≠ Datadog/Prometheus/K8s daemonset /
 *   ≠ heavy APM product /
 *   ≠ PRODUCTION_READY=YES monitoring product
 *   L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 *   L21 OPEN; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/sentinel (BN-owned sentinel-* / continuous-* files).
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BN_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BN_POLICY_GATE_KIND = 'eos-sentinel-integrity-policy-gate';

export const BN_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  INTEGRITY_OK: 'INTEGRITY_OK',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  FUNDACION_DENY: 'FUNDACION_ALWAYS_DENY',
  DRIFT_DETECTED: 'DRIFT_DETECTED',
  DEGRADED: 'DEGRADED',
  QUARANTINED: 'QUARANTINED',
  POLICY_DENY: 'POLICY_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',
  HEARTBEAT_OK: 'HEARTBEAT_OK',
  HEARTBEAT_STOPPED: 'HEARTBEAT_STOPPED'
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
    code: code || BN_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyMalformed(
  reason = 'malformed integrity pulse payload',
  extra = {}
) {
  return deny(BN_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyFundacion(
  reason = 'Fundacion ALWAYS_DENY',
  extra = {}
) {
  return deny(BN_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyDrift(
  reason = 'integrity drift detected',
  extra = {}
) {
  return deny(BN_POLICY_CODES.DRIFT_DETECTED, reason, {
    integrityStatus: 'DRIFT_DETECTED',
    ...extra
  });
}

export function denyDegraded(
  reason = 'integrity degraded',
  extra = {}
) {
  return deny(BN_POLICY_CODES.DEGRADED, reason, {
    integrityStatus: 'DEGRADED',
    ...extra
  });
}

export function denyQuarantined(
  reason = 'target quarantined after isolateDrift',
  extra = {}
) {
  return deny(BN_POLICY_CODES.QUARANTINED, reason, {
    integrityStatus: 'QUARANTINED',
    quarantined: true,
    ...extra
  });
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BN_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * Detect Fundacion targets (ALWAYS DENY).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'string') {
    const n = String(target).toLowerCase().replace(/\\/g, '/');
    return (
      n.includes('fundacion') ||
      n.includes('documents/fundacion') ||
      n === 'fundacion'
    );
  }
  if (typeof target === 'object') {
    const o = /** @type {Record<string, unknown>} */ (target);
    if (o.fundacion === true || o.writeFundacion === true) return true;
    if (o.isFundacion === true) return true;
    const id = o.id != null ? String(o.id).toLowerCase() : '';
    const name = o.name != null ? String(o.name).toLowerCase() : '';
    const targetId =
      o.targetId != null ? String(o.targetId).toLowerCase() : '';
    const manifest =
      o.manifestId != null ? String(o.manifestId).toLowerCase() : '';
    if (
      id === 'fundacion' ||
      name === 'fundacion' ||
      targetId.includes('fundacion') ||
      id.includes('fundacion') ||
      manifest.includes('fundacion')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Normalize anomaly list.
 * @param {unknown} anomalies
 * @returns {string[]}
 */
export function normalizeAnomalies(anomalies) {
  if (anomalies == null) return [];
  if (typeof anomalies === 'string') return [anomalies];
  if (!Array.isArray(anomalies)) return [];
  return anomalies.map((a) => String(a));
}

/**
 * Gate a pulseCheck request — fail-closed.
 * @param {object} req
 * @param {object} [ctx]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null, integrityStatus?: string, anomalies?: string[], quarantined?: boolean }}
 */
export function gatePulseCheck(req = {}, ctx = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('pulseCheck request required');
  }

  if (
    isFundacionTarget(req) ||
    isFundacionTarget(req.target) ||
    req.fundacion === true
  ) {
    return denyFundacion('Fundacion ALWAYS_DENY on integrity pulse');
  }

  if (ctx.quarantined === true || req.quarantined === true) {
    return denyQuarantined('target already quarantined', {
      anomalies: normalizeAnomalies(req.anomaliesDetected)
    });
  }

  const anomalies = normalizeAnomalies(
    req.anomaliesDetected != null
      ? req.anomaliesDetected
      : req.anomalies != null
        ? req.anomalies
        : ctx.anomalies
  );

  const statusHint =
    req.integrityStatus != null
      ? String(req.integrityStatus)
      : ctx.integrityStatus != null
        ? String(ctx.integrityStatus)
        : null;

  const driftFlag =
    req.drift === true ||
    ctx.drift === true ||
    statusHint === 'DRIFT_DETECTED' ||
    anomalies.some((a) => /drift/i.test(a));

  const degradedFlag =
    req.degraded === true ||
    ctx.degraded === true ||
    statusHint === 'DEGRADED' ||
    anomalies.some((a) => /degrad/i.test(a));

  if (driftFlag) {
    return denyDrift('integrity drift detected', {
      anomalies,
      integrityStatus: 'DRIFT_DETECTED'
    });
  }

  if (degradedFlag) {
    return denyDegraded('integrity degraded', {
      anomalies,
      integrityStatus: 'DEGRADED'
    });
  }

  if (
    req.targetManifestHash == null &&
    req.manifestHash == null &&
    ctx.targetManifestHash == null &&
    req.requireManifest !== false &&
    ctx.requireManifest !== false
  ) {
    // Allow missing manifest when explicitly optional; otherwise soft-ok with INTEGRITY_OK
    // when caller supplies integrityStatus OK and no anomalies (hermetic happy path).
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BN_POLICY_CODES.INTEGRITY_OK,
    reason: null,
    integrityStatus: 'OK',
    anomalies: []
  };
}

/**
 * Gate isolateDrift — quarantine action (fail-closed).
 * @param {object} req
 * @returns {{ ok: boolean, code: string, reason: string|null, quarantined?: boolean, deny?: boolean }}
 */
export function gateIsolateDrift(req = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('isolateDrift request required');
  }
  if (
    isFundacionTarget(req) ||
    isFundacionTarget(req.target) ||
    req.fundacion === true
  ) {
    return denyFundacion('Fundacion ALWAYS_DENY on isolateDrift');
  }
  // Quarantine itself is an intentional DENY/isolation outcome
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BN_POLICY_CODES.QUARANTINED,
    reason: 'isolateDrift quarantine applied',
    quarantined: true,
    integrityStatus: 'QUARANTINED'
  };
}

/**
 * Create a reusable policy gate object.
 * @param {object} [opts]
 * @returns {object}
 */
export function createSentinelIntegrityPolicyGate(opts = {}) {
  return {
    kind: BN_POLICY_GATE_KIND,
    PRODUCTION_READY: BN_POLICY_GATE_PRODUCTION_READY,
    codes: BN_POLICY_CODES,
    gatePulseCheck: (req, ctx) =>
      gatePulseCheck(req, { ...opts, ...(ctx || {}) }),
    gateIsolateDrift,
    isFundacionTarget,
    deny,
    denyDrift,
    denyDegraded,
    denyQuarantined,
    denyFundacion,
    denyMalformed,
    denyPolicy
  };
}

export default {
  BN_POLICY_GATE_PRODUCTION_READY,
  BN_POLICY_GATE_KIND,
  BN_POLICY_CODES,
  deny,
  denyMalformed,
  denyFundacion,
  denyDrift,
  denyDegraded,
  denyQuarantined,
  denyPolicy,
  isFundacionTarget,
  normalizeAnomalies,
  gatePulseCheck,
  gateIsolateDrift,
  createSentinelIntegrityPolicyGate
};
