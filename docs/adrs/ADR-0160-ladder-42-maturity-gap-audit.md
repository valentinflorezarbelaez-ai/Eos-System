# ADR-0160 — Ladder 42 Maturity Gap Audit (Axis Selection)

- **Status:** Proposed — pending Product Owner ratification
- **Date:** 2026-10-22 (America/Bogota)
- **Deciders:** Product Owner (ratification) · proposed by agent under Ley III evidence-first discipline
- **Prior ADRs:** ADR-0159 (Mission FM / L41 closeout), ADR-0154 (Ladder 41 maturity gap audit)
- **Spec:** none yet (audit only; satellites to be ordered after ratification)

## Context

Formal Ladder 41 is **CLOSED** (`CLOSED_FOR_LOCAL_GOVERNED_USE`, tip-seal-l41 / #586). Formal L30–L40 remain **CLOSED** — NEVER reopen. The ladder ceiling is now 41, so the next ladder requires a fresh maturity-gap audit before any SPEC/ADR satellite ordinal is consumed.

Next free ordinals: **SPEC-0176** / **ADR-0160**.

## Evidence (measured 2026-10-22, main @ e0e72d56)

```
src/core/composition/   68 ports · 69 receipts · 11 seam packs
docs/schemas/           32 schema JSON  (AT_CEILING 35/35 → 3 slots of headroom)
docs/adrs/              142 ADRs
```

Module mentions (`grep -ril <family> src/core --include='*.js'`):

| Family | Modules | Reading |
| --- | ---: | --- |
| `budget` | 60 | covered |
| `attestation` | 47 | covered (L38–L41) |
| `cost` | 42 | covered |
| `observability` | 34 | partial |
| `slo` | 14 | partial |
| `quota` | 11 | partial (generic, not per-agent) |
| `sbom` | 4 | minimal |
| `agent-lifecycle` | **0** | **not covered** |
| `rehearsal` | **0** | **not covered** |
| `sandbox-ephemeral` | **0** | **not covered** |
| `token-quota` / `tokenQuota` | **0** | **not covered** |
| `evaluation-threshold` | **0** | **not covered** |
| `hitl-threshold` | **0** | **not covered** |
| `chargeback` / `marginal-cost` | **0** | **not covered** |

## Decision (proposed)

Adopt **Axis A — Agent Lifecycle, Identity & Rehearsal Governance** as Ladder 42.

Rationale: it is the only measured zero-coverage family that is a **precondition** for the others. Quota and evaluation governance (Axis B) require an identified, cryptographically attested subject to attribute consumption to. Building B first would produce quotas without a titled subject.

## Alternatives Considered

- **Axis B — Budget, Quota & Evaluation Threshold Governance** — DEFERRED, not rejected: real zero-coverage gap, but depends on A's identity substrate. Ordered as the Ladder 42+1 candidate.
- **Supply-chain / SBOM attestation** — REJECTED: `sbom` 4 + attestation 47; already covered by merkle/artifact attestation.
- **Observability / SLO honesty** — REJECTED as axis: 34/14 mentions; partially covered by L29 + EH/EM/ER; not the sharpest residual.
- **Reopen L41 or L30–L40** — REJECTED absolutely: NEVER reopen.

## Consequences (if ratified)

- Positive: closes the sharpest measured gap and unblocks Axis B on sound footing.
- Invariants preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L41 CLOSED, schemas AT_CEILING 35/35.
- Non-claims: this audit ≠ L42 OPEN ≠ any satellite MEASURED ≠ PRODUCTION_READY. It consumes **no** satellite ordinal.

## Links

- Predecessor: ADR-0154 (Ladder 41 audit) · tip-seal-l41 (#586)
- OpenSpec: `openspec/changes/eos-ladder-42-maturity-gap-audit/`
