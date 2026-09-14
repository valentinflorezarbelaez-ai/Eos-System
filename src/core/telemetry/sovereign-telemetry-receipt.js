/**
 * Sovereign Telemetry Receipt — BP-RCPT-*
 * Layer 0 Pure Domain module for sealing aggregated telemetry batches.
 */

import crypto from 'node:crypto';

export class SovereignTelemetryReceipt {
  /**
   * Builds and seals a canonical telemetry batch receipt.
   * @param {Object} params
   * @param {string} params.batchId
   * @param {number} params.batchIndex
   * @param {Array<Object>} params.entries
   * @param {string} params.status - 'VERIFIED' | 'ANOMALY_DETECTED' | 'DENIED'
   * @param {string} [params.prevReceiptHash]
   * @returns {Object} Sealed receipt with canonical SHA-256 hash
   */
  static seal({ batchId, batchIndex, entries = [], status = 'VERIFIED', prevReceiptHash = 'GENESIS' }) {
    if (!batchId || typeof batchId !== 'string') {
      throw new Error('TelemetryReceipt: batchId is required and must be a string');
    }

    const timestamp = new Date().toISOString();
    const entryCount = entries.length;

    // Compute root hash over serialized entries
    const serializedEntries = JSON.stringify(
      entries.map(e => ({
        receiptId: e.receiptId || e.id || 'UNKNOWN',
        timestamp: e.timestamp || '',
        hash: e.hash || e.signature || ''
      }))
    );
    const rootHash = crypto.createHash('sha256').update(serializedEntries).digest('hex');

    const canonicalPayload = {
      receiptId: `BP-RCPT-${batchId}-${batchIndex}`,
      batchId,
      batchIndex,
      entryCount,
      rootHash,
      status,
      timestamp,
      prevReceiptHash
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(canonicalPayload))
      .digest('hex');

    return Object.freeze({
      ...canonicalPayload,
      hash
    });
  }

  /**
   * Verifies the cryptographic integrity of a sealed receipt.
   * @param {Object} receipt
   * @returns {boolean}
   */
  static verify(receipt) {
    if (!receipt || !receipt.hash) return false;
    const { hash, ...payload } = receipt;
    const expectedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    return hash === expectedHash;
  }
}
