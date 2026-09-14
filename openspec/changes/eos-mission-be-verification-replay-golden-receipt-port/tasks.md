# Tasks — Mission BE (SPEC-0062)

DAG for Verification Replay & Golden Receipt Port. Each task names
depends-on, a verifiable done-criterion, and evidence. Honesty: box envelope
and box tests are MEASURED; host SHA / verify:strict / SLIM / PR are TBD
until bootstrap.

## T0 — OpenSpec proposal / design / spec EARS+BDD envelope

- **Status:** [x]
- **Depends-on:** none
- **Done-criteria:** `proposal.md`, `design.md`, and `specs/.../spec.md` exist
  under `openspec/changes/eos-mission-be-verification-replay-golden-receipt-port/`;
  spec uses all four EARS patterns (WHEN / WHILE / IF…THEN / THE SYSTEM SHALL)
  and every Scenario uses formal GIVEN/WHEN/THEN/AND with state invariants
  (`ok` / `code` / `receipt.sealed` / `fundacionDelta` / `PRODUCTION_READY`);
  dedicated NON-CLAIM fence section is present.
- **Evidence:** this change folder; spec maps BE1–BE18.

## T1 — ADR-0020 with rejected alternatives

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `docs/adrs/ADR-0020-mission-be-verification-replay-golden-receipt-port.md`
  exists with Status Accepted (local governed), Date 2026-09-13, Context,
  Decision, ≥3 rejected alternatives with technical reasons (live re-run
  verify:strict in CI as product; SIEM streaming port; rewriting AJ/AL into
  delivery; soft-match/continue-on-drift), Consequences, NON-CLAIM, and Links
  to SPEC-0062 / OpenSpec / tests / evidence.
- **Evidence:** ADR-0020 path below.

## T2 — Boundary + policy-gate modules

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `src/core/delivery/golden-receipt-boundary.js` and
  `src/core/delivery/replay-policy-gate.js` exist; they export normalize /
  Fundacion detect / secret scrub / custody / mismatch / HITL / DENY
  helpers; they do not overwrite BC/BD siblings.
- **Evidence:** BE3, BE4, BE5, BE6, BE7, BE8, BE9 (`npm run test:mission-be`).

## T3 — Receipt module

- **Status:** [x]
- **Depends-on:** T2
- **Done-criteria:** `src/core/delivery/replay-receipt.js` seals receipts via
  `stableStringify` + `sha256Canonical` (`node:crypto`); `receipt.sealed` is
  true on both MATCHED and DENY; secrets never sealed.
- **Evidence:** BE2, BE9, BE12 (`npm run test:mission-be`).

## T4 — Facade port + phases

- **Status:** [x]
- **Depends-on:** T2, T3
- **Done-criteria:** `createVerificationReplayGoldenReceiptPort` / `replay`
  implement VALIDATE → GATE → REPLAY → COMPARE → SEAL; DENY paths skip
  REPLAY/COMPARE when gated and still SEAL; injectable AJ/AL/BC/BD observe
  ports compose only.
- **Evidence:** BE1, BE10, BE11, BE13, BE17 (`npm run test:mission-be`).

## T5 — Hermetic tests BE1–BE18

- **Status:** [x]
- **Depends-on:** T4
- **Done-criteria:** `tests/eos-be-verification-replay-golden-receipt-port.test.js`
  reports **18/18 PASS** via `node --test` and `npm run test:mission-be`.
- **Evidence:** BE1–BE18; box `BOX_GREEN.md`;
  `docs/evidence/EOS_MISSION_BE_EVIDENCE_2026-09-13.md`.

## T6 — Patcher + SLIM exclude

- **Status:** [x] (patcher written; host SLIM TBD)
- **Depends-on:** T5
- **Done-criteria:** `scripts/patch-mission-be.mjs` idempotently adds
  `test:mission-be` / `test:verification-replay` and
  `SLIM_SUITE_EXCLUDES` basename
  `eos-be-verification-replay-golden-receipt-port.test.js` (CRLF-safe);
  host SLIM_COUNT ≤145 after bootstrap.
- **Evidence:** `PACKAGE_SCRIPTS_NOTE.md`; host SLIM TBD in evidence doc.

## T7 — Law VI MODULE_DIR CLEAN

- **Status:** [x]
- **Depends-on:** T2, T3, T4
- **Done-criteria:** Law VI scan of `src/core/delivery` only (never `tests/`)
  is CLEAN (0 contiguous forbidden provider-prefix literals); BE8 PASS.
- **Evidence:** BE8, BE9; evidence doc Law VI CLEAN row.

## T8 — Evidence artifact doc

- **Status:** [x] (box written; host placeholders TBD)
- **Depends-on:** T5, T7, T1
- **Done-criteria:** `docs/evidence/EOS_MISSION_BE_EVIDENCE_2026-09-13.md`
  records measured box facts only: 18/18, Law VI CLEAN, `node --check` PASS,
  PRODUCTION_READY=NO, Fundacion Δ=0; host SHA / verify:strict / SLIM / PR
  marked TBD until bootstrap.
- **Evidence:** that path.

## T9 — Host bootstrap + verify:strict + code commit/push

- **Status:** [ ] (pending parent host bootstrap)
- **Depends-on:** T5, T6, T7
- **Done-criteria:** host ran bootstrap/patch; `npm run test:mission-be` 18/18;
  SLIM≤145; `npm run verify:strict` recorded; single feat commit
  `feat(delivery): Verification Replay & Golden Receipt Port (SPEC-0062)`
  on branch `grok/mission-be-verification-replay-golden-receipt-port`.
- **Evidence:** pending host. Placeholders in evidence doc: Host SHA TBD;
  verify:strict TBD; SLIM TBD; PR TBD.

## T10 — Host envelope confirm + PR

- **Status:** [ ]
- **Depends-on:** T0, T1, T8, T9
- **Done-criteria:** ADR-0020, evidence doc, spec/tasks/design, and bootstrap
  path-list are on the host worktree in the feat commit; PR opened (or
  successor). Host SHA recorded over the evidence TBD placeholders.
- **Evidence:** pending host push. Placeholder:
  `Host SHA / verify:strict / PR: TBD until bootstrap`.
