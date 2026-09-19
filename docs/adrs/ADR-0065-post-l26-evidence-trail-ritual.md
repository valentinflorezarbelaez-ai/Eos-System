# ADR-0065: Post-L26 Evidence Trail Ritual Binding CL↔CM↔CN (design-only)

- **Status:** Accepted (design-only; implementation **not** authorized by this ADR)
- **Date:** 2026-09-19
- **Owner:** Valentin Florez
- **Related:** ADR-0059 (post-L26 backlog Workstream D), ADR-0056 (CL), ADR-0057 (CM), ADR-0058 (CN), ADR-0062 (A), ADR-0063 (B), ADR-0064 (C)
- **Spec axis:** Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric

## Context

Ladder 26 is sealed `CLOSED_FOR_LOCAL_GOVERNED_USE` (Mission CP #365 @ `47cf1a79` + tip-seal #366 @ `b7b84478`). Missions CL, CM, and CN are **MEASURED** and each seal nine-field SHA-256 receipts (`CL-RCPT-*`, `CM-RCPT-*`, `CN-RCPT-*`) with intra-port hash chains. Operators still lack a single **cross-port** append-only ritual that binds CL → CM → CN with port identity, revision/freeze identity, timestamp, operator, inputs, outputs, and explicit non-claims — failing closed on missing, dirty, mismatched, or unverifiable links.

Workstream D of ADR-0059 requires a **design note** before any CLI. COMPLEXITY_BUDGET schemas are already **35/35 AT_CEILING**, so no new `docs/schemas/**/*.json` may land.

## Decision

1. Publish `docs/releases/EOS_POST_L26_D_EVIDENCE_TRAIL_DESIGN_2026-09-19.md` as the Workstream D design SSOT.
2. Define an inline `EvidenceTrail` schema (`kind: eos-evidence-trail-cl-cm-cn`, `schemaVersion: 0.1.0-design`) with mandatory ordered `links[]` of length 3 (CL→CM→CN), `revisionFreezeIdentity`, `operator`, `inputs`, `outputs`, `nonClaims`, `appendOnly`, and `security` (incl. replay policy).
3. Ship a **sample-only** fixture at `fixtures/evidence-trail-cl-cm-cn.sample.json` demonstrating linkage using already-MEASURED L26 facts — without asserting pending ports closed and without generating a live host trail.
4. Sketch future CLI UX for `eos evidence:trail` (`verify` / `build` / `show` / `doctor`) with fail-closed exit codes — **do not implement** under this ADR.
5. Keep schema **inline** (and optional draft under `fixtures/` only). **Forbid** new `docs/schemas/*.json` while AT_CEILING holds.
6. Require **separate** human approval (future ADR) before any `src/` CLI or host live trail generation.
7. Keep `PRODUCTION_READY=NO`. Never reopen L17–L26. No L27. Fundacion Δ=0. Law VI.

## Non-decisions

- No authorization to implement `eos evidence:trail`.
- No CL/CM/CN port code changes; no receipt regeneration on host.
- No extension of the trail to CO/CP under this ADR.
- No PRODUCTION_READY flip; no Fundacion writes; no git push from the hermetic executor.
- No claim that the sample fixture is live custody evidence.
- No new counted JSON Schema under `docs/schemas/`.

## Consequences

- **Positive:** Cross-port ritual is reviewable; failure modes and replay defenses are explicit; AT_CEILING schema budget is preserved; implementation cannot silently expand scope.
- **Negative:** Operators still lack an executable CLI until a separate implementation ADR lands.
- **Invariants preserved:** `PRODUCTION_READY=NO`, Fundacion Δ=0, Law VI, L17–L26 never reopen, L27 not started.

## Acceptance

- Design release + this ADR + evidence note exist.
- Sample fixture exists with `sampleOnly: true` and fail-closed semantics documented.
- RESULT.json status `POST_L26_D_EVIDENCE_TRAIL_DESIGN_READY`.
- No `docs/schemas/**/*.json` added by this package.
- No CLI / `src/` implementation shipped.

## NON-CLAIMS

- Design sketch ≠ implemented command.
- Sample trail ≠ host-live custody / ≠ port closure beyond MEASURED L26 seal facts.
- Evidence trail ritual ≠ WORM SaaS / ≠ external audit / ≠ SIEM / ≠ Sigstore / ≠ GHE.
- `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`.
