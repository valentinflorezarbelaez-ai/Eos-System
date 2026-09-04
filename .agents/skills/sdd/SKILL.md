---
name: sdd
description: "Spec Driven Development workflow skill for EOS workspace."
---

# Spec Driven Development (SDD) Skill

## Purpose
Enforces specification-first engineering for non-trivial features, refactoring, and subsystem implementations.

**When to use this skill:** follow organic routing in `docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`. SDD is the default ceremony for substantial changes or when the human requests Specboot/OpenSpec. File/diff size alone does not force SDD. Trivial local fixes may go DIRECT.

**LIDR cycle (substantial changes):** `/enrich-us` → `/ff` or `/propose` → `/apply` → `/verify` → `/adversarial-review` → `/archive` → `/commit`.

`/verify` is independent of `/apply` (BUILDER ≠ VERIFIER). `/adversarial-review` is INFORMATIONAL (RDD) and does not authorize delivery. After `/apply`, update OpenSpec artifacts first; do not `/archive` a code-only tree. Prefer Given/When/Then. EARS is not a LIDR import. Optional LIDR skills are listed in `ai-specs/skills/` — do not bulk-copy them.

SSOT: `docs/base-standards.md`, `docs/backend-standards.md`. Agent/skill index: `ai-specs/`. New OpenSpec changes: `openspec/changes/`. Runbook: `docs/manuals/OPENSPEC_RUNTIME.md`. Slash docs: `.cursor/commands/`. Do not mutate `CONSTITUTION.md` without PO approval. Do not replace `node bin/eos.js` / `npm run eos:mission`.

## Workflow

1. **Specification Phase**:
   - Write or update spec in `docs/specs/<feature-name>.md`.
   - Define exact user goals, component boundaries, inputs, outputs, error conditions, and acceptance criteria.

2. **Design Phase**:
   - Define module interfaces, data models, and architecture.
   - Document any architectural decisions in `docs/architecture/adrs/`.

3. **Implementation Phase**:
   - Verify `IMPLEMENTATION_AUTHORIZED` status in `docs/projects/registrations/*.json` before creating or editing files in any target external project.
   - If target project is in `EOS Development Mode` or `INTAKE`/`SPECIFICATION` lifecycle status without explicit Product Owner sign-off, external `WRITE` operations are strictly **FORBIDDEN**.
   - Write clean, type-safe, minimal code fulfilling the spec once authorized.
   - Implement incremental tests parallel to implementation.

4. **Validation Phase**:
   - Execute test suite and automated checks.
   - Record verification status in `docs/evidence/`.

