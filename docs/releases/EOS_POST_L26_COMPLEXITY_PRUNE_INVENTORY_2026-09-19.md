# EOS Post-L26 Complexity Prune Inventory — 2026-09-19

**Status:** `POST_L26_A_PRUNE_INVENTORY_READY` (docs-only; **NO deletions**)  
**Workstream:** A — Complexity prune inventory (EOS_POST_L26_PERFECTION_BACKLOG)  
**Owner:** Valentin Florez  
**L26 seal (OBSERVED hermetic):** Mission CP #365 tip `47cf1a79` (`47cf1a790c95f78a79e34830c4d6515d16dc67d0`) + tip-seal #366 `b7b84478` (`b7b844787cf4703c389751e8c1e0fa063870f5ad`)  
**Host live HEAD (VERIFIED parent scan 2026-09-19):** `8c7cfd632cbfa5bc88a400bb2ebe1bfcb05435dc` (short `8c7cfd63`, post-#367 backlog). Freeze `main_tip` still `47cf1a790c95f78a79e34830c4d6515d16dc67d0` (honesty lag expected until next tip-refresh; tip-seal #366 already closed L26).  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched)  
**L17–L26:** CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen; **do not open L27**  

## NON-CLAIMS

- **Inventory ≠ safe to remove.** No host file is deleted by this package.
- Host-live orphan probe is **OBSERVED** (parent amend). Basename-zero-ref orphans include historical `patch-mission-*` one-shots — **not** an automatic delete list.
- Tip full SHAs in hermetic tip packages follow tip-247-style pins; operator short pins (`47cf1a79`, `b7b84478`) are the honesty handles used here.
- This inventory does **not** authorize quarantine, merge, or archive execution.
- `AT_CEILING` ≠ obligation to prune immediately.

## Claim classes

| Class | Meaning |
| --- | --- |
| VERIFIED | Checked against authoritative host git object (not available this run) |
| OBSERVED | Seen in hermetic box packages / prior sealed inventories |
| MEASURED | Counted from files present on box |
| INFERRED | Reasonable from evidence but not directly opened |
| UNKNOWN | Host-live data required; blocked or missing |

## Method limits (honesty)

1. Hermetic package originally built without host routing from the executor.
2. **Parent amend (VERIFIED/OBSERVED on machineId `77c24295`):** live `git rev-parse`, file counts, COMPLEXITY_BUDGET.json, lock-path existence, orphan basename probe.
3. Orphan probe is coarse (basename not referenced outside self). Many `patch-mission-*.mjs` are intentional one-shots → disposition **archive**, not delete-now.
4. Do not delete until a separate authorized prune workstream names paths.

## Delta since P6 inventory (2026-09-09)

| Item | P6 (2026-09-09) | Post-L26 A (2026-09-19) |
| --- | --- | --- |
| Base tip | `6bc0472` (post-P5 #58) | L26 sealed `#365/#366` (`47cf1a79` / `b7b84478`) |
| Focus | `src/core` JS islands vs KEEP locks | AT_CEILING + orphans + tip/doc/apply proliferation + ownership edges |
| Complexity budget | WITHIN_BUDGET claim then corrected | **AT_CEILING** schemas 35/35 (Q4 honesty lock OBSERVED) |
| Candidate rows | 32 ranked src/core | This inventory: **68** rows (rollups + exemplars; not exhaustive FS dump) |
| Deletions | Forbidden | Forbidden |

## Counts (this inventory)

- **Rows:** 68
- **By disposition:** archive=25, delete-later=12, merge=1, retain=30
- **By category:** AT_CEILING=6, duplicate-doc=7, high-risk-retain=9, orphan-script=6, ownership-edge=4, src-core-island=32, stale-apply-pack=4
- **AT_CEILING rows:** 6
- **Orphan-script rows (inventory exemplars):** 6
- **Host live (VERIFIED parent):** scripts_js=176 · docs=2695 · openspec/changes=1078 · src/core js=368 · package.json scripts=313
- **Host COMPLEXITY_BUDGET (VERIFIED):** status=AT_CEILING · schemas 35/35 · engines 13/15 · state_machines 7/10 · governance_layers 7/10
- **Host orphan probe (OBSERVED):** no_pkg_ref≈141 · true_orphans (0 basename hits outside self)=80 (majority `scripts/patch-mission-*.mjs` historical one-shots)
- **Host tip-refresh docs:** 107 · mission release docs: 82 · ladder release docs: 20
- **Tip hermetic packages on box (MEASURED):** 21 · unique tip-refresh basenames on box: 84 · APPLY-*.txt box root: 38

## Inventory table

| ID | Path | Category | Owner | Dep risk | Disposition | Claim | No-growth / replacement / block |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-001 | `docs/governance/COMPLEXITY_BUDGET.json (schemas 35/35)` | AT_CEILING | governance/Q4-lock | high | **retain** | OBSERVED | NO-GROWTH: No new docs/schemas/**/*.json without PO-named quarantine or budget bump ADR. AT_CEILING ≠ delete mandate. REPL/EVD: eos-q4/COMPLEXITY_BUDGET.json + EOS_Q4_COMPLEXITY_BUDGET_RECOUNT_2026-09-09.md WHY: eos-q4 hermetic COMPLEXITY_BUDGET.json status=AT_CEILING; recursive docs/schemas/**/*.json count locked at 35/35. |
| A-002 | `docs/governance/COMPLEXITY_BUDGET.json (engines 13/15)` | AT_CEILING | governance/Q4-lock | medium | **retain** | OBSERVED | NO-GROWTH: Prefer quarantine/ROI2-style archive over new engines. No silent engine adds under scripts/engine or src/core/*-engine.js. REPL/EVD: COMPLEXITY_BUDGET.json current_usage.engines WHY: engines usage 13/15 near ceiling in Q4 budget snapshot; room for 2 only. |
| A-003 | `docs/governance/COMPLEXITY_BUDGET.json (state_machines 7/10)` | AT_CEILING | governance/Q4-lock | low | **retain** | OBSERVED | NO-GROWTH: New state machines require explicit budget row + owner. REPL/EVD: COMPLEXITY_BUDGET.json WHY: state_machines 7/10 — headroom remains; track only. |
| A-004 | `docs/governance/COMPLEXITY_BUDGET.json (governance_layers 7/10)` | AT_CEILING | governance/Q4-lock | low | **retain** | OBSERVED | NO-GROWTH: No new governance layer without ADR. REPL/EVD: COMPLEXITY_BUDGET.json WHY: governance_layers 7/10 — headroom remains. |
| A-005 | `scripts/lib/p6-inventory-lock.js (+ Q6 verify lock)` | AT_CEILING | governance/Q6 | high | **retain** | OBSERVED | NO-GROWTH: Lock must keep pointing at dated inventory; do not weaken NON-CLAIM language. REPL/EVD: eos-q6/scripts/lib/p6-inventory-lock.js WHY: P6 inventory fail-closed lock present in eos-q6 hermetic package; inventory≠prune. |
| A-006 | `scripts/lib/complexity-ceiling-hold-lock.js / complexity-budget-lock.js / scripts/ci/complexity-ceiling-hold-gate.js` | AT_CEILING | ci-governance | high | **retain** | VERIFIED | NO-GROWTH: Hold/gate must remain fail-closed while schemas AT_CEILING; no growth past budget without PO. REPL/EVD: host paths exist (Test-Path True×3) + COMPLEXITY_BUDGET.json status=AT_CEILING schemas 35/35 WHY: Parent live scan 2026-09-19 on machineId 77c24295 confirmed lock/gate files and AT_CEILING budget. |
| A-007 | `src/core/pilot/one_percent/mini-bytecode-vm-engine.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-008 | `src/core/pilot/one_percent/raft-distributed-consensus-engine.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-009 | `src/core/pilot/one_percent/lsm-tree-storage-engine.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-010 | `src/core/pilot/one_percent/virtual-kernel-journaling-fs.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-011 | `src/core/pilot/one_percent/sre-chaos-slo-engine.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-012 | `src/core/pilot/one_percent/staff-strategic-rfc-engine.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-013 | `src/core/pilot/one_percent/memory-profiler-inspector.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-014 | `src/core/pilot/pilot-kv-store.js` | src-core-island | UNKNOWN (pilot) | low | **delete-later** | OBSERVED | REPL/EVD: EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md Tier A BLOCKED: PO must name path before quarantine; inventory≠safe-to-remove WHY: P6 2026-09-09 Tier A pilot island; 0 live consumers outside tests per prior inventory. |
| A-015 | `src/core/runtime/eos-transmutator.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-016 | `src/core/runtime/distributed-consciousness.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-017 | `src/core/runtime/ephemeral-redundancy.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-018 | `src/core/runtime/ontological-dashboard.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-019 | `src/core/runtime/self-observation-witness.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-020 | `src/core/runtime/tmr-ontology-engine.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-021 | `src/core/runtime/trogo-mesh.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-022 | `src/core/runtime/tescohan-auditor.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-023 | `src/core/runtime/okidanokh-validator.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-024 | `src/core/runtime/kabbalah-ledger.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-025 | `src/core/runtime/heptaparaparshinokh-ledger.js` | src-core-island | UNKNOWN (theatrical/MCP) | medium | **archive** | OBSERVED | REPL/EVD: Prefer archive/quarantine + simulation-testbed segregation; see P6 Tier B BLOCKED: May still be imported by MCP catalog; re-scan imports on host before move WHY: P6 Tier B theatrical/pleroma-adjacent; MCP dead/orphan register adjacency. |
| A-026 | `src/core/runtime/triamazikamno-synthesis.js (+ validator pair)` | src-core-island | UNKNOWN | medium | **archive** | OBSERVED | REPL/EVD: P6 inventory rank 20 BLOCKED: import re-scan required WHY: P6 Tier B theatrical synthesis pair. |
| A-027 | `src/core/runtime/distributed-justice-oracle.js` | src-core-island | UNKNOWN | low | **archive** | OBSERVED | REPL/EVD: P6 rank 21 BLOCKED: import re-scan required WHY: P6 Tier B simulation oracle. |
| A-028 | `src/core/runtime/{joint-operations-command-center,living-architecture-visualizer,adversarial-red-team,ahimsa-filter}.js` | src-core-island | UNKNOWN | medium | **merge** | OBSERVED | REPL/EVD: P6 rank 22 BLOCKED: HUD adjacency — confirm not soft-wired to eos:hud WHY: P6 Tier B operator-theatre cluster; consider merge into single research HUD module if retained. |
| A-029 | `src/core/scraping/high-speed-web-scraping-engine.js` | src-core-island | UNKNOWN | low | **delete-later** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-030 | `src/core/benchmark/autonomous-benchmark-harness-engine.js` | src-core-island | UNKNOWN | low | **delete-later** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-031 | `src/core/orchestration/hypergraph-speculative-engine.js` | src-core-island | UNKNOWN | low | **archive** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-032 | `src/core/orchestration/universal-agentic-extension-orchestrator.js` | src-core-island | UNKNOWN | low | **archive** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-033 | `src/core/economics/token-economics-audit-engine.js` | src-core-island | UNKNOWN | low | **archive** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-034 | `src/core/evolution/autonomous-self-reflection-engine.js` | src-core-island | UNKNOWN | low | **archive** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-035 | `src/core/qa/closed-loop-qa-observability-engine.js` | src-core-island | UNKNOWN | medium | **retain** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-036 | `src/core/resilience/deterministic-chaos-engine.js` | src-core-island | UNKNOWN | low | **delete-later** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-037 | `src/core/doctrine/formal-engineering-doctrine-engine.js` | src-core-island | UNKNOWN | low | **archive** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-038 | `src/core/systems/agentic-systems-thinking-engine.js` | src-core-island | UNKNOWN | low | **archive** | OBSERVED | REPL/EVD: P6 Tier C + host import re-scan BLOCKED: PO path naming required for delete-later/archive WHY: P6 Tier C research engine island; disposition refreshed for post-L26 inventory. |
| A-039 | `src/core/write-barrier/index.js` | high-risk-retain | fusion-cp | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=FUSION_CP_REQUIRED_PATHS WHY: P6 KEEP set; dependency edge: FUSION_CP_REQUIRED_PATHS. Do not prune. |
| A-040 | `src/core/mcp/mission-loop.js` | high-risk-retain | fusion-cp | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=FUSION_CP_REQUIRED_PATHS WHY: P6 KEEP set; dependency edge: FUSION_CP_REQUIRED_PATHS. Do not prune. |
| A-041 | `src/core/adversarial/long-run-gameday-harness.js` | high-risk-retain | fusion-cp | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=FUSION_CP_REQUIRED_PATHS WHY: P6 KEEP set; dependency edge: FUSION_CP_REQUIRED_PATHS. Do not prune. |
| A-042 | `src/core/observability/mission-os-coherence.js` | high-risk-retain | fusion-cp | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=FUSION_CP_REQUIRED_PATHS WHY: P6 KEEP set; dependency edge: FUSION_CP_REQUIRED_PATHS. Do not prune. |
| A-043 | `src/core/sentinel-daemon.js` | high-risk-retain | sentinel-fdir | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=sentinel-fdir-lock WHY: P6 KEEP set; dependency edge: sentinel-fdir-lock. Do not prune. |
| A-044 | `src/core/fdir.js` | high-risk-retain | sentinel-fdir | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=sentinel-fdir-lock WHY: P6 KEEP set; dependency edge: sentinel-fdir-lock. Do not prune. |
| A-045 | `src/core/runtime/operator-doctor.js` | high-risk-retain | doctor | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=POST_FUSION_CRITICAL_PATHS WHY: P6 KEEP set; dependency edge: POST_FUSION_CRITICAL_PATHS. Do not prune. |
| A-046 | `src/core/observability/operator-hud.js` | high-risk-retain | hud | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=eos:hud / verify surfaces WHY: P6 KEEP set; dependency edge: eos:hud / verify surfaces. Do not prune. |
| A-047 | `src/core/sdd/evidence-custody.js` | high-risk-retain | doctor/custody | critical | **retain** | OBSERVED | REPL/EVD: P6 §3 KEEP; edge=POST_FUSION_CRITICAL_PATHS WHY: P6 KEEP set; dependency edge: POST_FUSION_CRITICAL_PATHS. Do not prune. |
| A-048 | `scripts/** (host-live orphan scan)` | orphan-script | UNKNOWN | medium | **archive** | OBSERVED | REPL/EVD: Parent probe 2026-09-19: 176 scripts_js; 141 no package.json basename ref; 80 true_orphans (0 hits outside self). Majority = `patch-mission-*.mjs` one-shots + a few exams/hooks/ci. BLOCKED: Do not mass-delete; PO must name paths; many are intentional hermetic apply leftovers WHY: Live host orphan surface is large but low-risk if treated as archive candidates, not delete-now. |
| A-049 | `package.json scripts map (host live)` | orphan-script | release-ssot | medium | **retain** | VERIFIED | REPL/EVD: host package.json 2026-09-19 WHY: Host live npm script keys = **313** (up from CB hermetic snapshot 285). Large script surface retained as SSOT map; not an orphan list. |
| A-050 | `scripts/engine/* theatrical engines (referenced by package.json)` | orphan-script | engine-surface | medium | **archive** | OBSERVED | REPL/EVD: ROI2 quarantine pattern archive/quarantine/engine-roi2/ BLOCKED: Referenced by npm scripts — unwire before archive WHY: Multiple scripts/engine/* paths are referenced from package.json in CB snapshot (e.g. adversarial-laboratory-engine, autonomous-self-evolution-engine). Not orphans; still prune-candidates as complexity. |
| A-051 | `scripts/prune-eos.js` | orphan-script | UNKNOWN | high | **retain** | OBSERVED | REPL/EVD: package.json prune:eos WHY: Referenced as prune:eos in package.json snapshot — KEEP until replaced by governed prune workflow. |
| A-052 | `scripts/lib/dirty-defer-triage-lock.js` | orphan-script | m4/freeze | critical | **retain** | OBSERVED | REPL/EVD: eos-tip-post-365/scripts/lib/dirty-defer-triage-lock.js WHY: Present in all tip-post packages (21/21 OBSERVED); tip honesty dependency. NOT an orphan. |
| A-053 | `scripts/patch-mission-*.mjs (host + box one-shots)` | orphan-script | mission-packaging | low | **archive** | VERIFIED | REPL/EVD: Host true_orphan list dominated by patch-mission-*.mjs; not in package.json scripts map BLOCKED: Archive only after PO names cohort; keep recent CP/CO patches if still useful for replay WHY: Parent live scan confirms host retains historical patch-mission helpers as zero-ref orphans — primary archive cohort for a later prune workstream. |
| A-054 | `docs/releases/EOS_TIP_REFRESH_POST_* (pre-L24 / pre-#326 cohort)` | duplicate-doc | release-ssot | low | **archive** | OBSERVED | REPL/EVD: Keep only current freeze/matrix + latest tip-refresh post-#365/#366; archive older tip-refresh docs to docs/releases/archive/tip-refresh/ BLOCKED: Do not delete freeze/matrix SSOT WHY: Box OBSERVED ≥84 unique EOS_TIP_REFRESH*.md basenames across hermetic packages; historical tip refresh docs older than L24 (#326) are superseded by later tip SSOT trio. |
| A-055 | `docs/releases/EOS_TIP_REFRESH_POST_{326..364}_*.md (L24–L26 tip cascade)` | duplicate-doc | release-ssot | medium | **archive** | OBSERVED | REPL/EVD: EOS_TIP_REFRESH_POST_365_2026-09-19.md + tip-seal #366 honesty note BLOCKED: Retain until tip-seal #366 confirmed on host main WHY: 21 eos-tip-post-* hermetic packages on box (326–365). Intermediate tip-refresh docs are historical once #365+#366 sealed L26. |
| A-056 | `docs/releases/EOS_FREEZE_GATE_STATUS.md` | duplicate-doc | release-ssot | critical | **retain** | OBSERVED | REPL/EVD: Single host SSOT path docs/releases/EOS_FREEZE_GATE_STATUS.md WHY: SSOT freeze gate; tip-365 hermetic header pins Mission CP tip. Multiple stale copies exist inside old tip packages — host should have single SSOT. |
| A-057 | `docs/releases/RELEASE_CAPABILITY_MATRIX.md` | duplicate-doc | release-ssot | critical | **retain** | OBSERVED | REPL/EVD: host SSOT only WHY: SSOT capability matrix; retain. Old tip-package copies are not host SSOT. |
| A-058 | `docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md` | duplicate-doc | governance/P6 | medium | **retain** | OBSERVED | REPL/EVD: Update p6-inventory-lock to also accept post-L26 inventory OR keep both WHY: Prior inventory; retain as baseline. This Workstream A inventory is the post-L26 delta, not a silent replacement without lock update. |
| A-059 | `docs/releases/EOS_POST_L26_PERFECTION_BACKLOG_2026-09-19.md` | duplicate-doc | post-l26 | high | **retain** | OBSERVED | REPL/EVD: eos-post-l26-backlog package WHY: Parent backlog authorizing Workstream A; retain. |
| A-060 | `docs/adrs/ADR-0059-post-l26-perfection-backlog.md` | duplicate-doc | post-l26 | high | **retain** | OBSERVED | REPL/EVD: ADR-0059 WHY: Backlog ADR; retain. |
| A-061 | `/workspace/APPLY-TIP-POST-*.txt + APPLY-MISSION-*.txt (box leftovers)` | stale-apply-pack | box-workspace | low | **archive** | OBSERVED | REPL/EVD: Parent apply logs / merged PRs; box may keep for audit BLOCKED: Box-only; do not confuse with host repo paths WHY: 38 APPLY-*.txt at /workspace root OBSERVED; historical apply instructions for parent CopyFromBox. Not host repo SSOT. |
| A-062 | `/workspace/eos-tip-post-{326..364}/ (hermetic tip packages)` | stale-apply-pack | box-workspace | low | **archive** | OBSERVED | REPL/EVD: Retain eos-tip-post-365 as L26 seal evidence package; older optional archive WHY: 21 tip hermetic packages OBSERVED on box. Useful archaeology; not host SSOT after apply. |
| A-063 | `/workspace/eos-mission-{cb..cp}/ hermetic mission packages` | stale-apply-pack | box-workspace | low | **retain** | OBSERVED | REPL/EVD: n/a — evidence retain WHY: Mission hermetic packages are evidence of L24–L26 ports; retain for Δ=0 drills (Workstream F) and audit. |
| A-064 | `Host untracked leftovers (?? .atl/ .worktrees/ public/ screenshots / openspec stubs)` | stale-apply-pack | UNKNOWN | medium | **delete-later** | OBSERVED | REPL/EVD: `git status --short` on host shows ~46 untracked paths (screenshots, PTG/Fundacion pngs, local openspec stubs, .worktrees) BLOCKED: Not all untracked are safe to delete; separate triage WHY: Parent observed large untracked working-tree noise during tip-seal commits; candidates for delete-later / .gitignore, not inventory execution. |
| A-065 | `tests/eos-m4-release-ssot-tip.test.js` | ownership-edge | m4/release-ssot | critical | **retain** | OBSERVED | REPL/EVD: eos-tip-post-365/tests/eos-m4-release-ssot-tip.test.js WHY: Tip pin test shipped in tip-365 package; couples freeze tip honesty to CI/local verify. |
| A-066 | `openspec/changes/** (L17–L26 change trees)` | ownership-edge | openspec | high | **retain** | INFERRED | REPL/EVD: Keep; never reopen L17–L26 BLOCKED: Do not delete closed-ladder openspec without separate ADR WHY: OpenSpec change trees are historical SSOT for closed ladders; archive-only with PO after L27 audit — not now. |
| A-067 | `archive/quarantine/engine-roi2/` | ownership-edge | roi2 | low | **retain** | OBSERVED | REPL/EVD: ROI2_ENGINE_PRUNE_2026-09-08.md WHY: P6 explicitly out-of-scope to restore or re-prune ROI2 quarantine. |
| A-068 | `Fundacion/**` | ownership-edge | Fundacion | critical | **retain** | OBSERVED | REPL/EVD: n/a WHY: Law/guardrail: no Fundacion writes; Delta=0. Not a prune target. |

## Proposed before/after (proposal only — NOT executed)

| Surface | Before (OBSERVED/MEASURED on box or P6) | After (proposal) |
| --- | --- | --- |
| `docs/schemas/**/*.json` | 35 (AT_CEILING) | ≤35 until PO quarantine names paths |
| Tip-refresh release docs | 84 unique basenames on box | 1 current + archive/ for historical |
| Box tip hermetic packages | 21 | Keep ≥365 (+ optional 366 seal pkg); archive older |
| P6 src/core candidates | 32 | Quarantine only after PO names + import re-scan |
| Host orphan scripts | 80 true_orphans (OBSERVED) | Archive patch-mission cohort after PO names; re-test imports |

## Next actions

1. Land this docs-only inventory on main (no freeze/matrix/m4 change required for Workstream A).
2. Workstream B (Doctor/HUD honesty) may proceed in parallel; prune **execution** waits for PO-named paths.
3. Do **not** delete anything until a separate authorized prune workstream names paths.
4. Optional later tip-refresh if freeze tip honesty should advance past `47cf1a79` to post-#367 HEAD (out of scope for A).

