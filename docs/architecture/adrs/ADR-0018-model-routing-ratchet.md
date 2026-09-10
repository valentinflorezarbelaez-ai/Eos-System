# ADR-0018 — Model routing + ratchet ritual (Ladder 7 S6)

- **Status:** Accepted (local governed)
- **Date:** 2026-09-09
- **Deciders:** EOS Control Plane
- **Ladder:** 7 / Step S6 (K6)

## Context

Ladder 7 audit S6 required OpenSpec/light or ADR for **model routing by SDD/task class** plus the LIDR **ratchet** ritual (error→control via AGENTS/hooks/CI evals/cost+fail logs/subagents), with meta-test presence, **without** auto-router claim or whiplash-solved claim. Token economics already documents a phase matrix; Antigravity-first demotes CloudAgent. ADR-0011 / ADR-0014 / ADR-0017 must not be rewritten.

## Decision

1. Publish SSOT guidance at `docs/harness/MODEL_ROUTING.md` (task-class → tier; Antigravity-first).
2. Publish SSOT ritual at `docs/harness/RATCHET_RITUAL.md` (capture→classify→control→verify→freeze).
3. Enforce presence via `scripts/lib/model-routing-ratchet-lock.js` under `npm run verify:strict` + `npm run test:s6`.
4. Retain NON-CLAIM: guidance ≠ auto model switch without evidence; ritual ≠ autonomous self-heal; PRODUCTION_READY=NO; Fundacion Δ=0; AT_CEILING (no new schemas JSON); no silent tool delete.

## Consequences

- Operators have one map for tier choice and one ritual for error→control.
- verify:strict fails closed if routing/ratchet SSOTs or required needles disappear.
- No claim of automatic model middleware or whiplash solved.

## Pointers

- SSOTs: `docs/harness/MODEL_ROUTING.md`, `docs/harness/RATCHET_RITUAL.md`
- OpenSpec: `openspec/changes/eos-s6-model-routing-ratchet/`
- Evidence: `docs/releases/EOS_S6_MODEL_ROUTING_RATCHET_2026-09-09.md`
- Related (read-only): ADR-0011, ADR-0017, `ANTIGRAVITY_FIRST.md`, token economics §4
