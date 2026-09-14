/**
 * @module delivery-policy-gate
 * SPEC-0061 / Mission BD — Fail-closed DENY helpers for Multi-Worktree /
 * Multi-Target Delivery Port: allowlist targets / Fundacion / isolation /
 * invalid DENY.
 *
 * DENY codes: FUNDACION_DENY, ALLOWLIST_DENY, ISOLATION_DENY,
 * APPLY_SEAL_DENY, MALFORMED_ARTIFACT, INVALID_REQUEST, POLICY_DENY,
 * NETWORK_DENY, LAW_VI_DENY.
 *
 * NON-CLAIM:
 *   policy-gate ≠ multi-tenant cloud fleet /
 *   ≠ Kubernetes CD /
 *   ≠ PRODUCTION_READY delivery product
 *   not BE/BF/BG; Fundacion Δ=0 (ALWAYS DENY default); Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

import {
  isFundacionPath,
  isDisallowedNetworkClaimPath,
  isIsolationViolation,
  observeBaIsolation,
  normalizeTarget
} from './delivery-target-boundary.js';

/** @type {'NO'} */
export const BD_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BD_POLICY_GATE_KIND = 'eos-multi-worktree-multi-target-delivery-policy-gate';

export const BD_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  ALLOWLIST_DENY: 'ALLOWLIST_DENY',
  ISOLATION_DENY: 'ISOLATION_DENY',
  APPLY_SEAL_DENY: 'APPLY_SEAL_DENY',
  MALFORMED_ARTIFACT: 'MALFORMED_ARTIFACT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  POLICY_DENY: 'POLICY_DENY',
  NETWORK_DENY: 'NETWORK_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY',
  DELIVERED: 'DELIVERED'
});

/** Default hermetic allowlisted worktree / target ids (virtual roots only). */
export const DEFAULT_ALLOWLISTED_TARGETS = Object.freeze([
  'wt-alpha',
  'wt-beta',
  'wt-gamma',
  'worktree/alpha',
  'worktree/beta',
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
    code: code || BD_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BD_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyAllowlist(reason = 'target outside allowlist', extra = {}) {
  return deny(BD_POLICY_CODES.ALLOWLIST_DENY, reason, extra);
}

export function denyIsolation(reason = 'BA isolation policy violation', extra = {}) {
  return deny(BD_POLICY_CODES.ISOLATION_DENY, reason, extra);
}

export function denyApplySeal(
  reason = 'missing or invalid BC apply seal',
  extra = {}
) {
  return deny(BD_POLICY_CODES.APPLY_SEAL_DENY, reason, extra);
}

export function denyMalformed(reason = 'malformed artifact', extra = {}) {
  return deny(BD_POLICY_CODES.MALFORMED_ARTIFACT, reason, extra);
}

export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(BD_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BD_POLICY_CODES.POLICY_DENY, reason, extra);
}

export function denyNetwork(
  reason = 'disallowed network/cloud fleet claim path',
  extra = {}
) {
  return deny(BD_POLICY_CODES.NETWORK_DENY, reason, extra);
}

export function denyLawVi(reason = 'Law VI leakage DENY', extra = {}) {
  return deny(BD_POLICY_CODES.LAW_VI_DENY, reason, extra);
}

/**
 * Check a single target against allowlist (exact, basename, or memory://).
 * @param {unknown} target
 * @param {Iterable<string>|string[]} [allowlist]
 * @returns {{ ok: boolean, code: string, reason: string|null, path?: string|null }}
 */
export function checkTargetAllowlisted(
  target,
  allowlist = DEFAULT_ALLOWLISTED_TARGETS
) {
  const n = normalizeTarget(target);
  if (!n.id) {
    return {
      ok: false,
      code: BD_POLICY_CODES.ALLOWLIST_DENY,
      reason: 'empty target',
      path: null
    };
  }
  const path = n.id;
  const set = new Set(
    [...allowlist].map((p) => {
      const t = normalizeTarget(p);
      return t.id;
    })
  );
  if (set.has(path)) {
    return {
      ok: true,
      code: BD_POLICY_CODES.OK,
      reason: null,
      path
    };
  }
  if (path.startsWith('memory://') && set.has('memory://fixture')) {
    return {
      ok: true,
      code: BD_POLICY_CODES.OK,
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
        code: BD_POLICY_CODES.OK,
        reason: null,
        path
      };
    }
  }
  return {
    ok: false,
    code: BD_POLICY_CODES.ALLOWLIST_DENY,
    reason: 'target outside allowlist',
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
  allowlist = DEFAULT_ALLOWLISTED_TARGETS
) {
  if (!Array.isArray(targets) || targets.length === 0) {
    return {
      ok: false,
      code: BD_POLICY_CODES.INVALID_REQUEST,
      reason: 'empty targets',
      path: null
    };
  }
  for (const t of targets) {
    const r = checkTargetAllowlisted(t, allowlist);
    if (!r.ok) return r;
  }
  return { ok: true, code: BD_POLICY_CODES.OK, reason: null };
}

/**
 * Validate a BC apply seal when required.
 * Accepts injectable seal object { ok:true, sealed:true, digest } or string digest.
 * @param {unknown} applySeal
 * @param {object} [opts]
 * @param {boolean} [opts.required]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkApplySeal(applySeal, opts = {}) {
  const required = opts.required === true;
  if (!required && (applySeal == null || applySeal === false)) {
    return { ok: true, code: BD_POLICY_CODES.OK, reason: null };
  }
  if (required && (applySeal == null || applySeal === false)) {
    return {
      ok: false,
      code: BD_POLICY_CODES.APPLY_SEAL_DENY,
      reason: 'missing BC apply seal'
    };
  }
  if (typeof applySeal === 'string') {
    if (/^[a-f0-9]{16,}$/i.test(applySeal)) {
      return { ok: true, code: BD_POLICY_CODES.OK, reason: null };
    }
    return {
      ok: false,
      code: BD_POLICY_CODES.APPLY_SEAL_DENY,
      reason: 'invalid BC apply seal'
    };
  }
  if (typeof applySeal === 'object') {
    const s = /** @type {Record<string, unknown>} */ (applySeal);
    if (s.ok === false || s.valid === false || s.sealed === false) {
      return {
        ok: false,
        code: BD_POLICY_CODES.APPLY_SEAL_DENY,
        reason: 'invalid BC apply seal'
      };
    }
    if (s.ok === true || s.sealed === true || s.valid === true || s.digest) {
      return { ok: true, code: BD_POLICY_CODES.OK, reason: null };
    }
    return {
      ok: false,
      code: BD_POLICY_CODES.APPLY_SEAL_DENY,
      reason: 'invalid BC apply seal'
    };
  }
  return {
    ok: false,
    code: BD_POLICY_CODES.APPLY_SEAL_DENY,
    reason: 'invalid BC apply seal'
  };
}

/**
 * Check BA isolation via injectable port / observe result.
 * @param {unknown} isolation
 * @param {object} [ctx]
 * @returns {{ ok: boolean, code: string, reason: string|null, meta?: object }}
 */
export function checkIsolation(isolation, ctx = {}) {
  if (isolation == null) {
    return { ok: true, code: BD_POLICY_CODES.OK, reason: null };
  }
  const meta = observeBaIsolation(isolation, ctx);
  if (meta.violation || isIsolationViolation(meta.result) || meta.ok === false) {
    return {
      ok: false,
      code: BD_POLICY_CODES.ISOLATION_DENY,
      reason: 'BA isolation policy violation',
      meta
    };
  }
  return { ok: true, code: BD_POLICY_CODES.OK, reason: null, meta };
}

/**
 * Fundacion / network / allowlist composite gate for a target list.
 * Fail-closed: first violation wins; no partial success.
 * @param {string[]} targets
 * @param {object} [opts]
 * @returns {{ ok: boolean, code: string, reason: string|null, path?: string|null }}
 */
export function gateTargets(targets, opts = {}) {
  const allowlist = opts.allowlist || DEFAULT_ALLOWLISTED_TARGETS;
  if (!Array.isArray(targets) || targets.length === 0) {
    return {
      ok: false,
      code: BD_POLICY_CODES.INVALID_REQUEST,
      reason: 'empty targets',
      path: null
    };
  }
  for (const t of targets) {
    if (isFundacionPath(t)) {
      return {
        ok: false,
        code: BD_POLICY_CODES.FUNDACION_DENY,
        reason: 'Fundacion ALWAYS_DENY',
        path: String(t)
      };
    }
    if (isDisallowedNetworkClaimPath(t)) {
      return {
        ok: false,
        code: BD_POLICY_CODES.NETWORK_DENY,
        reason: 'disallowed network/cloud fleet claim path',
        path: String(t)
      };
    }
    const allow = checkTargetAllowlisted(t, allowlist);
    if (!allow.ok) return allow;
  }
  return { ok: true, code: BD_POLICY_CODES.OK, reason: null };
}

/**
 * Create a policy-gate surface with injectable allowlist.
 * @param {object} [opts]
 * @param {string[]} [opts.allowlistedTargets]
 * @returns {object}
 */
export function createDeliveryPolicyGate(opts = {}) {
  const allowlisted = [
    ...(opts.allowlistedTargets ||
      opts.allowlistedPaths ||
      opts.allowlist ||
      DEFAULT_ALLOWLISTED_TARGETS)
  ];

  return {
    kind: BD_POLICY_GATE_KIND,
    PRODUCTION_READY: BD_POLICY_GATE_PRODUCTION_READY,
    codes: BD_POLICY_CODES,
    deny,
    denyFundacion,
    denyAllowlist,
    denyIsolation,
    denyApplySeal,
    denyMalformed,
    denyInvalidRequest,
    denyPolicy,
    denyNetwork,
    denyLawVi,
    checkTargetAllowlisted: (t) => checkTargetAllowlisted(t, allowlisted),
    checkTargetsAllowlisted: (t) => checkTargetsAllowlisted(t, allowlisted),
    checkApplySeal,
    checkIsolation,
    gateTargets: (t, extra = {}) =>
      gateTargets(t, { allowlist: allowlisted, ...extra }),
    listAllowlistedTargets: () => [...allowlisted],
    // NON-CLAIM surface
    multiTenantCloudFleet: false,
    kubernetesCd: false,
    productionReadyDeliveryProduct: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  BD_POLICY_GATE_KIND,
  BD_POLICY_GATE_PRODUCTION_READY,
  BD_POLICY_CODES,
  DEFAULT_ALLOWLISTED_TARGETS,
  deny,
  denyFundacion,
  denyAllowlist,
  denyIsolation,
  denyApplySeal,
  denyMalformed,
  denyInvalidRequest,
  denyPolicy,
  denyNetwork,
  denyLawVi,
  checkTargetAllowlisted,
  checkTargetsAllowlisted,
  checkApplySeal,
  checkIsolation,
  gateTargets,
  createDeliveryPolicyGate
};
