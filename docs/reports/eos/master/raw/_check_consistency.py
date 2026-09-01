#!/usr/bin/env python3
"""Assert markdown cites the same numbers as CSV/JSON."""
import csv
import json
import re
from pathlib import Path

OUT = Path("/workspace/docs/reports/eos/master")
md = (OUT / "EOS_MASTER_SYSTEM_REPORT.md").read_text()
atlas = (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").read_text()
data = json.loads((OUT / "EOS_MASTER_SYSTEM_DATA.json").read_text())
rows = list(csv.DictReader((OUT / "EOS_MASTER_SYSTEM_METRICS.csv").open()))
by = {r["metric"]: r["value"] for r in rows}

checks = [
    ("product_files_excluding_reports", "1046"),
    ("product_bytes", "4024024"),
    ("docs_files", "651"),
    ("src_files", "22"),
    ("scripts_files", "107"),
    ("static_test_or_it_calls", "777"),
    ("static_test_like_files", "132"),
    ("verify_strict_checks", "471"),
    ("verify_strict_duration_ms", "32"),
    ("git_commits_head_lineage", "75"),
    ("git_tracked_files", "1048"),
    ("import_edges", "1135"),
    ("duplicate_kernel_basenames", "3"),
    ("mcp_tools_declared", "20"),
    ("evidence_json_files", "84"),
    ("verdict_letter", "D"),
]
bad = []
for k, expected in checks:
    if by[k] != expected:
        bad.append(f"CSV {k}={by[k]!r} != {expected!r}")
    if expected not in md:
        bad.append(f"MD missing {expected} for {k}")

# JSON
if data["verdict"]["letter"] != "D":
    bad.append("JSON verdict != D")
if data["verify_strict"]["check_count"]["value"] != 471:
    bad.append("JSON verify != 471")
if str(data["testing"]["static_test_or_it_calls"]["value"]) not in md:
    bad.append("MD missing static test calls from JSON")
if "D — NOT_READY" not in atlas:
    bad.append("atlas missing verdict")
if md.count("\n## ") != 53:
    bad.append(f"section count {md.count(chr(10)+'## ')}")

# chart count
svgs = list((OUT / "charts").glob("*.svg"))
if len(svgs) < 10:
    bad.append(f"only {len(svgs)} charts")

print("checks", len(checks), "failures", len(bad))
for b in bad:
    print("FAIL", b)
if bad:
    raise SystemExit(1)
print("OK consistency")
