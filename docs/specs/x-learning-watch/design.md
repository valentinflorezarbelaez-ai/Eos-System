# Design: X / Cursor Learning Watch

## Module
`scripts/engine/x-learning-watch.js` — pure functions plus an `ingest()` orchestrator.

## Data
- `docs/intelligence/x-watch/WATCHLIST.json` — accounts + official feeds
- `docs/intelligence/x-watch/STATE.json` — `seen_ids`, last ingest timestamp
- `docs/intelligence/x-watch/briefings/YYYY-MM-DD.md` — human briefing

## Fetch policy
```
url host in {x.com, twitter.com, www.x.com, mobile.twitter.com}
  → do not fetch
  → record BLOCKED
else if feed.fetchable === true
  → HTTP GET
  → parse RSS or Atom
```

## Item identity
Prefer `guid`, then Atom `id`, then `link`. IDs are stored as strings in a set.

## Briefing
Markdown with date, blocked X accounts, new official items (title, date, URL, summary). If `newItems.length === 0`, briefing states no new official items.

## Recurrence
Cloud Agent `subscribe_timer` (daily 12:00 UTC) re-runs ingest and only commits when `newItems.length > 0`.
