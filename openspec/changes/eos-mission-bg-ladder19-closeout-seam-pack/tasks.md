# Tasks — Mission BG (SPEC-0064)

DAG for Ladder 19 CI Seam-Pack Consolidation & Closeout. Each task names
depends-on, a verifiable done-criterion, and evidence. Honesty: box envelope
and box tests are MEASURED; host SHA / verify:strict / SLIM / PR are TBD
until bootstrap.

## T0 — OpenSpec proposal / design / spec EARS+BDD envelope

- **Status:** [x]
- **Depends-on:** none
- **Done-criteria:** `proposal.md`, `design.md`, `tasks.md`, and
  `specs/mission-bg-ladder19-closeout-seam-pack/spec.md` exist under
  `openspec/changes/eos-mission-bg-ladder19-closeout-seam-pack/`; spec uses
  all four EARS patterns (WHEN / WHILE / IF…THEN / THE SYSTEM SHALL) and
  every Scenario uses formal GIVEN/WHEN/THEN/AND; dedicated NON-CLAIM fence
  section is present; `.openspec.yaml` pins SPEC-0064.
- **Evidence:** this change folder; spec maps BG1–BG18.

## T1 — ADR-0022 with rejected alternatives

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `docs/adrs/ADR-0022-mission-bg-ladder19-closeout-seam-pack.md`
  exists with Status Accepted (local governed), Date 2026-09-14, Context,
  Decision, ≥3 rejected alternatives with technical reasons (soak/continue-on-error
  pack; GH required-check billing upgrade as product; reopening L19 after
  closeout; soft-fail seam-pack), Consequences, NON-CLAIM, and Links to
  SPEC-0064 / OpenSpec / tests / evidence.
- **Evidence:** ADR-0022 path; BG18.

## T2 — Idempotent CRLF-safe patcher

- **Status:** [x]
- **Depends-on:** T0
- **Done-criteria:** `scripts/patch-mission-bg.mjs` patches ci.yml seam-pack
  (4 L19 npm run lines; Fundacion kept; no soak; no continue-on-error),
  package.json (primaries + aliases + ladder19-pack + mission-bg/bg19/l19 +
  native-suite-pack), SLIM_SUITE_EXCLUDES, CI_CD_CONTRACT.md, and optional
  assert-gha needles. Line matchers use `[^\r\n]*` and `[\s\S]`. Idempotent
  on second run. No rewrite of BC/BD/BE/BF modules.
- **Evidence:** BG1–BG6, BG10, BG13, BG14; box harness first run applied /
  second run no-op.

## T3 — Box fixtures + lock suite BG1–BG18

- **Status:** [x]
- **Depends-on:** T2
- **Done-criteria:** `_fixtures/` stubs (ci.yml, package.json, test-runner.js,
  CI_CD_CONTRACT.md, assert-gha-contract.js) exist; lock
  `tests/eos-bg-ladder19-seam-pack.test.js` reports **≥16 PASS** via
  `node --test` after patcher against fixtures. Tests read `process.cwd()`.
- **Evidence:** BG1–BG18; `BOX_GREEN.md`; `PACKAGE_SCRIPTS_NOTE.md`.

## T4 — Closeout + release + fragment

- **Status:** [x]
- **Depends-on:** T0, T1
- **Done-criteria:** `docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md`
  states Ladder 19 **CLOSED_FOR_LOCAL_GOVERNED_USE**, BC–BF+BG MEASURED,
  PRODUCTION_READY=NO, Fundacion Δ=0, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE,
  L17/L18 CLOSED never reopen, never reopen L19 after closeout, axis
  Sovereign Delivery & Verification Fabric; release note
  `docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md`; fragment
  `docs/governance/CI_CD_CONTRACT.ladder19-fragment.md`. BG docs must not
  revert L19 from CLOSED_FOR_LOCAL_GOVERNED_USE.
- **Evidence:** BG7, BG8, BG11, BG15, BG16, BG17, BG18.

## T5 — Evidence artifact doc

- **Status:** [x] (box written; host placeholders TBD)
- **Depends-on:** T3, T4, T1
- **Done-criteria:** `docs/evidence/EOS_MISSION_BG_EVIDENCE_2026-09-14.md`
  records measured box facts only: ≥16 PASS, Law VI CLEAN, patcher applied /
  no-op, PRODUCTION_READY=NO, Fundacion Δ=0; host SHA / verify:strict / SLIM /
  PR marked TBD until bootstrap.
- **Evidence:** that path.

## T6 — Bootstrap + BOX_GREEN + PACKAGE_SCRIPTS_NOTE

- **Status:** [x] (scripts written; host run pending)
- **Depends-on:** T2, T3, T4, T5
- **Done-criteria:** `MISSION_BG_BOOTSTRAP.ps1` Expected `37a36e9`; copies
  closeout+fragment+ADR+evidence+openspec+patcher+lock; runs patcher;
  runs `test:mission-bg` / `test:ladder19-pack` (or lock suite); slim≤145;
  verify:strict; commit; push. `BOX_GREEN.md` documents fixture harness vs
  host real ci.yml/package.json patch.
- **Evidence:** `/workspace/MISSION_BG_BOOTSTRAP.ps1`; payload copy; BOX_GREEN.

## T7 — Law VI CLEAN (patcher + lock + envelope; MODULE_DIR if present)

- **Status:** [x]
- **Depends-on:** T2, T3
- **Done-criteria:** Law VI scan of patcher + lock + closeout/release/fragment/
  ADR/evidence (and `src/` MODULE_DIR if present; never embed contiguous
  forbidden provider-prefix literals) is CLEAN. BG12 PASS.
- **Evidence:** BG12; evidence doc Law VI CLEAN row.

## T8 — Host bootstrap + verify:strict + commit/push

- **Status:** [ ] (pending parent host bootstrap)
- **Depends-on:** T3, T6, T7
- **Done-criteria:** host ran bootstrap/patch; `npm run test:mission-bg` ≥16;
  SLIM≤145; `npm run verify:strict` recorded; single feat commit
  `feat(delivery): Ladder 19 CI Seam-Pack Consolidation & Closeout (SPEC-0064)`
  on branch `grok/mission-bg-ladder19-closeout-seam-pack`. Tip honesty NOT
  done here (separate post-BG tip refresh).
- **Evidence:** pending host. Placeholders in evidence doc: Host SHA TBD;
  verify:strict TBD; SLIM TBD; PR TBD.
