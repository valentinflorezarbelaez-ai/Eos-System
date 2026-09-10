# OpenSpec CLI optional HOLD ritual (checklist)

**Status:** ACTIVE runbook (Ladder 9 U6 / K6)
**PRODUCTION_READY:** NO
**Modes:** `CLI_ABSENT_HOLD` (default when binary absent) | `CLI_PRESENT_SMOKE` (only after PATH probe proves binary)
**NON-CLAIM:** HOLD ≠ CLI installed; helper exit 2 ≠ L0 failure; smoke ≠ PRODUCTION_READY; OpenSpec light folder ok even if CLI absent; CloudAgent out of path ≠ ban local Cursor IDE editing.

---

## 1. Purpose

OpenSpec CLI (`openspec` / ceremony aliases `opsx:*`) is **optional** and **not required for L0**. U6 makes the operator decision fail-closed and honest:

1. Detect CLI presence (PATH + `node scripts/openspec-cli.js --version`)
2. If **ABSENT** → document explicit **HOLD** ("optional this quarter") + ritual
3. If **PRESENT** → capture smoke evidence (`--version`) — do **not** invent success
4. Never add `@fission-ai/openspec` to root `package.json` / `src/core`

---

## 2. Legal modes

### 2.1 CLI_ABSENT_HOLD (default — U6 delivered state when CLI not on PATH)

- Evidence must state **CLI_ABSENT** / **HOLD** / **optional this quarter**.
- Lock/gate **PASS** on honest ABSENT — do **not** require install.
- Helper exit `2` from `scripts/openspec-cli.js` is **expected** and points at `docs/manuals/OPENSPEC_RUNTIME.md`.
- **FORBIDDEN:** claiming PRESENT / install success / smoke green when PATH probe is ABSENT.
- OpenSpec **light change folder** (`openspec/changes/…`) remains valid without the CLI.

### 2.2 CLI_PRESENT_SMOKE (only when proven)

1. Operator optionally installs host-level: `npm install -g @fission-ai/openspec@latest` (docs only — not L0)
2. Confirms: `openspec --version` **or** `npm run openspec:cli -- --version` exits 0
3. Updates evidence note with version excerpt + timestamp (America/Bogota)
4. Lock PASS only when evidence CLI_PRESENT_SMOKE language matches probe

U6 does **not** perform the install. PRESENT is legal only when proven.

---

## 3. Operator checklist

| Step | Action | Install? | Executed in U6? | Required for L0? |
| --- | --- | --- | --- | --- |
| A | Read `docs/manuals/OPENSPEC_RUNTIME.md` CLI install section | No | Observational OK | Recommended |
| B | Probe: `node scripts/openspec-cli.js --version` | No | Yes (probe) | Yes for honesty |
| C | If exit 2 / not on PATH → keep **CLI_ABSENT_HOLD** ("optional this quarter") | No | Yes (HOLD) | Optional |
| D | Optional HITL: host `npm install -g @fission-ai/openspec@latest` | Host only | **No in U6** | Optional ceremony |
| E | After install: refresh evidence to CLI_PRESENT_SMOKE only if version corroborates | No | N/A until D | Honesty |
| F | Keep CloudAgent out of SpecBoot default path | No | Policy | Yes |
| G | Run gate: `node scripts/ci/openspec-cli-hold-gate.js` | No | Yes | Yes (U6 gate) |
| H | Keep OpenSpec folder layout / light changes without CLI | No | Yes | Yes |

---

## 4. Detect commands (NON-MUTATING)

```bash
npm run test:u6
node scripts/ci/openspec-cli-hold-gate.js
node scripts/openspec-cli.js --version
# optional host (NOT run by U6 / CI):
# npm install -g @fission-ai/openspec@latest
```

Gate is **NON-MUTATING**. It never installs packages or mutates PATH.

---

## 5. Non-claims

- Ritual / gate ≠ OpenSpec CLI installed.
- CLI_ABSENT_HOLD PASS ≠ permission to invent PRESENT later without a new probe.
- Helper exit 2 ≠ L0 clone / verify failure (optional host tool).
- CLI_PRESENT_SMOKE ≠ PRODUCTION_READY flip.
- OpenSpec light change folder ok even if CLI absent ≠ CLI required for SDD folders.
- Antigravity-first: CloudAgent out of SpecBoot default path.
- **FORBIDDEN** invent install success when ABSENT.
- PRODUCTION_READY remains **NO**.
