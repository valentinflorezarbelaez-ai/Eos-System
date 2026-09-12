# Mission U — Native Suite CI Seam-Pack Grand Consolidation (SPEC-0026) — 2026-09-11

## Summary

Extend CI `seam-pack` so **native/macro mission satellite suites** are required
in GitHub Actions (fail-closed, no soak, no continue-on-error), matching the
pattern already used for `test:compute-worker` + `test:c2`.

Satellites added to seam-pack (after existing compute-worker + C2):

| Script | Macro / mission |
| --- | --- |
| `test:compute-worker-i` | Mission I |
| `test:compute-worker-l` | Mission L |
| `test:compute-worker-m` | Mission M |
| `test:compute-worker-n` | Mission N |
| `test:compute-worker-o` | Mission O |
| `test:loop-compute` | Mission P |
| `test:worker-daemon` | Mission Q |
| `test:fdir-sentinel` | Mission R |
| `test:specboot-agent` | Mission S |
| `test:external-write-gateway` | Mission T |

Local/CI alias: `npm run test:native-suite-pack` (chains the ten scripts).
Lock: `npm run test:mission-u` / `test:u11`.

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** |
| PRODUCTION_READY | **NO** (never YES) |
| TR-01 slim ceiling | **not raised** — satellites stay slim-excluded; seam-pack run OK |
| soak / continue-on-error | **forbidden** |
| CloudAgent | **out** — Antigravity-first / box-only |
| GH billing / branch-protection enforcement | **NON-CLAIM** — local surrogate ≠ GH enforcement |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `.github/workflows/ci.yml` | seam-pack +10 satellite runs |
| `package.json` | `test:native-suite-pack`, `test:mission-u`, `test:u11` |
| `tests/eos-u-native-suite-seam-pack.test.js` | **NEW** lock (U1–U8) |
| `docs/governance/CI_CD_CONTRACT.md` | seam-pack row + Mission U + Ladder 11 notes |
| `docs/governance/CI_CD_CONTRACT.json` | **No** (does not enumerate seam scripts) |
| `scripts/ci/assert-gha-contract.js` | needles for 10 satellites |
| Ladder 11 closeout | `docs/releases/EOS_LADDER_11_CLOSEOUT_2026-09-11.md` |
| OpenSpec | `openspec/changes/eos-mission-u-native-suite-seam-pack/` |

## Verification (box harness)

```
cd /workspace/mission-u/harness && node --test tests/eos-u-native-suite-seam-pack.test.js
```

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | Antigravity-first | zero new npm deps
- Expected tip: `e1e0b24ca32d60468fb4808db27a6ba4990310cf` (Mission T merge; tip-174 may land later)
- Branch: `grok/mission-u-native-suite-seam-pack`
- Commit intent: `ci(seam-pack): native suite pack i/l/m/n/o + P–T satellites; Ladder 11 closeout (SPEC-0026)`

## Routing

**SDD** / SPEC-0026 / Zero vibe coding / No Cursor CloudAgent.
