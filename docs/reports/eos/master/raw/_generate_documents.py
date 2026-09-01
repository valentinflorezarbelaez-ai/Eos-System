#!/usr/bin/env python3
"""Render MD/HTML reports from EOS_MASTER_SYSTEM_DATA.json — numbers must match JSON/CSV."""
from __future__ import annotations
import json
from pathlib import Path

OUT = Path("/workspace/docs/reports/eos/master")
D = json.loads((OUT / "EOS_MASTER_SYSTEM_DATA.json").read_text())
inv = D["inventory"]["by_class"]
ext = D["inventory"]["by_ext"]
NOW = D["generated_at_utc"]
RID = D["report_id"]
AID = D["audit_id"]
HEAD = D["git"]["head"]["value"]

def cls(s):
    return f"`{s}`"

def qline(label, obj):
    if isinstance(obj, dict) and "value" in obj and "classification" in obj:
        src = obj.get("source", "")
        ts = obj.get("timestamp_utc", "")
        return f"| {label} | {obj['value']} | {obj['classification']} | `{src}` | {ts} | {obj.get('method','')} |"
    return f"| {label} | {obj} | OBSERVED | — | {NOW} | |"

# ---------------- Markdown master report ----------------
md = []
A = md.append

A(f"""# EOS MASTER SYSTEM REPORT

| Field | Value |
| --- | --- |
| Report ID | `{RID}` |
| Audit ID | `{AID}` |
| Classification contract | Every fact carries an epistemic label. Estimated ≠ measured. Reported ≠ verified. Code existence ≠ operational capability. |
| Mode | `READ_ONLY / SAFE_VERIFICATION` (report artifacts only) |
| Generated (UTC) | {NOW} |
| Repository | https://github.com/valentinflorezarbelaez-ai/Eos- |
| Absolute path on this VM | `/workspace` |
| Started-from branch / HEAD | `main` / `{HEAD}` |
| Artifact branch | `{D['repo']['artifact_branch']}` |
| Verdict (only one letter) | **D — NOT_READY** |

> Footnotes: every quantitative cell cites `docs/reports/eos/master/raw/` or a command in §52. Charts live in `charts/` with provenance captions.

---

## 1. Report metadata

| Item | Value | Class | Source | Timestamp UTC | Method |
| --- | --- | --- | --- | --- | --- |
{qline("OS", D["environment"]["os"])}
{qline("Node", D["environment"]["node"])}
{qline("npm", D["environment"]["npm"])}
{qline("pnpm present on VM", D["environment"]["pnpm_present"])}
{qline("yarn present on VM", D["environment"]["yarn_present"])}
{qline("Python", D["environment"]["python"])}
{qline("git", D["environment"]["git"])}
{qline("Package manager declared", D["environment"]["package_manager_declared"])}
{qline("HEAD", D["git"]["head"])}
{qline("HEAD subject", D["git"]["head_subject"])}
{qline("Commits on HEAD lineage", D["git"]["commit_count"])}
{qline("Tracked files", D["git"]["tracked_files"])}

Working tree at audit start: **clean** on `main` (`git status --porcelain` empty). During generation: untracked `docs/reports/` only. `OBSERVED`.

Chrome present at `/usr/bin/google-chrome` (`MEASURED`) — used only later for optional PDF print of this report.

---

## 2. Epistemic contract and label legend

Labels used in this report (user brief):

`VERIFIED` · `OBSERVED` · `MEASURED` · `REPRODUCED` · `REPORTED` · `INFERRED` · `HYPOTHESIS` · `UNKNOWN` · `NOT_RUN` · `NOT_REPRODUCIBLE` · `BLOCKED` · `CONTRADICTED`

Rules applied:

1. A number without command + timestamp + method is not printed as measured.
2. `verify:strict` passing is **not** test coverage and **not** production readiness.
3. Previous-memory figures (`726/726`, `615/615`) are **not** copied forward. They are in §46 if they differ from this tree.
4. Dashboard states are `VERIFIED` / `STRONG` / `PARTIAL` / `UNKNOWN` / `BLOCKED` / `NOT_READY` (plus `CONTRADICTED` where required). **No completeness percentage is computed.**

---

## 3. Scope, method, non-goals

**In scope:** static/AST-ish import scan, git inspect, filesystem inventory, ESM import of *pure* kernel modules, `verify-eos --strict` (no writes), document-vs-tree comparison.

**Out of scope / NOT_RUN:** `npm test`, `test:lab`, `test:all`, `node bin/eos.js` (constructor `mkdirSync('.missions')`), MCP stdio server, network, `npm install`, mutation of Foundation/CORE/product, coverage, performance profilers, browser product QA (there is no product UI in `Fundacion/`).

**Non-goals:** improving architecture, renaming files, changing dependencies, merging this PR.

---

## 4. Environment of observation

This audit ran on a Linux Cloud Agent VM (`cursor`, kernel 6.12.94+, user `ubuntu`). Windows paths in the registry (`C:\\Users\\valen\\Documents\\Fundacion`) **do not exist** here (`OBSERVED`). `.cursor/mcp.json` points `engram` at `C:\\Users\\valen\\go\\bin\\engram.exe` — not operational on this VM (`OBSERVED`).

---

## 5. Executive dashboard

**No completeness %.** States below are labels, not scores.

| Surface | State | Proof |
| --- | --- | --- |
| File/JSON gate (`verify:strict`) | `VERIFIED` | 471/471, exit 0, 32 ms, 2026-09-01T02:15:34Z |
| Mission OS source (`src/core`) | `STRONG` | 22 files, import of FSM/HITL succeeded |
| Product test suite | `NOT_READY` | `NOT_RUN` |
| Published test-health telemetry | `CONTRADICTED` | 20 / 471 / 472 / 608 / 663 / 777 |
| Production readiness | `NOT_READY` | Dictamen NO + this audit |
| Local-complete freeze paperwork | `PARTIAL` | REPORTED YES on SHA `78b28d6`; HEAD is `{HEAD[:8]}` |
| External MCP “CONNECTED” | `UNKNOWN` | Not observed; Windows binary |
| PRJ-FUNDACION | `NOT_READY` | Empty dir; GAP-002 UNKNOWN |
| CORE freeze as single inode | `UNKNOWN` | `scripts/engine/core` missing |
| Security Step-9 matrix vs tree | `CONTRADICTED` | Target modules absent |
| Dependency surface (npm) | `STRONG` | 0 dependencies; no lockfile needed for builtins |
| Git hygiene at start | `VERIFIED` | Clean `main`, 75 commits, 1 RC tag |

Chart: `charts/dashboard_state_histogram.svg`

---

## 6. One-page system snapshot

EOS in this repository is a **documentation-heavy Node.js control plane** plus a **local Mission OS kernel** under `src/core`, plus a **larger parallel factory** under `scripts/engine`. `package.json` name `eos-system` version `0.3.0`, `type: module`, **20 scripts**, **no `dependencies`**.

Two CLIs exist: `bin/eos.js` → `MissionCLI` / `MissionRuntime`; `scripts/cli/eos.js` → Cursor harness with a **hardcoded fallback** `608 / 608 PASS`.

No `.missions/` directory. No `node_modules/`. `Fundacion/` exists and is empty.

---

## 7. Inventory — filesystem

| Class | Files | Bytes | Class. |
| --- | ---: | ---: | --- |
""")

for k, v in sorted(inv.items(), key=lambda kv: -kv[1]["files"]):
    A(f"| `{k}` | {v['files']} | {v['bytes']} | MEASURED |")

A(f"""
**Total product files (exclude `docs/reports`):** {D['inventory']['product_files_excluding_reports']['value']} files, {D['inventory']['product_bytes']['value']} bytes. `MEASURED` `{D['inventory']['product_files_excluding_reports']['timestamp_utc']}` · `raw/product_baseline_inventory.json`.

`git ls-files | wc -l` = **1048** tracked (`MEASURED`). Difference vs 1046 walk: tracked includes git-only paths / walk skips `.git`; walk may see untracked non-report files. Do not treat as error without a join.

Chart: `charts/inventory_by_class.svg`

---

## 8. Inventory — source vs docs vs tests vs scripts

| Layer | Files | Lines (loc walk) | Class |
| --- | ---: | ---: | --- |
| `src/` | {inv['src']['files']} | {D['loc']['src']['lines']} | MEASURED |
| `scripts/` | {inv['scripts']['files']} | {D['loc']['scripts']['lines']} | MEASURED |
| `tests/` | {inv['tests']['files']} | {D['loc']['tests']['lines']} | MEASURED |
| `docs/` | {inv['docs']['files']} | — (not LOC-scanned as code) | MEASURED |

Docs are **651 / 1046 ≈ 62.2% of file count**. This is a **file-count ratio**, not a quality or completeness score. `INFERRED` arithmetic on MEASURED counts.

Chart: `charts/loc_by_layer.svg`

---

## 9. Inventory — config and governance artifacts

Observed at repo root: `CONSTITUTION.md`, `DEPENDENCY_POLICY_L0.md`, `CLEAN_CLONE.md`, `RC_FILE_MANIFEST.json`, `package.json`, `.cursorrules`, `.gitignore`, `.editorconfig`.

`EOS-MISSION-CONTROL/`: 9 JSON files including `CURRENT_MISSION.json`, `CURRENT_STATE.json`, `BUDGET.json`, `RISK.json`, `ACTIVE_AGENTS.json`, `ACTIVE_TOOLS.json`. `OBSERVED`.

`docs/` contains architecture, audits, evidence, governance, intake, intelligence, knowledge, missions, orchestration, policies, projects, releases, schemas, skills, specs, tools, workflows. `OBSERVED` via directory listing.

---

## 10. Topology

```mermaid
flowchart TB
  subgraph entry [Entrypoints OBSERVED]
    BIN["bin/eos.js"]
    LEG["scripts/cli/eos.js"]
    MCP["src/mcp-server.js"]
    VER["scripts/verify-eos.js"]
  end
  subgraph kernel [Mission OS src/core OBSERVED]
    CLI["MissionCLI"]
    RT["MissionRuntime"]
    ATS["AuthorityTruthSource"]
    FSM["sdd-fsm-engine"]
    HITL["HitlGatekeeper"]
    IG["IntegrationGatekeeper"]
  end
  subgraph legacy [scripts/engine OBSERVED]
    DUP["DUPLICATE: sdd-fsm / hitl / epistemic-evidence"]
    FACT["100+ factory / canary / strategy engines"]
  end
  subgraph stores [Stores]
    DOCS["docs/** 651 files"]
    MC["EOS-MISSION-CONTROL"]
    EV["docs/evidence 84 JSON"]
    MIS[".missions ABSENT"]
    FUN["Fundacion/ EMPTY"]
  end
  BIN --> CLI --> RT --> ATS
  RT --> FSM
  RT --> HITL
  MCP --> RT
  LEG --> FACT
  FACT -.-> DUP
  VER --> DOCS
  RT -.-> MIS
```

Chart: `charts/inventory_by_class.svg` · graph JSON: `EOS_MASTER_DEPENDENCY_GRAPH.json`

---

## 11. Documented architecture

Documents describe (REPORTED, not re-verified as operational):

- An Engineering Operating System / control plane with 21-step pipeline (`.agents/AGENTS.md`, `CONSTITUTION.md`).
- Mission OS local-complete freeze: `COMPLETE_FOR_LOCAL_GOVERNED_USE: YES`, `PRODUCTION_READY: NO` (`docs/releases/*`, `CURRENT_MISSION.json`).
- CORE FROZEN, Fundación Δ=0, GAP-002 UNKNOWN (mission-control + cursorrules).
- A Step-9 security suite remediating `src/core/synthesisEngine.js` and `src/core/executionOrchestrator.js` (`docs/evidence/EOS_STEP_9_SECURITY_MATRIX.json`).
- External MCPs CONNECTED (Engram, Playwright, Context7, Trello, Slack, Jira, Figma, Stitch) in `ACTIVE_TOOLS.json`.
- `scripts/engine/core/**` as `FROZEN_CORE_KERNEL` (`RISK.json`).

---

## 12. Actual architecture (this tree, this VM)

`OBSERVED` / `MEASURED`:

- Kernel that **exists**: `src/core/**` 22 JS files (runtime, ATS, FSM, HITL, integration gate, MCP bridge, tutor, schemas, rules, discovery, supervision, economics).
- Parallel factory that **exists**: `scripts/engine/**` 100+ JS engines including **duplicate basenames** `sdd-fsm-engine.js`, `hitl-gatekeeper.js`, `epistemic-evidence-engine.js`.
- Modules that **do not exist**: `src/core/synthesisEngine.js`, `src/core/executionOrchestrator.js`, `scripts/engine/core/`.
- Runtime store `.missions/` **absent**.
- `Fundacion/` **empty**. Windows Fundación path **absent**.
- npm graph: **no dependencies field, no lockfile, no node_modules**.

---

## 13. Documented vs actual delta

| Documented | Actual on this VM | Label |
| --- | --- | --- |
| main = `78b28d6` (freeze gate) | HEAD = `{HEAD}` | CONTRADICTED |
| tests 20/20 at freeze | Suite not run; static 777 calls | REPORTED vs NOT_RUN |
| test_health 663/663 | Not reproduced | REPORTED |
| verify 472/472 (many audits) | 471/471 this run | CONTRADICTED vs historical |
| CORE at `scripts/engine/core` | Path missing | CONTRADICTED |
| synthesisEngine remediations | File missing | CONTRADICTED |
| MCP CONNECTED | No handshake; Windows engram | CONTRADICTED / NOT_OBSERVED |
| 726/726 or 615/615 | **Zero file hits** | CONTRADICTED (memory vs tree) |
| Fundación product | Empty folder | OBSERVED |

---

## 14. Entrypoints

| Entrypoint | Target | Class | Run this audit |
| --- | --- | --- | --- |
| `bin/eos.js` | `MissionCLI` | OBSERVED | `NOT_RUN` (mkdir `.missions`) |
| `npm run eos:mission` | `node bin/eos.js` | OBSERVED | NOT_RUN |
| `npm run eos` | `scripts/cli/eos.js` | OBSERVED | NOT_RUN |
| `npm run mcp:start` | `src/mcp-server.js` | OBSERVED | NOT_RUN |
| `npm test` | `node --test tests/**` | OBSERVED | NOT_RUN |
| `npm run verify:strict` | `scripts/verify-eos.js --strict` | MEASURED | exit 0, 471 checks |
| `.cursor/mcp.json` `eos-local` | `node src/mcp-server.js` | OBSERVED | NOT_RUN |

`MissionCLI.getHelp()` text (`OBSERVED` by reading source) advertises: create, inspect, plan, package, status, report, verify, pause, resume, close. Subcommands `submit`/`ingest` and `role` exist in code but are omitted from the help banner (`OBSERVED`).

---

## 15. MissionRuntime

File: `src/core/runtime/mission-runtime.js` (`OBSERVED`).

Methods parsed (`raw/mission_runtime_methods.json`): {", ".join(f"`{m}`" for m in D["architecture"]["mission_runtime_methods"])}.

Constructor **creates** `.missions` if missing (`OBSERVED`). Therefore constructing the runtime is a filesystem mutation. This audit did **not** construct it. Operational capability: `UNKNOWN` / `NOT_RUN`.

No mission artifacts on disk: `.missions` absent (`OBSERVED`).

---

## 16. FSM

Imported from `src/core/sdd/sdd-fsm-engine.js` without constructing MissionRuntime (`OBSERVED` / ESM import; see `raw/kernel_exports.json`).

**States ({len(D['architecture']['sdd_states'])}):** {", ".join(D["architecture"]["sdd_states"])}.

**Canonical transitions:** {D["architecture"]["canonical_transitions"]} (`raw/kernel_exports.json`).

HITL-required examples (`OBSERVED` in export): `HUMAN_DIRECTION_GATE` ← `human.approve_direction`; further HITL gates exist on release (`raw/kernel_exports.json`).

A second file `scripts/engine/sdd-fsm-engine.js` exists (`OBSERVED`). Which copy is used depends on importer. Mission OS uses `src/core`. Legacy factory may use `scripts/engine`. This is a dual-source risk (`INFERRED` from path existence).

---

## 17. Authority / HITL

`AuthorityTruthSource` (`src/core/authority/authority-truth-source.js`): comments state it is the sole phase writer via `commitTransition()` (`OBSERVED` as source text, not executed).

`HitlGatekeeper` autonomy modes (`OBSERVED` import): {", ".join(D["architecture"]["autonomy_modes"])}.

Human-only actions (`OBSERVED`): {", ".join(D["architecture"]["human_only_actions"])}.

Runtime exercise: `NOT_RUN`. Therefore “HITL cannot be bypassed” is **not** `VERIFIED` this audit.

---

## 18. Tools / MCP

**Declared in `src/mcp-server.js` (`OBSERVED`, n={D['architecture']['mcp_tools_declared']}):**

| Tool | Side effects | Auth |
| --- | --- | --- |
""")

for t in json.loads((OUT / "raw/mcp_canonical_tools.json").read_text())["tools"]:
    A(f"| `{t['name']}` | {t['sideEffects']} | {t['requiredAuthority']} |")

A(f"""
`.cursor/mcp-status.json` (`REPORTED` 2026-08-21) lists the same wiring and marks `eos.provider.route` / `eos.provider.health` **not_configured**.

`ACTIVE_TOOLS.json` lists 8 third-party MCPs as `CONNECTED` (`REPORTED`). This VM: no live MCP handshake performed (`NOT_RUN`). `engram.exe` Windows path (`OBSERVED`). Treat CONNECTED as **not observed**.

`docs/tools/REGISTRY.json` lists **4** `TOL-MOCK-*` tools only (`OBSERVED`). Mock registry ≠ MCP server.

Default MCP env in `.cursor/mcp.json`: `EOS_MODE=read-write`, `EOS_AUTONOMY_LEVEL=LEVEL_1` (`OBSERVED`). Server source defaults `EOS_MODE` to `read-only` if unset (`OBSERVED`). Configured Cursor mode is **less tight** than source default (`INFERRED`).

---

## 19. Governance matrix

| Control | Artifact | Class | Note |
| --- | --- | --- | --- |
| Constitution | `CONSTITUTION.md`, `docs/core/CONSTITUTION.md` | OBSERVED | Evidence-over-claims articles |
| Mission freeze dictamen | `CURRENT_MISSION.json` | REPORTED | PRODUCTION_READY NO; local-complete YES |
| Write barrier | `RISK.json`, AGENTS.md | REPORTED | Fundación Windows path; canary write allow |
| Dependency policy | `DEPENDENCY_POLICY_L0.md` | REPORTED | NODE_BUILTINS_ONLY |
| verify:strict | executed | MEASURED | file/JSON gate |
| ATS/HITL/IG | source | OBSERVED | not executed |
| GATE-13 | various audits | REPORTED | not independently re-derived |

Autonomy advertised in `CURRENT_STATE.json`: `LEVEL_2_SUPERVISED_AUTONOMY` (`REPORTED`). This process did not assume that grant for product mutation.

---

## 20. Security matrix

`docs/evidence/EOS_STEP_9_SECURITY_MATRIX.json` (`REPORTED` 2026-08-11) claims 16/16 attacks blocked against `src/core/synthesisEngine.js` and `src/core/executionOrchestrator.js`.

Those files: **absent** (`OBSERVED`, `raw/claimed_path_existence.json`).

Therefore the matrix is **not applicable to the current kernel**. Classification: `CONTRADICTED` as a description of *this* tree.

`IntegrationGatekeeper` contains SSRF host denylist and secret regexes (`OBSERVED` source). Not dynamically tested (`NOT_RUN`).

Secrets heuristic: **10 files** matched generic `api_key/secret/token/password = '...'` (`OBSERVED`, values not stored). Likely fixtures. Not a professional scanner. See `raw/secrets_heuristic.json`.

---

## 21. Bypass register

| ID | Surface | Class | Note |
| --- | --- | --- | --- |
| BYP-01 | Dual kernel copies | OBSERVED | Importers of `scripts/engine/hitl-gatekeeper.js` may not share ATS |
| BYP-02 | `MissionRuntime` constructor mkdir | OBSERVED | Help/status construction mutates disk |
| BYP-03 | `.cursor/mcp.json` read-write LEVEL_1 | OBSERVED | Looser than source default read-only |
| BYP-04 | `allowLocalDirectorReceipt` default true | OBSERVED | Local fixture HITL receipts (documented in capability matrix) |
| BYP-05 | Legacy `npm run eos` harness | OBSERVED | Not Mission OS; hardcoded 608/608 fallback |
| BYP-06 | Direct `pkg.phase` writes | UNKNOWN | ATS comments forbid it; no runtime proof this audit |
| BYP-07 | External MCP with filesystem write (Engram catalog) | REPORTED | `NORMALIZED_MCP_CATALOG.json` write_access true |

No bypass *exploit* was developed or run. This is a **register of surfaces**, not a penetration test.

---

## 22. Evidence system

`docs/evidence/` contains **{D['evidence_store']['json_files']['value']}** JSON files (`MEASURED`). Schema file present. Contents are **historical REPORTED** receipts unless re-executed.

This audit’s *new* evidence is only under `docs/reports/eos/master/raw/`.

`CURRENT_STATE.last_telemetry_hash` = `41e9b257…` (`REPORTED` 2026-08-15). Not recomputed (`NOT_RUN`).

---

## 23. Testing inventory (count ≠ coverage)

| Metric | Value | Class |
| --- | ---: | --- |
| `*.test.js` / `*.test.ts` files | {D['testing']['static_test_like_files']['value']} | MEASURED |
| `tests/**/*.test.js` | {D['testing']['tests_dir_test_js']['value']} | MEASURED |
| EOS-Lab `*.test.ts` | {D['testing']['eos_lab_test_ts']['value']} | MEASURED |
| Static `test(` + `it(` calls | {D['testing']['static_test_or_it_calls']['value']} | MEASURED |
| Test files mentioning write APIs | {D['testing']['files_mentioning_write_apis']['value']} | MEASURED |
| Coverage % | — | NOT_RUN |
| Executed passing tests this audit | — | NOT_RUN |

`npm test` glob: `tests/*.test.js tests/**/*.test.js`. `test:lab` needs `npx tsx` and missing `node_modules` (`OBSERVED`).

**Count is not coverage. Inventory is not execution.**

---

## 24. Testing execution results

| Suite | Result | Exit | Duration | Class |
| --- | --- | --- | --- | --- |
| `node scripts/verify-eos.js --strict --json` | PASS 471 checks | 0 | 32 ms | MEASURED |
| `node scripts/verify-eos.js --strict` | PASS 471 | 0 | 29 ms | MEASURED |
| `npm test` | — | — | — | NOT_RUN |
| Freeze 4-file suite (historical 20/20) | — | — | — | NOT_RUN |
| `test:lab` / `test:all` | — | — | — | NOT_RUN |

Rationale for NOT_RUN: user brief — run tests only if clearly non-mutating. 10 test files mention write APIs; many engines persist `docs/evidence`; MissionRuntime writes `.missions`.

---

## 25. V&V

| Activity | Status |
| --- | --- |
| Static inventory + import graph | MEASURED |
| Pure-module ESM import (FSM/HITL/IG) | OBSERVED |
| verify:strict | MEASURED |
| Unit/integration tests | NOT_RUN |
| Independent second-party replay of freeze suite | NOT_RUN |
| Runtime V&V of a mission | NOT_RUN |
| Production monitoring | NOT_OBSERVED |

`verify:strict` composition (`MEASURED`): existence 276, json-validity 187, frontmatter 8. Chart: `charts/verify_strict_breakdown.svg`.

Historical audits claiming **472/472** (`REPORTED` in multiple `docs/audits/*`) **do not match** this run’s **471**. Classification: `CONTRADICTED` (historical vs current). Cause not bisected (`UNKNOWN`).

---

## 26. Reproducibility pipeline

| Element | Status |
| --- | --- |
| Clean-clone markdown | `CLEAN_CLONE.md` OBSERVED |
| Lockfile | ABSENT — consistent with L0 builtins `REPORTED`/`OBSERVED` |
| Node builtins-only core | OBSERVED for `src/` imports (`node:*`) |
| EOS-Lab external specs (`hono`, `astro`, `zod`, `vitest`) | OBSERVED in import graph; **not installed** |
| RC manifest | `RC_FILE_MANIFEST.json` REPORTED file_count 42 for a packaging subset |
| This audit | Raw traces in `raw/` allow re-count of every printed number |

Full product reproducibility including EOS-Lab: `BLOCKED` without installs (forbidden this mission).

---

## 27. Git health

| Metric | Value | Class |
| --- | --- | --- |
| Commits | 75 | MEASURED |
| First commit | 8c52375 · 2026-08-10T17:12:58-05:00 | MEASURED |
| Authors on HEAD | Valentin Florez 75 | MEASURED |
| `--all` shortlog extra | Cursor Agent 171 (other refs) | OBSERVED |
| Tags | `rc/eos-mission-os-local-complete-2026-08-21` | MEASURED |
| Remote | github.com/valentinflorezarbelaez-ai/Eos- | OBSERVED |
| Start dirty files | 0 | MEASURED |

Commits by date: 2026-08-10:32, 08-11:14, 08-15:15, 08-19:4, 08-21:10. Chart: `charts/git_commits_by_date.svg`.

Eleven calendar days of history. High documentation volume relative to time (`INFERRED`).

---

## 28. Code health

- `src` 22 files / 6323 lines / 40 fn-like regex hits (`MEASURED`; **not** cyclomatic).
- `scripts` 107 files / 15978 lines / 179 fn-like.
- Scripts are **~2.5× lines of src**. Dual-plane maintenance cost `INFERRED`.
- Lint / typecheck / mutation testing: `NOT_RUN` (no eslint config observed in root listing; no TS on kernel).
- Duplicate kernel basenames: **3** (`MEASURED`).

---

## 29. Dependency health

`package.json` has **no** `dependencies` or `devDependencies` (`OBSERVED`).

Import-graph package specs (`MEASURED`): Node builtins dominate (`node:fs` 143, `node:path` 143, `node:test` 131, `node:assert` 132). Non-node names seen in tree: `hono`, `@hono/node-server`, `zod`, `vitest`, `astro` — **EOS-Lab / fixtures**. Those packages are **not installed** (`node_modules` absent). Import spec ≠ runnable dependency.

---

## 30. Agents

Two catalogs (`OBSERVED`):

1. `docs/agents/REGISTRY.json` — **16** agents (Product … Governance Auditor). Updated 2026-08-10. `REPORTED` roles.
2. `EOS-MISSION-CONTROL/ACTIVE_AGENTS.json` — **7** agents (Executive, Researcher, Architect, Implementer, Tester, Auditor, Redteam), statuses IDLE/STANDBY. `REPORTED`.

No agent processes were observed running (`NOT_OBSERVED`). Skills exist under `.agents/skills/` (8 SKILL.md files in verify frontmatter set).

---

## 31. Knowledge plane

`docs/knowledge/`, `docs/intelligence/`, research RSC-0001… files exist and `verify:strict` JSON-validated many of them (`MEASURED` as files). Claims inside research JSON remain `REPORTED`. No knowledge-query engine was executed (`NOT_RUN`).

---

## 32. Ops maturity

Mission-control JSON looks like an ops console but is **static files**. `system_status: ONLINE` is `REPORTED` (2026-08-15), not a probed service.

`BUDGET.json` current_usage tokens 45200 / $0.32 / 32100 ms: **REPORTED**, not reproduced. Do not use as measured cost.

Incidents file exists (`EOS-MISSION-CONTROL/INCIDENTS.json`) — not treated as live IR.

---

## 33. Performance

**No runtime performance was measured.** Core Web Vitals, LCP, CLI latency (except verify 32 ms), MCP RTT: `NOT_RUN`.

The 32 ms / 29 ms figures apply **only** to `verify-eos.js`, a filesystem walker.

`BUDGET.json` times are `REPORTED`.

This section intentionally has **no invented SLOs**.

---

## 34. Complexity

| Signal | Value | Class | Caveat |
| --- | ---: | --- | --- |
| Import edges | {D['imports']['edges']['value']} | MEASURED | regex, may miss |
| JS/TS scanned | {D['imports']['js_ts_files_scanned']['value']} | MEASURED | |
| src fn-like | {D['loc']['src']['fn_like']} | MEASURED | not cyclomatic |
| scripts fn-like | {D['loc']['scripts']['fn_like']} | MEASURED | not cyclomatic |
| Duplicate kernel files | 3 | MEASURED | |

No McCabe/tooling run (`NOT_RUN`).

---

## 35. Fitness functions

The closest executed fitness function is `verify-eos --strict`: **file presence + JSON parse + skill frontmatter**. It does **not** evaluate missions, security, or user value.

`package.json` also advertises `evaluate:self`, `evaluate:release`, `audit:system`, `prove:factory` — **NOT_RUN** (likely write telemetry).

---

## 36. Projects

`docs/projects/registry.json` lists **{D['projects']['registry_count']}** projects (`OBSERVED`): {", ".join(D["projects"]["ids"])}.

| ID | Registry path | On this VM |
| --- | --- | --- |
| PRJ-EOS-CONTROL-PLANE | Windows Eos system | `/workspace` is a clone, not that path |
| PRJ-FUNDACION | `C:\\Users\\valen\\Documents\\Fundacion` | missing; `Fundacion/` empty |
| PRJ-LUXE-REGISTRY | Windows Luxe-Registry | in-repo `Luxe-Registry/` 4 files |
| PRJ-MULTIMODAL-CREATIVE | Windows suite | in-repo 4 files |
| PRJ-RESEARCH-INTEL | Windows path | not present as tree |
| PRJ-CANARY-ALPHA | Windows EOS-Lab path | `EOS-Lab/Canary-Alpha` exists (64 lab files total across EOS-Lab) |

Registry `business_status` `PRODUCTION_READY_WITHIN_TESTED_SCOPE` for Luxe/Multimodal is **REPORTED** (2026-08-11) and is **not** this audit’s verdict.

---

## 37. Historical trajectory

MEASURED commit histogram shows a burst 10–21 Aug 2026 (75 commits). Tag RC 2026-08-21. HEAD after merge adds MCP wiring (`feat(mcp): wire MissionRuntime…`).

Freeze paperwork was **not updated** to the MCP commit (`CONTRADICTED` SHA).

---

## 38. Risk register (P0–P3)

See `EOS_MASTER_RISK_REGISTER.json`. Summary:

""")

for r in D["risks"]:
    A(f"- **{r['id']} [{r['sev']}]** {r['title']} — `{r['class']}` — {r['source']}")

A("""
Chart: `charts/risk_severity_counts.svg`

---

## 39. Do-not-build register

""")

for x in D["do_not_build"]:
    A(f"- **{x['item']}** — {x['reason']} (`{x['class']}`)")

A(f"""

---

## 40. Capability matrix

Rule: **code existence ≠ operational capability.** Full table: `EOS_MASTER_CAPABILITY_MATRIX.json`.

| ID | Name | Code/doc status | Operational |
| --- | --- | --- | --- |
""")

for c in D["capabilities"]:
    A(f"| {c['id']} | {c['name']} | {c['status']} | {c['operational']} |")

A("""
Chart: `charts/capability_operational.svg`

---

## 41. Readiness assessment

| Question | State |
| --- | --- |
| Ready for production users? | `NOT_READY` |
| Ready for unattended autonomy? | `NOT_READY` |
| Ready as a local file/JSON governed workspace? | `PARTIAL` (verifier works; runtime unproven this audit) |
| Ready to mutate Fundación? | `NOT_READY` / `BLOCKED` |
| Ready to claim local-complete on *this* HEAD? | `UNKNOWN` (paperwork is for another SHA; tests NOT_RUN) |

---

## 42. Radar — Graph 29

Ordinal mapping used **only for `charts/radar_graph_29_ordinal.svg`**: VERIFIED/MEASURED=5, STRONG/OBSERVED=4, PARTIAL=3, REPORTED=2, UNKNOWN/BLOCKED/NOT_RUN=1, NOT_READY/CONTRADICTED=0.

**This mapping is not a KPI and must not be averaged into a fake %.**

| # | Dimension | State | Note |
| --- | --- | --- | --- |
""")

for i, row in enumerate(D["radar29"], 1):
    A(f"| {i} | {row['dimension']} | `{row['state']}` | {row['note']} |")

A(f"""

---

## 43. Verdict

# D — NOT_READY

**Only allowed letters:** A/B/C/D/E. Selected: **D**.

**Proof (conjunctive):**

1. Production dictamen is NO (`REPORTED`, consistent) and this audit found no measured basis to upgrade it.
2. Product tests were `NOT_RUN`; therefore no `REPRODUCED` functional baseline on `{HEAD[:8]}`.
3. Live “health” numbers are `CONTRADICTED` across artifacts (§46).
4. Security matrix and CORE-freeze path do not match the tree (`CONTRADICTED`).
5. `verify:strict` **does** pass (471/471 `MEASURED`) — this prevents an **E** (total collapse) but is a file/JSON gate, not an operating system in production.

**Why not C:** C would require a reproduced local runtime or freeze suite on this HEAD. We do not have it.

**Why not E:** Kernel source exists; verifier passes; git is intact; L0 dependency surface is clean.

---

## 44. Most important numbers

| Number | Meaning | Class | Source |
| ---: | --- | --- | --- |
| 471 | verify:strict checks passed | MEASURED | raw/cmd_verify_strict.* |
| 0 | verify:strict failures | MEASURED | same |
| 32 | verify:strict duration ms | MEASURED | meta |
| 777 | static test()/it() calls | MEASURED | test_static_inventory |
| 132 | test-like files | MEASURED | same |
| 1046 | product files excl. this report | MEASURED | product_baseline_inventory |
| 651 | docs files | MEASURED | same |
| 22 | src files | MEASURED | same |
| 6323 | src lines | MEASURED | loc_inventory |
| 15978 | scripts lines | MEASURED | loc_inventory |
| 75 | commits | MEASURED | git rev-list |
| 20 | MCP tools declared | OBSERVED | mcp_canonical_tools |
| 3 | duplicate kernel basenames | MEASURED | duplicate_module_basenames |
| 84 | docs/evidence JSON files | MEASURED | evidence_files |
| 0 | npm dependencies | OBSERVED | package.json |
| 0 | `.missions` present | OBSERVED | ls |
| 0 | Fundacion child files | OBSERVED | ls |
| 0 | hits for string `726/726` | MEASURED | claim_string_hits |
| D | verdict | INFERRED | §43 |

---

## 45. Provenance

Canonical machine dataset: `EOS_MASTER_SYSTEM_DATA.json`.

Spreadsheets: `EOS_MASTER_SYSTEM_METRICS.csv` (44 rows; must match this markdown).

Graphs: `EOS_MASTER_DEPENDENCY_GRAPH.json`.

Index: `EOS_MASTER_EVIDENCE_INDEX.json`.

Raw traces: `raw/` (see §53).

---

## 46. Contradiction register

| ID | Claim A | Claim B / observation | Label |
| --- | --- | --- | --- |
| CX-01 | CURRENT_STATE `663 / 663 PASS` | No test run; static 777 calls; freeze 20/20 | CONTRADICTED |
| CX-02 | `scripts/cli/eos.js` fallback `608 / 608 PASS` | Same as CX-01 | CONTRADICTED |
| CX-03 | Many audits `472/472` verify:strict | This run **471/471** | CONTRADICTED |
| CX-04 | Freeze `main = 78b28d6` | HEAD `24b6968` | CONTRADICTED |
| CX-05 | Step-9 remediations on synthesisEngine / executionOrchestrator | Files absent | CONTRADICTED |
| CX-06 | RISK.json `scripts/engine/core` FROZEN | Directory absent | CONTRADICTED |
| CX-07 | ACTIVE_TOOLS MCP CONNECTED | Not observed; Windows engram | CONTRADICTED |
| CX-08 | Previous memory `726/726` tests | **0** hits in tree | CONTRADICTED |
| CX-09 | Previous memory / greeting `615/615` | **0** hits as live metric | CONTRADICTED |
| CX-10 | CURRENT_MISSION tests `20/20` at merge | HEAD moved; suite NOT_RUN | CONTRADICTED as *current* fact |
| CX-11 | CORE FROZEN | HEAD includes post-freeze MCP wiring in `src/` | CONTRADICTED if freeze means Δ=0 on src/core |
| CX-12 | `PRODUCTION_READY` inside EVD-0033/34 | System dictamen PRODUCTION_READY NO | CONTRADICTED if read as global |

`PRODUCTION_READY=NO` as a *system* dictamen is **not** contradicted — it is **consistent** and this audit agrees.

`CORE frozen` as a *policy slogan* is contradicted by (a) missing freeze path, (b) HEAD ≠ freeze SHA, (c) `src/core` is the real kernel and changed after freeze docs.

---

## 47. Unknown register

| ID | Unknown | Why |
| --- | --- | --- |
| U-01 | Pass/fail of `npm test` on this HEAD | NOT_RUN |
| U-02 | Pass/fail of freeze 20-test suite on `24b6968` | NOT_RUN |
| U-03 | Coverage | NOT_RUN |
| U-04 | Whether ATS `commitTransition` is the sole writer at runtime | NOT_RUN |
| U-05 | Live MCP handshake results | NOT_RUN |
| U-06 | GAP-002 official legal/banking facts | BLOCKED / UNKNOWN (by policy) |
| U-07 | Cause of 472 vs 471 verify drift | NOT_RUN (no bisect) |
| U-08 | Meaning of `last_telemetry_hash` | NOT_RUN |
| U-09 | Whether BUDGET.json numbers were ever measured | UNKNOWN |
| U-10 | EOS-Lab sqlite DB integrity | NOT_RUN |
| U-11 | Cyclomatic complexity | NOT_RUN |
| U-12 | Production/network behavior | BLOCKED / NOT_OBSERVED |

---

## 48. Top 20 findings

| ID | Pol | Title | Class |
| --- | --- | --- | --- |
""")

for f in D["findings"]:
    A(f"| {f['id']} | {f['polarity']} | {f['title']} | `{f['class']}` |")

A("""
Chart: `charts/findings_polarity.svg`

---

## 49. Top 20 recommendations (tied to findings)

| ID | Tied to | Recommendation |
| --- | --- | --- |
""")

for r in D["recommendations"]:
    A(f"| {r['id']} | {r['finding']} | {r['title']} |")

A(f"""

These are **recommendations**, not completed work. This mission forbids product refactors.

---

## 50. Fifteen executive questions

| # | Question | Answer | Class | Proof |
| --- | --- | --- | --- | --- |
""")

for q in D["executive_questions"]:
    A(f"| {q['n']} | {q['q']} | **{q['a']}** | {q['class']} | {q['proof']} |")

A(f"""

---

## 51. Ultimate question

**{D['ultimate']['question']}**

### Answer: {D['ultimate']['answer']}

Qualifier: {D['ultimate']['qualifier']}

Classification: `{D['ultimate']['class']}`

Proof:

""")

for p in D["ultimate"]["proof"]:
    A(f"- {p}")

A("""

---

## 52. Command ledger

| Command | Started UTC | Exit | ms | Result | Mutating |
| --- | --- | --- | --- | --- | --- |
""")

for c in D["commands"]:
    A(f"| `{c['command'][:80]}{'…' if len(c['command'])>80 else ''}` | {c.get('started_utc')} | {c.get('exit_code')} | {c.get('duration_ms')} | {c['result']} | {c.get('mutating')} |")

A("""

Full command text is in `EOS_MASTER_SYSTEM_DATA.json` → `commands`.

---

## 53. Appendices / evidence index

See `EOS_MASTER_EVIDENCE_INDEX.json`.

Primary raw traces:

- `raw/product_baseline_inventory.json` — file counts
- `raw/test_static_inventory.json` — 777 calls
- `raw/cmd_verify_strict.stdout.json` — 471 checks
- `raw/cmd_verify_strict.meta.txt` — exit/duration
- `raw/loc_inventory.json` — LOC
- `raw/import_graph.json` — 1135 edges
- `raw/kernel_exports.json` — FSM import
- `raw/git_commands.json` — git
- `raw/claim_string_hits.json` — contradiction search
- `raw/claimed_path_existence.json` — missing modules
- `raw/mcp_canonical_tools.json` — 20 tools
- `raw/secrets_heuristic.json` — 10 files
- `raw/evidence_files.json` — 84 JSON

Charts (independent files, each with caption):

""")

for p in sorted((OUT / "charts").glob("*.svg")):
    A(f"- `charts/{p.name}`")

A("""

---

*End of EOS Master System Report. No completeness percentage was computed. Verdict D stands unless a later MEASURED replay falsifies the NOT_RUN gaps without dissolving the contradictions.*
""")

(OUT / "EOS_MASTER_SYSTEM_REPORT.md").write_text("\n".join(md) + "\n")

# ---------------- Executive atlas ----------------
atlas = f"""# EOS MASTER EXECUTIVE ATLAS

**Board version** · Report `{RID}` · Audit `{AID}` · Generated `{NOW}`  
**Repository:** https://github.com/valentinflorezarbelaez-ai/Eos-  
**VM path:** `/workspace` · **HEAD at start:** `{HEAD}`  
**Verdict: D — NOT_READY** · Production ready: **NO** · Local-complete on this HEAD: **UNKNOWN**

This atlas is the 20–30 page board cut of the master report. It does not add metrics. Every figure is in `EOS_MASTER_SYSTEM_DATA.json` / `EOS_MASTER_SYSTEM_METRICS.csv`.

---

## A. What this is

EOS is a GitHub-hosted Node.js “Engineering Operating System”: governance documents, a local Mission OS kernel (`src/core`), a larger legacy/lab factory (`scripts/engine`), tests, and mission-control JSON. It is **not** a running production SaaS in this environment.

This audit was **read-only** except for writing these report files.

---

## B. Dashboard (no %)

| Surface | State |
| --- | --- |
| File/JSON verifier | VERIFIED (471/471) |
| Mission OS source | STRONG (exists) |
| Tests executed | NOT_READY (NOT_RUN) |
| Health telemetry | CONTRADICTED |
| Production | NOT_READY |
| Fundación product | NOT_READY (empty) |
| Third-party MCP live | UNKNOWN |
| npm supply chain | STRONG (zero deps) |

![Dashboard histogram](charts/dashboard_state_histogram.svg)

---

## C. The only verdict

**D — NOT_READY.**

Not C: freeze suite and MissionRuntime were not reproduced on this HEAD.  
Not E: kernel source exists; verifier passed; git intact.

**Ultimate board question:** treat EOS as an operational production autonomous system today? **NO.**

---

## D. Numbers a director may quote (and no others)

| Quote | Do not say |
| --- | --- |
| verify:strict **471/471 PASS**, 32 ms, 2026-09-01T02:15:34Z | “472 tests” / “full suite green” |
| **777** static `test()`/`it()` calls in **132** files | “777 tests passed” |
| **1046** product files, **651** docs | “62% complete” |
| **22** src files, **6323** lines; scripts **15978** lines | “scripts are the product” without dual-plane caveat |
| **75** commits, **1** RC tag, HEAD `24b6968` | “main is still 78b28d6” |
| **0** npm dependencies | “no code dependencies anywhere” (Lab imports hono/astro) |
| **0** hits for `726/726` and `615/615` | those historical memory numbers |

![Test health contradictions](charts/test_health_contradictions.svg)

---

## E. Architecture in one picture

Two planes:

1. **Mission OS** — `bin/eos.js` → `MissionRuntime` → ATS / FSM / HITL / Integration gate / MCP bridge.
2. **Legacy factory** — `scripts/cli/eos.js` + 100+ engines, including **three duplicate kernel filenames**.

Documented modules `synthesisEngine.js` / `executionOrchestrator.js` / `scripts/engine/core` **are not in the tree**.

![Inventory](charts/inventory_by_class.svg)

---

## F. Control and authority

HITL human-only actions are explicit in source (direction/release gates, production release, credentials, constitution exceptions). That is **OBSERVED text**, not a runtime proof.

`.cursor/mcp.json` sets `EOS_MODE=read-write` LEVEL_1 — looser than the server’s default `read-only`.

MissionRuntime **mkdir `.missions` in the constructor** — even help is not a pure read. Help was therefore NOT_RUN.

---

## G. Security and bypass (board-level)

- Step-9 security matrix remediates **files that do not exist** → do not cite 16/16 attacks as current.
- MCP “CONNECTED” in mission-control is **not observed** here.
- Heuristic secret-like assignments in 10 test/engine files — review, do not panic, do not ignore.
- Bypass register is a surface list, not a red-team report.

---

## H. Projects and money

Six registry projects; Fundación empty; GAP-002 still UNKNOWN (do not infer NIT/banking).  
`BUDGET.json` $0.32 / 45200 tokens: **REPORTED**, not measured. Do not use in finance discussions.

---

## I. Risks (P0 first)

"""

for r in D["risks"]:
    if r["sev"] in ("P0", "P1"):
        atlas += f"- **{r['id']} {r['sev']}:** {r['title']}\n"

atlas += """
![Risks](charts/risk_severity_counts.svg)

---

## J. Do not build / do not say

"""

for x in D["do_not_build"]:
    atlas += f"- {x['item']} — {x['reason']}\n"

atlas += """
---

## K. Graph 29 (ordinal visual only)

![Graph 29](charts/radar_graph_29_ordinal.svg)

Do not average the 0–5 ordinals. They exist so a board packet can *see* imbalance (testing/security/docs drift vs git/deps).

---

## L. Fifteen questions (answers only)

"""

for q in D["executive_questions"]:
    atlas += f"{q['n']}. {q['q']} — **{q['a']}**\n"

atlas += f"""
---

## M. What to do next (recommendations, not work done)

1. Stop publishing 663/608/472/20 as *current* without a new MEASURED run (REC01).
2. Quarantine Step-9 matrix as historical (REC03).
3. Update or supersede freeze docs for HEAD `{HEAD[:8]}` (REC04).
4. Replay the 4-file freeze suite in a **tmp** workdir and seal the log (REC07).
5. Declare `src/core` the only kernel; mark `scripts/engine` duplicates deprecated (REC08).
6. Keep PRODUCTION_READY=NO (REC18).
7. Keep GAP-002 UNKNOWN (REC12).

---

## N. Findings polarity

![Findings](charts/findings_polarity.svg)

Positive: verifier works; kernel source exists; zero npm deps; PRODUCTION_READY=NO is honest at system level.  
Negative: contradictory health, missing security targets, stale freeze SHA, dual kernel, empty Fundación, MCP over-claim.

---

## O. Capability operational field

![Capabilities](charts/capability_operational.svg)

Most capabilities are **NOT_RUN** or **UNKNOWN**. Only the file/JSON gate is `MEASURED`.

---

## P. Lines of code (not quality)

![LOC](charts/loc_by_layer.svg)

---

## Q. Git burst

![Git](charts/git_commits_by_date.svg)

75 commits in 11 days (10–21 Aug 2026). Fast document+code accretion. Drift risk is structural.

---

## R. verify:strict composition

![Verify](charts/verify_strict_breakdown.svg)

276 existence + 187 JSON + 8 frontmatter = 471. This is a **workspace integrity linter**, not a product test.

---

## S. How to read this packet in 10 minutes

1. Verdict D (§C).  
2. Numbers table (§D) — refuse any other headline figure.  
3. Contradictions (master report §46).  
4. P0/P1 risks (§I).  
5. Ultimate NO (§C / master §51).

---

## T. Authority of this atlas

Prepared by a Cloud Agent under read-only constraints. It **cannot** certify production. It **can** certify that, on this VM, at these timestamps, the listed commands produced the listed outputs.

Full narrative: `EOS_MASTER_SYSTEM_REPORT.md` (53 sections).

---

*End of Executive Atlas.*
"""

(OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").write_text(atlas)

# ---------------- HTML (print-ready) ----------------
CSS = """
@page { size: A4; margin: 18mm 16mm; }
:root { --ink:#1c1b18; --muted:#5c584e; --rule:#c9c4b8; --paper:#f7f5f0; --card:#fffdf8; --neg:#6b3a32; --pos:#3d4a3a; }
html { background: var(--paper); }
body { font-family: "Source Serif 4", "Georgia", serif; color: var(--ink); background: var(--paper); margin: 0 auto; max-width: 880px; padding: 32px 28px 80px; line-height: 1.45; font-size: 13.5px; }
h1 { font-size: 26px; letter-spacing: -0.02em; border-bottom: 2px solid var(--ink); padding-bottom: 8px; }
h2 { font-size: 18px; margin-top: 2.2em; border-top: 1px solid var(--rule); padding-top: 0.8em; page-break-after: avoid; }
h3 { font-size: 15px; }
p, li { font-size: 13.5px; }
table { border-collapse: collapse; width: 100%; font-size: 11.5px; margin: 0.8em 0 1.2em; page-break-inside: avoid; }
th, td { border: 1px solid var(--rule); padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #ece8df; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-weight: 600; }
code, pre { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 11px; }
pre { background: var(--card); border: 1px solid var(--rule); padding: 10px; overflow: auto; }
.banner { background: var(--card); border: 1px solid var(--ink); padding: 12px 16px; margin: 16px 0 28px; }
.banner strong { font-size: 18px; }
.meta { color: var(--muted); font-family: "IBM Plex Sans", sans-serif; font-size: 12px; }
img.chart { max-width: 100%; height: auto; border: 1px solid var(--rule); background: #fff; margin: 8px 0 16px; }
footer { color: var(--muted); font-size: 11px; margin-top: 48px; }
"""


def md_to_html_simple(title, body_md):
    """Minimal markdown-to-HTML for this packet (tables, headings, lists, images, code)."""
    import html as htmlmod
    import re
    lines = body_md.splitlines()
    out = [f"<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><title>{htmlmod.escape(title)}</title><style>{CSS}</style></head><body>"]
    i = 0
    in_table = False
    in_ul = False
    in_pre = False
    pre_buf = []

    def close_lists():
        nonlocal in_ul
        if in_ul:
            out.append("</ul>")
            in_ul = False

    def close_table():
        nonlocal in_table
        if in_table:
            out.append("</table>")
            in_table = False

    def inline(s):
        s = htmlmod.escape(s)
        s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
        s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", r'<img class="chart" alt="\1" src="\2"/>', s)
        s = re.sub(r"(?<!\")\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
        return s

    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            if not in_pre:
                close_lists(); close_table()
                in_pre = True
                pre_buf = []
            else:
                out.append("<pre>" + htmlmod.escape("\n".join(pre_buf)) + "</pre>")
                in_pre = False
            i += 1
            continue
        if in_pre:
            pre_buf.append(line)
            i += 1
            continue
        if line.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].replace("|", "").replace(":", "").replace("-", "").strip()) == set():
            close_lists()
            close_table()
            out.append("<table>")
            cells = [c.strip() for c in line.strip("|").split("|")]
            out.append("<tr>" + "".join(f"<th>{inline(c)}</th>" for c in cells) + "</tr>")
            i += 2
            in_table = True
            continue
        if in_table:
            if line.startswith("|"):
                cells = [c.strip() for c in line.strip("|").split("|")]
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in cells) + "</tr>")
                i += 1
                continue
            else:
                close_table()
        if line.startswith("# "):
            close_lists(); out.append(f"<h1>{inline(line[2:])}</h1>")
        elif line.startswith("## "):
            close_lists(); out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("### "):
            close_lists(); out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("> "):
            close_lists(); out.append(f"<p class='meta'>{inline(line[2:])}</p>")
        elif line.startswith("- "):
            if not in_ul:
                out.append("<ul>"); in_ul = True
            out.append(f"<li>{inline(line[2:])}</li>")
        elif re.match(r"^\d+\.\s", line):
            close_lists()
            out.append(f"<p>{inline(line)}</p>")
        elif line.strip() == "---":
            close_lists(); out.append("<hr/>")
        elif line.strip() == "":
            close_lists()
        else:
            close_lists()
            out.append(f"<p>{inline(line)}</p>")
        i += 1
    close_lists(); close_table()
    out.append(f"<footer>Print-ready HTML · {RID} · {NOW} · Verdict D NOT_READY</footer></body></html>")
    return "\n".join(out)


report_md = (OUT / "EOS_MASTER_SYSTEM_REPORT.md").read_text()
atlas_md = (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").read_text()
(OUT / "EOS_MASTER_SYSTEM_REPORT.html").write_text(md_to_html_simple("EOS Master System Report", report_md))
(OUT / "EOS_MASTER_EXECUTIVE_ATLAS.html").write_text(md_to_html_simple("EOS Master Executive Atlas", atlas_md))

print("MD bytes", (OUT / "EOS_MASTER_SYSTEM_REPORT.md").stat().st_size)
print("HTML bytes", (OUT / "EOS_MASTER_SYSTEM_REPORT.html").stat().st_size)
print("ATLAS MD", (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").stat().st_size)
print("sections", report_md.count("\n## "))
