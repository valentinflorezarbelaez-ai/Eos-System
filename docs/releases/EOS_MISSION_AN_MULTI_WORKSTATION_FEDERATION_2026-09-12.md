# Mission AN — Multi-Workstation / Session Federation Port (SPEC-0045) — 2026-09-12

## Summary

Hermetic **Multi-Workstation Session Federation Port** — injectable federation
port over AI+W-style session custody for sealed portable custody envelope
handoff/sync across local peer workstations. Fail-closed on tamper, tip
mismatch, conflicting custody heads, and partial sync apply. Hermetic fakes
only (no real LAN in CI). Law VI deep-redacts secrets from getState /
receipts (runtime synth only — no static vendor-key literals). Additive under
`src/core/federation/` — **does not** implement AO/AP/AQ/AR, **does not**
flip PRODUCTION_READY, **does not** use CloudAgent, **does not** open live
network in CI, **does not** claim cloud fleet / multi-tenant SaaS products.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `2123ca2` (`2123ca270725a072049d5203306fa531b67dafe3`) |
| Branch | `grok/mission-an-multi-workstation-session-federation-port` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-an` |
| Payload | `C:\Users\valen\Documents\Eos-mission-an-payload` |
| Ladder 16 | audit MEASURED; **AN this mission**; AO/AP/AQ/AR not this mission |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Operator federation | **NON-CLAIM** — ≠ cloud agent fleet ≠ multi-tenant SaaS ≠ CloudAgent ≠ PRODUCTION_READY |
| AO/AP/AQ/AR | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Real LAN in CI | **FORBIDDEN** — hermetic fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createMultiWorkstationSessionFederationPort` |
| Export | `exportHandoff(sessionId)` → sealed portable custody envelope |
| Import | `importHandoff(envelope, { expectedTip? })` → ok+record or DENY |
| Sync | `syncPeer(peerId, envelopes\|diff)` — fail-closed; no partial apply |
| Verify / seal | `verifyEnvelope` / `sealReceipt` |
| Fail-closed codes | `TAMPER_DETECTED`, `TIP_MISMATCH`, `CUSTODY_CONFLICT`, `PARTIAL_APPLY_FORBIDDEN`, `UNKNOWN_SESSION`, `INVALID_ENVELOPE`, `MISSING_DEP`, `FUNDACION_DENY`, `SYNC_IN_PROGRESS` |
| Law VI | `sanitizeAnPayload` — redact apiKey/token/authorization/secret/password |
| Receipt | sealed EVD receipt on export/import/sync/deny; `PRODUCTION_READY:'NO'` |
| Transport | in-memory `peerTransport` fake for CI |
| AGY / CloudAgent | **NON-CLAIM** |

## EARS

- WHEN durable AI session exported for federation handoff → seal portable custody envelope consumable by peer workstation without mutating Fundacion
- IF federation import detects tamper, tip mismatch, or conflicting custody heads → DENY import + sealed receipt
- WHILE federation sync in progress → fail-closed (no partial apply; no silent merge of divergent session ledgers)

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/federation/multi-workstation-session-federation-port.js` | **NEW** |
| `src/core/federation/federation-custody-envelope.js` | **NEW** |
| `tests/eos-an-multi-workstation-session-federation.test.js` | **NEW** |
| `scripts/patch-mission-an.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AO/AP/AQ/AR modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-an-payload && npm run test:mission-an
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AN1–AN16)

Slim exclude basename: `eos-an-multi-workstation-session-federation.test.js`  
Scripts: `npm run test:multi-workstation-federation` / `npm run test:mission-an`

## Cases

| ID | Result |
| --- | --- |
| AN1 kind + PRODUCTION_READY NO | PASS |
| AN2 export/import across 2 fake workstations | PASS |
| AN3 tamper DENY TAMPER_DETECTED | PASS |
| AN4 tip mismatch DENY TIP_MISMATCH | PASS |
| AN5 custody conflict DENY CUSTODY_CONFLICT | PASS |
| AN6 sync fail-closed no partial apply | PASS |
| AN7 Fundacion ALWAYS DENY | PASS |
| AN8 PRODUCTION_READY NO pinned | PASS |
| AN9 Law VI no static vendor-key literals | PASS |
| AN10 Law VI sanitize runtime synth | PASS |
| AN11 NON-CLAIM markers | PASS |
| AN12 MISSING_DEP when injectors absent | PASS |
| AN13 UNKNOWN_SESSION / INVALID_ENVELOPE | PASS |
| AN14 hermetic no network / no CloudAgent | PASS |
| AN15 sync custody conflict + SYNC_IN_PROGRESS | PASS |
| AN16 seal/verify helpers + metrics | PASS |

## NON-CLAIM (permanent — L16 audit aligned)

**operator federation / multi-workstation sync ≠ cloud agent fleet**;
**≠ multi-tenant SaaS**; **≠ CloudAgent**; **≠ PRODUCTION_READY**.
Fundacion Δ=0. CloudAgent out. Do not implement AO/AP/AQ/AR in this branch.
