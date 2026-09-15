/**
 * @module dynamic-workflow-telemetry-port
 * SPEC-0079 / Mission BV — Dynamic Workflow Telemetry & Sovereign Audit Fabric.
 *
 * Facade: createWorkflowTelemetryPort({ now, hash, policyGate })
 *   .recordSpan(spanPayload)
 *   .ingestReceipt(receipt, explicitWorkflowId)
 *   .getWorkflowMetrics(workflowId)
 *   .compileAuditSummary(workflowId, opts)
 *   .verifyAuditSeal(auditSummaryOrReceipt)
 *   .verifyTelemetryTrail(receipts)
 *
 * Pure Layer-0 hermetic workflow telemetry collection & sovereign audit sealing.
 * Emits cryptographically sealed BV-RCPT-* receipts via node:crypto.
 * Closes Ladder 22 (Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric).
 *
 * Fail-closed:
 *   Fundacion ALWAYS_DENY; tampered receipt → TAMPERED_RECEIPT_DENY;
 *   negative span duration → ANOMALOUS_EXECUTION_DENY;
 *   incomplete audit trail → INCOMPLETE_AUDIT_TRAIL_DENY.
 *
 * NON-CLAIM:
 *   telemetry port ≠ OpenTelemetry collector /
 *   ≠ Prometheus/Datadog APM /
 *   ≠ PRODUCTION_READY=YES cloud monitoring product.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 CLOSES WITH BV (BR, BS, BT, BU done; BV completes L22);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BV_CEILING
 */

import {
  BV_PRODUCTION_READY as BV_RECEIPT_PR,
  BV_RECEIPT_KIND,
  BV_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalWorkflowTelemetrySealBody,
  hashWorkflowTelemetryReceipt,
  verifyWorkflowTelemetryReceipt,
  buildWorkflowTelemetryReceipt,
  _resetReceiptSeqForTests
} from './workflow-telemetry-receipt.js';

import {
  BV_POLICY_GATE_KIND,
  BV_POLICY_GATE_PRODUCTION_READY,
  BV_POLICY_CODES,
  deny,
  denyFundacion,
  isFundacionTarget,
  validateSpanPayload,
  validateIngestedReceipt,
  createWorkflowTelemetryPolicyGate
} from './workflow-telemetry-policy-gate.js';

/** @type {'NO'} */
export const BV_PRODUCTION_READY = 'NO';

export const BV_KIND = 'eos-dynamic-workflow-telemetry-port';

export const BV_CODES = Object.freeze({
  ...BV_POLICY_CODES,
  AUDIT_SEAL_OK: 'AUDIT_SEAL_OK',
  METRICS_GET_OK: 'METRICS_GET_OK'
});

export {
  BV_POLICY_CODES,
  BV_POLICY_GATE_KIND,
  BV_POLICY_GATE_PRODUCTION_READY,
  BV_RECEIPT_KIND,
  BV_RECEIPT_PRODUCTION_READY,
  BV_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalWorkflowTelemetrySealBody,
  hashWorkflowTelemetryReceipt,
  verifyWorkflowTelemetryReceipt,
  buildWorkflowTelemetryReceipt,
  _resetReceiptSeqForTests,
  isFundacionTarget,
  validateSpanPayload,
  validateIngestedReceipt
};

/**
 * Factory for Dynamic Workflow Telemetry & Sovereign Audit Port.
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.policyGate]
 * @returns {object}
 */
export function createWorkflowTelemetryPort(opts = {}) {
  const nowFn = typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const hashFn = typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const policyGate = opts.policyGate || createWorkflowTelemetryPolicyGate();

  /** @type {Map<string, Array<object>>} workflowId -> Array<spanRecord> */
  const spansByWorkflow = new Map();
  /** @type {Map<string, Array<object>>} workflowId -> Array<receiptRecord> */
  const receiptsByWorkflow = new Map();
  /** @type {Map<string, object>} workflowId -> auditSummary */
  const auditSummaries = new Map();
  /** @type {string|null} */
  let lastReceiptHash = null;

  /**
   * Record a telemetry execution span.
   * @param {object} rawPayload
   * @returns {{ ok: boolean, code: string, reason?: string, span?: object, fundacionDelta: 0 }}
   */
  function recordSpan(rawPayload) {
    const val = policyGate.validateSpanPayload(rawPayload);
    if (!val.ok) {
      return {
        ok: false,
        code: val.code || BV_CODES.MALFORMED_TELEMETRY_DENY,
        reason: val.reason || 'invalid telemetry span payload',
        fundacionDelta: 0
      };
    }

    const clean = val.cleanSpan;
    if (!spansByWorkflow.has(clean.workflowId)) {
      spansByWorkflow.set(clean.workflowId, []);
    }
    spansByWorkflow.get(clean.workflowId).push(clean);

    return {
      ok: true,
      code: BV_CODES.SPAN_RECORDED_OK,
      span: clean,
      fundacionDelta: 0
    };
  }

  /**
   * Ingest a cryptographic receipt from any mission (BR, BS, BT, BU).
   * Verifies receipt hash tamper-resistance before indexing.
   * @param {object} receipt
   * @param {string|null} [explicitWorkflowId]
   * @returns {{ ok: boolean, code: string, reason?: string, receiptId?: string, fundacionDelta: 0 }}
   */
  function ingestReceipt(receipt, explicitWorkflowId = null) {
    const val = policyGate.validateIngestedReceipt(receipt, hashFn);
    if (!val.ok) {
      return {
        ok: false,
        code: val.code || BV_CODES.TAMPERED_RECEIPT_DENY,
        reason: val.reason || 'tampered receipt rejected',
        fundacionDelta: 0
      };
    }

    const wfId =
      explicitWorkflowId != null && String(explicitWorkflowId).trim() !== ''
        ? String(explicitWorkflowId).trim()
        : receipt.workflowId != null
          ? String(receipt.workflowId).trim()
          : 'global';

    if (!receiptsByWorkflow.has(wfId)) {
      receiptsByWorkflow.set(wfId, []);
    }
    receiptsByWorkflow.get(wfId).push(receipt);

    return {
      ok: true,
      code: BV_CODES.RECEIPT_INGESTED_OK,
      receiptId: receipt.receiptId,
      receiptKind: val.receiptKind,
      workflowId: wfId,
      fundacionDelta: 0
    };
  }

  /**
   * Aggregate execution metrics for a given workflow.
   * @param {string} workflowId
   * @returns {{ ok: boolean, code: string, metrics?: object, reason?: string }}
   */
  function getWorkflowMetrics(workflowId) {
    const cleanId = String(workflowId).trim();
    const spans = spansByWorkflow.get(cleanId) || [];
    const receipts = receiptsByWorkflow.get(cleanId) || [];

    if (spans.length === 0 && receipts.length === 0) {
      return {
        ok: false,
        code: BV_CODES.UNKNOWN_WORKFLOW_DENY,
        reason: `no telemetry or receipts found for workflow '${cleanId}'`
      };
    }

    let totalDurationMs = 0;
    let errorCount = 0;
    const phaseCounts = {};

    for (const s of spans) {
      totalDurationMs += s.durationMs;
      if (s.status !== 'OK' && s.status !== 'SUCCESS') {
        errorCount++;
      }
      phaseCounts[s.phase] = (phaseCounts[s.phase] || 0) + 1;
    }

    const avgDurationMs = spans.length > 0 ? totalDurationMs / spans.length : 0;

    return {
      ok: true,
      code: BV_CODES.METRICS_GET_OK,
      metrics: {
        workflowId: cleanId,
        totalSpans: spans.length,
        totalReceipts: receipts.length,
        totalDurationMs,
        avgDurationMs,
        errorCount,
        phases: Object.freeze(phaseCounts)
      }
    };
  }

  /**
   * Compile and seal a sovereign audit summary for a workflow.
   * Emits a canonical BV-RCPT-* receipt.
   * @param {string} workflowId
   * @param {object} [auditOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, auditSummary?: object, receipt: object, fundacionDelta: 0 }}
   */
  function compileAuditSummary(workflowId, auditOpts = {}) {
    const timestamp = String(nowFn());
    const cleanId = String(workflowId).trim();
    const spans = spansByWorkflow.get(cleanId) || [];
    const receipts = receiptsByWorkflow.get(cleanId) || [];

    if (spans.length === 0 && receipts.length === 0) {
      const receipt = buildWorkflowTelemetryReceipt(
        {
          workflowId: cleanId,
          spanCount: 0,
          receiptCount: 0,
          auditDigest: null,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BV_CODES.UNKNOWN_WORKFLOW_DENY,
        reason: `cannot compile audit summary: workflow '${cleanId}' not found`,
        receipt,
        fundacionDelta: 0
      };
    }

    const metricsRes = getWorkflowMetrics(cleanId);
    const metrics = metricsRes.metrics;

    const auditManifest = {
      workflowId: cleanId,
      metrics,
      spanIds: spans.map((s) => s.spanId),
      receiptIds: receipts.map((r) => r.receiptId)
    };

    const auditDigest = hashFn(auditManifest);

    const receipt = buildWorkflowTelemetryReceipt(
      {
        workflowId: cleanId,
        spanCount: spans.length,
        receiptCount: receipts.length,
        auditDigest,
        status: BV_CODES.AUDIT_SEALED,
        timestamp,
        consensusSignature: auditOpts.consensusSignature || null,
        prevReceiptHash: lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );

    lastReceiptHash = receipt.receiptHash;

    const summaryRecord = {
      workflowId: cleanId,
      manifest: auditManifest,
      auditDigest,
      receipt,
      sealedAt: timestamp
    };

    auditSummaries.set(cleanId, summaryRecord);

    return {
      ok: true,
      allow: true,
      code: BV_CODES.AUDIT_SEAL_OK,
      auditSummary: {
        workflowId: cleanId,
        metrics,
        auditDigest,
        receipt
      },
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Verify an audit summary seal or receipt for tamper detection.
   * @param {object} auditSummaryOrReceipt
   * @param {(payload: unknown) => string} [customHash]
   * @returns {{ ok: boolean, reason?: string }}
   */
  function verifyAuditSeal(auditSummaryOrReceipt, customHash = hashFn) {
    if (!auditSummaryOrReceipt || typeof auditSummaryOrReceipt !== 'object') {
      return { ok: false, reason: 'audit target is null or not an object' };
    }

    const receipt = auditSummaryOrReceipt.receipt || auditSummaryOrReceipt;
    return verifyWorkflowTelemetryReceipt(receipt, customHash);
  }

  /**
   * Verify an execution telemetry trail of receipts for cryptographic integrity.
   * @param {Array<object>} receiptsToVerify
   * @param {(payload: unknown) => string} [customHash]
   * @returns {{ ok: boolean, code: string, verifiedCount: number, error?: string }}
   */
  function verifyTelemetryTrail(receiptsToVerify, customHash = hashFn) {
    if (!Array.isArray(receiptsToVerify) || receiptsToVerify.length === 0) {
      return {
        ok: false,
        code: BV_CODES.TRAIL_BREAK,
        verifiedCount: 0,
        error: 'receipts list is empty or not an array'
      };
    }

    let prevHash = null;
    let verifiedCount = 0;

    for (let i = 0; i < receiptsToVerify.length; i++) {
      const r = receiptsToVerify[i];
      const check = verifyWorkflowTelemetryReceipt(r, customHash);
      if (!check.ok) {
        return {
          ok: false,
          code: BV_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `receipt at index ${i} failed hash check: ${check.reason}`
        };
      }

      if (i > 0 && r.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          code: BV_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `chain break at index ${i}: prevReceiptHash '${r.prevReceiptHash}' does not match previous receiptHash '${prevHash}'`
        };
      }

      prevHash = r.receiptHash;
      verifiedCount++;
    }

    return {
      ok: true,
      code: BV_CODES.TRAIL_OK,
      verifiedCount
    };
  }

  /**
   * Reset internal state (for testing).
   */
  function _resetForTests() {
    spansByWorkflow.clear();
    receiptsByWorkflow.clear();
    auditSummaries.clear();
    lastReceiptHash = null;
    _resetReceiptSeqForTests();
  }

  return Object.freeze({
    kind: BV_KIND,
    productionReady: BV_PRODUCTION_READY,
    recordSpan,
    ingestReceipt,
    getWorkflowMetrics,
    compileAuditSummary,
    verifyAuditSeal,
    verifyTelemetryTrail,
    _resetForTests
  });
}
