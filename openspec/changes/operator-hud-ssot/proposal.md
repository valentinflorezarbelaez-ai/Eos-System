# Proposal — Operator HUD single source of truth

## Why

Docs and mission-control files historically disagree on test counts, verify checks, and readiness. Operators need **one live truth panel**: what HEAD is, what `verify-eos --strict` says **now**, mission state, error budget / blockers, and the last canonical E2E pointer — not competing slogans.

## What

A CLI-first operator HUD (`eos-hud` / `eos-top` / `npm run eos:hud`) that aggregates measured git + this-run verify with **OBSERVED** file claims (mission, freeze, matrix) and refuses unattributed stale counts (`1440 tests` / `482 checks`).

## Job to be done (`/enrich-us`)

- **User:** EOS operator / Human Director.
- **Job:** See one current status metric before deciding the next pipeline step.
- **Success signal:** One command prints live verify pass/fail from **this run**, git HEAD, mission id/status, readiness flags labeled OBSERVED with source paths, and a canonical E2E pointer if present.
- **NO_BUILD?** No — existing `eos status` / freeze docs echo dated numbers without this-run measurement.

## Routing (ADR-0010)

**SDD** — not DIRECT.

Triggers (size ignored):

1. Explicit human request for a new public operator contract (HUD CLI).
2. New observability aggregator surface.
3. Tests exist → Strict TDD receipts required.

Cite: `docs/base-standards.md`, `docs/backend-standards.md`, ADR-0010.

## NON-goals

- No `Fundacion/` writes (`Δ = 0`).
- No new root `package.json` dependencies (L0 `NODE_BUILTINS_ONLY`).
- No new dashboard framework, web UI, or orchestrator engine.
- Do not invent `PRODUCTION_READY` or reconcile contradictory file claims into one fake verdict.
- Do not replace `node bin/eos.js` / `npm run eos:mission`.
- Do not echo hardcoded `1440 tests` / `482 checks` as live truth.

## Approach

1. OpenSpec envelope under `openspec/changes/operator-hud-ssot/`.
2. `/apply` — aggregator in `src/core/observability` + thin bins; RED → GREEN → TRIANGULATE.
3. `/verify` — `node --test tests/operator-hud.test.js` and `verify-eos --strict`.
4. Operator manual section: how to run and how to read VERIFIED / OBSERVED / NOT VERIFIED.

## Acceptance

Given/When/Then in `specs/operator-hud/spec.md`.
