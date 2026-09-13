/**
 * @module sandbox-policy-gate
 * SPEC-0058 / Mission BA — Fail-closed DENY helpers for Local Sandboxed
 * Container / Worker Isolation Port.
 *
 * DENY codes: ESCAPE_DENY, NETWORK_DENY, FUNDACION_DENY, TIMEOUT_DENY,
 * INVALID_REQUEST, POLICY_DENY, MISSING_DEP, ARTIFACT_NOT_ALLOWLISTED.
 *
 * NON-CLAIM:
 *   policy-gate ≠ K8s multi-tenant cloud /
 *   ≠ managed container SaaS /
 *   ≠ CloudAgent remote fleet
 *   not BB; Fundacion Δ=0 (ALWAYS DENY default); Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BA_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BA_POLICY_GATE_KIND = 'eos-local-sandbox-policy-gate';

export const BA_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  ESCAPE_DENY: 'ESCAPE_DENY',
  NETWORK_DENY: 'NETWORK_DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  POLICY_DENY: 'POLICY_DENY',
  TIMEOUT_DENY: 'TIMEOUT_DENY',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_DEP: 'MISSING_DEP',
  ARTIFACT_NOT_ALLOWLISTED: 'ARTIFACT_NOT_ALLOWLISTED',
  COMPLETED: 'COMPLETED'
});

/** Default hermetic allowlisted artifact paths (fixtures / in-memory only). */
export const DEFAULT_ALLOWLISTED_PATHS = Object.freeze([
  'workspace/allowlisted-step.js',
  'workspace/isolated-compute.js',
  'fixtures/sandbox-step.js',
  'src/core/developer-engine/local-sandbox-container-port.js',
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
    code: code || BA_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyEscape(reason = 'path outside root prison', extra = {}) {
  return deny(BA_POLICY_CODES.ESCAPE_DENY, reason, extra);
}

export function denyNetwork(reason = 'network egress DENY', extra = {}) {
  return deny(BA_POLICY_CODES.NETWORK_DENY, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BA_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyTimeout(reason = 'process timeout DENY', extra = {}) {
  return deny(BA_POLICY_CODES.TIMEOUT_DENY, reason, extra);
}

export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(BA_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

export function denyPolicy(reason = 'policy escape DENY', extra = {}) {
  return deny(BA_POLICY_CODES.POLICY_DENY, reason, extra);
}

export function denyMissingDep(reason = 'missing dependency', extra = {}) {
  return deny(BA_POLICY_CODES.MISSING_DEP, reason, extra);
}

export function denyArtifactNotAllowlisted(
  reason = 'artifact not allowlisted',
  extra = {}
) {
  return deny(BA_POLICY_CODES.ARTIFACT_NOT_ALLOWLISTED, reason, extra);
}

/**
 * Check artifact path against allowlist (exact, basename, or memory://).
 * Empty / missing path is OK (in-memory step).
 * @param {unknown} artifactPath
 * @param {Iterable<string>|string[]} [allowlist]
 * @returns {{ ok: boolean, code: string, reason: string|null, artifactPath?: string|null }}
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
    return {
      ok: true,
      code: BA_POLICY_CODES.OK,
      reason: null,
      artifactPath: null
    };
  }
  const path = String(artifactPath).trim().replace(/\\/g, '/');
  const set = new Set([...allowlist].map((p) => String(p).replace(/\\/g, '/')));
  if (set.has(path)) {
    return {
      ok: true,
      code: BA_POLICY_CODES.OK,
      reason: null,
      artifactPath: path
    };
  }
  if (path.startsWith('memory://') && set.has('memory://fixture')) {
    return {
      ok: true,
      code: BA_POLICY_CODES.OK,
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
        code: BA_POLICY_CODES.OK,
        reason: null,
        artifactPath: path
      };
    }
  }
  return {
    ok: false,
    code: BA_POLICY_CODES.ARTIFACT_NOT_ALLOWLISTED,
    reason: 'artifact not allowlisted',
    artifactPath: path
  };
}

/**
 * Create a policy-gate surface with injectable allowlist.
 * @param {object} [opts]
 * @param {string[]} [opts.allowlistedPaths]
 * @returns {object}
 */
export function createSandboxPolicyGate(opts = {}) {
  const allowlisted = [
    ...(opts.allowlistedPaths ||
      opts.allowlistedArtifacts ||
      opts.allowlist ||
      DEFAULT_ALLOWLISTED_PATHS)
  ];

  return {
    kind: BA_POLICY_GATE_KIND,
    PRODUCTION_READY: BA_POLICY_GATE_PRODUCTION_READY,
    codes: BA_POLICY_CODES,
    deny,
    denyEscape,
    denyNetwork,
    denyFundacion,
    denyTimeout,
    denyInvalidRequest,
    denyPolicy,
    denyMissingDep,
    denyArtifactNotAllowlisted,
    checkPathAllowlisted: (p) => checkPathAllowlisted(p, allowlisted),
    listAllowlistedPaths: () => [...allowlisted],
    // NON-CLAIM surface
    k8sMultiTenantCloud: false,
    managedContainerSaas: false,
    cloudAgentRemoteFleet: false,
    cloudAgent: false,
    usesDockerDaemon: false,
    fundacionDelta: 0
  };
}

export default {
  BA_POLICY_GATE_KIND,
  BA_POLICY_GATE_PRODUCTION_READY,
  BA_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyEscape,
  denyNetwork,
  denyFundacion,
  denyTimeout,
  denyInvalidRequest,
  denyPolicy,
  denyMissingDep,
  denyArtifactNotAllowlisted,
  checkPathAllowlisted,
  createSandboxPolicyGate
};
