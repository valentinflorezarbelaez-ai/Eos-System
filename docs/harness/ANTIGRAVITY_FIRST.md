# EOS Antigravity-First Operating Mode

**SSOT path:** `docs/harness/ANTIGRAVITY_FIRST.md`
**Date:** 2026-09-09
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Companion cycle SSOT:** [`docs/harness/SPECBOOT_CYCLE.md`](./SPECBOOT_CYCLE.md)

> **NON-CLAIM:** Antigravity-first demotes **Cursor CloudAgent launches** from the default SpecBoot / harness path.
> It does **not** ban local Cursor IDE file editing, local Cursor agent chat, or keeping `.cursor/` configs.
> Cursor configs stay; CloudAgent is out of the default path.

## 1. Primary runtime

| Surface | Role |
| --- | --- |
| **Antigravity (`agy`) / Gemini** | Primary coding runtime for SpecBoot LIDR cycle |
| `GEMINI.md` → `.agents/AGENTS.md` | Thin entry → canonical protocol |
| `.agents/skills/` | Skill pack AGY loads (SpecBoot steps mirrored here) |
| `agy-daemon.cmd` + instance intent **eos-workstation** | Headless remote-control daemon |
| Fusion phases 0–5 / Mission CLI | Unchanged (`node bin/eos.js` / `npm run eos:mission`) |

## 2. Out of default path

- **Cursor CloudAgent launches** — out of the default SpecBoot path; do **not** use as the default SpecBoot executor.
- Prefer local `agy` / eos-workstation daemon HITL over remote CloudAgent.

## 3. Still allowed (NON-CLAIM)

- Local Cursor IDE editing of repo files.
- Reading `.cursor/commands/*.md` as procedure SSOT (bodies mirrored by thin AGY skills).
- Keeping Cursor configs; policy demotes CloudAgent — it does **not** delete Cursor tooling.

## 4. Canonical ops manuals

| Doc | Role |
| --- | --- |
| [`docs/manuals/ANTIGRAVITY_REMOTE_CONTROL_AND_DAEMON_OPS.md`](../manuals/ANTIGRAVITY_REMOTE_CONTROL_AND_DAEMON_OPS.md) | Daemon install/status/remote-control |
| [`docs/releases/EOS_PHASE_0_CONTROL_PLANE_ANTIGRAVITY_FUSION_GROUND_TRUTH_2026-09-08.md`](../releases/EOS_PHASE_0_CONTROL_PLANE_ANTIGRAVITY_FUSION_GROUND_TRUTH_2026-09-08.md) | Fusion ground truth |
| [`docs/harness/SPECBOOT_CYCLE.md`](./SPECBOOT_CYCLE.md) | SpecBoot cycle + skill map |

## 5. Remaining install gaps (operator)

Operator checklist + honest status smoke: [`docs/harness/AGY_WORKSTATION_CHECKLIST.md`](./AGY_WORKSTATION_CHECKLIST.md) (T7). Evidence: `docs/releases/EOS_T7_AGY_WORKSTATION_EVIDENCE_2026-09-09.md`. Smoke: `node scripts/ci/agy-workstation-smoke.js` (NON-MUTATING; no Admin).

1. **OpenSpec CLI** (optional) — ceremony aliases `opsx:*`; not required for L0. U6 HOLD ritual: [`docs/harness/OPENSPEC_CLI_HOLD_RITUAL.md`](./OPENSPEC_CLI_HOLD_RITUAL.md); evidence `docs/releases/EOS_U6_OPENSPEC_CLI_HOLD_2026-09-09.md`; gate `node scripts/ci/openspec-cli-hold-gate.js` (CLI_ABSENT_HOLD when not on PATH; do NOT invent PRESENT).
2. **agy-daemon** — `agy-daemon.cmd install --name eos-workstation` (Admin HITL) when remote HITL needed; confirm with `agy-daemon.cmd status`. Do **not** pretend INSTALLED when status says Not installed.
   - U5 Admin HITL checklist (optional, no install in CI): [`docs/harness/AGY_ADMIN_HITL_CHECKLIST.md`](./AGY_ADMIN_HITL_CHECKLIST.md); evidence `docs/releases/EOS_U5_AGY_ADMIN_HITL_CHECKLIST_2026-09-09.md`; gate `node scripts/ci/agy-admin-hitl-checklist.js` (`adminRequired=true` documented, `installExecuted=false`).
3. Confirm local `agy` binary available before SpecBoot sessions.

## 6. Explicit non-goals

- No PRODUCTION_READY flip.
- No Fundacion writes.
- No Constitution mutation.
- No claim that AGY slash parity equals Cursor slash UX until all skills are exercised in AGY.
