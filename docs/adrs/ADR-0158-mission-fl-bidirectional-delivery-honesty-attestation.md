# ADR-0158 — Mission FL Bidirectional Delivery Honesty & Integrity Attestation Port

- **Status:** Accepted — local governed (Ladder 41 / Mission FL; PO authorized 2026-10-22 post-#578 merge)
- **Date:** 2026-10-22 (America/Bogota)
- **Deciders:** Product Owner authorization (EOS local governed use)
- **Spec:** SPEC-0174
- **Prior ADRs:** ADR-0157 (Mission FK mismatch quarantine / deny), ADR-0156 (Mission FJ round-trip integrity), ADR-0155 (Mission FI correlation registry), ADR-0154 (Ladder 41 Maturity Gap Audit)

## Context

Ladder 41 is **OPEN** (Audit MEASURED · FI MEASURED #566 · FJ MEASURED #577 · FK MEASURED #578 · FL this satellite · FM pending). Formal L30–L40 remain **CLOSED** — **NEVER reopen**. FI seals the bidirectional correlation binding; FJ verifies request/reply integrity and returns a verdict; FK converts a detected mismatch into a fail-closed quarantine/deny decision. There is **no** Layer-0 surface that attests the honesty and integrity of those claims beyond soft-observe.

This ADR authorizes FL runtime after PR #578 merged (`e1a17e9b`) and tip-refresh post-FK was sealed (`a5836fd4`). It does not rewrite freeze pins and does not claim FL MEASURED by itself.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `bidirectional-delivery-honesty-attestation-receipt.js` — sealed `FL-RCPT-*` + freeze soft-observe `e1a17e9b` + `attestationHold` (`attestationSecretMaterialRefused` / `attestationSecretZeroHeld`)
   - `bidirectional-delivery-honesty-attestation-policy-gate.js` — fail-closed attestation preconditions + Law VI attestation/secret-field refusal
   - `bidirectional-delivery-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `BIDIRECTIONAL_DELIVERY_HONESTY_ATTESTATION`.
3. Input requires opaque `correlationId` + `bindingId` (FI) + `roundTripId` + `requestId` + `replyId` (FJ) + `quarantineDecisionId` (FK) + `requestDigest` + `replyDigest` + `mismatchDigest` (64-hex sha256) + `attestationClass` + `desiredAttestation` (`ATTEST_INTEGRITY|ATTEST_HONESTY|HOLD`) + hermetic `observedClaim` (`CONSISTENT|CONTRADICTED|UNVERIFIED|HOLD`); `authorized` must be `true` for PASS.
4. PASS requires `observedClaim === CONSISTENT`. `CONTRADICTED` is a fail-closed DENY (`CLAIM_CONTRADICTED`) — FL never attests a contradicted claim. `UNVERIFIED` / `HOLD` produce a no-op HOLD (never a false attestation).
5. Digest field: `attestationDigest` over opaque FI/FJ/FK refs, classes, claims and digests only — never request/reply bodies or secrets.
6. Fail-closed codes: `ATTESTATION_UNAUTHORIZED`, `INVALID_ATTESTATION_CLAIM`, `CLAIM_CONTRADICTED`, `CLAIM_UNVERIFIED`, `SECRET_FIELD_FORBIDDEN`, `SECRET_LEAK_FORBIDDEN`, `RAW_ATTESTATION_SECRET_MATERIAL_FORBIDDEN`.
7. Refuse live HTTP egress, wall-clock authority, tip-refresh authority, FI/FJ/FK elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L40 reopen, L41 auto-close, schema-json add, Fundacion writes, GHE, mass prune, network write.
8. Attestation is a **decision record only** — never copy, move, quarantine, or seal request/reply payload bytes (Law VI).
9. Hermetic tests FL1–FL17; OpenSpec `eos-ladder-41-mission-fl`; slim-exclude to hold TR-01 ≤ 145.

## Alternatives Considered AND REJECTED

- Elevating FI registry / FJ integrity / FK quarantine / Canary dispatcher as the FL port — REJECTED: FL attests the claims those surfaces produce; it does not replace them.
- Auto-attesting on `CONTRADICTED` or `UNVERIFIED` claims — REJECTED: an attestation must never certify a contradicted or unverified claim; fail-closed DENY + no-op HOLD instead.
- Copying or sealing raw request/reply payloads into attestation records — REJECTED: Law VI absolute.
- Live HTTP egress / Date.now as authority / tip-refresh as authority — REJECTED.
- Tip-refresh / tip-seal / freeze tip rewrite in the FL package — REJECTED: separate post-merge acts.
- Flipping `PRODUCTION_READY`, reopening L30–L40, auto-closing L41, adding schema JSON — REJECTED.
- Adding `scripts/patch-mission-fl.mjs` — REJECTED: the patcher pattern stopped at FI; FJ and FK shipped without it.

## Consequences (if accepted)

- Positive: L41 gains a fail-closed honesty & integrity attestation surface with verifiable `FL-RCPT-*` receipts; FM can consolidate and seal L41 on top without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L40 CLOSED, L41 OPEN, schemas AT_CEILING 35/35.
- Non-claims: FL package ≠ L41 CLOSED ≠ PRODUCTION_READY.

## Links

- Blocking dependency: PR #578 (Mission FK / ADR-0157) merge `e1a17e9b` + tip-refresh post-#578 `a5836fd4`
- Audit: ADR-0154 / Ladder 41 Maturity Gap Audit
- OpenSpec: `openspec/changes/eos-ladder-41-mission-fl/`
