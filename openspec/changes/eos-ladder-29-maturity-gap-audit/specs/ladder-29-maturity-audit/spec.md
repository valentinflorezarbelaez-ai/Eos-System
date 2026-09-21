# Spec — ladder-29-maturity-audit (stub)

## State invariants (MUST hold)

- Ladder 29 SHALL be **defined** by this audit; after merge + tip-open it SHALL be **OPEN** (this audit MEASURED; DA–DE pending). This audit alone SHALL NOT claim Ladder 29 OPEN. Freeze currently Do NOT open Ladder 29 — this change SHALL respect that hold.
- Ladder 17 through Ladder 28 SHALL remain **CLOSED_FOR_LOCAL_GOVERNED_USE** and SHALL NEVER be reopened.
- `PRODUCTION_READY` SHALL remain `NO` (strict).
- `fundacionDelta` SHALL remain `0` (FUNDACION_ALWAYS_DENY).
- CloudAgent SHALL remain out of SpecBoot (Antigravity-first).
- Law VI SHALL remain CLEAN (no contiguous forbidden provider-prefix literals in payload docs/openspec).
- SLIM SHALL remain ≤145 (no TR-01 raise without PO).
- Schemas SHALL remain AT_CEILING 35/35 — this change SHALL NOT add `docs/schemas/**/*.json`.
- This change SHALL be docs-only: zero files under `src/`; ZERO implementation of DA–DE; SHALL NOT start Mission DA; SHALL NOT execute prune deletes.
- Tip pins in this audit SHALL cite freeze StartsWith `8602eeff` and prior CZ tip `c48aa9f43808e99d378e8f2bd05b360e7436c514`; this change SHALL NOT rewrite freeze/matrix tip pins.

## Requirement: Audit document present

The repository SHALL contain `docs/releases/EOS_MATURITY_LADDER_29_AUDIT_2026-09-21.md` declaring:

- Freeze tip StartsWith `8602eeff` (tip-seal #399 Formal L28 CLOSED)
- Prior CZ tip `c48aa9f43808e99d378e8f2bd05b360e7436c514` (StartsWith `c48aa9f4`)
- Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE
- PRODUCTION_READY=NO (strict)
- Fundacion Δ=0
- Central axis: Sovereign Observability & Evidence Economy Fabric
- Ordered **proposed** satellites DA / DB / DC / DD / DE with SPEC-0110..0114
- Explicit NON-CLAIM that audit ≠ Mission DA implementation; ZERO implementation of DA–DE in this branch; do not start Mission DA; audit ≠ L29 OPEN until tip-open

## Requirement: ADR-0081 present

The repository SHALL contain `docs/adrs/ADR-0081-ladder-29-maturity-gap-audit.md` recording axis choice, rejected alternatives (incl. sole prune axis; reopen L28; sole doctor automation; sole local CI hardening), and never-reopen L17–L28.

## EARS (stub)

### WHEN
- WHEN an operator opens the Ladder 29 maturity audit after L28 closeout + tip-seal #399, THE SYSTEM SHALL present the audit document with tip honesty freeze StartsWith `8602eeff` / prior CZ `c48aa9f4…` and ordered proposed satellites DA→DE.

### WHILE
- WHILE Ladder 29 remains not yet tip-opened OPEN, THE SYSTEM SHALL keep L17–L28 CLOSED_FOR_LOCAL_GOVERNED_USE and SHALL NOT reopen them and SHALL NOT claim L29 OPEN from this audit alone and SHALL respect freeze Do NOT open Ladder 29.
- WHILE this docs-only change is in flight, THE SYSTEM SHALL keep PRODUCTION_READY=NO and fundacionDelta=0 and CloudAgent out and schemas AT_CEILING and SHALL NOT start Mission DA and SHALL NOT rewrite freeze tip pins.

### IF … THEN
- IF a change under this OpenSpec attempts to implement DA/DB/DC/DD/DE under `src/`, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE for this change.
- IF tip identity is recorded with a freeze SHA not StartingWith `8602eeff` (absent post-merge tip-open honesty), THEN THE SYSTEM SHALL treat tip honesty as FAILED for this audit envelope.
- IF a change under this OpenSpec adds `docs/schemas/**/*.json`, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE (AT_CEILING).
- IF a change under this OpenSpec executes prune deletes from inventory / #387 plan, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE.
- IF a change under this OpenSpec reopens Mission AJ / L15 as rewrite, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE.

### THE SYSTEM SHALL
- THE SYSTEM SHALL declare central axis **Sovereign Observability & Evidence Economy Fabric**.
- THE SYSTEM SHALL order proposed satellites DA → DB → DC → DD → DE (SPEC-0110..0114).
- THE SYSTEM SHALL keep Law VI CLEAN in payload docs/openspec/adrs.

## NON-CLAIM fence

- Audit ≠ DA–DE implementation
- Audit ≠ Ladder 29 OPEN (requires separate tip-open; freeze currently Do NOT open L29)
- DA–DE pending ≠ MEASURED
- Do not start Mission DA in this package
- Control-Plane Observability Aggregation Port ≠ PRODUCTION_READY flip / ≠ L28 reopen / ≠ tip rewrite / ≠ GHE / ≠ external APM
- Doctor Ritual Automation Port ≠ CV rewrite / ≠ L28 reopen / ≠ unsupervised autonomy / ≠ CloudAgent
- Evidence Economy Custody Ledger Port ≠ billing / ≠ external audit / ≠ reopen AJ / ≠ PRODUCTION_READY
- Local CI Ritual Hardening Port ≠ GHA green / ≠ GHE / ≠ PRODUCTION_READY
- Seam-pack ≠ GHE enforcement
- L29 OPEN ≠ L28 reopen ≠ PRODUCTION_READY=YES
- Complexity prune inventory/plan ≠ delete auth ≠ sole L29 axis; no deletes in this audit
- Never reopen L17–L28
