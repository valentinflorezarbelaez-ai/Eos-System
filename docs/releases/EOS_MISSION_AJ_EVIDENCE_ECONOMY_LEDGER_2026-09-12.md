# Mission AJ — Evidence Economy Ledger (SPEC-0041) — 2026-09-12

## Summary

Hermetic **Evidence Economy Ledger** — append-only hash-chained EVD
aggregation + chain verify + sanitized query SSOT at scale for AI / AK /
AL consumers. Trans-session integrity (`sessionId` + `missionId` +
`priorTip` / `custodyDigest` on one chain). Observe-only cost
attribution (tokens / cost units). Law VI deep-redacts secrets from
query / receipts (runtime synth only — no static vendor-key prefix
substring). Additive under `src/core/evidence/` — **does not** implement
AK/AL/AM, **does not** flip PRODUCTION_READY, **does not** use
CloudAgent, **does not** open live network in CI, **does not** claim
external audit / compliance / billing products, **does not** fork a
second custody core (ADR-0015 HashChainedLedger remains custody SSOT).

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `ccb25a9` (`ccb25a937cc4ae40b4cfb33cfd53e697af8f2eed`) |
| Branch | `grok/mission-aj-evidence-economy-ledger` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-aj` |
| Payload | `C:\Users\valen\Documents\Eos-mission-aj-payload` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| EVD ledger | **NON-CLAIM** — ≠ external audit platform ≠ compliance certification ≠ PRODUCTION_READY |
| Cost tracking | **NON-CLAIM** — multi-session cost tracking ≠ billing product |
| Custody core | **NON-CLAIM** — not a second competing custody core (ADR-0015) |
| AK/AL/AM | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Live network in CI | **FORBIDDEN** — hermetic fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createEvidenceEconomyLedger` |
| Append | `append(entry)` — prevDigest-linked, sanitized |
| Verify | `verifyChain()` / `verify()` — genesis PASS; break → DENY |
| Query | `query(filter)` — sanitized missionId/sessionId/kind/time |
| Costs | `aggregateCosts(filter?)` — observe-only |
| Receipt | `sealReceipt(outcome)` + deny/allow forensic receipts |
| Fail-closed codes | `CHAIN_BROKEN`, `TAMPER_DETECTED`, `INVALID_ENTRY`, `MISSING_DEP`, `FUNDACION_DENY` |
| Law VI | `sanitizeLedgerPayload` — redact apiKey/token/authorization/secret/password |
| Store | durable in-memory default + injectable `{ load, save }` / `Map` |
| AGY / CloudAgent | **NON-CLAIM** |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/evidence/evidence-economy-ledger.js` | **NEW** |
| `src/core/evidence/evidence-cost-tracker.js` | **NEW** |
| `tests/eos-aj-evidence-economy-ledger.test.js` | **NEW** |
| `scripts/patch-mission-aj.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AK/AL/AM modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-aj-payload && npm run test:mission-aj
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AJ1–AJ16)

Slim exclude basename: `eos-aj-evidence-economy-ledger.test.js`  
Scripts: `npm run test:evidence-economy-ledger` / `npm run test:mission-aj`

## Cases

| ID | Result |
| --- | --- |
| AJ1 kind + PRODUCTION_READY NO + NON-CLAIM | PASS |
| AJ2 append + chain continuity | PASS |
| AJ3 verify intact / genesis empty PASS | PASS |
| AJ4 tamper DENY TAMPER_DETECTED / CHAIN_BROKEN | PASS |
| AJ5 query filters | PASS |
| AJ6 query sanitization (runtime synth) | PASS |
| AJ7 aggregateCosts observe-only | PASS |
| AJ8 trans-session integrity | PASS |
| AJ9 missing deps MISSING_DEP | PASS |
| AJ10 Fundacion ALWAYS DENY | PASS |
| AJ11 INVALID_ENTRY | PASS |
| AJ12 sealReceipt deny/allow | PASS |
| AJ13 hermetic no network / no CloudAgent | PASS |
| AJ14 Law VI no vendor-key prefix substring | PASS |
| AJ15 NON-CLAIM markers in comments | PASS |
| AJ16 cost tracker + injectable map | PASS |

## NON-CLAIM (permanent)

**EVD ledger ≠ external audit platform**; **≠ compliance certification**;
**≠ PRODUCTION_READY**. **Multi-session cost tracking ≠ billing product**.
Not a second custody core. Fundacion Δ=0. CloudAgent out.
Do not implement AK/AL/AM in this branch.
