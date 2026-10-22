# Proposal — Ladder 42 Maturity Gap Audit (axis selection, docs-only)

**Status:** Proposed · pending PO ratification of ADR-0160.

## Why

Formal Ladder 41 is CLOSED (`CLOSED_FOR_LOCAL_GOVERNED_USE`, tip-seal-l41 / #586). L30–L40 remain CLOSED. With the ceiling at 41, the next ladder requires a maturity-gap audit before any satellite ordinal is consumed.

This change performs that audit and records a **proposed** axis with measured evidence. It is docs-only: no `src/`, no freeze/matrix mutation, no satellite ordinal, no schema JSON.

## Measured gap (main @ e0e72d56)

| Family | Modules | Reading |
| --- | ---: | --- |
| `budget` · `attestation` · `cost` | 60 · 47 · 42 | covered |
| `observability` · `slo` | 34 · 14 | partial |
| `quota` | 11 | partial (not per-agent) |
| `sbom` | 4 | minimal |
| `agent-lifecycle` · `rehearsal` · `sandbox-ephemeral` | **0** | **not covered** |
| `token-quota` · `evaluation-threshold` · `hitl-threshold` | **0** | **not covered** |
| `chargeback` · `marginal-cost` | **0** | **not covered** |

## Proposed axis

**Axis A — Agent Lifecycle, Identity & Rehearsal Governance.** Chosen because it is the only zero-coverage family that is a *precondition* for the others: quotas and evaluation thresholds need an identified, attested subject to attribute consumption to.

**Axis B — Budget, Quota & Evaluation Threshold Governance** is DEFERRED, not rejected: it is the natural successor once A provides the identity substrate.

## Non-goals

- Opening L42 formally; ordering satellites; consuming SPEC-0176 / ADR-0161
- Any runtime code, schema JSON, freeze/matrix edit, or pin movement
- Reopening L41 or L30–L40

## Non-claims

Audit ≠ L42 OPEN ≠ satellite MEASURED ≠ PRODUCTION_READY ≠ GHE. `PRODUCTION_READY=NO`; Fundacion Δ=0; schemas AT_CEILING 35/35.
