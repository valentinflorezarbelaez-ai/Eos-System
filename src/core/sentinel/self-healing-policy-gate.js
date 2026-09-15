/**
 * @module self-healing-policy-gate
 * SPEC-0081 / Mission BX — Policy Gate for Autonomous Self-Healing Sentinel.
 * Fail-closed validation for incidents, quarantine isolation, retry bounds,
 * Law VI secret screening, and Fundacion write barrier enforcement.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 */

import { sha256Canonical } from './self-healing-receipt.js';

/** @type {'NO'} */
export const BX_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BX_POLICY_GATE_KIND = 'eos-self-healing-policy-gate';

export const BX_CODES = Object.freeze({
  INCIDENT_REGISTERED_OK: 'INCIDENT_REGISTERED_OK',
  COMPONENT_QUARANTINED_OK: 'COMPONENT_QUARANTINED_OK',
  REMEDIATION_SUCCESS_OK: 'REMEDIATION_SUCCESS_OK',
  INCIDENT_RESOLVED_OK: 'INCIDENT_RESOLVED_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  MALFORMED_INCIDENT_DENY: 'MALFORMED_INCIDENT_DENY',
  MALFORMED_REMEDIATION_DENY: 'MALFORMED_REMEDIATION_DENY',
  COMPONENT_NOT_FOUND_DENY: 'COMPONENT_NOT_FOUND_DENY',
  MAX_RETRIES_EXCEEDED_DENY: 'MAX_RETRIES_EXCEEDED_DENY',
  ESCALATED_HITL_REQUIRED: 'ESCALATED_HITL_REQUIRED',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  DENY: 'DENY'
});

export const VALID_SEVERITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const VALID_REMEDIATION_TYPES = Object.freeze([
  'RESTART',
  'ROLLBACK_SNAPSHOT',
  'STATE_RESET',
  'ISOLATE_CIRCUIT_BREAKER'
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
 * Policy Gate validator for self-healing operations.
 */
export class SelfHealingPolicyGate {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * Evaluate an incident report before registration.
   * @param {object} incident
   * @returns {{ valid: boolean, code: string, reason?: string }}
   */
  evaluateIncident(incident) {
    if (!incident || typeof incident !== 'object') {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_INCIDENT_DENY,
        reason: 'Incident must be a non-null object'
      };
    }

    if (!incident.incidentId || typeof incident.incidentId !== 'string' || incident.incidentId.trim() === '') {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_INCIDENT_DENY,
        reason: 'incidentId must be a non-empty string'
      };
    }

    if (!incident.componentId || typeof incident.componentId !== 'string' || incident.componentId.trim() === '') {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_INCIDENT_DENY,
        reason: 'componentId must be a non-empty string'
      };
    }

    if (!incident.severity || !VALID_SEVERITIES.includes(String(incident.severity).toUpperCase())) {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_INCIDENT_DENY,
        reason: `severity must be one of: ${VALID_SEVERITIES.join(', ')}`
      };
    }

    if (!incident.anomalyType || typeof incident.anomalyType !== 'string' || incident.anomalyType.trim() === '') {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_INCIDENT_DENY,
        reason: 'anomalyType must be a non-empty string'
      };
    }

    if (scanForSecrets(incident)) {
      return {
        valid: false,
        code: BX_CODES.SECRET_DETECTED_DENY,
        reason: 'Incident contains secret credentials or vendor keys (Law VI)'
      };
    }

    if (isFundacionTarget(incident.target) || isFundacionTarget(incident.componentId) || isFundacionTarget(incident.details)) {
      return {
        valid: false,
        code: BX_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Incident targets Fundacion path (Fundacion Δ=0 invariant)'
      };
    }

    return {
      valid: true,
      code: BX_CODES.INCIDENT_REGISTERED_OK
    };
  }

  /**
   * Evaluate a component quarantine action.
   * @param {string} componentId
   * @param {string} reason
   * @returns {{ valid: boolean, code: string, reason?: string }}
   */
  evaluateQuarantine(componentId, reason) {
    if (!componentId || typeof componentId !== 'string' || componentId.trim() === '') {
      return {
        valid: false,
        code: BX_CODES.COMPONENT_NOT_FOUND_DENY,
        reason: 'componentId must be a non-empty string'
      };
    }

    if (scanForSecrets(componentId) || scanForSecrets(reason)) {
      return {
        valid: false,
        code: BX_CODES.SECRET_DETECTED_DENY,
        reason: 'Quarantine parameters contain secret patterns (Law VI)'
      };
    }

    if (isFundacionTarget(componentId) || isFundacionTarget(reason)) {
      return {
        valid: false,
        code: BX_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Quarantine targets Fundacion path (Fundacion Δ=0 invariant)'
      };
    }

    return {
      valid: true,
      code: BX_CODES.COMPONENT_QUARANTINED_OK
    };
  }

  /**
   * Evaluate a remediation plan before execution.
   * @param {object} plan
   * @param {number} currentRetries
   * @returns {{ valid: boolean, code: string, reason?: string, hitlRequired?: boolean }}
   */
  evaluateRemediation(plan, currentRetries = 0) {
    if (!plan || typeof plan !== 'object') {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_REMEDIATION_DENY,
        reason: 'Remediation plan must be a non-null object'
      };
    }

    if (!plan.componentId || typeof plan.componentId !== 'string') {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_REMEDIATION_DENY,
        reason: 'Remediation plan must specify componentId'
      };
    }

    if (!plan.remediationType || !VALID_REMEDIATION_TYPES.includes(String(plan.remediationType))) {
      return {
        valid: false,
        code: BX_CODES.MALFORMED_REMEDIATION_DENY,
        reason: `remediationType must be one of: ${VALID_REMEDIATION_TYPES.join(', ')}`
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: BX_CODES.SECRET_DETECTED_DENY,
        reason: 'Remediation plan contains secret credentials or vendor keys (Law VI)'
      };
    }

    if (isFundacionTarget(plan.target) || isFundacionTarget(plan.componentId) || isFundacionTarget(plan.actionParams)) {
      return {
        valid: false,
        code: BX_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Remediation plan targets Fundacion path (Fundacion Δ=0 invariant)'
      };
    }

    const limit = plan.maxRetries != null ? plan.maxRetries : this.maxRetries;
    if (currentRetries >= limit) {
      return {
        valid: false,
        code: BX_CODES.MAX_RETRIES_EXCEEDED_DENY,
        hitlRequired: true,
        reason: `Retry limit reached (${currentRetries}/${limit}). Escalation to HITL required.`
      };
    }

    return {
      valid: true,
      code: BX_CODES.REMEDIATION_SUCCESS_OK
    };
  }
}
