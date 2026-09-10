# EOS Model Routing — Task Class → Model Tier

**SSOT path:** `docs/harness/MODEL_ROUTING.md`  
**ADR:** [`docs/architecture/adrs/ADR-0018-model-routing-ratchet.md`](../architecture/adrs/ADR-0018-model-routing-ratchet.md)  
**Companion ritual:** [`docs/harness/RATCHET_RITUAL.md`](./RATCHET_RITUAL.md)  
**Antigravity-first:** [`docs/harness/ANTIGRAVITY_FIRST.md`](./ANTIGRAVITY_FIRST.md)  
**Phase matrix (architecture):** [`docs/architecture/EOS_TOKEN_ECONOMICS_AND_HARNESS_OPTIMIZATION.md`](../architecture/EOS_TOKEN_ECONOMICS_AND_HARNESS_OPTIMIZATION.md) §4  
**Ladder:** 7 / **Step:** S6 (K6)  
**Date:** 2026-09-09  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched)  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)

> **NON-CLAIM:** This document is **operator/agent guidance**, not an automatic model router.  
> **NON-CLAIM:** No auto model switch without evidence (operator choice / SpecBoot phase / documented task class).  
> Guidance ≠ runtime auto-router; docs ≠ model API orchestration.  
> Does **not** claim whiplash METR/Faros solved. PRODUCTION_READY remains NO.

**LIDR adoption pointer:** [`docs/releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md`](../releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md)  
**Audit DoD:** [`docs/releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md`](../releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md) (S6 row)

---

## 1. Purpose

Publish one canonical **task-class → model tier** map so SpecBoot / Antigravity-first sessions pick an appropriate tier **before** work, without claiming silent auto-switching.

Governing principle (LIDR / token economics §4):

> **High-tier plans and prepares exhaustive specs; fast-tier executes atomized tasks.**

Primary runtime for SpecBoot remains **Antigravity (`agy`) / Gemini**; Cursor CloudAgent stays out of the default path (`ANTIGRAVITY_FIRST.md`).

---

## 2. Task classes → model tiers

| Task class (SDD / harness) | Tier | Antigravity / Gemini | Anthropic analogue | OpenAI analogue | When |
| --- | --- | --- | --- | --- | --- |
| Discovery / ideation | **FAST** | Gemini LOW/MED | Sonnet-tier | — | Explore, brainstorm, no overengineering |
| PRD / user stories | **FAST** | Gemini LOW/MED | Sonnet-tier | — | Iterate requirements |
| Technical design / OpenSpec / ADR | **HIGH** | Gemini HIGH | Opus-tier | Codex | Trade-offs, specs, architecture |
| Routine implementation | **FAST** | Gemini LOW/MED | Sonnet-tier | — | Atomized coding against a locked spec |
| Complex implementation | **HIGH** | Gemini HIGH | Opus-tier | Codex | Broad context, multi-module risk |
| Review / basic debugging | **FAST** | Gemini LOW/MED | Sonnet-tier | — | Covers ~80% of review cases |
| Deep debug / security / adversarial | **HIGH** | Gemini HIGH | Opus-tier | Codex | Hard 20%; security; adversarial-review |
| DevOps / CI / terminal-heavy | **HIGH** | Gemini HIGH | Opus-tier | Codex | Shell/CI/DevOps density |
| Ratchet control authoring | **HIGH** | Gemini HIGH | Opus-tier | Codex | Turning an error into a durable control (see RATCHET_RITUAL) |
| Doctor / HUD honesty observe | **FAST** | Gemini LOW/MED | Sonnet-tier | — | Presence-light observe; not verify:strict |

**SpecBoot phase hint:** prefer **HIGH** for `/enrich-us` → `/ff` (spec/design), **FAST** for atomized `/apply` when the spec is locked, **HIGH** again for `/adversarial-review` and deep `/verify` interpretation.

---

## 3. Practical rules (operator)

1. **Choose tier by task class before the turn** — record class in the mission/OpenSpec note when non-obvious.
2. **Never burn HIGH on routine scaffolding** — no proportional quality gain.
3. **Always use HIGH for architecture, security, and spec generation** — bad-spec cost dwarfs token savings.
4. **Multi-model within one SDD cycle is expected** — switch **between** phases, not mid-phase without evidence.
5. **Antigravity-first** — default executor is `agy` / eos-workstation; do **not** launch Cursor CloudAgent as the default SpecBoot path.
6. **Evidence for a mid-cycle tier change** — failing verify, security finding, or explicit PO/operator decision. Silence ≠ auto-switch.

---

## 4. Surfaces (existing — not new runtime)

| Surface | Role vs routing |
| --- | --- |
| `docs/harness/ANTIGRAVITY_FIRST.md` | Primary runtime demotion of CloudAgent |
| `docs/harness/SPECBOOT_CYCLE.md` | Phase order for when tier changes are legitimate |
| Token economics §4 | Detailed Anthropic/Google/OpenAI phase matrix (SSOT numbers live there) |
| `organic-routing-gate.js` | **SDD ceremony** routing — **not** model auto-router (do not conflate) |
| Mission / doctor / HUD | Honesty surfaces; do not claim they switch models |

---

## 5. Explicit non-goals

- No automatic model switcher service / middleware.
- No PRODUCTION_READY flip.
- No Fundacion writes; no App Fuerza writes.
- No silent MCP/tool delete; no new `docs/schemas` JSON (AT_CEILING).
- No claim that routing alone fixes acceleration whiplash.
- No rewrite of ADR-0011 / ADR-0014 / ADR-0017 bodies beyond pointer ADR-0018.

---

## 6. Verify lock

Presence enforced by `scripts/lib/model-routing-ratchet-lock.js` under `npm run verify:strict` and `npm run test:s6`.
