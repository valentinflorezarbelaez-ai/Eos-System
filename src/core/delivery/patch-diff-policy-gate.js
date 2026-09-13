/**
 * @module patch-diff-policy-gate
 * SPEC-0060 / Mission BC — Fail-closed DENY helpers for Governed Patch /
 * Diff Apply Port: allowlist / Fundacion / Law VI / HITL / invalid.
 *
 * DENY codes: FUNDACION_DENY, ALLOWLIST_DENY, LAW_VI_DENY, HITL_REQUIRED,
 * ENGINE_SEAL_DENY, MALFORMED_PATCH, INVALID_REQUEST, POLICY_DENY.
 *
 * NON-CLAIM:
 *   policy-gate ≠ unsupervised auto-merge SaaS /
 *   ≠ GH Actions replacement /
 *   ≠ PRODUCTION_READY delivery product
 *   not BD/BE/BF/BG; Fundacion Δ=0 (ALWAYS DENY default); Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BC_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BC_POLICY_GATE_KIND = 'eos-governed-patch-diff-policy-gate';

export const BC_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  ALLOWLIST_DENY: 'ALLOWLIST_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY',
  HITL_REQUIRED: 'HITL_REQUIRED',
  ENGINE_SEAL_DENY: 'ENGINE_SEAL_DENY',
  MALFORMED_PATCH: 'MALFORMED_PATCH',
  INVALID_REQUEST: 'INVALID_REQUEST',
  POLICY_DENY: 'POLICY_DENY',
  APPLIED: 'APPLIED'
});

/** Default hermetic allowlisted relative paths (fixtures / in-memory only). */
export const DEFAULT_ALLOWLISTED_PATHS = Object.freeze([
  'workspace/allowlisted.js',
  'workspace/patch-target.js',
  'fixtures/patch-target.js',
  'src/core/delivery/governed-patch-diff-apply-port.js',
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
    code: code || BC_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BC_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyAllowlist(reason = 'path outside allowlist', extra = {}) {
  return deny(BC_POLICY_CODES.ALLOWLIST_DENY, reason, extra);
}

export function denyLawVi(reason = 'Law VI leakage DENY', extra = {}) {
  return deny(BC_POLICY_CODES.LAW_VI_DENY, reason, extra);
}

export function denyHitl(reason = 'HITL approval required', extra = {}) {
  return deny(BC_POLICY_CODES.HITL_REQUIRED, reason, extra);
}

export function denyEngineSeal(
  reason = 'missing or invalid AX engine seal',
  extra = {}
) {
  return deny(BC_POLICY_CODES.ENGINE_SEAL_DENY, reason, extra);
}

export function denyMalformed(reason = 'malformed patch', extra = {}) {
  return deny(BC_POLICY_CODES.MALFORMED_PATCH, reason, extra);
}

export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(BC_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BC_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * Check path against allowlist (exact, basename, or memory://).
 * @param {unknown} targetPath
 * @param {Iterable<string>|string[]} [allowlist]
 * @returns {{ ok: boolean, code: string, reason: string|null, path?: string|null }}
 */
export function checkPathAllowlisted(
  targetPath,
  allowlist = DEFAULT_ALLOWLISTED_PATHS
) {
  if (
    targetPath == null ||
    typeof targetPath !== 'string' ||
    !targetPath.trim()
  ) {
    return {
      ok: false,
      code: BC_POLICY_CODES.ALLOWLIST_DENY,
      reason: 'empty path',
      path: null
    };
  }
  const path = String(targetPath).trim().replace(/\\/g, '/').replace(/^\.\//, '');
  const set = new Set(
    [...allowlist].map((p) => String(p).replace(/\\/g, '/').replace(/^\.\//, ''))
  );
  if (set.has(path)) {
    return {
      ok: true,
      code: BC_POLICY_CODES.OK,
      reason: null,
      path
    };
  }
  // strip leading slash for relative allowlist compare
  const rel = path.replace(/^\//, '');
  if (set.has(rel)) {
    return { ok: true, code: BC_POLICY_CODES.OK, reason: null, path: rel };
  }
  if (path.startsWith('memory://') && set.has('memory://fixture')) {
    return {
      ok: true,
      code: BC_POLICY_CODES.OK,
      reason: null,
      path
    };
  }
  const base = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  for (const a of set) {
    const ab = a.includes('/') ? a.slice(a.lastIndexOf('/') + 1) : a;
    if (ab === base && base.length > 0) {
      return {
        ok: true,
        code: BC_POLICY_CODES.OK,
        reason: null,
        path
      };
    }
  }
  return {
    ok: false,
    code: BC_POLICY_CODES.ALLOWLIST_DENY,
    reason: 'path outside allowlist',
    path
  };
}

/**
 * Validate all targets against allowlist. Fail-closed on first miss.
 * @param {string[]} targets
 * @param {Iterable<string>|string[]} [allowlist]
 * @returns {{ ok: boolean, code: string, reason: string|null, path?: string|null }}
 */
export function checkTargetsAllowlisted(
  targets,
  allowlist = DEFAULT_ALLOWLISTED_PATHS
) {
  if (!Array.isArray(targets) || targets.length === 0) {
    return {
      ok: false,
      code: BC_POLICY_CODES.INVALID_REQUEST,
      reason: 'empty targets',
      path: null
    };
  }
  for (const t of targets) {
    const r = checkPathAllowlisted(t, allowlist);
    if (!r.ok) return r;
  }
  return { ok: true, code: BC_POLICY_CODES.OK, reason: null };
}

/**
 * Validate an AX engine seal when required.
 * Accepts injectable seal object { ok:true, sealed:true, digest } or string digest.
 * @param {unknown} engineSeal
 * @param {object} [opts]
 * @param {boolean} [opts.required]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkEngineSeal(engineSeal, opts = {}) {
  const required = opts.required === true;
  if (!required && (engineSeal == null || engineSeal === false)) {
    return { ok: true, code: BC_POLICY_CODES.OK, reason: null };
  }
  if (required && (engineSeal == null || engineSeal === false)) {
    return {
      ok: false,
      code: BC_POLICY_CODES.ENGINE_SEAL_DENY,
      reason: 'missing AX engine seal'
    };
  }
  if (typeof engineSeal === 'string') {
    if (/^[a-f0-9]{16,}$/i.test(engineSeal)) {
      return { ok: true, code: BC_POLICY_CODES.OK, reason: null };
    }
    return {
      ok: false,
      code: BC_POLICY_CODES.ENGINE_SEAL_DENY,
      reason: 'invalid AX engine seal'
    };
  }
  if (typeof engineSeal === 'object') {
    const s = /** @type {Record<string, unknown>} */ (engineSeal);
    if (s.ok === false || s.valid === false || s.sealed === false) {
      return {
        ok: false,
        code: BC_POLICY_CODES.ENGINE_SEAL_DENY,
        reason: 'invalid AX engine seal'
      };
    }
    if (s.ok === true || s.sealed === true || s.valid === true || s.digest) {
      return { ok: true, code: BC_POLICY_CODES.OK, reason: null };
    }
    return {
      ok: false,
      code: BC_POLICY_CODES.ENGINE_SEAL_DENY,
      reason: 'invalid AX engine seal'
    };
  }
  return {
    ok: false,
    code: BC_POLICY_CODES.ENGINE_SEAL_DENY,
    reason: 'invalid AX engine seal'
  };
}

/**
 * Create a policy-gate surface with injectable allowlist.
 * @param {object} [opts]
 * @param {string[]} [opts.allowlistedPaths]
 * @returns {object}
 */
export function createPatchDiffPolicyGate(opts = {}) {
  const allowlisted = [
    ...(opts.allowlistedPaths ||
      opts.allowlistedArtifacts ||
      opts.allowlist ||
      DEFAULT_ALLOWLISTED_PATHS)
  ];

  return {
    kind: BC_POLICY_GATE_KIND,
    PRODUCTION_READY: BC_POLICY_GATE_PRODUCTION_READY,
    codes: BC_POLICY_CODES,
    deny,
    denyFundacion,
    denyAllowlist,
    denyLawVi,
    denyHitl,
    denyEngineSeal,
    denyMalformed,
    denyInvalidRequest,
    denyPolicy,
    checkPathAllowlisted: (p) => checkPathAllowlisted(p, allowlisted),
    checkTargetsAllowlisted: (t) => checkTargetsAllowlisted(t, allowlisted),
    checkEngineSeal,
    listAllowlistedPaths: () => [...allowlisted],
    // NON-CLAIM surface
    unsupervisedAutoMergeSaas: false,
    ghActionsReplacement: false,
    productionReadyDeliveryProduct: false,
    autoMerge: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  BC_POLICY_GATE_KIND,
  BC_POLICY_GATE_PRODUCTION_READY,
  BC_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyFundacion,
  denyAllowlist,
  denyLawVi,
  denyHitl,
  denyEngineSeal,
  denyMalformed,
  denyInvalidRequest,
  denyPolicy,
  checkPathAllowlisted,
  checkTargetsAllowlisted,
  checkEngineSeal,
  createPatchDiffPolicyGate
};
