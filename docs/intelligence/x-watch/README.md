# X / Cursor learning watch

Keep EOS current on Cursor product changes starting from the requested account [https://x.com/cursor_ai](https://x.com/cursor_ai).

## What is connected
- Official changelog RSS: `https://cursor.com/changelog/rss.xml`
- Official forum announcements RSS: `https://forum.cursor.com/c/announcements/11.rss` (`/c/announcements.rss` redirects here; do not use `latest.rss`)
- Official blog index HTML: `https://cursor.com/blog` (no public blog RSS; parser reads article cards only)
- Watchlist of X handles (seed: `@cursor_ai`)
- Daily Cloud Agent timer (see run subscriptions)
- Cited `@cursor_ai` status URLs recorded from third-party articles in `CITED_X_POSTS.json` (`CITED_NOT_FETCHED`, never fetched from X)

## What is not connected
- X OAuth / X MCP (does not exist in this environment)
- Personal home timeline of accounts the operator follows
- Scraping of `x.com` (blocked; also legally unsafe after the 2026-08-24 Nitter cease-and-desist)

## Commands
```bash
node --test tests/x-learning-watch.test.js
npm run watch:x
```

`npm run watch:x` writes `STATE.json`, merges `LEARNINGS.json`, refreshes `CURRENT.md`, and writes a briefing under `briefings/` only when there are new official feed items (changelog, announcements, or blog index). Blog cards are enriched from each official article page (`og:description`); article fetches stay on `cursor.com`.

Add handles without fetching X:

```bash
node scripts/engine/x-learning-watch.js --add-handles anysphere some_handle
```

## Add more accounts
Edit `WATCHLIST.json` and append to `accounts`:

```json
{
  "handle": "some_handle",
  "url": "https://x.com/some_handle",
  "priority": "SECONDARY",
  "timeline_access": "BLOCKED"
}
```
