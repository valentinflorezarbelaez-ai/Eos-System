# INTAKE-002: EVIDENCE TRUST & ADVERSARIAL ASSURANCE (EOS 2.1)
## Intake Package, Forensic Root-of-Trust Diagnosis, and Iteration Objectives

---

### 1. Document Metadata
* **Intake ID:** INTAKE-2026-10-23-EOS-2.1
* **Target System:** EOS Core System (Control Plane)
* **Target Workspace:** `C:\Users\valen\Eos-System-1`
* **Lifecycle State:** `INTAKE_ACCEPTED`
* **Current Control-Plane Epistemic State:** `FINDINGS_IDENTIFIED`
* **Authorization Reference:** Level 2 Implementation Authorization (Session 2026-10-23)
* **Lead System Owner:** Valentin Florez & Independent Adversarial Audit

---

### 2. Forensic Justification: P0 Circular Verification Breakdown

An independent adversarial audit conducted on 2026-10-23 revealed a critical architectural circularity in the baseline verification pipeline:

#### The Tautological Loop (P0 Anomaly)
1. **Unilateral Baseline Overwrite:** In [`scripts/verify-strict.ps1`](file:///c:/Users/valen/Eos-System-1/scripts/verify-strict.ps1#L166-L216), Stage 5 computes SHA-256 digests of all existing files on disk, and Stage 6 immediately writes these calculated digests into [`docs/evidence/EVD-0001-BASELINE-STRICT-PASS.json`](file:///c:/Users/valen/Eos-System-1/docs/evidence/EVD-0001-BASELINE-STRICT-PASS.json), overwriting the baseline.
2. **False Sentinel Invariant:** [`scripts/run-sentinel.ps1`](file:///c:/Users/valen/Eos-System-1/scripts/run-sentinel.ps1#L22-L38) reads the freshly overwritten evidence file and compares disk state against it, asserting `[PASS] 0 unauthorized mutations detected.`
3. **Adversarial Exploitation:** Any malicious agent or unintended mutation can alter domain invariants, execute `verify-strict.ps1`, update the baseline with the corrupted signature, and claim `PRODUCTION_READY_WITHIN_TESTED_SCOPE` with zero detection.
4. **Digest vs Signature Conflation:** The system utilized symmetric SHA-256 digests without asymmetric digital signatures (e.g., Ed25519), failing to provide provenance, authenticity, or non-repudiation.

#### Standards Compliance Gap
* **NIST SP 800-218 (SSDF):** Fails requirement PW.1.1 (Store software and integrity verification data in trusted repositories with out-of-band integrity verification).
* **SLSA Level 3/4:** Fails provenance generation isolation requirements (the environment generating the artifact cannot possess permissions to sign its own attestation unchecked).
* **DO-178C / ISO 26262:** Fails independent verification criteria; tests must be isolated from the artifact generation mechanism.

---

### 3. Engineering Objectives for EOS 2.1

1. **Establish an Independent Root of Trust:**
   - Sever the circular dependency: the verification engine shall NEVER overwrite the approved verification baseline.
   - The baseline must be externally anchored, immutable, or cryptographically signed with an asymmetric private key held out of band.
2. **Asymmetric Cryptographic Attestation:**
   - Evidence records must incorporate an asymmetric signature (Ed25519) verifiable via a distributed public key.
3. **Sealed Container Execution:**
   - Define a hermetic container runner (OCI image digest) ensuring the test environment cannot be tampered with by the agent.
4. **Deprecation of Legacy Evidence:**
   - Mark `EVD-0001-BASELINE-STRICT-PASS.json` as historical and untrusted for future certifications.
   - Implement append-only evidence recording segregated from source repository files.

---

### 4. Scope and Phased Decomposition

| Phase / Spec | Focus Area | Mandatory Deliverable |
| :--- | :--- | :--- |
| **SPEC-002** (Current) | Evidence Attestation & Out-of-Band Trust Root | Immutable baseline, Ed25519 verification, OCI container specification |
| **SPEC-003** (Next) | Adversarial Property-Based Testing | AST execution (Fast-Check/Node native runner), negative invariant tests |
| **SPEC-004** (Next) | Safe Transactional FDIR | Isolation quarantine (DLQ), pre-healing snapshot, atomic rollback |
| **SPEC-005** (Next) | Entropy & Semantic Drift Engine | Concept tracing (Req <-> Test <-> Task <-> Evidence), Architectural Health Score |

---

### 5. Acceptance & Exit Criteria for Milestone P0
* A third-party auditor possessing **strictly read-only** access to the repository can cryptographically verify that:
  1. The code matches a signed external baseline.
  2. Any unauthorized mutation to code or baseline causes verification to deterministically exit with non-zero code.
  3. The verification script cannot modify the baseline under test.
