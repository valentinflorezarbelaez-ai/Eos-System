# EOS U2 CI seam-pack Ladder8 T2–T8 locks - 2026-09-09

**Branch:** cursor/eos-u2-ci-seam-pack-t2-t8
**Base main tip:** 78d76ddf0bfb4fdf70fb8ef5f5815a7253f90cb9 (U1 tip refresh #92 merged)
**Scope:** U2 ONLY (Ladder 9 K2) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)
**AT_CEILING:** yes (no new docs/schemas JSON)

## Goal (U2 / K2 DoD)

Extend GameDay/ROI seam-pack with Ladder8 T2–T8 locks not yet in CI: `test:t2`…`test:t8` (whatever exists in package.json). Keep prior L7/S/R/Q/P/N/M/ROI packs.
Fundacion delta-0. No soak. No new GH billing claims. Antigravity-first (no CloudAgent).

## Seams added to CI seam-pack

- `test:t2` (CI seam-pack L7 lock meta)
- `test:t3` (doctor/fusion-light L7 surfaces)
- `test:t4` (Mission OS / EVD observe pack)
- `test:t5` (KEEP PO prune HOLD)
- `test:t6` (complexity ceiling HOLD)
- `test:t7` (AGY workstation evidence)
- `test:t8` (dirty DEFER triage)

Kept: `test:s2`…`test:s6` + `test:specboot-agy` + prior R4-R5 / Q2-Q6 / P2-P6 / N2-N6 / M1-M4 / ROI3-6 / gameday:long-run.

## Deliverables

1. seam-pack job named pack includes t2..t8 (keep prior packs)
2. CI_CD_CONTRACT.md table + U2 note
3. assert-gha-contract checks for T2–T8 seams
4. TDD lock test:u2 + GHA-008 + m5 list
5. This release note + freeze U2 section + OpenSpec light
6. Dirty DEFER unchanged (unstaged)

## HITL caveat

No new job name. Fifth check still CI GameDay / ROI seam pack. RULE_CREATED_NOT_ENFORCED. No billing claims.

## Verify

assert-gha-contract; test:u2; test:m5; github-actions-cicd; Fundacion Delta=0.

## Non-claims

No Fuerza. No Fundacion mutation. No U3+. No soak. Compare-only. PRODUCTION_READY=NO. No new GH billing. No CloudAgent default. Inventory≠prune; HOLD≠executed prune; triage≠mass delete.
