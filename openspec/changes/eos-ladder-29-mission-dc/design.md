# Design — Mission DC Evidence Economy Custody Ledger Port (SPEC-0112)

## Architecture

Triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`DC-RCPT-*`); forced freeze soft-observe pin `22d80bce`.
2. **Policy gate** — fail-closed: secrets, Fundacion, PR flip, L28 reopen, tip-pin rewrite, GHE, L29 auto-close, missing fields, external APM; require DA+DB observe.
3. **Port** — `govern` → PASS|DENY|HOLD; soft-compose DA+DB observe; soft-observe L28 honesty; HOLD for observe-only; PASS emits `DC-RCPT-*`.

## Modes

- `ACTIVE` + DA+DB observe ok → PASS
- `HOLD` → HOLD (observe-only; freeze soft-observe)
- refuse surface → DENY (sealed)

## Soft-compose

- Soft-import DB `doctor-ritual-automation-port` when co-located (prefer)
- Soft-import DA `control-plane-observability-aggregation-port` when co-located
- Soft-observe L28 CV/CW/CX/CY honesty labels (compose; ≠ reopen L28)
- Builtin fixture double for hermetic green

## Invariants

PRODUCTION_READY=NO · Fundacion Δ=0 · Law VI · Antigravity-first · schemas AT_CEILING · no tip-pin rewrite · Formal L28 CLOSED
