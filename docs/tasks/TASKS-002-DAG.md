# TASKS-002: ATOMIC TASK DIRECTED ACYCLIC GRAPH (DAG)
## Execution Plan for Milestone EOS 2.1 (Evidence Trust & Adversarial Assurance)

---

```text
[TASK-201: Deprecate Legacy Evidence] -> VERIFIED
         |
         v
[TASK-202: Domain Attestation Models] -> VERIFIED
         |
         v
[TASK-203: Infrastructure Ed25519 Crypto Service] -> VERIFIED
         |
         v
[TASK-204: Application Attestation Verifier Service] -> VERIFIED
         |
         v
[TASK-205: Root-of-Trust Provisioning (.eos/trust/)] -> VERIFIED
         |
         v
[TASK-206: Hermetic Container Runner Definition (Dockerfile.verify)] -> VERIFIED
         |
         v
[TASK-207: Refactor verify-strict.ps1 (Sever P0 Loop & Append-Only Log)] -> VERIFIED
         |
         v
[TASK-208: Adversarial Test Suite Execution & Cryptographic Attestation] -> VERIFIED
```

---

### Task Ledger

| Task ID | Description | Dependencies | Done Criteria | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TASK-201** | Freeze and deprecate legacy `EVD-0001-BASELINE-STRICT-PASS.json` as `HISTORICAL_UNTRUSTED` | None | Header and status updated in file | `VERIFIED` |
| **TASK-202** | Implement pure Domain Entity `AttestationRecord` and `TrustPolicy` | TASK-201 | Pure domain classes in `src/core/domain/models/` | `VERIFIED` |
| **TASK-203** | Implement `AsymmetricCryptoService` in `src/infrastructure/` with Ed25519 support | TASK-202 | Signature verification unit tests passing | `VERIFIED` |
| **TASK-204** | Implement `AttestationVerifierService` in `src/core/application/` | TASK-203 | Read-only verification logic validated | `VERIFIED` |
| **TASK-205** | Provision `.eos/trust/` root public key and generate initial signed baseline | TASK-204 | `.eos/trust/root_pubkey.pem` and `baseline.signed.json` exist | `VERIFIED` |
| **TASK-206** | Define hermetic container runner (`docker/Dockerfile.verify`) with read-only mount rules | TASK-205 | Container build and execution scripts defined | `VERIFIED` |
| **TASK-207** | Implement read-only `scripts/verify-attestation.mjs` breaking P0 circular overwrite | TASK-206 | Verifier performs 0 writes to `.eos/trust/` | `VERIFIED` |
| **TASK-208** | Run adversarial verification suite (injecting mutation and asserting failure exit code 1) | TASK-207 | Deterministic exit code 1 on tamper, exit code 0 on pristine | `VERIFIED` |
