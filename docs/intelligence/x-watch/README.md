# X / Cursor learning watch

Keep EOS current on Cursor product changes starting from the requested account [https://x.com/cursor_ai](https://x.com/cursor_ai).

## What is connected
- Official changelog RSS: `https://cursor.com/changelog/rss.xml`
- Official forum announcements RSS: `https://forum.cursor.com/c/announcements/11.rss` (`/c/announcements.rss` redirects here; do not use `latest.rss`)
- Official blog index HTML: `https://cursor.com/blog` (no public blog RSS; parser reads article cards and short “Read more” links, then enriches each `cursor.com/blog/{slug}` page)
- Official docs/help HTML pages (no public docs RSS): Grok 4.6 help, Models & Pricing, Cloud Agent automations (help + `docs/cloud-agent/automations`), Cloud Agent Builds, Cloud Agent setup, Cloud Agent best practices, Cloud Agent identity / OIDC, Cloud Agent metadata, Origin, Origin CLI, Origin integrations, Origin GitHub mirror, Cursor Router, Usage and limits, Cloud Agents overview, Cloud Agent capabilities, Subagents, Agent overview (`/goal`), Agent Skills, Agent prompting / Custom Modes, Rules, Hooks, Cloud Agent Secrets & Network, Cloud Agent security overview, Cloud Agent settings, MCP, and Plugins
- Watchlist of X handles (seed: `@cursor_ai`)
- Daily Cloud Agent timer (see run subscriptions)
- Cited `@cursor_ai` status URLs recorded from third-party articles in `CITED_X_POSTS.json` (`CITED_NOT_FETCHED`, never fetched from X). The 2026-08-19 harness thread is six cited tweets. The 2026-08-17 Origin thread is three. The 2026-08-13 Builds thread is three (including failed-build never goes live, from unrollnow).

## What is not connected
- X OAuth / X MCP (does not exist in this environment)
- Personal home timeline of accounts the operator follows
- Scraping of `x.com` (blocked; also legally unsafe after the 2026-08-24 Nitter cease-and-desist)

## Commands
```bash
node --test tests/x-learning-watch.test.js
npm run watch:x
```

`npm run watch:x` writes `STATE.json`, merges `LEARNINGS.json`, refreshes `CURRENT.md` (product news first; customer stories last; Grok 4.6 cluster prefers docs/help over blog/forum; duplicate titles keep the changelog URL), and writes a briefing under `briefings/` only when there are new official feed items (changelog, announcements, blog index, or docs/help pages). Blog cards are enriched from each official article page (`og:description`); article fetches stay on `cursor.com`. Docs/help `html-page` feeds use the page URL as a stable id, fetch the official `.md` companion on `cursor.com` when present, and overwrite the same learning when that summary gets richer.

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
