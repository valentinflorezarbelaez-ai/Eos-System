/**
 * @module GovernedLlmService
 * @description Master Governed Intelligence Service for EOS.
 * Coordinates the full Phase 0 governed cycle:
 * Request -> Authority Gate -> Preflight Budget -> Provider Adapter -> Response Validation -> Budget Accounting -> Epistemic Receipt.
 */

import { LlmAuthorityGate } from '../governance/llm-authority-gate.js';
import { LlmBudgetGovernor } from './llm-budget-governor.js';
import { LlmReceiptEngine } from './llm-receipt-engine.js';
import { LlmAdapterRegistry } from '../adapters/llm/adapter-registry.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { LlmError, LlmSchemaValidationError } from '../ports/llm-port.js';

function normalizeProvider(provider) {
  const allowed = ['GOOGLE', 'ANTHROPIC', 'OPENAI', 'META_OLLAMA', 'MISTRAL', 'CUSTOM_LOCAL'];
  const upper = String(provider || '').toUpperCase();
  if (allowed.includes(upper)) return upper;
  if (upper.includes('GEMINI') || upper.includes('GOOGLE')) return 'GOOGLE';
  if (upper.includes('ANTHROPIC') || upper.includes('CLAUDE')) return 'ANTHROPIC';
  if (upper.includes('OPENAI') || upper.includes('GPT')) return 'OPENAI';
  return 'CUSTOM_LOCAL';
}

export class GovernedLlmService {
  /**
   * @param {object} [options]
   * @param {LlmAuthorityGate} [options.authorityGate]
   * @param {LlmBudgetGovernor} [options.budgetGovernor]
   * @param {LlmReceiptEngine} [options.receiptEngine]
   * @param {LlmAdapterRegistry} [options.adapterRegistry]
   * @param {SchemaValidator} [options.validator]
   */
  constructor(options = {}) {
    this.validator = options.validator || new SchemaValidator();
    this.authorityGate = options.authorityGate || new LlmAuthorityGate({ validator: this.validator });
    this.budgetGovernor = options.budgetGovernor || new LlmBudgetGovernor();
    this.receiptEngine = options.receiptEngine || new LlmReceiptEngine({ validator: this.validator });
    this.adapterRegistry = options.adapterRegistry || new LlmAdapterRegistry();
  }

  /**
   * Executes a complete governed LLM inference cycle
   * @param {object} request Conforming to llm-request.schema.json
   * @returns {Promise<{ response: object, receipt: object }>}
   */
  async executeInference(request) {
    const startTime = Date.now();
    let authorityDecision = { authorized: false, authorityToken: request?.authority_level || 'A0' };
    let adapter = null;

    try {
      // 1. Authority Gate Check (Monotonic Least-Privilege & Request Schema Validation)
      authorityDecision = this.authorityGate.assertAuthorized(request);

      // 2. Preflight Budget Check
      this.budgetGovernor.assertPreflightBudget(
        request.mission_id,
        request.budget_constraints?.max_input_tokens || 1000
      );

      // 3. Adapter Resolution
      adapter = this.adapterRegistry.getAdapter(request.model);

      // 4. Provider Invocation
      const response = await adapter.infer(request);

      // 5. Response Validation (Fail-Closed)
      this.validator.assertValid(response, 'llm-response.schema.json', 'llm-response');

      if (request.structured_output_schema && response.structured_output) {
        const structValidation = this.validator.validate(response.structured_output, request.structured_output_schema);
        if (!structValidation.valid) {
          const detail = structValidation.errors.map(e => `${e.path}: ${e.message}`).join('; ');
          throw new LlmSchemaValidationError(`Structured response output failed schema validation: ${detail}`, {
            errors: structValidation.errors,
            structured_output: response.structured_output
          });
        }
      }

      // 6. Record Budget Usage
      this.budgetGovernor.recordUsage(request.mission_id, request.task_id || null, response.usage);

      // 7. Epistemic Receipt Generation
      const receipt = this.receiptEngine.generateReceipt({
        missionId: request.mission_id,
        taskId: request.task_id || null,
        provider: normalizeProvider(response.provider),
        model: response.model,
        authorized: true,
        authorityLevel: request.authority_level,
        requestPayload: request,
        responsePayload: response,
        responseStatus: response.status,
        validationResult: 'PASS',
        usage: response.usage,
        latencyMs: response.latency_ms || (Date.now() - startTime),
        errorClass: null
      });

      return {
        response,
        receipt
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorClass = error.name || 'LlmError';

      // Generate failure receipt for auditability
      let failureReceipt = null;
      try {
        const provName = adapter ? (adapter.getCapabilities?.()?.provider || adapter.getName()) : 'CUSTOM_LOCAL';
        failureReceipt = this.receiptEngine.generateReceipt({
          missionId: request?.mission_id || 'MIS-UNKNOWN',
          taskId: request?.task_id || null,
          provider: normalizeProvider(provName),
          model: request?.model || 'unknown',
          authorized: Boolean(authorityDecision?.authorized),
          authorityLevel: request?.authority_level || 'LEVEL_1',
          requestPayload: request || {},
          responsePayload: { error: error.message, code: error.code },
          responseStatus: error.code === 'LLM_AUTH_DENIED'
            ? 'AUTH_DENIED'
            : (error.code === 'LLM_BUDGET_EXCEEDED' ? 'BUDGET_EXCEEDED' : 'FAILED'),
          validationResult: 'FAIL',
          usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: 0 },
          latencyMs,
          errorClass
        });
      } catch (receiptErr) {
        // Fallback if receipt generation itself failed
      }

      if (error instanceof LlmError) {
        error.receipt = failureReceipt;
        throw error;
      }

      const wrapped = new LlmError(`Governed LLM invocation failed: ${error.message}`, error.code || 'LLM_EXECUTION_FAILURE', {
        originalError: error.message,
        receipt: failureReceipt
      });
      wrapped.receipt = failureReceipt;
      throw wrapped;
    }
  }
}
