# Mission AQ — Evidence Export & Notarization Observer (SPEC-0048) — 2026-09-12

## Summary

Hermetic **Evidence Export & Notarization Observer** — injectable export over
AJ EVD ledger (+ optional AL timeline): `exportRange` → sealed pack (manifest
hashes linked to AJ chain tip); `verifyPack` → forensic FAIL on tamper/missing
hash (no silent accept); `observeNotary` → optional notary stub receipts
WITHOUT claiming legal compliance certification. Hermetic fakes only. Law VI:
secrets sanitized; never persist into packs/receipts/state (runtime synth only
— no static vendor-key literals). Additive under `src/core/evidence/` — **does
not** implement AR, **does not** flip PRODUCTION_READY, **does not** use
CloudAgent, **does not** claim compliance cert / external audit platform /
legal notarization service.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `b991c3d` (`b991c3dd59d2ba98cf292c6ee2a6fbe858f967ad`) |
| Branch | `grok/mission-aq-evidence-export-notarization-observer` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-aq` |
| Payload | `C:\Users\valen\Documents\Eos-mission-aq-payload` |
| Ladder 16 | AN+AO+AP MEASURED; **AQ this mission**; AR not this mission |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `AQ_PRODUCTION_READY='NO'` |
| Compliance certification | **NON-CLAIM** — ≠ compliance certification product |
| External audit platform | **NON-CLAIM** — ≠ external audit platform |
| Legal notarization | **NON-CLAIM** — ≠ legal notarization service; observe-only stub |
| AR | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createEvidenceExportNotarizationObserver` |
| Export | `exportRange(request)` — sealed pack + chain tip + manifest |
| Verify | `verifyPack(pack)` — OK or TAMPER_DETECTED / VERIFY_FAIL (forensic) |
| Notary | `observeNotary(pack)` — NOTARY_OBSERVE_ONLY when mode ON |
| Seal / state | `sealPack(...)` / `getState()` / `getPacks()` / `getNotaryReceipts()` |
| Fail-closed codes | `EXPORT_OK`, `VERIFY_FAIL`, `TAMPER_DETECTED`, `MISSING_DEP`, `INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `LEDGER_RANGE_EMPTY`, `NOTARY_OBSERVE_ONLY`, `PACK_SEAL_FAIL` (+ `OK`) |
| Law VI | `sanitizeAqPayload` — redact apiKey/token/authorization/secret/password; runtime vendor-prefix synth |
| Ledger | injectable AJ-like `{ tip, query? / getEntries? }` (`createMemoryExportLedger`) |
| Timeline | optional AL-like `{ exportTimeline }` (`createMemoryTimelineExporter`) |
| Notary | optional stub `{ observe }` (`createNotaryStub`) |
| Pack helper | `sealed-evd-pack.js` / `buildSealedEvdPack` |
| AGY / CloudAgent | **NON-CLAIM** |

## EARS

- WHEN an operator requests evidence export for a ledger range → emit a sealed pack with manifest hashes linked to the AJ chain tip (injectable ledger fake)
- IF pack verification fails on re-check → report forensic failure (no silent accept)
- WHILE notarization observe mode is enabled → record notary stub receipts without claiming legal compliance certification

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/evidence/evidence-export-notarization-observer.js` | **NEW** |
| `src/core/evidence/sealed-evd-pack.js` | **NEW** |
| `src/core/evidence/notary-stub.js` | **NEW** |
| `tests/eos-aq-evidence-export-notarization.test.js` | **NEW** |
| `scripts/patch-mission-aq.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AR modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-aq-payload && node --test tests/*.test.js
rg vendor-prefix CLEAN on src+tests (runtime synth only; no static literals)
```

## Host bootstrap (operator — NOT run by box agent)

`MISSION_AQ_BOOTSTRAP.ps1` — Expected StartsWith `b991c3d`; worktree
`Eos-mission-aq`; copy files; patcher; `npm run test:evidence-export-notarization`
+ `npm run test:mission-aq`; slim≤145; verify:strict; commit; push.
WARN on tip mismatch but continue.

## Commit message

```
feat(evidence): evidence export & notarization observer (SPEC-0048)
```
