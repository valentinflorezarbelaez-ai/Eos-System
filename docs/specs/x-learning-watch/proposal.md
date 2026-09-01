# Proposal: X / Cursor Learning Watch

* **Status:** APPROVED FOR CONTROL-PLANE IMPLEMENTATION
* **Date:** 2026-08-26
* **Project ID:** `PRJ-X-LEARNING-WATCH`
* **Risk class:** `MEDIUM` (EOS-Lab / docs/intelligence only; no PRJ-FUNDACION writes)
* **Authorization:** `AUTONOMOUS_WITH_AUDIT` inside Control Plane

## Intent
Keep EOS current on what Cursor publishes, starting from the requested account `https://x.com/cursor_ai`, so the operator can learn product changes as they ship.

## Constraint (evidence)
Cursor Cloud Agents have no X MCP and no native X subscription. `x.com` returns HTTP 403 to unauthenticated fetch. X API access is paid and out of scope. Nitter received a cease-and-desist on 2026-08-24. Therefore this watch **must not scrape X**.

## Substitute (authorized)
Ingest official, fetchable Cursor feeds (changelog RSS, forum announcements RSS, the official blog HTML index, and named docs/help HTML pages) and keep an extensible watchlist of X handles whose timelines remain `BLOCKED` until a lawful connector exists.

## Out of scope
- Personal X home timeline ("everyone I follow") without OAuth
- Twitter/X API client
- Scraping, Nitter, or session-token workarounds
- Writes to `PRJ-FUNDACION`
