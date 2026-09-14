/**
 * @module replay-policy-gate
 * SPEC-0062 / Mission BE — Fail-closed DENY helpers for Verification
 * Replay & Golden Receipt Port: mismatch, custody break, Fundacion,
 * invalid, HITL DENY.
 *
 * DENY codes: DIGEST_MISMATCH, DRIFT_DENY, CUSTODY_BREAK, FUNDACION_DENY,
 * HITL_DENY, APPLY_SEAL_DENY, DELIVERY_SEAL_DENY, MALFORMED_CANDIDATE,
 * MALFORMED_GOLDEN, INVALID_REQUEST, EMPTY_REQUEST, POLICY_DENY,
 * LAW_VI_DENY.
 *
 * NON-CLAIM:
 *   policy-gate ≠ SIEM product /
 *   ≠ billing accuracy SaaS /
 *   ≠ PRODUCTION_READY verification product
 *   not BF/BG; Fundacion Δ=0 (ALWAYS DENY default); Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

import { isFundacionPath, hasCustodyFields } from './golden-receipt-boundary.js';

/** @type {'NO'} */
export const BE_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BE_POLICY_GATE_KIND = 'eos-verification-replay-golden-receipt-policy-gate';

export const BE_POLICY_CODES = Object.freeze({
  OK: 'OK',
  MATCHED: 'MATCHED',
  DENY: 'DENY',
  DIGEST_MISMATCH: 'DIGEST_MISMATCH',
  DRIFT_DENY: 'DRIFT_DENY',
  CUSTODY_BREAK: 'CUSTODY_BREAK',
  FUNDACION_DENY: 'FUNDACION_DENY',
  HITL_DENY: 'HITL_DENY',
  APPLY_SEAL_DENY: 'APPLY_SEAL_DENY',
  DELIVERY_SEAL_DENY: 'DELIVERY_SEAL_DENY',
  MALFORMED_CANDIDATE: 'MALFORMED_CANDIDATE',
  MALFORMED_GOLDEN: 'MALFORMED_GOLDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  EMPTY_REQUEST: 'EMPTY_REQUEST',
  POLICY_DENY: 'POLICY_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY'
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
    code: code || BE_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    match: false,
    ...extra
  };
}

export function denyMismatch(reason = 'digest mismatch vs golden', extra = {}) {
  return deny(BE_POLICY_CODES.DIGEST_MISMATCH, reason, extra);
}

export function denyDrift(reason = 'replay drift vs golden', extra = {}) {
  return deny(BE_POLICY_CODES.DRIFT_DENY, reason, extra);
}

export function denyCustody(reason = 'broken custody (missing seal fields)', extra = {}) {
  return deny(BE_POLICY_CODES.CUSTODY_BREAK, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BE_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyHitl(reason = 'HITL required / unapproved', extra = {}) {
  return deny(BE_POLICY_CODES.HITL_DENY, reason, extra);
}

export function denyApplySeal(
  reason = 'missing or invalid BC apply seal',
  extra = {}
) {
  return deny(BE_POLICY_CODES.APPLY_SEAL_DENY, reason, extra);
}

export function denyDeliverySeal(
  reason = 'missing or invalid BD delivery seal',
  extra = {}
) {
  return deny(BE_POLICY_CODES.DELIVERY_SEAL_DENY, reason, extra);
}

export function denyMalformedCandidate(reason = 'malformed candidate', extra = {}) {
  return deny(BE_POLICY_CODES.MALFORMED_CANDIDATE, reason, extra);
}

export function denyMalformedGolden(reason = 'malformed golden', extra = {}) {
  return deny(BE_POLICY_CODES.MALFORMED_GOLDEN, reason, extra);
}

export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(BE_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

export function denyEmpty(reason = 'empty request', extra = {}) {
  return deny(BE_POLICY_CODES.EMPTY_REQUEST, reason, extra);
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BE_POLICY_CODES.POLICY_DENY, reason, extra);
}

export function denyLawVi(reason = 'Law VI leakage DENY', extra = {}) {
  return deny(BE_POLICY_CODES.LAW_VI_DENY, reason, extra);
}

/**
 * Validate a sealed object (apply or delivery) when required.
 * Accepts { ok:true, sealed:true, digest } or a hex digest string.
 * @param {unknown} seal
 * @param {object} [opts]
 * @param {boolean} [opts.required]
 * @param {string} [opts.missingCode]
 * @param {string} [opts.missingReason]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkSeal(seal, opts = {}) {
  const required = opts.required === true;
  const missCode = opts.missingCode || BE_POLICY_CODES.APPLY_SEAL_DENY;
  const missReason = opts.missingReason || 'missing required seal';
  if (!required && (seal == null || seal === false)) {
    return { ok: true, code: BE_POLICY_CODES.OK, reason: null };
  }
  if (required && (seal == null || seal === false)) {
    return { ok: false, code: missCode, reason: missReason };
  }
  if (typeof seal === 'string') {
    if (/^[a-f0-9]{16,}$/i.test(seal)) {
      return { ok: true, code: BE_POLICY_CODES.OK, reason: null };
    }
    return { ok: false, code: missCode, reason: 'invalid required seal' };
  }
  if (typeof seal === 'object') {
    const s = /** @type {Record<string, unknown>} */ (seal);
    if (s.ok === false || s.valid === false || s.sealed === false) {
      return { ok: false, code: missCode, reason: 'invalid required seal' };
    }
    if (s.ok === true || s.sealed === true || s.valid === true || s.digest) {
      return { ok: true, code: BE_POLICY_CODES.OK, reason: null };
    }
    return { ok: false, code: missCode, reason: 'invalid required seal' };
  }
  return { ok: false, code: missCode, reason: 'invalid required seal' };
}

/**
 * Validate a BC apply seal when required.
 * @param {unknown} applySeal
 * @param {object} [opts]
 */
export function checkApplySeal(applySeal, opts = {}) {
  return checkSeal(applySeal, {
    required: opts.required === true,
    missingCode: BE_POLICY_CODES.APPLY_SEAL_DENY,
    missingReason: 'missing BC apply seal'
  });
}

/**
 * Validate a BD delivery seal when required.
 * @param {unknown} deliverySeal
 * @param {object} [opts]
 */
export function checkDeliverySeal(deliverySeal, opts = {}) {
  return checkSeal(deliverySeal, {
    required: opts.required === true,
    missingCode: BE_POLICY_CODES.DELIVERY_SEAL_DENY,
    missingReason: 'missing BD delivery seal'
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
    return { ok: true, code: BE_POLICY_CODES.OK, reason: null };
  }
  const approved = req.hitlApproval === true || req.approved === true;
  if (required && !approved) {
    return {
      ok: false,
      code: BE_POLICY_CODES.HITL_DENY,
      reason: 'HITL required / unapproved'
    };
  }
  return { ok: true, code: BE_POLICY_CODES.OK, reason: null };
}

/**
 * Custody gate for a candidate sealed receipt.
 * @param {unknown} candidate
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkCustody(candidate) {
  const c = hasCustodyFields(candidate);
  if (!c.ok) {
    return {
      ok: false,
      code: BE_POLICY_CODES.CUSTODY_BREAK,
      reason: c.reason || 'broken custody (missing seal fields)'
    };
  }
  return { ok: true, code: BE_POLICY_CODES.OK, reason: null };
}

/**
 * Composite request gate (Fundacion / HITL / empty).
 * @param {object} req
 * @param {object} [opts]
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function gateReplayRequest(req, opts = {}) {
  const policy = opts.policy && typeof opts.policy === 'object' ? opts.policy : {};
  if (req == null || typeof req !== 'object') {
    return {
      ok: false,
      code: BE_POLICY_CODES.INVALID_REQUEST,
      reason: 'replay() requires an object request'
    };
  }
  if (isFundacionPath(req) || req.fundacion === true || req.writeFundacion === true) {
    return {
      ok: false,
      code: BE_POLICY_CODES.FUNDACION_DENY,
      reason: 'Fundacion ALWAYS_DENY'
    };
  }
  const hitl = checkHitl(req, policy);
  if (!hitl.ok) return hitl;
  return { ok: true, code: BE_POLICY_CODES.OK, reason: null };
}

/**
 * Create a policy-gate surface.
 * @param {object} [opts]
 * @returns {object}
 */
export function createReplayPolicyGate(opts = {}) {
  return {
    kind: BE_POLICY_GATE_KIND,
    PRODUCTION_READY: BE_POLICY_GATE_PRODUCTION_READY,
    codes: BE_POLICY_CODES,
    deny,
    denyMismatch,
    denyDrift,
    denyCustody,
    denyFundacion,
    denyHitl,
    denyApplySeal,
    denyDeliverySeal,
    denyMalformedCandidate,
    denyMalformedGolden,
    denyInvalidRequest,
    denyEmpty,
    denyPolicy,
    denyLawVi,
    checkSeal,
    checkApplySeal,
    checkDeliverySeal,
    checkHitl,
    checkCustody,
    gateReplayRequest: (req, extra = {}) =>
      gateReplayRequest(req, { ...opts, ...extra }),
    // NON-CLAIM surface
    siemProduct: false,
    billingAccuracySaas: false,
    productionReadyVerificationProduct: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  BE_POLICY_GATE_KIND,
  BE_POLICY_GATE_PRODUCTION_READY,
  BE_POLICY_CODES,
  deny,
  denyMismatch,
  denyDrift,
  denyCustody,
  denyFundacion,
  denyHitl,
  denyApplySeal,
  denyDeliverySeal,
  denyMalformedCandidate,
  denyMalformedGolden,
  denyInvalidRequest,
  denyEmpty,
  denyPolicy,
  denyLawVi,
  checkSeal,
  checkApplySeal,
  checkDeliverySeal,
  checkHitl,
  checkCustody,
  gateReplayRequest,
  createReplayPolicyGate
};
