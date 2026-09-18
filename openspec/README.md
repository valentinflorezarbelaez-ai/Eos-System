# OpenSpec

This directory is the OpenSpec store for Spec-Driven Development (SDD) changes in the EOS Control Plane.

## Layout

- `config.yaml` — canonical OpenSpec configuration: project context, phase rules (proposal/spec/design/tasks), and operation guidance (apply/archive). Source of truth for this store; do not edit without justification.
- `specs/` — main/consolidated specs (opted-in from archived or synced deltas).
- `changes/` — active (non-archived) OpenSpec change envelopes (`proposal.md`, `specs/`, `design.md`, `tasks.md`).
- `changes/archive/` — archived (folded) change envelopes.

## Workflow

- SDD cycle SSOT: `docs/harness/SPECBOOT_CYCLE.md`
- OpenSpec runbook: `docs/manuals/OPENSPEC_RUNTIME.md`
- Mandatory verification steps: `docs/openspec-tasks-mandatory-steps.md`
- Discipline bridge (organic routing, strict TDD, RDD informational): `docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`

## Rules

- Strict TDD evidence is required for `/apply`; the builder must not self-certify (`/verify` is a separate pass).
- Spec scenarios prefer Given/When/Then (BDD) syntax.
- New OpenSpec changes live here; historical specs remain in `docs/specs/`.