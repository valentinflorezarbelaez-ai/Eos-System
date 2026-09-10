# AGY workstation checklist (eos-workstation evidence)

**Status:** ACTIVE runbook (Ladder 8 T7 / K7)
**PRODUCTION_READY:** NO
**Modes:** `DAEMON_ABSENT` | `DAEMON_PRESENT`
**NON-CLAIM:** checklist ≠ daemon installed; smoke ≠ Admin install; evidence ≠ pretend INSTALLED; CloudAgent out of path ≠ ban local Cursor IDE editing.

---

## 1. Purpose

Antigravity-first SpecBoot is closed for local governed use. Remaining **operator** gaps are install/status honesty for:

1. Local `agy` binary availability
2. Optional OpenSpec CLI (not required for L0)
3. Optional headless daemon `agy-daemon.cmd install --name eos-workstation` (**Admin HITL**)
4. Honest `agy-daemon.cmd status` evidence (fail-closed if pretend)

T7 delivers the **checklist + smoke lock** so the control plane stays honest when the daemon is **ABSENT**, without requiring Admin elevation in CI or day-to-day verify.

---

## 2. Legal modes

### 2.1 DAEMON_ABSENT (default when Admin install not done)

- Evidence must state daemon **ABSENT** / **Not installed** / Admin HITL pending.
- Smoke/lock **PASS** on honest ABSENT — do **not** require Admin.
- **FORBIDDEN:** claiming INSTALLED / PRESENT while `agy-daemon.cmd status` reports Not installed.
- Local `agy` may still be PRESENT (CLI without daemon service).

### 2.2 DAEMON_PRESENT (only after Admin HITL install)

1. Operator elevates Admin cmd and runs: `agy-daemon.cmd install --name eos-workstation`
2. Confirm: `agy-daemon.cmd status` shows installed (not "Not installed")
3. Update evidence note with status excerpt + timestamp
4. Lock PASS only when evidence PRESENT/INSTALLED language matches probe/status

---

## 3. Operator checklist

| Step | Action | Admin? | Required for L0? |
| --- | --- | --- | --- |
| A | Confirm local `agy` on PATH / `%LOCALAPPDATA%\agy\bin\agy.exe` | No | Recommended for SpecBoot sessions |
| B | OpenSpec CLI optional (`opsx:*`); skip OK for L0 | No | Optional |
| C | `agy-daemon.cmd status` (honest snapshot) | No | Yes for evidence honesty |
| D | Optional: `agy-daemon.cmd install --name eos-workstation` | **Yes** | Optional remote HITL |
| E | Keep CloudAgent out of SpecBoot default path | No | Yes (policy) |
| F | Run smoke: `node scripts/ci/agy-workstation-smoke.js` | No | Yes (T7 gate) |

---

## 4. Smoke / verify gate

| Check | DAEMON_ABSENT | DAEMON_PRESENT |
| --- | --- | --- |
| Checklist + evidence docs | must exist with needles | must exist with needles |
| PRODUCTION_READY=NO | required | required |
| CloudAgent out of path | required | required |
| OpenSpec CLI optional | required | required |
| Daemon honesty | ABSENT/Not installed declared | INSTALLED claim + status corroboration |
| Admin install in smoke | FORBIDDEN | FORBIDDEN (smoke never installs) |
| Pretend INSTALLED | FORBIDDEN | N/A |

```bash
npm run test:t7
node scripts/ci/agy-workstation-smoke.js
```

Smoke is **NON-MUTATING**. It never runs `install` / `uninstall` / elevated Task Scheduler changes.

---

## 5. Non-claims

- Checklist / smoke ≠ daemon installed.
- DAEMON_ABSENT PASS ≠ remote HITL ready.
- Status evidence ≠ PRODUCTION_READY flip.
- OpenSpec CLI optional ≠ required for L0.
- CloudAgent out of SpecBoot default path ≠ ban local Cursor IDE editing.
- Antigravity-first ≠ AGY slash UX parity claim.
- PRODUCTION_READY remains **NO**.
- FORBIDDEN: pretend eos-workstation daemon INSTALLED when status says Not installed.
