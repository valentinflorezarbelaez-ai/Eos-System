# Spec — ladder-27-maturity-audit (stub)

## State invariants (MUST hold)

- Ladder 27 SHALL be **defined** by this audit; after merge + tip-refresh it SHALL be **OPEN** (this audit MEASURED; CQ–CU pending). This audit alone SHALL NOT claim Ladder 27 OPEN.
- Ladder 17, Ladder 18, Ladder 19, Ladder 20, Ladder 21, Ladder 22, Ladder 23, Ladder 24, Ladder 25, and Ladder 26 SHALL remain **CLOSED_FOR_LOCAL_GOVERNED_USE** and SHALL NEVER be reopened.
- `PRODUCTION_READY` SHALL remain `NO` (strict).
- `fundacionDelta` SHALL remain `0` (FUNDACION_ALWAYS_DENY).
- CloudAgent SHALL remain out of SpecBoot (Antigravity-first).
- Law VI SHALL remain CLEAN (no contiguous forbidden provider-prefix literals in payload docs/openspec).
- SLIM SHALL remain ≤145 (no TR-01 raise without PO).
- Schemas SHALL remain AT_CEILING 35/35 — this change SHALL NOT add `docs/schemas/**/*.json`.
- This change SHALL be docs-only: zero files under `src/`; ZERO implementation of CQ–CU; SHALL NOT start Mission CQ.
- Tip pins in this audit SHALL cite freeze `64227127748f84a26aac93b1b2f61712d92ee2cb` and merge HEAD ~ `56cdfd08`; this change SHALL NOT rewrite freeze/matrix tip pins.

## Requirement: Audit document present

The repository SHALL contain `docs/releases/EOS_MATURITY_LADDER_27_AUDIT_2026-09-19.md` declaring:

- Freeze tip FULL `64227127748f84a26aac93b1b2f61712d92ee2cb` (tip-refresh #374; StartsWith `64227127`)
- Merge HEAD ~ `56cdfd08` (tip-refresh #374 merge; StartsWith `56cdfd08`)
- Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE
- PRODUCTION_READY=NO (strict)
- Fundacion Δ=0
- Central axis: Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric
- Ordered **proposed** satellites CQ / CR / CS / CT / CU with SPEC-0100..0104
- Explicit NON-CLAIM that audit ≠ Mission CQ implementation; ZERO implementation of CQ–CU in this branch; do not start Mission CQ; audit ≠ L27 OPEN until tip-refresh

## Requirement: ADR-0068 present

The repository SHALL contain `docs/adrs/ADR-0068-ladder-27-maturity-gap-audit.md` recording axis choice, rejected alternatives (incl. sole prune axis), and never-reopen L17–L26.

## EARS (stub)

### WHEN
- WHEN an operator opens the Ladder 27 maturity audit after L26 closeout + post-L26 A–F + tip-refresh #374, THE SYSTEM SHALL present the audit document with tip honesty freeze `64227127…` / merge HEAD ~ `56cdfd08` and ordered proposed satellites CQ→CU.

### WHILE
- WHILE Ladder 27 remains not yet tip-refreshed OPEN, THE SYSTEM SHALL keep L17–L26 CLOSED_FOR_LOCAL_GOVERNED_USE and SHALL NOT reopen them and SHALL NOT claim L27 OPEN from this audit alone.
- WHILE this docs-only change is in flight, THE SYSTEM SHALL keep PRODUCTION_READY=NO and fundacionDelta=0 and CloudAgent out and schemas AT_CEILING and SHALL NOT start Mission CQ.

### IF … THEN
- IF a change under this OpenSpec attempts to implement CQ/CR/CS/CT/CU under `src/`, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE for this change.
- IF tip identity is recorded with a SHA other than freeze `64227127…` / merge HEAD ~ `56cdfd08` (absent post-merge honesty refresh), THEN THE SYSTEM SHALL treat tip honesty as FAILED for this audit envelope.
- IF a change under this OpenSpec adds `docs/schemas/**/*.json`, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE (AT_CEILING).

### THE SYSTEM SHALL
- THE SYSTEM SHALL declare central axis **Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric**.
- THE SYSTEM SHALL order proposed satellites CQ → CR → CS → CT → CU (SPEC-0100..0104).
- THE SYSTEM SHALL keep Law VI CLEAN in payload docs/openspec/adrs.

## NON-CLAIM fence

- Audit ≠ CQ–CU implementation
- Audit ≠ Ladder 27 OPEN (requires separate tip-refresh)
- CQ–CU pending ≠ MEASURED
- Do not start Mission CQ in this package
- Local CI continuity ≠ GHA green / ≠ GHE / ≠ PRODUCTION_READY
- Evidence trail ritual ≠ SIEM / ≠ production data lake / ≠ auto-close L26 / ≠ new schemas JSON
- SpecBoot operator continuity ≠ automatic closure / ≠ PRODUCTION_READY flip
- Fundacion Δ=0 continuity drill ≠ Fundacion write / ≠ L26 reopen / ≠ weaken ALWAYS_DENY
- Seam-pack ≠ GHE enforcement
- L27 OPEN ≠ L26 reopen ≠ PRODUCTION_READY=YES
- Complexity prune inventory ≠ delete auth ≠ sole L27 axis
- Never reopen L17–L26
