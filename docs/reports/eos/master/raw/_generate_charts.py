#!/usr/bin/env python3
"""Independent SVG charts with provenance captions. No invented metrics."""
from __future__ import annotations
import json
from pathlib import Path

OUT = Path("/workspace/docs/reports/eos/master")
CHARTS = OUT / "charts"
CHARTS.mkdir(exist_ok=True)
DATA = json.loads((OUT / "EOS_MASTER_SYSTEM_DATA.json").read_text())
inv = DATA["inventory"]["by_class"]
NOW = DATA["generated_at_utc"]


def svg_wrap(inner, w, h, title, caption, fname):
    s = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">
  <rect width="{w}" height="{h}" fill="#f7f5f0"/>
  <text x="28" y="32" font-family="Georgia, serif" font-size="16" fill="#1c1b18">{title}</text>
  {inner}
  <line x1="24" y1="{h-48}" x2="{w-24}" y2="{h-48}" stroke="#c9c4b8"/>
  <text x="28" y="{h-28}" font-family="ui-monospace, monospace" font-size="10" fill="#5c584e">{caption}</text>
</svg>
'''
    (CHARTS / fname).write_text(s)
    return fname


def bars(items, x0, y0, maxw, barh, gap, color="#3d4a3a"):
    mx = max(v for _, v in items) or 1
    parts = []
    for i, (lab, val) in enumerate(items):
        y = y0 + i * (barh + gap)
        w = int(maxw * val / mx)
        parts.append(f'<text x="{x0}" y="{y-6}" font-family="ui-sans-serif,sans-serif" font-size="11" fill="#2b2a26">{lab}</text>')
        parts.append(f'<rect x="{x0}" y="{y}" width="{w}" height="{barh}" fill="{color}"/>')
        parts.append(f'<text x="{x0+w+8}" y="{y+barh-4}" font-family="ui-monospace,monospace" font-size="11" fill="#1c1b18">{val}</text>')
    return "\n".join(parts)


# 1 inventory
items = sorted(((k, v["files"]) for k, v in inv.items()), key=lambda x: -x[1])
svg_wrap(
    bars(items, 28, 70, 520, 14, 16),
    780, 70 + len(items) * 30 + 60,
    "Product inventory by class (file count)",
    f"MEASURED {NOW} · source raw/product_baseline_inventory.json · excludes .git node_modules .missions docs/reports · count ≠ quality",
    "inventory_by_class.svg",
)

# 2 loc
loc = DATA["loc"]
svg_wrap(
    bars([
        ("src lines", loc["src"]["lines"]),
        ("scripts lines", loc["scripts"]["lines"]),
        ("tests lines", loc["tests"]["lines"]),
        ("src files", loc["src"]["files"]),
        ("scripts files", loc["scripts"]["files"]),
        ("tests js files (loc walk)", loc["tests"]["files"]),
    ], 28, 70, 500, 16, 18, "#4a3f32"),
    780, 340,
    "Lines of code by layer (heuristic)",
    f"MEASURED {loc['timestamp_utc']} · raw/loc_inventory.json · fn_like is regex not cyclomatic · scripts 3.4× src lines",
    "loc_by_layer.svg",
)

# 3 verify breakdown
vt = DATA["verify_strict"]["by_type"]
svg_wrap(
    bars([(k, v) for k, v in vt.items()] + [("TOTAL", DATA["verify_strict"]["check_count"]["value"])], 28, 70, 480, 22, 24, "#2f4a4a"),
    780, 280,
    "verify:strict check breakdown (MEASURED)",
    "MEASURED 2026-09-01T02:15:34Z · node scripts/verify-eos.js --strict --json · exit 0 · 32 ms · path/JSON/frontmatter ONLY — not tests",
    "verify_strict_breakdown.svg",
)

# 4 contradictory health claims
svg_wrap(
    bars([
        ("static test()/it() calls (this tree)", 777),
        ("CURRENT_STATE reported tests", 663),
        ("cli eos.js fallback", 608),
        ("historical verify:strict docs", 472),
        ("verify:strict this audit", 471),
        ("freeze suite reported", 20),
        ("726 previous-memory", 0),
        ("615 previous-memory", 0),
    ], 28, 70, 480, 16, 18, "#6b3a32"),
    820, 400,
    "Test-health claims vs this audit (do not sum)",
    "CONTRADICTED / MEASURED / REPORTED mixed · 726 & 615 = 0 hits in tree · 0 means ABSENT claim not a pass count · see raw/claim_string_hits.json",
    "test_health_contradictions.svg",
)

# 5 git commits by day
days = DATA["git"]["commits_by_date"]["value"]
svg_wrap(
    bars([(k, v) for k, v in days.items()], 28, 70, 500, 22, 22, "#3d4450"),
    780, 280,
    "Commits on HEAD lineage by author date",
    "MEASURED 2026-09-01T02:16:34Z · git log --format=%ad --date=short | sort | uniq -c · 75 commits 2026-08-10..21",
    "git_commits_by_date.svg",
)

# 6 risk severity
from collections import Counter
c = Counter(r["sev"] for r in DATA["risks"])
svg_wrap(
    bars([("P0", c["P0"]), ("P1", c["P1"]), ("P2", c["P2"]), ("P3", c["P3"])], 28, 70, 500, 28, 26, "#5a3030"),
    720, 280,
    "Risk register counts by severity (this audit)",
    f"INFERRED taxonomy on OBSERVED/CONTRADICTED facts · n={len(DATA['risks'])} · EOS_MASTER_RISK_REGISTER.json · not a residual-risk score",
    "risk_severity_counts.svg",
)

# 7 capability operational
ops = Counter(x["operational"] for x in DATA["capabilities"])
svg_wrap(
    bars(sorted(ops.items(), key=lambda x: -x[1]), 28, 70, 480, 20, 20, "#3a4458"),
    780, 320,
    "Capability matrix — operational field (not status of code)",
    "Rule: code existence ≠ operational capability · EOS_MASTER_CAPABILITY_MATRIX.json · most items NOT_RUN / UNKNOWN",
    "capability_operational.svg",
)

# 8 radar 29 as ordinal bars (honest: not a fake spider %)
radar = DATA["radar29"]
svg_wrap(
    bars([(d["dimension"][3:28], d["ordinal_visual_only"]) for d in radar], 28, 58, 360, 8, 10, "#445046"),
    720, 58 + 29 * 18 + 70,
    "Graph 29 — ordinal visual mapping only (0–5)",
    "NOT a completeness % · mapping VERIFIED/MEASURED=5 … CONTRADICTED/NOT_READY=0 · see §42 · inventing a single score is forbidden",
    "radar_graph_29_ordinal.svg",
)

# 9 dashboard states
dash = Counter(d["state"] for d in radar)
svg_wrap(
    bars(sorted(dash.items(), key=lambda x: -x[1]), 28, 70, 480, 18, 16, "#4a4034"),
    780, 70 + len(dash) * 34 + 70,
    "Executive dashboard — Graph 29 state histogram",
    "Counts of epistemic/state labels across 29 dimensions · NO fake completeness percentage",
    "dashboard_state_histogram.svg",
)

# 10 findings polarity
fp = Counter(f["polarity"] for f in DATA["findings"])
svg_wrap(
    bars(list(fp.items()), 28, 70, 480, 24, 22, "#3d4a3a"),
    720, 280,
    "Top-20 findings polarity",
    "Auditor classification of F01–F20 · POS is not a score · NEG/CONTRADICTED dominate material risk",
    "findings_polarity.svg",
)

print("charts", len(list(CHARTS.glob('*.svg'))))
