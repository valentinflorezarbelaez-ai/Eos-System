# Proposal — EOS U5 AGY daemon Admin HITL checklist (optional)

## Why

Ladder 9 audit **U5 / K5**: T7 closed honest **DAEMON_ABSENT** evidence. Admin HITL `agy-daemon.cmd install --name eos-workstation` remains optional and pending. U5 delivers the **Admin HITL checklist + fail-closed evidence extension** without performing the install and without pretending PRESENT.

## What (this change only)

1. OpenSpec light folder (this proposal + tasks + .openspec.yaml)
2. Admin HITL checklist `docs/harness/AGY_ADMIN_HITL_CHECKLIST.md` — documents `adminRequired=true` install path; forbids execute-in-CI / smoke install
3. Evidence `docs/releases/EOS_U5_AGY_ADMIN_HITL_CHECKLIST_2026-09-09.md` — status remains **DAEMON_ABSENT** / **Not installed** unless PRESENT proven
4. Lock `scripts/lib/agy-admin-hitl-lock.js` + gate `scripts/ci/agy-admin-hitl-checklist.js` (NON-MUTATING; extends T7; never runs install)
5. TDD `tests/eos-u5-agy-admin-hitl-checklist.test.js` + `test:u5`
6. verify-eos REQUIRED_PATHS; freeze U5 + matrix MEASURED; pointers in AGY_WORKSTATION_CHECKLIST + ANTIGRAVITY_FIRST
7. NON-CLAIM: checklist ≠ daemon installed; adminRequired path documented ≠ executed; no pretend; CloudAgent out of path

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- Admin daemon install / elevated Task Scheduler registration in this branch
- Pretending eos-workstation daemon INSTALLED when `agy-daemon.cmd status` says Not installed
- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; U6+; CloudAgent default; new schemas JSON; stage DEFER dirty
