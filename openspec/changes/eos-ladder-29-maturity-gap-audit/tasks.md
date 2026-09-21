# Tasks — eos-ladder-29-maturity-gap-audit (DAG)

Docs-only envelope. ZERO implementation of DA–DE. Do NOT start Mission DA. Audit ≠ L29 OPEN until tip-open. Freeze currently Do NOT open Ladder 29. Host apply / PR / tip-open are post-payload gates.

## T0 — Payload scaffold
- **depends-on:** (none)
- **done-criteria:** `/workspace/eos-ladder-29-audit/` exists with `docs/`, `openspec/`; no `src/` tree; APPLY + RESULT + CODE_READY + READY in package.
- **status:** [x]

## T1 — Audit document (sections 1–9)
- **depends-on:** T0
- **done-criteria:** `docs/releases/EOS_MATURITY_LADDER_29_AUDIT_2026-09-21.md` present with tip honesty (freeze StartsWith `8602eeff` / prior CZ `c48aa9f4…`), CLOSED inventory L11–L28 + prune-plan residual, axis **Sovereign Observability & Evidence Economy Fabric**, ranked gaps DA–DE, OUT OF SCOPE, ordered ladder, Mission DA / L29 OPEN entry criteria, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE, evidence pointers; L17–L28 NEVER REOPEN; Audit ≠ L29 OPEN until tip-open; PRODUCTION_READY=NO; Fundacion Δ=0; schemas AT_CEILING; do not start DA; no prune deletes.
- **status:** [x]

## T2 — ADR-0081
- **depends-on:** T0
- **done-criteria:** `docs/adrs/ADR-0081-ladder-29-maturity-gap-audit.md` records axis choice, alternatives rejected (incl. sole prune axis; reopen L28; sole doctor automation; sole local CI hardening), NON-CLAIMs, never reopen L17–L28.
- **status:** [x]

## T3 — OpenSpec envelope (.openspec.yaml + proposal + design)
- **depends-on:** T0
- **done-criteria:** `.openspec.yaml`, `proposal.md`, `design.md` declare axis, DA–DE order SPEC-0110..0114, non-goals (no DA–DE impl; never reopen L17–L28; no PRODUCTION_READY flip; CloudAgent out; no tip-pin rewrite; no new schemas JSON; do not start DA; audit ≠ L29 OPEN; no prune deletes), tip pins freeze StartsWith `8602eeff` / prior CZ `c48aa9f4…`.
- **status:** [x]

## T4 — Spec stub + tasks
- **depends-on:** T3
- **done-criteria:** `tasks.md` present; `specs/ladder-29-maturity-audit/spec.md` stub with invariants + NON-CLAIM fence.
- **status:** [x]

## T5 — Brief evidence pointer
- **depends-on:** T1
- **done-criteria:** `docs/evidence/EOS_LADDER_29_AUDIT_EVIDENCE_2026-09-21.md` pins freeze + prior CZ + L28 MEASURED lineage + residual OBSERVED + docs-only checklist.
- **status:** [x]

## T6 — APPLY + RESULT + CODE_READY + READY
- **depends-on:** T1, T2, T3, T4, T5
- **done-criteria:** `APPLY-LADDER-29-AUDIT.txt` + `RESULT.json` + `LADDER_29_AUDIT_RESULT.json` with status `LADDER_29_AUDIT_READY` + READY marker + `CODE_READY`; sha256 of package files; checks docs-only / no DA–DE impl / no tip refresh / no git push / do not start DA / audit ≠ L29 OPEN / no freeze rewrite.
- **status:** [x]

## T7 — Host apply + verify:strict (host-only)
- **depends-on:** T6 (parent CopyFromBox)
- **done-criteria:** Parent copies docs/adrs/openspec; `npm run verify:strict` green (expect ≥914/0); commit docs-only. **Not executed on box.**
- **status:** [ ] host

## T8 — Open PR / merge CI green (host-only)
- **depends-on:** T7
- **done-criteria:** PR opened on `grok/ladder-29-maturity-audit`; CI green; merge to main.
- **status:** [ ] host

## T9 — Tip-open post-audit merge (separate S1)
- **depends-on:** T8
- **done-criteria:** Separate tip-open / tip-refresh mission pins freeze/matrix/m4 to post-audit tip and formally marks L29 OPEN (removes Do NOT open Ladder 29 hold); do not conflate with this docs-only change; do not rewrite pins in audit package; audit alone ≠ L29 OPEN; freeze stays on tip-seal #399 StartsWith `8602eeff` until this tip-open.
- **status:** [ ] separate S1

## T10 — Start Mission DA harness (separate change)
- **depends-on:** T9
- **done-criteria:** Separate OpenSpec `eos-mission-da-…` under SpecBoot; ZERO DA impl in audit branch; do not start DA in this package.
- **status:** [ ] separate change
