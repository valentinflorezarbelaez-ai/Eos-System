/**
 * @module governed-external-write-policy-gate
 * SPEC-0068 / Mission BK — Fail-closed preconditions for Governed External
 * Write Orchestrator: FUNDACION_ALWAYS_DENY, allowlist, Level 2 auth,
 * path containment, malformed DENY, missing precondition DENY.
 *
 * DENY codes: MALFORMED_PAYLOAD, FUNDACION_ALWAYS_DENY, ALLOWLIST_DENY,
 * PATH_CONTAINMENT_DENY, LEVEL2_AUTH_DENY, PRECONDITION_DENY,
 * UNAUTHORIZED_PATH, POLICY_DENY, DENY, OK.
 *
 * NON-CLAIM:
 *   policy-gate ≠ unsupervised fleet deploy /
 *   ≠ K8s/ArgoCD CD /
 *   ≠ PRODUCTION_READY=YES
 *   BH+BI+BJ MEASURED acknowledged; not BL; Fundacion Δ=0 (ALWAYS DENY default);
 *   Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration (BK-owned governed-external-write-* files).
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BK_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BK_POLICY_GATE_KIND = 'eos-governed-external-write-policy-gate';

/** Six hermetic preconditions (bitmask bits 0..5). */
export const BK_PRECONDITIONS = Object.freeze({
  REGISTRY: 'registry',
  INTAKE: 'intake',
  SPEC: 'spec',
  AUDIT: 'audit',
  OWNER_APPROVAL: 'ownerApproval',
  LEVEL2_AUTH: 'level2Auth'
});

export const BK_PRECONDITION_BITS = Object.freeze({
  registry: 1 << 0,
  intake: 1 << 1,
  spec: 1 << 2,
  audit: 1 << 3,
  ownerApproval: 1 << 4,
  level2Auth: 1 << 5
});

export const BK_PRECONDITION_ALL_MASK =
  BK_PRECONDITION_BITS.registry |
  BK_PRECONDITION_BITS.intake |
  BK_PRECONDITION_BITS.spec |
  BK_PRECONDITION_BITS.audit |
  BK_PRECONDITION_BITS.ownerApproval |
  BK_PRECONDITION_BITS.level2Auth;

export const BK_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  FUNDACION_DENY: 'FUNDACION_ALWAYS_DENY',
  ALLOWLIST_DENY: 'ALLOWLIST_DENY',
  PATH_CONTAINMENT_DENY: 'PATH_CONTAINMENT_DENY',
  LEVEL2_AUTH_DENY: 'LEVEL2_AUTH_DENY',
  PRECONDITION_DENY: 'PRECONDITION_DENY',
  UNAUTHORIZED_PATH: 'UNAUTHORIZED_PATH',
  POLICY_DENY: 'POLICY_DENY',
  WRITE_OK: 'WRITE_OK',
  ROLLBACK_OK: 'ROLLBACK_OK',
  PARTIAL_FAILURE: 'PARTIAL_FAILURE'
});

/** Default hermetic allowlisted relative paths (in-memory / fixtures only). */
export const DEFAULT_ALLOWLISTED_PATHS = Object.freeze([
  'workspace/allowlisted.js',
  'workspace/patch-target.js',
  'fixtures/write-target.js',
  'src/core/orchestration/governed-external-write-orchestrator.js',
  'memory://fixture'
]);

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
    code: code || BK_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyMalformed(
  reason = 'malformed write payload',
  extra = {}
) {
  return deny(BK_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyFundacion(
  reason = 'Fundacion ALWAYS_DENY',
  extra = {}
) {
  return deny(BK_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyAllowlist(reason = 'path outside allowlist', extra = {}) {
  return deny(BK_POLICY_CODES.ALLOWLIST_DENY, reason, extra);
}

export function denyPathContainment(
  reason = 'path escapes project root / containment',
  extra = {}
) {
  return deny(BK_POLICY_CODES.PATH_CONTAINMENT_DENY, reason, extra);
}

export function denyLevel2Auth(
  reason = 'Level 2 auth required',
  extra = {}
) {
  return deny(BK_POLICY_CODES.LEVEL2_AUTH_DENY, reason, extra);
}

export function denyPrecondition(
  reason = 'missing required precondition',
  extra = {}
) {
  return deny(BK_POLICY_CODES.PRECONDITION_DENY, reason, extra);
}

export function denyUnauthorizedPath(
  reason = 'unauthorized target path',
  extra = {}
) {
  return deny(BK_POLICY_CODES.UNAUTHORIZED_PATH, reason, extra);
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BK_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * Normalize a path for allowlist / Fundacion / containment checks.
 * @param {unknown} p
 * @returns {string}
 */
export function normalizePath(p) {
  if (p == null) return '';
  let s = String(p).replace(/\\/g, '/').trim();
  // Strip drive letters for containment heuristics
  s = s.replace(/^[A-Za-z]:/, '');
  while (s.startsWith('./')) s = s.slice(2);
  return s;
}

/**
 * Detect Fundacion / Documents + Fundacion targets (ALWAYS DENY).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'string') {
    const n = normalizePath(target).toLowerCase();
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
    const root = o.root != null ? normalizePath(o.root).toLowerCase() : '';
    if (
      id === 'fundacion' ||
      name === 'fundacion' ||
      root.includes('fundacion') ||
      id.includes('fundacion')
    ) {
      return true;
    }
    if (Array.isArray(o.paths)) {
      for (const p of o.paths) {
        if (isFundacionTarget(p)) return true;
      }
    }
  }
  return false;
}

/**
 * Check path against allowlist (exact, basename, prefix, or memory://).
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
    !String(targetPath).trim()
  ) {
    return {
      ok: false,
      code: BK_POLICY_CODES.MALFORMED_PAYLOAD,
      reason: 'empty target path',
      path: null
    };
  }
  const n = normalizePath(targetPath);
  const list = Array.from(allowlist || []).map((x) => normalizePath(x));
  if (n.startsWith('memory://')) {
    return { ok: true, code: BK_POLICY_CODES.OK, reason: null, path: n };
  }
  const base = n.split('/').pop() || n;
  for (const a of list) {
    if (a === n || a === base) {
      return { ok: true, code: BK_POLICY_CODES.OK, reason: null, path: n };
    }
    if (a.endsWith('/') && n.startsWith(a)) {
      return { ok: true, code: BK_POLICY_CODES.OK, reason: null, path: n };
    }
    if (n.startsWith(a + '/')) {
      return { ok: true, code: BK_POLICY_CODES.OK, reason: null, path: n };
    }
  }
  return {
    ok: false,
    code: BK_POLICY_CODES.ALLOWLIST_DENY,
    reason: `path outside allowlist: ${n}`,
    path: n
  };
}

/**
 * Path containment: reject .. segments and absolute escapes outside projectRoot.
 * @param {unknown} targetPath
 * @param {string} [projectRoot]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkPathContainment(targetPath, projectRoot = '') {
  const n = normalizePath(targetPath);
  if (!n) {
    return {
      ok: false,
      code: BK_POLICY_CODES.MALFORMED_PAYLOAD,
      reason: 'empty path for containment'
    };
  }
  if (n.includes('..') || n.split('/').includes('..')) {
    return {
      ok: false,
      code: BK_POLICY_CODES.PATH_CONTAINMENT_DENY,
      reason: 'path contains .. escape'
    };
  }
  if (n.startsWith('/') && projectRoot) {
    const root = normalizePath(projectRoot);
    if (root && !n.startsWith(root) && !n.startsWith('/' + root)) {
      return {
        ok: false,
        code: BK_POLICY_CODES.PATH_CONTAINMENT_DENY,
        reason: 'absolute path outside project root'
      };
    }
  }
  return { ok: true, code: BK_POLICY_CODES.OK, reason: null };
}

/**
 * Build precondition mask object + bitmask from context flags.
 * @param {object} [context]
 * @returns {{ mask: Record<string, boolean>, bitmask: number, missing: string[] }}
 */
export function buildPreconditionMask(context = {}) {
  const ctx = context != null && typeof context === 'object' ? context : {};
  const flags = {
    registry:
      ctx.registry === true ||
      ctx.hasRegistry === true ||
      ctx.preconditions?.registry === true,
    intake:
      ctx.intake === true ||
      ctx.hasIntake === true ||
      ctx.preconditions?.intake === true,
    spec:
      ctx.spec === true ||
      ctx.hasSpec === true ||
      ctx.preconditions?.spec === true,
    audit:
      ctx.audit === true ||
      ctx.hasAudit === true ||
      ctx.preconditions?.audit === true,
    ownerApproval:
      ctx.ownerApproval === true ||
      ctx.hasOwnerApproval === true ||
      ctx.preconditions?.ownerApproval === true,
    level2Auth:
      ctx.level2Auth === true ||
      ctx.hasLevel2Auth === true ||
      ctx.level2 === true ||
      ctx.preconditions?.level2Auth === true
  };
  let bitmask = 0;
  /** @type {string[]} */
  const missing = [];
  for (const [key, bit] of Object.entries(BK_PRECONDITION_BITS)) {
    if (flags[/** @type {keyof typeof flags} */ (key)]) {
      bitmask |= bit;
    } else {
      missing.push(key);
    }
  }
  return { mask: flags, bitmask, missing };
}

/**
 * Validate all six preconditions present.
 * @param {object} [targetProject]
 * @param {object} [context]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null, preconditionMask?: object, bitmask?: number, missing?: string[] }}
 */
export function validatePreconditions(targetProject, context = {}) {
  if (targetProject == null || typeof targetProject !== 'object') {
    return denyMalformed('targetProject must be an object');
  }
  if (isFundacionTarget(targetProject)) {
    return denyFundacion('Fundacion target ALWAYS_DENY');
  }
  const { mask, bitmask, missing } = buildPreconditionMask(context);
  if (missing.length > 0) {
    // Prefer LEVEL2_AUTH_DENY when only/also Level 2 is missing and named
    if (missing.includes('level2Auth') && missing.length === 1) {
      return denyLevel2Auth('Level 2 auth precondition missing', {
        preconditionMask: mask,
        bitmask,
        missing
      });
    }
    return denyPrecondition(
      `missing precondition(s): ${missing.join(', ')}`,
      { preconditionMask: mask, bitmask, missing }
    );
  }
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BK_POLICY_CODES.OK,
    reason: null,
    preconditionMask: mask,
    bitmask,
    missing: [],
    fundacionDelta: 0
  };
}

/**
 * Fail-closed gate for executeGovernedWrite request.
 * @param {object} req
 * @param {object} [opts]
 * @param {string[]} [opts.allowlist]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null, preconditionMask?: object, bitmask?: number, targetPaths?: string[] }}
 */
export function gateExecuteWrite(req, opts = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('executeGovernedWrite() requires an object request');
  }
  if (req.forceMalformed === true) {
    return denyMalformed('forced malformed write');
  }
  const targetProject = req.targetProject;
  if (targetProject == null || typeof targetProject !== 'object') {
    return denyMalformed('targetProject is required');
  }
  if (
    isFundacionTarget(targetProject) ||
    req.fundacion === true ||
    req.writeFundacion === true
  ) {
    return denyFundacion();
  }

  const context =
    req.context != null && typeof req.context === 'object' ? req.context : {};
  const pre = validatePreconditions(targetProject, context);
  if (!pre.ok) return pre;

  /** @type {string[]} */
  let targetPaths = [];
  if (Array.isArray(req.targetPaths)) {
    targetPaths = req.targetPaths.map((p) => String(p));
  } else if (Array.isArray(targetProject.paths)) {
    targetPaths = targetProject.paths.map((p) => String(p));
  } else if (
    req.diffPayload != null &&
    typeof req.diffPayload === 'object' &&
    Array.isArray(/** @type {Record<string, unknown>} */ (req.diffPayload).paths)
  ) {
    targetPaths = /** @type {Record<string, unknown>} */ (req.diffPayload)
      .paths.map((p) => String(p));
  } else if (
    req.diffPayload != null &&
    typeof req.diffPayload === 'object' &&
    /** @type {Record<string, unknown>} */ (req.diffPayload).path != null
  ) {
    targetPaths = [
      String(/** @type {Record<string, unknown>} */ (req.diffPayload).path)
    ];
  }

  if (targetPaths.length === 0 && req.allowEmptyPaths !== true) {
    return denyMalformed('targetPaths / diffPayload paths required');
  }

  const allowlist = opts.allowlist || DEFAULT_ALLOWLISTED_PATHS;
  const projectRoot =
    targetProject.root != null ? String(targetProject.root) : '';

  for (const p of targetPaths) {
    if (isFundacionTarget(p)) {
      return denyFundacion(`Fundacion path ALWAYS_DENY: ${p}`);
    }
    const contain = checkPathContainment(p, projectRoot);
    if (!contain.ok) {
      return denyPathContainment(contain.reason || 'path containment DENY', {
        path: p
      });
    }
    const al = checkPathAllowlisted(p, allowlist);
    if (!al.ok) {
      if (al.code === BK_POLICY_CODES.MALFORMED_PAYLOAD) {
        return denyMalformed(al.reason || 'malformed path');
      }
      return denyUnauthorizedPath(al.reason || 'unauthorized path', {
        path: p
      });
    }
  }

  // Level 2 auth explicit check (also covered by preconditions)
  if (context.level2Auth !== true && context.hasLevel2Auth !== true &&
      context.level2 !== true && context.preconditions?.level2Auth !== true) {
    return denyLevel2Auth();
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BK_POLICY_CODES.OK,
    reason: null,
    preconditionMask: pre.preconditionMask,
    bitmask: pre.bitmask,
    targetPaths,
    fundacionDelta: 0
  };
}

/**
 * Fail-closed gate for rollbackWrite.
 * @param {object} req
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateRollback(req) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('rollbackWrite() requires an object request');
  }
  if (req.forceMalformed === true) {
    return denyMalformed('forced malformed rollback');
  }
  const targetProject = req.targetProject;
  if (targetProject == null || typeof targetProject !== 'object') {
    return denyMalformed('targetProject is required for rollback');
  }
  if (isFundacionTarget(targetProject) || req.fundacion === true) {
    return denyFundacion();
  }
  if (req.transactionId == null || String(req.transactionId).trim() === '') {
    return denyMalformed('transactionId is required for rollback');
  }
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BK_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0
  };
}

/**
 * Create a policy-gate surface.
 * @param {object} [opts]
 * @returns {object}
 */
export function createGovernedExternalWritePolicyGate(opts = {}) {
  const allowlist = opts.allowlist || DEFAULT_ALLOWLISTED_PATHS;
  return {
    kind: BK_POLICY_GATE_KIND,
    PRODUCTION_READY: BK_POLICY_GATE_PRODUCTION_READY,
    codes: BK_POLICY_CODES,
    preconditions: BK_PRECONDITIONS,
    bits: BK_PRECONDITION_BITS,
    allMask: BK_PRECONDITION_ALL_MASK,
    allowlist,
    deny,
    denyMalformed,
    denyFundacion,
    denyAllowlist,
    denyPathContainment,
    denyLevel2Auth,
    denyPrecondition,
    denyUnauthorizedPath,
    denyPolicy,
    normalizePath,
    isFundacionTarget,
    checkPathAllowlisted: (p, al) =>
      checkPathAllowlisted(p, al || allowlist),
    checkPathContainment,
    buildPreconditionMask,
    validatePreconditions,
    gateExecuteWrite: (req, extra = {}) =>
      gateExecuteWrite(req, { allowlist, ...opts, ...extra }),
    gateRollback,
    // NON-CLAIM surface
    unsupervisedFleetDeploy: false,
    k8sArgoCd: false,
    productionReadyYes: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  BK_POLICY_GATE_KIND,
  BK_POLICY_GATE_PRODUCTION_READY,
  BK_PRECONDITIONS,
  BK_PRECONDITION_BITS,
  BK_PRECONDITION_ALL_MASK,
  BK_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyMalformed,
  denyFundacion,
  denyAllowlist,
  denyPathContainment,
  denyLevel2Auth,
  denyPrecondition,
  denyUnauthorizedPath,
  denyPolicy,
  normalizePath,
  isFundacionTarget,
  checkPathAllowlisted,
  checkPathContainment,
  buildPreconditionMask,
  validatePreconditions,
  gateExecuteWrite,
  gateRollback,
  createGovernedExternalWritePolicyGate
};
