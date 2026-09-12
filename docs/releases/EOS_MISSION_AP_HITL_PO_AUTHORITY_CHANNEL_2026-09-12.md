# Mission AP — HITL / PO Authority Channel Hardening (SPEC-0047) — 2026-09-12

## Summary

Hermetic **HITL / PO Authority Channel** — injectable channel over AI HITL
threshold + AK constitution gate building blocks: escalate → `openRequest` →
`decide(approve|deny)` / `tickTimeout` → resume / DENY + sealed receipt with
AJ-like ledger tip linkage; injectable AF-like scheduler pause so dependent
cycles do not advance while authority is open. Timeout → DENY (never
auto-approve). Hermetic fakes only. Law VI: secrets sanitized; never persist
into receipts/state (runtime synth only — no static vendor-key literals).
Additive under `src/core/authority/` — **does not** implement AQ/AR, **does
not** flip PRODUCTION_READY, **does not** use CloudAgent, **does not** claim
GH branch-protection enforcement / org IAM / PRODUCTION_READY approval SaaS.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `b7929e6` (`b7929e60249818ea1b09b55d6480e609756fbddf`) |
| Branch | `grok/mission-ap-hitl-po-authority-channel` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ap` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ap-payload` |
| Ladder 16 | AN MEASURED (#235); AO MEASURED (#237 @ `b7929e6…`); **AP this mission**; AQ/AR not this mission |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `AP_PRODUCTION_READY='NO'` |
| HITL/PO authority | **NON-CLAIM** — ≠ GH required-check / branch-protection enforcement |
| Org IAM | **NON-CLAIM** — ≠ org IAM product |
| Approval SaaS | **NON-CLAIM** — ≠ PRODUCTION_READY approval SaaS |
| AQ/AR | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Auto-approve on timeout | **FORBIDDEN** — timeout → DENY + forensic receipt |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createHitlPoAuthorityChannel` |
| Escalate / open | `openRequest(request)` — pause scheduler + HITL_REQUIRED + sealed receipt |
| Decide | `decide(requestId, approve\|deny)` — resume on approve; DENY+forensic on deny |
| Timeout | `tickTimeout({ nowMs?, requestId? })` — AUTHORITY_TIMEOUT DENY; autoApproved=false |
| Dependent cycles | `tryAdvanceDependentCycle(meta)` — SCHEDULER_BLOCKED while open |
| Seal / state | `sealReceipt(...)` / `getState()` / `getOpenRequests()` / `getReceipts()` |
| Fail-closed codes | `HITL_REQUIRED`, `AUTHORITY_DENIED`, `AUTHORITY_TIMEOUT`, `AUTHORITY_OPEN`, `MISSING_DEP`, `INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `LEDGER_LINK_FAIL`, `SCHEDULER_BLOCKED` (+ `AUTHORITY_APPROVED`, `OK`) |
| Law VI | `sanitizeApPayload` — redact apiKey/token/authorization/secret/password; runtime vendor-prefix synth |
| Ledger | injectable AJ-like `{ tip, append? }` (`createMemoryAuthorityLedger`) |
| Scheduler | injectable AF-like `{ pause, resume, isPaused, advanceCycle? }` (`createMemoryAuthorityScheduler`) |
| Gate | optional AK-like `{ evaluate }` (`createMemoryConstitutionGate`) |
| Receipt helper | `authority-receipt.js` / `buildAuthorityReceipt` |
| AGY / CloudAgent | **NON-CLAIM** |

## EARS

- WHEN a long-horizon autonomy action requires HITL/PO authority → pause scheduling and open an authority request with sealed receipt linkage to an injectable AJ-like ledger
- IF authority request times out or is denied → DENY the pending action and emit a forensic receipt (no auto-approve)
- WHILE an authority request is open → do not advance dependent AF-like cycles (injectable scheduler pause / SCHEDULER_BLOCKED)

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/authority/hitl-po-authority-channel.js` | **NEW** |
| `src/core/authority/authority-receipt.js` | **NEW** |
| `tests/eos-ap-hitl-po-authority-channel.test.js` | **NEW** |
| `scripts/patch-mission-ap.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AQ/AR modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ap-payload && node --test tests/*.test.js
```

→ **17 PASS**, 0 SKIP, 0 FAIL (AP1–AP17)

Slim exclude basename: `eos-ap-hitl-po-authority-channel.test.js`  
Scripts: `npm run test:hitl-po-authority` / `npm run test:mission-ap`

## Cases

| ID | Result |
| --- | --- |
| AP1 kind + PRODUCTION_READY NO | PASS |
| AP2 escalate openRequest + pause scheduler | PASS |
| AP3 approve → resume + ledger-linked receipt | PASS |
| AP4 deny → DENY + forensic receipt | PASS |
| AP5 timeout → DENY (no auto-approve) | PASS |
| AP6 open request blocks dependent cycle | PASS |
| AP7 MISSING_DEP | PASS |
| AP8 INVALID_REQUEST | PASS |
| AP9 Law VI secrets / SECRET_LEAK_FORBIDDEN | PASS |
| AP10 Law VI no static vendor-key literals (rg CLEAN) | PASS |
| AP11 NON-CLAIM markers | PASS |
| AP12 Fundacion ALWAYS_DENY / Δ=0 | PASS |
| AP13 hermetic + fail-closed codes | PASS |
| AP14 PRODUCTION_READY NO pinned | PASS |
| AP15 AN/AO/AL-style injector consumers | PASS |
| AP16 LEDGER_LINK_FAIL + gate DENY + helpers | PASS |
| AP17 getState NON-CLAIM + AUTHORITY_OPEN | PASS |

## Kind / PRODUCTION_READY

- Kind: `eos-hitl-po-authority-channel`
- `AP_PRODUCTION_READY = 'NO'`
