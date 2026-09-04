/**
 * @module LlmReceiptEngine
 * @description Cryptographic Epistemic Receipt Generator for EOS LLM Invocations.
 * Issues immutable, verifiable receipts conforming to llm-receipt.schema.json,
 * sealing telemetry, authority rank, hashes, and validation status without leaking credentials.
 */

import { randomBytes } from 'node:crypto';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';
import { SchemaValidator } from '../contracts/schema-validator.js';

export class LlmReceiptEngine {
  /**
   * @param {object} [options]
   * @param {SchemaValidator} [options.validator]
   */
  constructor(options = {}) {
    this.validator = options.validator || new SchemaValidator();
  }

  /**
   * Generates a sealed LLM invocation receipt
   * @param {object} params
   * @param {string} params.missionId
   * @param {string} [params.taskId]
   * @param {string} params.provider
   * @param {string} params.model
   * @param {boolean} params.authorized
   * @param {string} params.authorityLevel
   * @param {object|string} params.requestPayload
   * @param {object|string} [params.responsePayload]
   * @param {string} params.responseStatus
   * @param {string} [params.validationResult='PASS'] 'PASS' | 'FAIL' | 'NOT_RUN'
   * @param {object} params.usage { input_tokens, output_tokens, total_tokens, estimated_cost_usd }
   * @param {number} params.latencyMs
   * @param {string} [params.errorClass=null]
   * @returns {object} Sealed receipt conforming to llm-receipt.schema.json
   */
  generateReceipt(params) {
    if (!params || !params.missionId || !params.provider || !params.model) {
      throw new Error('RECEIPT_GENERATION_ERROR: missionId, provider, and model are required.');
    }

    const receiptId = `LLM-REC-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const requestStr = typeof params.requestPayload === 'string'
      ? params.requestPayload
      : JSON.stringify(params.requestPayload || {});
    const requestSha256 = calculateSha256(requestStr);

    let responseSha256 = null;
    if (params.responsePayload) {
      const responseStr = typeof params.responsePayload === 'string'
        ? params.responsePayload
        : JSON.stringify(params.responsePayload);
      responseSha256 = calculateSha256(responseStr);
    }

    const usage = {
      input_tokens: Number(params.usage?.input_tokens) || 0,
      output_tokens: Number(params.usage?.output_tokens) || 0,
      total_tokens: Number(params.usage?.total_tokens) || 0,
      estimated_cost_usd: Number(params.usage?.estimated_cost_usd || 0)
    };

    const receiptBody = {
      schema_version: '1.0.0',
      receipt_id: receiptId,
      mission_id: params.missionId,
      task_id: params.taskId || null,
      provider: params.provider.toUpperCase(),
      model: params.model,
      authorized: Boolean(params.authorized),
      authority_level: params.authorityLevel || 'LEVEL_1',
      request_sha256: requestSha256,
      response_sha256: responseSha256,
      response_status: params.responseStatus || 'COMPLETED',
      validation_result: params.validationResult || (params.authorized && params.responseStatus === 'COMPLETED' ? 'PASS' : 'FAIL'),
      usage,
      latency_ms: Number(params.latencyMs) || 0,
      error_class: params.errorClass || null,
      timestamp
    };

    // Calculate deterministic cryptographic seal over all fields except sha256 itself
    const canonicalStr = JSON.stringify(receiptBody, Object.keys(receiptBody).sort());
    const sha256 = calculateSha256(canonicalStr);

    const fullReceipt = {
      ...receiptBody,
      sha256
    };

    // Assert schema conformance
    this.validator.assertValid(fullReceipt, 'llm-receipt.schema.json', 'llm-receipt');

    return fullReceipt;
  }

  /**
   * Cryptographically verifies receipt integrity
   * @param {object} receipt
   * @returns {{ verified: boolean, expectedSha256: string, actualSha256: string }}
   */
  verifyReceipt(receipt) {
    if (!receipt || !receipt.sha256) {
      return { verified: false, reason: 'MISSING_SIGNATURE' };
    }

    const { sha256, ...body } = receipt;
    const canonicalStr = JSON.stringify(body, Object.keys(body).sort());
    const calculated = calculateSha256(canonicalStr);

    return {
      verified: calculated === sha256,
      expectedSha256: sha256,
      actualSha256: calculated
    };
  }
}
