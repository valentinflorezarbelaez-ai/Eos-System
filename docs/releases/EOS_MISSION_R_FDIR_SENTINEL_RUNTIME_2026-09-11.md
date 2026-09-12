# Mission R — Governed FDIR Sentinel Runtime (SPEC-0023) — 2026-09-11

## Summary

Governed FDIR sentinel **runtime overlay** that monitors SHA-256 baselines of
control-plane directive/ledger paths, detects orphan links
(`ORPHAN_LINK_DETECTED`), and fail-closed auto-quarantines unaudited mutations
(`UNAUDITED_MUTATION_QUARANTINED`) via injectable ports. New module
`src/core/fdir/fdir-sentinel-runtime.js` — **not** a second `EOSSentinelDaemon`,
**not** agy-daemon, **not** eos-compute-worker-runtime, **not** PRODUCTION_READY.

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createFdirSentinelRuntime` → start/stop/status/health/tick |
| Watch ports | Injected `hashFile` / `detectOrphans` / `quarantine` (required for mismatch) |
| Optional live wire | `bindExistingSentinelDaemon` → `ejecutarLatido` (tests prefer ports) |
| AGY T7/U5 | **NON-CLAIM** — remains honest DAEMON_ABSENT; kind=`eos-fdir-sentinel-runtime` |
| N6 lock | sentinel-daemon.js / fdir.js / fdir-ontology.js **unchanged** |
| ATS | Non-claim |

## Quarantine policy

Default: remain **RUNNING** after quarantine applied + events; `quarantines++`.
Optional `haltOnQuarantine:true` → state **QUARANTINED**; further ticks throw
`SENTINEL_NOT_RUNNING`.

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/fdir/fdir-sentinel-runtime.js` | **NEW** |
| `tests/fdir/fdir-sentinel-runtime.test.js` | **NEW** |
| `src/core/sentinel-daemon.js` | **No** (not shipped) |
| `src/core/fdir.js` / `fdir-ontology.js` | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/mission-r/harness && node --test tests/fdir/fdir-sentinel-runtime.test.js
```

→ **12 PASS**, 1 SKIP, 0 FAIL

Slim exclude `fdir-sentinel-runtime.test.js` + `npm run test:fdir-sentinel` / `test:mission-r`.

## Cases

| ID | Result |
| --- | --- |
| R1 PRODUCTION_READY=NO + STOPPED default | PASS |
| R2 start → RUNNING + kind | PASS |
| R3 tick nominal | PASS |
| R4 hash mismatch → quarantine + codes | PASS |
| R5 orphan → ORPHAN_LINK_DETECTED | PASS |
| R6 tick STOPPED → SENTINEL_NOT_RUNNING | PASS |
| R7 concurrent tick → SENTINEL_BUSY | PASS |
| R8 stop → reject ticks | PASS |
| R9 haltOnQuarantine → QUARANTINED | PASS |
| R10 health never claims AGY / PR yes | PASS |
| R11 events ledger append-only order | PASS |
| R12 Optional live soak | SKIP |
| R10b NON-CLAIM source strings | PASS |

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `2713ab2be195c6b6969e6ccff5ccd2b089786e37`
- **NON-CLAIM vs AGY T7:** ≠ agy-daemon; does not install or claim DAEMON_PRESENT
- **NON-CLAIM vs N6:** does not rewrite live sentinel-daemon / fdir surfaces

## Branch

`grok/mission-r-fdir-sentinel-runtime`
