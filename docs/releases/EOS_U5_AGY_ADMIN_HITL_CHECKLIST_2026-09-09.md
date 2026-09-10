# EOS U5 AGY daemon Admin HITL checklist (optional) - 2026-09-09

**Branch:** cursor/eos-u5-agy-admin-hitl-checklist
**Base tip:** a8602daaf21b9488cb872d562cbb630b1b95bc7d (U4 #95 merged on main) — rebase onto origin/main
**Prior U4 tip (pre-merge):** 91ba71cde5c209757664a4ff7209057cc984cc35
**Alcance:** U5 ONLY (Ladder 9 K5) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push only; HITL en navegador)
**AT_CEILING:** yes (no new docs/schemas JSON)
**Decision:** **DAEMON_ABSENT honest** — Admin HITL checklist + fail-closed; do NOT install; do NOT pretend PRESENT; `adminRequired=true` path documented but **not executed**

## Objetivo (U5 / K5 DoD)

Extender T7 AGY evidence con checklist Admin HITL opcional — sin ejecutar install; status permanece DAEMON_ABSENT / Not installed unless PRESENT proven.

1. Honest Admin HITL checklist (`AGY_ADMIN_HITL_CHECKLIST.md`)
2. Fail-closed evidence: status remains **DAEMON_ABSENT** / **Not installed** unless PRESENT proven
3. Document `adminRequired=true` path: `agy-daemon.cmd install --name eos-workstation` — **not executed**
4. Extend T7 — NON-CLAIM no pretend install; CloudAgent out of path
5. Tests PASS (`test:u5`); Fundacion Delta=0; DEFER dirty unstaged; AT_CEILING

## Status snapshot (honest probe)

Probe machine: valentin (Windows) @ 2026-09-09 (America/Bogota). Gate NON-MUTATING; no Admin elevation used; installExecuted=false.

| Surface | Status | Evidence |
| --- | --- | --- |
| Local `agy` binary | **PRESENT** | `%LOCALAPPDATA%\agy\bin\agy.exe` on PATH |
| `agy-daemon` / eos-workstation | **ABSENT** / **Not installed** | `agy-daemon.cmd status` → Daemon (AgyRemoteControl) Not installed; Auto-update Not installed |
| Admin HITL install | **NOT EXECUTED** | `adminRequired=true` documented only; U5 FORBIDDEN to run install |
| OpenSpec CLI | **OPTIONAL** / not required for L0 | unchanged from T7 |
| CloudAgent | **OUT OF PATH** (SpecBoot default) | Antigravity-first; no CloudAgent launches |

### Raw status excerpt (daemon ABSENT)

```text
--- Daemon (AgyRemoteControl) ---
Not installed.

--- Auto-update task (AgyRemoteControlUpdate) ---
Not installed.
```

**Admin HITL pending:** `agy-daemon.cmd install --name eos-workstation` requires Administrator. U5 does **not** perform that install and does **not** claim INSTALLED / DAEMON_PRESENT.

## Entregables

1. OpenSpec `openspec/changes/eos-u5-agy-admin-hitl-checklist/`
2. Checklist `docs/harness/AGY_ADMIN_HITL_CHECKLIST.md`
3. Lock `scripts/lib/agy-admin-hitl-lock.js` + gate `scripts/ci/agy-admin-hitl-checklist.js`
4. Tests `tests/eos-u5-agy-admin-hitl-checklist.test.js` + `test:u5`
5. verify-eos REQUIRED_PATHS U5
6. Esta nota + freeze U5 + matrix MEASURED
7. Pointers in AGY_WORKSTATION_CHECKLIST + ANTIGRAVITY_FIRST §5
8. Dirty DEFER sin stage; no Admin install; no pretend

## Verificacion

- npm run test:u5
- npm run test:t7
- node scripts/ci/agy-admin-hitl-checklist.js
- Fundacion porcelain vacio
- PRODUCTION_READY=NO
- Mode DAEMON_ABSENT (honest); installExecuted=false

## No-claims

NON-CLAIM:

- Checklist / gate ≠ daemon installed.
- `adminRequired=true` documented ≠ Admin install executed.
- DAEMON_ABSENT PASS ≠ remote HITL ready / eos-workstation service running.
- Status evidence ≠ PRODUCTION_READY flip.
- Extending T7 ≠ reopening T7 DoD.
- OpenSpec CLI optional ≠ required for L0.
- CloudAgent out of path ≠ ban local Cursor IDE editing.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin U6+ en esta rama.
- Push only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
- FORBIDDEN pretend INSTALLED when status says Not installed.
- FORBIDDEN U5 agent/CI executing Admin install.
