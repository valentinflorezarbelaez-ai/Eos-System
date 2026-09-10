# Proposal — EOS T8 Dirty DEFER triage + L8 closeout

## Why

Ladder 8 audit **T8 / K8**: Untracked DEFER set grew (guides/standards stubs + historical foreign agents / lab / ATP png / quarantine KAIZEN dumps). Not fail-closed runtime, but dirty porcelain hurts tip honesty ops. T8 is the final L8 ROI — also tip-pin + formal L8 closeout after T7 #89 on main.

## What (this change only)

1. OpenSpec light (this proposal + design + tasks + .openspec.yaml)
2. Triage SSOT `docs/releases/EOS_T8_DIRTY_DEFER_TRIAGE_2026-09-09.md` — disposition table (PROMOTE / DEFER / IGNORE); **no mass delete**
3. Ritual `docs/harness/DIRTY_DEFER_TRIAGE_RITUAL.md`
4. L8 closeout `docs/releases/EOS_LADDER_8_CLOSEOUT_2026-09-09.md`
5. Tip pin freeze + matrix + m4 EXPECTED_TIP → live main@1b48ff5 (T7 #89)
6. Selective `.gitignore` IGNORE for lab / quarantine KAIZEN copies / unreferenced ATP png (files remain on disk; not deleted)
7. Lock + gate + `test:t8` + verify 3g19
8. Matrix MEASURED T2–T8 + L8 closeout row; PRODUCTION_READY=NO; Fundacion Delta=0

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- Mass delete / DISCARD of DEFER without PO names
- Force-commit foreign agent stubs / lab / secrets / Fundacion
- PRODUCTION_READY flip; PR open/merge; CloudAgent default; new schemas
