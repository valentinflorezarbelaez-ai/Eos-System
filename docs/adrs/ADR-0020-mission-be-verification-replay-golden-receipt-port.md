# ADR-0020 — Mission BE Verification Replay & Golden Receipt Port

- **Status:** Accepted — local governed
- **Date:** 2026-09-13
- **Deciders:** EOS local governed use (Sovereign Delivery & Verification Fabric)
- **Spec:** SPEC-0062

## Context

Mission BC (SPEC-0060) and Mission BD (SPEC-0061) MEASURED hermetic apply and
multi-target delivery ports with sealed receipts. AJ evidence ledger and AL
replay observer are MEASURED observe surfaces. The next seam on the same
axis (L19 audit SPEC-0062) is a **Verification Replay & Golden Receipt
Port**: deterministically replay sealed verify:strict / satellite / delivery
receipts and compare them against golden receipts, fail-closed on
mismatch/drift/custody break, and seal a replay receipt.

The seam must stay hermetic. Live re-running `verify:strict` as a product,
SIEM streaming, billing-accuracy SaaS, and a PRODUCTION_READY verification
product are out of scope. AJ/AL/BC/BD already exist as sibling missions; BE
must **compose** those via injectable observe ports and must **not** rewrite
their source into this payload.

L17 and L18 remain CLOSED (never reopen; AX–BB MEASURED). L19 stays OPEN
(BC+BD MEASURED; BE in progress; BF–BG pending). PRODUCTION_READY stays `NO`.
Fundacion Δ stays `0`.

Base tip (expected): `6aeb49c9005665a39ba5e8f28f776505e26b14dd`
(StartsWith `6aeb49c`; #277 tip post-#276 · BD MEASURED).

## Decision

1. Add four **new** modules under `src/core/delivery/` that coexist with
   BC/BD siblings (do not overwrite BC/BD):
   - `verification-replay-golden-receipt-port.js` — facade
     (`createVerificationReplayGoldenReceiptPort`, `replay`)
   - `replay-policy-gate.js` — mismatch / custody / Fundacion / HITL /
     invalid DENY
   - `replay-receipt.js` — `stableStringify` + `sha256Canonical` sealed
     receipt (`BE-RCPT-*`)
   - `golden-receipt-boundary.js` — normalize, Fundacion detect, secret
     scrub, observe helpers
2. Enforce phases **VALIDATE → GATE → REPLAY → COMPARE → SEAL**. DENY at
   GATE always SEALs and skips REPLAY/COMPARE.
3. Replay hermetically: in-memory golden map + candidate sealed receipt
   objects. Recompute canonical digest and compare. No `child_process`, no
   live `verify:strict`, no SIEM, no network, no CloudAgent.
4. Fail-closed: digest mismatch / drift, custody break, Fundacion, missing
   required BC/BD seals, malformed, empty request, HITL unapproved. No
   soft-match / continue-on-drift.
5. Compose AJ/AL/BC/BD via optional injectable ports only
   (`ajLedger` / `ledgerObserve`, `alReplay` / `autonomyReplayObserve`,
   `bcApply` / `bdDelivery`). Do not vendor-copy AJ/AL sources into
   `delivery/`. BC/BD siblings MAY already live in that directory on main.
6. Law VI audits scan **MODULE_DIR only** (`src/core/delivery`). Never scan
   `tests/`. Never embed contiguous forbidden provider-prefix literals.
7. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   and the NON-CLAIM set (no SIEM product / no billing accuracy SaaS / no
   PRODUCTION_READY verification product / not BF/BG).

## Alternatives considered AND REJECTED

### A. Live re-run `verify:strict` in CI as product

**Rejected.** Binding `replay` to a real `npm run verify:strict` (or
satellite) subprocess would make the port host-stateful, non-hermetic, and
unsafe to run inside `node --test`. It would also claim a PRODUCTION_READY
verification product — exactly the NON-CLAIM surface
(`productionReadyVerificationProduct=false`, `realVerifyStrict=false`).
Canonical digest recompute over sealed receipt objects already proves
match/mismatch/custody without spawning CI.

### B. SIEM streaming port

**Rejected.** A SIEM ingest / streaming adapter (alert bus, correlation
window, billing-metered event pipe) would claim SIEM product completeness
and billing-accuracy SaaS coverage. That is the NON-CLAIM fence
(`siemProduct=false`, `billingAccuracySaas=false`). BE is a local governed
golden-receipt compare seam, not a security-information product.

### C. Rewriting AJ / AL into the delivery port

**Rejected.** Vendor-copying or inlining AJ evidence-ledger or AL
forensic/replay source into `src/core/delivery/` would break mission
isolation, duplicate Law VI surface, and put wrong-package filenames next
to BC/BD siblings. BE10 explicitly forbids AJ/AL (and AN/AX/BA) filenames
and `developer-engine/` / `evidence/` imports. Compose via injectable
observe ports. Do not rewrite BC/BD either.

### D. Soft-match / continue-on-drift

**Rejected.** A “close enough” or continue-on-drift policy would let a
diverged candidate seal `ok: true` / `match: true` and advertise a golden
hit that did not occur. That violates fail-closed governance: the receipt
would claim custody that is already broken. Whole-request DENY with
`DIGEST_MISMATCH` (or `DRIFT_DENY` when explicitly opted) and `match: false`
is the only honest outcome.

## Consequences

- Callers get a single `replay({ candidate, golden, … })` API with sealed
  receipts on both MATCHED and DENY.
- Tests BE1–BE18 can run hermetically on box (`18/18`).
- SLIM stays ≤145 by excluding the BE satellite from `SLIM_SUITE_EXCLUDES`.
- Host `verify:strict` remains the gate (TBD until bootstrap).
- BF/BG stay unclaimed; PRODUCTION_READY stays `NO`.
- Envelope rigor (this ADR, EARS+BDD spec, evidence artifact) ships in the
  first payload — not post-hoc.

## NON-CLAIM

This port is **not**:

- a SIEM product
- a billing accuracy SaaS
- a PRODUCTION_READY verification product
- BF or BG
- a live `verify:strict` re-runner
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

L17 CLOSED never reopen. L18 CLOSED never reopen (AX–BB MEASURED).
L19 OPEN (BC+BD MEASURED; BE in progress; BF–BG pending).

## Links

- SPEC-0062 — this change
- OpenSpec:
  `openspec/changes/eos-mission-be-verification-replay-golden-receipt-port/`
- Spec:
  `openspec/changes/eos-mission-be-verification-replay-golden-receipt-port/specs/mission-be-verification-replay-golden-receipt-port/spec.md`
- Tests: `tests/eos-be-verification-replay-golden-receipt-port.test.js` (BE1–BE18)
- Evidence: `docs/evidence/EOS_MISSION_BE_EVIDENCE_2026-09-13.md`
- Release: `docs/releases/EOS_MISSION_BE_VERIFICATION_REPLAY_GOLDEN_RECEIPT_2026-09-13.md`
- Branch: `grok/mission-be-verification-replay-golden-receipt-port`
- Host SHA: TBD until bootstrap
- Base tip: `6aeb49c9005665a39ba5e8f28f776505e26b14dd` (#277 · BD MEASURED)
- PR: TBD until bootstrap
