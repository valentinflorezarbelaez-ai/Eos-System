# ADR-0063: Post-L26 Doctor + HUD Honesty Surfaces

- **Status:** Accepted (Workstream B of ADR-0059)
- **Date:** 2026-09-19
- **Owner:** Valentin Florez
- **Related:** ADR-0059 (post-L26 backlog), ADR-0062 (Workstream A inventory), freeze tip honesty, dirty-defer triage lock

## Context

Ladder 26 is sealed `CLOSED_FOR_LOCAL_GOVERNED_USE` (Mission CP #365 @ `47cf1a79` + tip-seal #366). Workstream B requires Doctor and HUD to describe reality rather than implying seal or readiness: freeze-vs-HEAD lag, dirty-defer blocking, explicit NON-CLAIM chips, and pending-port visibility.

Host live scan was not available to the hermetic executor (machineId does not Shell-route). Implementation ships as a hermetic honesty module plus wired doctor/HUD copies and fixture tests; parent applies to the Windows clone.

## Decision

1. Add `src/core/observability/doctor-hud-honesty.js` as the SSOT honesty helper (pure, fixture-friendly).
2. Wire Doctor (`operator-doctor.js`) and HUD (`operator-hud.js`) to attach/render the honesty surface.
3. Require measurable lag when freeze ≠ source and `lagCommits` is supplied; otherwise report DIVERGE/UNMEASURED without inventing match.
4. Dirty state defers/blocks optimistic results and records an explicit reason.
5. Emit NON-CLAIM chips wherever closure, PRODUCTION_READY, or evidence completeness is not established.
6. Surface pending-port labels from freeze text or explicit options — never claim a port closed.
7. Keep `PRODUCTION_READY=NO`. Never reopen L17–L26. No L27. Fundacion Δ=0. Law VI.

## Non-decisions

- Better display text does **not** close L26 or flip PRODUCTION_READY.
- Honesty suite green ≠ verify:strict pass.
- No Fundacion writes.
- No deletion of keep paths (`operator-doctor.js`, `operator-hud.js`, `evidence-custody.js`).

## Consequences

- Operators see freeze/source revisions and lag instead of silent match assumptions.
- Dirty trees cannot present optimistic seal/readiness outcomes without explanation.
- NON-CLAIM chips make incomplete closure/readiness/evidence visible.
- Parent must merge module + wire-up on host and re-run suite against live freeze/HEAD.

## Acceptance

- Hermetic `node --test tests/eos-post-l26-b-doctor-hud-honesty.test.js` green (clean/dirty/frozen/HEAD-lag/pending-port).
- `node --check` on changed JS.
- RESULT.json `POST_L26_B_DOCTOR_HUD_READY`.
- APPLY note documents host wire-up when host scan was blocked.
