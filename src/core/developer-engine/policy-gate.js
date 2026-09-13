/**
 * @module policy-gate
 * SPEC-0055 / Mission AX — Fail-closed DENY helpers for the Sovereign
 * Developer Engine Core.
 *
 * Codes: BUDGET_DENY, HITL_REQUIRED, LAW_VI_DENY, FUNDACION_DENY,
 * ARTIFACT_NOT_ALLOWLISTED, INVALID_REQUEST, PHASE_DENIED.
 *
 * NON-CLAIM:
 *   policy-gate ≠ unsupervised internet-facing agent
 *   policy-gate ≠ PRODUCTION_READY coding SaaS
 *   not AY/AZ/BA/BB
 *   Fundacion Δ=0 (ALWAYS DENY default)
 *   Antigravity-first
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AX_POLICY_GATE_PRODUCTION_READY = 'NO';

export const AX_POLICY_GATE_KIND = 'eos-developer-engine-policy-gate';

export const AX_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  BUDGET_DENY: 'BUDGET_DENY',
  HITL_REQUIRED: 'HITL_REQUIRED',
  LAW_VI_DENY: 'LAW_VI_DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  ARTIFACT_NOT_ALLOWLISTED: 'ARTIFACT_NOT_ALLOWLISTED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PHASE_DENIED: 'PHASE_DENIED',
  VERIFY_FAILED: 'VERIFY_FAILED',
  MISSING_DEP: 'MISSING_DEP'
});

/** Default hermetic allowlisted artifact paths (fixtures / local only). */
export const DEFAULT_ALLOWLISTED_ARTIFACTS = Object.freeze([
  'fixtures/hello.js',
  'fixtures/allowlisted-module.js',
  'src/core/developer-engine/sovereign-developer-engine.js',
  'workspace/allowlisted-artifact.js'
]);

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, code: string, reason: string, ... }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    code: code || AX_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

/**
 * @param {object} [extra]
 */
export function denyBudget(reason = 'budget gate denied', extra = {}) {
  return deny(AX_POLICY_CODES.BUDGET_DENY, reason, extra);
}

/**
 * @param {object} [extra]
 */
export function denyHitl(reason = 'HITL approval required', extra = {}) {
  return deny(AX_POLICY_CODES.HITL_REQUIRED, reason, extra);
}

/**
 * @param {object} [extra]
 */
export function denyLawVi(reason = 'Law VI policy violated', extra = {}) {
  return deny(AX_POLICY_CODES.LAW_VI_DENY, reason, extra);
}

/**
 * @param {object} [extra]
 */
export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(AX_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

/**
 * @param {object} [extra]
 */
export function denyArtifactNotAllowlisted(
  reason = 'artifact not allowlisted',
  extra = {}
) {
  return deny(AX_POLICY_CODES.ARTIFACT_NOT_ALLOWLISTED, reason, extra);
}

/**
 * @param {object} [extra]
 */
export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(AX_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

/**
 * Normalize a gate result from injectable budget/HITL/Law VI / writeBarrier.
 * @param {unknown} result
 * @param {string} denyCode
 * @returns {{ ok: boolean, allow: boolean, deny: boolean, code: string, reason: string|null, raw?: object }}
 */
export function normalizeGateResult(result, denyCode = AX_POLICY_CODES.DENY) {
  if (result == null || typeof result !== 'object') {
    return {
      ok: false,
      allow: false,
      deny: true,
      code: denyCode,
      reason: 'gate returned non-object'
    };
  }
  const r = /** @type {Record<string, unknown>} */ (result);
  const explicitDeny =
    r.allow === false ||
    r.ok === false ||
    r.deny === true ||
    r.tripped === true ||
    [
      'DENY',
      'BUDGET_DENY',
      'HITL_REQUIRED',
      'LAW_VI_DENY',
      'FUNDACION_DENY',
      'ECR_TRIPPED',
      'TOKEN_BUDGET_EXCEEDED',
      'COST_BUDGET_EXCEEDED'
    ].includes(String(r.code || ''));
  if (explicitDeny) {
    return {
      ok: false,
      allow: false,
      deny: true,
      code: String(r.code || denyCode),
      reason: r.reason != null ? String(r.reason) : 'gate denied',
      raw: r
    };
  }
  const allow =
    r.allow === true ||
    r.ok === true ||
    r.code === 'ALLOW' ||
    r.code === 'OK' ||
    r.approved === true;
  if (!allow) {
    return {
      ok: false,
      allow: false,
      deny: true,
      code: String(r.code || denyCode),
      reason: r.reason != null ? String(r.reason) : 'gate not allow',
      raw: r
    };
  }
  return {
    ok: true,
    allow: true,
    deny: false,
    code: String(r.code || AX_POLICY_CODES.OK),
    reason: null,
    raw: r
  };
}

/**
 * Check artifact path against allowlist (exact or basename match).
 * @param {unknown} artifactPath
 * @param {Iterable<string>|string[]} [allowlist]
 * @returns {{ ok: boolean, code: string, reason: string|null, artifactPath?: string }}
 */
export function checkArtifactAllowlisted(
  artifactPath,
  allowlist = DEFAULT_ALLOWLISTED_ARTIFACTS
) {
  if (
    artifactPath == null ||
    typeof artifactPath !== 'string' ||
    !artifactPath.trim()
  ) {
    return {
      ok: false,
      code: AX_POLICY_CODES.INVALID_REQUEST,
      reason: 'artifactPath required'
    };
  }
  const path = String(artifactPath).trim().replace(/\\/g, '/');
  const set = new Set([...allowlist].map((p) => String(p).replace(/\\/g, '/')));
  if (set.has(path)) {
    return {
      ok: true,
      code: AX_POLICY_CODES.OK,
      reason: null,
      artifactPath: path
    };
  }
  // basename match for hermetic fixtures
  const base = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  for (const a of set) {
    const ab = a.includes('/') ? a.slice(a.lastIndexOf('/') + 1) : a;
    if (ab === base && base.length > 0) {
      return {
        ok: true,
        code: AX_POLICY_CODES.OK,
        reason: null,
        artifactPath: path
      };
    }
  }
  return {
    ok: false,
    code: AX_POLICY_CODES.ARTIFACT_NOT_ALLOWLISTED,
    reason: 'artifact not allowlisted',
    artifactPath: path
  };
}

/**
 * Create a policy-gate surface with injectable allowlist.
 * @param {object} [opts]
 * @param {string[]} [opts.allowlistedArtifacts]
 * @returns {object}
 */
export function createPolicyGate(opts = {}) {
  const allowlisted = [
    ...(opts.allowlistedArtifacts || DEFAULT_ALLOWLISTED_ARTIFACTS)
  ];

  return {
    kind: AX_POLICY_GATE_KIND,
    PRODUCTION_READY: AX_POLICY_GATE_PRODUCTION_READY,
    codes: AX_POLICY_CODES,
    deny,
    denyBudget,
    denyHitl,
    denyLawVi,
    denyFundacion,
    denyArtifactNotAllowlisted,
    denyInvalidRequest,
    normalizeGateResult,
    checkArtifactAllowlisted: (p) =>
      checkArtifactAllowlisted(p, allowlisted),
    listAllowlistedArtifacts: () => [...allowlisted],
    // NON-CLAIM surface
    unsupervisedInternetAgency: false,
    productionReadyCodingSaas: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  AX_POLICY_GATE_KIND,
  AX_POLICY_GATE_PRODUCTION_READY,
  AX_POLICY_CODES,
  DEFAULT_ALLOWLISTED_ARTIFACTS,
  deny,
  denyBudget,
  denyHitl,
  denyLawVi,
  denyFundacion,
  denyArtifactNotAllowlisted,
  denyInvalidRequest,
  normalizeGateResult,
  checkArtifactAllowlisted,
  createPolicyGate
};
