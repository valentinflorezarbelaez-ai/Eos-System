# ADR-0058 — Mission CN Governed Artifact / SBOM Attestation Port

- **Status:** Accepted — local governed (Ladder 26 Satellite 3)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric)
- **Spec:** SPEC-0097

## Context

BF local RC notary exists; CL/CM delivered Spec↔Code and claim↔evidence custody. EOS lacked a Layer-0 SBOM/artifact attestation port for RC digests with sealed `CN-RCPT-*` — without claiming commercial SBOM SaaS, Sigstore product, public registry, SLSA commercial, or GHE enforcement. Extends BF themes; do NOT reopen L19.

## Decision

1. Implement three Layer-0 modules under `src/core/artifacts/`:
   - `artifact-attestation-receipt.js`: Nine-field SHA-256 sealed `CN-RCPT-*`.
   - `artifact-attestation-policy-gate.js`: Fail-closed attest-plan validation.
   - `artifact-attestation-port.js`: `attest` / `verifyTrail` / `getAttestation`.
2. Valid plan → PASS; gate reject → DENY (sealed). Digests only; no tarball I/O.
3. Exclude satellite test from slim; opt-in via `npm run test:mission-cn`.
4. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM commercial SBOM/Sigstore/registry/SLSA/GHE.
5. Do **not** tip-refresh / implement CO–CP in this mission.

## Alternatives REJECTED

- Commercial SBOM SaaS / Sigstore product / public registry / SLSA commercial — hermetic Layer-0 only.
- GHE enforcement / Fundacion writes / PRODUCTION_READY=YES / tip-refresh / CO–CP / reopen L19 BF.

## Consequences

- Positive: Sealed artifact/SBOM attestation with chained CN receipts; 18 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not commercial SBOM/Sigstore SaaS.
- Invariants: PRODUCTION_READY=NO; L17–L25 never reopen.

## NON-CLAIMS

- ≠ commercial SBOM SaaS / ≠ Sigstore product / ≠ public package registry / ≠ SLSA commercial
- ≠ GHE enforcement / ≠ Fundacion writes / PRODUCTION_READY=NO / ≠ tip-refresh / ≠ CO–CP
