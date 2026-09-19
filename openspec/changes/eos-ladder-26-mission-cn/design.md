# Design — Mission CN Governed Artifact / SBOM Attestation Port

## Architecture

```
plan { planId, artifacts[] { artifactId, sbomDigest, packagePath?, bindDigest?, linkDigest?, components? }, reasons? }
        │
        ▼
ArtifactAttestationPolicyGate.evaluatePlan
        │ deny → CN-RCPT decision=DENY
        ▼
hermetic artifactId↔sbomDigest (+ optional CM bindDigest / CL linkDigest)
        │
        ▼
decision PASS | DENY → attestationDigest → CN-RCPT-* nine-field seal
```

## Nine-field seal

`receiptId, operation, planId, decision, artifactCount, artifactsDigest, timestamp, fundacionDelta, prevReceiptHash`

## Gate rules (fail-closed)

- Require planId; 1..CN_MAX artifacts with artifactId + sha256 sbomDigest
- Optional packagePath, CM bindDigest, CL linkDigest (sha256 when present)
- Reject Fundacion / Law VI secrets / commercial SBOM·Sigstore·registry·SLSA·GHE labels
- Reject empty / oversize artifacts / oversize components / invalid or tampered digests
- Hermetic digests only — no real tarball I/O / no network / no GH API
