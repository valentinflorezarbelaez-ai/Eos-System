# EOS Ratchet Ritual — Error → Control

**SSOT path:** `docs/harness/RATCHET_RITUAL.md`  
**ADR:** [`docs/architecture/adrs/ADR-0018-model-routing-ratchet.md`](../architecture/adrs/ADR-0018-model-routing-ratchet.md)  
**Companion routing:** [`docs/harness/MODEL_ROUTING.md`](./MODEL_ROUTING.md)  
**Loop Engineering 4Q:** [`docs/harness/LOOP_ENGINEERING_4Q.md`](./LOOP_ENGINEERING_4Q.md)  
**Ladder:** 7 / **Step:** S6 (K6)  
**Date:** 2026-09-09  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched)

> **NON-CLAIM:** Ratchet ritual **≠** autonomous self-heal.  
> Adding a control **≠** proof the class of error can never recur.  
> Ritual ≠ verify:strict (verify remains the computational sensor).  
> Does **not** claim whiplash METR/Faros solved. PRODUCTION_READY remains NO.

**LIDR source (Hashimoto via LIDR harness blog):** each time the agent errs, do not only fix by hand — **add a control so that error cannot silently repeat** (trinquete / ratchet). The system only advances.

---

## 1. Purpose

Define the operator **error → control** ritual so harness improvements are deliberate, evidence-backed, and anchored on existing EOS surfaces (AGENTS, hooks, CI evals, cost+fail logs, specialized subagents).

---

## 2. Ritual steps (ordered)

| Step | Action | Evidence artifact |
| --- | --- | --- |
| 1. **Capture** | Record the failure mode (what broke, which command/sensor fired) | Issue note / release evidence / mission log |
| 2. **Classify** | Computational (determinista) vs inferential (juicio); feedforward vs feedback gap | Map to LOOP_ENGINEERING_4Q quadrant |
| 3. **Choose control class** | Pick the lightest durable control (see §3) | Named control class |
| 4. **Author control** | Patch AGENTS/rules, hook, CI eval, lock needle, or subagent skill — prefer existing seam | Diff + OpenSpec/light when SDD |
| 5. **Verify** | `npm run test:*` for the seam + `npm run verify:strict` when lock-related | Green tests / fail-closed proof |
| 6. **Freeze note** | Document NON-CLAIM + PRODUCTION_READY=NO; no silent tool delete | `docs/releases/` note when ladder-scoped |

Mnemonic: **capture → classify → control → verify → freeze**.

---

## 3. Control classes (Hashimoto / LIDR → EOS)

| Control class | EOS surface (examples) | Prefer when |
| --- | --- | --- |
| **AGENTS / rules** | `.agents/AGENTS.md`, `.cursor/rules/*`, harness docs | Recurring prompt/policy miss |
| **Hooks** | `scripts/install-git-hooks.js`, pre-commit/pre-push | Mutation left workstation without gate |
| **CI evals** | `.github/workflows/ci.yml`, `scripts/ci/assert-gha-contract.js`, `test:*` | Regression must fail remote/local CI |
| **Verify locks** | `scripts/lib/*-lock.js` + `verify:strict` | SSOT doc/path must fail-closed |
| **Cost + fail logs** | Mission/doctor/HUD observe; economic contract sensors | Spend/latency/fail pattern needs visibility |
| **Specialized subagents** | Auditor skills under `.agents/skills/` | Narrow judgment better than generalist |

**Antigravity-first:** author and exercise controls under `agy` / local IDE; do **not** treat Cursor CloudAgent launch as the default control path.

---

## 4. Decision ladder (anti-overengineering)

1. Can an existing lock/test needle catch it? → extend needle, do not invent schema.
2. Can a one-line AGENTS/rule prevent it? → prefer that over new runtime.
3. Is AT_CEILING active? → **no** new `docs/schemas` JSON; use docs + locks.
4. Would this silently delete MCP/tools? → **FORBIDDEN** without PO-named prune (see S5).
5. Still unclear? → stop; escalate to PO; do not auto-remediate Fundacion / App Fuerza.

---

## 5. Explicit non-goals

- No autonomous remediation OS claim.
- No PRODUCTION_READY flip.
- No Fundacion / App Fuerza writes.
- No silent MCP/tool delete.
- No claim that every error is already ratcheted.
- Ritual presence ≠ proof of organizational AI Champion maturity.

---

## 6. Verify lock

Presence enforced by `scripts/lib/model-routing-ratchet-lock.js` under `npm run verify:strict` and `npm run test:s6`.
