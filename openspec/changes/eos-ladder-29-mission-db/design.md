# Design — Mission DB Doctor Ritual Automation Port (SPEC-0111)

## Architecture

Triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`DB-RCPT-*`); forced freeze soft-observe pin `daae7380`.
2. **Policy gate** — fail-closed: secrets, Fundacion, PR flip, L28 reopen, tip-pin rewrite, GHE, L29 auto-close, missing fields, external APM; require DA observe.
3. **Port** — `govern` → PASS|DENY|HOLD; soft-compose DA observability; soft-observe L28 honesty; HOLD for observe-only; PASS emits `DB-RCPT-*`.

## Modes

- `ACTIVE` + DA observe ok → PASS
- `HOLD` → HOLD (observe-only; freeze soft-observe)
- refuse surface → DENY (sealed)

## Soft-compose

- Soft-import DA `control-plane-observability-aggregation-port` when co-located
- Soft-observe L28 CV/CW/CX/CY honesty labels (compose; ≠ reopen L28)
- Builtin fixture double for hermetic green

## Invariants

PRODUCTION_READY=NO · Fundacion Δ=0 · Law VI · Antigravity-first · schemas AT_CEILING · no tip-pin rewrite · Formal L28 CLOSED
