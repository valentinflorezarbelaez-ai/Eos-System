# Proposal — EOS Ladder 10 V3 Typed Multi-Agent Handoff Contract

## Why

In complex SDLC workflows, subagents coordinating across phases (Intake, Spec, Plan, Apply, Verify, Review) frequently suffer from semantic drift when communicating with unstructured markdown or untyped prompts. Inspired by Google ADK and PydanticAI structured models, EOS requires a deterministic, schema-validated handoff contract (`AgentHandoffEnvelope`) to guarantee phase boundaries and enforce the constitutional rule `BUILDER != VERIFIER` at runtime.

## What

1. OpenSpec envelope (`.openspec.yaml`, `proposal.md`, `tasks.md`).
2. TDD suite: `tests/agent-handoff-envelope.test.js` validating:
   - Creation of valid handoff envelopes.
   - Validation against allowed phase states and transitions.
   - Fail-closed behavior on missing or malformed fields.
   - Runtime enforcement of `BUILDER != VERIFIER` when transitioning from builder to verifier.
   - Serialization and payload structure integrity.
3. Pure implementation: `src/core/orchestration/agent-handoff-envelope.js` (Ponytail Tier 2, zero external deps).
4. `package.json` script: `test:v3`.
5. Invariants preserved:
   - `PRODUCTION_READY: NO`
   - `Fundacion Delta: 0`
   - `AT_CEILING: 35/35 schemas` (pure code contract, no extra schema files added).
   - Zero plain secrets.

## Routing

**SDD** — ZERO vibe coding. Antigravity-first.
