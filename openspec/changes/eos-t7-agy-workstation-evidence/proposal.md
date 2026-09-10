# Proposal — EOS T7 Antigravity eos-workstation evidence

## Why

Ladder 8 audit **T7 / K7**: AGY-first docs closed; install gaps remain (`agy` binary local, `agy-daemon.cmd install --name eos-workstation` Admin HITL, status confirm). OpenSpec CLI optional. Next maturity = **operator checklist + honest status evidence + fail-closed smoke** that does **not** require Admin and does **not** pretend the daemon is installed when absent.

## What (this change only)

1. OpenSpec light (this proposal + design + tasks + .openspec.yaml)
2. Checklist runbook `docs/harness/AGY_WORKSTATION_CHECKLIST.md`
3. Evidence `docs/releases/EOS_T7_AGY_WORKSTATION_EVIDENCE_2026-09-09.md` — honest probe snapshot (local agy / daemon / OpenSpec CLI / CloudAgent)
4. Verify lock `scripts/lib/agy-workstation-lock.js` + smoke gate `scripts/ci/agy-workstation-smoke.js` (NON-MUTATING; no Admin; no install)
5. TDD `test:t7`; wire verify-eos 3g18 + REQUIRED_PATHS
6. Freeze T7 + matrix MEASURED; pointer in ANTIGRAVITY_FIRST.md §5
7. NON-CLAIM: checklist ≠ daemon installed; smoke ≠ Admin install; evidence ≠ pretend; CloudAgent out of path ≠ ban local Cursor IDE

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- Admin daemon install / Task Scheduler registration
- Pretending eos-workstation daemon INSTALLED when `agy-daemon.cmd status` says Not installed
- Requiring OpenSpec CLI
- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; T8 force-commit DEFER; CloudAgent default; new schemas
