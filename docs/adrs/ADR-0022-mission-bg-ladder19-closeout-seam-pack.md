# ADR-0022 — Mission BG Ladder 19 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Delivery & Verification Fabric)
- **Spec:** SPEC-0064

## Context

Missions BC (SPEC-0060), BD (SPEC-0061), BE (SPEC-0062), and BF (SPEC-0063)
MEASURED hermetic delivery/verification satellites (governed patch apply,
multi-target delivery, verification replay / golden receipts, local RC
packaging & artifact notary). Ladder 18 (AX–BB) and Ladder 17 (AS–AW) are
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened.

The remaining L19 gap from the 2026-09-13 audit is **Mission BG / SPEC-0064**:
require BC+BD+BE+BF in CI `seam-pack` fail-closed, extend `test:native-suite-pack`,
add `test:mission-bg` / `test:bg19` / `test:l19` / `test:ladder19-pack`, slim-exclude
the lock, append contract notes, and publish the Ladder 19 closeout audit.

After BG, Ladder 19 is **CLOSED_FOR_LOCAL_GOVERNED_USE**. This ADR records that
closeout decision and the rejected alternatives that would reopen soak, GH
billing/enforcement product claims, L19 after closeout, or a soft-fail pack.

PRODUCTION_READY stays `NO`. Fundacion Δ stays `0`. Law VI held. Antigravity-first
(CloudAgent out). No rewrite of BC/BD/BE/BF modules — compose via CI scripts only.

Base tip (expected): `37a36e9f0ed9dab61b3d997edd777e49d2eb7a16`
(StartsWith `37a36e9`; #280 BF MEASURED). WARN-continue — tip-280 may land after.

## Decision

1. Idempotent CRLF-safe patcher `scripts/patch-mission-bg.mjs` consolidates
   BC/BD/BE/BF into CI seam-pack:
   - Append four `npm run` lines to `.github/workflows/ci.yml` seam-pack
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Ensure primary satellite scripts + `test:mission-bc/bd/be/bf` aliases.
   - Extend `test:native-suite-pack`; add `test:mission-bg` / `test:bg19` /
     `test:l19` / `test:ladder19-pack`.
   - Slim-exclude `eos-bg-ladder19-seam-pack.test.js` (TR-01 ≤145).
   - Append Mission BG / Ladder 19 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when the file is present.
2. Lock suite `tests/eos-bg-ladder19-seam-pack.test.js` (BG1–BG18) reads
   `process.cwd()` so it runs against host or box fixtures.
3. Closeout `docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md` marks
   Ladder 19 **CLOSED_FOR_LOCAL_GOVERNED_USE** with BC+BD+BE+BF+BG MEASURED,
   PRODUCTION_READY=NO, Fundacion Δ=0, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE.
4. Never reopen L17. Never reopen L18. Never reopen L19 after closeout.
   Never revert L19 from CLOSED_FOR_LOCAL_GOVERNED_USE after closeout.
5. Tip honesty ritual is a **separate** post-BG tip refresh (not this mission).

## Alternatives considered AND REJECTED

### A. Soak / continue-on-error pack

**Rejected.** Adding soak steps or `continue-on-error: true` to seam-pack would
make BC–BF failures non-blocking. That violates fail-closed CI (Law of evidence
over claims) and the L11–L18 closeout pattern (U/Y/AC/AH/AM/AR/AW/BB). A
satellite that can fail without failing the job is not MEASURED in CI.

### B. GH required-check billing upgrade as product

**Rejected.** Treating the seam-pack lock as a GitHub Team/Enterprise required-check
enforcement upgrade (or a billing-tier product) would claim GH enforcement that
this local governed surrogate does not provide. NON-CLAIM: seam-pack ≠ GH
Team/Enterprise enforcement; local surrogate ≠ GH billing change. Required-check
billing upgrades remain PO-only.

### C. Reopening L19 after closeout

**Rejected.** Failing to mark Ladder 19 CLOSED_FOR_LOCAL_GOVERNED_USE after BG, or scheduling a follow-on L19
satellite that reopens the ladder, would contradict the closeout dictamen.
After BG, L19 is CLOSED_FOR_LOCAL_GOVERNED_USE. Never reopen L19 after closeout.
(L17 and L18 remain CLOSED and are also never reopened.)

### D. Soft-fail seam-pack

**Rejected.** A soft-fail / warn-only pack (allow BC–BF to report warnings while
the job stays green) is the same honesty failure as continue-on-error. Fail-closed
means any BC/BD/BE/BF seam-pack job failure fails the CI contract. No soak. No
soft-fail. No continue-on-error.

## Consequences

- Host CI seam-pack requires BC+BD+BE+BF fail-closed; Fundacion freeze kept.
- Box harness can apply the same patcher to `_fixtures/` and run BG1–BG18 PASS.
- SLIM stays ≤145 by excluding the BG lock (satellites already excluded).
- Ladder 19 closeout is recorded; L17/L18 stay CLOSED; L19 never left OPEN.
- PRODUCTION_READY stays NO. Tip honesty deferred to a separate post-BG refresh.
- Envelope rigor (this ADR, EARS+BDD spec, evidence artifact) ships day one.

## NON-CLAIM

This closeout is **not**:

- a PRODUCTION_READY=YES flip
- GH Team/Enterprise enforcement / required-check billing upgrade
- a soak or continue-on-error pack
- a soft-fail seam-pack
- a rewrite of BC/BD/BE/BF modules
- a CloudAgent path (Antigravity-first)
- a Fundacion writer (`fundacionDelta=0`)
- a tip honesty SSOT refresh (deferred post-BG)
- a reopen of L17, L18, or L19 after closeout

Governed patch ≠ unsupervised auto-merge SaaS / GH Actions replacement.
Multi-target delivery ≠ multi-tenant cloud fleet / K8s CD.
Verification replay ≠ SIEM product / billing accuracy SaaS.
Local RC packaging ≠ PRODUCTION_READY=YES / public registry / GH Releases.

L17 CLOSED never reopen. L18 CLOSED never reopen (AX–BB MEASURED).
L19 CLOSED_FOR_LOCAL_GOVERNED_USE after BG — never reopen L19 after closeout.

## Links

- SPEC-0064 — this change
- OpenSpec: `openspec/changes/eos-mission-bg-ladder19-closeout-seam-pack/`
- Spec: `openspec/changes/eos-mission-bg-ladder19-closeout-seam-pack/specs/mission-bg-ladder19-closeout-seam-pack/spec.md`
- Tests: `tests/eos-bg-ladder19-seam-pack.test.js` (BG1–BG18)
- Evidence: `docs/evidence/EOS_MISSION_BG_EVIDENCE_2026-09-14.md`
- Closeout: `docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md`
- Release: `docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md`
- Branch: `grok/mission-bg-ladder19-closeout-seam-pack`
- Host SHA: TBD until bootstrap
- Base tip: `37a36e9f0ed9dab61b3d997edd777e49d2eb7a16` (#280 · BF MEASURED)
- PR: TBD until bootstrap
