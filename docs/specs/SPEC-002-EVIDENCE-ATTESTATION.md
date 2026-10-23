# SPEC-002: EVIDENCE ATTESTATION & OUT-OF-BAND TRUST ROOT
## Requirements in Formal EARS Syntax & BDD Acceptance Criteria

---

### 1. Specification Metadata
* **Specification ID:** SPEC-002-EVIDENCE-ATTESTATION
* **Version:** 1.0.0
* **Status:** `PROPOSED_FOR_APPROVAL`
* **Parent Intake:** [`docs/intake/INTAKE-002-EVIDENCE-TRUST-ADVERSARIAL.md`](file:///c:/Users/valen/Eos-System-1/docs/intake/INTAKE-002-EVIDENCE-TRUST-ADVERSARIAL.md)
* **Standards Baseline:** IEEE 830 / ISO 29148 / SLSA v1.0 / NIST SP 800-218 (SSDF) / in-toto Attestation Framework
* **Target System:** EOS Core System v2.1

---

### 2. Architectural Context & Trust Topology

```text
+-----------------------------------------------------------------------------------------+
|                              OUT-OF-BAND TRUST TOPOLOGY                                 |
|                                                                                         |
|   [ External Authority / Lead Architect ]                                               |
|         |                                                                               |
|         +---> Holds: Ed25519 Private Key (out of band, inaccessible to agent)           |
|         +---> Distributes: Ed25519 Public Key -> .eos/trust/root_pubkey.pem (Read-Only)  |
|         +---> Authorizes & Signs: .eos/trust/baseline.signed.json                        |
|                                                                                         |
|   [ Sealed Verification Container (Hermetic OCI Image Digest) ]                         |
|         |                                                                               |
|         +---> Mounts Workspace as READ-ONLY (except for append-only logs/evidence)       |
|         +---> Reads .eos/trust/baseline.signed.json                                     |
|         +---> Verifies Ed25519 signature of baseline using root_pubkey.pem              |
|         +---> Computes SHA-256 hashes of tracked workspace files                        |
|         +---> Compares computed hashes against baseline entries                         |
|         |                                                                               |
|         |---> IF mismatch: ABORTS WITH EXIT CODE 1 (Divergence Detected)               |
|         +---> IF match: Emits cryptographically attested verification receipt           |
|                                                                                         |
|   CANNOT OVERWRITE BASELINE: Container environment and filesystem permissions enforce    |
|   strict write barriers preventing the verifier from updating its own reference.        |
+-----------------------------------------------------------------------------------------+
```

---

### 3. Functional Requirements (Formal EARS Syntax)

#### FR-01: Immutable Baseline Comparison [Event-Driven]
* **Syntax:** `WHEN the verification suite is executed, THE SYSTEM SHALL compute SHA-256 digests of all tracked artifacts and compare them against an immutable baseline ledger that the verifier itself has zero permissions to modify.`

#### FR-02: Missing or Corrupted Baseline Abort [Error / Unwanted Condition]
* **Syntax:** `IF the signed baseline ledger is absent, tampered with, or fails asymmetric cryptographic verification against the trusted root public key, THEN THE SYSTEM SHALL abort immediately with a non-zero exit code and transition the epistemic state to REMEDIATION_REQUIRED.`

#### FR-03: Asymmetric Cryptographic Attestation [Ubiquitous]
* **Syntax:** `THE SYSTEM SHALL sign and verify evidence artifacts using asymmetric Ed25519 cryptographic key pairs, where the public key is distributed out of band and the private key is held exclusively by an external authorized signer.`

#### FR-04: Sealed Container Runtime Isolation [State-Driven]
* **Syntax:** `WHILE the verification suite is executing, THE SYSTEM SHALL run inside a hermetic, sealed container environment whose OCI image digest is pinned and anchored in the baseline ledger.`

#### FR-05: Segregated Append-Only Evidence Ledger [Ubiquitous]
* **Syntax:** `THE SYSTEM SHALL write newly generated verification evidence records into an isolated, append-only directory path completely decoupled from source code and baseline configurations.`

#### FR-06: Historical Evidence Deprecation [Event-Driven]
* **Syntax:** `WHEN evaluating previous verification baselines, THE SYSTEM SHALL treat legacy unsigned evidence records (including EVD-0001) as HISTORICAL_UNTRUSTED, disallowing them from satisfying production release gates.`

---

### 4. Non-Functional Requirements (NFR)

* **NFR-01 (Security - Non-Repudiation):** No verification artifact may be generated with self-signed symmetric digests masquerading as proof of authenticity.
* **NFR-02 (Performance - Verification Latency):** Full verification of baseline signatures, file digests, and AST invariants must complete in less than 5000ms within the container runtime.
* **NFR-03 (Reliability - Zero False Positives):** Deterministic evaluation across identical commit SHAs must produce identical exit codes and verification outputs.

---

### 5. BDD Acceptance Criteria

```gherkin
SCENARIO: SCEN-001 - Adversarial Domain Mutation Detection
  GIVEN an approved baseline ledger ".eos/trust/baseline.signed.json" signed with the external Ed25519 key
  AND an adversarial agent modifies domain logic in "src/core/domain/models/Requirement.ts"
  WHEN the verification suite "scripts/verify-strict.ps1" is executed
  THEN the system computes a SHA-256 hash divergent from the baseline entry
  AND the verifier exits with code 1
  AND the system outputs "MUTATION_DETECTED: src/core/domain/models/Requirement.ts"
  AND the verifier does NOT overwrite the baseline ledger
  AND the epistemic state is set to "FINDINGS_IDENTIFIED"

SCENARIO: SCEN-002 - Baseline Missing or Signature Tampered
  GIVEN an execution environment where ".eos/trust/baseline.signed.json" has been altered by an attacker
  WHEN the verification suite initializes Stage 0 (Trust Root Check)
  THEN the Ed25519 signature verification against "root_pubkey.pem" fails
  AND the verifier aborts immediately before executing tests
  AND the verifier exits with code 2
  AND the system transitions to epistemic state "REMEDIATION_REQUIRED"

SCENARIO: SCEN-003 - Read-Only Baseline Enforcement
  GIVEN a verification process executing under standard or containerized runtime
  WHEN the process attempts to perform a write or delete operation on ".eos/trust/baseline.signed.json"
  THEN the operating system write barrier rejects the operation with EACCES / UnauthorizedAccessException
  AND the baseline integrity remains unchanged

SCENARIO: SCEN-004 - Out-of-Band Attestation Verification by Read-Only Auditor
  GIVEN a third-party auditor with strictly read-only access to the repository
  AND the external public key "root_pubkey.pem"
  WHEN the auditor executes the independent attestation verifier
  THEN the verifier independently re-computes all file hashes without writing any files
  AND validates the Ed25519 signature of the baseline
  AND reports "ATTESTATION_VALID" if and only if all disk hashes match the signed baseline
```

---

### 6. Attestation Data Schema (in-toto / SLSA Aligned)

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    {
      "name": "eos-core",
      "digest": {
        "sha256": "3fa98e..."
      }
    }
  ],
  "predicateType": "https://eos.system/attestation/v1",
  "predicate": {
    "builder": {
      "id": "urn:eos:builder:hermetic-container@sha256:d89e4c..."
    },
    "buildType": "https://eos.system/builds/strict-verification@v1",
    "invocation": {
      "command": "verify:strict",
      "timestamp": "2026-10-23T19:30:00Z"
    },
    "epistemicState": "VERIFIED",
    "exitCode": 0,
    "auditResults": {
      "totalChecks": 26,
      "failedChecks": 0,
      "findings": []
    },
    "files": [
      {
        "path": "src/core/domain/models/Requirement.ts",
        "sha256": "4b72c9..."
      }
    ]
  },
  "signatures": [
    {
      "keyid": "eos-root-ed25519-key-01",
      "sig": "MEQCIB..."
    }
  ]
}
```

---

### 7. Historical Deprecation Notice

* **Deprecated Artifact:** [`docs/evidence/EVD-0001-BASELINE-STRICT-PASS.json`](file:///c:/Users/valen/Eos-System-1/docs/evidence/EVD-0001-BASELINE-STRICT-PASS.json)
* **Deprecation Reason:** Generated under circular self-signing loop without out-of-band asymmetric key attestation.
* **Status:** `HISTORICAL_REFERENCE_ONLY (UNTRUSTED_FOR_PRODUCTION)`
