/**
 * @file tests/eos-bv-dynamic-workflow-telemetry-port.test.js
 * SPEC-0079 / Mission BV — Dynamic Workflow Telemetry & Sovereign Audit Fabric Test Suite.
 *
 * 100% hermetic: node:test + node:assert/strict. Zero network, zero external dependencies.
 * Verifies:
 * - Telemetry span recording and metric validation
 * - Rejection of negative anomalous durations (ANOMALOUS_EXECUTION_DENY)
 * - Multi-mission receipt ingestion (BR, BS, BT, BU)
 * - Tampered receipt detection upon ingestion (TAMPERED_RECEIPT_DENY)
 * - End-to-end sovereign audit summary compilation and cryptographic sealing (BV-RCPT-*)
 * - Fundacion ALWAYS_DENY write barrier enforcement
 * - Cryptographic audit seal verification & trail custody
 * - Non-claim bounds and Law VI compliance
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createWorkflowTelemetryPort,
  buildWorkflowTelemetryReceipt,
  verifyWorkflowTelemetryReceipt,
  isFundacionTarget,
  BV_PRODUCTION_READY,
  BV_RECEIPT_KIND,
  BV_CODES,
  _resetReceiptSeqForTests
} from '../src/core/orchestration/dynamic-workflow-telemetry-port.js';

import { buildIntentDecompositionReceipt } from '../src/core/orchestration/intent-decomposition-receipt.js';
import { buildCapabilityMatcherReceipt } from '../src/core/orchestration/agent-capability-matcher-receipt.js';
import { buildWorkflowCheckpointReceipt } from '../src/core/orchestration/workflow-checkpoint-receipt.js';
import { buildConsensusOrchestrationReceipt } from '../src/core/orchestration/consensus-orchestration-receipt.js';

describe('SPEC-0079 Mission BV — Dynamic Workflow Telemetry & Sovereign Audit Port', () => {
  let port;
  let simulatedTime;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    simulatedTime = 1773532800000; // 2026-03-15T00:00:00.000Z
    port = createWorkflowTelemetryPort({
      now: () => new Date(simulatedTime).toISOString()
    });
  });

  describe('1. Governance & Invariant Baseline', () => {
    test('PRODUCTION_READY must be strictly NO', () => {
      assert.equal(BV_PRODUCTION_READY, 'NO');
      assert.equal(port.productionReady, 'NO');
    });

    test('Fundacion targets are strictly identified and rejected', () => {
      assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/telemetry.json'), true);
      assert.equal(isFundacionTarget('documents/fundacion'), true);
      assert.equal(isFundacionTarget('src/core/orchestration'), false);
    });
  });

  describe('2. Telemetry Span Recording (REQ-EARS-BV-01)', () => {
    test('records valid execution span with phase and duration', () => {
      const res = port.recordSpan({
        workflowId: 'wf-telemetry-01',
        spanId: 'span-intake-01',
        phase: 'intake',
        durationMs: 125,
        status: 'OK',
        meta: { nodeCount: 4 }
      });

      assert.equal(res.ok, true);
      assert.equal(res.code, BV_CODES.SPAN_RECORDED_OK);
      assert.equal(res.span.workflowId, 'wf-telemetry-01');
      assert.equal(res.span.durationMs, 125);
      assert.equal(res.span.phase, 'intake');
      assert.equal(res.fundacionDelta, 0);
    });

    test('rejects anomalous negative span duration (ANOMALOUS_EXECUTION_DENY)', () => {
      const res = port.recordSpan({
        workflowId: 'wf-telemetry-01',
        spanId: 'span-corrupt-01',
        phase: 'execution',
        durationMs: -50
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BV_CODES.ANOMALOUS_EXECUTION_DENY);
    });

    test('rejects malformed span payload (missing workflowId or spanId)', () => {
      const res1 = port.recordSpan(null);
      assert.equal(res1.ok, false);
      assert.equal(res1.code, BV_CODES.MALFORMED_TELEMETRY_DENY);

      const res2 = port.recordSpan({ workflowId: '', spanId: 's1' });
      assert.equal(res2.ok, false);
      assert.equal(res2.code, BV_CODES.MALFORMED_TELEMETRY_DENY);

      const res3 = port.recordSpan({ workflowId: 'wf-1', spanId: '' });
      assert.equal(res3.ok, false);
      assert.equal(res3.code, BV_CODES.MALFORMED_TELEMETRY_DENY);
    });

    test('triggers FUNDACION_ALWAYS_DENY on span targeting Fundacion', () => {
      const res = port.recordSpan({
        workflowId: 'wf-fundacion-telemetry',
        spanId: 'span-01',
        target: 'C:/Users/valen/Documents/Fundacion/logs',
        durationMs: 10
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BV_CODES.FUNDACION_ALWAYS_DENY);
      assert.equal(res.fundacionDelta, 0);
    });
  });

  describe('3. Multi-Mission Receipt Ingestion (REQ-EARS-BV-02)', () => {
    test('ingests valid receipts from BR, BS, BT, and BU', () => {
      const brReceipt = buildIntentDecompositionReceipt({
        workflowId: 'wf-multi-mission',
        parsedGoal: 'Decompose core architecture',
        status: 'DECOMPOSED_OK'
      });

      const bsReceipt = buildCapabilityMatcherReceipt({
        taskId: 'task-01',
        workflowId: 'wf-multi-mission',
        agentId: 'agent-core',
        requiredCapability: 'execution.core',
        status: 'DISPATCHED'
      });

      const btReceipt = buildWorkflowCheckpointReceipt({
        workflowId: 'wf-multi-mission',
        stepId: 'step-01',
        state: 'CHECKPOINTED',
        status: 'CHECKPOINT_OK'
      });

      const buReceipt = buildConsensusOrchestrationReceipt({
        proposalId: 'prop-01',
        workflowId: 'wf-multi-mission',
        action: 'promote.release',
        outcome: 'CONSENSUS_APPROVED'
      });

      const in1 = port.ingestReceipt(brReceipt, 'wf-multi-mission');
      assert.equal(in1.ok, true);
      assert.equal(in1.code, BV_CODES.RECEIPT_INGESTED_OK);

      const in2 = port.ingestReceipt(bsReceipt, 'wf-multi-mission');
      assert.equal(in2.ok, true);

      const in3 = port.ingestReceipt(btReceipt, 'wf-multi-mission');
      assert.equal(in3.ok, true);

      const in4 = port.ingestReceipt(buReceipt, 'wf-multi-mission');
      assert.equal(in4.ok, true);
    });

    test('rejects tampered receipt on ingestion (TAMPERED_RECEIPT_DENY)', () => {
      const validBt = buildWorkflowCheckpointReceipt({
        workflowId: 'wf-tamper-check',
        stepId: 'step-01',
        state: 'RUNNING'
      });

      const tamperedBt = {
        ...validBt,
        state: 'FORGED_STATE'
      };

      const res = port.ingestReceipt(tamperedBt, 'wf-tamper-check');
      assert.equal(res.ok, false);
      assert.equal(res.code, BV_CODES.TAMPERED_RECEIPT_DENY);
    });
  });

  describe('4. Consolidated Metric Aggregation (REQ-EARS-BV-03)', () => {
    beforeEach(() => {
      port.recordSpan({ workflowId: 'wf-metrics', spanId: 's1', phase: 'intake', durationMs: 100, status: 'OK' });
      port.recordSpan({ workflowId: 'wf-metrics', spanId: 's2', phase: 'execution', durationMs: 200, status: 'OK' });
      port.recordSpan({ workflowId: 'wf-metrics', spanId: 's3', phase: 'execution', durationMs: 300, status: 'ERROR' });

      const r1 = buildWorkflowCheckpointReceipt({ workflowId: 'wf-metrics', stepId: 'step-1', state: 'CHECKPOINTED' });
      port.ingestReceipt(r1, 'wf-metrics');
    });

    test('computes aggregated execution metrics correctly', () => {
      const res = port.getWorkflowMetrics('wf-metrics');
      assert.equal(res.ok, true);
      assert.equal(res.code, BV_CODES.METRICS_GET_OK);
      assert.equal(res.metrics.totalSpans, 3);
      assert.equal(res.metrics.totalReceipts, 1);
      assert.equal(res.metrics.totalDurationMs, 600);
      assert.equal(res.metrics.avgDurationMs, 200);
      assert.equal(res.metrics.errorCount, 1);
      assert.equal(res.metrics.phases.intake, 1);
      assert.equal(res.metrics.phases.execution, 2);
    });

    test('returns UNKNOWN_WORKFLOW_DENY when no telemetry exists', () => {
      const res = port.getWorkflowMetrics('wf-ghost');
      assert.equal(res.ok, false);
      assert.equal(res.code, BV_CODES.UNKNOWN_WORKFLOW_DENY);
    });
  });

  describe('5. Sovereign Audit Summary Sealing (REQ-EARS-BV-04)', () => {
    beforeEach(() => {
      port.recordSpan({ workflowId: 'wf-audit-seal', spanId: 'span-1', phase: 'decomposition', durationMs: 50, status: 'OK' });
      port.recordSpan({ workflowId: 'wf-audit-seal', spanId: 'span-2', phase: 'dispatch', durationMs: 70, status: 'OK' });

      const r = buildCapabilityMatcherReceipt({
        taskId: 't-1',
        agentId: 'ag-1',
        requiredCapability: 'core',
        status: 'DISPATCHED'
      });
      port.ingestReceipt(r, 'wf-audit-seal');
    });

    test('compiles and seals sovereign audit summary with BV-RCPT-*', () => {
      const summary = port.compileAuditSummary('wf-audit-seal', {
        consensusSignature: 'SIG-AUDIT-FINAL-99'
      });

      assert.equal(summary.ok, true);
      assert.equal(summary.code, BV_CODES.AUDIT_SEAL_OK);
      assert.equal(summary.auditSummary.workflowId, 'wf-audit-seal');
      assert.ok(summary.auditSummary.auditDigest.length === 64);
      assert.equal(summary.auditSummary.metrics.totalSpans, 2);
      assert.equal(summary.auditSummary.metrics.totalReceipts, 1);

      assert.ok(summary.receipt);
      assert.ok(summary.receipt.receiptId.startsWith('BV-RCPT-'));
      assert.equal(summary.receipt.status, BV_CODES.AUDIT_SEALED);
      assert.equal(summary.receipt.consensusSignature, 'SIG-AUDIT-FINAL-99');

      const v = port.verifyAuditSeal(summary);
      assert.equal(v.ok, true);
    });

    test('rejects audit summary compilation on unknown workflow', () => {
      const summary = port.compileAuditSummary('wf-unknown-nonexistent');
      assert.equal(summary.ok, false);
      assert.equal(summary.code, BV_CODES.UNKNOWN_WORKFLOW_DENY);
      assert.ok(summary.receipt);
      assert.equal(summary.receipt.status, 'DENIED');
    });
  });

  describe('6. Cryptographic Receipts & Trail Custody (REQ-EARS-BV-05)', () => {
    test('verifies intact receipt chain across sequential audit seals', () => {
      port.recordSpan({ workflowId: 'wf-trail-1', spanId: 's1', phase: 'a', durationMs: 10, status: 'OK' });
      const a1 = port.compileAuditSummary('wf-trail-1');
      assert.equal(a1.ok, true);

      simulatedTime += 1000;
      port.recordSpan({ workflowId: 'wf-trail-2', spanId: 's2', phase: 'b', durationMs: 20, status: 'OK' });
      const a2 = port.compileAuditSummary('wf-trail-2');
      assert.equal(a2.ok, true);

      const trail = port.verifyTelemetryTrail([a1.receipt, a2.receipt]);
      assert.equal(trail.ok, true);
      assert.equal(trail.code, BV_CODES.TRAIL_OK);
      assert.equal(trail.verifiedCount, 2);
    });

    test('fails trail verification on tampered audit receipt payload', () => {
      port.recordSpan({ workflowId: 'wf-tamper-trail', spanId: 's1', phase: 'a', durationMs: 10, status: 'OK' });
      const a1 = port.compileAuditSummary('wf-tamper-trail');

      const tampered = { ...a1.receipt, spanCount: 9999 };
      const trail = port.verifyTelemetryTrail([tampered]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BV_CODES.TRAIL_BREAK);
    });

    test('fails trail verification on broken prevReceiptHash link', () => {
      port.recordSpan({ workflowId: 'wf-t1', spanId: 's1', phase: 'a', durationMs: 10, status: 'OK' });
      const a1 = port.compileAuditSummary('wf-t1');

      port.recordSpan({ workflowId: 'wf-t2', spanId: 's2', phase: 'b', durationMs: 20, status: 'OK' });
      const a2 = port.compileAuditSummary('wf-t2');

      const forgedA2 = {
        ...a2.receipt,
        prevReceiptHash: '0000000000000000000000000000000000000000000000000000000000000000'
      };

      const trail = port.verifyTelemetryTrail([a1.receipt, forgedA2]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BV_CODES.TRAIL_BREAK);
    });
  });
});
