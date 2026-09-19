# Spec — ladder-28-maturity-audit (stub)

## State invariants (MUST hold)

- Ladder 28 SHALL be **defined** by this audit; after merge + tip-open it SHALL be **OPEN** (this audit MEASURED; CV–CZ pending). This audit alone SHALL NOT claim Ladder 28 OPEN. Freeze currently Do NOT open Ladder 28 — this change SHALL respect that hold.
- Ladder 17 through Ladder 27 SHALL remain **CLOSED_FOR_LOCAL_GOVERNED_USE** and SHALL NEVER be reopened.
- `PRODUCTION_READY` SHALL remain `NO` (strict).
- `fundacionDelta` SHALL remain `0` (FUNDACION_ALWAYS_DENY).
- CloudAgent SHALL remain out of SpecBoot (Antigravity-first).
- Law VI SHALL remain CLEAN (no contiguous forbidden provider-prefix literals in payload docs/openspec).
- SLIM SHALL remain ≤145 (no TR-01 raise without PO).
- Schemas SHALL remain AT_CEILING 35/35 — this change SHALL NOT add `docs/schemas/**/*.json`.
- This change SHALL be docs-only: zero files under `src/`; ZERO implementation of CV–CZ; SHALL NOT start Mission CV; SHALL NOT execute prune deletes.
- Tip pins in this audit SHALL cite freeze `58193bc80735c588f0aa09e2c136afa3980c4a51` and merge HEAD ~ `d80d4a5e…`; this change SHALL NOT rewrite freeze/matrix tip pins.

## Requirement: Audit document present

The repository SHALL contain `docs/releases/EOS_MATURITY_LADDER_28_AUDIT_2026-09-19.md` declaring:

- Freeze tip FULL `58193bc80735c588f0aa09e2c136afa3980c4a51` (tip-seal #384; StartsWith `58193bc8`)
- Merge HEAD ~ `d80d4a5e…` (may lag; freeze honesty stays on CU tip until tip-open)
- Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE
- PRODUCTION_READY=NO (strict)
- Fundacion Δ=0
- Central axis: Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric
- Ordered **proposed** satellites CV / CW / CX / CY / CZ with SPEC-0105..0109
- Explicit NON-CLAIM that audit ≠ Mission CV implementation; ZERO implementation of CV–CZ in this branch; do not start Mission CV; audit ≠ L28 OPEN until tip-open

## Requirement: ADR-0074 present

The repository SHALL contain `docs/adrs/ADR-0074-ladder-28-maturity-gap-audit.md` recording axis choice, rejected alternatives (incl. sole prune axis; reopen L27), and never-reopen L17–L27.

## EARS (stub)

### WHEN
- WHEN an operator opens the Ladder 28 maturity audit after L27 closeout + tip-seal #384, THE SYSTEM SHALL present the audit document with tip honesty freeze `58193bc8…` / merge HEAD ~ `d80d4a5e…` and ordered proposed satellites CV→CZ.

### WHILE
- WHILE Ladder 28 remains not yet tip-opened OPEN, THE SYSTEM SHALL keep L17–L27 CLOSED_FOR_LOCAL_GOVERNED_USE and SHALL NOT reopen them and SHALL NOT claim L28 OPEN from this audit alone and SHALL respect freeze Do NOT open Ladder 28.
- WHILE this docs-only change is in flight, THE SYSTEM SHALL keep PRODUCTION_READY=NO and fundacionDelta=0 and CloudAgent out and schemas AT_CEILING and SHALL NOT start Mission CV and SHALL NOT rewrite freeze tip pins.

### IF … THEN
- IF a change under this OpenSpec attempts to implement CV/CW/CX/CY/CZ under `src/`, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE for this change.
- IF tip identity is recorded with a freeze SHA other than `58193bc8…` (absent post-merge tip-open honesty), THEN THE SYSTEM SHALL treat tip honesty as FAILED for this audit envelope.
- IF a change under this OpenSpec adds `docs/schemas/**/*.json`, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE (AT_CEILING).
- IF a change under this OpenSpec executes prune deletes from post-L26 A inventory, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE.

### THE SYSTEM SHALL
- THE SYSTEM SHALL declare central axis **Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric**.
- THE SYSTEM SHALL order proposed satellites CV → CW → CX → CY → CZ (SPEC-0105..0109).
- THE SYSTEM SHALL keep Law VI CLEAN in payload docs/openspec/adrs.

## NON-CLAIM fence

- Audit ≠ CV–CZ implementation
- Audit ≠ Ladder 28 OPEN (requires separate tip-open; freeze currently Do NOT open L28)
- CV–CZ pending ≠ MEASURED
- Do not start Mission CV in this package
- HUD/Doctor honesty ritual ≠ PRODUCTION_READY flip / ≠ L27 reopen / ≠ tip rewrite
- Cross-port orchestration ≠ GHE / ≠ CU rewrite / ≠ L27 reopen
- Billing-blocked local verify ritual ≠ GHA green / ≠ GHE / ≠ PRODUCTION_READY
- Mission OS control-plane honesty ≠ PRODUCTION_READY flip / ≠ tip rewrite / ≠ Fundacion write
- Seam-pack ≠ GHE enforcement
- L28 OPEN ≠ L27 reopen ≠ PRODUCTION_READY=YES
- Complexity prune inventory ≠ delete auth ≠ sole L28 axis; no deletes in this audit
- Never reopen L17–L27
