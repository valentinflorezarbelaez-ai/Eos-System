# Proposal — Mission CN Governed Artifact / SBOM Attestation Port (SPEC-0097)

## Why

Ladder 26 axis **Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric** needs a Layer-0 port that attests release-candidate artifacts to SBOM digests (with optional prior CM `bindDigest` / CL `linkDigest`) under sealed receipts. Extends BF local RC notary themes — do NOT reopen L19.

## What changes

- New Layer-0 modules under `src/core/artifacts/`:
  - `artifact-attestation-receipt.js` — sealed `CN-RCPT-*` receipts
  - `artifact-attestation-policy-gate.js` — fail-closed attest preconditions
  - `artifact-attestation-port.js` — facade (`attest`, `verifyTrail`, `getAttestation`)
- Hermetic tests `tests/eos-cn-artifact-attestation-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-cn.mjs`
- OpenSpec change, ADR-0058, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; Fundacion writes; commercial SBOM SaaS / Sigstore / public registry / SLSA commercial; GHE enforcement; CO–CP; tip-refresh; reopen L17–L25 / L19 BF

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L25 | CLOSED — never reopen |
| L26 | OPEN (Audit + CL + CM MEASURED · CN in progress · CO–CP pending) |
| Axis | Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric |
