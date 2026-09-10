# Proposal — EOS Ladder 10 V2 Observation Budget and Token Hygiene Guard

## Why

Unbounded terminal outputs and verbose error dumps in agentic loops flood the LLM context window, burning tokens, diluting attention, and degrading model reasoning. Directive 8 of `.agents/AGENTS.md` mandates an observation budget, but currently lacks an automated, deterministic pure utility to filter and bound stream outputs.

## What

1. OpenSpec envelope (`.openspec.yaml`, `proposal.md`, `tasks.md`).
2. TDD suite: `tests/bounded-output-filter.test.js` validating:
   - Passthrough for outputs within budget.
   - Bounded windowing: head lines + informative omission notice with line/byte counts + tail lines.
   - Resilient handling of empty, non-string, or single-line inputs.
   - Edge case boundaries (custom head/tail limits, byte ceilings).
3. Pure implementation: `src/core/runtime/bounded-output-filter.js` (Ponytail Tier 2, zero external dependencies).
4. Package.json script: `test:v2`.
5. Invariants preserved:
   - `PRODUCTION_READY: NO`
   - `Fundacion Delta: 0`
   - `AT_CEILING: 35/35 schemas`
   - Zero plain secrets.

## Routing

**SDD** — ZERO vibe coding. Antigravity-first.
