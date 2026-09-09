# EOS N6 Sentinel/FDIR strict-verify lock - 2026-09-08

**Branch:** cursor/eos-n6-sentinel-fdir-lock
**Base main tip:** c0d63dcd6fd61dc621db85aec9371b29eb1b4f0f (N5 #51 merged)
**Scope:** N6 ONLY (Ladder 3 H6) - Sentinel/FDIR strict-verify lock
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)
**Soak:** NO (construct/API smoke only)

## Gap (H6 / DoD N6)

`eos-sentinel` + FDIR (+ontology) are live operator defense surfaces with integration tests, but `verify:strict` did not require their paths or run a light API smoke. Drift of `bin/eos-sentinel.js`, `sentinel-daemon.js`, `fdir.js`, or `fdir-ontology.js` would not fail the same gate that locks custody/engram/fusion-cp.

## Design choice (prefer fail-closed)

**Fail-closed path existence + light construct/API smoke** wired into `verify:strict`:

- REQUIRED paths: `bin/eos-sentinel.js`, `src/core/sentinel-daemon.js`, `src/core/fdir.js`, `src/core/fdir-ontology.js`
- Light smoke: construct `EOSSentinelDaemon` (STOPPED; no `iniciar`/interval), `EOSFDIR`, `EOSFDIROntology` (+ null deny); no heartbeat soak, no disk recovery campaign
- Optional HUD OBSERVED defense section (existence wiring only — not a verify substitute)
- HUD `VERIFY_SURFACE_TYPES` includes `sentinel-fdir-lock` / `sentinel-fdir-daemon` / `sentinel-fdir-engine` / `sentinel-fdir-ontology`

## Deliverables

- `scripts/lib/sentinel-fdir-lock.js`
- `scripts/verify-eos.js` REQUIRED_PATHS + `auditSentinelFdir` wire
- `src/core/observability/operator-hud.js` defense OBSERVED + surface types
- `package.json` `test:n6`
- `tests/eos-n6-sentinel-fdir-lock.test.js`
- This release note + freeze gate N6 note (Ladder 3 N1–N6 complete after merge)

## Paths locked

| Path | Role |
| --- | --- |
| `bin/eos-sentinel.js` | Operator sentinel CLI |
| `src/core/sentinel-daemon.js` | Daemon (construct-only smoke) |
| `src/core/fdir.js` | FDIR engine |
| `src/core/fdir-ontology.js` | Ontology FDIR |

## Verify commands

- test:n6
- verify:strict

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No merge without PO. No long soak / GameDay in this lock.
- PRODUCTION_READY remains NO.
- Ladder 3 N1–N6 deliverables complete on this branch tip after merge; freeze SSOT tip pin remains N1 until a future tip-refresh.
