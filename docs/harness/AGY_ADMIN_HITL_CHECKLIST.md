# AGY daemon Admin HITL checklist (eos-workstation)

**Status:** ACTIVE runbook (Ladder 9 U5 / K5) — extends T7
**PRODUCTION_READY:** NO
**Modes:** `DAEMON_ABSENT` (default until proven) | `DAEMON_PRESENT` (only after Admin HITL + status corroboration)
**NON-CLAIM:** checklist ≠ daemon installed; `adminRequired=true` path documented ≠ executed; smoke ≠ Admin install; evidence ≠ pretend INSTALLED; CloudAgent out of path ≠ ban local Cursor IDE editing.

---

## 1. Purpose

T7 delivered fail-closed honesty when the daemon is **ABSENT**. U5 documents the **optional Admin HITL install path** so operators know exactly what elevation means — without requiring or performing that elevation in CI, verify, or this change.

1. Keep status **DAEMON_ABSENT** / **Not installed** unless PRESENT is **proven** by live `agy-daemon.cmd status`
2. Document `adminRequired=true` install command (operator-only)
3. Forbid smoke/CI/agent from running `install` / `uninstall`
4. Extend T7 evidence — no pretend install

---

## 2. Legal modes (fail-closed)

### 2.1 DAEMON_ABSENT (default — U5 delivered state)

- Evidence must state daemon **ABSENT** / **Not installed** / Admin HITL **pending** / **not executed**.
- Lock/checklist **PASS** on honest ABSENT — do **not** require Admin.
- **FORBIDDEN:** claiming INSTALLED / PRESENT while `agy-daemon.cmd status` reports Not installed.
- `adminRequired=true` may appear as **documented path only** with `installExecuted=false`.

### 2.2 DAEMON_PRESENT (only after Admin HITL — not executed in U5)

1. Operator elevates **Administrator** cmd
2. Runs: `agy-daemon.cmd install --name eos-workstation`
3. Confirms: `agy-daemon.cmd status` shows installed (not "Not installed")
4. Updates evidence note with status excerpt + timestamp (America/Bogota)
5. Lock PASS only when evidence PRESENT/INSTALLED language matches probe/status

U5 does **not** perform steps 1–2. PRESENT is legal only when proven.

---

## 3. Admin HITL operator checklist

| Step | Action | Admin? | Executed in U5? | Required for L0? |
| --- | --- | --- | --- | --- |
| A | Confirm local `agy` on PATH / `%LOCALAPPDATA%\agy\bin\agy.exe` | No | Observational OK | Recommended |
| B | `agy-daemon.cmd status` (honest snapshot) | No | Yes (probe) | Yes for honesty |
| C | Document `adminRequired=true` path: `agy-daemon.cmd install --name eos-workstation` | Path docs only | **No** (documented, not executed) | Optional remote HITL |
| D | Optional HITL: elevate Admin and run install (operator) | **Yes** | **No in U5** | Optional |
| E | After HITL: refresh evidence to DAEMON_PRESENT only if status corroborates | No | N/A until D | Honesty |
| F | Keep CloudAgent out of SpecBoot default path | No | Policy | Yes |
| G | Run gate: `node scripts/ci/agy-admin-hitl-checklist.js` | No | Yes | Yes (U5 gate) |
| H | Keep T7 smoke green: `node scripts/ci/agy-workstation-smoke.js` | No | Yes | Yes (T7 baseline) |

---

## 4. adminRequired=true path (documented, not executed)

```text
adminRequired: true
command: agy-daemon.cmd install --name eos-workstation
elevation: Administrator cmd / elevated shell
auto-update (optional): leave default unless --no-auto-update
confirm: agy-daemon.cmd status  → must NOT say "Not installed"
U5 execution: FORBIDDEN (installExecuted=false)
```

Smoke and verify **never** spawn `install`, `uninstall`, or elevated Task Scheduler mutations.

---

## 5. Gate / verify matrix

| Check | DAEMON_ABSENT (U5) | DAEMON_PRESENT (post-HITL) |
| --- | --- | --- |
| U5 checklist + evidence docs | must exist with needles | must exist with needles |
| PRODUCTION_READY=NO | required | required |
| CloudAgent out of path | required | required |
| Extends T7 | required | required |
| Daemon honesty | ABSENT/Not installed declared | INSTALLED claim + status corroboration |
| adminRequired path documented | required | required |
| installExecuted | **false** | false in smoke (operator HITL separate) |
| Admin install in smoke/CI | FORBIDDEN | FORBIDDEN |
| Pretend INSTALLED | FORBIDDEN | N/A |

```bash
npm run test:u5
npm run test:t7
node scripts/ci/agy-admin-hitl-checklist.js
```

Gate is **NON-MUTATING**.

---

## 6. Non-claims

- Checklist / gate ≠ daemon installed.
- `adminRequired=true` documented ≠ Admin install executed.
- DAEMON_ABSENT PASS ≠ remote HITL ready / eos-workstation service running.
- Status evidence ≠ PRODUCTION_READY flip.
- Extending T7 ≠ reopening T7 DoD.
- CloudAgent out of SpecBoot default path ≠ ban local Cursor IDE editing.
- PRODUCTION_READY remains **NO**.
- FORBIDDEN: pretend eos-workstation daemon INSTALLED when status says Not installed.
- FORBIDDEN: U5 agent/CI executing Admin install.
