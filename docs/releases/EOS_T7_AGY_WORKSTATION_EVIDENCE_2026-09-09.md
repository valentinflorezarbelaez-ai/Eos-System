# EOS T7 Antigravity eos-workstation evidence - 2026-09-09

**Branch:** cursor/eos-t7-agy-workstation-evidence
**Base tip:** 757f2ded20ce47e9dbe30fb9842faee4ae48b24f (T6 #88 merged on main)
**Alcance:** T7 ONLY (Ladder 8 K7) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push only; HITL en navegador)
**AT_CEILING:** yes (no new docs/schemas JSON)
**Decision:** **DAEMON_ABSENT honest** — docs+smoke fail-closed without Admin; do NOT pretend daemon installed

## Objetivo (T7 / K7 DoD)

Checklist + status evidence cuando daemon/local agy instalado; OpenSpec CLI optional; CloudAgent out of path; PRODUCTION_READY=NO.

1. Deliver operator checklist + honest status evidence + smoke lock
2. Fail-closed when daemon **ABSENT** without requiring Admin
3. Do **not** pretend eos-workstation daemon is installed
4. OpenSpec CLI optional (not required for L0)
5. CloudAgent out of SpecBoot default path (Antigravity-first)
6. Tests PASS (`test:t7`); Fundacion Delta=0; DEFER dirty unstaged; AT_CEILING

## Status snapshot (honest probe)

Probe machine: valentin (Windows) @ 2026-09-09 (America/Bogota). Smoke NON-MUTATING; no Admin elevation used.

| Surface | Status | Evidence |
| --- | --- | --- |
| Local `agy` binary | **PRESENT** | `C:\Users\valen\AppData\Local\agy\bin\agy.exe` on PATH |
| `agy-daemon` / eos-workstation | **ABSENT** / **Not installed** | `agy-daemon.cmd status` → Daemon (AgyRemoteControl) Not installed; Auto-update Not installed |
| OpenSpec CLI | **OPTIONAL** / not required for L0 | Not required; ceremony aliases `opsx:*` optional |
| CloudAgent | **OUT OF PATH** (SpecBoot default) | ANTIGRAVITY_FIRST.md; configs Cursor not deleted |

### Raw status excerpt (daemon ABSENT)

```text
--- Daemon (AgyRemoteControl) ---
Not installed.

--- Auto-update task (AgyRemoteControlUpdate) ---
Not installed.
```

**Admin HITL pending:** `agy-daemon.cmd install --name eos-workstation` requires Administrator. T7 does **not** perform that install and does **not** claim INSTALLED.

## Entregables

1. OpenSpec `openspec/changes/eos-t7-agy-workstation-evidence/`
2. Checklist `docs/harness/AGY_WORKSTATION_CHECKLIST.md`
3. Lock `scripts/lib/agy-workstation-lock.js` + smoke `scripts/ci/agy-workstation-smoke.js`
4. Tests `tests/eos-t7-agy-workstation-evidence.test.js` + `test:t7`
5. verify-eos 3g18 + REQUIRED_PATHS
6. Esta nota + freeze T7 + matrix MEASURED
7. ANTIGRAVITY_FIRST.md §5 pointer to T7 checklist
8. Dirty DEFER sin stage; no Admin install; no pretend

## Verificacion

- npm run test:t7
- node scripts/ci/agy-workstation-smoke.js
- Fundacion porcelain vacio
- PRODUCTION_READY=NO
- Mode DAEMON_ABSENT (honest)

## No-claims

NON-CLAIM:

- Checklist / smoke ≠ daemon installed.
- DAEMON_ABSENT PASS ≠ remote HITL ready / eos-workstation service running.
- Status evidence ≠ PRODUCTION_READY flip.
- OpenSpec CLI optional ≠ required for L0.
- CloudAgent out of path ≠ ban local Cursor IDE editing.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin T8 Dirty DEFER triage force-commit en esta rama.
- Push only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
- FORBIDDEN pretend INSTALLED when status says Not installed.
