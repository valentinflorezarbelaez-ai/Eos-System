/**
 * @module LlmAuthorityGate
 * @description Deterministic Authority and Policy Gate for EOS LLM Invocations.
 * Evaluates caller authorization rank (requires >= A1 / LEVEL_1), validates request schemas,
 * enforces immutable governance invariants, and blocks unverified model privilege escalation.
 */

import { AuthorityAdapter } from '../authority/authority-adapter.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { LlmAuthError, LlmSchemaValidationError } from '../ports/llm-port.js';

export class LlmAuthorityGate {
  /**
   * @param {object} [options]
   * @param {SchemaValidator} [options.validator]
   * @param {string} [options.minRequiredLevel='A1'] Minimum authority token needed for LLM inference
   */
  constructor(options = {}) {
    this.validator = options.validator || new SchemaValidator();
    this.minRequiredLevel = options.minRequiredLevel || 'A1';
  }

  /**
   * Evaluates an LLM invocation request against monotonic authority and schema contracts
   * @param {object} request Conforming to llm-request.schema.json
   * @returns {{ authorized: boolean, authorityToken: string, reason: string, sanitizedRequest: object }}
   */
  evaluateAuthorization(request) {
    if (!request || typeof request !== 'object') {
      throw new LlmAuthError('AUTHORIZATION_DENIED: Request payload must be a non-null object.');
    }

    // 1. Schema Validation (Fail-Closed)
    const schemaValidation = this.validator.validate(request, 'llm-request.schema.json');
    if (!schemaValidation.valid) {
      const detail = schemaValidation.errors.map(e => `${e.path}: ${e.message}`).join('; ');
      throw new LlmSchemaValidationError(`Request schema invalid: ${detail}`, { errors: schemaValidation.errors });
    }

    // 2. Monotonic Authority Rank Evaluation
    const grantedLevel = request.authority_level;
    const authCheck = AuthorityAdapter.checkAuthority(this.minRequiredLevel, grantedLevel);

    if (!authCheck.authorized) {
      return {
        authorized: false,
        authorityToken: grantedLevel,
        effectiveRank: authCheck.effectiveRank,
        requiredRank: authCheck.requiredRank,
        reason: `AUTHORIZATION_DENIED: Authority level '${grantedLevel}' is below minimum required '${this.minRequiredLevel}' (${authCheck.reason}).`
      };
    }

    // 3. Immutability Invariant: The LLM request must NOT contain forbidden self-authorization directives
    const messagesJson = JSON.stringify(request.messages || []);
    if (messagesJson.includes('EOS_OVERRIDE_AUTHORITY') || messagesJson.includes('GRANT_LEVEL_4')) {
      return {
        authorized: false,
        authorityToken: grantedLevel,
        reason: 'SECURITY_VIOLATION: Attempted prompt injection / authority escalation sequence detected.'
      };
    }

    return {
      authorized: true,
      authorityToken: grantedLevel,
      effectiveRank: authCheck.effectiveRank,
      reason: 'AUTHORIZED'
    };
  }

  /**
   * Asserts authorization or throws classified LlmAuthError
   * @param {object} request
   */
  assertAuthorized(request) {
    const verdict = this.evaluateAuthorization(request);
    if (!verdict.authorized) {
      throw new LlmAuthError(verdict.reason, {
        authorityToken: verdict.authorityToken,
        minRequiredLevel: this.minRequiredLevel
      });
    }
    return verdict;
  }
}
