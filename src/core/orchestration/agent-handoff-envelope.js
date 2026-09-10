/**
 * @file agent-handoff-envelope.js
 * @description Typed multi-agent handoff contract inspired by Google ADK and PydanticAI patterns (Ponytail Tier 2).
 * Enforces schema validation across phase transitions and the constitutional rule: BUILDER != VERIFIER.
 */

export const LEGAL_PHASES = Object.freeze([
  'intake',
  'architect',
  'spec_engineer',
  'planner',
  'builder',
  'verifier',
  'auditor',
  'operator'
]);

export const LEGAL_TRANSITIONS = Object.freeze([
  'INTAKE_TO_SPEC',
  'SPEC_TO_PLAN',
  'PLAN_TO_APPLY',
  'APPLY_TO_VERIFY',
  'VERIFY_TO_REVIEW',
  'VERIFY_TO_ARCHIVE',
  'REVIEW_TO_ARCHIVE',
  'REJECT_BACK_TO_APPLY',
  'REJECT_BACK_TO_SPEC'
]);

export class AgentHandoffEnvelope {
  /**
   * @param {object} params
   * @param {string} params.sender_phase
   * @param {string} params.receiver_phase
   * @param {string} params.transition
   * @param {string} params.sender_agent_id
   * @param {string} params.receiver_agent_id
   * @param {object} params.payload
   * @param {string} [params.timestamp]
   */
  constructor(params) {
    this.sender_phase = params.sender_phase;
    this.receiver_phase = params.receiver_phase;
    this.transition = params.transition;
    this.sender_agent_id = params.sender_agent_id;
    this.receiver_agent_id = params.receiver_agent_id;
    this.payload = Object.freeze({ ...params.payload });
    this.timestamp = params.timestamp || new Date().toISOString();

    Object.freeze(this);
  }

  /**
   * Validates handoff parameters against schema and transition rules.
   * @param {object} params
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(params) {
    const errors = [];
    if (!params || typeof params !== 'object') {
      return { valid: false, errors: ['INVALID_ENVELOPE_PARAMS: must be an object'] };
    }

    const requiredFields = [
      'sender_phase',
      'receiver_phase',
      'transition',
      'sender_agent_id',
      'receiver_agent_id',
      'payload'
    ];

    for (const field of requiredFields) {
      if (!params[field]) {
        errors.push(`MISSING_REQUIRED_FIELD: ${field}`);
      }
    }

    if (params.sender_phase && !LEGAL_PHASES.includes(params.sender_phase)) {
      errors.push(`ILLEGAL_SENDER_PHASE: ${params.sender_phase}`);
    }

    if (params.receiver_phase && !LEGAL_PHASES.includes(params.receiver_phase)) {
      errors.push(`ILLEGAL_RECEIVER_PHASE: ${params.receiver_phase}`);
    }

    if (params.transition && !LEGAL_TRANSITIONS.includes(params.transition)) {
      errors.push(`ILLEGAL_TRANSITION: ${params.transition}`);
    }

    if (params.payload && (typeof params.payload !== 'object' || !params.payload.change_id)) {
      errors.push('INVALID_PAYLOAD: payload must be an object containing change_id');
    }

    // Constitutional Law: BUILDER != VERIFIER disjunction
    const isApplyToVerify = params.transition === 'APPLY_TO_VERIFY' ||
      (params.sender_phase === 'builder' && params.receiver_phase === 'verifier');

    if (isApplyToVerify && params.sender_agent_id && params.receiver_agent_id) {
      if (params.sender_agent_id.trim() === params.receiver_agent_id.trim()) {
        errors.push(`BUILDER_EQUALS_VERIFIER_VIOLATION: sender '${params.sender_agent_id}' cannot verify their own implementation`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Creates a validated, immutable AgentHandoffEnvelope or throws fail-closed error.
   * @param {object} params
   * @returns {AgentHandoffEnvelope}
   */
  static create(params) {
    const check = this.validate(params);
    if (!check.valid) {
      const err = new Error(`AGENT_HANDOFF_VALIDATION_FAILED: ${check.errors.join('; ')}`);
      err.code = 'AGENT_HANDOFF_VALIDATION_FAILED';
      err.errors = check.errors;
      throw err;
    }
    return new AgentHandoffEnvelope(params);
  }

  toJSON() {
    return {
      sender_phase: this.sender_phase,
      receiver_phase: this.receiver_phase,
      transition: this.transition,
      sender_agent_id: this.sender_agent_id,
      receiver_agent_id: this.receiver_agent_id,
      payload: this.payload,
      timestamp: this.timestamp,
      status: this.payload.status || 'HANDOFF_COMPLETED'
    };
  }
}
