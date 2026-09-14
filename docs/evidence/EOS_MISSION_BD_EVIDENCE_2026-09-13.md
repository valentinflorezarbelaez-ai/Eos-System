# Evidence — EOS Mission BD (SPEC-0061) 2026-09-13

Measured facts only. No invention beyond host/box records known at
envelope write time. America/Bogota date 2026-09-13.

## Pins

| Item | Value |
| --- | --- |
| Base tip (origin/main, #275, BC MEASURED) | `cc3b3bb475f3648dfb2c05520ab7229feb70f23c` |
| Branch | `grok/mission-bd-multi-worktree-multi-target-delivery-port` |
| Code commit | `e2cc34b4474ae72b435aa583d99e98ea0b5a1e6c` |
| Envelope follow-up commit | (pending host push) — code commit `e2cc34b`; envelope commit TBD |
| PR | #276 (open; merge **not** done) |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` |
| Axis | Sovereign Delivery & Verification Fabric |
| L17 | CLOSED (never reopen) |
| L18 | CLOSED (never reopen; AX–BB MEASURED) |
| L19 | OPEN (BC MEASURED; BD in progress; BE–BG pending) |

## Measured results

| Check | Result |
| --- | --- |
| `node --test tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js` | **18/18 PASS** (BD1–BD18) |
| `npm run test:mission-bd` / `test:multi-target-delivery` | same suite, 18/18 |
| Law VI MODULE_DIR (`src/core/delivery`) scan | **CLEAN** (0 contiguous forbidden provider-prefix literals) |
| Host `npm run verify:strict` | **914 / 0** |
| Host SLIM_COUNT | **145** (≤145; BD satellite excluded) |
| Box `node --check` on BD `.js` / `.mjs` | PASS (4 modules + test + patcher) |

## BD10 fix note

MODULE_DIR is `src/core/delivery`. **BC siblings may coexist** in that
directory on main (apply-port / apply-receipt / apply-policy-gate). BD10
does **not** require an exclusive-BD directory. It forbids vendoring AN /
AX / BA source filenames and imports into `delivery/`:

- `multi-workstation-session-federation-port.js`
- `local-sandbox-container-port.js`
- `sovereign-developer-engine.js`
- `sandbox-boundary.js`
- `isolation-receipt.js`

Compose AN/BA/BC via injectable observe ports only.

## Commands run (known)

Box (payload):

```
node --test tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js
node --check src/core/delivery/*.js scripts/patch-mission-bd.mjs tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js
```

Host (code commit `e2cc34b`, not re-run in this envelope pass):

```
npm run test:mission-bd
npm run test:multi-target-delivery
node -e "import { discoverTestFiles } from './scripts/test-runner.js'; … SLIM_COUNT"
npm run verify:strict
```

## Links

- Facade: `src/core/delivery/multi-worktree-multi-target-delivery-port.js`
- Policy gate: `src/core/delivery/delivery-policy-gate.js`
- Receipt: `src/core/delivery/delivery-receipt.js`
- Boundary: `src/core/delivery/delivery-target-boundary.js`
- Tests: `tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js`
- OpenSpec change: `openspec/changes/eos-mission-bd-multi-worktree-multi-target-delivery-port/`
- Spec: `openspec/changes/eos-mission-bd-multi-worktree-multi-target-delivery-port/specs/mission-bd-multi-worktree-multi-target-delivery-port/spec.md`
- ADR: `docs/adrs/ADR-0019-mission-bd-multi-worktree-multi-target-delivery-port.md`
- Release: `docs/releases/EOS_MISSION_BD_MULTI_WORKTREE_MULTI_TARGET_DELIVERY_2026-09-13.md`
- Bootstrap: `MISSION_BD_BOOTSTRAP.ps1`

## NON-CLAIM (re-stated, not newly claimed)

port ≠ multi-tenant cloud fleet / ≠ Kubernetes CD /
≠ PRODUCTION_READY delivery product; not BE/BF/BG; no CloudAgent;
Fundacion ALWAYS_DENY; Antigravity-first.
