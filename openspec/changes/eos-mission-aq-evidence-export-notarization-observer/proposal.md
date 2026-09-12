# Proposal — Mission AQ: Evidence Export & Notarization Observer (SPEC-0048)

## Why

Ladder 16 audit ranks **Evidence Export & Notarization Observer** as the fourth
L16 satellite (after AN, AO, AP). AJ EVD ledger + AL replay give local
custody/forensics; there is no **export / notarization observer** that packs
sealed EVD packs observe-only (hash manifest + optional external notary stub)
— without claiming a compliance certification product.

## What

1. `src/core/evidence/evidence-export-notarization-observer.js` —
   `createEvidenceExportNotarizationObserver`; kind
   `eos-evidence-export-notarization-observer`;
   `exportRange` / `verifyPack` / `observeNotary` / `sealPack` / `getState`;
   injectable `{ ledger, timeline?, notary?, now, hash }`;
   fail-closed `EXPORT_OK` / `VERIFY_FAIL` / `TAMPER_DETECTED` /
   `MISSING_DEP` / `INVALID_REQUEST` / `SECRET_LEAK_FORBIDDEN` /
   `LEDGER_RANGE_EMPTY` / `NOTARY_OBSERVE_ONLY` / `PACK_SEAL_FAIL`;
   `AQ_PRODUCTION_READY='NO'`.
2. Thin `sealed-evd-pack.js` + `notary-stub.js` — seal helpers + observe-only notary.
3. Suite `tests/eos-aq-evidence-export-notarization.test.js`
   (AQ1–AQ17) hermetic; **no static vendor-key prefix substring**
   (runtime synth); slim-exclude;
   `npm run test:evidence-export-notarization` / `test:mission-aq`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-aq-evidence-export-notarization-observer` from main tip
starting with `b991c3d` (StartsWith OK); tests green (~14–18 PASS, 0 FAIL);
SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0;
no AI commit attribution; no CloudAgent; zero new npm deps; do NOT implement
AR; hermetic fakes only; observe-only notary never claims legal compliance.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AR L16 CI Seam-Pack + Closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- Compliance certification product / external audit platform / legal notary
- CloudAgent
- Static vendor API key literals in source/tests
- Claiming export/notary ≡ compliance / legal notarization
