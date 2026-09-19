# Tasks — eos-ladder-28-maturity-gap-audit (DAG)

Docs-only envelope. ZERO implementation of CV–CZ. Do NOT start Mission CV. Audit ≠ L28 OPEN until tip-open. Freeze currently Do NOT open Ladder 28. Host apply / PR / tip-open are post-payload gates.

## T0 — Payload scaffold
- **depends-on:** (none)
- **done-criteria:** `/workspace/eos-ladder-28-audit/` exists with `docs/`, `openspec/`; no `src/` tree; APPLY + RESULT + READY in package.
- **status:** [x]

## T1 — Audit document (sections 1–9)
- **depends-on:** T0
- **done-criteria:** `docs/releases/EOS_MATURITY_LADDER_28_AUDIT_2026-09-19.md` present with tip honesty (freeze FULL `58193bc8…` / merge HEAD ~ `d80d4a5e…`), CLOSED inventory L11–L27 + post-L26 B residual, axis **Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric**, ranked gaps CV–CZ, OUT OF SCOPE, ordered ladder, Mission CV / L28 OPEN entry criteria, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE, evidence pointers; L17–L27 NEVER REOPEN; Audit ≠ L28 OPEN until tip-open; PRODUCTION_READY=NO; Fundacion Δ=0; schemas AT_CEILING; do not start CV; no prune deletes.
- **status:** [x]

## T2 — ADR-0074
- **depends-on:** T0
- **done-criteria:** `docs/adrs/ADR-0074-ladder-28-maturity-gap-audit.md` records axis choice, alternatives rejected (incl. sole prune axis; reopen L27), NON-CLAIMs, never reopen L17–L27.
- **status:** [x]

## T3 — OpenSpec envelope (.openspec.yaml + proposal + design)
- **depends-on:** T0
- **done-criteria:** `.openspec.yaml`, `proposal.md`, `design.md` declare axis, CV–CZ order SPEC-0105..0109, non-goals (no CV–CZ impl; never reopen L17–L27; no PRODUCTION_READY flip; CloudAgent out; no tip-pin rewrite; no new schemas JSON; do not start CV; audit ≠ L28 OPEN; no prune deletes), tip pins freeze `58193bc8…` / merge HEAD ~ `d80d4a5e…`.
- **status:** [x]

## T4 — Spec stub + tasks
- **depends-on:** T3
- **done-criteria:** `tasks.md` present; `specs/ladder-28-maturity-audit/spec.md` stub with invariants + NON-CLAIM fence.
- **status:** [x]

## T5 — Brief evidence pointer
- **depends-on:** T1
- **done-criteria:** `docs/evidence/EOS_LADDER_28_AUDIT_EVIDENCE_2026-09-19.md` pins freeze + merge HEAD + L27 MEASURED lineage + post-L26 B OBSERVED + docs-only checklist.
- **status:** [x]

## T6 — APPLY + RESULT + READY
- **depends-on:** T1, T2, T3, T4, T5
- **done-criteria:** `APPLY-LADDER-28-AUDIT.txt` + `RESULT.json` + `LADDER_28_AUDIT_RESULT.json` with status `LADDER_28_AUDIT_READY` + READY marker; sha256 of package files; checks docs-only / no CV–CZ impl / no tip refresh / no git push / do not start CV / audit ≠ L28 OPEN / no freeze rewrite.
- **status:** [x]

## T7 — Host apply + verify:strict (host-only)
- **depends-on:** T6 (parent CopyFromBox)
- **done-criteria:** Parent copies docs/adrs/openspec; `npm run verify:strict` green (expect 914/0); commit docs-only. **Not executed on box.**
- **status:** [ ] host

## T8 — Open PR / merge CI green (host-only)
- **depends-on:** T7
- **done-criteria:** PR opened on `grok/ladder-28-maturity-audit`; CI green; merge to main.
- **status:** [ ] host

## T9 — Tip-open post-audit merge (separate S1)
- **depends-on:** T8
- **done-criteria:** Separate tip-open / tip-refresh mission pins freeze/matrix/m4 to post-audit tip and formally marks L28 OPEN (removes Do NOT open Ladder 28 hold); do not conflate with this docs-only change; do not rewrite pins in audit package; audit alone ≠ L28 OPEN; freeze stays on CU tip `58193bc8` until this tip-open.
- **status:** [ ] separate S1

## T10 — Start Mission CV harness (separate change)
- **depends-on:** T9
- **done-criteria:** Separate OpenSpec `eos-mission-cv-…` under SpecBoot; ZERO CV impl in audit branch; do not start CV in this package.
- **status:** [ ] separate change
