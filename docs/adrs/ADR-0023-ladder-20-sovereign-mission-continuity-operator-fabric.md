# ADR-0023 — Ladder 20: Sovereign Mission Continuity & Operator Fabric

**Status:** Accepted  
**Date:** 2026-09-14  
**Deciders:** Product Owner (Valentín Flórez Arbeláez)  
**Relates:** ADR-0022 (L19 Closeout), ADR-0013 (Write Barrier), ADR-0018 (BC Governed Apply), ADR-0019 (BD Multi-Target), ADR-0020 (BE Verification Replay), ADR-0021 (BF RC Packaging), Constitution / Law IV / Law VI

## Context

Ladder 19 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (BC+BD+BE+BF+BG MEASURED + seam-pack + closeout; Sovereign Delivery & Verification Fabric axis). Ladder 18 is CLOSED (AX–BB; Sovereign Developer Engine). Ladder 17 is CLOSED (AS–AW; Sovereign Operator Continuity & Cross-Plane Composition). None of these ladders will be reopened.

The **L19 ceiling** reveals that while EOS has delivery & verification fabric, developer engine, and operator continuity building blocks, it lacks:

1. **Formal mission lifecycle state machine** — missions transition through PROPOSED→OPEN→MEASURED→CLOSED states implicitly via doc fields and audit prose, not via a typed runtime port with sealed transition receipts and DENY on invalid transitions.
2. **Cross-session continuity & replay fabric** — AT crash-recovery, AI multi-session coordinator, W session-coordinator, and AL replay observer exist individually as MEASURED ports, but there is no typed fabric that composes them for deterministic session handoff and context replay across long-running missions.
3. **Operator dashboard / HUD fabric** — freeze-gate, maturity-matrix, ladder/satellite/evidence surfaces exist as individual MEASURED surfaces, but there is no typed HUD fabric composing them into a consolidated operator view.
4. **Governed external write orchestrator** — T-gate 6-precondition barrier, BC governed-apply, and BD multi-target delivery exist as individual MEASURED ports, but there is no typed orchestrator that chains the full pipeline (validate→write→receipt→rollback) for external project targets.

## Decision

Open Ladder 20 with axis **Sovereign Mission Continuity & Operator Fabric** and five proposed satellites:

| ID | SPEC | Satellite |
| --- | --- | --- |
| BH | 0065 | Mission Lifecycle State Machine |
| BI | 0066 | Cross-Session Continuity & Replay Fabric |
| BJ | 0067 | Operator Dashboard / HUD Fabric |
| BK | 0068 | Governed External Write Orchestrator |
| BL | 0069 | L20 CI Seam-Pack & Closeout |

Each satellite composes/extends existing MEASURED building blocks (compose, don't rewrite doctrine). All remain fail-closed, evidence-custody, Fundacion Δ=0, PRODUCTION_READY=NO, CloudAgent out, Law VI held.

## Consequences

- L20 audit is docs-only; zero implementation of BH–BL in the audit branch.
- Mission BH is the first proposed implementation target (mission lifecycle state machine).
- L17, L18, L19 remain CLOSED — never reopen.
- PRODUCTION_READY stays NO; Fundacion Δ=0 stays intact.
- Each satellite must go through SpecBoot (OpenSpec envelope → propose → apply → verify) before any implementation code.

## Alternatives Considered

### Alternative A: Skip lifecycle formalization, go directly to external write orchestrator
- **Rejected:** BK (governed external write orchestrator) composes T-gate + BC + BD, which is well-defined. But without BH (mission lifecycle state machine), mission state transitions remain implicit in docs — the orchestrator would lack formal lifecycle receipts for the missions it orchestrates. BH is foundational.

### Alternative B: Merge HUD fabric into lifecycle state machine (single satellite)
- **Rejected:** HUD fabric (BJ) composes freeze/matrix/evidence surfaces; lifecycle state machine (BH) formalizes mission state transitions. These are orthogonal concerns: one is state management, the other is surface composition. Merging violates SRP and creates a satellite too large for hermetic testing. Keep separate per Ponytail Tier 3.

### Alternative C: Defer L20, focus on PRODUCTION_READY flip
- **Rejected:** PRODUCTION_READY=YES is explicitly a non-goal under current governance. The control plane needs mission continuity and operator fabric infrastructure before any production readiness assessment could be meaningful. Premature PRODUCTION_READY flip would violate the evidence-over-claims doctrine (Law III).

## NON-CLAIM

- L20 audit ≠ implementation of BH–BL
- Mission Lifecycle State Machine ≠ full PM SaaS / ≠ Jira replacement
- Cross-Session Continuity ≠ HA multi-region SaaS / ≠ distributed clustering
- Operator HUD ≠ full observability SaaS / ≠ Grafana/Datadog replacement
- Governed External Write ≠ unsupervised fleet deploy / ≠ K8s CD
- L20 seam-pack ≠ GH Team/Enterprise enforcement
- PRODUCTION_READY stays NO
- Fundacion Δ=0 intact
- CloudAgent out (Antigravity-first)
- Never reopen L17, L18, or L19
