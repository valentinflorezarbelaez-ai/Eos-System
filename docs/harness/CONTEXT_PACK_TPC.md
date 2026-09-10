# EOS Context Pack — TPC Index (Tool / Prompt / Context)

**SSOT path:** `docs/harness/CONTEXT_PACK_TPC.md`  
**Ladder:** 7 / **Step:** S2 (K2)  
**Date:** 2026-09-09  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched)  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)

> **NON-CLAIM:** This index ≠ full runtime context engineering.  
> It is a **map + lifecycle policy text**, not a live orchestrator that injects/compacts/discards/resets agent windows.  
> Operators and agents still follow existing rules/hooks/verify surfaces.  
> index != full runtime context completo.

**SpecBoot / Antigravity-first SSOT:** [`docs/harness/SPECBOOT_CYCLE.md`](SPECBOOT_CYCLE.md)  
**LIDR adoption pointer:** [`docs/releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md`](../releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md)  
**Audit DoD:** [`docs/releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md`](../releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md) (S2 row)

---

## 0. Purpose

Publish one canonical **Context Pack TPC** index so agents know *where* Tool / Prompt / Context authority lives, plus *when* lifecycle verbs apply — without rewriting those surfaces and without claiming a runtime harness OS.

---

## 1. Tool pillar

Surfaces that define **what tools** the agent may use and how writes/verify are gated.

| Ref | Role |
| --- | --- |
| [`docs/mcp/MCP_SSOT.md`](../mcp/MCP_SSOT.md) | MCP consumer SSOT |
| [`docs/mcp/EOS_MCP_TOOL_CATALOG.json`](../mcp/EOS_MCP_TOOL_CATALOG.json) | Tool catalog |
| [`docs/mcp/NORMALIZED_MCP_CATALOG.json`](../mcp/NORMALIZED_MCP_CATALOG.json) | Normalized catalog |
| [`scripts/lib/mcp-catalog-lock.js`](../../scripts/lib/mcp-catalog-lock.js) | P5 catalog reconcile lock (verify:strict) |
| [`docs/security/WRITE_BARRIER_SANDBOX.md`](../security/WRITE_BARRIER_SANDBOX.md) | Write-barrier policy |
| [`config/security/write-barrier-ssot-roots.json`](../../config/security/write-barrier-ssot-roots.json) | Write-barrier SSOT roots |
| `src/core/write-barrier/` | Write-barrier implementation |
| [`scripts/verify-eos.js`](../../scripts/verify-eos.js) | Primary verify surface (`npm run verify:strict`) |
| [`docs/architecture/TOOL_AGNOSTIC_ARCHITECTURE.md`](../architecture/TOOL_AGNOSTIC_ARCHITECTURE.md) | Tool-agnostic architecture |

---

## 2. Prompt pillar

Surfaces that define **instructions / doctrine** the agent must follow.

| Ref | Role |
| --- | --- |
| [`AGENTS.md`](../../AGENTS.md) | Thin IDE entrypoint (all copilots) |
| [`CLAUDE.md`](../../CLAUDE.md) | Thin IDE entrypoint (Claude Code) |
| [`.agents/AGENTS.md`](../../.agents/AGENTS.md) | **Canonical** agent operating protocol |
| [`docs/base-standards.md`](../base-standards.md) | Spec-Boot base-standards index (SSOT pointers) |
| [`docs/backend-standards.md`](../backend-standards.md) | Backend / control-plane standards |
| [`.cursor/rules/context-engineering-standards.mdc`](../../.cursor/rules/context-engineering-standards.mdc) | Context engineering standard (LIDR & EOS) |
| [`.cursor/rules/harness-engineering-standard.mdc`](../../.cursor/rules/harness-engineering-standard.mdc) | Harness engineering standard |
| [`.cursor/rules/00-eos-operating-system.mdc`](../../.cursor/rules/00-eos-operating-system.mdc) … [`09-eos-documentation.mdc`](../../.cursor/rules/09-eos-documentation.mdc) | EOS numbered doctrine rules |
| [`CONSTITUTION.md`](../../CONSTITUTION.md) / [`docs/core/CONSTITUTION.md`](../core/CONSTITUTION.md) | Supreme constitution |
| [`openspec/`](../../openspec/) | OpenSpec changes + config |
| [`docs/openspec-tasks-mandatory-steps.md`](../openspec-tasks-mandatory-steps.md) | Mandatory self-executed verification steps |
| [`docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`](../architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md) | LIDR Spec-Boot / Gentleman discipline bridge |

### Spec-Boot gaps (DEFER — do not invent)

| Expected Spec-Boot file | Status | Existing proxy (use until authored) |
| --- | --- | --- |
| `docs/frontend-standards.md` | **MISSING / DEFER** | `.cursor/rules/07-eos-product-and-ux.mdc` + `docs/base-standards.md` layer row |
| `docs/documentation-standards.md` | **MISSING / DEFER** | `.cursor/rules/09-eos-documentation.mdc` |
| `docs/development_guide.md` | **MISSING / DEFER** | `docs/base-standards.md` + `.agents/AGENTS.md` |

Do **not** invent full Spec-Boot standards bodies in S2. Gaps stay indexed as DEFER.

---

## 3. Context pillar

Surfaces that define **what project/architecture context** must stay aligned.

| Ref | Role |
| --- | --- |
| [`docs/core/FOUNDATIONAL_CONTEXT.md`](../core/FOUNDATIONAL_CONTEXT.md) | Foundational context |
| [`docs/policies/EOS-CONTEXT-AND-TOKEN-EFFICIENCY-POLICY.md`](../policies/EOS-CONTEXT-AND-TOKEN-EFFICIENCY-POLICY.md) | Context + token efficiency policy |
| [`.cursor/rules/engram.mdc`](../../.cursor/rules/engram.mdc) | Engram memory / compaction discipline |
| [`.cursor/rules/context-engineering-standards.mdc`](../../.cursor/rules/context-engineering-standards.mdc) | Context suite + no-contamination |
| `docs/intake/**/PROJECT_CONTEXT.md` | Per-intake project context (when present) |
| This file | TPC map + lifecycle policy (index only) |

---

## 4. Context lifecycle

Policy text for **when** to act on context. **NON-CLAIM:** not a live runtime orchestrator.

| Verb | When | Operator / agent action |
| --- | --- | --- |
| **inject** | Starting a task or crossing a phase boundary | Load only the minimal TPC refs required for the active mission (this index → named surfaces). Prefer SSOT pointers over pasting large dumps. |
| **compact** | Window pressure, long threads, or repeated tool noise | Summarize durable facts (Engram / notes); drop redundant tool transcripts; keep constitution + active spec + evidence needles. |
| **discard** | Task-local facts no longer actionable | Remove obsolete plans, failed branch hypotheses, and stale file dumps from the working set. |
| **reset** | Context rot or context anxiety (premature closure near window limits) | Clear anxious/rotten working memory; restart from constitution + this TPC index + the active OpenSpec change. |
| **revisit-on-model-change** | Model / provider / context-window class changes | Re-check harness assumptions: tool claims, compaction thresholds, verify surface expectations, and any model-specific limits encoded in rules. |

Sources (cite, do not fork): LIDR harness blog via adoption doc; Anthropic context-anxiety notes as cited by LIDR; Spec-Boot SSOT/symlink map (cite only).

---

## 5. Verify lock

- Module: `scripts/lib/context-pack-lock.js` → `auditContextPackLock`
- Wired into `scripts/verify-eos.js` under `--strict`
- Tests: `npm run test:s2` → `tests/eos-s2-context-pack-tpc.test.js`
- Evidence: `docs/releases/EOS_S2_CONTEXT_PACK_TPC_2026-09-09.md`

Fail-closed if this index is missing or required section needles disappear.

---

## 6. Non-claims

- **NON-CLAIM:** index != full runtime context engineering / orchestrator (index ≠ runtime context completo).
- **PRODUCTION_READY:** NO
- Fundacion Delta=0; App Fuerza untouched
- No new `docs/schemas/**/*.json` (AT_CEILING)
- Does not install Spec-Boot wholesale; does not claim LIDR workshop "solves any problem"
- Does not implement S5–S6 (KEEP inventory / ratchet)
- S3 Loop Engineering: `docs/harness/LOOP_ENGINEERING_4Q.md`
- S4 Worktree isolation: [`docs/harness/WORKTREE_ISOLATION_POLICY.md`](./WORKTREE_ISOLATION_POLICY.md)
