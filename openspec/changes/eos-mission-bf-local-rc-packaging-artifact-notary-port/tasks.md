# Tasks — Mission BF (SPEC-0063)

DAG for Local Release Candidate Packaging & Artifact Notary Port. Each task
names depends-on, a verifiable done-criterion, and evidence. Honesty: box
envelope and box tests are MEASURED; host SHA / verify:strict / SLIM / PR are
TBD until bootstrap.

## T0 — OpenSpec proposal / design / spec EARS+BDD envelope

- **Status:** [x]
- **Depends-on:** none
- **Done-criteria:** `proposal.md`, `design.md`, and `specs/.../spec.md` exist
  under `openspec/changes/eos-mission-bf-local-rc-packaging-artifact-notary-port/`;
  spec uses all four EARS patterns (WHEN / WHILE / IF…THEN / THE SYSTEM SHALL)
  and every Scenario uses formal GIVEN/WHEN/THEN/AND with state invariants
  (`ok` / `code` / `receipt.sealed` / `fundacionDelta` / `PRODUCTION_READY`);
  dedicated NON-CLAIM fence section is present.
- **Evidence:** this change folder; spec maps BF1–BF18.

## T1 — ADR-0021 with rejected alternatives

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `docs/adrs/ADR-0021-mission-bf-local-rc-packaging-artifact-notary-port.md`
  exists with Status Accepted (local governed), Date 2026-09-14, Context,
  Decision, ≥3 rejected alternatives with technical reasons (live GH Releases
  publish port; public npm/registry publish as product; rewriting AQ into
  delivery; soft-allow PRODUCTION_READY=YES flip), Consequences, NON-CLAIM,
  and Links to SPEC-0063 / OpenSpec / tests / evidence.
- **Evidence:** ADR-0021 path below.

## T2 — Boundary + policy-gate modules

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `src/core/delivery/rc-package-boundary.js` and
  `src/core/delivery/rc-packaging-policy-gate.js` exist; they export normalize /
  Fundacion detect / secret scrub / PR-YES / publish intent / custody / HITL /
  DENY helpers; they do not overwrite BC/BD/BE siblings.
- **Evidence:** BF3, BF4, BF5, BF6, BF7, BF8, BF9 (`npm run test:mission-bf`).

## T3 — Receipt module

- **Status:** [x]
- **Depends-on:** T2
- **Done-criteria:** `src/core/delivery/notary-receipt.js` seals receipts via
  `stableStringify` + `sha256Canonical` (`node:crypto`); `receipt.sealed` is
  true on both PACKAGED and DENY; secrets never sealed; `BF-RCPT-*` ids.
- **Evidence:** BF2, BF9, BF12 (`npm run test:mission-bf`).

## T4 — Facade port + phases

- **Status:** [x]
- **Depends-on:** T2, T3
- **Done-criteria:** `createLocalRcPackagingArtifactNotaryPort` /
  `packageAndNotarize` implement VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL;
  DENY paths skip PACKAGE/NOTARIZE when gated and still SEAL; injectable
  AQ/BC/BD/BE observe ports compose only.
- **Evidence:** BF1, BF10, BF11, BF13, BF17 (`npm run test:mission-bf`).

## T5 — Hermetic tests BF1–BF18

- **Status:** [x]
- **Depends-on:** T4
- **Done-criteria:** `tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js`
  reports **18/18 PASS** via `node --test` and `npm run test:mission-bf`.
- **Evidence:** BF1–BF18; box `BOX_GREEN.md`;
  `docs/evidence/EOS_MISSION_BF_EVIDENCE_2026-09-14.md`.

## T6 — Patcher + SLIM exclude

- **Status:** [x] (patcher written; host SLIM TBD)
- **Depends-on:** T5
- **Done-criteria:** `scripts/patch-mission-bf.mjs` idempotently adds
  `test:mission-bf` / `test:local-rc-packaging` and
  `SLIM_SUITE_EXCLUDES` basename
  `eos-bf-local-rc-packaging-artifact-notary-port.test.js` (CRLF-safe);
  host SLIM_COUNT ≤145 after bootstrap.
- **Evidence:** `PACKAGE_SCRIPTS_NOTE.md`; host SLIM TBD in evidence doc.

## T7 — Law VI MODULE_DIR CLEAN

- **Status:** [x]
- **Depends-on:** T2, T3, T4
- **Done-criteria:** Law VI scan of `src/core/delivery` only (never `tests/`)
  is CLEAN (0 contiguous forbidden provider-prefix literals); BF8 PASS.
- **Evidence:** BF8, BF9; evidence doc Law VI CLEAN row.

## T8 — Evidence artifact doc

- **Status:** [x] (box written; host placeholders TBD)
- **Depends-on:** T5, T7, T1
- **Done-criteria:** `docs/evidence/EOS_MISSION_BF_EVIDENCE_2026-09-14.md`
  records measured box facts only: 18/18, Law VI CLEAN, `node --check` PASS,
  PRODUCTION_READY=NO, Fundacion Δ=0; host SHA / verify:strict / SLIM / PR
  marked TBD until bootstrap.
- **Evidence:** that path.

## T9 — Host bootstrap + verify:strict + code commit/push

- **Status:** [ ] (pending parent host bootstrap)
- **Depends-on:** T5, T6, T7
- **Done-criteria:** host ran bootstrap/patch; `npm run test:mission-bf` 18/18;
  SLIM≤145; `npm run verify:strict` recorded; single feat commit
  `feat(delivery): Local Release Candidate Packaging & Artifact Notary Port (SPEC-0063)`
  on branch `grok/mission-bf-local-rc-packaging-artifact-notary-port`.
- **Evidence:** pending host. Placeholders in evidence doc: Host SHA TBD;
  verify:strict TBD; SLIM TBD; PR TBD.

## T10 — Host envelope confirm + PR

- **Status:** [ ]
- **Depends-on:** T0, T1, T8, T9
- **Done-criteria:** ADR-0021, evidence doc, spec/tasks/design, and bootstrap
  path-list are on the host worktree in the feat commit; PR opened (or
  successor). Host SHA recorded over the evidence TBD placeholders.
- **Evidence:** pending host push. Placeholder:
  `Host SHA / verify:strict / PR: TBD until bootstrap`.
