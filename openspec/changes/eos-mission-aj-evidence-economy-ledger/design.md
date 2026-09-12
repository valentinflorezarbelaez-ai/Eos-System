# Design — Mission AJ (SPEC-0041)

## Architecture

```
createEvidenceEconomyLedger({
  hash?, now?,
  store?,            // { load/save/list } — default in-memory
  map?,              // injectable Map (chain under __aj_chain__)
  costMeter?,        // optional { record, totals }
  requireCostMeter?=false,
  onReceipt?, throwOnDeny?
})
  append(entry)          // hash-chained EVD; prevDigest; sanitize; Fundacion DENY
  verifyChain() / verify()  // genesis empty PASS; tamper/break → DENY
  query(filter)          // missionId/sessionId/kind/time; sanitized only
  aggregateCosts(filter?) // observe-only tokens/costUnits
  sealReceipt(outcome)   // deny/allow forensic receipt
    kind:'eos-evidence-economy-ledger', PRODUCTION_READY:'NO'
```

AJ is an **EVD aggregation ledger layer**. ADR-0015 HashChainedLedger
stays the custody SSOT — do not fork a second custody core.

## Fail-closed codes

| Condition | Code |
|-----------|------|
| prevDigest link mismatch / missing digest | `CHAIN_BROKEN` |
| recomputed hash ≠ stored digest | `TAMPER_DETECTED` |
| null / non-object append | `INVALID_ENTRY` |
| hash/store/map/costMeter invalid or required-missing | `MISSING_DEP` |
| Fundacion write target on entry | `FUNDACION_DENY` |

## Chain model

- Single append-only chain (trans-session): entries carry `sessionId`
  + `missionId` + optional `priorTip` / `custodyDigest`.
- Body hashed with stable stringify (digest excluded). `prevDigest`
  links the prior tip (null at first entry).
- Genesis (length 0) verify → PASS.
- Tamper of stored payload / digest → `TAMPER_DETECTED`.
- Broken prevDigest pointer → `CHAIN_BROKEN`.
- Dependent autonomy actions (AI resume / AK gate / AL replay) MUST
  DENY when verify fails (forensic receipt sealed). This mission
  exposes the verify+receipt surface; it does not implement AK/AL/AM.

## Law VI

- Deep redact api_key / token / authorization / secret / password /
  provider_key
- Vendor-style key substrings via runtime-built regex (never static
  vendor-key prefix literals — AF11 lesson)
- Query / receipts / getState never echo secrets
- `rg`-style check: src+tests contain zero vendor-key prefix substring

## Cost attribution

- `entry.cost.tokens` / `entry.cost.costUnits` (or top-level aliases)
- Optional injectable `costMeter.record` / `.totals`
- `aggregateCosts` is observe-only — ≠ billing product

## EARS (from L15 audit)

- WHEN a governed mission emits an EVD receipt, THE SYSTEM SHALL
  append a hash-chained ledger entry linked to the prior tip.
- IF chain verification fails, THE SYSTEM SHALL DENY dependent
  autonomy actions and emit a forensic receipt.
- WHILE querying the ledger, THE SYSTEM SHALL return only sanitized
  fields (no provider secrets / no Fundacion paths writable).

## Controls

| ID | Control |
|----|---------|
| AJ1 | kind + PRODUCTION_READY NO + NON-CLAIM |
| AJ2 | append + chain continuity |
| AJ3 | verify PASS intact / genesis empty |
| AJ4 | tamper DENY TAMPER_DETECTED / CHAIN_BROKEN |
| AJ5 | query filters |
| AJ6 | query sanitization (runtime synth) |
| AJ7 | aggregateCosts observe-only |
| AJ8 | trans-session integrity |
| AJ9 | missing deps MISSING_DEP |
| AJ10 | Fundacion ALWAYS DENY |
| AJ11 | INVALID_ENTRY |
| AJ12 | sealReceipt deny/allow |
| AJ13 | hermetic no network / no CloudAgent |
| AJ14 | Law VI no vendor-key prefix substring |
| AJ15 | NON-CLAIM markers in comments |
| AJ16 | cost tracker + injectable map |
