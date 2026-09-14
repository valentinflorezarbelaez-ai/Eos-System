# Evidence — EOS Mission BF (SPEC-0063) 2026-09-14

Measured facts only. No invention beyond box records known at envelope
write time. Host SHA / verify:strict / SLIM / PR are **TBD until
bootstrap**. America/Bogota date 2026-09-14.

## Pins

| Item | Value |
| --- | --- |
| Base tip (origin/main, #278, BE MEASURED) | `c753cdcaef62b20b7f4c98b8140237713460d3ee` (StartsWith `c753cdc`) |
| Branch | `grok/mission-bf-local-rc-packaging-artifact-notary-port` |
| Host SHA | **TBD until bootstrap** |
| verify:strict | **TBD until bootstrap** |
| SLIM_COUNT | **TBD until bootstrap** (target ≤145; BF satellite excluded) |
| PR | **TBD until bootstrap** |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` |
| Axis | Sovereign Delivery & Verification Fabric |
| L17 | CLOSED (never reopen) |
| L18 | CLOSED (never reopen; AX–BB MEASURED) |
| L19 | OPEN (BC+BD+BE MEASURED; BF in progress; BG pending) |

## Measured results (box)

| Check | Result |
| --- | --- |
| `node --test tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js` | **18/18 PASS** (BF1–BF18) |
| `npm run test:mission-bf` / `test:local-rc-packaging` | same suite, 18/18 |
| Law VI MODULE_DIR (`src/core/delivery`) scan | **CLEAN** (0 contiguous forbidden provider-prefix literals) |
| Box `node --check` on BF `.js` / `.mjs` | PASS (4 modules + test + patcher) |
| Host `npm run verify:strict` | **TBD until bootstrap** |
| Host SLIM_COUNT | **TBD until bootstrap** |

## BF10 note

MODULE_DIR is `src/core/delivery`. **BC/BD/BE siblings may coexist** in that
directory on main. BF10 does **not** require an exclusive-BF directory. It
forbids vendoring AQ / AJ / AL (and AN/AX/BA) source filenames and imports
into `delivery/`:

- `evidence-export-notarization-observer.js`
- `evidence-economy-ledger.js`
- `evidence-cost-tracker.js`
- `autonomy-replay-forensic-observer.js`
- `forensic-timeline-export.js`
- `multi-workstation-session-federation-port.js`
- `local-sandbox-container-port.js`
- `sovereign-developer-engine.js`

BF sources must not import `developer-engine/` or `evidence/` paths, nor
rewrite BC/BD/BE facades. Compose AQ/BC/BD/BE via injectable observe ports
only.

## Commands run (known)

Box (payload):

```
node --test tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js
node --check src/core/delivery/*.js scripts/patch-mission-bf.mjs tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js
```

Host (TBD until bootstrap):

```
npm run test:mission-bf
npm run test:local-rc-packaging
node -e "import { discoverTestFiles } from './scripts/test-runner.js'; … SLIM_COUNT"
npm run verify:strict
```

## Links

- Facade: `src/core/delivery/local-rc-packaging-artifact-notary-port.js`
- Policy gate: `src/core/delivery/rc-packaging-policy-gate.js`
- Receipt: `src/core/delivery/notary-receipt.js`
- Boundary: `src/core/delivery/rc-package-boundary.js`
- Tests: `tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js`
- OpenSpec change: `openspec/changes/eos-mission-bf-local-rc-packaging-artifact-notary-port/`
- ADR: `docs/adrs/ADR-0021-mission-bf-local-rc-packaging-artifact-notary-port.md`
- Release: `docs/releases/EOS_MISSION_BF_LOCAL_RC_PACKAGING_ARTIFACT_NOTARY_2026-09-14.md`
- Bootstrap: `MISSION_BF_BOOTSTRAP.ps1`
