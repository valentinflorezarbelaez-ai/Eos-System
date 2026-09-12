# Design — Mission AQ (SPEC-0048)

## Architecture

```
operator exportRange(range)
        │
        ▼
  AJ-like ledger.query(filter)  ──► sanitized entries
        │
        ▼
  buildSealedEvdPack(manifest + chainTip + entryDigests)
        │
        ├── optional AL timeline.exportTimeline (observe-only)
        └── optional notary.observe (NOTARY_OBSERVE_ONLY; never compliance)

verifyPack(pack)
        │
        ├── recompute entryDigests + packDigest
        ├── mismatch → TAMPER_DETECTED / VERIFY_FAIL (forensic; no silent accept)
        └── OK → verified=true, silentAccept=false
```

## Injectables

| Dep | Shape | Required |
| --- | --- | --- |
| ledger | `{ tip(), query? / getEntries? }` AJ-like | yes (MISSING_DEP) |
| timeline | `{ exportTimeline? }` AL-like | optional |
| notary | `{ observe, getReceipts? }` | optional; auto-created when notarizationObserve |
| hash / now | pure | optional (defaults) |

## Law VI

Runtime-synthesized vendor-prefix (`['s','k','-'].join('')` /
`String.fromCharCode(115,107,45)`). Never static literals. Packs/receipts/
getState always sanitized; persistSecrets → SECRET_LEAK_FORBIDDEN.

## NON-CLAIM

Export/notary ≠ compliance cert ≠ external audit platform ≠ legal notary;
not AR; Fundacion Δ=0; Antigravity-first; AQ_PRODUCTION_READY=NO.
