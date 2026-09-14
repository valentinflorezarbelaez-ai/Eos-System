# Evidence — EOS Mission BG (SPEC-0064) 2026-09-14

Measured facts only. No invention beyond box records known at envelope
write time. Host SHA / verify:strict / SLIM / PR are **TBD until
bootstrap**. America/Bogota date 2026-09-14.

## Pins

| Item | Value |
| --- | --- |
| Base tip (origin/main, #280, BF MEASURED) | `37a36e9f0ed9dab61b3d997edd777e49d2eb7a16` (StartsWith `37a36e9`) |
| Branch | `grok/mission-bg-ladder19-closeout-seam-pack` |
| Host SHA | **TBD until bootstrap** |
| verify:strict | **TBD until bootstrap** |
| SLIM_COUNT | **TBD until bootstrap** (target ≤145; BG lock excluded) |
| PR | **TBD until bootstrap** |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` |
| Axis | Sovereign Delivery & Verification Fabric |
| L17 | CLOSED (never reopen) |
| L18 | CLOSED (never reopen; AX–BB MEASURED) |
| L19 | CLOSED_FOR_LOCAL_GOVERNED_USE after BG (BC+BD+BE+BF+BG MEASURED; never reopen L19 after closeout) |

## Measured results (box)

| Check | Result |
| --- | --- |
| `node --check scripts/patch-mission-bg.mjs` | **PASS** (recorded in BOX_GREEN after harness) |
| Harness `node scripts/patch-mission-bg.mjs` (first) | **applied** (ci.yml +4, package scripts, slim exclude, contract, assert needles) — see BOX_GREEN |
| Harness second run | **no-op** (idempotent) — see BOX_GREEN |
| `node --test tests/eos-bg-ladder19-seam-pack.test.js` | **PASS 18/18** (BG1–BG18) |
| Law VI scan (payload docs/scripts/tests; no BG `src/` MODULE_DIR) | **CLEAN** |
| continue-on-error / soak | **absent** in seam-pack |
| TR-01 slim | lock **EXCLUDED**; ceiling not raised |
| Host `npm run verify:strict` | **TBD until bootstrap** |
| Host SLIM_COUNT | **TBD until bootstrap** |

## Fixture harness note

Box tests are hermetic against `_fixtures/` stubs (ci.yml, package.json,
test-runner.js, CI_CD_CONTRACT.md, assert-gha-contract.js). The patcher is
run **inside the harness** (`/workspace/mission-bg-harness`) after copying
payload docs/tests/openspec/patcher. Host bootstrap patches **real**
`.github/workflows/ci.yml` and `package.json`. Do not conflate.

## Commands run (known)

Box (payload / harness):

```
node --check scripts/patch-mission-bg.mjs
# harness:
node scripts/patch-mission-bg.mjs
node scripts/patch-mission-bg.mjs   # second = no-op
node --test tests/eos-bg-ladder19-seam-pack.test.js
```

Host (TBD until bootstrap):

```
npm run test:mission-bg
npm run test:bg19
npm run test:ladder19-pack   # when BC–BF satellite tests present
node -e "import { discoverTestFiles } from './scripts/test-runner.js'; … SLIM_COUNT"
npm run verify:strict
```

## Links

- Patcher: `scripts/patch-mission-bg.mjs`
- Tests: `tests/eos-bg-ladder19-seam-pack.test.js`
- OpenSpec change: `openspec/changes/eos-mission-bg-ladder19-closeout-seam-pack/`
- ADR: `docs/adrs/ADR-0022-mission-bg-ladder19-closeout-seam-pack.md`
- Closeout: `docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md`
- Release: `docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md`
- Fragment: `docs/governance/CI_CD_CONTRACT.ladder19-fragment.md`
- Bootstrap: `MISSION_BG_BOOTSTRAP.ps1`
