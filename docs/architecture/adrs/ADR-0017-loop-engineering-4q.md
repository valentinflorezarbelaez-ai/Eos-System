# ADR-0017 — Loop Engineering 4Q guides/sensors matrix

- **Status:** Accepted (local governed)
- **Date:** 2026-09-09
- **Deciders:** EOS Control Plane
- **Ladder:** 7 / Step S3 (K3)

## Context

Mission-loop MCP enforcement (ADR-0014) and computational guides/sensors (verify, CI, TDD, hooks, Write Barrier) already exist. Ladder 7 audit S3 required a canonical **Loop Engineering** policy: the LIDR cycle guides→act→sensors→feedback plus a four-quadrant matrix (feedforward/feedback × computational/inferential) mapped to real EOS surfaces, with doctor/mission honesty NON-CLAIM. ADR-0011 (harness/token hygiene) and ADR-0014 must not be rewritten.

## Decision

1. Publish SSOT matrix at `docs/harness/LOOP_ENGINEERING_4Q.md` (cycle + 4Q mapping of existing surfaces only).
2. Keep ADR-0014 as the MCP stage FSM overlay; Loop Engineering 4Q is the **policy taxonomy**, not a parallel Mission OS.
3. Enforce presence via `scripts/lib/loop-engineering-lock.js` under `npm run verify:strict`.
4. Retain NON-CLAIM: policy ≠ productive autonomy; Loop Engineering ≠ verify:strict; doctor ≠ verify; PRODUCTION_READY=NO; Fundacion Δ=0.

## Consequences

- Operators/agents have one map of guides/sensors across the 4Q axes.
- verify:strict fails closed if the matrix SSOT or required needles disappear.
- No claim of autonomous productive loop; no new schemas JSON (AT_CEILING).

## Pointers

- SSOT: `docs/harness/LOOP_ENGINEERING_4Q.md`
- OpenSpec: `openspec/changes/eos-s3-loop-engineering-4q/`
- Evidence: `docs/releases/EOS_S3_LOOP_ENGINEERING_4Q_2026-09-09.md`
- Related (read-only): ADR-0014, ADR-0011, `docs/harness/CONTEXT_PACK_TPC.md`
