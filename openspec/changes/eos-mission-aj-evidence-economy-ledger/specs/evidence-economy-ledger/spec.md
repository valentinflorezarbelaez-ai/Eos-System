# Spec — Evidence Economy Ledger (SPEC-0041 / Mission AJ)

## Purpose

Provide a hermetic, fail-closed **Evidence Economy Ledger**: append-only
hash-chained EVD aggregation, chain verification, sanitized query SSOT,
and observe-only cost attribution — without becoming an external audit
platform, compliance certification product, billing product, or a
second custody core.

## Requirements

### R1 — Factory & kind
- `createEvidenceEconomyLedger(options)` returns object with
  `kind: 'eos-evidence-economy-ledger'` and `PRODUCTION_READY: 'NO'`.

### R2 — Append-only chain
- `append(entry)` SHALL append a hash-chained EVD entry linked to the
  prior tip via `prevDigest` (null at genesis / first entry).
- Fields SHALL be sanitized (no provider secrets; no Fundacion writable
  paths stored as live targets).

### R3 — Verify
- `verifyChain()` / `verify()` SHALL PASS on an intact chain.
- Genesis (empty) chain SHALL PASS.
- prevDigest mismatch / missing digest → `CHAIN_BROKEN` DENY + receipt.
- Recomputed digest mismatch → `TAMPER_DETECTED` DENY + receipt.

### R4 — Query
- `query(filter)` SHALL filter by missionId / sessionId / kind / time
  range and return only sanitized fields (never secrets).

### R5 — Trans-session integrity
- Entries MAY carry `sessionId` + `missionId` + `priorTip` /
  `custodyDigest`. One chain MAY contain multiple sessionIds; verify
  SHALL still PASS when links are intact.

### R6 — Cost attribution
- `aggregateCosts(filter?)` SHALL sum tokens / cost units (from
  `entry.cost` or injected meter). Observe-only. ≠ billing product.

### R7 — Fail-closed deps
- Invalid / missing injectables (`hash`, `store`, `map`, required
  `costMeter`) → `MISSING_DEP`.
- Non-object append → `INVALID_ENTRY`.

### R8 — Fundacion
- Entry that names a Fundacion write target → `FUNDACION_DENY`.
- Fundacion Δ=0; no writes.

### R9 — Law VI
- Redact secrets from query / receipts / getState.
- No static vendor-key prefix substring in source/tests (runtime synth).

### R10 — Receipts
- `sealReceipt(outcome)` and append/verify denials emit forensic
  receipts with `PRODUCTION_READY:'NO'`.

### R11 — Honesty
- `health()` / `getState()` carry NON-CLAIM flags.
- Do NOT implement AK/AL/AM.
- Not a second custody core (ADR-0015 HashChainedLedger remains
  custody SSOT).
- No CloudAgent; no live network in CI.

### R12 — Tests
- Hermetic suite ≥12 PASS; slim-excluded basename
  `eos-aj-evidence-economy-ledger.test.js`.

## EARS

- WHEN a governed mission emits an EVD receipt, THE SYSTEM SHALL
  append a hash-chained ledger entry linked to the prior tip.
- IF chain verification fails, THE SYSTEM SHALL DENY dependent
  autonomy actions and emit a forensic receipt.
- WHILE querying the ledger, THE SYSTEM SHALL return only sanitized
  fields (no provider secrets / no Fundacion paths writable).

## Non-requirements
- AK/AL/AM, PRODUCTION_READY flip, CloudAgent, real Fundacion writes,
  external audit platform, compliance certification, billing product,
  second custody core.
