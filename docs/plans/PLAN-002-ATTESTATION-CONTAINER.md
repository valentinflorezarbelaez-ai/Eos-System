# PLAN-002: EVIDENCE ATTESTATION ARCHITECTURE & CONTAINER RUNNER
## Architectural Decision Records (ADRs) and Out-of-Band Trust Design

---

## 1. ARCHITECTURAL TOPOLOGY & BOUNDARIES

```text
+-----------------------------------------------------------------------------------------+
|                                    OUT-OF-BAND DOMAIN                                    |
|                                                                                         |
|   [ External Human Architect / CI Key Custodian ]                                       |
|     * Controls: Ed25519 Private Signing Key (NEVER committed to git or exposed to agent)|
|     * Signs Baseline Manifest: `.eos/trust/baseline.signed.json`                         |
|     * Provisions Public Key: `.eos/trust/root_pubkey.pem` (Committed, Read-Only)        |
+-----------------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------------+
|                         SEALED REPRODUCIBLE CONTAINER RUNNER                            |
|  - OCI Image: `ghcr.io/eos/verifier:2.1@sha256:7b4f...` (or hermetic local Dockerfile)  |
|  - Mount Flags: `--read-only`, `--tmpfs /tmp`, `-v ./docs/evidence:/out:rw`            |
+-----------------------------------------------------------------------------------------+
         |                                                                      |
         | (Verifies Signatures)                                                | (Executes Tests)
         v                                                                      v
+----------------------------------------------------+  +---------------------------------+
|               INFRASTRUCTURE LAYER                 |  |        APPLICATION LAYER        |
|  - AsymmetricCryptoService (Ed25519 verify)       |  |  - AttestationVerifierService   |
|  - ReadOnlyTrustStore (`.eos/trust/`)              |  |  - BaselineIntegrityService     |
|  - AppendOnlyEvidenceLogger                        |  |  - AdversarialRegressionScanner |
+----------------------------------------------------+  +---------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------------+
|                                PURE DOMAIN LAYER (CORE)                                 |
|  - AttestationRecord: immutable domain entity holding subject, predicate, and signatures|
|  - TrustPolicy: pure rules for signature validity, threshold, and expiry                |
|  - InvariantSuite: pure domain tests executed against AST and model classes             |
+-----------------------------------------------------------------------------------------+
```

---

## 2. ARCHITECTURAL DECISION RECORDS (ADR)

### ADR-004: Out-of-Band Asymmetric Ed25519 Signing vs In-Repo Hashes
* **Status:** `ACCEPTED`
* **Context:** The previous baseline relied on plain SHA-256 digests generated in-repo by the verifier itself. This enabled an adversarial agent or compromised script to modify code, re-hash, overwrite `EVD-0001`, and claim `VERIFIED` without detection (P0 circularity).
* **Decision:** Decouple integrity from verification. The baseline ledger `.eos/trust/baseline.signed.json` must be signed with an asymmetric Ed25519 key. The verifier only possesses the public key `.eos/trust/root_pubkey.pem` and cannot forge or update the baseline.
* **Rejected Alternatives:**
  * *In-repo symmetric HMAC:* Rejected because the shared secret would reside in the repository or local filesystem, allowing the agent to forge signatures.
  * *Unsigned SHA-256 manifests:* Rejected due to complete absence of provenance and vulnerability to silent overwrites.

### ADR-005: Strict Read-Only Baseline Barrier
* **Status:** `ACCEPTED`
* **Context:** In EOS 2.0, `scripts/verify-strict.ps1` wrote to the baseline evidence file upon every execution.
* **Decision:** The verification suite is strictly **read-only** with respect to the source code, configurations, and trust manifests. Creating or updating a baseline is a separate, privileged administrative command requiring external human signature. The verifier will throw a fatal error if any attempt is made to write to `.eos/trust/`.
* **Rejected Alternatives:**
  * *Auto-updating baseline on verification pass:* Rejected because passing tests that were themselves modified does not constitute proof of conformance.

### ADR-006: Hermetic Container Runner Definition
* **Status:** `ACCEPTED`
* **Context:** Running verification directly in the host OS allows the agent or environment to manipulate Node/PowerShell binaries, inject fake exit codes, or modify filesystem permissions.
* **Decision:** Provide a hermetic, reproducible container environment (`docker/Dockerfile.verify` or Podman equivalent) with an immutable image hash, mounting the repository as read-only.
* **Rejected Alternatives:**
  * *Unsandboxed local execution only:* Rejected because environment pollution and missing dependencies (e.g. absent `node` or `pwsh` binaries) undermine deterministic evidence.

### ADR-007: Segregated Append-Only Evidence Log
* **Status:** `ACCEPTED`
* **Context:** Overwriting `EVD-0001` eradicated the audit trail of past runs.
* **Decision:** Live verification artifacts will be written as timestamped, immutable records into an append-only directory (`docs/evidence/runs/EVD-YYYYMMDD-HHMMSS-<SHORT_SHA>.json`) and linked to git commit SHAs. Legacy `EVD-0001` is frozen and marked `HISTORICAL_UNTRUSTED`.
* **Rejected Alternatives:**
  * *Single mutable evidence file:* Rejected due to destruction of historical regression evidence.

---

## 3. DATA CONTRACTS & INTERFACES

### `IAttestationVerifier` (Application Layer)
```typescript
export interface AttestationVerificationInput {
  readonly baselinePath: string;
  readonly publicKeyPath: string;
  readonly workspaceRoot: string;
}

export interface AttestationVerificationOutput {
  readonly isValid: boolean;
  readonly verifiedCommit: string;
  readonly totalFilesChecked: number;
  readonly mismatches: readonly string[];
  readonly signatureVerified: boolean;
  readonly failureReason?: string;
}
```

### `IAsymmetricCryptoService` (Infrastructure Layer)
```typescript
export interface IAsymmetricCryptoService {
  verifyEd25519(payload: Buffer, signature: Buffer, publicKeyPem: string): boolean;
  hashFile(filePath: string): string;
}
```
