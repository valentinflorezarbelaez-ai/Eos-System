/**
 * @module fundacion-delta0-continuity-policy-gate
 * SPEC-0103 / Mission CT — Policy Gate for Fundacion Δ=0 Continuity Drill & Reconciliation Port.
 * Fail-closed validation for continuity drill plans, Law VI secret screening,
 * Fundacion write barrier, ALWAYS_DENY weakening refuse, PRODUCTION_READY flip
 * claim refuse, L26 reopen claim refuse, and continuityMode honesty (ACTIVE|HOLD).
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Fundacion Δ=0 Continuity Port ≠ Fundacion write auth /
 * ≠ PRODUCTION_READY flip / ≠ weakening FUNDACION_ALWAYS_DENY /
 * ≠ reopen L26 / ≠ L27 closeout.
 *
 * Preserves human gates — refuse auto PRODUCTION_READY flip; refuse Fundacion writes.
 */

import {
  sha256Canonical,
  CT_CONTINUITY_MODES
} from './fundacion-delta0-continuity-receipt.js';

/** @type {'NO'} */
export const CT_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CT_POLICY_GATE_KIND = 'eos-fundacion-delta0-continuity-policy-gate';

/** Default maximum reasons per govern plan. */
export const CT_MAX_REASONS = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / change style).
 */
export const CT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

/** Known drill / reconciliation phases (Layer-0 continuity drill). */
export const CT_DRILL_PHASES = Object.freeze([
  'baseline_lock',
  'observer_brief',
  'input_collect',
  'reconcile',
  'delta0_record',
  'retrospective',
  'observe'
]);

export const CT_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_CHANGE_ID_DENY: 'MISSING_CHANGE_ID_DENY',
  MISSING_CONTINUITY_MODE_DENY: 'MISSING_CONTINUITY_MODE_DENY',
  INVALID_CONTINUITY_MODE_DENY: 'INVALID_CONTINUITY_MODE_DENY',
  MISSING_DRILL_PHASE_DENY: 'MISSING_DRILL_PHASE_DENY',
  INVALID_DRILL_PHASE_DENY: 'INVALID_DRILL_PHASE_DENY',
  MISSING_CONTINUITY_DIGEST_DENY: 'MISSING_CONTINUITY_DIGEST_DENY',
  INVALID_CONTINUITY_DIGEST_DENY: 'INVALID_CONTINUITY_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  WEAKEN_ALWAYS_DENY: 'WEAKEN_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  L26_REOPEN_CLAIM_DENY: 'L26_REOPEN_CLAIM_DENY',
  AUTO_SEAL_CLAIM_DENY: 'AUTO_SEAL_CLAIM_DENY',
  AUTO_PRODUCTION_FLIP_CLAIM_DENY: 'AUTO_PRODUCTION_FLIP_CLAIM_DENY',
  GAMEDAY_REFUSE_DENY: 'GAMEDAY_REFUSE_DENY',
  DENY: 'DENY',
  HOLD: 'HOLD'
});

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

// Character classes keep literal provider prefixes out of this source (BI7 Law VI scan).
const FORBIDDEN_SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /gh[p]_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

const PRODUCTION_READY_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION_READY\s+YES\s+flip/i,
  /auto(?:matic)?\s+production[_ ]?ready\s+flip/i
];

const AUTO_SEAL_PATTERNS = [
  /auto[_ -]?seal/i,
  /automatic\s+seal/i,
  /seal\s+without\s+human/i,
  /claims?\s+auto[_ -]?seal/i,
  /unattended\s+seal/i
];

const L26_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*26/i,
  /l(?:adder)?[\s_-]*26\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*26/i,
  /reopen\s+l17/i,
  /reopen\s+l1[7-9]|reopen\s+l2[0-6]/i,
  /never\s+reopen\s+l26\s*=\s*false/i,
  /l26[_ ]closed\s*=\s*false/i
];

const WEAKEN_ALWAYS_DENY_PATTERNS = [
  /FUNDACION_ALWAYS_DENY\s*=\s*false/i,
  /weaken\s+(?:FUNDACION_)?ALWAYS_DENY/i,
  /allowFundacionWrite\s*=\s*true/i,
  /fundacionWriteAllowed\s*=\s*true/i,
  /disable\s+FUNDACION_ALWAYS_DENY/i,
  /override\s+ALWAYS_DENY/i
];

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function scanForSecrets(value) {
  if (value == null) return false;

  if (typeof value === 'string') {
    for (const pat of FORBIDDEN_SECRET_PATTERNS) {
      if (pat.test(value)) return true;
    }
    return false;
  }

  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);
      for (const pat of FORBIDDEN_SECRET_PATTERNS) {
        if (pat.test(serialized)) return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * @param {unknown} value
 * @param {RegExp[]} patterns
 * @returns {boolean}
 */
function matchesAnyPattern(value, patterns) {
  if (value == null) return false;
  const texts = [];
  if (typeof value === 'string') {
    texts.push(value);
  } else if (typeof value === 'object') {
    try {
      texts.push(JSON.stringify(value));
      for (const k of [
        'label',
        'labels',
        'title',
        'description',
        'claim',
        'claims',
        'continuityMode',
        'note'
      ]) {
        if (/** @type {Record<string, unknown>} */ (value)[k] != null) {
          texts.push(
            String(/** @type {Record<string, unknown>} */ (value)[k])
          );
        }
      }
    } catch {
      /* ignore */
    }
  }
  for (const t of texts) {
    for (const pat of patterns) {
      if (pat.test(t)) return true;
    }
  }
  return false;
}

/** @param {unknown} value @returns {boolean} */
export function claimsProductionReadyFlip(value) {
  return matchesAnyPattern(value, PRODUCTION_READY_FLIP_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsAutoSeal(value) {
  return matchesAnyPattern(value, AUTO_SEAL_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsL26Reopen(value) {
  return matchesAnyPattern(value, L26_REOPEN_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsWeakenAlwaysDeny(value) {
  return matchesAnyPattern(value, WEAKEN_ALWAYS_DENY_PATTERNS);
}

/**
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'object') {
    try {
      return isFundacionTarget(JSON.stringify(target));
    } catch {
      return false;
    }
  }
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * @param {unknown} id
 * @returns {string|null}
 */
export function normalizeIdStrict(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!s) return null;
  if (!CT_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * @param {string} digest
 * @returns {boolean}
 */
export function isTamperedDigest(digest) {
  if (digest == null) return false;
  const s = String(digest).trim();
  if (/^TAMPER/i.test(s)) return true;
  if (/0{64}/.test(s) && s.length === 64) return true;
  if (/f{64}/i.test(s) && s.length === 64) return true;
  return false;
}

/**
 * Normalize drill / reconciliation phase aliases.
 * @param {unknown} phase
 * @returns {string|null}
 */
export function normalizeDrillPhase(phase) {
  if (phase == null || phase === '') return null;
  const s = String(phase)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/-/g, '_');
  const aliases = {
    p0: 'baseline_lock',
    p0_baseline_lock: 'baseline_lock',
    baseline: 'baseline_lock',
    p1: 'observer_brief',
    p1_observer_brief: 'observer_brief',
    brief: 'observer_brief',
    p2: 'input_collect',
    p2_input_collection: 'input_collect',
    collect: 'input_collect',
    p3: 'reconcile',
    p3_reconcile_cl_cp: 'reconcile',
    reconciliation: 'reconcile',
    p4: 'delta0_record',
    p4_delta0_record_or_block: 'delta0_record',
    record_delta0: 'delta0_record',
    delta0: 'delta0_record',
    p5: 'retrospective',
    p5_retrospective: 'retrospective',
    retro: 'retrospective',
    p6: 'observe',
    p6_no_seal_no_prod_flip: 'observe',
    hold: 'observe',
    observe_only: 'observe'
  };
  const mapped = aliases[s] || s;
  if (CT_DRILL_PHASES.includes(mapped)) {
    return mapped;
  }
  return null;
}

/**
 * Policy Gate validator for Fundacion Δ=0 Continuity drill plans.
 */
export class FundacionDelta0ContinuityPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxReasons]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : CT_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a continuity drill govern plan before PASS|DENY|HOLD decision.
   * Fail-closed. Require planId + changeId + continuityMode + drillPhase.
   * continuityDigest optional when gamedayInput present (computed later).
   * Reject empty plans, Fundacion writes, secrets, PRODUCTION_READY=YES flip,
   * ALWAYS_DENY weakening, L26 reopen claims, auto-seal claims, tampered digests.
   *
   * @param {unknown} plan
   * @returns {object}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CT_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      plan.changeId != null ||
      (plan.continuityDigest != null &&
        String(plan.continuityDigest).trim() !== '') ||
      (plan.gamedayInput != null && typeof plan.gamedayInput === 'object') ||
      plan.drillPhase != null ||
      plan.phase != null;
    if (!hasAnyId) {
      return {
        valid: false,
        code: CT_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty continuity drill plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.changeId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CT_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (
      plan.writeAttempt === true ||
      plan.performFundacionWrite === true ||
      plan.fundacionWrite === true ||
      plan.allowFundacionWrite === true
    ) {
      return {
        valid: false,
        code: CT_CODES.FUNDACION_ALWAYS_DENY,
        reason:
          'Plan claims Fundacion write (NON-CLAIM: ≠ Fundacion write auth; FUNDACION_ALWAYS_DENY)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CT_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const claimSurface = {
      label: plan.label,
      labels: plan.labels,
      description: plan.description,
      claim: plan.claim,
      claims: plan.claims,
      note: plan.note
    };

    if (
      claimsProductionReadyFlip(claimSurface) ||
      plan.autoProductionReady === true ||
      plan.flipProductionReady === true ||
      plan.autoProductionReadyFlip === true
    ) {
      return {
        valid: false,
        code: CT_CODES.PRODUCTION_READY_FLIP_DENY,
        reason:
          'Plan claims PRODUCTION_READY=YES flip (NON-CLAIM: ≠ PRODUCTION_READY flip; refuse auto)'
      };
    }

    if (
      claimsWeakenAlwaysDeny(claimSurface) ||
      plan.FUNDACION_ALWAYS_DENY === false ||
      plan.fundacionAlwaysDeny === false ||
      plan.weakenAlwaysDeny === true
    ) {
      return {
        valid: false,
        code: CT_CODES.WEAKEN_ALWAYS_DENY,
        reason:
          'Plan claims weakening FUNDACION_ALWAYS_DENY (NON-CLAIM: ≠ weaken ALWAYS_DENY)'
      };
    }

    if (
      claimsL26Reopen(claimSurface) ||
      plan.reopenL26 === true ||
      plan.l26Reopen === true ||
      plan.unsealL26 === true
    ) {
      return {
        valid: false,
        code: CT_CODES.L26_REOPEN_CLAIM_DENY,
        reason:
          'Plan claims L26 reopen (NON-CLAIM: L17–L26 CLOSED never reopen; NEVER reopen L26)'
      };
    }

    if (
      claimsAutoSeal(claimSurface) ||
      plan.autoSeal === true ||
      plan.automaticSeal === true
    ) {
      return {
        valid: false,
        code: CT_CODES.AUTO_SEAL_CLAIM_DENY,
        reason:
          'Plan claims auto-seal (NON-CLAIM: ≠ automatic closure; refuse auto)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CT_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CT_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const changeId = normalizeIdStrict(plan.changeId);
    if (!changeId) {
      return {
        valid: false,
        code: CT_CODES.MISSING_CHANGE_ID_DENY,
        reason: 'changeId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(changeId)) {
      return {
        valid: false,
        code: CT_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'changeId targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }

    if (
      plan.continuityMode == null ||
      String(plan.continuityMode).trim() === ''
    ) {
      return {
        valid: false,
        code: CT_CODES.MISSING_CONTINUITY_MODE_DENY,
        reason: 'continuityMode is required (ACTIVE|HOLD — hermetic labels only)'
      };
    }
    const continuityMode = String(plan.continuityMode).trim().toUpperCase();
    if (!CT_CONTINUITY_MODES.includes(continuityMode)) {
      return {
        valid: false,
        code: CT_CODES.INVALID_CONTINUITY_MODE_DENY,
        reason:
          'continuityMode must be ACTIVE|HOLD (hermetic — NOT automatic closure)'
      };
    }

    const rawPhase = plan.drillPhase != null ? plan.drillPhase : plan.phase;
    if (rawPhase == null || String(rawPhase).trim() === '') {
      return {
        valid: false,
        code: CT_CODES.MISSING_DRILL_PHASE_DENY,
        reason: 'drillPhase (or phase) is required'
      };
    }
    const drillPhase = normalizeDrillPhase(rawPhase);
    if (!drillPhase) {
      return {
        valid: false,
        code: CT_CODES.INVALID_DRILL_PHASE_DENY,
        reason: `drillPhase '${rawPhase}' is not a known continuity drill phase`
      };
    }

    const hasContinuityDigest =
      plan.continuityDigest != null &&
      String(plan.continuityDigest).trim() !== '';
    const hasGamedayInput =
      plan.gamedayInput != null && typeof plan.gamedayInput === 'object';
    const hasGamedaySnapshot =
      plan.gamedaySnapshot != null && typeof plan.gamedaySnapshot === 'object';

    if (!hasContinuityDigest && !hasGamedayInput && !hasGamedaySnapshot) {
      return {
        valid: false,
        code: CT_CODES.MISSING_CONTINUITY_DIGEST_DENY,
        reason:
          'continuityDigest (sha256) or gamedayInput/gamedaySnapshot is required'
      };
    }

    let continuityDigest = null;
    if (hasContinuityDigest) {
      continuityDigest = String(plan.continuityDigest).trim();
      if (isTamperedDigest(continuityDigest)) {
        return {
          valid: false,
          code: CT_CODES.TAMPERED_DIGEST_DENY,
          reason: 'continuityDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(continuityDigest)) {
        return {
          valid: false,
          code: CT_CODES.INVALID_CONTINUITY_DIGEST_DENY,
          reason: 'continuityDigest must be sha256 hex'
        };
      }
    }

    /** @type {string[]} */
    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: CT_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max bound (${this.maxReasons}); got ${plan.reasons.length}`
        };
      }
      for (const r of plan.reasons) {
        if (r != null) reasons.push(String(r));
      }
    }

    return {
      valid: true,
      code: CT_CODES.PLAN_VALID_OK,
      planId,
      changeId,
      continuityMode,
      drillPhase,
      continuityDigest,
      gamedayInput: hasGamedayInput ? plan.gamedayInput : null,
      gamedaySnapshot: hasGamedaySnapshot ? plan.gamedaySnapshot : null,
      reasons
    };
  }
}

export default {
  CT_POLICY_GATE_PRODUCTION_READY,
  CT_POLICY_GATE_KIND,
  CT_MAX_REASONS,
  CT_ID_PATTERN,
  CT_DRILL_PHASES,
  CT_CODES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL26Reopen,
  claimsWeakenAlwaysDeny,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  normalizeDrillPhase,
  FundacionDelta0ContinuityPolicyGate
};
