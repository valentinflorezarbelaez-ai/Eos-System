# Tasks — eos-ladder-25-maturity-audit (DAG)

Docs-only envelope. ZERO implementation of CG–CK. Host apply / PR / tip-refresh are post-payload gates.

## T0 — Payload scaffold
- **depends-on:** (none)
- **done-criteria:** `/workspace/eos-ladder-25-audit/` exists with `docs/`, `openspec/`; no `src/` tree; APPLY + RESULT at workspace root.
- **status:** [x]

## T1 — Audit document (sections 1–9)
- **depends-on:** T0
- **done-criteria:** `docs/releases/EOS_MATURITY_LADDER_25_AUDIT_2026-09-18.md` present with tip honesty (observed FULL `dc75b5f…` / freeze `4383dc9…`), CLOSED inventory L11–L24, axis **Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric**, ranked gaps CG–CK, OUT OF SCOPE, ordered ladder, Mission CG entry criteria, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE, evidence pointers; L17–L24 NEVER REOPEN; L25 OPEN; PRODUCTION_READY=NO; Fundacion Δ=0.
- **status:** [x]

## T2 — OpenSpec envelope (.openspec.yaml + proposal + design)
- **depends-on:** T0
- **done-criteria:** `.openspec.yaml`, `proposal.md`, `design.md` declare axis, CG–CK order SPEC-0090..0094, non-goals (no CG–CK impl; never reopen L17–L24; no PRODUCTION_READY flip; CloudAgent out; no tip-pin rewrite), tip pins observed `dc75b5f…` / freeze `4383dc9…`.
- **status:** [x]

## T3 — Spec stub (optional) + tasks
- **depends-on:** T2
- **done-criteria:** `tasks.md` present; optional `specs/ladder-25-maturity-audit/spec.md` stub with invariants + NON-CLAIM fence.
- **status:** [x]

## T4 — Brief evidence pointer
- **depends-on:** T1
- **done-criteria:** `docs/evidence/EOS_LADDER_25_AUDIT_EVIDENCE_2026-09-18.md` pins observed HEAD + freeze + L24 MEASURED lineage + docs-only checklist.
- **status:** [x]

## T5 — APPLY + RESULT
- **depends-on:** T1, T2, T3, T4
- **done-criteria:** `/workspace/APPLY-LADDER-25-AUDIT.txt` + `/workspace/LADDER_25_AUDIT_RESULT.json` with status `LADDER_25_AUDIT_READY`; sha256 of package files; checks docs-only / no CG–CK impl / no tip refresh / no git push.
- **status:** [x]

## T6 — Host apply + verify:strict (host-only)
- **depends-on:** T5 (parent CopyFromBox)
- **done-criteria:** Parent copies docs/openspec; `npm run verify:strict` green (expect 914/0); commit docs-only. **Not executed on box.**
- **status:** [ ] host

## T7 — Open PR / merge CI green (host-only)
- **depends-on:** T6
- **done-criteria:** PR opened on `grok/ladder-25-maturity-audit`; CI green; merge to main.
- **status:** [ ] host

## T8 — Tip refresh post-audit merge (separate S1)
- **depends-on:** T7
- **done-criteria:** Separate tip-refresh mission pins freeze/matrix/m4 to post-audit tip; do not conflate with this docs-only change; do not rewrite pins in audit package.
- **status:** [ ] separate S1

## T9 — Start Mission CG harness (separate change)
- **depends-on:** T8
- **done-criteria:** Separate OpenSpec `eos-mission-cg-…` under SpecBoot; ZERO CG impl in audit branch.
- **status:** [ ] separate change
