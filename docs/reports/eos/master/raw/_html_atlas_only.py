#!/usr/bin/env python3
from pathlib import Path
import html as htmlmod
import re

OUT = Path("/workspace/docs/reports/eos/master")
CSS = """
@page { size: A4; margin: 16mm; }
:root { --ink:#1c1b18; --muted:#5c584e; --rule:#c9c4b8; --paper:#f7f5f0; --card:#fffdf8; }
html { background: var(--paper); }
body { font-family: Georgia, serif; color: var(--ink); background: var(--paper); margin: 0 auto; max-width: 880px; padding: 28px; line-height: 1.45; font-size: 13px; }
h1 { font-size: 24px; border-bottom: 2px solid var(--ink); padding-bottom: 8px; }
h2 { font-size: 17px; margin-top: 1.8em; border-top: 1px solid var(--rule); padding-top: 0.7em; page-break-before: always; }
h3 { font-size: 14px; }
table { border-collapse: collapse; width: 100%; font-size: 11px; margin: 0.6em 0 1em; page-break-inside: avoid; }
th, td { border: 1px solid var(--rule); padding: 3px 5px; text-align: left; vertical-align: top; }
th { background: #ece8df; font-family: sans-serif; }
code { font-family: ui-monospace, monospace; font-size: 10.5px; }
img.chart { max-width: 100%; height: auto; border: 1px solid var(--rule); margin: 8px 0 14px; }
footer { color: var(--muted); font-size: 11px; margin-top: 36px; }
"""

def md_to_html_simple(title, body_md):
    lines = body_md.splitlines()
    out = [f"<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><title>{htmlmod.escape(title)}</title><style>{CSS}</style></head><body>"]
    i = 0
    in_table = False
    in_ul = False

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
        if line.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].replace("|", "").replace(":", "").replace("-", "").strip()) <= set():
            close_lists(); close_table()
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
            close_lists(); out.append(f"<p>{inline(line[2:])}</p>")
        elif line.startswith("- "):
            if not in_ul:
                out.append("<ul>"); in_ul = True
            out.append(f"<li>{inline(line[2:])}</li>")
        elif re.match(r"^\d+\.\s", line):
            close_lists(); out.append(f"<p>{inline(line)}</p>")
        elif line.strip() == "---":
            close_lists(); out.append("<hr/>")
        elif line.strip() == "":
            close_lists()
        else:
            close_lists(); out.append(f"<p>{inline(line)}</p>")
        i += 1
    close_lists(); close_table()
    out.append("<footer>EOS Master Executive Atlas · print-ready · Verdict D NOT_READY</footer></body></html>")
    return "\n".join(out)

md = (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.md").read_text()
(OUT / "EOS_MASTER_EXECUTIVE_ATLAS.html").write_text(md_to_html_simple("EOS Master Executive Atlas", md))
print("md", len(md), "html", (OUT / "EOS_MASTER_EXECUTIVE_ATLAS.html").stat().st_size)
