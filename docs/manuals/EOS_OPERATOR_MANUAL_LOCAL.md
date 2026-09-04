# EOS Mission OS — Operator Manual (local governed)

```text
branch tip (at write time): see RELEASE_CAPABILITY_MATRIX.md
audience: Human Director / junior operator
network: blocked for MVP
```

## Concepts

| Term | Meaning |
| --- | --- |
| Mission OS | Local control plane CLI (`node bin/eos.js`) |
| ATS | AuthorityTruthSource — sole phase writer |
| commitTransition | Only API that persists FSM phase changes |
| HITL | Human-in-the-loop receipt required for gated transitions |
| Fixture | Disposable local project folder — never Fundación |

## Quick start

```powershell
cd <checkout-of-release/eos-mission-os-rc>
node bin/eos.js --help
# or
npm run eos:mission -- --help

# In a disposable folder:
node bin/eos.js mission create --goal "Prove local cycle" --project .
node bin/eos.js mission plan <MISSION_ID>
node bin/eos.js mission package <MISSION_ID>
node bin/eos.js mission report <MISSION_ID>
node bin/eos.js mission pause <MISSION_ID>
node bin/eos.js mission resume <MISSION_ID>
node bin/eos.js mission close <MISSION_ID>
```

Create/plan/close print Tutor pre/post explanations. `mission plan` walks the canonical FSM (VISION → FORMULATION → HUMAN_DIRECTION_GATE → DISCOVER → DEFINE → PLAN). By default it may issue a `MEASURED_LOCAL_FIXTURE` HITL receipt under LOCAL_BOUNDED autonomy; use `--hitl-receipt <file>` or `--require-hitl` for external director control.

## Observe

- Exit code 0/1
- `.missions/<id>/authority-snapshot.json` vs `mission-package.json` phase
- Ledger under `.missions/<id>/ledger/`
- Tasks should be `PLANNED` until real evidence promotes them

## Diagnose

| Symptom | Likely cause |
| --- | --- |
| `TRANSITION_DENIED` | Illegal FSM move or missing artifact |
| `HITL_DENIED` | Missing/invalid human receipt |
| `FDIR_SAFE_MODE` | Kill switch tripped — do not force close |
| `npm run eos` looks wrong | Legacy harness — use `eos:mission` |

## Recover

1. Prefer `mission pause` then inspect.
2. Checkpoint/restore helpers exist on TransitionEnforcer (tests cover restore).
3. Disposable fixtures: delete the temp project directory.
4. Never `git reset --hard` on main to “fix” Mission OS.

## SDD vs DIRECT (organic routing)

When changing this repo (or an authorized target), pick the smallest honest route. **File/diff size alone does not force SDD.** Canonical rule: `docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`.

| Route | Use when |
| --- | --- |
| **DIRECT** | Local already-scoped fix, docs/formatting, no new subsystem or external write. |
| **SDD** (LIDR Specboot) | Human asks for OpenSpec / Specboot; proposal already accepted; new feature, architecture, public contract; or any external write (plus HITL / write barrier). |

Cycle when SDD applies: `/enrich-us` → `/ff` or `/propose` → `/apply` → `/verify` → `/adversarial-review` → `/archive` → `/commit`.

Independent review (RDD) is informational. It does **not** authorize commit-to-main, merge, release, or Fundación writes.

**Enforced in code** (see `docs/manuals/OPENSPEC_RUNTIME.md` § Enforcement surfaces):

- Accidental SDD ceremony spawn is fail-closed. `eos mission plan <id> --spawn-sdd` needs `--explicit-sdd` or `--sdd-override`.
- Apply-complete without RED→GREEN receipts cannot pass `eos mission verify --strict-tdd` / `verify-eos --strict` TDD checks.
- `/adversarial-review` cannot grant write or delivery.

These slash names are operator vocabulary (`opsx:propose` / `opsx:apply` / `opsx:archive` are the same ceremony). They do not replace `node bin/eos.js` / `npm run eos:mission`. OpenSpec folders and optional CLI: `docs/manuals/OPENSPEC_RUNTIME.md`. Prefer Given/When/Then in specs.

## Non-goals

Production, credentials, network APIs, merge to main, Fundación mutation.
