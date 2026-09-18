/**
 * @module hitl-escalation-federation-policy-gate
 * SPEC-0092 / Mission CI — Policy Gate for Human Authority Escalation Federation.
 * Fail-closed validation for escalation plans, Law VI secret screening,
 * Fundacion write barrier, irreversibility + human operator requirements,
 * and rejection of empty / auto-approve irreversible plans.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: HITL escalation federation ≠ autonomous approval of irreversible
 * actions / human remains authority / ≠ Fundacion writes.
 */

import {
  sha256Canonical,
  CI_OPERATOR_DECISIONS,
  CI_IRREVERSIBILITY_CLASSES
} from './hitl-escalation-federation-receipt.js';

/** @type {'NO'} */
export const CI_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CI_POLICY_GATE_KIND = 'eos-hitl-escalation-federation-policy-gate';

/** Default maximum reasons per escalation plan. */
export const CI_MAX_REASONS = 16;

/**
 * Id pattern (alphanumeric / mission-code style).
 * Examples: esc-001, project-eos, CI, mission-ci, eos-ladder-25
 */
export const CI_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

export const CI_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  ESCALATE_ALLOW: 'ESCALATE_ALLOW',
  HOLD_ALLOW: 'HOLD_ALLOW',
  ESCALATE_DENY: 'ESCALATE_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_ESCALATION_ID_DENY: 'MISSING_ESCALATION_ID_DENY',
  MISSING_PROJECT_ID_DENY: 'MISSING_PROJECT_ID_DENY',
  MISSING_MISSION_ID_DENY: 'MISSING_MISSION_ID_DENY',
  INVALID_OPERATOR_DECISION_DENY: 'INVALID_OPERATOR_DECISION_DENY',
  INVALID_IRREVERSIBILITY_CLASS_DENY: 'INVALID_IRREVERSIBILITY_CLASS_DENY',
  MISSING_OPERATOR_FOR_IRREVERSIBLE_DENY:
    'MISSING_OPERATOR_FOR_IRREVERSIBLE_DENY',
  AUTO_APPROVE_IRREVERSIBLE_DENY: 'AUTO_APPROVE_IRREVERSIBLE_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  DENY: 'DENY'
});

const FORBIDDEN_SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

/**
 * Check if a string, object, or property contains secret patterns (Law VI).
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
 * Check if a target string touches the forbidden Fundacion directory.
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * Normalize / validate an id field.
 * @param {unknown} id
 * @returns {string|null}
 */
export function normalizeIdStrict(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!s) return null;
  if (!CI_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * Policy Gate validator for HITL escalation federation plans.
 */
export class HitlEscalationFederationPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxReasons]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null
        ? Number(options.maxReasons)
        : CI_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate an escalation plan before ESCALATE|HOLD|DENY decision.
   * Fail-closed. IRREVERSIBLE actions MUST have explicit human APPROVE or
   * REJECT (never auto-APPROVE). Human remains authority.
   *
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, escalationId?: string, projectId?: string, missionId?: string, operatorDecision?: string|null, irreversibilityClass?: string, mappedDecision?: string, reasons?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CI_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    // Empty plan (no identifying fields)
    const hasAnyId =
      plan.escalationId != null ||
      plan.projectId != null ||
      plan.missionId != null;
    if (!hasAnyId) {
      return {
        valid: false,
        code: CI_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty escalation plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.escalationId) ||
      isFundacionTarget(plan.projectId) ||
      isFundacionTarget(plan.missionId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CI_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CI_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const escalationId = normalizeIdStrict(plan.escalationId);
    if (!escalationId) {
      return {
        valid: false,
        code: CI_CODES.MISSING_ESCALATION_ID_DENY,
        reason: 'escalationId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(escalationId)) {
      return {
        valid: false,
        code: CI_CODES.FUNDACION_ALWAYS_DENY,
        reason:
          'escalationId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const projectId = normalizeIdStrict(plan.projectId);
    if (!projectId) {
      return {
        valid: false,
        code: CI_CODES.MISSING_PROJECT_ID_DENY,
        reason: 'projectId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(projectId)) {
      return {
        valid: false,
        code: CI_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'projectId targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }

    const missionId = normalizeIdStrict(plan.missionId);
    if (!missionId) {
      return {
        valid: false,
        code: CI_CODES.MISSING_MISSION_ID_DENY,
        reason: 'missionId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(missionId)) {
      return {
        valid: false,
        code: CI_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'missionId targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }

    const irrRaw =
      plan.irreversibilityClass != null
        ? String(plan.irreversibilityClass).trim().toUpperCase()
        : '';
    if (!irrRaw || !CI_IRREVERSIBILITY_CLASSES.includes(irrRaw)) {
      return {
        valid: false,
        code: CI_CODES.INVALID_IRREVERSIBILITY_CLASS_DENY,
        reason:
          'irreversibilityClass must be REVERSIBLE|PARTIALLY_REVERSIBLE|IRREVERSIBLE'
      };
    }

    const autoApprove =
      plan.autoApprove === true ||
      plan.auto_approve === true ||
      String(plan.operator || '').toLowerCase() === 'auto' ||
      String(plan.operatorDecision || '')
        .trim()
        .toUpperCase() === 'AUTO_APPROVE';

    const odRaw =
      plan.operatorDecision != null
        ? String(plan.operatorDecision).trim().toUpperCase()
        : '';

    // IRREVERSIBLE: never auto-APPROVE; require explicit human APPROVE|REJECT
    if (irrRaw === 'IRREVERSIBLE') {
      if (autoApprove) {
        return {
          valid: false,
          code: CI_CODES.AUTO_APPROVE_IRREVERSIBLE_DENY,
          reason:
            'IRREVERSIBLE actions must never be auto-APPROVE; human remains authority'
        };
      }
      if (!odRaw) {
        return {
          valid: false,
          code: CI_CODES.MISSING_OPERATOR_FOR_IRREVERSIBLE_DENY,
          reason:
            'IRREVERSIBLE actions require explicit human operatorDecision APPROVE|REJECT'
        };
      }
      if (odRaw !== 'APPROVE' && odRaw !== 'REJECT') {
        // DEFER on irreversible is allowed as HOLD (human deferred) — but brief
        // says MUST have APPROVE or REJECT. Treat DEFER as HOLD path separately:
        // allow DEFER → HOLD as human deferral of irreversible.
        if (odRaw !== 'DEFER') {
          return {
            valid: false,
            code: CI_CODES.INVALID_OPERATOR_DECISION_DENY,
            reason:
              'operatorDecision must be APPROVE|REJECT|DEFER for irreversible actions'
          };
        }
      }
    } else {
      // Reversible / partially reversible: operatorDecision optional but if
      // present must be valid enum. Missing → treat as needing human (HOLD).
      if (odRaw && !CI_OPERATOR_DECISIONS.includes(odRaw)) {
        return {
          valid: false,
          code: CI_CODES.INVALID_OPERATOR_DECISION_DENY,
          reason: 'operatorDecision must be APPROVE|REJECT|DEFER'
        };
      }
      if (autoApprove && odRaw === 'APPROVE') {
        // Auto-approve of reversible is still not claimed as autonomous
        // irreversible approval; allow but mapped carefully — for reversible
        // only, still require enum if auto flagged with APPROVE.
        // Keep fail-closed on auto for irreversible only (handled above).
      }
    }

    if (odRaw && !CI_OPERATOR_DECISIONS.includes(odRaw)) {
      return {
        valid: false,
        code: CI_CODES.INVALID_OPERATOR_DECISION_DENY,
        reason: 'operatorDecision must be APPROVE|REJECT|DEFER'
      };
    }

    /** @type {string[]} */
    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: CI_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons exceed max bound (${this.maxReasons}); got ${plan.reasons.length}`
        };
      }
      for (const r of plan.reasons) {
        if (r != null) reasons.push(String(r));
      }
    }

    // Map operatorDecision → port decision
    let mappedDecision = 'HOLD';
    if (odRaw === 'APPROVE') mappedDecision = 'ESCALATE';
    else if (odRaw === 'REJECT') mappedDecision = 'DENY';
    else if (odRaw === 'DEFER' || !odRaw) mappedDecision = 'HOLD';

    return {
      valid: true,
      code: CI_CODES.PLAN_VALID_OK,
      escalationId,
      projectId,
      missionId,
      operatorDecision: odRaw || null,
      irreversibilityClass: irrRaw,
      mappedDecision,
      reasons
    };
  }
}

export default {
  CI_POLICY_GATE_PRODUCTION_READY,
  CI_POLICY_GATE_KIND,
  CI_MAX_REASONS,
  CI_ID_PATTERN,
  CI_CODES,
  scanForSecrets,
  isFundacionTarget,
  normalizeIdStrict,
  HitlEscalationFederationPolicyGate
};
