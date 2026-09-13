/**
 * @module repair-policy-gate
 * SPEC-0057 / Mission AZ — Fail-closed DENY helpers for Deterministic
 * Self-Repair & FDIR Remediation Bridge.
 *
 * DENY codes: UNBOUNDED_SELF_MOD_FORBIDDEN, FUNDACION_DENY, LAW_VI_DENY,
 * NOT_REMEDIABLE, INVALID_FAULT, MISSING_DEP, INVALID_REQUEST, HITL_REQUIRED.
 *
 * NON-CLAIM:
 *   policy-gate ≠ unbounded self-modifying AGI /
 *   ≠ unsupervised internet remediator /
 *   ≠ CloudAgent self-heal fleet
 *   not BA/BB; Fundacion Δ=0 (ALWAYS DENY default); Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AZ_POLICY_GATE_PRODUCTION_READY = 'NO';

export const AZ_POLICY_GATE_KIND = 'eos-deterministic-self-repair-policy-gate';

export const AZ_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  UNBOUNDED_SELF_MOD_FORBIDDEN: 'UNBOUNDED_SELF_MOD_FORBIDDEN',
  FUNDACION_DENY: 'FUNDACION_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY',
  NOT_REMEDIABLE: 'NOT_REMEDIABLE',
  INVALID_FAULT: 'INVALID_FAULT',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  HITL_REQUIRED: 'HITL_REQUIRED',
  COMPLETED: 'COMPLETED'
});

/** Default hermetic allowlisted artifact paths (fixtures / in-memory only). */
export const DEFAULT_ALLOWLISTED_PATHS = Object.freeze([
  'fixtures/broken-syntax.js',
  'fixtures/missing-dep.js',
  'fixtures/allowlisted-artifact.js',
  'fixtures/schema-dev.js',
  'src/core/developer-engine/self-repair-fdir-bridge.js',
  'workspace/allowlisted-artifact.js',
  'memory://fixture'
]);

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, code: string, reason: string }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    code: code || AZ_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyUnboundedSelfMod(
  reason = 'unbounded self-mod forbidden',
  extra = {}
) {
  return deny(AZ_POLICY_CODES.UNBOUNDED_SELF_MOD_FORBIDDEN, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(AZ_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyLawVi(reason = 'Law VI leakage DENY', extra = {}) {
  return deny(AZ_POLICY_CODES.LAW_VI_DENY, reason, extra);
}

export function denyNotRemediable(reason = 'fault not remediable', extra = {}) {
  return deny(AZ_POLICY_CODES.NOT_REMEDIABLE, reason, extra);
}

export function denyInvalidFault(reason = 'invalid fault', extra = {}) {
  return deny(AZ_POLICY_CODES.INVALID_FAULT, reason, extra);
}

export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(AZ_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

export function denyHitlRequired(reason = 'HITL required', extra = {}) {
  return deny(AZ_POLICY_CODES.HITL_REQUIRED, reason, extra);
}

/**
 * Check artifact path against allowlist (exact, basename, or memory://).
 * @param {unknown} artifactPath
 * @param {Iterable<string>|string[]} [allowlist]
 * @returns {{ ok: boolean, code: string, reason: string|null, artifactPath?: string }}
 */
export function checkPathAllowlisted(
  artifactPath,
  allowlist = DEFAULT_ALLOWLISTED_PATHS
) {
  if (
    artifactPath == null ||
    typeof artifactPath !== 'string' ||
    !artifactPath.trim()
  ) {
    // Path optional for some faults (budget) — caller decides
    return {
      ok: true,
      code: AZ_POLICY_CODES.OK,
      reason: null,
      artifactPath: null
    };
  }
  const path = String(artifactPath).trim().replace(/\\/g, '/');
  const set = new Set([...allowlist].map((p) => String(p).replace(/\\/g, '/')));
  if (set.has(path)) {
    return {
      ok: true,
      code: AZ_POLICY_CODES.OK,
      reason: null,
      artifactPath: path
    };
  }
  if (path.startsWith('memory://') && set.has('memory://fixture')) {
    return {
      ok: true,
      code: AZ_POLICY_CODES.OK,
      reason: null,
      artifactPath: path
    };
  }
  const base = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  for (const a of set) {
    const ab = a.includes('/') ? a.slice(a.lastIndexOf('/') + 1) : a;
    if (ab === base && base.length > 0) {
      return {
        ok: true,
        code: AZ_POLICY_CODES.OK,
        reason: null,
        artifactPath: path
      };
    }
  }
  return {
    ok: false,
    code: AZ_POLICY_CODES.INVALID_REQUEST,
    reason: 'path not allowlisted',
    artifactPath: path
  };
}

/**
 * Create a policy-gate surface with injectable allowlist.
 * @param {object} [opts]
 * @param {string[]} [opts.allowlistedPaths]
 * @returns {object}
 */
export function createRepairPolicyGate(opts = {}) {
  const allowlisted = [
    ...(opts.allowlistedPaths ||
      opts.allowlistedArtifacts ||
      DEFAULT_ALLOWLISTED_PATHS)
  ];

  return {
    kind: AZ_POLICY_GATE_KIND,
    PRODUCTION_READY: AZ_POLICY_GATE_PRODUCTION_READY,
    codes: AZ_POLICY_CODES,
    deny,
    denyUnboundedSelfMod,
    denyFundacion,
    denyLawVi,
    denyNotRemediable,
    denyInvalidFault,
    denyInvalidRequest,
    denyHitlRequired,
    checkPathAllowlisted: (p) => checkPathAllowlisted(p, allowlisted),
    listAllowlistedPaths: () => [...allowlisted],
    // NON-CLAIM surface
    unboundedSelfModifyingAgi: false,
    unsupervisedInternetRemediator: false,
    cloudAgentSelfHealFleet: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  AZ_POLICY_GATE_KIND,
  AZ_POLICY_GATE_PRODUCTION_READY,
  AZ_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyUnboundedSelfMod,
  denyFundacion,
  denyLawVi,
  denyNotRemediable,
  denyInvalidFault,
  denyInvalidRequest,
  denyHitlRequired,
  checkPathAllowlisted,
  createRepairPolicyGate
};
