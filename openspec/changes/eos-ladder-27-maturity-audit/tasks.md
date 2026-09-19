# Tasks — eos-ladder-27-maturity-audit (DAG)

Docs-only envelope. ZERO implementation of CQ–CU. Do NOT start Mission CQ. Audit ≠ L27 OPEN until tip-refresh. Host apply / PR / tip-refresh are post-payload gates.

## T0 — Payload scaffold
- **depends-on:** (none)
- **done-criteria:** `/workspace/eos-ladder-27-audit/` exists with `docs/`, `openspec/`; no `src/` tree; APPLY + RESULT + READY in package.
- **status:** [x]

## T1 — Audit document (sections 1–9)
- **depends-on:** T0
- **done-criteria:** `docs/releases/EOS_MATURITY_LADDER_27_AUDIT_2026-09-19.md` present with tip honesty (freeze FULL `64227127…` / merge HEAD ~ `56cdfd08`), CLOSED inventory L11–L26 + post-L26 A–F, axis **Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric**, ranked gaps CQ–CU, OUT OF SCOPE, ordered ladder, Mission CQ / L27 OPEN entry criteria, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE, evidence pointers; L17–L26 NEVER REOPEN; Audit ≠ L27 OPEN until tip-refresh; PRODUCTION_READY=NO; Fundacion Δ=0; schemas AT_CEILING; do not start CQ.
- **status:** [x]

## T2 — ADR-0068
- **depends-on:** T0
- **done-criteria:** `docs/adrs/ADR-0068-ladder-27-maturity-gap-audit.md` records axis choice, alternatives rejected (incl. sole prune axis), NON-CLAIMs, never reopen L17–L26.
- **status:** [x]

## T3 — OpenSpec envelope (.openspec.yaml + proposal + design)
- **depends-on:** T0
- **done-criteria:** `.openspec.yaml`, `proposal.md`, `design.md` declare axis, CQ–CU order SPEC-0100..0104, non-goals (no CQ–CU impl; never reopen L17–L26; no PRODUCTION_READY flip; CloudAgent out; no tip-pin rewrite; no new schemas JSON; do not start CQ; audit ≠ L27 OPEN), tip pins freeze `64227127…` / merge HEAD ~ `56cdfd08`.
- **status:** [x]

## T4 — Spec stub + tasks
- **depends-on:** T3
- **done-criteria:** `tasks.md` present; `specs/ladder-27-maturity-audit/spec.md` stub with invariants + NON-CLAIM fence.
- **status:** [x]

## T5 — Brief evidence pointer
- **depends-on:** T1
- **done-criteria:** `docs/evidence/EOS_LADDER_27_AUDIT_EVIDENCE_2026-09-19.md` pins freeze + merge HEAD + L26 MEASURED lineage + post-L26 A–F OBSERVED sources + docs-only checklist.
- **status:** [x]

## T6 — APPLY + RESULT + READY
- **depends-on:** T1, T2, T3, T4, T5
- **done-criteria:** `APPLY-LADDER-27-AUDIT.txt` + `RESULT.json` with status `LADDER_27_AUDIT_READY` + READY marker; sha256 of package files; checks docs-only / no CQ–CU impl / no tip refresh / no git push / do not start CQ / audit ≠ L27 OPEN.
- **status:** [x]

## T7 — Host apply + verify:strict (host-only)
- **depends-on:** T6 (parent CopyFromBox)
- **done-criteria:** Parent copies docs/adrs/openspec; `npm run verify:strict` green (expect 914/0); commit docs-only. **Not executed on box.**
- **status:** [ ] host

## T8 — Open PR / merge CI green (host-only)
- **depends-on:** T7
- **done-criteria:** PR opened on `grok/ladder-27-maturity-audit`; CI green; merge to main.
- **status:** [ ] host

## T9 — Tip refresh post-audit merge (separate S1)
- **depends-on:** T8
- **done-criteria:** Separate tip-refresh mission pins freeze/matrix/m4 to post-audit tip and formally marks L27 OPEN; do not conflate with this docs-only change; do not rewrite pins in audit package; audit alone ≠ L27 OPEN.
- **status:** [ ] separate S1

## T10 — Start Mission CQ harness (separate change)
- **depends-on:** T9
- **done-criteria:** Separate OpenSpec `eos-mission-cq-…` under SpecBoot; ZERO CQ impl in audit branch; do not start CQ in this package.
- **status:** [ ] separate change
