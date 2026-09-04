# Proposal — FlowDesk lead pipeline snapshot

## Why

The Product Owner asked for a **canonical E2E OpenSpec + Strict TDD loop** on a lab/sandbox target. FlowDesk already has a lead pipeline (`NUEVO` → `CONTACTADO` → `CALIFICADO` → `GANADO` | `PERDIDO`) and list/filter APIs, but operators cannot get a **count-by-status snapshot** without loading every lead.

This change is the smallest honest new **public contract** that still requires SDD (new feature + explicit human SDD request). It is not a docs-only dry-run.

## What

Add `LeadService.countLeadsByStatus(userId)` in `EOS-Lab/FlowDesk` that returns a complete status → count map for that tenant only.

## Job to be done (`/enrich-us`)

- **User:** FlowDesk operator (tenant-scoped).
- **Job:** See how many leads sit in each pipeline stage before choosing who to call next.
- **Success signal:** One call returns five integer counts (all `LeadStatus` keys) that match the tenant's rows and ignore other users.
- **NO_BUILD?** No — the job exists and the current API cannot answer it without a full list scan in application code.

## Routing (ADR-0010)

**SDD** — not DIRECT.

Triggers (size ignored):

1. Explicit human request for the OpenSpec / Specboot ceremony (this mission).
2. New public contract on `LeadService`.
3. New behavior with an existing test suite → Strict TDD receipts required.

File/diff size MUST NOT be used as the routing reason.

Cite: `docs/base-standards.md`, `docs/backend-standards.md`, ADR-0010.

## NON-goals

- No `Fundacion/` writes (`Δ = 0`).
- No `src/core/` kernel mutation (use existing organic gate + TDD receipt modules).
- No new root `package.json` dependencies (L0 `NODE_BUILTINS_ONLY`).
- No new orchestrator / engine.
- No UI / theme / Gentle-AI / Engram import.
- Does not replace `node bin/eos.js` / `npm run eos:mission`.
- Official `@fission-ai/openspec` CLI is optional; missing PATH is `BLOCKED`, not faked `VERIFIED`.

## Approach

1. `/enrich-us` — this section (JTBD above).
2. `/ff` — this OpenSpec envelope under `openspec/changes/flowdesk-lead-pipeline-snapshot/`.
3. `/apply` — one task, RED → GREEN → TRIANGULATE with `createTddPhaseReceipt`.
4. `/verify` — independent `node --test` + `eos mission verify --strict-tdd`.
5. `/adversarial-review` — informational RDD only.
6. `/archive` — merge the delta into `openspec/specs/flowdesk-pipeline/spec.md`.
7. `/commit` — feature branch + PR. Not merge-to-main.

## Acceptance

Given/When/Then in `specs/flowdesk-pipeline/spec.md`. Evidence in `docs/evidence/canonical_e2e_openspec_tdd_2026/`.
