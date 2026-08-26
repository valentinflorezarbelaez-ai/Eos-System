# Design: X / Cursor Learning Watch

## Module
`scripts/engine/x-learning-watch.js` — pure functions plus an `ingest()` orchestrator.

## Data
- `docs/intelligence/x-watch/WATCHLIST.json` — accounts + official feeds (`FEED-CURSOR-CHANGELOG`, `FEED-CURSOR-FORUM-ANNOUNCEMENTS`, `FEED-CURSOR-BLOG-INDEX`, `FEED-CURSOR-DOCS-GROK-46`, `FEED-CURSOR-DOCS-MODELS-PRICING`)
- `docs/intelligence/x-watch/STATE.json` — `seen_ids`, last ingest timestamp
- `docs/intelligence/x-watch/briefings/YYYY-MM-DD.md` — human briefing

## Fetch policy
```
url host in {x.com, twitter.com, www.x.com, mobile.twitter.com}
  → do not fetch
  → record BLOCKED
else if feed.fetchable === true
  → HTTP GET
  → parse RSS, Atom, blog HTML index, or a single official HTML page (`kind: html-page`)
```

Living docs/help pages have no RSS. `html-page` items use `id = feed.url` so the first ingest is new and later ingests overwrite the same learning via `source_url` merge.

CURRENT.md clusters Grok 4.6 titles (`grok 4.6` / `grok-4-6`) onto one row, preferring changelog > docs/help > blog > forum, and ranks the cluster by the newest sibling date so undated help pages do not fall off the briefing.

## Item identity
Prefer `guid`, then Atom `id`, then `link`. IDs are stored as strings in a set.

## Briefing
Markdown with date, blocked X accounts, new official items (title, date, URL, summary). If `newItems.length === 0`, briefing states no new official items.

## Recurrence
Cloud Agent `subscribe_timer` (daily 12:00 UTC) re-runs ingest of changelog, forum announcements, blog index, and named docs/help pages, and only commits when `newItems.length > 0` or LEARNINGS/CURRENT product text actually changed.
