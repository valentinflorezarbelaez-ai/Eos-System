/**
 * @module LlmPort
 * @description Hexagonal Port interface for Governed LLM integrations in EOS.
 * Decouples deterministic EOS core systems from external AI model providers.
 * Enforces structured input/output contracts, normalized status codes, and classified errors.
 */

export class LlmError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details={}]
   */
  constructor(message, code = 'LLM_GENERIC_ERROR', details = {}) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class LlmAuthError extends LlmError {
  constructor(message, details = {}) {
    super(message, 'LLM_AUTH_DENIED', details);
    this.name = 'LlmAuthError';
  }
}

export class LlmBudgetError extends LlmError {
  constructor(message, details = {}) {
    super(message, 'LLM_BUDGET_EXCEEDED', details);
    this.name = 'LlmBudgetError';
  }
}

export class LlmSchemaValidationError extends LlmError {
  constructor(message, details = {}) {
    super(message, 'LLM_SCHEMA_VALIDATION_FAILED', details);
    this.name = 'LlmSchemaValidationError';
  }
}

export class LlmProviderError extends LlmError {
  constructor(message, details = {}) {
    super(message, 'LLM_PROVIDER_FAILURE', details);
    this.name = 'LlmProviderError';
  }
}

export class LlmTimeoutError extends LlmError {
  constructor(message, details = {}) {
    super(message, 'LLM_TIMEOUT', details);
    this.name = 'LlmTimeoutError';
  }
}

export class LlmRateLimitError extends LlmError {
  constructor(message, details = {}) {
    super(message, 'LLM_RATE_LIMITED', details);
    this.name = 'LlmRateLimitError';
  }
}

/**
 * Abstract Port representing an external LLM Provider capability.
 * All provider adapters must implement this contract.
 */
export class LlmPort {
  /**
   * Name/identifier of the adapter implementation
   * @returns {string}
   */
  getName() {
    throw new Error('LlmPort.getName() must be implemented by adapter.');
  }

  /**
   * Returns metadata and capability profile of the model
   * @returns {object} Conforming to model-capability.schema.json
   */
  getCapabilities() {
    throw new Error('LlmPort.getCapabilities() must be implemented by adapter.');
  }

  /**
   * Executes governed model inference
   * @param {object} request Conforming to llm-request.schema.json
   * @returns {Promise<object>} Conforming to llm-response.schema.json
   */
  async infer(request) {
    throw new Error('LlmPort.infer() must be implemented by adapter.');
  }
}
