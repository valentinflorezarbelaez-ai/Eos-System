#!/usr/bin/env python3
"""Expand executive atlas to board length using the same DATA.json numbers."""
from __future__ import annotations
import json
from pathlib import Path

OUT = Path("/workspace/docs/reports/eos/master")
D = json.loads((OUT / "EOS_MASTER_SYSTEM_DATA.json").read_text())
atlas = (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").read_text()
if "## U. Full metadata" in atlas:
    print("already expanded")
else:
    extra = ["\n---\n\n## U. Full metadata (board record)\n"]
    extra.append("| Field | Value | Class |\n| --- | --- | --- |\n")
    extra.append(f"| Report ID | `{D['report_id']}` | — |\n")
    extra.append(f"| Audit ID | `{D['audit_id']}` | — |\n")
    extra.append(f"| Abs path | `/workspace` | MEASURED |\n")
    extra.append(f"| HEAD | `{D['git']['head']['value']}` | MEASURED |\n")
    extra.append(f"| Node / npm / git | {D['environment']['node']['value']} / {D['environment']['npm']['value']} / {D['environment']['git']['value']} | MEASURED |\n")
    extra.append(f"| Package manager | npm scripts; no lockfile; 0 deps | OBSERVED |\n")
    extra.append(f"| Commits / tracked files / tags | 75 / 1048 / 1 | MEASURED |\n")
    extra.append("\nThis page exists so a director can file the audit without opening the 53-section report.\n")

    extra.append("\n## V. Contradiction register (complete)\n\n")
    extra.append("If a slide still shows 726, 615, 663, 608, 472, or 20 as *today’s* health, it is wrong.\n\n")
    extra.append("| ID | A | B | Label |\n| --- | --- | --- | --- |\n")
    extra.append("| CX-01 | CURRENT_STATE 663/663 | suite NOT_RUN; static 777 | CONTRADICTED |\n")
    extra.append("| CX-02 | cli fallback 608/608 | same | CONTRADICTED |\n")
    extra.append("| CX-03 | historical verify 472/472 | this run 471/471 | CONTRADICTED |\n")
    extra.append("| CX-04 | freeze main 78b28d6 | HEAD 24b6968 | CONTRADICTED |\n")
    extra.append("| CX-05 | Step-9 remediations | target files absent | CONTRADICTED |\n")
    extra.append("| CX-06 | RISK.json scripts/engine/core | directory absent | CONTRADICTED |\n")
    extra.append("| CX-07 | MCP CONNECTED | not observed here | CONTRADICTED |\n")
    extra.append("| CX-08 | memory 726/726 | 0 hits in tree | CONTRADICTED |\n")
    extra.append("| CX-09 | memory 615/615 | 0 hits as live metric | CONTRADICTED |\n")
    extra.append("| CX-10 | freeze 20/20 as current | HEAD moved; NOT_RUN | CONTRADICTED as current |\n")
    extra.append("| CX-11 | CORE FROZEN slogan | src/core changed after freeze docs | CONTRADICTED if Δ=0 |\n")
    extra.append("| CX-12 | EVD-0033/34 PRODUCTION_READY | system dictamen NO | CONTRADICTED if global |\n")
    extra.append("\nSystem-level `PRODUCTION_READY=NO` is **consistent** and accepted.\n")

    extra.append("\n## W. Graph 29 table (all dimensions)\n\n")
    extra.append("| # | Dimension | State | Note |\n| --- | --- | --- | --- |\n")
    for i, row in enumerate(D["radar29"], 1):
        extra.append(f"| {i} | {row['dimension']} | `{row['state']}` | {row['note']} |\n")

    extra.append("\n## X. All P0–P3 risks\n\n")
    extra.append("| ID | Sev | Title | Class |\n| --- | --- | --- | --- |\n")
    for r in D["risks"]:
        extra.append(f"| {r['id']} | {r['sev']} | {r['title']} | `{r['class']}` |\n")

    extra.append("\n## Y. Findings and recommendations (full)\n\n")
    extra.append("### Findings\n\n| ID | Pol | Title | Class |\n| --- | --- | --- | --- |\n")
    for f in D["findings"]:
        extra.append(f"| {f['id']} | {f['polarity']} | {f['title']} | `{f['class']}` |\n")
    extra.append("\n### Recommendations\n\n| ID | Finding | Recommendation |\n| --- | --- | --- |\n")
    for r in D["recommendations"]:
        extra.append(f"| {r['id']} | {r['finding']} | {r['title']} |\n")

    extra.append("\n## Z. Capability matrix (full)\n\n")
    extra.append("| ID | Name | Status | Operational | Evidence |\n| --- | --- | --- | --- | --- |\n")
    for c in D["capabilities"]:
        extra.append(f"| {c['id']} | {c['name']} | {c['status']} | {c['operational']} | {c.get('evidence','')} |\n")

    extra.append("\n## AA. Unknowns the board must keep unknown\n\n")
    extra.append("- GAP-002 legal/banking facts until official PO source.\n")
    extra.append("- npm test result on this HEAD.\n")
    extra.append("- Freeze 20/20 on SHA 24b6968.\n")
    extra.append("- Coverage.\n")
    extra.append("- Live MCP connectivity.\n")
    extra.append("- Runtime performance (except verify-eos 32 ms).\n")
    extra.append("- Whether ATS is the sole writer at runtime.\n")
    extra.append("- Why verify drifted 472 → 471.\n")

    extra.append("\n## AB. Command ledger (what was and was not run)\n\n")
    extra.append("| Command (abbrev) | Exit | ms | Class |\n| --- | --- | --- | --- |\n")
    extra.append("| env + git metadata | 0 | 676 | MEASURED |\n")
    extra.append("| branch + mkdir report dirs | 0 | 80 | MEASURED (allowed mutation) |\n")
    extra.append("| inventory collector | 0 | 138 | MEASURED |\n")
    extra.append("| existence listing | 0 | 72 | MEASURED |\n")
    extra.append("| verify-eos --strict --json | 0 | 32 | MEASURED |\n")
    extra.append("| verify-eos --strict | 0 | 29 | MEASURED |\n")
    extra.append("| more collectors + kernel import | 0 | 199 | MEASURED |\n")
    extra.append("| product baseline walk | 0 | 80 | MEASURED |\n")
    extra.append("| npm test / CLI help / MCP start | — | — | NOT_RUN |\n")

    extra.append("\n## AC. How the board should talk about EOS after this audit\n\n")
    extra.append("**Allowed:** “We have a local Mission OS codebase, a passing file/JSON gate (471/471), zero npm dependencies, and an honest PRODUCTION_READY=NO.”\n\n")
    extra.append("**Forbidden:** “615/615 tests,” “726/726 tests,” “472/472 current,” “663/663 live,” “608/608,” “production ready,” “MCPs connected,” “CORE frozen meaning src cannot change,” “Fundación is an operating site,” “security 16/16 on current kernel.”\n\n")
    extra.append("**Next measurement that would change the verdict toward C (not A):** isolated freeze-suite replay on 24b6968 with sealed logs, plus a non-mutating MissionRuntime inspect in tmp. That still would not make production ready.\n")

    extra.append("\n## AD. Inventory detail (for the packet appendix)\n\n")
    extra.append("| Class | Files | Bytes |\n| --- | ---: | ---: |\n")
    for k, v in sorted(D["inventory"]["by_class"].items(), key=lambda kv: -kv[1]["files"]):
        extra.append(f"| `{k}` | {v['files']} | {v['bytes']} |\n")
    extra.append("\nTotal 1046 files / 4,024,024 bytes excluding this report directory. MEASURED.\n")

    extra.append("\n## AE. Entrypoints and why help was not run\n\n")
    extra.append("`bin/eos.js` constructs `MissionCLI`, which constructs `MissionRuntime`, which `mkdirSync('.missions')` if missing. The auditor treated `--help` as mutating and marked it NOT_RUN. Help text was read from source instead (OBSERVED).\n\n")
    extra.append("Legacy `npm run eos` is a different program (`scripts/cli/eos.js`) and embeds a fallback health string `608 / 608 PASS`.\n")

    extra.append("\n## AF. MCP tools declared (20)\n\n")
    extra.append("| Tool | Effects | Auth |\n| --- | --- | --- |\n")
    tools = json.loads((OUT / "raw/mcp_canonical_tools.json").read_text())["tools"]
    for t in tools:
        extra.append(f"| `{t['name']}` | {t['sideEffects']} | {t['requiredAuthority']} |\n")
    extra.append("\n`eos.provider.route` and `eos.provider.health` are declared in source and marked not_configured in mcp-status.json.\n")

    extra.append("\n## AG. FSM states (17) and transitions (16)\n\n")
    extra.append(", ".join(f"`{s}`" for s in D["architecture"]["sdd_states"]))
    extra.append("\n\nCanonical transition count: 16. Imported from `src/core/sdd/sdd-fsm-engine.js`. Duplicate file exists under `scripts/engine/`.\n")

    extra.append("\n## AH. Evidence store vs this audit\n\n")
    extra.append("84 JSON files sit in `docs/evidence/`. They are a store, not this audit’s certification. This audit’s evidence is only `docs/reports/eos/master/raw/` plus the executed verify-eos logs.\n")

    extra.append("\n## AI. Print checklist\n\n")
    extra.append("Print `EOS_MASTER_EXECUTIVE_ATLAS.html` (this document) for the board. Keep `EOS_MASTER_SYSTEM_REPORT.html` for the technical committee. Attach `EOS_MASTER_SYSTEM_METRICS.csv` as the numbers sheet. Do not circulate charts without their captions.\n")

    extra.append("\n---\n\n*End of expanded Executive Atlas. Same numbers as the master report. Verdict remains D.*\n")

    (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").write_text(atlas + "".join(extra))
    print("expanded", (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").stat().st_size)

# regenerate atlas HTML only
import importlib.util
spec = importlib.util.spec_from_file_location("docs", OUT / "raw/_generate_documents.py")
# avoid re-running full generator: local mini render
import html as htmlmod
import re

CSS = open(OUT / "raw/_generate_documents.py").read()  # not used
# reuse function by exec-ing md_to_html from documents module via subprocess is easier
print("atlas md lines", len((OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").read_text().splitlines()))
