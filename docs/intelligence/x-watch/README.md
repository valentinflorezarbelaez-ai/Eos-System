# X / Cursor learning watch

Keep EOS current on Cursor product changes starting from the requested account [https://x.com/cursor_ai](https://x.com/cursor_ai).

## What is connected
- Official changelog RSS: `https://cursor.com/changelog/rss.xml`
- Watchlist of X handles (seed: `@cursor_ai`)
- Daily Cloud Agent timer (see run subscriptions)

## What is not connected
- X OAuth / X MCP (does not exist in this environment)
- Personal home timeline of accounts the operator follows
- Scraping of `x.com` (blocked; also legally unsafe after the 2026-08-24 Nitter cease-and-desist)

## Commands
```bash
node --test tests/x-learning-watch.test.js
npm run watch:x
```

`npm run watch:x` writes `STATE.json` and a briefing under `briefings/` only when there are new changelog items.

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
