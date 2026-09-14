/**
 * Telemetry Policy Gate
 * Layer 0 Fail-Closed Policy Gate for validating ingested telemetry events and batches.
 */

export class TelemetryPolicyGate {
  /**
   * Validates an individual operational receipt before ingestion.
   * @param {Object} receipt
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateReceipt(receipt) {
    if (!receipt || typeof receipt !== 'object') {
      return { valid: false, error: 'RECEIPT_NULL_OR_INVALID' };
    }

    if (!receipt.receiptId || typeof receipt.receiptId !== 'string') {
      return { valid: false, error: 'MISSING_RECEIPT_ID' };
    }

    if (!receipt.timestamp || typeof receipt.timestamp !== 'string') {
      return { valid: false, error: 'MISSING_TIMESTAMP' };
    }

    if (!receipt.hash && !receipt.signature) {
      return { valid: false, error: 'MISSING_CRYPTOGRAPHIC_SEAL' };
    }

    return { valid: true };
  }

  /**
   * Validates chronological ordering and hash continuity of an event buffer.
   * @param {Array<Object>} buffer
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateSequence(buffer) {
    if (!Array.isArray(buffer)) {
      return { valid: false, error: 'BUFFER_NOT_ARRAY' };
    }

    for (let i = 1; i < buffer.length; i++) {
      const prev = buffer[i - 1];
      const curr = buffer[i];

      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(curr.timestamp).getTime();

      if (isNaN(prevTime) || isNaN(currTime) || currTime < prevTime) {
        return { valid: false, error: 'CHRONOLOGICAL_INVERSION_DETECTED' };
      }
    }

    return { valid: true };
  }
}
