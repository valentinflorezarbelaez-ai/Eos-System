# ADR-0035 — Ladder 22: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric

**Status:** Accepted  
**Date:** 2026-09-14  
**Deciders:** Product Owner (Valentín Flórez Arbeláez)  
**Relates:** ADR-0034 (L21 Closeout / BQ), ADR-0029 (L21 Audit), ADR-0030–0033 (BM–BP), ADR-0028 (L20 Closeout / BL), ADR-0013 (Write Barrier), Constitution / Law IV / Law VI

## Context

Ladder 21 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (BM+BN+BO+BP+BQ MEASURED + seam-pack + closeout; Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric axis). Ladder 20 is CLOSED (BH–BL; Sovereign Mission Continuity & Operator Fabric). Ladder 19 is CLOSED (BC–BG; Sovereign Delivery & Verification Fabric). Ladder 18 is CLOSED (AX–BB; Sovereign Developer Engine). Ladder 17 is CLOSED (AS–AW; Sovereign Operator Continuity & Cross-Plane Composition). None of these ladders will ever be reopened.

The **L21 ceiling** reveals that while EOS possesses agent identity attestation, continuous sentinel heartbeat, multi-agent two-key consensus, forensic telemetry aggregation, and mission continuity, it lacks:

1. **Sovereign intent parser & atomic task DAG decomposer** — operator commands, natural-language intents, and structured objectives must be deterministically parsed into an acyclic directed graph (DAG) of atomic, verifiable tasks with sealed parser receipts (`BR-RCPT-*`).
2. **Dynamic agent capability matcher & governed dispatcher** — once a task DAG is formed, tasks must be deterministically matched against attested agent capability profiles (composing BM identity attestation) and dispatched with fail-closed access-control and sealed dispatch receipts (`BS-RCPT-*`).
3. **Task DAG execution engine & state checkpoint notary** — executing non-trivial multi-agent task graphs requires cryptographic checkpointing, state serialization, deterministic progress tracking, and sealed execution receipts (`BT-RCPT-*`) without relying on distributed cloud workers.
4. **Fail-closed escalation & HITL remediation bridge** — when task execution fails, diverges, or encounters an integrity violation, the workflow must fail-closed, pause progress, notify the operator via a structured remediation channel, and seal escalation receipts (`BU-RCPT-*`) rather than looping indefinitely or silently hallucinating progress.

## Decision

Open Ladder 22 with axis **Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric** and five proposed satellites:

| ID | SPEC | Satellite |
| :--- | :--- | :--- |
| **BR** | 0075 | Sovereign Intent Parser & Atomic Task DAG Decomposer Port |
| **BS** | 0076 | Dynamic Agent Capability Matcher & Governed Dispatcher Port |
| **BT** | 0077 | Task DAG Execution Engine & State Checkpoint Notary |
| **BU** | 0078 | Fail-Closed Escalation & HITL Remediation Bridge |
| **BV** | 0079 | Ladder 22 CI Seam-Pack Consolidation & Closeout |

Each satellite composes and extends existing MEASURED building blocks (compose, don't rewrite doctrine). All remain fail-closed, evidence-custody, `Fundacion Δ=0`, `PRODUCTION_READY=NO`, CloudAgent out, Law VI held.

## Consequences

- L22 audit is docs-only; zero implementation of BR–BV in this audit branch.
- Mission BR is the first proposed implementation target (intent parser & atomic task DAG decomposer port).
- L17, L18, L19, L20, and L21 remain CLOSED — never reopen.
- `PRODUCTION_READY` stays `NO`; `Fundacion Δ=0` stays intact.
- Each satellite must go through SpecBoot (OpenSpec envelope → propose → apply → verify) before any implementation code.
- Tip probe honesty: HEAD/audit base `f1b7ed2ae56909403dc56094fd76f1ef4a17b864`; freeze `main_tip` may still pin L21 CLOSED seal `e1c54cc…` — do not rewrite freeze/matrix in this audit PR.

## Alternatives Considered

### Alternative A: Speculative prompt-only unstructured agent chat
- **Rejected:** Unstructured agent chat without formal intent parsing, explicit DAG decomposition, or cryptographic receipts violates the Law of Specification as Supreme Truth (Law I) and evidence-over-claims (Law III). EOS enforces deterministic, receipt-sealed DAG execution.

### Alternative B: Mutable uncheckpointed graph execution without crypto receipts
- **Rejected:** Executing multi-step workflows without state checkpointing and receipt seals would compromise auditability, prevent deterministic replay, and fail to satisfy forensic trail requirements established in Ladder 21.

### Alternative C: Autonomous unbounded self-healing loop without HITL escalation
- **Rejected:** Allowing agents to attempt autonomous recovery loops without human-in-the-loop (HITL) escalation gates and fail-closed bounds violates safety doctrines and risks token exhaustion or runaway state corruption.

## NON-CLAIM

- L22 audit ≠ implementation of BR–BV
- Intent Parser & Task DAG Decomposer ≠ general AGI planner / ≠ PRODUCTION_READY workflow product
- Agent Capability Matcher & Dispatcher ≠ Kubernetes scheduler / ≠ Celery cluster / ≠ PRODUCTION_READY orchestrator
- Task DAG Execution Engine & Checkpoint Notary ≠ Temporal / Airflow / Argo Workflows / ≠ PRODUCTION_READY distributed engine
- Fail-Closed Escalation & HITL Bridge ≠ PagerDuty / Opsgenie / enterprise incident response SaaS
- L22 seam-pack ≠ GH Team/Enterprise enforcement
- PRODUCTION_READY stays NO
- Fundacion Δ=0 intact
- CloudAgent out (Antigravity-first)
- Never reopen L17, L18, L19, L20, or L21
