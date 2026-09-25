# Proposal — Ladder 36 Maturity Gap Audit

## 1. Problem Statement

Following the successful closure of Ladder 35 (tip-seal #486 + tip-refresh #487; freeze pin `0903b037`), the EOS control plane still lacks a formal local-governed charter for admission control / work-intake quotas, backpressure / load-shed governance, resource isolation / bulkhead boundaries beyond DX circuit-breaker trips, and capacity honesty / admission attestation beyond soft-observe.

Mission DX seals breaker trip/fallback receipts but is failure-threshold oriented only (`circuit-breaker-port.js` inspection). `src/core/composition/` has zero backpressure/admission/load-shed/bulkhead matches. That is the clearest measured residual Layer-0 gap on top of closed L33 messaging + L34 orchestration/CQRS/DLQ/compat + L35 temporal deadline/schedule/timeout/honesty.

## 2. Proposed Changes

- Conduct a docs-only Maturity Gap Audit chartering Ladder 36: Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric.
- Order satellites (implementation and tip-open are **not** in this change):
  - **Mission EJ (SPEC-0146 / ADR-0125)**: Sovereign Admission Control & Work-Intake Quotas Port (`EJ-RCPT-*`).
  - **Mission EK (SPEC-0147 / ADR-0126)**: Backpressure & Load-Shed Governance Port (`EK-RCPT-*`).
  - **Mission EL (SPEC-0148 / ADR-0127)**: Resource Isolation / Bulkhead Boundary Port (`EL-RCPT-*`).
  - **Mission EM (SPEC-0149 / ADR-0128)**: Capacity Honesty & Admission Attestation Port (`EM-RCPT-*`) — no new schema JSON.
  - **Mission EN (SPEC-0150 / ADR-0129)**: Ladder 36 CI Seam-Pack Consolidation & Closeout (`EN-RCPT-*`).

## 3. Rejected Alternative Axes

- Snapshot / checkpoint / recovery — REJECTED (already MEASURED AT+BT; not clearest residual on L35).
- Configuration / feature-flag / policy-pack — REJECTED (real gap; defer vs intake capacity).
- Supply-chain / artifact attestation beyond merkle — REJECTED (already MEASURED).
- Multi-tenant / workspace isolation — REJECTED (prior ADR-0055/0068; BA MEASURED).
- Forensic replay / audit-trail aggregation — REJECTED as full axis (partial coverage exists).

## 4. Invariants & Non-Claims

- `PRODUCTION_READY: NO`.
- `Fundacion Δ=0` (`FUNDACION_ALWAYS_DENY`).
- Law VI: zero plain secrets.
- Schemas strictly held at `AT_CEILING 35/35`.
- Ladders 17–35 permanently CLOSED (NEVER reopen L30–L35).
- Tip-open / tip-refresh / tip-seal / freeze `main_tip` rewrite: **NOT in this change** (tip-open SEPARATE; freeze pin `0903b037` observed only).
- Audit ≠ GHE. `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`.
