# Design — Ladder 14 maturity audit

Docs-only. Mirror Ladder 7/13 audit shape: tip probe, closed inventory, ranked gaps, OUT OF SCOPE, ordered ladder (**proposed** AD→AH), NON-CLAIM block.

Bridge from Ladder 13 (Z/AA/AB/AC) + W/X:

- Keep FUNDACION_ALWAYS_DENY until explicit PO Level 2.
- Reuse AA `BoundedOutputFilter` as building block for AE circuit breaker — do not rewrite swarm.
- Provider secrets env-only; never commit keys.
- Live LLM path remains fail-closed + HITL; Antigravity-first (CloudAgent out).
- `MODEL_ROUTING.md` is named as future SSOT for AD — **not** created by this audit change.
