# ADR-0034 — Mission BQ Ladder 21 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric)
- **Spec:** SPEC-0074

## Context

Missions BM (SPEC-0070), BN (SPEC-0071), BO (SPEC-0072), and BP (SPEC-0073)
MEASURED hermetic multi-agent provenance & sentinel satellites (agent identity attestation
& provenance port, continuous integrity sentinel & heartbeat daemon, multi-agent consensus
& two-key handoff gate, sovereign telemetry & forensic trail aggregator) with sealed receipts
BM-RCPT-* / BN-RCPT-* / BO-RCPT-* / BP-RCPT-*. Ladder 20 (BH–BL), Ladder 19 (BC–BG),
Ladder 18 (AX–BB), and Ladder 17 (AS–AW) are CLOSED_FOR_LOCAL_GOVERNED_USE and must never
be reopened.

The remaining L21 gap from the 2026-09-14 audit / ADR-0029 is **Mission BQ / SPEC-0074**:
require BM+BN+BO+BP in CI `seam-pack` fail-closed, extend `test:native-suite-pack`,
add `test:mission-bq` / `test:bq21` / `test:l21` / `test:ladder21-pack`, slim-exclude
the lock, append contract notes, and publish the Ladder 21 closeout audit.

After BQ, Ladder 21 is **CLOSED_FOR_LOCAL_GOVERNED_USE**. This ADR records that
closeout decision and the rejected alternatives that would reopen soak, flip
PRODUCTION_READY=YES, reopen L21 after closeout, or soft-fail the pack.

PRODUCTION_READY stays `NO`. Fundacion Δ stays `0`. Law VI held. Antigravity-first
(CloudAgent out). No rewrite of BM/BN/BO/BP modules — compose via CI scripts only.

Base tip (expected): `ff545dd3d3e078c1911216e9441b2f6855748e7a`
(StartsWith `ff545dd`; tip #305 / Mission BP MEASURED).

## Decision

1. Idempotent CRLF-safe patcher `scripts/patch-mission-bq.mjs` consolidates
   BM/BN/BO/BP into CI seam-pack:
   - Append four `npm run` lines to `.github/workflows/ci.yml` seam-pack
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Ensure primary satellite scripts + attestation/sentinel/consensus/telemetry aliases.
   - Extend `test:native-suite-pack`; add `test:mission-bq` / `test:bq21` /
     `test:l21` / `test:ladder21-pack`.
   - Slim-exclude `eos-bq-ladder21-seam-pack.test.js` (TR-01 ≤145).
   - Append Mission BQ / Ladder 21 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when the file is present.
2. Lock suite `tests/eos-bq-ladder21-seam-pack.test.js` (BQ1–BQ20) reads
   `process.cwd()` so it runs against host or box fixtures.
3. Closeout `docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md` marks
   Ladder 21 **CLOSED_FOR_LOCAL_GOVERNED_USE** with BM+BN+BO+BP+BQ MEASURED,
   PRODUCTION_READY=NO, Fundacion Δ=0, dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE.
4. Never reopen L17. Never reopen L18. Never reopen L19. Never reopen L20. Never reopen L21 after closeout.
   Never revert L21 from CLOSED_FOR_LOCAL_GOVERNED_USE after closeout.
5. Tip honesty ritual is a **separate** post-BQ tip refresh (not this mission).

## Alternatives considered AND REJECTED

### A. Soak / continue-on-error pack

**Rejected.** Adding soak steps or `continue-on-error: true` to seam-pack would
make BM–BP failures non-blocking. That violates fail-closed CI (Law of evidence
over claims) and the L11–L20 closeout pattern. A satellite that can fail without
failing the job is not MEASURED in CI.

### B. PRODUCTION_READY=YES flip

**Rejected.** Treating Ladder 21 closeout as a PRODUCTION_READY=YES flip would
contradict evidence-over-claims doctrine and ADR-0029. CLOSED_FOR_LOCAL_GOVERNED_USE
still means PRODUCTION_READY=NO. Seam-pack ≠ GH Team/Enterprise enforcement;
local surrogate ≠ GH billing change. Required-check billing upgrades remain PO-only.

### C. Reopening L21 after closeout

**Rejected.** Failing to mark Ladder 21 CLOSED_FOR_LOCAL_GOVERNED_USE after BQ, or scheduling a follow-on L21
satellite that reopens the ladder, would contradict the closeout dictamen.
After BQ, L21 is CLOSED_FOR_LOCAL_GOVERNED_USE. Never reopen L21 after closeout.
(L17, L18, L19, and L20 remain CLOSED and are also never reopened.)

### D. Soft-fail seam-pack

**Rejected.** A soft-fail / warn-only pack (allow BM–BP to report warnings while
the job stays green) is the same honesty failure as continue-on-error. Fail-closed
means any BM/BN/BO/BP seam-pack job failure fails the CI contract. No soak. No
soft-fail. No continue-on-error.

## Consequences

- Host CI seam-pack requires BM+BN+BO+BP fail-closed; Fundacion freeze kept.
- Box harness can apply the same patcher to `_fixtures/` and run BQ1–BQ20 PASS.
- SLIM stays ≤145 by excluding the BQ lock (satellites already excluded).
- Ladder 21 closeout is recorded; L17/L18/L19/L20 stay CLOSED; L21 never left OPEN.
- PRODUCTION_READY stays NO. Tip honesty deferred to a separate post-BQ refresh.
- Envelope rigor (this ADR, EARS+BDD spec, evidence artifact) ships day one.

## NON-CLAIM

This closeout is **not**:

- a PRODUCTION_READY=YES flip
- GH Team/Enterprise enforcement / required-check billing upgrade
- a soak or continue-on-error pack
- a soft-fail seam-pack
- a rewrite of BM/BN/BO/BP modules
- a CloudAgent path (Antigravity-first)
- a Fundacion writer (`fundacionDelta=0`)
- a tip honesty SSOT refresh (deferred post-BQ)
- a reopen of L17, L18, L19, L20, or L21 after closeout

Agent identity attestation ≠ full OAuth/IAM/OIDC IdP.
Continuous integrity sentinel ≠ enterprise SIEM / runtime EDR.
Multi-agent consensus gate ≠ multi-sig HSM / blockchain consensus.
Sovereign telemetry trail ≠ enterprise SOC / Datadog / Splunk.
L21 seam-pack ≠ GH Team/Enterprise enforcement.

L17 CLOSED never reopen. L18 CLOSED never reopen (AX–BB MEASURED).
L19 CLOSED never reopen (BC–BG MEASURED).
L20 CLOSED never reopen (BH–BL MEASURED).
L21 CLOSED_FOR_LOCAL_GOVERNED_USE after BQ — never reopen L21 after closeout.

## Links

- SPEC-0074 — this change
- OpenSpec: `openspec/changes/eos-ladder-21-mission-bq/`
- Spec: `openspec/changes/eos-ladder-21-mission-bq/specs/mission-bq-ladder21-closeout-seam-pack/spec.md`
- Tests: `tests/eos-bq-ladder21-seam-pack.test.js` (BQ1–BQ20)
- Evidence: `docs/evidence/EOS_MISSION_BQ_EVIDENCE_2026-09-14.md`
- Closeout: `docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md`
- Release: `docs/releases/EOS_MISSION_BQ_LADDER21_SEAM_PACK_2026-09-14.md`
- Branch: `grok/mission-bq-ladder21-closeout-seam-pack`
- Base tip: `ff545dd3d3e078c1911216e9441b2f6855748e7a` (#305 · BP MEASURED)
