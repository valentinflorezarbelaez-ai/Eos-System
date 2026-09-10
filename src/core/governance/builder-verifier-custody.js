/**
 * @module BuilderVerifierCustody
 * @description Runtime enforcement of the constitutional rule: BUILDER != VERIFIER (Law III & ADR-0010).
 * Prevents builder self-certification and guarantees that any verification receipt or custody seal
 * involves two distinct identities for implementation and independent verification.
 */

export class BuilderVerifierCustodyError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   */
  constructor(message, code = 'BUILDER_EQUALS_VERIFIER_VIOLATION') {
    super(message);
    this.name = 'BuilderVerifierCustodyError';
    this.code = code;
  }
}

/**
 * Asserts strict disjunction between builder_id and verifier_id.
 * Throws BuilderVerifierCustodyError if identities are missing, identical, or use forbidden placeholders.
 *
 * @param {object} params
 * @param {string} params.builder_id - Identity of the building agent/subagent
 * @param {string} params.verifier_id - Identity of the independent verifier agent
 * @returns {boolean} True if disjunction holds
 */
export function assertBuilderVerifierDisjunction({ builder_id, verifier_id } = {}) {
  if (!builder_id || typeof builder_id !== 'string' || !builder_id.trim()) {
    throw new BuilderVerifierCustodyError(
      'BUILDER_ID_MISSING: builder_id is required to establish verification custody',
      'BUILDER_ID_MISSING'
    );
  }

  if (!verifier_id || typeof verifier_id !== 'string' || !verifier_id.trim()) {
    throw new BuilderVerifierCustodyError(
      'VERIFIER_ID_MISSING: verifier_id is required to establish verification custody',
      'VERIFIER_ID_MISSING'
    );
  }

  const cleanVerifier = verifier_id.trim();
  const cleanBuilder = builder_id.trim();

  if (cleanVerifier === 'APPLY_BUILDER_NOT_VERIFIER') {
    throw new BuilderVerifierCustodyError(
      'PLACEHOLDER_VERIFIER_DENIED: placeholder verifier cannot certify verification receipt',
      'PLACEHOLDER_VERIFIER_DENIED'
    );
  }

  if (cleanBuilder.toLowerCase() === cleanVerifier.toLowerCase()) {
    throw new BuilderVerifierCustodyError(
      `BUILDER_EQUALS_VERIFIER_VIOLATION: builder '${cleanBuilder}' cannot verify their own implementation (Law III & ADR-0010)`,
      'BUILDER_EQUALS_VERIFIER_VIOLATION'
    );
  }

  return true;
}

/**
 * Evaluates a verification receipt object for custody compliance without throwing.
 *
 * @param {object} receipt
 * @returns {{ valid: boolean, code: string, error?: string, builder_id?: string, verifier_id?: string }}
 */
export function validateVerificationReceiptCustody(receipt = {}) {
  if (!receipt || typeof receipt !== 'object') {
    return {
      valid: false,
      code: 'RECEIPT_INVALID_STRUCTURE',
      error: 'Receipt must be a non-null object'
    };
  }

  try {
    assertBuilderVerifierDisjunction({
      builder_id: receipt.builder_id,
      verifier_id: receipt.verifier_id
    });
    return {
      valid: true,
      code: 'CUSTODY_DISJUNCTION_VERIFIED',
      builder_id: receipt.builder_id.trim(),
      verifier_id: receipt.verifier_id.trim()
    };
  } catch (err) {
    return {
      valid: false,
      code: err.code || 'BUILDER_EQUALS_VERIFIER_VIOLATION',
      error: err.message
    };
  }
}
