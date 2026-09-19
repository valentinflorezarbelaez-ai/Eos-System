# Spec — Mission CN Governed Artifact / SBOM Attestation Port (SPEC-0097)

## Requirement: Artifact attestation receipt

The system SHALL seal `CN-RCPT-*` receipts with canonical nine-field SHA-256 body including `planId`, `decision` (PASS|DENY), `artifactCount`, `artifactsDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `artifacts[]` `{ artifactId, sbomDigest, packagePath?, bindDigest?, linkDigest?, components? }`, `reasons[]`, and `attestationDigest`.

## Requirement: Fail-closed policy gate

The gate SHALL require `planId`; require 1..CN_MAX artifacts with valid `artifactId` and sha256 `sbomDigest` (optional packagePath, prior CM `bindDigest`, prior CL `linkDigest`); ALWAYS_DENY Fundacion; DENY Law VI secrets; DENY labels claiming commercial SBOM SaaS, Sigstore product, public package registry, SLSA commercial product, or GH Enterprise enforcement; reject empty plans, oversize artifact/component lists, and invalid or tampered digests.

## Requirement: Artifact attestation port

`ArtifactAttestationPort.attest(plan)` SHALL evaluate the gate, hermetically attest artifactId → sbomDigest (+ optional CM/CL digests), emit PASS or DENY with a sealed receipt, store successful attestations by planId in memory, and expose `verifyTrail()`. The port SHALL NOT use network, GH API, or real tarball I/O (digest strings only).

## Requirement: Non-claims

The package SHALL NOT claim commercial SBOM SaaS, Sigstore product, public package registry, SLSA commercial product, GH Enterprise enforcement, Fundacion writes, or `PRODUCTION_READY=YES`. Extends BF themes without reopening L19. L17–L25 remain CLOSED; L26 remains OPEN (Audit + CL + CM MEASURED · CN in progress · CO–CP pending).
