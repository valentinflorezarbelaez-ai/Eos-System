# Design — Mission BV Dynamic Workflow Telemetry & Sovereign Audit Fabric (SPEC-0079)

## Overview

Layer-0 dynamic workflow telemetry and sovereign audit aggregation port located in `src/core/orchestration/`.
Collects execution spans, ingests cryptographic receipts from sister missions (BR, BS, BT, BU), aggregates execution metrics,
and seals the end-to-end audit manifest under cryptographic custody (`BV-RCPT-*`).
Closes Ladder 22 (*Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric*).

## Components

1. **Receipt (`workflow-telemetry-receipt.js`)**:
   Nine-field SHA-256 seal:
   `{ receiptId, workflowId, spanCount, receiptCount, auditDigest, status, timestamp, consensusSignature, prevReceiptHash }` → `BV-RCPT-*`
2. **Policy Gate (`workflow-telemetry-policy-gate.js`)**:
   Fail-closed checks:
   - `INCOMPLETE_AUDIT_TRAIL_DENY`: Attempting to seal an audit summary with broken chain or missing elements.
   - `ANOMALOUS_EXECUTION_DENY`: Invalid span duration (< 0), corrupted timestamp, or count mismatch.
   - `TAMPERED_RECEIPT_DENY`: Receipt failing SHA-256 integrity verification upon ingestion.
   - `FUNDACION_ALWAYS_DENY`: Workflow context or target references forbidden Fundacion path.
   - `MALFORMED_TELEMETRY_DENY`: Missing workflow ID, span ID, or required telemetry fields.
3. **Port Facade (`dynamic-workflow-telemetry-port.js`)**:
   `createWorkflowTelemetryPort({ now, hash, policyGate })`
   - `recordSpan({ workflowId, spanId, phase, durationMs, status, meta })`
   - `ingestReceipt(receipt)`: Ingests verified sister-mission receipts (BR, BS, BT, BU).
   - `compileAuditSummary(workflowId, opts)`: Aggregates metrics, hashes audit record, seals `BV-RCPT-*`.
   - `verifyAuditSeal(auditSummaryOrReceipt)`: Verifies cryptographic integrity of the sealed audit manifest.
   - `getWorkflowMetrics(workflowId)`: Inspects active telemetry statistics.

## Constraints

- `PRODUCTION_READY=NO`; `Fundacion Δ=0`; Antigravity-first; Law VI clean.
- Pure Node.js standard primitives (`node:crypto` only).
- Hermetic test execution.

## NON-CLAIM

≠ OpenTelemetry collector · ≠ Prometheus/Datadog APM · ≠ PRODUCTION_READY cloud monitoring product
