# EOS P6 Complexity prune inventory (+ optional soak observe) - 2026-09-09

**Branch:** `cursor/eos-p6-complexity-prune-inventory`
**Base main tip:** `6bc047256db7ba100b7a7f68674d610ead8682ed` (post-P5 #58)
**Scope:** P6 ONLY (Ladder 4 J6) — EOS-only, **docs inventory**
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)
**Code delete/move:** FORBIDDEN in this change set (inventory only; PO must name paths before any quarantine)

---

## 1. Goal (P6 / J6 DoD)

1. Docs-only prune **candidate** list at tip for `src/core` JS islands not required by verify / fusion-cp / sentinel / doctor.
2. Note ROI2 `scripts/engine` quarantine already done — do not re-propose.
3. Optional HUD / doctor / `gameday:long-run --soak` observe recipe (**NON-CLAIM**; opt-in flags only; no mandatory CI soak).
4. Freeze note: Ladder 4 P1–P6 complete **after merge**.
5. Light `test:p6` that this inventory doc exists + has required sections.
6. PRODUCTION_READY remains NO.
---

## 2. Inventory method (evidence)

| Step | Action | Result @ tip 6bc0472 |
| --- | --- | --- |
| A | Enumerate `src/core/**/*.js` | **183** JS files |
| B | Exact KEEP from fusion-cp / sentinel-fdir / doctor critical paths + HUD/gameday harness wiring | See §3 |
| C | Flag islands: not on KEEP surface; pilot/`one_percent`; theatrical/pleroma-adjacent runtime; research engines with ~0 live consumers outside own tests | Ranked §4 |
| D | Cross-check MCP dead/orphan theatrical register (~22 simulation tools) | Maps to Tier B runtime modules |
| E | Complexity budget | `docs/governance/COMPLEXITY_BUDGET.json` status **WITHIN_BUDGET**; schemas 33/35 near ceiling — inventory supports future PO prune, does not flip budget |
| F | ROI2 | `scripts/engine` already quarantined (`ROI2_ENGINE_PRUNE_2026-09-08.md`); **out of scope** to restore or re-prune |

**Classification legend**

- **KEEP** — required by verify:strict fusion-cp / sentinel-fdir locks, operator-doctor post-fusion paths, or operator HUD / long-run harness entry used by CI-safe surfaces.
- **CANDIDATE** — inventory-only prune candidate; **do not delete/move** until PO names exact paths.
- **DEFER** — looks unused but adjacent to KEEP or recent ladder work; leave alone.

---

## 3. KEEP set (do not prune) — evidence

### 3.1 Fusion CP (`scripts/lib/fusion-cp-lock.js` `FUSION_CP_REQUIRED_PATHS`)

- `src/core/write-barrier/index.js`
- `src/core/write-barrier/authorize.js`
- `src/core/write-barrier/scope.js`
- `src/core/mcp/mission-loop.js`
- `src/core/mcp/mission-loop-runtime.js`
- `src/core/adversarial/long-run-gameday-harness.js`
- `src/core/observability/mission-os-coherence.js`

(+ companion write-barrier modules `hooks.js` / `paths.js` / `errors.js` / `roots.js` stay with the barrier package)

### 3.2 Sentinel / FDIR (`scripts/lib/sentinel-fdir-lock.js`)

- `src/core/sentinel-daemon.js`
- `src/core/fdir.js`
- `src/core/fdir-ontology.js`
- `src/core/knowledge-ontology.js` (imported by lock smoke)

### 3.3 Operator doctor (`POST_FUSION_CRITICAL_PATHS` + wiring)

- `src/core/sdd/evidence-custody.js`
- `src/core/memory/engram-contract.js`
- `src/core/sdd/evd-seal-path.js`
- `src/core/runtime/operator-doctor.js`
- Doctor also soft-depends on `engine-surface.js` / `purpose-fulfillment.js` — **KEEP** (wiring), not theatrical prune targets.

### 3.4 Operator HUD / verify surfaces

- `src/core/observability/operator-hud.js` (eos:hud / freeze observe / doctor+defense OBSERVED sections)

### 3.5 Recent ladder / fusion glue (KEEP even if not in path lists)

| Path | Why KEEP |
| --- | --- |
| `src/core/mcp/mcp-mission-bridge.js` | P4 mission-local EVD seal surface |
| `src/core/runtime/governed-task-executor.js` | P4 mission-local EVD seal surface |
| `src/core/sdd/tdd-evidence-receipt.js` / organic-routing / schema paths used by verify content audits | verify:strict / custody family |
| `src/core/runtime/sentinel-killswitch.js` / `sentinel-self-remember.js` | Sentinel family adjacency; N6 locked daemon, not inventory prune |
| `src/core/index.js`, `kernel.js`, `harness.js`, `memory.js`, `evidence.js`, `drift.js`, `sandbox.js` | Control-plane roots / historical verify surface |

---

## 4. Ranked prune CANDIDATES (inventory only)

**Candidate count (ranked rows below): 32**

No file below is deleted or moved in P6. Rank = prune ROI if PO later authorizes quarantine (higher = clearer island).

### Tier A — Pilot / one_percent islands (rank 1–8)

| Rank | Path | Why CANDIDATE | Why not KEEP |
| --- | --- | --- | --- |
| 1 | `src/core/pilot/one_percent/mini-bytecode-vm-engine.js` | Pilot island; 0 live consumers outside tests | Not in verify/fusion/sentinel/doctor |
| 2 | `src/core/pilot/one_percent/raft-distributed-consensus-engine.js` | Same | Same |
| 3 | `src/core/pilot/one_percent/lsm-tree-storage-engine.js` | Same | Same |
| 4 | `src/core/pilot/one_percent/virtual-kernel-journaling-fs.js` | Same | Same |
| 5 | `src/core/pilot/one_percent/sre-chaos-slo-engine.js` | Same | Same |
| 6 | `src/core/pilot/one_percent/staff-strategic-rfc-engine.js` | Same | Same |
| 7 | `src/core/pilot/one_percent/memory-profiler-inspector.js` | Same | Same |
| 8 | `src/core/pilot/pilot-kv-store.js` | Pilot helper; 0 live consumers | Same |

### Tier B — Theatrical / pleroma-adjacent runtime (rank 9–22)

Aligned with `docs/mcp/EOS_MCP_DEAD_OR_ORPHAN_REGISTER.json` (~22 simulation tools returning mock SHA receipts). Modules below are primary implementation islands for that theatrical surface — **candidates for future quarantine or simulation-testbed segregation**, not for silent delete.

| Rank | Path | Why CANDIDATE | Evidence |
| --- | --- | --- | --- |
| 9 | `src/core/runtime/eos-transmutator.js` | Theatrical transmute surface | MCP moses.transmute family; not on fusion/sentinel/doctor KEEP |
| 10 | `src/core/runtime/distributed-consciousness.js` | Simulation ontology island | Not on KEEP locks |
| 11 | `src/core/runtime/ephemeral-redundancy.js` | Simulation island | Not on KEEP locks |
| 12 | `src/core/runtime/ontological-dashboard.js` | Simulation dashboard | Not on KEEP locks |
| 13 | `src/core/runtime/self-observation-witness.js` | Theatrical witness hashes | MCP telemetry.stream adjacency |
| 14 | `src/core/runtime/tmr-ontology-engine.js` | Ontological simulation | Not on KEEP locks |
| 15 | `src/core/runtime/trogo-mesh.js` | MCP `eos.net.trogomesh.balance` simulation | Dead/orphan register |
| 16 | `src/core/runtime/tescohan-auditor.js` | MCP `eos.audit.tescohan.telescope` simulation | Dead/orphan register |
| 17 | `src/core/runtime/okidanokh-validator.js` | Kundalini / pleroma validators | Dead/orphan register; more refs than pure islands — still not KEEP |
| 18 | `src/core/runtime/kabbalah-ledger.js` | Theatrical ledger | Not on KEEP locks |
| 19 | `src/core/runtime/heptaparaparshinokh-ledger.js` | Theatrical ledger | Not on KEEP locks |
| 20 | `src/core/runtime/triamazikamno-synthesis.js` / `triamazikamno-validator.js` | Theatrical synthesis pair | Not on KEEP locks |
| 21 | `src/core/runtime/distributed-justice-oracle.js` | Simulation oracle | Not on KEEP locks |
| 22 | `src/core/runtime/joint-operations-command-center.js` / `living-architecture-visualizer.js` / `adversarial-red-team.js` / `ahimsa-filter.js` | Operator-theatre / research HUD-adjacent | Not required by verify/fusion/sentinel/doctor |

### Tier C — Research engines with ~0 outside consumers (rank 23–32)

Selected zero-consumer islands (not exhaustive of every `*-engine.js`). Prefer quarantine-with-tests (ROI2 style) if PO later names paths.

| Rank | Path | Why CANDIDATE |
| --- | --- | --- |
| 23 | `src/core/scraping/high-speed-web-scraping-engine.js` | No verify/fusion/sentinel/doctor requirement; research scrape island |
| 24 | `src/core/benchmark/autonomous-benchmark-harness-engine.js` | Research benchmark; CI uses ROI5 gameday instead |
| 25 | `src/core/orchestration/hypergraph-speculative-engine.js` | Speculative orchestration island |
| 26 | `src/core/orchestration/universal-agentic-extension-orchestrator.js` | Extension orchestrator island |
| 27 | `src/core/economics/token-economics-audit-engine.js` | Economics research island |
| 28 | `src/core/evolution/autonomous-self-reflection-engine.js` | Evolution research island |
| 29 | `src/core/qa/closed-loop-qa-observability-engine.js` | QA research island (HUD/doctor are KEEP) |
| 30 | `src/core/resilience/deterministic-chaos-engine.js` | Chaos research; N6 locks `fdir.js` not this file |
| 31 | `src/core/doctrine/formal-engineering-doctrine-engine.js` | Doctrine research island |
| 32 | `src/core/systems/agentic-systems-thinking-engine.js` | Systems-thinking research island |

### Explicit non-candidates (DEFER / KEEP-adjacent)

| Path | Why NOT a prune candidate now |
| --- | --- |
| `src/core/resilience/fdir-self-healing-engine.js` | Name-adjacent to KEEP `fdir.js`; PO review before any move |
| `src/core/elevate/*` | Wired via `eos:elevate` / `test:elevate` package scripts |
| `src/core/adapters/llm/*` | LLM port/adapters used by intelligence governors |
| `src/core/authority/*` | AuthorityTruthSource family |
| Any path under `archive/quarantine/engine-roi2/` | Already quarantined (ROI2) |

---

## 5. Optional observe recipe (NON-CLAIM)

**Purpose:** Operator-local observe only.
Does **not** assert PRODUCTION_READY, does **not** belong in mandatory CI, does **not** replace `verify:strict`.

### 5.1 Flags (opt-in only)

| Surface | Command | Notes |
| --- | --- | --- |
| Doctor (read-only) | `npm run eos:doctor` | Existence/light checks; `--json` / `--root` / `--help` |
| Doctor JSON | `npm run eos:doctor -- --json` | Machine-readable report; no network/writes |
| HUD observe | `npm run eos:hud` | OBSERVED freeze/doctor/defense + optional VERIFIED verify this-run |
| HUD JSON | `npm run eos:hud -- --json` | Snapshot JSON; `--no-verify` skips verify spawn |
| HUD skip verify | `npm run eos:hud -- --no-verify` | Observe-only; faster local glance |
| GameDay CI-safe | `npm run gameday:long-run` | Default **N=25** (CI) |
| GameDay soak | `npm run gameday:long-run -- --soak` | Opt-in **N=50** (`DEFAULT_OPERATOR_ITERATIONS`) |
| GameDay custom | `npm run gameday:long-run -- --iterations 40 --json` | Opt-in N; `--keep-sandbox` retains sandbox |

### 5.2 Suggested local observe sequence (optional)

```text
npm run eos:doctor -- --json
npm run eos:hud -- --json
npm run gameday:long-run -- --soak --json
```

### 5.3 NON-CLAIMS (soak)

- Soak PASS does not equal PRODUCTION_READY.
- Soak is **not** a required CI job (seam-pack keeps default N; fusion-cp / sentinel locks explicitly avoid soak).
- HUD freeze tip may OBSERVED-DIVERGE until a future tip-refresh mission; informational only.
- Doctor / HUD OBSERVED wiring is not a verify:strict substitute.

---

## 6. Freeze note — Ladder 4 P1–P6

After this branch **merges** to main:

- Ladder 4 ordered work **P1–P6 is complete** (tip refresh, CI seam-pack N-tests, hooks install smoke, mission-local EVD seal, MCP catalog reconcile, complexity prune inventory + optional soak recipe).
- Dictamen remains **COMPLETE_FOR_LOCAL_GOVERNED_USE**.
- **PRODUCTION_READY: NO** (unchanged; explicit non-goal to flip).
- Next work requires a **new** maturity ladder / PO brief — do not silently start Ladder 5 in this branch.

---

## 7. Deliverables in this branch

1. This inventory doc
2. `tests/eos-p6-complexity-prune-inventory.test.js` + `package.json` `test:p6`
3. Freeze + capability matrix light notes for P6 / Ladder 4 close-after-merge
4. Dirty tree **DEFERRED** (untracked DEFER set untouched)
5. Push + compare only; **no merge** without PO

## 8. Verify

```text
npm run test:p6
```

(Optional local observe only — not required for DoD:)

```text
npm run eos:doctor -- --json
npm run gameday:long-run -- --soak --json
```

## 9. Non-claims / freeze follow-through

- No Fundacion mutation (Delta=0).
- No App Fuerza.
- No code quarantine/delete/move without PO-named paths.
- No ROI2 restore.
- No mandatory CI soak.
- No PRODUCTION_READY=YES.
- No merge without PO.
- No Ladder 5 scope in this branch.

