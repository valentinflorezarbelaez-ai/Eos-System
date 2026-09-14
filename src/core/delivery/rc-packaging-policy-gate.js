/**
 * @module rc-packaging-policy-gate
 * SPEC-0063 / Mission BF — Fail-closed DENY helpers for Local Release
 * Candidate Packaging & Artifact Notary Port: PRODUCTION_READY=YES
 * implication, public registry / GH Releases publish, Fundacion, HITL,
 * invalid, empty, missing seals, custody break.
 *
 * DENY codes: PRODUCTION_READY_YES_DENY, REGISTRY_PUBLISH_DENY,
 * GH_RELEASES_DENY, FUNDACION_DENY, HITL_DENY, APPLY_SEAL_DENY,
 * DELIVERY_SEAL_DENY, REPLAY_SEAL_DENY, MALFORMED_ARTIFACTS,
 * EMPTY_ARTIFACTS, INVALID_REQUEST, EMPTY_REQUEST, POLICY_DENY,
 * LAW_VI_DENY, CUSTODY_BREAK.
 *
 * NON-CLAIM:
 *   policy-gate ≠ PRODUCTION_READY=YES flip /
 *   ≠ public registry publish /
 *   ≠ GH Releases product
 *   not BG; Fundacion Δ=0 (ALWAYS DENY default); Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

import {
  isFundacionPath,
  impliesProductionReadyYes,
  detectPublishIntent,
  hasSealCustodyFields
} from './rc-package-boundary.js';

/** @type {'NO'} */
export const BF_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BF_POLICY_GATE_KIND =
  'eos-local-rc-packaging-artifact-notary-policy-gate';

export const BF_POLICY_CODES = Object.freeze({
  OK: 'OK',
  PACKAGED: 'PACKAGED',
  DENY: 'DENY',
  PRODUCTION_READY_YES_DENY: 'PRODUCTION_READY_YES_DENY',
  REGISTRY_PUBLISH_DENY: 'REGISTRY_PUBLISH_DENY',
  GH_RELEASES_DENY: 'GH_RELEASES_DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  HITL_DENY: 'HITL_DENY',
  APPLY_SEAL_DENY: 'APPLY_SEAL_DENY',
  DELIVERY_SEAL_DENY: 'DELIVERY_SEAL_DENY',
  REPLAY_SEAL_DENY: 'REPLAY_SEAL_DENY',
  MALFORMED_ARTIFACTS: 'MALFORMED_ARTIFACTS',
  EMPTY_ARTIFACTS: 'EMPTY_ARTIFACTS',
  INVALID_REQUEST: 'INVALID_REQUEST',
  EMPTY_REQUEST: 'EMPTY_REQUEST',
  POLICY_DENY: 'POLICY_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY',
  CUSTODY_BREAK: 'CUSTODY_BREAK'
});

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
    code: code || BF_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyProductionReadyYes(
  reason = 'PRODUCTION_READY=YES implication DENY',
  extra = {}
) {
  return deny(BF_POLICY_CODES.PRODUCTION_READY_YES_DENY, reason, extra);
}

export function denyRegistryPublish(
  reason = 'public registry publish intent DENY',
  extra = {}
) {
  return deny(BF_POLICY_CODES.REGISTRY_PUBLISH_DENY, reason, extra);
}

export function denyGhReleases(
  reason = 'GH Releases publish intent DENY',
  extra = {}
) {
  return deny(BF_POLICY_CODES.GH_RELEASES_DENY, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BF_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyHitl(reason = 'HITL required / unapproved', extra = {}) {
  return deny(BF_POLICY_CODES.HITL_DENY, reason, extra);
}

export function denyApplySeal(
  reason = 'missing or invalid BC apply seal',
  extra = {}
) {
  return deny(BF_POLICY_CODES.APPLY_SEAL_DENY, reason, extra);
}

export function denyDeliverySeal(
  reason = 'missing or invalid BD delivery seal',
  extra = {}
) {
  return deny(BF_POLICY_CODES.DELIVERY_SEAL_DENY, reason, extra);
}

export function denyReplaySeal(
  reason = 'missing or invalid BE replay seal',
  extra = {}
) {
  return deny(BF_POLICY_CODES.REPLAY_SEAL_DENY, reason, extra);
}

export function denyMalformedArtifacts(
  reason = 'malformed artifacts',
  extra = {}
) {
  return deny(BF_POLICY_CODES.MALFORMED_ARTIFACTS, reason, extra);
}

export function denyEmptyArtifacts(reason = 'empty artifacts', extra = {}) {
  return deny(BF_POLICY_CODES.EMPTY_ARTIFACTS, reason, extra);
}

export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(BF_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

export function denyEmpty(reason = 'empty request', extra = {}) {
  return deny(BF_POLICY_CODES.EMPTY_REQUEST, reason, extra);
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BF_POLICY_CODES.POLICY_DENY, reason, extra);
}

export function denyLawVi(reason = 'Law VI leakage DENY', extra = {}) {
  return deny(BF_POLICY_CODES.LAW_VI_DENY, reason, extra);
}

export function denyCustody(
  reason = 'broken custody (missing seal fields)',
  extra = {}
) {
  return deny(BF_POLICY_CODES.CUSTODY_BREAK, reason, extra);
}

/**
 * Validate a sealed object when required.
 * Accepts { ok:true, sealed:true, digest } or a hex digest string.
 * @param {unknown} seal
 * @param {object} [opts]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkSeal(seal, opts = {}) {
  const required = opts.required === true;
  const missCode = opts.missingCode || BF_POLICY_CODES.APPLY_SEAL_DENY;
  const missReason = opts.missingReason || 'missing required seal';
  if (!required && (seal == null || seal === false)) {
    return { ok: true, code: BF_POLICY_CODES.OK, reason: null };
  }
  if (required && (seal == null || seal === false)) {
    return { ok: false, code: missCode, reason: missReason };
  }
  if (typeof seal === 'string') {
    if (/^[a-f0-9]{16,}$/i.test(seal)) {
      return { ok: true, code: BF_POLICY_CODES.OK, reason: null };
    }
    return { ok: false, code: missCode, reason: 'invalid required seal' };
  }
  if (typeof seal === 'object') {
    const s = /** @type {Record<string, unknown>} */ (seal);
    if (s.ok === false || s.valid === false || s.sealed === false) {
      return { ok: false, code: missCode, reason: 'invalid required seal' };
    }
    if (s.ok === true || s.sealed === true || s.valid === true || s.digest) {
      return { ok: true, code: BF_POLICY_CODES.OK, reason: null };
    }
    return { ok: false, code: missCode, reason: 'invalid required seal' };
  }
  return { ok: false, code: missCode, reason: 'invalid required seal' };
}

export function checkApplySeal(applySeal, opts = {}) {
  return checkSeal(applySeal, {
    required: opts.required === true,
    missingCode: BF_POLICY_CODES.APPLY_SEAL_DENY,
    missingReason: 'missing BC apply seal'
  });
}

export function checkDeliverySeal(deliverySeal, opts = {}) {
  return checkSeal(deliverySeal, {
    required: opts.required === true,
    missingCode: BF_POLICY_CODES.DELIVERY_SEAL_DENY,
    missingReason: 'missing BD delivery seal'
  });
}

export function checkReplaySeal(replaySeal, opts = {}) {
  return checkSeal(replaySeal, {
    required: opts.required === true,
    missingCode: BF_POLICY_CODES.REPLAY_SEAL_DENY,
    missingReason: 'missing BE replay seal'
  });
}

/**
 * HITL gate: required approval missing → HITL_DENY.
 * @param {object} req
 * @param {object} [policy]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkHitl(req = {}, policy = {}) {
  const required =
    policy.hitlRequired === true ||
    req.hitlRequired === true ||
    (req.hitl === true && req.hitlApproval !== true && req.approved !== true);
  if (!required && req.hitl !== true) {
    return { ok: true, code: BF_POLICY_CODES.OK, reason: null };
  }
  const approved = req.hitlApproval === true || req.approved === true;
  if (required && !approved) {
    return {
      ok: false,
      code: BF_POLICY_CODES.HITL_DENY,
      reason: 'HITL required / unapproved'
    };
  }
  return { ok: true, code: BF_POLICY_CODES.OK, reason: null };
}

/**
 * Custody gate for a required seal object.
 * @param {unknown} seal
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkCustody(seal) {
  const c = hasSealCustodyFields(seal);
  if (!c.ok) {
    return {
      ok: false,
      code: BF_POLICY_CODES.CUSTODY_BREAK,
      reason: c.reason || 'broken custody (missing seal fields)'
    };
  }
  return { ok: true, code: BF_POLICY_CODES.OK, reason: null };
}

/**
 * Composite request gate (Fundacion / PR-YES / publish / HITL).
 * @param {object} req
 * @param {object} [opts]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function gatePackagingRequest(req, opts = {}) {
  const policy =
    opts.policy && typeof opts.policy === 'object' ? opts.policy : {};
  if (req == null || typeof req !== 'object') {
    return {
      ok: false,
      code: BF_POLICY_CODES.INVALID_REQUEST,
      reason: 'packageAndNotarize() requires an object request'
    };
  }
  if (
    isFundacionPath(req) ||
    req.fundacion === true ||
    req.writeFundacion === true
  ) {
    return {
      ok: false,
      code: BF_POLICY_CODES.FUNDACION_DENY,
      reason: 'Fundacion ALWAYS_DENY'
    };
  }
  if (impliesProductionReadyYes(req) || impliesProductionReadyYes(policy)) {
    return {
      ok: false,
      code: BF_POLICY_CODES.PRODUCTION_READY_YES_DENY,
      reason: 'PRODUCTION_READY=YES implication DENY'
    };
  }
  const pub = detectPublishIntent(req);
  if (pub.intent) {
    const code =
      /gh.?release/i.test(pub.reason || '') ||
      req.ghReleases === true ||
      req.ghRelease === true ||
      (policy && (policy.ghReleases === true || policy.ghRelease === true))
        ? BF_POLICY_CODES.GH_RELEASES_DENY
        : BF_POLICY_CODES.REGISTRY_PUBLISH_DENY;
    return { ok: false, code, reason: pub.reason };
  }
  const hitl = checkHitl(req, policy);
  if (!hitl.ok) return hitl;
  return { ok: true, code: BF_POLICY_CODES.OK, reason: null };
}

/**
 * Create a policy-gate surface.
 * @param {object} [opts]
 * @returns {object}
 */
export function createRcPackagingPolicyGate(opts = {}) {
  return {
    kind: BF_POLICY_GATE_KIND,
    PRODUCTION_READY: BF_POLICY_GATE_PRODUCTION_READY,
    codes: BF_POLICY_CODES,
    deny,
    denyProductionReadyYes,
    denyRegistryPublish,
    denyGhReleases,
    denyFundacion,
    denyHitl,
    denyApplySeal,
    denyDeliverySeal,
    denyReplaySeal,
    denyMalformedArtifacts,
    denyEmptyArtifacts,
    denyInvalidRequest,
    denyEmpty,
    denyPolicy,
    denyLawVi,
    denyCustody,
    checkSeal,
    checkApplySeal,
    checkDeliverySeal,
    checkReplaySeal,
    checkHitl,
    checkCustody,
    gatePackagingRequest: (req, extra = {}) =>
      gatePackagingRequest(req, { ...opts, ...extra }),
    // NON-CLAIM surface
    productionReadyYesFlip: false,
    publicRegistryPublish: false,
    ghReleasesProduct: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  BF_POLICY_GATE_KIND,
  BF_POLICY_GATE_PRODUCTION_READY,
  BF_POLICY_CODES,
  deny,
  denyProductionReadyYes,
  denyRegistryPublish,
  denyGhReleases,
  denyFundacion,
  denyHitl,
  denyApplySeal,
  denyDeliverySeal,
  denyReplaySeal,
  denyMalformedArtifacts,
  denyEmptyArtifacts,
  denyInvalidRequest,
  denyEmpty,
  denyPolicy,
  denyLawVi,
  denyCustody,
  checkSeal,
  checkApplySeal,
  checkDeliverySeal,
  checkReplaySeal,
  checkHitl,
  checkCustody,
  gatePackagingRequest,
  createRcPackagingPolicyGate
};
