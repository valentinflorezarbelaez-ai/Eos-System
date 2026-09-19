# Tasks — eos-ladder-26-maturity-audit (DAG)

Docs-only envelope. ZERO implementation of CL–CP. Do NOT start Mission CL. Host apply / PR / tip-refresh are post-payload gates.

## T0 — Payload scaffold
- **depends-on:** (none)
- **done-criteria:** `/workspace/eos-ladder-26-audit/` exists with `docs/`, `openspec/`; no `src/` tree; APPLY + RESULT in package.
- **status:** [x]

## T1 — Audit document (sections 1–9)
- **depends-on:** T0
- **done-criteria:** `docs/releases/EOS_MATURITY_LADDER_26_AUDIT_2026-09-19.md` present with tip honesty (observed FULL `746c201…` / freeze `576aafa…`), CLOSED inventory L11–L25, axis **Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric**, ranked gaps CL–CP, OUT OF SCOPE, ordered ladder, Mission CL / L26 OPEN entry criteria, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE, evidence pointers; L17–L25 NEVER REOPEN; L26 OPEN after tip-refresh; PRODUCTION_READY=NO; Fundacion Δ=0; do not start CL.
- **status:** [x]

## T2 — ADR-0055
- **depends-on:** T0
- **done-criteria:** `docs/adrs/ADR-0055-ladder-26-maturity-gap-audit.md` records axis choice, alternatives rejected, NON-CLAIMs, never reopen L17–L25.
- **status:** [x]

## T3 — OpenSpec envelope (.openspec.yaml + proposal + design)
- **depends-on:** T0
- **done-criteria:** `.openspec.yaml`, `proposal.md`, `design.md` declare axis, CL–CP order SPEC-0095..0099, non-goals (no CL–CP impl; never reopen L17–L25; no PRODUCTION_READY flip; CloudAgent out; no tip-pin rewrite; do not start CL), tip pins observed `746c201…` / freeze `576aafa…`.
- **status:** [x]

## T4 — Spec stub + tasks
- **depends-on:** T3
- **done-criteria:** `tasks.md` present; `specs/ladder-26-maturity-audit/spec.md` stub with invariants + NON-CLAIM fence.
- **status:** [x]

## T5 — Brief evidence pointer
- **depends-on:** T1
- **done-criteria:** `docs/evidence/EOS_LADDER_26_AUDIT_EVIDENCE_2026-09-19.md` pins observed HEAD + freeze + L25 MEASURED lineage + docs-only checklist.
- **status:** [x]

## T6 — APPLY + RESULT
- **depends-on:** T1, T2, T3, T4, T5
- **done-criteria:** `APPLY-LADDER-26-AUDIT.txt` + `LADDER_26_AUDIT_RESULT.json` with status `LADDER_26_AUDIT_READY`; sha256 of package files; checks docs-only / no CL–CP impl / no tip refresh / no git push / do not start CL.
- **status:** [x]

## T7 — Host apply + verify:strict (host-only)
- **depends-on:** T6 (parent CopyFromBox)
- **done-criteria:** Parent copies docs/adrs/openspec; `npm run verify:strict` green (expect 914/0); commit docs-only. **Not executed on box.**
- **status:** [ ] host

## T8 — Open PR / merge CI green (host-only)
- **depends-on:** T7
- **done-criteria:** PR opened on `grok/ladder-26-maturity-audit`; CI green; merge to main.
- **status:** [ ] host

## T9 — Tip refresh post-audit merge (separate S1)
- **depends-on:** T8
- **done-criteria:** Separate tip-refresh mission pins freeze/matrix/m4 to post-audit tip and formally marks L26 OPEN; do not conflate with this docs-only change; do not rewrite pins in audit package.
- **status:** [ ] separate S1

## T10 — Start Mission CL harness (separate change)
- **depends-on:** T9
- **done-criteria:** Separate OpenSpec `eos-mission-cl-…` under SpecBoot; ZERO CL impl in audit branch; do not start CL in this package.
- **status:** [ ] separate change
