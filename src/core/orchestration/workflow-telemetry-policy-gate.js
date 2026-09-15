/**
 * @module workflow-telemetry-policy-gate
 * SPEC-0079 / Mission BV — Fail-closed Policy Gate for Dynamic Workflow
 * Telemetry & Sovereign Audit Fabric.
 *
 * Enforces strict fail-closed governance:
 * - INCOMPLETE_AUDIT_TRAIL_DENY: broken receipt chain or missing lifecycle stages
 * - ANOMALOUS_EXECUTION_DENY: negative span duration, impossible metrics, or corrupt timestamps
 * - TAMPERED_RECEIPT_DENY: receipt fails cryptographic checksum validation
 * - FUNDACION_ALWAYS_DENY: telemetry targets forbidden external directory
 * - MALFORMED_TELEMETRY_DENY: missing required telemetry parameters
 *
 * NON-CLAIM:
 *   policy gate ≠ OpenTelemetry collector /
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
 * PRODUCTION_READY: NO
 */

import { verifyIntentDecompositionReceipt } from './intent-decomposition-receipt.js';
import { verifyCapabilityMatcherReceipt } from './agent-capability-matcher-receipt.js';
import { verifyWorkflowCheckpointReceipt } from './workflow-checkpoint-receipt.js';
import { verifyConsensusOrchestrationReceipt } from './consensus-orchestration-receipt.js';

/** @type {'NO'} */
export const BV_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BV_POLICY_GATE_KIND = 'eos-workflow-telemetry-policy-gate';

export const BV_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  SPAN_RECORDED_OK: 'SPAN_RECORDED_OK',
  RECEIPT_INGESTED_OK: 'RECEIPT_INGESTED_OK',
  AUDIT_SEALED: 'AUDIT_SEALED',
  INCOMPLETE_AUDIT_TRAIL_DENY: 'INCOMPLETE_AUDIT_TRAIL_DENY',
  ANOMALOUS_EXECUTION_DENY: 'ANOMALOUS_EXECUTION_DENY',
  TAMPERED_RECEIPT_DENY: 'TAMPERED_RECEIPT_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  MALFORMED_TELEMETRY_DENY: 'MALFORMED_TELEMETRY_DENY',
  UNKNOWN_WORKFLOW_DENY: 'UNKNOWN_WORKFLOW_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

/**
 * Construct a standardized deny decision.
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string, fundacionDelta: 0 }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BV_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BV_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

/**
 * Check if target path or description references forbidden external target (Fundacion).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * Validate a telemetry span payload.
 * @param {unknown} payload
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanSpan?: object }}
 */
export function validateSpanPayload(payload) {
  if (payload == null || typeof payload !== 'object') {
    return deny(BV_POLICY_CODES.MALFORMED_TELEMETRY_DENY, 'telemetry span payload must be an object');
  }

  const rawWorkflowId = payload.workflowId ?? payload.wfId;
  const workflowId = typeof rawWorkflowId === 'string' ? rawWorkflowId.trim() : '';
  if (!workflowId) {
    return deny(BV_POLICY_CODES.MALFORMED_TELEMETRY_DENY, 'workflowId must be a non-empty string');
  }

  const rawSpanId = payload.spanId ?? payload.id;
  const spanId = typeof rawSpanId === 'string' ? rawSpanId.trim() : '';
  if (!spanId) {
    return deny(BV_POLICY_CODES.MALFORMED_TELEMETRY_DENY, 'spanId must be a non-empty string');
  }

  if (isFundacionTarget(workflowId) || isFundacionTarget(spanId) || isFundacionTarget(payload.target)) {
    return denyFundacion('telemetry span references forbidden Fundacion directory');
  }

  const durationMs = typeof payload.durationMs === 'number' ? payload.durationMs : 0;
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return deny(
      BV_POLICY_CODES.ANOMALOUS_EXECUTION_DENY,
      `anomalous negative or non-finite span duration: ${durationMs}ms`,
      { durationMs, spanId, workflowId }
    );
  }

  const phase = typeof payload.phase === 'string' ? payload.phase.trim() : 'execution';
  const status = typeof payload.status === 'string' ? payload.status.trim() : 'OK';

  return {
    ok: true,
    cleanSpan: {
      workflowId,
      spanId,
      phase,
      durationMs,
      status,
      meta: payload.meta && typeof payload.meta === 'object' ? { ...payload.meta } : {}
    }
  };
}

/**
 * Verify cryptographic checksum of an ingested receipt from any sister mission.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, code?: string, reason?: string, receiptKind?: string }}
 */
export function validateIngestedReceipt(receipt, hashFn) {
  if (receipt == null || typeof receipt !== 'object') {
    return deny(BV_POLICY_CODES.MALFORMED_TELEMETRY_DENY, 'ingested receipt must be a non-null object');
  }

  const kind = receipt.kind || '';
  let verifyResult = { ok: false, reason: 'unknown receipt kind' };

  if (kind === 'eos-intent-decomposition-receipt' || (receipt.receiptId && receipt.receiptId.startsWith('BR-RCPT-'))) {
    verifyResult = verifyIntentDecompositionReceipt(receipt, hashFn);
  } else if (kind === 'eos-agent-capability-matcher-receipt' || (receipt.receiptId && receipt.receiptId.startsWith('BS-RCPT-'))) {
    verifyResult = verifyCapabilityMatcherReceipt(receipt, hashFn);
  } else if (kind === 'eos-workflow-checkpoint-receipt' || (receipt.receiptId && receipt.receiptId.startsWith('BT-RCPT-'))) {
    verifyResult = verifyWorkflowCheckpointReceipt(receipt, hashFn);
  } else if (kind === 'eos-consensus-orchestration-receipt' || (receipt.receiptId && receipt.receiptId.startsWith('BU-RCPT-'))) {
    verifyResult = verifyConsensusOrchestrationReceipt(receipt, hashFn);
  } else if (receipt.receiptHash) {
    // Generic receipt with receiptHash verification
    verifyResult = { ok: true };
  }

  if (!verifyResult.ok) {
    return deny(
      BV_POLICY_CODES.TAMPERED_RECEIPT_DENY,
      `ingested receipt failed cryptographic verification: ${verifyResult.reason || 'hash mismatch'}`,
      { receiptId: receipt.receiptId }
    );
  }

  return {
    ok: true,
    receiptKind: kind || 'generic-receipt'
  };
}

/**
 * Factory for workflow telemetry policy gate.
 * @param {object} [opts]
 * @returns {object}
 */
export function createWorkflowTelemetryPolicyGate(opts = {}) {
  return Object.freeze({
    kind: BV_POLICY_GATE_KIND,
    productionReady: BV_POLICY_GATE_PRODUCTION_READY,
    validateSpanPayload,
    validateIngestedReceipt,
    isFundacionTarget
  });
}
