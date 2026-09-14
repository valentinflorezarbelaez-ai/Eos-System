/**
 * @file eos-bp-sovereign-telemetry-forensic-aggregator.test.js
 * @description SPEC-0073 / Mission BP — Sovereign Telemetry & Forensic Trail Aggregator.
 * Receipt integrity: BP-RCPT-*
 * PRODUCTION_READY: NO
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SovereignTelemetryReceipt } from '../src/core/telemetry/sovereign-telemetry-receipt.js';
import { TelemetryPolicyGate } from '../src/core/telemetry/telemetry-policy-gate.js';
import { ForensicTrailAggregator } from '../src/core/telemetry/forensic-trail-aggregator.js';

test('BP-01: SovereignTelemetryReceipt seals canonical payload with SHA-256', () => {
  const receipt = SovereignTelemetryReceipt.seal({
    batchId: 'BATCH-001',
    batchIndex: 1,
    entries: [{ receiptId: 'BM-RCPT-01', timestamp: '2026-09-14T10:00:00Z', hash: 'abc123' }],
    status: 'VERIFIED'
  });

  assert.equal(receipt.batchId, 'BATCH-001');
  assert.equal(receipt.batchIndex, 1);
  assert.equal(receipt.entryCount, 1);
  assert.equal(receipt.status, 'VERIFIED');
  assert.ok(receipt.receiptId.startsWith('BP-RCPT-'));
  assert.match(receipt.hash, /^[0-9a-f]{64}$/);
});

test('BP-02: SovereignTelemetryReceipt.verify validates untampered receipt', () => {
  const receipt = SovereignTelemetryReceipt.seal({
    batchId: 'BATCH-002',
    batchIndex: 1,
    entries: []
  });

  assert.equal(SovereignTelemetryReceipt.verify(receipt), true);
});

test('BP-03: SovereignTelemetryReceipt.verify detects tampering', () => {
  const receipt = SovereignTelemetryReceipt.seal({
    batchId: 'BATCH-003',
    batchIndex: 1,
    entries: []
  });

  const tampered = { ...receipt, status: 'TAMPERED' };
  assert.equal(SovereignTelemetryReceipt.verify(tampered), false);
});

test('BP-04: TelemetryPolicyGate passes valid operational receipt', () => {
  const check = TelemetryPolicyGate.validateReceipt({
    receiptId: 'BM-RCPT-001',
    timestamp: '2026-09-14T12:00:00Z',
    hash: 'deadbeef'
  });

  assert.equal(check.valid, true);
});

test('BP-05: TelemetryPolicyGate rejects receipt with missing receiptId', () => {
  const check = TelemetryPolicyGate.validateReceipt({
    timestamp: '2026-09-14T12:00:00Z',
    hash: 'deadbeef'
  });

  assert.equal(check.valid, false);
  assert.equal(check.error, 'MISSING_RECEIPT_ID');
});

test('BP-06: TelemetryPolicyGate rejects receipt with missing timestamp', () => {
  const check = TelemetryPolicyGate.validateReceipt({
    receiptId: 'BM-RCPT-001',
    hash: 'deadbeef'
  });

  assert.equal(check.valid, false);
  assert.equal(check.error, 'MISSING_TIMESTAMP');
});

test('BP-07: TelemetryPolicyGate rejects unsealed receipt', () => {
  const check = TelemetryPolicyGate.validateReceipt({
    receiptId: 'BM-RCPT-001',
    timestamp: '2026-09-14T12:00:00Z'
  });

  assert.equal(check.valid, false);
  assert.equal(check.error, 'MISSING_CRYPTOGRAPHIC_SEAL');
});

test('BP-08: TelemetryPolicyGate validates chronological sequence', () => {
  const buffer = [
    { timestamp: '2026-09-14T10:00:00Z' },
    { timestamp: '2026-09-14T10:05:00Z' },
    { timestamp: '2026-09-14T10:10:00Z' }
  ];

  const check = TelemetryPolicyGate.validateSequence(buffer);
  assert.equal(check.valid, true);
});

test('BP-09: TelemetryPolicyGate detects chronological inversion', () => {
  const buffer = [
    { timestamp: '2026-09-14T10:10:00Z' },
    { timestamp: '2026-09-14T10:05:00Z' }
  ];

  const check = TelemetryPolicyGate.validateSequence(buffer);
  assert.equal(check.valid, false);
  assert.equal(check.error, 'CHRONOLOGICAL_INVERSION_DETECTED');
});

test('BP-10: ForensicTrailAggregator initializes with clean state', () => {
  const aggregator = new ForensicTrailAggregator({ batchId: 'TEST-TRAIL' });
  const snapshot = aggregator.getSnapshot();

  assert.equal(snapshot.batchId, 'TEST-TRAIL');
  assert.equal(snapshot.bufferedCount, 0);
  assert.equal(snapshot.sealedBatchesCount, 0);
  assert.equal(snapshot.lastReceiptHash, 'GENESIS');
});

test('BP-11: ForensicTrailAggregator ingests valid operational receipts', () => {
  const aggregator = new ForensicTrailAggregator();
  const res = aggregator.ingestReceipt({
    receiptId: 'BN-RCPT-01',
    timestamp: '2026-09-14T12:00:00Z',
    hash: '123456'
  });

  assert.equal(res.status, 'INGESTED');
  assert.equal(aggregator.getSnapshot().bufferedCount, 1);
});

test('BP-12: ForensicTrailAggregator rejects invalid receipt during ingestion', () => {
  const aggregator = new ForensicTrailAggregator();
  const res = aggregator.ingestReceipt({
    timestamp: '2026-09-14T12:00:00Z'
  });

  assert.equal(res.status, 'REJECTED');
  assert.equal(aggregator.getSnapshot().bufferedCount, 0);
});

test('BP-13: ForensicTrailAggregator aggregates clean batch to VERIFIED receipt', () => {
  const aggregator = new ForensicTrailAggregator({ batchId: 'AUDIT-01' });
  aggregator.ingestReceipt({ receiptId: 'BM-RCPT-01', timestamp: '2026-09-14T12:00:00Z', hash: 'a1' });
  aggregator.ingestReceipt({ receiptId: 'BN-RCPT-01', timestamp: '2026-09-14T12:01:00Z', hash: 'b2' });

  const batchReceipt = aggregator.aggregateBatch();
  assert.equal(batchReceipt.status, 'VERIFIED');
  assert.equal(batchReceipt.entryCount, 2);
  assert.equal(batchReceipt.prevReceiptHash, 'GENESIS');
  assert.equal(aggregator.getSnapshot().bufferedCount, 0);
  assert.equal(aggregator.getSnapshot().sealedBatchesCount, 1);
});

test('BP-14: ForensicTrailAggregator flags ANOMALY_DETECTED on chronological inversion', () => {
  const aggregator = new ForensicTrailAggregator({ batchId: 'AUDIT-02' });
  aggregator.ingestReceipt({ receiptId: 'BO-RCPT-01', timestamp: '2026-09-14T12:10:00Z', hash: 'c3' });
  aggregator.ingestReceipt({ receiptId: 'BO-RCPT-02', timestamp: '2026-09-14T12:05:00Z', hash: 'd4' });

  const batchReceipt = aggregator.aggregateBatch();
  assert.equal(batchReceipt.status, 'ANOMALY_DETECTED');
});

test('BP-15: ForensicTrailAggregator chains consecutive batches', () => {
  const aggregator = new ForensicTrailAggregator({ batchId: 'CHAIN-01' });

  aggregator.ingestReceipt({ receiptId: 'BM-01', timestamp: '2026-09-14T12:00:00Z', hash: 'h1' });
  const batch1 = aggregator.aggregateBatch();

  aggregator.ingestReceipt({ receiptId: 'BO-01', timestamp: '2026-09-14T12:05:00Z', hash: 'h2' });
  const batch2 = aggregator.aggregateBatch();

  assert.equal(batch2.prevReceiptHash, batch1.hash);
  assert.equal(aggregator.verifyChain().valid, true);
});

test('BP-16: ForensicTrailAggregator detects broken continuity in chain', () => {
  const aggregator = new ForensicTrailAggregator({ batchId: 'CHAIN-02' });

  aggregator.ingestReceipt({ receiptId: 'BM-01', timestamp: '2026-09-14T12:00:00Z', hash: 'h1' });
  aggregator.aggregateBatch();

  aggregator.ingestReceipt({ receiptId: 'BO-01', timestamp: '2026-09-14T12:05:00Z', hash: 'h2' });
  aggregator.aggregateBatch();

  // Corrupt previous batch
  aggregator.sealedBatches[0] = { ...aggregator.sealedBatches[0], status: 'CORRUPTED' };

  const verification = aggregator.verifyChain();
  assert.equal(verification.valid, false);
});
