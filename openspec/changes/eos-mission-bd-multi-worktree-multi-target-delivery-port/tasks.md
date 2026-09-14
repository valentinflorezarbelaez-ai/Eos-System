# Tasks — Mission BD (SPEC-0061)

DAG for Multi-Worktree / Multi-Target Delivery Port. Each task names
depends-on, a verifiable done-criterion, and evidence. Honesty: box envelope
and host code path are MEASURED; host envelope follow-up commit and PR merge
are still pending.

## T0 — OpenSpec proposal / design / spec EARS+BDD envelope

- **Status:** [x]
- **Depends-on:** none
- **Done-criteria:** `proposal.md`, `design.md`, and `specs/.../spec.md` exist
  under `openspec/changes/eos-mission-bd-multi-worktree-multi-target-delivery-port/`;
  spec uses all four EARS patterns (WHEN / WHILE / IF…THEN / THE SYSTEM SHALL)
  and every Scenario uses formal GIVEN/WHEN/THEN/AND with state invariants
  (`ok` / `code` / `receipt.sealed` / `fundacionDelta` / `PRODUCTION_READY`).
- **Evidence:** this change folder; spec maps BD1–BD18.
- **Note:** thin first-pass files replaced 2026-09-13 with full envelope.

## T1 — ADR-0019 with rejected alternatives

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `docs/adrs/ADR-0019-mission-bd-multi-worktree-multi-target-delivery-port.md`
  exists with Status Accepted (local governed), Date 2026-09-13, Context,
  Decision, ≥3 rejected alternatives with technical reasons, Consequences,
  NON-CLAIM, and Links to SPEC-0061 / OpenSpec / tests / evidence.
- **Evidence:** ADR-0019 path below.

## T2 — Boundary + policy-gate modules

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `src/core/delivery/delivery-target-boundary.js` and
  `src/core/delivery/delivery-policy-gate.js` exist; they export normalize /
  Fundacion detect / secret scrub / allowlist / DENY helpers; they do not
  overwrite BC siblings.
- **Evidence:** BD3, BD4, BD5, BD6, BD7, BD8, BD9 (`npm run test:mission-bd`).

## T3 — Receipt module

- **Status:** [x]
- **Depends-on:** T2
- **Done-criteria:** `src/core/delivery/delivery-receipt.js` seals receipts via
  `stableStringify` + `sha256Canonical` (`node:crypto`); `receipt.sealed` is
  true on both DELIVERED and DENY; secrets never sealed.
- **Evidence:** BD2, BD9, BD12 (`npm run test:mission-bd`).

## T4 — Facade port + phases

- **Status:** [x]
- **Depends-on:** T2, T3
- **Done-criteria:** `createMultiWorktreeMultiTargetDeliveryPort` / `deliver`
  implement VALIDATE → GATE → DELIVER → SEAL; DENY paths skip DELIVER and
  still SEAL; injectable AN/BA/BC observe ports compose only.
- **Evidence:** BD1, BD10, BD11, BD13, BD17 (`npm run test:mission-bd`).

## T5 — Hermetic tests BD1–BD18

- **Status:** [x]
- **Depends-on:** T4
- **Done-criteria:** `tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js`
  reports **18/18 PASS** via `node --test` and `npm run test:mission-bd`.
- **Evidence:** BD1–BD18; box `BOX_GREEN.md`;
  `docs/evidence/EOS_MISSION_BD_EVIDENCE_2026-09-13.md`.

## T6 — Patcher + SLIM exclude

- **Status:** [x]
- **Depends-on:** T5
- **Done-criteria:** `scripts/patch-mission-bd.mjs` idempotently adds
  `test:mission-bd` / `test:multi-target-delivery` and
  `SLIM_SUITE_EXCLUDES` basename
  `eos-bd-multi-worktree-multi-target-delivery-port.test.js` (CRLF-safe);
  host SLIM_COUNT = 145 (≤145).
- **Evidence:** `PACKAGE_SCRIPTS_NOTE.md`; host SLIM=145 in evidence doc.

## T7 — Law VI MODULE_DIR CLEAN

- **Status:** [x]
- **Depends-on:** T2, T3, T4
- **Done-criteria:** Law VI scan of `src/core/delivery` only (never `tests/`)
  is CLEAN (0 contiguous forbidden provider-prefix literals); BD8 PASS.
- **Evidence:** BD8, BD9; evidence doc Law VI CLEAN row.

## T8 — Evidence artifact doc

- **Status:** [x] (box written)
- **Depends-on:** T5, T7, T1
- **Done-criteria:** `docs/evidence/EOS_MISSION_BD_EVIDENCE_2026-09-13.md`
  records measured facts only: base tip #275, branch + code commit `e2cc34b`,
  18/18, Law VI CLEAN, verify:strict 914/0, SLIM=145, BD10 BC-sibling note,
  PRODUCTION_READY=NO, Fundacion Δ=0; envelope follow-up commit left pending.
- **Evidence:** that path.

## T9 — Host bootstrap + verify:strict 914 + code commit/push

- **Status:** [x] (code path MEASURED on host; PR not merged)
- **Depends-on:** T5, T6, T7
- **Done-criteria:** host ran bootstrap/patch; `npm run test:mission-bd` 18/18;
  SLIM=145; `npm run verify:strict` **914/0**; code commit
  `e2cc34b4474ae72b435aa583d99e98ea0b5a1e6c` on branch
  `grok/mission-bd-multi-worktree-multi-target-delivery-port`; PR #276 open.
- **Evidence:** evidence doc; PR #276.
- **Honesty:** PR merge is **not** done. Envelope files in this payload
  (T0/T1/T8 follow-up) are **not** in `e2cc34b` — they need a host follow-up
  commit (parent; no box `git push`).

## T10 — Host envelope follow-up + PR merge

- **Status:** [ ]
- **Depends-on:** T0, T1, T8, T9
- **Done-criteria:** ADR-0019, evidence doc, upgraded spec/tasks/design, and
  bootstrap path-list updates are copied onto the host worktree, committed,
  pushed, and PR #276 is merged (or a successor PR lands). Envelope follow-up
  commit SHA recorded in the evidence doc placeholder.
- **Evidence:** pending host push. Placeholder:
  `Envelope follow-up commit: (pending host push)`.
