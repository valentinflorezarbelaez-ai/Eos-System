# ADR-0124 — Ladder 36 Maturity Gap Audit

- **Status:** Proposed — local governed (Ladder 36 Audit; docs-only)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric)
- **Spec:** LADDER-36-MATURITY-AUDIT (satellites SPEC-0146–0150 proposed)
- **Prior ADRs:** ADR-0118 (Ladder 35 Audit), ADR-0123 (Mission EI Ladder 35 Seam-Pack Closeout)

## Context

Ladder 35 is formally **CLOSED_FOR_LOCAL_GOVERNED_USE** (Audit + EE+EF+EG+EH+EI MEASURED + seam-pack + closeout; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric) via tip-seal #486 + tip-refresh #487 (freeze pin `0903b037`). Ladders 17 through 35 remain CLOSED — **NEVER reopen**. **NEVER reopen L30–L35.** **NEVER reopen L35.**

Following the closure of Ladder 35, residual engineering gaps remain on top of the closed domain-event messaging fabric (L33), the process-manager / CQRS / dead-letter / compatibility fabric (L34), and the temporal deadline / schedule wake / timeout compensation / honesty attestation fabric (L35):

1. **Admission control / work-intake quotas**: Mission DX seals circuit-breaker trip/fallback receipts (`DX-RCPT-*`) but is failure-threshold oriented (CLOSED → OPEN → HALF_OPEN). There is **no** Layer-0 admission, intake-quota, or capacity-gate surface under `src/core/composition/` (confirmed: zero `backpressure` / `admission` / `load-shed` / `bulkhead` matches in composition). Long-running processes and messaging can advance without a fail-closed intake bound.
2. **Backpressure / load-shed governance**: L33 outbox/idempotent consumer + L34 saga + L35 schedule wake can enqueue and wake work without a governed shed/backpressure port. Sparse non-composition mentions (MCP buffer comment; ontological-dashboard decorative `backpressureActive`) are **not** a receipted Layer-0 backpressure gate.
3. **Resource isolation / bulkhead boundaries beyond DX**: Hexagonal / sandbox isolation (BA family) protects developer-engine boundaries; DX protects fault trips. Neither provides capacity bulkheads that isolate noisy neighbors across process/message/temporal intakes.
4. **Capacity honesty / admission attestation beyond soft-observe**: Admission and shed claims must be attested with verifiable receipts; soft-observe of freeze pins alone is not a capacity truth source.
5. **Seam-pack consolidation**: A unified CI seam-pack must verify the end-to-end chaining of EJ ➔ EK ➔ EL ➔ EM.

Schemas remain strictly **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This audit does **not** tip-open Ladder 36, tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Open a **docs-only** Ladder 36 Maturity Gap Audit that declares central axis **Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric**.
2. Order proposed satellites **EJ → EK → EL → EM → EN** as SPEC-0146…0150:
   - **Mission EJ (SPEC-0146)**: Sovereign Admission Control & Work-Intake Quotas Port (`EJ-RCPT-*`).
   - **Mission EK (SPEC-0147)**: Backpressure & Load-Shed Governance Port (`EK-RCPT-*`).
   - **Mission EL (SPEC-0148)**: Resource Isolation / Bulkhead Boundary Port (`EL-RCPT-*`).
   - **Mission EM (SPEC-0149)**: Capacity Honesty & Admission Attestation Port (`EM-RCPT-*`) — no new schema JSON.
   - **Mission EN (SPEC-0150)**: Ladder 36 CI Seam-Pack Consolidation & Closeout (`EN-RCPT-*`).
3. Keep ADR-0124 as the audit decision record; do **not** implement Mission EJ (nor EK–EN) in this change. Tip-open of Ladder 36 is **SEPARATE**.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, `FUNDACION_ALWAYS_DENY`, audit ≠ GHE enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, never reopen L17–L35 (especially NEVER reopen L30–L35), schemas AT_CEILING held, freeze pin `0903b037` not rewritten.

### Chosen Axis Rationale

After L35 closed the temporal deadline/TTL → schedule wake → timeout compensation → temporal honesty → seam-pack chain on top of L33 messaging + L34 orchestration, the clearest **measured** residual Layer-0 gap is capacity governance: Mission DX seals breaker trips but exposes no admission/quota/backpressure/bulkhead surface (confirmed by inspection of `circuit-breaker-port.js` — failureThreshold/cooldown only; zero composition matches for backpressure/admission/load-shed/bulkhead; `process-manager-saga-port.js`, `transactional-outbox-port.js`, and `idempotent-message-consumer-port.js` likewise lack intake capacity paths). Long-running and deferred work therefore lack fail-closed intake bounds, governed load-shed, bulkhead isolation, and capacity attestation beyond soft-observe. The next local-governed ladder proposes those five satellites in that order. This package is the docs-only audit; implementation and tip-open are separate.

### Rejected Alternative Axes (evaluated, not chosen)

| Alternative residual theme | Why REJECTED as L36 axis |
| :--- | :--- |
| Snapshot / checkpoint / recovery governance for long-running processes | Already MEASURED (Mission AT custody snapshot + crash-recovery; Mission BT workflow checkpoint FSM). Residual deepen is not the clearest new Layer-0 axis on closed L33–L35. |
| Configuration / feature-flag / policy-pack governance receipts | Real gap (no feature-flag / policy-pack composition port), but less tightly coupled to the closed messaging → orchestration → temporal chain than admission/backpressure on intake. Defer; not strongest measured residual. |
| Supply-chain / artifact attestation beyond prior merkle | Already MEASURED (artifact attestation + merkle ledger notarization + L26 CN release-integrity path). Not a fresh Layer-0 residual after L35. |
| Multi-tenant / workspace isolation boundaries | Repeatedly REJECTED (ADR-0055, ADR-0068); BA sandbox isolation already MEASURED; multi-tenant policy inheritance remains a later ops axis. |
| Forensic replay / audit-trail aggregation beyond prior telemetry | Partial coverage already exists (control-plane observability aggregation; autonomy-replay-forensic-observer; verification-replay golden receipts). Not clearest residual vs zero composition admission/backpressure. |

## Alternatives Considered AND REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: audit seals local governed proposal only.
- Reopening Ladder 35 (or L30–L34) — REJECTED: L30–L35 are CLOSED — **NEVER reopen L30–L35**.
- Tip-opening Ladder 36, tip-refresh, tip-seal, or rewriting freeze `main_tip` in this package — REJECTED: tip-open is SEPARATE.
- Implementing satellites EJ–EN directly in this audit package — REJECTED: audit is strictly docs-only.
- Adding new schemas JSON files — REJECTED: schemas locked AT_CEILING 35/35.
- External project write access — REJECTED: `FUNDACION_ALWAYS_DENY` (Δ=0).
- Choosing Snapshot/checkpoint, Config/feature-flag, Supply-chain/attestation, Multi-tenant, or Forensic-replay as the L36 central axis — REJECTED: see Rejected Alternative Axes table (admission/backpressure has clearest measured residual beyond DX).

## Consequences

- Positive: Clear, formal, ordered roadmap for Ladder 36 advancing admission quotas, backpressure/load-shed, bulkhead isolation, and capacity attestation on the closed L33 messaging + L34 orchestration + L35 temporal fabric.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), Ladders 17–35 CLOSED, freeze pin `0903b037` not rewritten.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_36_AUDIT_2026-09-25.md`
- OpenSpec: `openspec/changes/eos-ladder-36-maturity-gap-audit/`
- Prior: ADR-0123 (Mission EI Closeout), ADR-0118 (Ladder 35 Audit)
