# Design — Operator HUD SSOT

## Surfaces

| Piece | Role |
| --- | --- |
| `src/core/observability/operator-hud.js` | Collect + render. Node built-ins only. Injectable git/verify for tests. |
| `bin/eos-hud.js` / `bin/eos-top.js` | Thin CLI aliases. |
| `npm run eos:hud` | Existing package.json script style. |
| `.eos/operator-hud.json` | Optional live snapshot (gitignored). Not sealed EVD. |

## Epistemic labels

| Label | Meaning |
| --- | --- |
| `VERIFIED` | Measured in **this run** (git rev-parse, verify-eos JSON). |
| `OBSERVED` | Read from a file; always includes `source` path. |
| `NOT VERIFIED` | Missing file, skipped verify, or unparseable output. |
| `DATED_FILE_CLAIM` | Historical number in a file; shown with path + date; not SSOT. |

## Verify

Default: spawn `node scripts/verify-eos.js --strict --json` and count `checks` / `failures` from **that** report. Extract typed surfaces if present: `organic-gate`, `tdd-receipts`, `rdd-stance`, `l0-purity`. `--no-verify` leaves the panel `NOT VERIFIED`.

## Readiness

Parse `PRODUCTION_READY` and `COMPLETE_FOR_LOCAL_GOVERNED_USE` from mission `dictamen`, `docs/releases/EOS_FREEZE_GATE_STATUS.md`, and `docs/releases/RELEASE_CAPABILITY_MATRIX.md`. List each source. Do not invent a merged verdict.

## Contradiction kill

Renderer and source must not emit unattributed `1440 tests` or `482 checks`. Dated file claims (e.g. `471/471` in CURRENT_MISSION) may appear only with source path.

## Out of scope

New engines, web dashboards, Fundacion, root npm deps, mutating Core FSM.
