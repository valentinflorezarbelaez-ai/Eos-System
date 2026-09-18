/**
 * @module spec-synthesis-policy-gate
 * SPEC-0082 / Mission BY — Policy Gate for Autonomous EARS/BDD Spec Synthesizer.
 * Fail-closed validation for goals, EARS grammar patterns, BDD syntax,
 * Law VI secret screening, and Fundacion write barrier enforcement.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 */

import { sha256Canonical } from './spec-synthesis-receipt.js';

/** @type {'NO'} */
export const BY_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BY_POLICY_GATE_KIND = 'eos-spec-synthesis-policy-gate';

export const BY_CODES = Object.freeze({
  SPEC_COMPILED_OK: 'SPEC_COMPILED_OK',
  GOAL_VALID_OK: 'GOAL_VALID_OK',
  EARS_VALID_OK: 'EARS_VALID_OK',
  BDD_VALID_OK: 'BDD_VALID_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  MALFORMED_GOAL_DENY: 'MALFORMED_GOAL_DENY',
  INVALID_EARS_SYNTAX_DENY: 'INVALID_EARS_SYNTAX_DENY',
  INVALID_BDD_SYNTAX_DENY: 'INVALID_BDD_SYNTAX_DENY',
  AMBIGUOUS_REQUIREMENT_DENY: 'AMBIGUOUS_REQUIREMENT_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  DENY: 'DENY'
});

export const EARS_PATTERNS = Object.freeze({
  EVENT_DRIVEN: /^WHEN\s+.+?,\s+THE\s+SYSTEM\s+SHALL\s+.+$/i,
  STATE_DRIVEN: /^WHILE\s+.+?,\s+THE\s+SYSTEM\s+SHALL\s+.+$/i,
  ERROR_DRIVEN: /^IF\s+.+?,\s+THEN\s+THE\s+SYSTEM\s+SHALL\s+.+$/i,
  UBIQUITOUS: /^THE\s+SYSTEM\s+SHALL\s+.+$/i
});

export const FORBIDDEN_AMBIGUITIES = Object.freeze([
  /\bmaybe\b/i,
  /\bmight\b/i,
  /\bas fast as possible\b/i,
  /\buser-friendly\b/i,
  /\betc\b/i,
  /\broughly\b/i,
  /\bapproximately\b/i
]);

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
 * @returns {boolean} True if a secret pattern is detected
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
 * Policy Gate validator for specification synthesis operations.
 */
export class SpecSynthesisPolicyGate {
  /**
   * Evaluate a high-level goal input before compilation.
   * @param {object} goal
   * @returns {{ valid: boolean, code: string, reason?: string }}
   */
  evaluateGoal(goal) {
    if (!goal || typeof goal !== 'object') {
      return {
        valid: false,
        code: BY_CODES.MALFORMED_GOAL_DENY,
        reason: 'Goal must be a non-null object'
      };
    }

    if (!goal.goalId || typeof goal.goalId !== 'string' || goal.goalId.trim() === '') {
      return {
        valid: false,
        code: BY_CODES.MALFORMED_GOAL_DENY,
        reason: 'goalId must be a non-empty string'
      };
    }

    if (!goal.title || typeof goal.title !== 'string' || goal.title.trim() === '') {
      return {
        valid: false,
        code: BY_CODES.MALFORMED_GOAL_DENY,
        reason: 'title must be a non-empty string'
      };
    }

    if (!goal.objective || typeof goal.objective !== 'string' || goal.objective.trim() === '') {
      return {
        valid: false,
        code: BY_CODES.MALFORMED_GOAL_DENY,
        reason: 'objective must be a non-empty string'
      };
    }

    if (scanForSecrets(goal)) {
      return {
        valid: false,
        code: BY_CODES.SECRET_DETECTED_DENY,
        reason: 'Goal payload contains plain secrets or credentials (Law VI)'
      };
    }

    if (isFundacionTarget(goal.target) || isFundacionTarget(goal.targetSystem) || isFundacionTarget(goal.context)) {
      return {
        valid: false,
        code: BY_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Goal targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    return {
      valid: true,
      code: BY_CODES.GOAL_VALID_OK
    };
  }

  /**
   * Evaluate an individual EARS requirement statement.
   * @param {string} text
   * @returns {{ valid: boolean, code: string, pattern?: string, reason?: string }}
   */
  evaluateEARSStatement(text) {
    if (!text || typeof text !== 'string') {
      return {
        valid: false,
        code: BY_CODES.INVALID_EARS_SYNTAX_DENY,
        reason: 'Requirement statement must be a non-empty string'
      };
    }

    const trimmed = text.trim();

    // Check forbidden ambiguous keywords
    for (const pat of FORBIDDEN_AMBIGUITIES) {
      if (pat.test(trimmed)) {
        return {
          valid: false,
          code: BY_CODES.AMBIGUOUS_REQUIREMENT_DENY,
          reason: `Requirement contains ambiguous terminology matching: ${pat}`
        };
      }
    }

    // Match one of 4 patterns
    if (EARS_PATTERNS.EVENT_DRIVEN.test(trimmed)) {
      return { valid: true, code: BY_CODES.EARS_VALID_OK, pattern: 'EVENT_DRIVEN' };
    }
    if (EARS_PATTERNS.STATE_DRIVEN.test(trimmed)) {
      return { valid: true, code: BY_CODES.EARS_VALID_OK, pattern: 'STATE_DRIVEN' };
    }
    if (EARS_PATTERNS.ERROR_DRIVEN.test(trimmed)) {
      return { valid: true, code: BY_CODES.EARS_VALID_OK, pattern: 'ERROR_DRIVEN' };
    }
    if (EARS_PATTERNS.UBIQUITOUS.test(trimmed)) {
      return { valid: true, code: BY_CODES.EARS_VALID_OK, pattern: 'UBIQUITOUS' };
    }

    return {
      valid: false,
      code: BY_CODES.INVALID_EARS_SYNTAX_DENY,
      reason: 'Requirement does not match any of the 4 formal EARS patterns'
    };
  }

  /**
   * Evaluate a Gherkin BDD scenario object or block.
   * @param {object} scenario
   * @returns {{ valid: boolean, code: string, reason?: string }}
   */
  evaluateBDDScenario(scenario) {
    if (!scenario || typeof scenario !== 'object') {
      return {
        valid: false,
        code: BY_CODES.INVALID_BDD_SYNTAX_DENY,
        reason: 'Scenario must be a non-null object'
      };
    }

    if (!scenario.title || typeof scenario.title !== 'string' || scenario.title.trim() === '') {
      return {
        valid: false,
        code: BY_CODES.INVALID_BDD_SYNTAX_DENY,
        reason: 'Scenario must have a non-empty title'
      };
    }

    if (!scenario.given || typeof scenario.given !== 'string' || scenario.given.trim() === '') {
      return {
        valid: false,
        code: BY_CODES.INVALID_BDD_SYNTAX_DENY,
        reason: 'Scenario must have a non-empty GIVEN clause'
      };
    }

    if (!scenario.when || typeof scenario.when !== 'string' || scenario.when.trim() === '') {
      return {
        valid: false,
        code: BY_CODES.INVALID_BDD_SYNTAX_DENY,
        reason: 'Scenario must have a non-empty WHEN clause'
      };
    }

    if (!scenario.then || typeof scenario.then !== 'string' || scenario.then.trim() === '') {
      return {
        valid: false,
        code: BY_CODES.INVALID_BDD_SYNTAX_DENY,
        reason: 'Scenario must have a non-empty THEN clause'
      };
    }

    if (scanForSecrets(scenario)) {
      return {
        valid: false,
        code: BY_CODES.SECRET_DETECTED_DENY,
        reason: 'Scenario contains plain secret credentials (Law VI)'
      };
    }

    return {
      valid: true,
      code: BY_CODES.BDD_VALID_OK
    };
  }
}
