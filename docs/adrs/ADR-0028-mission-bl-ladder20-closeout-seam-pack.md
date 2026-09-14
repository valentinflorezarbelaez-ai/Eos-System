# ADR-0028 — Mission BL Ladder 20 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Mission Continuity & Operator Fabric)
- **Spec:** SPEC-0069

## Context

Missions BH (SPEC-0065), BI (SPEC-0066), BJ (SPEC-0067), and BK (SPEC-0068)
MEASURED hermetic continuity/operator satellites (mission lifecycle state machine,
cross-session continuity & replay fabric, operator dashboard / HUD fabric,
governed external write orchestrator) with sealed receipts BH-RCPT-* / BI-RCPT-* /
BJ-RCPT-* / BK-RCPT-*. Ladder 19 (BC–BG), Ladder 18 (AX–BB), and Ladder 17 (AS–AW)
are CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened.

The remaining L20 gap from the 2026-09-14 audit / ADR-0023 is **Mission BL / SPEC-0069**:
require BH+BI+BJ+BK in CI `seam-pack` fail-closed, extend `test:native-suite-pack`,
add `test:mission-bl` / `test:bl20` / `test:l20` / `test:ladder20-pack`, slim-exclude
the lock, append contract notes, and publish the Ladder 20 closeout audit.

After BL, Ladder 20 is **CLOSED_FOR_LOCAL_GOVERNED_USE**. This ADR records that
closeout decision and the rejected alternatives that would reopen soak, flip
PRODUCTION_READY=YES, reopen L20 after closeout, or soft-fail the pack.

PRODUCTION_READY stays `NO`. Fundacion Δ stays `0`. Law VI held. Antigravity-first
(CloudAgent out). No rewrite of BH/BI/BJ/BK modules — compose via CI scripts only.

Base tip (expected): `dd225d9b9ca8851110ed6b38513e35c0092e02ff`
(StartsWith `dd225d9`; tip #294 / Mission BK MEASURED). WARN-continue — tip may land after.

## Decision

1. Idempotent CRLF-safe patcher `scripts/patch-mission-bl.mjs` consolidates
   BH/BI/BJ/BK into CI seam-pack:
   - Append four `npm run` lines to `.github/workflows/ci.yml` seam-pack
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Ensure primary satellite scripts + lifecycle/continuity/HUD/write aliases.
   - Extend `test:native-suite-pack`; add `test:mission-bl` / `test:bl20` /
     `test:l20` / `test:ladder20-pack`.
   - Slim-exclude `eos-bl-ladder20-seam-pack.test.js` (TR-01 ≤145).
   - Append Mission BL / Ladder 20 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when the file is present.
2. Lock suite `tests/eos-bl-ladder20-seam-pack.test.js` (BL1–BL20) reads
   `process.cwd()` so it runs against host or box fixtures.
3. Closeout `docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md` marks
   Ladder 20 **CLOSED_FOR_LOCAL_GOVERNED_USE** with BH+BI+BJ+BK+BL MEASURED,
   PRODUCTION_READY=NO, Fundacion Δ=0, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE.
4. Never reopen L17. Never reopen L18. Never reopen L19. Never reopen L20 after closeout.
   Never revert L20 from CLOSED_FOR_LOCAL_GOVERNED_USE after closeout.
5. Tip honesty ritual is a **separate** post-BL tip refresh (not this mission).

## Alternatives considered AND REJECTED

### A. Soak / continue-on-error pack

**Rejected.** Adding soak steps or `continue-on-error: true` to seam-pack would
make BH–BK failures non-blocking. That violates fail-closed CI (Law of evidence
over claims) and the L11–L19 closeout pattern (U/Y/AC/AH/AM/AR/AW/BB/BG). A
satellite that can fail without failing the job is not MEASURED in CI.

### B. PRODUCTION_READY=YES flip

**Rejected.** Treating Ladder 20 closeout as a PRODUCTION_READY=YES flip would
contradict evidence-over-claims doctrine and ADR-0023. CLOSED_FOR_LOCAL_GOVERNED_USE
still means PRODUCTION_READY=NO. Seam-pack ≠ GH Team/Enterprise enforcement;
local surrogate ≠ GH billing change. Required-check billing upgrades remain PO-only.

### C. Reopening L20 after closeout

**Rejected.** Failing to mark Ladder 20 CLOSED_FOR_LOCAL_GOVERNED_USE after BL, or scheduling a follow-on L20
satellite that reopens the ladder, would contradict the closeout dictamen.
After BL, L20 is CLOSED_FOR_LOCAL_GOVERNED_USE. Never reopen L20 after closeout.
(L17, L18, and L19 remain CLOSED and are also never reopened.)

### D. Soft-fail seam-pack

**Rejected.** A soft-fail / warn-only pack (allow BH–BK to report warnings while
the job stays green) is the same honesty failure as continue-on-error. Fail-closed
means any BH/BI/BJ/BK seam-pack job failure fails the CI contract. No soak. No
soft-fail. No continue-on-error.

## Consequences

- Host CI seam-pack requires BH+BI+BJ+BK fail-closed; Fundacion freeze kept.
- Box harness can apply the same patcher to `_fixtures/` and run BL1–BL20 PASS.
- SLIM stays ≤145 by excluding the BL lock (satellites already excluded).
- Ladder 20 closeout is recorded; L17/L18/L19 stay CLOSED; L20 never left OPEN.
- PRODUCTION_READY stays NO. Tip honesty deferred to a separate post-BL refresh.
- Envelope rigor (this ADR, EARS+BDD spec, evidence artifact) ships day one.

## NON-CLAIM

This closeout is **not**:

- a PRODUCTION_READY=YES flip
- GH Team/Enterprise enforcement / required-check billing upgrade
- a soak or continue-on-error pack
- a soft-fail seam-pack
- a rewrite of BH/BI/BJ/BK modules
- a CloudAgent path (Antigravity-first)
- a Fundacion writer (`fundacionDelta=0`)
- a tip honesty SSOT refresh (deferred post-BL)
- a reopen of L17, L18, L19, or L20 after closeout

Mission lifecycle ≠ full PM SaaS / Jira replacement.
Cross-session continuity ≠ HA multi-region SaaS / distributed clustering.
Operator HUD ≠ full observability SaaS / Grafana/Datadog replacement.
Governed external write ≠ unsupervised fleet deploy / K8s CD.
L20 seam-pack ≠ GH Team/Enterprise enforcement.

L17 CLOSED never reopen. L18 CLOSED never reopen (AX–BB MEASURED).
L19 CLOSED never reopen (BC–BG MEASURED).
L20 CLOSED_FOR_LOCAL_GOVERNED_USE after BL — never reopen L20 after closeout.

## Links

- SPEC-0069 — this change
- OpenSpec: `openspec/changes/eos-ladder-20-mission-bl/`
- Spec: `openspec/changes/eos-ladder-20-mission-bl/specs/mission-bl-ladder20-closeout-seam-pack/spec.md`
- Tests: `tests/eos-bl-ladder20-seam-pack.test.js` (BL1–BL20)
- Evidence: `docs/evidence/EOS_MISSION_BL_EVIDENCE_2026-09-14.md`
- Closeout: `docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md`
- Release: `docs/releases/EOS_MISSION_BL_LADDER20_SEAM_PACK_2026-09-14.md`
- Branch: `grok/mission-bl-ladder20-closeout-seam-pack`
- Host SHA: TBD until bootstrap
- Base tip: `dd225d9b9ca8851110ed6b38513e35c0092e02ff` (#294 · BK MEASURED)
- PR: TBD until bootstrap
