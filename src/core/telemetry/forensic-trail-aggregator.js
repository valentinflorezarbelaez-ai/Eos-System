/**
 * Forensic Trail Aggregator
 * Layer 0 Pure Domain port for aggregating, sequencing, and validating multi-agent receipts.
 */

import { SovereignTelemetryReceipt } from './sovereign-telemetry-receipt.js';
import { TelemetryPolicyGate } from './telemetry-policy-gate.js';

export class ForensicTrailAggregator {
  constructor({ batchId = 'MAIN-TRAIL' } = {}) {
    this.batchId = batchId;
    this.buffer = [];
    this.sealedBatches = [];
    this.lastReceiptHash = 'GENESIS';
  }

  /**
   * Ingests an operational receipt into the aggregator.
   * @param {Object} receipt
   * @returns {{ status: 'INGESTED' | 'REJECTED', error?: string }}
   */
  ingestReceipt(receipt) {
    const check = TelemetryPolicyGate.validateReceipt(receipt);
    if (!check.valid) {
      return { status: 'REJECTED', error: check.error };
    }

    this.buffer.push(Object.freeze({ ...receipt }));
    return { status: 'INGESTED' };
  }

  /**
   * Aggregates the current buffer into a sealed telemetry batch receipt.
   * @returns {Object} Sealed batch receipt
   */
  aggregateBatch() {
    const sequenceCheck = TelemetryPolicyGate.validateSequence(this.buffer);
    const status = sequenceCheck.valid ? 'VERIFIED' : 'ANOMALY_DETECTED';

    const batchIndex = this.sealedBatches.length + 1;
    const batchReceipt = SovereignTelemetryReceipt.seal({
      batchId: this.batchId,
      batchIndex,
      entries: this.buffer,
      status,
      prevReceiptHash: this.lastReceiptHash
    });

    this.lastReceiptHash = batchReceipt.hash;
    this.sealedBatches.push(batchReceipt);
    this.buffer = [];

    return batchReceipt;
  }

  /**
   * Verifies the full chain of sealed batches.
   * @returns {{ valid: boolean, brokenIndex?: number }}
   */
  verifyChain() {
    let prevHash = 'GENESIS';

    for (let i = 0; i < this.sealedBatches.length; i++) {
      const batch = this.sealedBatches[i];
      if (!SovereignTelemetryReceipt.verify(batch)) {
        return { valid: false, brokenIndex: i, reason: 'TAMPERED_RECEIPT' };
      }
      if (batch.prevReceiptHash !== prevHash) {
        return { valid: false, brokenIndex: i, reason: 'CHAIN_DISCONTINUITY' };
      }
      prevHash = batch.hash;
    }

    return { valid: true };
  }

  /**
   * Returns a snapshot of the current aggregator state.
   */
  getSnapshot() {
    return {
      batchId: this.batchId,
      bufferedCount: this.buffer.length,
      sealedBatchesCount: this.sealedBatches.length,
      lastReceiptHash: this.lastReceiptHash
    };
  }
}
