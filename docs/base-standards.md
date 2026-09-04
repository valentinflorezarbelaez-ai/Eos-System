# EOS base standards (SSOT index)

This file is the LIDR Specboot **base-standards** index for the EOS Control Plane. It does not invent new policy. It points at the documents that already govern the repo.

**Discipline bridge:** [`docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`](architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md)

## Authority order

1. `CONSTITUTION.md` and `docs/core/CONSTITUTION.md` (PO-owned; do not mutate without PO approval)
2. Architecture Decision Records in `docs/architecture/adrs/`
3. This index and the layer standards it cites
4. Specifications (`docs/specs/`, later `openspec/`)
5. Implementation and evidence

## Language

| Artifact | Language |
| --- | --- |
| Code, comments, commits, ADRs, specs, evidence | Professional English |
| Operator UI and human comms | User language (Spanish is allowed; LIDR English-only operator policy is a NON-goal) |

## Engineering defaults

- **Preserve before modify.** Inspect callers, tests, and contracts first.
- **Organic routing.** Smallest honest route. SDD for substantial changes or when the human requests it. File/diff size alone does not force SDD. See ADR-0010.
- **TDD when tests exist or behavior is added:** RED → GREEN → TRIANGULATE → REFACTOR with command-output evidence.
- **L0 purity:** `DEPENDENCY_POLICY_L0.md` — `NODE_BUILTINS_ONLY`. No root `dependencies` / `devDependencies`.
- **Evidence over claims.** `CLAIM → SOURCE → VERIFIED? → DISPLAYABLE?`
- **BUILDER ≠ VERIFIER.** Independent review is informational (RDD). Delivery stays human / HITL / write-barrier.
- **Spec syntax:** prefer Given/When/Then (BDD). EARS is an EOS/local IEEE-inspired convention if used — not a LIDR Specboot import (ADR-0010).

## Layer standards

| Layer | Document |
| --- | --- |
| Backend / Control Plane | `docs/backend-standards.md` (if present) plus `.cursor/rules/03-eos-architecture.mdc` and `DEPENDENCY_POLICY_L0.md` |
| Frontend / UI | `.cursor/rules/07-eos-product-and-ux.mdc` (product locale; no theme-kit import) |
| Documentation | `.cursor/rules/09-eos-documentation.mdc` |
| Testing | `.cursor/rules/06-eos-testing-and-verification.mdc` |
| Security / authority | `.cursor/rules/04-eos-security-and-authority.mdc` |
| Agent protocol | `.agents/AGENTS.md`, `.cursorrules` |

## OpenSpec filenames

`proposal.md` → `spec.md` → `design.md` → `tasks.md`

## Frozen surfaces (never “just a refactor”)

- `Fundacion/` / `PRJ-FUNDACION` — `Δ = 0`
- `src/core/` product kernel — frozen unless the human names the exact change
- `GAP-002` — remains `UNKNOWN`
- `GATE-13` — `CANARY_RESTRICTED` until recorded otherwise
