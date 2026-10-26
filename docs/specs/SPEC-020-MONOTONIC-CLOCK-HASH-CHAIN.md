# SPEC-020: Monotonic High-Resolution Clock & Cryptographic Hash-Chain Ledger

## Milestone ID: `SPEC-020-MONOTONIC-CLOCK-HASH-CHAIN`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Functional Requirements (EARS Syntax)

### FR-020-01: Monotonic High-Resolution Timestamping (Event-Driven)
WHEN a system event or evidence record requests a timestamp,
THE SYSTEM SHALL capture a `MonotonicTimestamp` entity comprising ISO-8601 wall-clock string, elapsed monotonic nanoseconds, and high-resolution sequence index, strictly guaranteeing $\text{monotonicNs}_{k} \ge \text{monotonicNs}_{k-1}$.

### FR-020-02: Cryptographic Block Chaining (Event-Driven)
WHEN an evidence or telemetry block is committed to the ledger,
THE SYSTEM SHALL link the block to the previous block's SHA-256 hash, computing the current block hash as:
$$\text{currentHash} = \text{SHA256}(\text{index} \mathbin{\Vert} \text{previousHash} \mathbin{\Vert} \text{payloadHash} \mathbin{\Vert} \text{monotonicNs})$$

### FR-020-03: Genesis Block Initialization (State-Driven)
WHILE the hash chain is empty or initializing,
THE SYSTEM SHALL generate block index 0 with $\text{previousHash} = \text{"0"}^{64}$ as the immutable root of trust.

### FR-020-04: Full Chain Integrity Verification (Event-Driven)
WHEN chain verification is invoked,
THE SYSTEM SHALL iterate from genesis to the latest block, verifying that each block's `previousHash` matches the predecessor's `currentHash` and that the payload hash matches the recomputed payload data.

### FR-020-05: Tamper & Drift Detection (Error / Unwanted Condition)
IF any block's hash, payload, or monotonic sequence deviates from expected cryptographic invariants,
THEN THE SYSTEM SHALL flag the exact block index as `BROKEN_CHAIN_DETECTED` and emit a critical security alert.

### FR-020-06: CLI Chain Inspection Command (Event-Driven)
WHEN the operator executes `eos chain verify` or `eos chain status`,
THE SYSTEM SHALL verify all ledger blocks and report chain depth, integrity status, and elapsed duration.

---

## 2. Acceptance Criteria (BDD Syntax)

```gherkin
ESCENARIO: Encadenamiento criptográfico continuo de bloques
  DADO un bloque génesis en el índice 0
  CUANDO se añaden 5 bloques consecutivos de evidencia
  ENTONCES cada bloque n+1 referencia exactamente el hash del bloque n
  Y la verificación de la cadena completa retorna estado "VALID"

ESCENARIO: Detección inmediata de manipulación histórica (Tampering)
  DADO una cadena de 10 bloques de evidencia válidos
  CUANDO se muta un byte en el payload del bloque 3
  ENTONCES la verificación falla en el índice 3 reportando "BROKEN_CHAIN_DETECTED"
  Y los bloques posteriores son marcados como inválidos

ESCENARIO: Garantía de no retroceso en el reloj monotónico
  DADO un generador de marcas temporales monotónicas
  CUANDO se solicitan 100 marcas de tiempo consecutivas
  ENTONCES para todo k, monotonicNs[k] >= monotonicNs[k-1]
```

---

## 3. Non-Functional Requirements (NFR)

### NFR-020-01: Pure Domain Isolation
`src/core/domain/models/MonotonicClock.ts` and `src/core/domain/models/HashChainBlock.ts` must contain zero external dependencies and zero Node.js I/O imports (`fs`, `path`, `http`).

### NFR-020-02: Cryptographic Determinism
Block hash calculations must be 100% deterministic using standard SHA-256.
