# EOS U6 OpenSpec CLI optional HOLD - 2026-09-09

**Branch:** cursor/eos-u6-openspec-cli-hold
**Base tip:** 1f13dc3d7d6a9e2d714a0a8a1468f5654e8a3867 (U5 #96 merged on main) — rebased onto origin/main
**Prior U5 tip (pre-merge):** 2d0a927780257018d12d487b06446692b635e2c3
**Alcance:** U6 ONLY (Ladder 9 K6) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push only; NO PR)
**AT_CEILING:** yes (no new docs/schemas JSON)
**Decision:** **CLI_ABSENT_HOLD** — OpenSpec CLI optional this quarter; fail-closed detect; do NOT invent install success; light change folder ok even if CLI absent

## Objetivo (U6 / K6 DoD)

Checklist/evidence for optional OpenSpec CLI — fail-closed:

1. Detect CLI presence (PATH + `scripts/openspec-cli.js` helper)
2. If **ABSENT** → explicit **HOLD** + ritual/checklist
3. If **PRESENT** → smoke evidence only (not invented)
4. Tests PASS (`test:u6`); Fundacion Delta=0; DEFER dirty unstaged; AT_CEILING
5. NON-CLAIM: HOLD ≠ installed; CloudAgent out of path

## Status snapshot (honest probe)

Probe machine: valentin (Windows) @ 2026-09-09 (America/Bogota). Gate NON-MUTATING; no host `npm install -g` executed.

| Surface | Status | Evidence |
| --- | --- | --- |
| Host `openspec` on PATH | **CLI_ABSENT** | `Get-Command openspec` → ABSENT; `where openspec` → not found |
| Repo helper `scripts/openspec-cli.js --version` | exit **2** (expected) | stderr points to `docs/manuals/OPENSPEC_RUNTIME.md`; not on PATH |
| OpenSpec light change folder | **PRESENT** (no CLI required) | `openspec/changes/eos-u6-openspec-cli-hold/` |
| Mode | **CLI_ABSENT_HOLD** | optional this quarter; do NOT invent PRESENT |
| CloudAgent | **OUT OF PATH** (SpecBoot default) | Antigravity-first; no CloudAgent launches |

### Raw helper excerpt (CLI ABSENT)

```text
OpenSpec CLI is not on PATH (not installed for this L0 clone).
Optional host install is documented in docs/manuals/OPENSPEC_RUNTIME.md.
This helper never adds npm dependencies or imports @fission-ai/openspec.
```

**HOLD rationale:** L9 K6 — ceremony CLI optional / not required for L0. Explicit "optional this quarter" HOLD until operator optionally installs host-level and refreshes evidence to CLI_PRESENT_SMOKE with proven `--version`.

## Entregables

1. OpenSpec `openspec/changes/eos-u6-openspec-cli-hold/`
2. Ritual `docs/harness/OPENSPEC_CLI_HOLD_RITUAL.md`
3. Lock `scripts/lib/openspec-cli-hold-lock.js` + gate `scripts/ci/openspec-cli-hold-gate.js`
4. Tests `tests/eos-u6-openspec-cli-hold.test.js` + `test:u6`
5. verify-eos REQUIRED_PATHS U6
6. Esta nota + freeze U6 + matrix MEASURED
7. Pointers in ANTIGRAVITY_FIRST §5 + OPENSPEC_RUNTIME
8. Dirty DEFER sin stage; no invent install; no pretend PRESENT

## Verificacion

- npm run test:u6
- node scripts/ci/openspec-cli-hold-gate.js
- node scripts/openspec-cli.js --version → exit 2 (ABSENT expected)
- Fundacion porcelain vacio
- PRODUCTION_READY=NO
- Mode CLI_ABSENT_HOLD (honest)

## No-claims

NON-CLAIM:

- Checklist / gate ≠ OpenSpec CLI installed.
- CLI_ABSENT_HOLD PASS ≠ L0 broken / verify failure.
- Helper exit 2 ≠ permission to invent PRESENT.
- Status evidence ≠ PRODUCTION_READY flip.
- OpenSpec light change folder ok even if CLI absent ≠ CLI required for SDD.
- CloudAgent out of path ≠ ban local Cursor IDE editing.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin U7+ en esta rama.
- Push only; NO PR.
- PRODUCTION_READY permanece NO.
- FORBIDDEN pretend PRESENT / invent install success when probe says ABSENT.
- FORBIDDEN U6 agent/CI running `npm install -g @fission-ai/openspec`.
