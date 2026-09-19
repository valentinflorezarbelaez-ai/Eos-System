# EOS PO-Gated Complexity Prune Execution Plan — 2026-09-19

**Status:** `PO_GATED_PRUNE_PLAN_READY` (docs-only; **NO deletions**; **NO quarantine moves**; **NO archive execution**)  
**Package:** `/workspace/eos-po-gated-prune-plan/`  
**Owner / PO:** Valentin Florez  
**Source inventory (authoritative):** `docs/releases/EOS_POST_L26_COMPLEXITY_PRUNE_INVENTORY_2026-09-19.md` (ADR-0062; Workstream A)  
**Related ADR:** ADR-0075 (this plan) · ADR-0062 (inventory) · ADR-0059 (post-L26 backlog)  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched; NEVER a prune target)  
**Schemas:** AT_CEILING 35/35 — no new `docs/schemas/**/*.json`  
**L17–L27:** CLOSED_FOR_LOCAL_GOVERNED_USE — **never reopen**  
**Scope class:** Outside L28 default satellite path (CV–CZ). **This is NOT Mission CV, NOT Ladder 28 work, NOT a tip-open.**

**Tip honesty (OBSERVED; cite only — no tip-refresh / no freeze rewrite in this package):**  
- Freeze `main_tip` pin (L27 tip-seal #384 / CU): `58193bc80735c588f0aa09e2c136afa3980c4a51` (short `58193bc8`)  
- Inventory-A hermetic L26 seal context: Mission CP #365 `47cf1a79…` + tip-seal #366 `b7b84478…` (historical inventory pins; do not rewrite freeze to match)  
- Host live HEAD at inventory amend (VERIFIED parent): `8c7cfd63…` (may lag freeze; honesty lag expected)

---

## 1. Purpose

Publish a **PO-gated execution plan** that turns post-L26 inventory A (68 rows) into **ordered, authorize-able batches** so Valentin (PO) can later Level-2-authorize **named paths** for quarantine/archive/delete in a *separate* execution workstream.

This package:

1. Orders proposed prune actions by risk (Batch 0 → 4).
2. Binds each proposed action to inventory row IDs, paths, dispositions, required evidence, and rollback.
3. Supplies an explicit **PO authorization checkbox table** (row ID | path | authorize Y/N | PO initials | date).
4. States stop conditions and a never-touch list.

## 2. NON-CLAIMS (hard)

| Claim rejected | Meaning |
| --- | --- |
| Inventory ≠ delete auth | ADR-0062 / inventory A classify only; dispositions are proposals |
| **Plan ≠ execution** | Landing this plan does **not** quarantine, move, archive, or delete any host/box path |
| Plan ≠ Mission CV | Outside CV–CZ satellite path; do not open L28 under this change |
| Plan ≠ tip-refresh | No freeze/matrix/m4 rewrite; no tip-open |
| Plan ≠ schema growth | AT_CEILING held; no new schemas JSON |
| Plan ≠ PRODUCTION_READY | Remains NO |
| Plan ≠ Fundacion write | Δ=0; Fundacion/** never-touch |
| true_orphans ≠ safe-to-remove | Host orphan probe is OBSERVED; PO must name paths |
| Archive disposition ≠ executed quarantine | Quarantine/archive requires separate authorized execute pass |
| Batch authorize Y ≠ auto-run | Even after PO initials, a *separate* execute workstream must name paths + re-scan |

**Law VI** held (no forbidden provider-prefix literals). **Antigravity-first** (CloudAgent out).

---

## 3. Preconditions (before any future execute)

All must be TRUE before a future execute workstream may touch a PO-authorized row:

| # | Precondition | Claim / note |
| --- | --- | --- |
| P1 | Tip honesty OK | Freeze pin cited; no silent tip rewrite in prune execute |
| P2 | `npm run verify:strict` green on host | Expect host 914/0 pattern held; fail-closed if red |
| P3 | PO Level-2 named paths | Authorization table below with **Y** + initials + date for **each** path |
| P4 | Host import / basename re-scan | Fresh scan after authorize; inventory OBSERVED ≠ live graph |
| P5 | Inventory A + this plan landed (docs-only PR) | ADR-0062 + ADR-0075 on main |
| P6 | COMPLEXITY_BUDGET still AT_CEILING honesty | Schemas 35/35; no budget weaken |
| P7 | Fundacion Δ=0 probe | No Fundacion path in authorize set |
| P8 | Write-barrier / fusion-cp / sentinel-fdir KEEP intact | Never-touch list respected |
| P9 | L17–L27 remain CLOSED | Do not reopen; do not touch L27 ports CQ–CU as prune targets |
| P10 | Separate execute OpenSpec / APPLY | This plan package must not be the execute vehicle |

If any precondition fails → **HOLD / FAIL CLOSED**. Do not execute.

---

## 4. Batch summary (authorize-able counts)

| Batch | Risk | Focus | Authorize-able rows (proposed) | Default disposition |
| --- | --- | --- | --- | --- |
| **0** | n/a | Dry-run checklist only | **0** (process gates) | n/a |
| **1** | Lowest | `delete-later` / pilot + research islands; then theatrical/research **archive/quarantine** + merge cluster | **31** (11 delete-later + 19 archive + 1 merge) | delete-later → quarantine-then-delete **or** delete; archive → quarantine; merge → retain-or-merge-design (no silent delete) |
| **2** | Low–medium | Orphan scripts / engine archive cohorts | **3** rollups (PO must expand to named paths) | archive |
| **3** | Low–medium | Docs / apply / tip-package / untracked proliferation | **5** | archive or delete-later (A-064) |
| **4** | Deferred | KEEP / governance / ownership edges | **29** retain (table-derived) — **NOT authorize-for-prune** | retain |

**Inventory A headline (ADR-0062 summary):** rows=68 · delete-later=12 · archive=25 · merge=1 · retain=30  
**Table-row recount (MEASURED):** delete-later=12 · archive=26 · merge=1 · retain=29 · **union=68** (summary off-by-one vs disposition column; **row-ID lists are ground truth**).  
**Authorize-able under Batches 1–3:** 11+19+1 + 3 + 5 = **39** proposed authorize slots (A-064 in Batch 3; Batch 1 uses 11 of 12 delete-later).  
**Batch 4 retain:** 29 (table-derived) — PO signs **retain / do-not-prune**, not delete auth.

---

## 5. Batch 0 — Dry-run checklist (no path auth)

Execute **only** as checklist; produces evidence, not mutations.

| Step | Action | Pass criteria |
| --- | --- | --- |
| 0.1 | Confirm inventory A + ADR-0062 present on host | Paths exist; claim classes intact |
| 0.2 | Confirm this plan + ADR-0075 present | Docs-only; NON-CLAIMS intact |
| 0.3 | `git rev-parse HEAD` + freeze `main_tip` | Record; do not rewrite freeze |
| 0.4 | `npm run verify:strict` | Green; PRODUCTION_READY=NO |
| 0.5 | Re-read COMPLEXITY_BUDGET.json | status=AT_CEILING; schemas 35/35 |
| 0.6 | Confirm never-touch paths exist and unharmed | write-barrier, Fundacion, freeze/matrix, CQ–CU |
| 0.7 | Draft empty PO auth table copy for Batch 1 | No Y until PO fills |
| 0.8 | Host import re-scan plan for Batch 1 paths | Commands documented in execute EVD (future) |

**Rollback:** n/a (read-only).  
**Required evidence before leaving Batch 0:** dated EVD addendum with P1–P10 status.

---

## 6. Batch 1 — Lowest-risk `delete-later` / pilot islands (+ archive/quarantine src-core)

### 6.1 Section A — Pilot `one_percent` / pilot islands (`delete-later`)

| ID | Path | Disposition (proposed) | Required evidence before execute | Rollback |
| --- | --- | --- | --- | --- |
| A-007 | `src/core/pilot/one_percent/mini-bytecode-vm-engine.js` | quarantine then **delete** (or delete if PO names delete) | Host import re-scan = 0 live consumers outside tests; PO Y; verify:strict green | `git checkout -- <path>` / restore from pre-execute tag |
| A-008 | `src/core/pilot/one_percent/raft-distributed-consensus-engine.js` | quarantine then **delete** | same | same |
| A-009 | `src/core/pilot/one_percent/lsm-tree-storage-engine.js` | quarantine then **delete** | same | same |
| A-010 | `src/core/pilot/one_percent/virtual-kernel-journaling-fs.js` | quarantine then **delete** | same | same |
| A-011 | `src/core/pilot/one_percent/sre-chaos-slo-engine.js` | quarantine then **delete** | same | same |
| A-012 | `src/core/pilot/one_percent/staff-strategic-rfc-engine.js` | quarantine then **delete** | same | same |
| A-013 | `src/core/pilot/one_percent/memory-profiler-inspector.js` | quarantine then **delete** | same | same |
| A-014 | `src/core/pilot/pilot-kv-store.js` | quarantine then **delete** | same | same |

### 6.2 Section B — Research islands (`delete-later`)

| ID | Path | Disposition (proposed) | Required evidence before execute | Rollback |
| --- | --- | --- | --- | --- |
| A-029 | `src/core/scraping/high-speed-web-scraping-engine.js` | quarantine then **delete** | import re-scan; PO Y; verify:strict | git restore / tag |
| A-030 | `src/core/benchmark/autonomous-benchmark-harness-engine.js` | quarantine then **delete** | same | same |
| A-036 | `src/core/resilience/deterministic-chaos-engine.js` | quarantine then **delete** | same | same |

### 6.3 Section C — Theatrical / pleroma-adjacent runtime (`archive` → quarantine)

Prefer **quarantine** (e.g. `archive/quarantine/…`) over hard delete. MCP catalog import re-scan mandatory.

| ID | Path | Disposition (proposed) | Required evidence before execute | Rollback |
| --- | --- | --- | --- | --- |
| A-015 | `src/core/runtime/eos-transmutator.js` | **quarantine** (archive) | MCP/import re-scan; PO Y; verify:strict | move back from quarantine |
| A-016 | `src/core/runtime/distributed-consciousness.js` | **quarantine** | same | same |
| A-017 | `src/core/runtime/ephemeral-redundancy.js` | **quarantine** | same | same |
| A-018 | `src/core/runtime/ontological-dashboard.js` | **quarantine** | same | same |
| A-019 | `src/core/runtime/self-observation-witness.js` | **quarantine** | same | same |
| A-020 | `src/core/runtime/tmr-ontology-engine.js` | **quarantine** | same | same |
| A-021 | `src/core/runtime/trogo-mesh.js` | **quarantine** | same | same |
| A-022 | `src/core/runtime/tescohan-auditor.js` | **quarantine** | same | same |
| A-023 | `src/core/runtime/okidanokh-validator.js` | **quarantine** | same | same |
| A-024 | `src/core/runtime/kabbalah-ledger.js` | **quarantine** | same | same |
| A-025 | `src/core/runtime/heptaparaparshinokh-ledger.js` | **quarantine** | same | same |
| A-026 | `src/core/runtime/triamazikamno-synthesis.js` (+ validator pair) | **quarantine** | same | same |
| A-027 | `src/core/runtime/distributed-justice-oracle.js` | **quarantine** | same | same |
| A-031 | `src/core/orchestration/hypergraph-speculative-engine.js` | **quarantine** | same | same |
| A-032 | `src/core/orchestration/universal-agentic-extension-orchestrator.js` | **quarantine** | same | same |
| A-033 | `src/core/economics/token-economics-audit-engine.js` | **quarantine** | same | same |
| A-034 | `src/core/evolution/autonomous-self-reflection-engine.js` | **quarantine** | same | same |
| A-037 | `src/core/doctrine/formal-engineering-doctrine-engine.js` | **quarantine** | same | same |
| A-038 | `src/core/systems/agentic-systems-thinking-engine.js` | **quarantine** | same | same |

### 6.4 Section D — Merge cluster (no silent delete)

| ID | Path | Disposition (proposed) | Required evidence before execute | Rollback |
| --- | --- | --- | --- | --- |
| A-028 | `src/core/runtime/{joint-operations-command-center,living-architecture-visualizer,adversarial-red-team,ahimsa-filter}.js` | **merge** design into single research HUD module **or retain** | Confirm not soft-wired to `eos:hud`; PO Y on named merge plan; verify:strict | revert merge commit / restore files |

**Batch 1 stop:** Any KEEP edge hit, verify:strict red, or import re-scan finds live consumer → stop batch; do not proceed to Batch 2.

---

## 7. Batch 2 — Orphan scripts

Rollups require PO to **expand to named paths** before execute (inventory ≠ mass-delete).

| ID | Path | Disposition (proposed) | Required evidence before execute | Rollback |
| --- | --- | --- | --- | --- |
| A-048 | `scripts/**` (host-live orphan scan rollup) | **archive** named subset only | Fresh orphan probe; PO names each path; exclude KEEP scripts | restore named files |
| A-050 | `scripts/engine/*` theatrical engines (pkg-referenced) | **archive** after unwire | Unwire `package.json` scripts first; PO Y; verify:strict | restore + re-wire scripts |
| A-053 | `scripts/patch-mission-*.mjs` (historical one-shots) | **archive** named cohort | PO names cohort; keep recent CP/CO helpers if replay-useful | restore named patches |

**Not in Batch 2 execute set (retain — see Batch 4):** A-049 (package.json scripts map), A-051 (`scripts/prune-eos.js`), A-052 (`dirty-defer-triage-lock.js`).

---

## 8. Batch 3 — Docs / apply proliferation

| ID | Path | Disposition (proposed) | Required evidence before execute | Rollback |
| --- | --- | --- | --- | --- |
| A-054 | `docs/releases/EOS_TIP_REFRESH_POST_*` (pre-L24 / pre-#326 cohort) | **archive** to `docs/releases/archive/tip-refresh/` | Keep current freeze/matrix SSOT; PO Y on cohort list | move back from archive/ |
| A-055 | `docs/releases/EOS_TIP_REFRESH_POST_{326..364}_*.md` | **archive** after tip-seal honesty confirmed | Retain until #366 lineage / current freeze honesty OK on host | same |
| A-061 | `/workspace/APPLY-TIP-POST-*.txt` + `APPLY-MISSION-*.txt` (box leftovers) | **archive** (box-only; not host SSOT) | Confirm not confused with host repo paths | restore box files |
| A-062 | `/workspace/eos-tip-post-{326..364}/` hermetic tip packages | **archive** optional; retain ≥365 seal evidence | Keep eos-tip-post-365 (+ optional 366) | restore packages |
| A-064 | Host untracked leftovers (`?? .atl/ .worktrees/ public/ screenshots / openspec stubs`) | **delete-later** / `.gitignore` triage | `git status --short`; PO names each path; **not** all untracked are safe | cannot restore untracked unless backed up first — **backup required** |

**Do not archive/delete:** A-056 freeze gate SSOT, A-057 capability matrix SSOT, A-058 P6 inventory, A-059 backlog, A-060 ADR-0059 (Batch 4 retain).

---

## 9. Batch 4 — Deferred KEEP / governance (retain — do not prune)

PO signs **retain** (29 table-derived rows). These are **never** Batch 1–3 execute targets under this plan.

| ID | Path | Disposition | Why |
| --- | --- | --- | --- |
| A-001..A-006 | COMPLEXITY_BUDGET + ceiling/inventory locks | **retain** | AT_CEILING honesty / NO-GROWTH locks |
| A-035 | `src/core/qa/closed-loop-qa-observability-engine.js` | **retain** | refreshed retain |
| A-039 | `src/core/write-barrier/index.js` | **retain** | FUSION_CP_REQUIRED_PATHS |
| A-040 | `src/core/mcp/mission-loop.js` | **retain** | FUSION_CP_REQUIRED_PATHS |
| A-041 | `src/core/adversarial/long-run-gameday-harness.js` | **retain** | FUSION_CP_REQUIRED_PATHS |
| A-042 | `src/core/observability/mission-os-coherence.js` | **retain** | FUSION_CP_REQUIRED_PATHS |
| A-043 | `src/core/sentinel-daemon.js` | **retain** | sentinel-fdir-lock |
| A-044 | `src/core/fdir.js` | **retain** | sentinel-fdir-lock |
| A-045 | `src/core/runtime/operator-doctor.js` | **retain** | POST_FUSION_CRITICAL_PATHS |
| A-046 | `src/core/observability/operator-hud.js` | **retain** | eos:hud / verify |
| A-047 | `src/core/sdd/evidence-custody.js` | **retain** | POST_FUSION_CRITICAL_PATHS |
| A-049 | `package.json` scripts map | **retain** | SSOT map (313 keys) |
| A-051 | `scripts/prune-eos.js` | **retain** | until governed prune workflow replaces |
| A-052 | `scripts/lib/dirty-defer-triage-lock.js` | **retain** | tip honesty dependency |
| A-056 | `docs/releases/EOS_FREEZE_GATE_STATUS.md` | **retain** | freeze SSOT |
| A-057 | `docs/releases/RELEASE_CAPABILITY_MATRIX.md` | **retain** | matrix SSOT |
| A-058 | P6 inventory 2026-09-09 | **retain** | baseline |
| A-059 | post-L26 perfection backlog | **retain** | backlog SSOT |
| A-060 | ADR-0059 | **retain** | backlog ADR |
| A-063 | `/workspace/eos-mission-{cb..cp}/` | **retain** | L24–L26 evidence / Δ=0 drills |
| A-065 | `tests/eos-m4-release-ssot-tip.test.js` | **retain** | tip pin test |
| A-066 | `openspec/changes/**` (L17–L26 trees) | **retain** | closed-ladder SSOT |
| A-067 | `archive/quarantine/engine-roi2/` | **retain** | out-of-scope re-prune |
| A-068 | `Fundacion/**` | **retain** | Law/guardrail Δ=0 |

---

## 10. PO authorization template (Level-2)

**Instructions:** PO fills **Authorize Y/N**, **Initials**, **Date** per row. Blank = **N**. Only **Y** rows may enter a future execute workstream. This table in the landed plan is the auth artifact; execute must copy authorized rows into its own APPLY.

### 10.1 Batch 1 — authorize-able

| Row ID | Path | Authorize Y/N | PO initials | Date |
| --- | --- | --- | --- | --- |
| A-007 | `src/core/pilot/one_percent/mini-bytecode-vm-engine.js` | ☐ Y / ☐ N |  |  |
| A-008 | `src/core/pilot/one_percent/raft-distributed-consensus-engine.js` | ☐ Y / ☐ N |  |  |
| A-009 | `src/core/pilot/one_percent/lsm-tree-storage-engine.js` | ☐ Y / ☐ N |  |  |
| A-010 | `src/core/pilot/one_percent/virtual-kernel-journaling-fs.js` | ☐ Y / ☐ N |  |  |
| A-011 | `src/core/pilot/one_percent/sre-chaos-slo-engine.js` | ☐ Y / ☐ N |  |  |
| A-012 | `src/core/pilot/one_percent/staff-strategic-rfc-engine.js` | ☐ Y / ☐ N |  |  |
| A-013 | `src/core/pilot/one_percent/memory-profiler-inspector.js` | ☐ Y / ☐ N |  |  |
| A-014 | `src/core/pilot/pilot-kv-store.js` | ☐ Y / ☐ N |  |  |
| A-029 | `src/core/scraping/high-speed-web-scraping-engine.js` | ☐ Y / ☐ N |  |  |
| A-030 | `src/core/benchmark/autonomous-benchmark-harness-engine.js` | ☐ Y / ☐ N |  |  |
| A-036 | `src/core/resilience/deterministic-chaos-engine.js` | ☐ Y / ☐ N |  |  |
| A-015 | `src/core/runtime/eos-transmutator.js` | ☐ Y / ☐ N |  |  |
| A-016 | `src/core/runtime/distributed-consciousness.js` | ☐ Y / ☐ N |  |  |
| A-017 | `src/core/runtime/ephemeral-redundancy.js` | ☐ Y / ☐ N |  |  |
| A-018 | `src/core/runtime/ontological-dashboard.js` | ☐ Y / ☐ N |  |  |
| A-019 | `src/core/runtime/self-observation-witness.js` | ☐ Y / ☐ N |  |  |
| A-020 | `src/core/runtime/tmr-ontology-engine.js` | ☐ Y / ☐ N |  |  |
| A-021 | `src/core/runtime/trogo-mesh.js` | ☐ Y / ☐ N |  |  |
| A-022 | `src/core/runtime/tescohan-auditor.js` | ☐ Y / ☐ N |  |  |
| A-023 | `src/core/runtime/okidanokh-validator.js` | ☐ Y / ☐ N |  |  |
| A-024 | `src/core/runtime/kabbalah-ledger.js` | ☐ Y / ☐ N |  |  |
| A-025 | `src/core/runtime/heptaparaparshinokh-ledger.js` | ☐ Y / ☐ N |  |  |
| A-026 | `src/core/runtime/triamazikamno-synthesis.js` (+ pair) | ☐ Y / ☐ N |  |  |
| A-027 | `src/core/runtime/distributed-justice-oracle.js` | ☐ Y / ☐ N |  |  |
| A-031 | `src/core/orchestration/hypergraph-speculative-engine.js` | ☐ Y / ☐ N |  |  |
| A-032 | `src/core/orchestration/universal-agentic-extension-orchestrator.js` | ☐ Y / ☐ N |  |  |
| A-033 | `src/core/economics/token-economics-audit-engine.js` | ☐ Y / ☐ N |  |  |
| A-034 | `src/core/evolution/autonomous-self-reflection-engine.js` | ☐ Y / ☐ N |  |  |
| A-037 | `src/core/doctrine/formal-engineering-doctrine-engine.js` | ☐ Y / ☐ N |  |  |
| A-038 | `src/core/systems/agentic-systems-thinking-engine.js` | ☐ Y / ☐ N |  |  |
| A-028 | `src/core/runtime/{joint-operations-command-center,…}.js` (merge) | ☐ Y / ☐ N |  |  |

### 10.2 Batch 2 — authorize-able (named expansion required)

| Row ID | Path | Authorize Y/N | PO initials | Date |
| --- | --- | --- | --- | --- |
| A-048 | `scripts/**` orphan rollup — **named paths only** (attach list) | ☐ Y / ☐ N |  |  |
| A-050 | `scripts/engine/*` theatrical — **named paths + unwire** | ☐ Y / ☐ N |  |  |
| A-053 | `scripts/patch-mission-*.mjs` — **named cohort** | ☐ Y / ☐ N |  |  |

### 10.3 Batch 3 — authorize-able

| Row ID | Path | Authorize Y/N | PO initials | Date |
| --- | --- | --- | --- | --- |
| A-054 | pre-L24 tip-refresh cohort | ☐ Y / ☐ N |  |  |
| A-055 | tip-refresh POST_326..364 cohort | ☐ Y / ☐ N |  |  |
| A-061 | box APPLY-*.txt leftovers | ☐ Y / ☐ N |  |  |
| A-062 | box eos-tip-post-{326..364}/ | ☐ Y / ☐ N |  |  |
| A-064 | host untracked leftovers — **named paths + backup** | ☐ Y / ☐ N |  |  |

### 10.4 Batch 4 — retain confirmation (optional PO sign-off)

| Row ID | Path class | Confirm RETAIN Y/N | PO initials | Date |
| --- | --- | --- | --- | --- |
| A-001..A-006 | AT_CEILING / locks | ☐ Y retain |  |  |
| A-039..A-047 | fusion-cp / sentinel / doctor / hud KEEP | ☐ Y retain |  |  |
| A-056..A-060 | freeze/matrix/P6/backlog/ADR-0059 | ☐ Y retain |  |  |
| A-068 | Fundacion/** | ☐ Y retain (mandatory) |  |  |

---

## 11. Stop conditions / never-touch list

**Stop immediately if:**

1. verify:strict red  
2. PO auth missing / blank for the path  
3. Import re-scan finds unexpected live consumer  
4. Path resolves into never-touch list  
5. Any Fundacion path appears in execute set  
6. Attempt to reopen L17–L27 or touch L27 ports CQ–CU as prune targets  
7. Attempt to add `docs/schemas/**/*.json` or weaken AT_CEILING  
8. Attempt to rewrite freeze/matrix/m4 tip pins under “prune”  
9. PRODUCTION_READY flip proposed as side effect  
10. Execute attempted from *this* plan package without a separate execute OpenSpec/APPLY  

**Never-touch (non-exhaustive):**

- `Fundacion/**` (A-068)  
- `src/core/write-barrier/**` (A-039)  
- fusion-cp required: mission-loop, long-run-gameday-harness, mission-os-coherence (A-040..A-042)  
- sentinel-fdir: `sentinel-daemon.js`, `fdir.js` (A-043..A-044)  
- doctor / hud / evidence-custody (A-045..A-047)  
- `docs/releases/EOS_FREEZE_GATE_STATUS.md`, `RELEASE_CAPABILITY_MATRIX.md` (A-056..A-057)  
- AT_CEILING locks / COMPLEXITY_BUDGET honesty (A-001..A-006)  
- `scripts/lib/dirty-defer-triage-lock.js` (A-052)  
- `archive/quarantine/engine-roi2/` re-prune (A-067)  
- L27 ports / OpenSpec trees for CQ–CU; closed L17–L26 openspec without separate ADR (A-066)  
- Mission OS / control-plane L0 paths that L28 CV–CZ may compose — **do not preempt L28**; this plan is outside CV–CZ  

---

## 12. Next host actions (docs-only)

1. Parent **CopyFromBox** this package → Windows repo (docs/adrs/openspec/evidence only).  
2. Docs-only PR (proposed branch `grok/po-gated-prune-execution-plan`).  
3. PO fills authorization tables (Y/N + initials + date).  
4. **Separate** execute workstream only after Batch 0 dry-run + named Y rows — **not this package**.

---

## 13. Claim classes

| Class | Use in this plan |
| --- | --- |
| OBSERVED | Inventory A rows, box packages, L28 audit freeze pin cite |
| VERIFIED | Inventory parent host amend (HEAD, budget, locks) where noted |
| MEASURED | Inventory counts (68 rows; disposition tallies) |
| INFERRED | Batch risk ordering from inventory dep-risk + category |
| UNKNOWN | Live import graph at execute time — must re-scan |

