/**
 * @module tool-custody-receipt
 * SPEC-0038 / Mission AG — thin custody receipt helper for Live Tool Engine.
 *
 * Seals a minimal invoke receipt with no secret fields.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: tool bus ≠ unbounded fleet ≠ CloudAgent ≠ PRODUCTION_READY
 */

/** @type {'NO'} */
export const AG_RECEIPT_PRODUCTION_READY = 'NO';

/**
 * Build a sealed custody receipt for a tool invoke.
 *
 * Shape: { tool, ok, code, at, receiptId, PRODUCTION_READY:'NO' }
 * Extra non-secret fields may be merged via `extra` after sanitization upstream.
 *
 * @param {object} partial
 * @param {string} partial.tool
 * @param {boolean} partial.ok
 * @param {string} partial.code
 * @param {string} [partial.at]
 * @param {string} [partial.receiptId]
 * @param {object} [extra] — already-sanitized optional fields (mode, message, …)
 * @returns {{ tool: string, ok: boolean, code: string, at: string, receiptId: string, PRODUCTION_READY: 'NO' }}
 */
export function createToolCustodyReceipt(partial = {}, extra = {}) {
  const at =
    typeof partial.at === 'string' && partial.at
      ? partial.at
      : new Date().toISOString();
  const receiptId =
    typeof partial.receiptId === 'string' && partial.receiptId
      ? partial.receiptId
      : `ag-rcpt-${Date.now()}`;

  return {
    tool: String(partial.tool || 'unknown'),
    ok: partial.ok === true,
    code: String(partial.code || (partial.ok === true ? 'OK' : 'DENY')),
    at,
    receiptId,
    PRODUCTION_READY: AG_RECEIPT_PRODUCTION_READY,
    ...extra
  };
}

export default createToolCustodyReceipt;
