#!/usr/bin/env python3
"""Generate EOS Master System Report artifacts from measured raw traces only."""
from __future__ import annotations

import csv
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/workspace")
OUT = ROOT / "docs/reports/eos/master"
CHARTS = OUT / "charts"
RAW = OUT / "raw"
CHARTS.mkdir(parents=True, exist_ok=True)

NOW = "2026-09-01T02:18:00Z"
REPORT_ID = "EOS-MSR-2026-09-01-001"
AUDIT_ID = "AUD-EOS-MASTER-20260901-021328Z"
HEAD = "24b69689c447f94afebd4893f5f0f83f45e0a823"
BASE_BRANCH_AT_START = "main"
AUDIT_BRANCH = "cursor/eos-master-system-report-21fb"

# Load measured traces
inv = json.loads((RAW / "product_baseline_inventory.json").read_text())
tests = json.loads((RAW / "test_static_inventory.json").read_text())
imports = json.loads((RAW / "import_graph.json").read_text())
loc = json.loads((RAW / "loc_inventory.json").read_text())
verify = json.loads((RAW / "verify_strict_summary.json").read_text())
kernel = json.loads((RAW / "kernel_exports.json").read_text())
mcp_tools = json.loads((RAW / "mcp_canonical_tools.json").read_text())
dups = json.loads((RAW / "duplicate_module_basenames.json").read_text())
claims = json.loads((RAW / "claim_string_hits.json").read_text())
exists = json.loads((RAW / "claimed_path_existence.json").read_text())
secrets = json.loads((RAW / "secrets_heuristic.json").read_text())
evidence = json.loads((RAW / "evidence_files.json").read_text())
rt_methods = json.loads((RAW / "mission_runtime_methods.json").read_text())
git = json.loads((RAW / "git_commands.json").read_text())

pkg = json.loads((ROOT / "package.json").read_text())
mission = json.loads((ROOT / "EOS-MISSION-CONTROL/CURRENT_MISSION.json").read_text())
state = json.loads((ROOT / "EOS-MISSION-CONTROL/CURRENT_STATE.json").read_text())
registry = json.loads((ROOT / "docs/projects/registry.json").read_text())
agents_reg = json.loads((ROOT / "docs/agents/REGISTRY.json").read_text())
caps_reg = json.loads((ROOT / "docs/capabilities/REGISTRY.json").read_text())
tools_reg = json.loads((ROOT / "docs/tools/REGISTRY.json").read_text())
active_agents = json.loads((ROOT / "EOS-MISSION-CONTROL/ACTIVE_AGENTS.json").read_text())
active_tools = json.loads((ROOT / "EOS-MISSION-CONTROL/ACTIVE_TOOLS.json").read_text())
budget = json.loads((ROOT / "EOS-MISSION-CONTROL/BUDGET.json").read_text())
risk_mc = json.loads((ROOT / "EOS-MISSION-CONTROL/RISK.json").read_text())

Q = lambda **kw: kw  # quantitative datum helper


def q(value, source, method, timestamp, classification, unit=None, note=None):
    d = {
        "value": value,
        "source": source,
        "method": method,
        "timestamp_utc": timestamp,
        "classification": classification,
    }
    if unit is not None:
        d["unit"] = unit
    if note is not None:
        d["note"] = note
    return d


# ---------------------------------------------------------------------------
# Canonical dataset
# ---------------------------------------------------------------------------
DATA = {
    "schema_version": "1.0.0",
    "report_id": REPORT_ID,
    "audit_id": AUDIT_ID,
    "generated_at_utc": NOW,
    "mode": "READ_ONLY_SAFE_VERIFICATION",
    "repo": {
        "url": "https://github.com/valentinflorezarbelaez-ai/Eos-",
        "abs_path_on_vm": "/workspace",
        "audit_started_from_branch": BASE_BRANCH_AT_START,
        "audit_started_from_head": HEAD,
        "artifact_branch": AUDIT_BRANCH,
        "working_tree_at_start": "clean (no porcelain) on main",
        "working_tree_during_generation": "untracked docs/reports/ only",
    },
    "environment": {
        "os": q("Linux 6.12.94+ x86_64", "uname -a", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "hostname": q("cursor", "uname -a", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "user": q("ubuntu", "whoami", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "node": q("v22.14.0", "node -v", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "npm": q("10.9.7", "npm -v", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "pnpm_present": q("10.33.3", "pnpm -v", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "yarn_present": q("1.22.22", "yarn -v", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "python": q("3.12.3", "python3 --version", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "git": q("2.43.0", "git --version", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
        "package_manager_declared": q(
            "npm (package.json scripts only; no lockfile; no dependencies field)",
            "package.json + ls package-lock.json",
            "static + existence",
            "2026-09-01T02:15:20Z",
            "OBSERVED",
        ),
        "chrome": q("/usr/bin/google-chrome", "which google-chrome", "shell", "2026-09-01T02:14:28Z", "MEASURED"),
    },
    "git": {
        "head": q(HEAD, "git rev-parse HEAD", "git", "2026-09-01T02:16:34Z", "MEASURED"),
        "head_subject": q(
            "feat(mcp): wire MissionRuntime into eos-local for usable local governed ops",
            "git log -1",
            "git",
            "2026-09-01T02:16:34Z",
            "MEASURED",
        ),
        "head_author": q("Valentin Florez", "git log -1", "git", "2026-09-01T02:16:34Z", "MEASURED"),
        "head_date": q("Fri Aug 21 16:11:11 2026 -0500", "git log -1", "git", "2026-09-01T02:16:34Z", "MEASURED"),
        "commit_count": q(75, "git rev-list --count HEAD", "git", "2026-09-01T02:16:34Z", "MEASURED"),
        "first_commit": q(
            "8c52375dc96722018dfb3924bb114a92e6fb9bd1 2026-08-10T17:12:58-05:00",
            "git log --reverse",
            "git",
            "2026-09-01T02:16:34Z",
            "MEASURED",
        ),
        "authors_on_head_lineage": q({"Valentin Florez": 75}, "git shortlog -sn HEAD", "git", "2026-09-01T02:16:34Z", "MEASURED"),
        "shortlog_all_note": q(
            "git shortlog -sn --all showed Cursor Agent 171 + Valentin Florez 75; --all includes other refs. HEAD lineage is 75 commits, all authored Valentin Florez.",
            "git shortlog",
            "git",
            "2026-09-01T02:14:28Z",
            "OBSERVED",
        ),
        "tags": q(["rc/eos-mission-os-local-complete-2026-08-21"], "git tag -l", "git", "2026-09-01T02:16:34Z", "MEASURED"),
        "tracked_files": q(1048, "git ls-files | wc -l", "git", "2026-09-01T02:16:34Z", "MEASURED"),
        "commits_by_date": q(
            {"2026-08-10": 32, "2026-08-11": 14, "2026-08-15": 15, "2026-08-19": 4, "2026-08-21": 10},
            "git log --format=%ad --date=short | sort | uniq -c",
            "git",
            "2026-09-01T02:16:34Z",
            "MEASURED",
        ),
    },
    "inventory": {
        "product_files_excluding_reports": q(inv["file_count"], "raw/product_baseline_inventory.json", "walk exclude .git node_modules .missions docs/reports", inv["collected_at"], "MEASURED"),
        "product_bytes": q(inv["total_bytes"], "raw/product_baseline_inventory.json", "stat.size sum", inv["collected_at"], "MEASURED", "bytes"),
        "by_class": inv["by_class"],
        "by_ext": inv["by_ext"],
        "docs_share_note": "docs/ is 651/1046 files (62.2% of file count) — ratio of file counts, not value or coverage.",
    },
    "loc": {
        "src": loc["src"],
        "scripts": loc["scripts"],
        "tests": loc["tests"],
        "method": loc["method"],
        "classification": "MEASURED",
        "timestamp_utc": loc["collected_at"],
        "note": "fn_like is a regex heuristic, not cyclomatic complexity.",
    },
    "testing": {
        "static_test_like_files": q(tests["test_like_files"], "raw/test_static_inventory.json", tests["method"], tests["collected_at"], "MEASURED"),
        "tests_dir_test_js": q(tests["tests_dir_test_js"], "raw/test_static_inventory.json", tests["method"], tests["collected_at"], "MEASURED"),
        "eos_lab_test_ts": q(tests["eos_lab_test_ts"], "raw/test_static_inventory.json", tests["method"], tests["collected_at"], "MEASURED"),
        "static_test_or_it_calls": q(tests["static_test_or_it_calls"], "raw/test_static_inventory.json", tests["method"], tests["collected_at"], "MEASURED"),
        "files_mentioning_write_apis": q(tests["files_mentioning_write_apis"], "raw/test_static_inventory.json", tests["method"], tests["collected_at"], "MEASURED"),
        "npm_test": q("NOT_RUN", "auditor decision", "mutation risk: 10 test files mention write APIs; engines persist evidence; MissionRuntime mkdir .missions", NOW, "NOT_RUN"),
        "test_lab": q("NOT_RUN", "auditor decision", "requires npx tsx; no node_modules; network install forbidden", NOW, "NOT_RUN"),
        "coverage": q("NOT_RUN", "no coverage/ artifacts; .gitignore includes coverage/", "existence", "2026-09-01T02:15:20Z", "NOT_RUN"),
        "count_is_not_coverage": True,
    },
    "verify_strict": {
        "command": "node scripts/verify-eos.js --strict --json",
        "started_utc": "2026-09-01T02:15:34Z",
        "exit_code": 0,
        "duration_ms": 32,
        "status": verify["status"],
        "check_count": q(verify["check_count"], "raw/cmd_verify_strict.stdout.json", "executed verifier", verify["timestamp_in_output"], "MEASURED"),
        "by_type": verify["by_type"],
        "by_status": verify["by_status"],
        "human_exit_code": 0,
        "human_duration_ms": 29,
        "human_summary": "Checks Passed: 471 | Failures: 0",
        "what_it_is": "Path existence (276) + JSON parse (187) + skill frontmatter (8). Not unit/integration/e2e tests. Not coverage. Not operational capability.",
        "classification": "MEASURED",
    },
    "package": {
        "name": pkg["name"],
        "version": pkg["version"],
        "private": pkg.get("private"),
        "type": pkg.get("type"),
        "script_count": q(len(pkg["scripts"]), "package.json", "Object.keys(scripts)", NOW, "OBSERVED"),
        "scripts": list(pkg["scripts"].keys()),
        "dependencies": q(None, "package.json", "field missing", NOW, "OBSERVED"),
        "devDependencies": q(None, "package.json", "field missing", NOW, "OBSERVED"),
        "lockfile": q(False, "ls package-lock.json", "existence", "2026-09-01T02:15:20Z", "OBSERVED"),
        "node_modules": q(False, "ls node_modules", "existence", "2026-09-01T02:15:20Z", "OBSERVED"),
        "dependency_policy": q("L0_NODE_BUILTINS_ONLY", "DEPENDENCY_POLICY_L0.md + RC_FILE_MANIFEST.json", "document read", NOW, "REPORTED"),
    },
    "imports": {
        "js_ts_files_scanned": q(imports["js_ts_files_scanned"], "raw/import_graph.json", imports["method"], imports["collected_at"], "MEASURED"),
        "edges": q(imports["edges"], "raw/import_graph.json", imports["method"], imports["collected_at"], "MEASURED"),
        "unique_package_specs": imports["unique_package_specs"],
        "external_non_node_specs_observed_in_tree": ["hono", "@hono/node-server", "zod", "vitest", "astro"],
        "note": "External specs appear in EOS-Lab / fixture trees. Core package.json has no dependencies. Code existence of import spec ≠ installed capability (node_modules absent).",
    },
    "architecture": {
        "src_modules": 22,
        "script_engines": 107,
        "duplicate_kernel_basenames": dups["dups"],
        "missions_dir_exists": False,
        "fundacion_dir_empty": True,
        "windows_fundacion_path_exists_on_vm": False,
        "claimed_missing_modules": [
            "src/core/synthesisEngine.js",
            "src/core/executionOrchestrator.js",
            "scripts/engine/core",
        ],
        "mission_runtime_methods": rt_methods["methods"],
        "sdd_states": list(kernel["SDD_STATES"].values()),
        "canonical_transitions": kernel["CANONICAL_TRANSITIONS_COUNT"],
        "authority_ranks": kernel["AUTHORITY_RANKS"],
        "autonomy_modes": list(kernel["AUTONOMY_MODES"].values()),
        "human_only_actions": kernel["HUMAN_ONLY_ACTIONS"],
        "integration_states": list(kernel["INTEGRATION_STATES"].values()),
        "mcp_tools_declared": mcp_tools["count"],
        "cli_help_not_run": "node bin/eos.js --help NOT_RUN because MissionCLI/MissionRuntime constructor mkdirSync(.missions)",
    },
    "claims_observed": {
        "test_health_strings": {k: v["files"] for k, v in claims["strings"].items()},
        "current_mission": mission,
        "current_state": state,
        "budget_file": budget,
        "budget_classification": "REPORTED — numbers in EOS-MISSION-CONTROL/BUDGET.json were not reproduced this audit",
    },
    "projects": {
        "registry_count": len(registry.get("projects", [])),
        "ids": [p["project_id"] for p in registry.get("projects", [])],
        "registry_updated_at": registry.get("updated_at"),
    },
    "agents": {
        "docs_registry_count": len(agents_reg.get("agents", [])),
        "mission_control_active_count": len(active_agents.get("active_agents", [])),
        "note": "Two disjoint agent catalogs exist. Neither was observed executing as live processes this audit.",
    },
    "capabilities_declared": {
        "docs_capabilities": len(caps_reg.get("capabilities", [])),
        "docs_tools": len(tools_reg.get("tools", [])),
        "mcp_tools_in_src": mcp_tools["count"],
        "governed_mcps_reported_connected": len(active_tools.get("governed_mcps", [])),
    },
    "evidence_store": {
        "json_files": q(evidence["count"], "raw/evidence_files.json", "walk docs/evidence *.json", evidence["collected_at"], "MEASURED"),
        "note": "File existence ≠ independent verification of the claims inside those files.",
    },
    "secrets_heuristic": {
        "hit_files": len(secrets["hits"]),
        "hits": secrets["hits"],
        "classification": "OBSERVED",
        "note": "Regex heuristic only; values not extracted. Likely fixtures/tests. Not a professional secret scan.",
    },
    "verdict": {
        "letter": "D",
        "label": "NOT_READY",
        "one_liner": "Local Mission OS code is present and the path/JSON verifier measured 471/471, but this audit did not reproduce a test suite, observed material contradictions in health numbers and architecture docs, and cannot treat reported local-complete or production claims as operational capability.",
    },
}

# Radar 29 — ordinal visual mapping ONLY
RADAR_STATES = [
    ("01 Architecture coherence", "PARTIAL", "Dual planes src/core vs scripts/engine; 3 duplicate kernel basenames"),
    ("02 Documented vs actual", "CONTRADICTED", "Security matrix cites missing synthesisEngine/executionOrchestrator; freeze HEAD stale"),
    ("03 Entrypoints", "PARTIAL", "bin/eos.js and scripts/cli/eos.js both exist; CLI --help not executed (mkdir side effect)"),
    ("04 MissionRuntime", "OBSERVED", "Class and methods exist; no .missions; constructor not invoked this audit"),
    ("05 FSM", "OBSERVED", "17 states, 16 transitions imported from src/core/sdd/sdd-fsm-engine.js"),
    ("06 Authority / HITL", "OBSERVED", "ATS + HitlGatekeeper modules exist; runtime not exercised"),
    ("07 Tools / MCP", "PARTIAL", "20 tools declared in src; MCP CONNECTED claims not observed on this VM"),
    ("08 Governance matrix", "PARTIAL", "Policies and RISK.json exist; frozen-core path scripts/engine/core missing"),
    ("09 Security matrix", "CONTRADICTED", "EOS_STEP_9_SECURITY_MATRIX.json remediates files that do not exist"),
    ("10 Bypass resistance", "UNKNOWN", "Guards exist in source; bypass suite not executed this audit"),
    ("11 Evidence system", "PARTIAL", "84 evidence JSON files exist; contents treated as REPORTED"),
    ("12 Testing inventory", "MEASURED", "132 test-like files; 777 static test()/it() calls; count ≠ coverage"),
    ("13 Testing execution", "NOT_RUN", "npm test / test:all / coverage not executed"),
    ("14 V&V", "PARTIAL", "verify:strict MEASURED; dynamic V&V NOT_RUN"),
    ("15 Reproducibility", "PARTIAL", "L0 builtins policy + no lockfile; clean-clone of core is plausible, not replayed"),
    ("16 Git health", "STRONG", "75 commits, 1 tag, clean start, remote origin present"),
    ("17 Code health", "PARTIAL", "src 22 files / 6323 lines; scripts 3.4x larger; lint/typecheck NOT_RUN"),
    ("18 Dependency health", "STRONG", "No npm dependencies in package.json; node_modules absent"),
    ("19 Agents", "REPORTED", "16 docs agents + 7 mission-control agents; no live process observed"),
    ("20 Knowledge plane", "REPORTED", "docs/knowledge and intelligence JSON exist; not executed"),
    ("21 Ops maturity", "PARTIAL", "Mission-control JSON present; telemetry hash not reproduced"),
    ("22 Performance", "NOT_RUN", "No runtime/perf measurements this audit"),
    ("23 Complexity", "MEASURED", "LOC and import-edge counts only; no cyclomatic tool run"),
    ("24 Fitness functions", "REPORTED", "verify-eos is a fitness-like gate for files/JSON, not product fitness"),
    ("25 Projects", "PARTIAL", "6 registry projects; Fundacion/ empty; Windows paths invalid here"),
    ("26 History", "MEASURED", "11-day burst 2026-08-10..21; 75 commits"),
    ("27 Risk management", "PARTIAL", "Registers exist; several are stale or self-certifying"),
    ("28 Production readiness", "NOT_READY", "PRODUCTION_READY=NO consistently reported; this audit agrees"),
    ("29 Epistemic honesty", "PARTIAL", "Constitution requires labels; live files still publish stale pass-counts"),
]
STATE_ORDINAL = {
    "VERIFIED": 5,
    "MEASURED": 5,
    "STRONG": 4,
    "OBSERVED": 4,
    "REPRODUCED": 5,
    "PARTIAL": 3,
    "REPORTED": 2,
    "INFERRED": 2,
    "UNKNOWN": 1,
    "BLOCKED": 1,
    "NOT_RUN": 1,
    "NOT_READY": 0,
    "CONTRADICTED": 0,
    "HYPOTHESIS": 1,
    "NOT_REPRODUCIBLE": 0,
}

# ---------------------------------------------------------------------------
# Capability / risk / evidence / metrics
# ---------------------------------------------------------------------------
CAPABILITIES = [
    {"id": "CAP-CLI-MISSION", "name": "Mission CLI (bin/eos.js → MissionCLI)", "status": "OBSERVED", "operational": "UNKNOWN", "evidence": "src/cli/mission-cli.js, bin/eos.js", "note": "Constructor mkdir .missions; --help NOT_RUN"},
    {"id": "CAP-MISSION-RUNTIME", "name": "MissionRuntime lifecycle", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "src/core/runtime/mission-runtime.js", "note": "15 methods parsed; no .missions on disk"},
    {"id": "CAP-ATS", "name": "AuthorityTruthSource commitTransition", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "src/core/authority/authority-truth-source.js"},
    {"id": "CAP-FSM", "name": "SDD FSM TransitionEnforcer", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "src/core/sdd/sdd-fsm-engine.js import succeeded"},
    {"id": "CAP-HITL", "name": "HitlGatekeeper receipts", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "src/core/sdd/hitl-gatekeeper.js"},
    {"id": "CAP-IG", "name": "IntegrationGatekeeper / FDIR", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "src/core/governance/integration-gatekeeper.js"},
    {"id": "CAP-MCP-LOCAL", "name": "eos-local MCP server", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "src/mcp-server.js + .cursor/mcp.json"},
    {"id": "CAP-MCP-EXTERNAL", "name": "Engram/Playwright/Figma/Slack MCP", "status": "REPORTED", "operational": "NOT_OBSERVED", "evidence": "ACTIVE_TOOLS.json CONNECTED vs this Linux VM"},
    {"id": "CAP-VERIFY-STRICT", "name": "verify-eos --strict path/JSON gate", "status": "VERIFIED", "operational": "MEASURED", "evidence": "471/471 exit 0 at 2026-09-01T02:15:34Z"},
    {"id": "CAP-NPM-TEST", "name": "npm test suite", "status": "NOT_RUN", "operational": "UNKNOWN", "evidence": "mutation risk"},
    {"id": "CAP-LEGACY-FACTORY", "name": "scripts/engine autonomous factory", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "107 script js files"},
    {"id": "CAP-FUNDACION", "name": "PRJ-FUNDACION product site", "status": "NOT_READY", "operational": "NOT_OBSERVED", "evidence": "Fundacion/ empty; Windows path absent"},
    {"id": "CAP-LUXE", "name": "Luxe-Registry in-repo tree", "status": "OBSERVED", "operational": "UNKNOWN", "evidence": "4 files; registry claims PRODUCTION_READY_WITHIN_TESTED_SCOPE"},
    {"id": "CAP-MULTIMODAL", "name": "Multimodal-Creative-Suite in-repo tree", "status": "OBSERVED", "operational": "UNKNOWN", "evidence": "4 files"},
    {"id": "CAP-CANARY-LAB", "name": "EOS-Lab canaries", "status": "OBSERVED", "operational": "NOT_RUN", "evidence": "64 files including .db"},
    {"id": "CAP-COVERAGE", "name": "Test coverage measurement", "status": "NOT_RUN", "operational": "UNKNOWN", "evidence": "no coverage/"},
    {"id": "CAP-PERF", "name": "Runtime performance telemetry", "status": "NOT_RUN", "operational": "UNKNOWN", "evidence": "BUDGET.json is REPORTED"},
    {"id": "CAP-PROD-DEPLOY", "name": "Production deploy / network / credentials", "status": "NOT_READY", "operational": "BLOCKED", "evidence": "RELEASE_CAPABILITY_MATRIX FUTURE/BLOCKED"},
]

RISKS = [
    {"id": "R-P0-01", "sev": "P0", "title": "Stale/contradictory system-health pass counts used as live telemetry", "class": "CONTRADICTED", "source": "CURRENT_STATE.json 663/663; scripts/cli/eos.js fallback 608/608; freeze 20/20; static 777 calls; 726/726 and 615/615 absent", "impact": "Operators may treat invented or stale counts as current truth"},
    {"id": "R-P0-02", "sev": "P0", "title": "Security remediations cite modules that do not exist", "class": "CONTRADICTED", "source": "docs/evidence/EOS_STEP_9_SECURITY_MATRIX.json → src/core/synthesisEngine.js, executionOrchestrator.js", "impact": "Security posture cannot be the claimed 16/16 blocked attacks against those modules"},
    {"id": "R-P0-03", "sev": "P0", "title": "npm test not executed; mutation risk in suite", "class": "NOT_RUN", "source": "10 test files mention write APIs; MissionRuntime persists .missions", "impact": "No current pass/fail for product tests on this HEAD"},
    {"id": "R-P1-01", "sev": "P1", "title": "Dual kernel copies (src/core vs scripts/engine)", "class": "OBSERVED", "source": "duplicate_module_basenames.json count=3", "impact": "Which FSM/HITL is authoritative is not mechanically enforced across both planes"},
    {"id": "R-P1-02", "sev": "P1", "title": "MCP CONNECTED claims vs this environment", "class": "CONTRADICTED", "source": "ACTIVE_TOOLS.json vs .cursor/mcp.json Windows engram.exe path", "impact": "Tooling assumed available is not observed here"},
    {"id": "R-P1-03", "sev": "P1", "title": "Freeze documents pin stale main SHA", "class": "CONTRADICTED", "source": "EOS_FREEZE_GATE_STATUS.md main=78b28d6; HEAD=24b6968", "impact": "Release paperwork does not describe current tip"},
    {"id": "R-P1-04", "sev": "P1", "title": "PRJ-FUNDACION empty; GAP-002 still UNKNOWN", "class": "OBSERVED", "source": "Fundacion/ empty; MASTER_UNKNOWN_REGISTER.json", "impact": "Value-plane experiment remains blocked; Δ=0 is vacuously true for an empty tree"},
    {"id": "R-P1-05", "sev": "P1", "title": "CLI constructor creates .missions as side effect", "class": "OBSERVED", "source": "mission-runtime.js mkdirSync", "impact": "Even --help is not a pure read; undocumented mutation surface"},
    {"id": "R-P2-01", "sev": "P2", "title": "Registry paths are Windows absolute and invalid on this VM", "class": "OBSERVED", "source": "docs/projects/registry.json", "impact": "Automation that follows registry paths will fail or target nothing"},
    {"id": "R-P2-02", "sev": "P2", "title": "Budget/usage telemetry not reproduced", "class": "REPORTED", "source": "EOS-MISSION-CONTROL/BUDGET.json", "impact": "Cost/token claims cannot be used as measured ops data"},
    {"id": "R-P2-03", "sev": "P2", "title": "RISK.json freezes scripts/engine/core which does not exist", "class": "CONTRADICTED", "source": "EOS-MISSION-CONTROL/RISK.json", "impact": "Core-freeze invariant has no matching directory"},
    {"id": "R-P2-04", "sev": "P2", "title": "Historical PRODUCTION_READY verdicts inside EVD-0033/34/35", "class": "REPORTED", "source": "docs/evidence", "impact": "Lab/canary verdicts can be misread as system-wide production ready"},
    {"id": "R-P2-05", "sev": "P2", "title": "Heuristic secret-like assignments in tests/engines", "class": "OBSERVED", "source": "raw/secrets_heuristic.json 10 files", "impact": "Needs human review; not confirmed live secrets"},
    {"id": "R-P3-01", "sev": "P3", "title": "Docs dominate inventory (651/1046 files)", "class": "MEASURED", "source": "product_baseline_inventory.json", "impact": "High documentation surface increases stale-claim risk"},
    {"id": "R-P3-02", "sev": "P3", "title": "No lockfile under L0 policy", "class": "OBSERVED", "source": "DEPENDENCY_POLICY_L0.md", "impact": "Acceptable for builtins-only; blocks any future npm dep without policy change"},
    {"id": "R-P3-03", "sev": "P3", "title": "sqlite artifacts in EOS-Lab", "class": "OBSERVED", "source": "inventory .db .db-wal .db-shm", "impact": "Binary state in tree; reproducibility of lab DBs unknown"},
]

DO_NOT_BUILD = [
    {"item": "Production deploy / public hosting", "reason": "PRODUCTION_READY=NO; no network/prod capability verified", "class": "NOT_READY"},
    {"item": "Unattended LEVEL_3+ autonomy on real client targets", "reason": "HITL/ATS not exercised this audit; Fundacion barrier exists", "class": "NOT_READY"},
    {"item": "Infer GAP-002 legal/banking data", "reason": "Explicit constitutional unknown", "class": "BLOCKED"},
    {"item": "Treat verify:strict 471 as test coverage or runtime health", "reason": "Path/JSON existence only", "class": "INFERRED"},
    {"item": "npm install / add dependencies without L1/L2 policy", "reason": "DEPENDENCY_POLICY_L0", "class": "REPORTED"},
    {"item": "Merge or claim freeze paperwork still equals HEAD", "reason": "78b28d6 ≠ 24b6968", "class": "CONTRADICTED"},
    {"item": "Operate claimed CONNECTED third-party MCPs from this Linux VM as if live", "reason": "Not observed; Windows engram path", "class": "NOT_OBSERVED"},
    {"item": "Cite 726/726 or 615/615 as current facts", "reason": "Strings absent in tree; previous-memory only", "class": "CONTRADICTED"},
]

FINDINGS = [
    {"id": "F01", "polarity": "POS", "title": "verify:strict executed 471/471 PASS exit 0 in 32 ms", "class": "MEASURED"},
    {"id": "F02", "polarity": "POS", "title": "Mission OS kernel modules exist under src/core (22 JS files, 6323 lines)", "class": "MEASURED"},
    {"id": "F03", "polarity": "POS", "title": "package.json has zero npm dependencies; L0 builtins policy matches observation", "class": "OBSERVED"},
    {"id": "F04", "polarity": "POS", "title": "PRODUCTION_READY=NO is consistent across CURRENT_MISSION and freeze docs", "class": "REPORTED"},
    {"id": "F05", "polarity": "POS", "title": "GAP-002 remains labeled UNKNOWN in mission-control and unknown register", "class": "REPORTED"},
    {"id": "F06", "polarity": "POS", "title": "Git history is short, linear, tagged RC; start working tree was clean", "class": "MEASURED"},
    {"id": "F07", "polarity": "POS", "title": "MCP tool table in src is enumerable (20 tools) with deny-by-default comments", "class": "OBSERVED"},
    {"id": "F08", "polarity": "POS", "title": "HITL human-only action set is explicit in source", "class": "OBSERVED"},
    {"id": "F09", "polarity": "NEG", "title": "System health numbers contradict each other (20 / 471 / 472 / 608 / 663 / static 777)", "class": "CONTRADICTED"},
    {"id": "F10", "polarity": "NEG", "title": "726/726 and 615/615 previous-memory claims are not in this tree", "class": "CONTRADICTED"},
    {"id": "F11", "polarity": "NEG", "title": "Security matrix remediates nonexistent src/core modules", "class": "CONTRADICTED"},
    {"id": "F12", "polarity": "NEG", "title": "Freeze status pins main=78b28d6; actual HEAD=24b6968", "class": "CONTRADICTED"},
    {"id": "F13", "polarity": "NEG", "title": "ACTIVE_TOOLS.json reports MCP CONNECTED; not observed on this VM", "class": "CONTRADICTED"},
    {"id": "F14", "polarity": "NEG", "title": "Dual FSM/HITL/evidence engines (src vs scripts)", "class": "OBSERVED"},
    {"id": "F15", "polarity": "NEG", "title": "Fundacion/ is empty; registry points at Windows path", "class": "OBSERVED"},
    {"id": "F16", "polarity": "NEG", "title": "RISK.json freezes scripts/engine/core which does not exist", "class": "CONTRADICTED"},
    {"id": "F17", "polarity": "UNKNOWN", "title": "npm test / coverage / CLI runtime / MCP stdio smoke not run this audit", "class": "NOT_RUN"},
    {"id": "F18", "polarity": "UNKNOWN", "title": "Whether 20/20 freeze tests still pass on 24b6968 is unknown", "class": "NOT_RUN"},
    {"id": "F19", "polarity": "UNKNOWN", "title": "BUDGET.json usage figures have no measurement chain here", "class": "REPORTED"},
    {"id": "F20", "polarity": "CONTRADICTED", "title": "Documented CORE freeze locations do not match a single existing kernel directory", "class": "CONTRADICTED"},
]

RECS = [
    {"id": "REC01", "finding": "F09", "title": "Remove or timestamp-lock all live test-health strings; single measured source or NONE"},
    {"id": "REC02", "finding": "F10", "title": "Never restore 726/726 or 615/615 without a new MEASURED run"},
    {"id": "REC03", "finding": "F11", "title": "Quarantine EOS_STEP_9_SECURITY_MATRIX.json as HISTORICAL / NOT_APPLICABLE_TO_CURRENT_TREE"},
    {"id": "REC04", "finding": "F12", "title": "Rewrite freeze gate docs to current HEAD or mark SUPERSEDED"},
    {"id": "REC05", "finding": "F03", "title": "Keep L0 no-dep policy until a lockfile gate exists"},
    {"id": "REC06", "finding": "F17", "title": "Create a declared non-mutating test subset (tmp workdir only) and run it under evidence"},
    {"id": "REC07", "finding": "F18", "title": "Re-run the freeze 4-file suite in an isolated tmp dir; record exit and SHA"},
    {"id": "REC08", "finding": "F14", "title": "Declare one authoritative kernel path; mark the other DEPRECATED in code not just docs"},
    {"id": "REC09", "finding": "F13", "title": "Change ACTIVE_TOOLS MCP status from CONNECTED to CONFIGURED or UNKNOWN until a live handshake"},
    {"id": "REC10", "finding": "F15", "title": "Keep Fundacion empty until GAP-002 official source; do not infer legal data"},
    {"id": "REC11", "finding": "F16", "title": "Point CORE-freeze monitors at src/core (or the real path), not scripts/engine/core"},
    {"id": "REC12", "finding": "F05", "title": "Leave GAP-002 UNKNOWN; do not close from web inference"},
    {"id": "REC13", "finding": "F19", "title": "Treat BUDGET.json current_usage as demo/stale until a ledger backs it"},
    {"id": "REC14", "finding": "R-P1-05", "title": "Stop mkdir in MissionRuntime constructor; create on first write"},
    {"id": "REC15", "finding": "F20", "title": "Publish a one-page ACTUAL architecture that names src/core as Mission OS and scripts/engine as legacy/lab"},
    {"id": "REC16", "finding": "F01", "title": "Keep verify:strict but label it FILE_JSON_GATE not test health"},
    {"id": "REC17", "finding": "F07", "title": "Do not claim eos.provider.* operational; mcp-status already lists them not_configured"},
    {"id": "REC18", "finding": "F04", "title": "Retain PRODUCTION_READY=NO until measured runtime + security + tests exist"},
    {"id": "REC19", "finding": "R-P2-05", "title": "Human-review the 10 heuristic secret-hit files"},
    {"id": "REC20", "finding": "F06", "title": "Pin this audit SHA in any future health dashboard"},
]

EXEC_Q = [
    {"n": 1, "q": "Is EOS production ready?", "a": "NO", "class": "REPORTED+OBSERVED", "proof": "CURRENT_MISSION.dictamen.PRODUCTION_READY=NO; RELEASE_CAPABILITY_MATRIX; this audit verdict D"},
    {"n": 2, "q": "Is EOS complete for local governed use?", "a": "PARTIAL", "class": "REPORTED/NOT_RUN", "proof": "Freeze docs say YES at 20/20 on older tip; this audit did not reproduce those tests on 24b6968"},
    {"n": 3, "q": "Does a real Mission OS kernel exist in src/?", "a": "YES", "class": "OBSERVED", "proof": "22 files including mission-runtime.js, ATS, FSM, HITL"},
    {"n": 4, "q": "Did this audit run the product test suite?", "a": "NO", "class": "NOT_RUN", "proof": "Mutation risk; marked NOT_RUN"},
    {"n": 5, "q": "Did any automated gate pass here?", "a": "YES", "class": "MEASURED", "proof": "verify:strict 471/471 exit 0"},
    {"n": 6, "q": "Are published test-health numbers trustworthy?", "a": "NO", "class": "CONTRADICTED", "proof": "20 vs 471 vs 472 vs 608 vs 663 vs static 777"},
    {"n": 7, "q": "Is CORE frozen as a single inode?", "a": "UNKNOWN", "class": "CONTRADICTED", "proof": "Claims FROZEN; scripts/engine/core missing; src/core exists and HEAD moved after freeze docs"},
    {"n": 8, "q": "Is PRJ-FUNDACION operational?", "a": "NO", "class": "OBSERVED", "proof": "Empty Fundacion/; Windows path absent"},
    {"n": 9, "q": "Is GAP-002 resolved?", "a": "NO", "class": "REPORTED", "proof": "MASTER_UNKNOWN_REGISTER UNK-GAP-002 UNKNOWN"},
    {"n": 10, "q": "Are third-party MCPs connected here?", "a": "UNKNOWN", "class": "NOT_OBSERVED", "proof": "ACTIVE_TOOLS says CONNECTED; no handshake; engram.exe Windows path"},
    {"n": 11, "q": "Is there an npm lockfile / installed deps?", "a": "NO", "class": "OBSERVED", "proof": "no package-lock.json; no node_modules; no dependencies field"},
    {"n": 12, "q": "Can we claim 726/726 or 615/615 tests?", "a": "NO", "class": "CONTRADICTED", "proof": "Strings absent in tree; previous memory only"},
    {"n": 13, "q": "Is security Step-9 matrix applicable to current src/core?", "a": "NO", "class": "CONTRADICTED", "proof": "Target files do not exist"},
    {"n": 14, "q": "Should the board authorize production or client writes?", "a": "NO", "class": "NOT_READY", "proof": "Verdict D; write barrier; empty/unknown legal target"},
    {"n": 15, "q": "What is the single best next measurement?", "a": "Isolated freeze-suite replay", "class": "HYPOTHESIS", "proof": "Smallest documented suite (4 files, historically 20 tests) in tmp workdir"},
]

ULTIMATE = {
    "question": "Should EOS be treated as an operational, production-capable autonomous engineering system today?",
    "answer": "NO",
    "qualifier": "PARTIAL as a local, documentation-heavy control-plane codebase with an observed Mission OS kernel and a measured file/JSON gate.",
    "class": "NOT_READY",
    "proof": [
        "PRODUCTION_READY=NO (REPORTED, consistent)",
        "npm test NOT_RUN this audit",
        "Health telemetry CONTRADICTED",
        "Security matrix CONTRADICTED vs tree",
        "verify:strict MEASURED but is not a runtime",
        "Fundacion empty; GAP-002 UNKNOWN",
    ],
}

COMMANDS = [
    {"command": "date -u; pwd; whoami; uname -a; node -v; npm -v; git --version; pnpm -v; yarn -v; python3 --version; which google-chrome; git rev-parse HEAD; git status; git log -5; git branch -vv", "started_utc": "2026-09-01T02:14:28Z", "exit_code": 0, "duration_ms": 676, "result": "env+git metadata", "mutating": False},
    {"command": "git checkout -b cursor/eos-master-system-report-21fb; mkdir docs/reports/eos/master/{raw,charts}; git rev-list --count; git shortlog; git tag; find -maxdepth 2", "started_utc": "2026-09-01T02:14:40Z", "exit_code": 0, "duration_ms": 80, "result": "branch + inventory listing", "mutating": True, "mutation_scope": "git branch + empty report dirs only"},
    {"command": "node docs/reports/eos/master/raw/_collect_inventory.mjs", "started_utc": "2026-09-01T02:15:02Z", "exit_code": 0, "duration_ms": 138, "result": "1047 files walk (includes early report files); 132 test-like; 777 test()/it()", "mutating": True, "mutation_scope": "writes under docs/reports/eos/master/raw only"},
    {"command": "ls node_modules package-lock.json Fundacion .missions EOS-MISSION-CONTROL src bin", "started_utc": "2026-09-01T02:15:20Z", "exit_code": 0, "duration_ms": 72, "result": "no node_modules/lockfile/.missions; Fundacion empty; 22 src files", "mutating": False},
    {"command": "node scripts/verify-eos.js --strict --json", "started_utc": "2026-09-01T02:15:34Z", "exit_code": 0, "duration_ms": 32, "result": "PASS 471 checks", "mutating": False},
    {"command": "node scripts/verify-eos.js --strict", "started_utc": "2026-09-01T02:15:34Z", "exit_code": 0, "duration_ms": 29, "result": "Checks Passed: 471 | Failures: 0", "mutating": False},
    {"command": "node docs/reports/eos/master/raw/_collect_more.mjs", "started_utc": "2026-09-01T02:16:34Z", "exit_code": 0, "duration_ms": 199, "result": "LOC, kernel import, git, MCP tools, secrets heuristic", "mutating": True, "mutation_scope": "raw traces only"},
    {"command": "node docs/reports/eos/master/raw/_collect_product_baseline.mjs", "started_utc": "2026-09-01T02:17:03Z", "exit_code": 0, "duration_ms": 80, "result": "1046 product files / 4024024 bytes excluding docs/reports", "mutating": True, "mutation_scope": "raw traces only"},
    {"command": "npm test / npm run test:all / node bin/eos.js --help / mcp:start", "started_utc": None, "exit_code": None, "duration_ms": None, "result": "NOT_RUN (mutation or constructor side effects)", "mutating": False, "classification": "NOT_RUN"},
]

# persist commands into DATA
DATA["commands"] = COMMANDS
DATA["radar29"] = [{"dimension": a, "state": b, "note": c, "ordinal_visual_only": STATE_ORDINAL.get(b, 1)} for a, b, c in RADAR_STATES]
DATA["capabilities"] = CAPABILITIES
DATA["risks"] = RISKS
DATA["do_not_build"] = DO_NOT_BUILD
DATA["findings"] = FINDINGS
DATA["recommendations"] = RECS
DATA["executive_questions"] = EXEC_Q
DATA["ultimate"] = ULTIMATE

(OUT / "EOS_MASTER_SYSTEM_DATA.json").write_text(json.dumps(DATA, indent=2) + "\n")

# Dependency graph
dep_graph = {
    "generated_at_utc": NOW,
    "method": "static import regex + package.json field inspection",
    "classification": "MEASURED",
    "nodes": [
        {"id": "bin/eos.js", "layer": "entrypoint"},
        {"id": "src/cli/mission-cli.js", "layer": "cli"},
        {"id": "src/core/runtime/mission-runtime.js", "layer": "kernel"},
        {"id": "src/core/authority/authority-truth-source.js", "layer": "kernel"},
        {"id": "src/core/sdd/sdd-fsm-engine.js", "layer": "kernel"},
        {"id": "src/core/sdd/hitl-gatekeeper.js", "layer": "kernel"},
        {"id": "src/core/governance/integration-gatekeeper.js", "layer": "kernel"},
        {"id": "src/mcp-server.js", "layer": "mcp"},
        {"id": "src/core/mcp/mcp-mission-bridge.js", "layer": "mcp"},
        {"id": "scripts/cli/eos.js", "layer": "legacy-cli"},
        {"id": "scripts/engine/*", "layer": "legacy-factory"},
        {"id": "scripts/verify-eos.js", "layer": "gate"},
        {"id": "node:builtins", "layer": "runtime"},
    ],
    "edges": [
        {"from": "bin/eos.js", "to": "src/cli/mission-cli.js"},
        {"from": "src/cli/mission-cli.js", "to": "src/core/runtime/mission-runtime.js"},
        {"from": "src/core/runtime/mission-runtime.js", "to": "src/core/authority/authority-truth-source.js"},
        {"from": "src/core/runtime/mission-runtime.js", "to": "src/core/sdd/sdd-fsm-engine.js"},
        {"from": "src/core/runtime/mission-runtime.js", "to": "src/core/sdd/hitl-gatekeeper.js"},
        {"from": "src/mcp-server.js", "to": "src/core/mcp/mcp-mission-bridge.js"},
        {"from": "src/core/mcp/mcp-mission-bridge.js", "to": "src/core/runtime/mission-runtime.js"},
        {"from": "scripts/cli/eos.js", "to": "scripts/engine/*"},
        {"from": "npm run verify:strict", "to": "scripts/verify-eos.js"},
    ],
    "package_specs": imports["unique_package_specs"],
    "npm_dependencies_field": None,
    "note": "Graph is static. Duplicate kernel files in scripts/engine are not shown as imports of src/core.",
}
(OUT / "EOS_MASTER_DEPENDENCY_GRAPH.json").write_text(json.dumps(dep_graph, indent=2) + "\n")

(OUT / "EOS_MASTER_CAPABILITY_MATRIX.json").write_text(json.dumps({
    "generated_at_utc": NOW,
    "report_id": REPORT_ID,
    "rule": "code existence ≠ operational capability",
    "items": CAPABILITIES,
}, indent=2) + "\n")

(OUT / "EOS_MASTER_RISK_REGISTER.json").write_text(json.dumps({
    "generated_at_utc": NOW,
    "report_id": REPORT_ID,
    "items": RISKS,
    "do_not_build": DO_NOT_BUILD,
}, indent=2) + "\n")

ev_index = {
    "generated_at_utc": NOW,
    "report_id": REPORT_ID,
    "raw_traces": [
        "raw/product_baseline_inventory.json",
        "raw/inventory_summary.json",
        "raw/inventory_files.csv",
        "raw/test_static_inventory.json",
        "raw/import_graph.json",
        "raw/import_edges.json",
        "raw/loc_inventory.json",
        "raw/cmd_verify_strict.stdout.json",
        "raw/cmd_verify_strict.human.txt",
        "raw/cmd_verify_strict.meta.txt",
        "raw/verify_strict_summary.json",
        "raw/kernel_exports.json",
        "raw/mcp_canonical_tools.json",
        "raw/mission_runtime_methods.json",
        "raw/duplicate_module_basenames.json",
        "raw/claim_string_hits.json",
        "raw/claimed_path_existence.json",
        "raw/secrets_heuristic.json",
        "raw/evidence_files.json",
        "raw/git_commands.json",
        "raw/keyword_hits.json",
    ],
    "docs_evidence_json_count": evidence["count"],
    "docs_evidence_note": "Listed as store inventory; claims inside each EVD-* file remain REPORTED unless re-executed.",
    "footnotes_rule": "Every number in the markdown cites a raw/ or command row.",
}
(OUT / "EOS_MASTER_EVIDENCE_INDEX.json").write_text(json.dumps(ev_index, indent=2) + "\n")

# Metrics CSV
metrics_rows = [
    ("product_files_excluding_reports", inv["file_count"], "files", "MEASURED", "raw/product_baseline_inventory.json", inv["collected_at"], "walk exclude docs/reports"),
    ("product_bytes", inv["total_bytes"], "bytes", "MEASURED", "raw/product_baseline_inventory.json", inv["collected_at"], "stat.size"),
    ("docs_files", inv["by_class"]["docs"]["files"], "files", "MEASURED", "raw/product_baseline_inventory.json", inv["collected_at"], "class=docs"),
    ("src_files", inv["by_class"]["src"]["files"], "files", "MEASURED", "raw/product_baseline_inventory.json", inv["collected_at"], "class=src"),
    ("scripts_files", inv["by_class"]["scripts"]["files"], "files", "MEASURED", "raw/product_baseline_inventory.json", inv["collected_at"], "class=scripts"),
    ("tests_files", inv["by_class"]["tests"]["files"], "files", "MEASURED", "raw/product_baseline_inventory.json", inv["collected_at"], "class=tests"),
    ("src_lines", loc["src"]["lines"], "lines", "MEASURED", "raw/loc_inventory.json", loc["collected_at"], loc["method"]),
    ("scripts_lines", loc["scripts"]["lines"], "lines", "MEASURED", "raw/loc_inventory.json", loc["collected_at"], loc["method"]),
    ("tests_lines", loc["tests"]["lines"], "lines", "MEASURED", "raw/loc_inventory.json", loc["collected_at"], loc["method"]),
    ("static_test_like_files", tests["test_like_files"], "files", "MEASURED", "raw/test_static_inventory.json", tests["collected_at"], "regex *.test.js/ts"),
    ("static_test_or_it_calls", tests["static_test_or_it_calls"], "calls", "MEASURED", "raw/test_static_inventory.json", tests["collected_at"], "count ≠ coverage ≠ executed"),
    ("test_files_mentioning_writes", tests["files_mentioning_write_apis"], "files", "MEASURED", "raw/test_static_inventory.json", tests["collected_at"], "writeFile/unlink/rm"),
    ("verify_strict_checks", verify["check_count"], "checks", "MEASURED", "raw/cmd_verify_strict.stdout.json", "2026-09-01T02:15:34Z", "existence+json+frontmatter"),
    ("verify_strict_exit_code", 0, "exit_code", "MEASURED", "raw/cmd_verify_strict.meta.txt", "2026-09-01T02:15:34Z", "node scripts/verify-eos.js --strict --json"),
    ("verify_strict_duration_ms", 32, "ms", "MEASURED", "raw/cmd_verify_strict.meta.txt", "2026-09-01T02:15:34Z", None),
    ("git_commits_head_lineage", 75, "commits", "MEASURED", "raw/git_commands.json", "2026-09-01T02:16:34Z", "git rev-list --count HEAD"),
    ("git_tracked_files", 1048, "files", "MEASURED", "raw/git_commands.json", "2026-09-01T02:16:34Z", "git ls-files | wc -l"),
    ("git_tags", 1, "tags", "MEASURED", "raw/git_commands.json", "2026-09-01T02:16:34Z", "git tag -l"),
    ("import_edges", imports["edges"], "edges", "MEASURED", "raw/import_graph.json", imports["collected_at"], "regex imports"),
    ("js_ts_files_scanned", imports["js_ts_files_scanned"], "files", "MEASURED", "raw/import_graph.json", imports["collected_at"], None),
    ("duplicate_kernel_basenames", dups["count"], "pairs", "MEASURED", "raw/duplicate_module_basenames.json", dups["collected_at"], None),
    ("sdd_states", len(kernel["SDD_STATES"]), "states", "OBSERVED", "raw/kernel_exports.json", kernel["collected_at"], "ESM import"),
    ("canonical_transitions", kernel["CANONICAL_TRANSITIONS_COUNT"], "transitions", "OBSERVED", "raw/kernel_exports.json", kernel["collected_at"], "ESM import"),
    ("mcp_tools_declared", mcp_tools["count"], "tools", "OBSERVED", "raw/mcp_canonical_tools.json", mcp_tools["collected_at"], "parse CANONICAL_TOOLS"),
    ("evidence_json_files", evidence["count"], "files", "MEASURED", "raw/evidence_files.json", evidence["collected_at"], "walk docs/evidence"),
    ("registry_projects", len(registry["projects"]), "projects", "OBSERVED", "docs/projects/registry.json", registry["updated_at"], "JSON field count"),
    ("docs_agents", len(agents_reg["agents"]), "agents", "OBSERVED", "docs/agents/REGISTRY.json", agents_reg.get("updated_at"), None),
    ("mc_active_agents", len(active_agents["active_agents"]), "agents", "REPORTED", "EOS-MISSION-CONTROL/ACTIVE_AGENTS.json", None, "not observed as processes"),
    ("docs_capabilities", len(caps_reg["capabilities"]), "capabilities", "OBSERVED", "docs/capabilities/REGISTRY.json", caps_reg.get("updated_at"), "declared ≠ operational"),
    ("docs_tools", len(tools_reg["tools"]), "tools", "OBSERVED", "docs/tools/REGISTRY.json", None, "all TOL-MOCK-*"),
    ("package_scripts", len(pkg["scripts"]), "scripts", "OBSERVED", "package.json", None, None),
    ("npm_dependencies", 0, "packages", "OBSERVED", "package.json", None, "field absent"),
    ("node_modules_present", 0, "bool", "OBSERVED", "ls node_modules", "2026-09-01T02:15:20Z", "absent"),
    ("lockfile_present", 0, "bool", "OBSERVED", "ls package-lock.json", "2026-09-01T02:15:20Z", "absent"),
    ("missions_dir_present", 0, "bool", "OBSERVED", "ls .missions", "2026-09-01T02:15:20Z", "absent"),
    ("fundacion_child_files", 0, "files", "OBSERVED", "ls Fundacion", "2026-09-01T02:15:20Z", "empty dir"),
    ("npm_test_pass_count", "", "", "NOT_RUN", "auditor", NOW, "mutation risk"),
    ("coverage_pct", "", "", "NOT_RUN", "auditor", NOW, "no coverage artifacts"),
    ("current_state_test_health", "663 / 663 PASS", "claim", "REPORTED", "EOS-MISSION-CONTROL/CURRENT_STATE.json", state.get("updated_at"), "not reproduced"),
    ("cli_fallback_test_health", "608 / 608 PASS", "claim", "REPORTED", "scripts/cli/eos.js", None, "hardcoded fallback"),
    ("freeze_tests", "20/20 PASS", "claim", "REPORTED", "docs/releases/EOS_FREEZE_GATE_STATUS.md", "2026-08-21", "older tip 78b28d6"),
    ("memory_726", "726/726", "claim", "CONTRADICTED", "previous memory; absent in tree", NOW, "claim_string_hits empty"),
    ("memory_615", "615/615", "claim", "CONTRADICTED", "previous memory / .cursorrules example; absent as measured", NOW, "claim_string_hits empty"),
    ("verdict_letter", "D", "enum", "INFERRED", "this report §43", NOW, "from measured+contradicted evidence"),
]

with (OUT / "EOS_MASTER_SYSTEM_METRICS.csv").open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["metric", "value", "unit", "classification", "source", "timestamp_utc", "method_or_note"])
    w.writerows(metrics_rows)

print("DATA/JSON/CSV written")
print("metrics", len(metrics_rows))
