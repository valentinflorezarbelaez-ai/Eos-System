# ADR-0157 — Mission FK Bidirectional Mismatch Quarantine / Deny Governance Port (PROPOSED / DRAFT)

- **Status:** Proposed — **DRAFT / NOT ACCEPTED** (docs-only; blocked on PR #577 merge + tip-refresh post-FJ + explicit PO authorization)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** Pending Product Owner authorization (EOS local governed use)
- **Spec:** SPEC-0173
- **Prior ADRs:** ADR-0156 (Mission FJ round-trip integrity), ADR-0155 (Mission FI correlation registry), ADR-0154 (Ladder 41 Maturity Gap Audit)

## Context

Ladder 41 is **OPEN** (Audit MEASURED · FI MEASURED #566 · FJ implemented in PR #577 · FK–FM pending). Formal L30–L40 remain **CLOSED** — **NEVER reopen**. FI seals the bidirectional correlation binding; FJ verifies request/reply integrity and returns a verdict. There is **no** Layer-0 surface that converts a detected mismatch into a fail-closed quarantine/deny decision across the correlated opaque refs.

This ADR is a **proposal only**. It does not authorize runtime code, does not rewrite freeze pins, and does not claim FK MEASURED. The post-FJ freeze pin is unknown until PR #577 merges and tip-refresh post-FJ is sealed.

## Proposed Decision (pending authorization)

1. Add Layer-0 triad under `src/core/composition/`:
   - `bidirectional-mismatch-quarantine-deny-receipt.js` — sealed `FK-RCPT-*` + freeze soft-observe `<post-FJ pin>` + `quarantineHold` (`mismatchSecretMaterialRefused` / `mismatchSecretZeroHeld`)
   - `bidirectional-mismatch-quarantine-deny-policy-gate.js` — fail-closed quarantine/deny preconditions + Law VI mismatch/secret-field refusal
   - `bidirectional-mismatch-quarantine-deny-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `BIDIRECTIONAL_MISMATCH_QUARANTINE_DENY`.
3. Input requires opaque `correlationId` + `bindingId` (FI) + `roundTripId` + `requestId` + `replyId` (FJ) + `requestDigest` + `replyDigest` (64-hex sha256) + `mismatchClass` + `desiredDisposition` (`QUARANTINE|DENY|HOLD`) + hermetic `observedVerdict` (`VERIFIED|MISMATCH|HOLD`); `authorized` must be `true` for PASS.
4. PASS requires `observedVerdict === MISMATCH`. `VERIFIED` must produce a no-op HOLD (never a false quarantine); ambiguous verdicts fail closed.
5. Digest field: `mismatchDigest` over opaque FI/FJ refs, classes and digests only — never request/reply bodies or secrets.
6. Fail-closed codes: `MISMATCH_UNAUTHORIZED`, `INVALID_MISMATCH_CLAIM`, `VERDICT_INCONSISTENT`, `SECRET_FIELD_FORBIDDEN`, `SECRET_LEAK_FORBIDDEN`, `RAW_MISMATCH_SECRET_MATERIAL_FORBIDDEN`.
7. Refuse live HTTP egress, wall-clock authority, tip-refresh authority, FI/FJ/FL elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L40 reopen, L41 auto-close, schema-json add, Fundacion writes, GHE, mass prune, network write.
8. Quarantine is a **decision record only** — never copy, move, or seal request/reply payload bytes (Law VI).
9. Hermetic tests FK1–FK17; OpenSpec `eos-ladder-41-mission-fk`; slim-exclude to hold TR-01 ≤ 145.

## Alternatives Considered AND REJECTED (prospective)

- Elevating FI registry / FJ integrity / FL honesty / Canary dispatcher as the FK port — REJECTED: FK acts on FJ's verdict and quarantines opaque refs only.
- Copying or sealing raw request/reply payloads into quarantine records — REJECTED: Law VI absolute.
- Auto-quarantine on `VERIFIED` or ambiguous verdicts — REJECTED: false positives; no-op HOLD + fail-closed instead.
- Live HTTP egress / Date.now as authority / tip-refresh as authority — REJECTED.
- Tip-refresh / tip-seal / freeze tip rewrite in the FK package — REJECTED: separate post-merge acts.
- Flipping `PRODUCTION_READY`, reopening L30–L40, auto-closing L41, adding schema JSON — REJECTED.

## Consequences (if accepted)

- Positive: L41 gains a fail-closed mismatch quarantine/deny decision surface with verifiable `FK-RCPT-*` receipts; FL can attest on top without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L40 CLOSED, L41 OPEN, schemas AT_CEILING 35/35.
- Non-claims: DRAFT ≠ FK MEASURED ≠ L41 CLOSED ≠ PRODUCTION_READY.

## Links

- Blocking dependency: PR #577 (Mission FJ / ADR-0156) merge + tip-refresh post-FJ
- Audit: ADR-0154 / Ladder 41 Maturity Gap Audit
- OpenSpec: `openspec/changes/eos-ladder-41-mission-fk/`
