# X / Cursor learning watch

Keep EOS current on Cursor product changes starting from the requested account [https://x.com/cursor_ai](https://x.com/cursor_ai).

## What is connected
- Official changelog RSS: `https://cursor.com/changelog/rss.xml`
- Official forum announcements RSS: `https://forum.cursor.com/c/announcements/11.rss` (`/c/announcements.rss` redirects here; do not use `latest.rss`)
- Official blog index HTML: `https://cursor.com/blog` (no public blog RSS; parser reads article cards and short “Read more” links, then enriches each `cursor.com/blog/{slug}` page)
- Official docs/help HTML pages (no public docs RSS): Grok 4.6 help, Models & Pricing, Team Pricing (`docs/account/teams/pricing`; clustered onto Models & Pricing; not `docs/account/teams/setup`, `docs/account/teams/admin-api`, or `docs/enterprise` as their own feeds), Team Members (`docs/account/teams/members`; clustered onto Models & Pricing; not `docs/account/teams/setup`, `docs/account/teams/sso`, `docs/account/teams/admin-api`, `docs/account/teams/analytics-api`, or `docs/enterprise` as their own feeds), Help Pricing (`help/account-and-billing/pricing`; clustered onto Models & Pricing; not `help/account-and-billing/billing`, `help/account-and-billing/cancel`, `help/account-and-billing/cursor-start`, `help/account-and-billing/payment-not-applied`, `cursor.com/pricing`, `docs/account/teams/dashboard`, or `docs/account/teams/analytics` as their own feeds), Help Available models (`help/models-and-usage/available-models`; clustered onto Models & Pricing; not `help/models-and-usage/api-keys` or `help/models-and-usage/token-rate` as their own feeds), Help Cursor Router (`help/models-and-usage/cursor-router`; clustered onto `changelog/router`; not `help/models-and-usage/api-keys`, `help/account-and-billing/teams-management`, or `help/account-and-billing/overages` as their own feeds), Help Grok 4.5 (`help/models-and-usage/grok-4-5`; clustered onto Grok 4.6; not `help/models-and-usage/api-keys`, `help/account-and-billing/cursor-start`, or `help/models-and-usage/token-rate` as their own feeds), Help Agent mode (`help/ai-features/agent`; clustered onto Agent overview; not `help/ai-features/terminal`, `help/ai-features/browser`, or `help/ai-features/debug-mode` as their own feeds), Help Ask mode (`help/ai-features/ask-mode`; clustered onto Agent overview), Help Plan mode (`help/ai-features/plan-mode`; clustered onto Agent overview), Help Tab (`help/ai-features/tab`; clustered onto Agent overview), Help Inline edit (`help/ai-features/inline-edit`; clustered onto Agent overview), Help Cloud Agents (`help/ai-features/cloud-agents`; clustered onto Cloud Agents overview), Help Background Agents (`help/ai-features/background-agents`; clustered onto Cloud Agents overview), Help Cursor for iOS (`help/ai-features/mobile-app`; clustered onto Cursor for iOS), Help Shared transcripts (`help/ai-features/shared-transcripts`; clustered onto Agent overview), Help Bugbot (`help/ai-features/bugbot`; clustered onto Bugbot), Cloud Agent automations (help + `docs/cloud-agent/automations`), Cloud Agent Builds, Cloud Agent setup, Cloud Agent best practices, Cloud Agent identity / OIDC, Cloud Agent metadata, Origin (`changelog/start-from-scratch` clustered onto Origin so Router stays on CURRENT; not a separate unclustered changelog row), Origin CLI, Origin integrations, Origin GitHub mirror, Create an Origin repository (`docs/origin/create-repository`), Origin pull requests (`docs/origin/pull-requests`; not `docs/origin/git` as its own feed), Origin browse (`docs/origin/browse`), Origin repository settings (`docs/origin/settings`; clustered by URL, not title Settings), Origin codebase settings (`docs/origin/codebase-settings`; not `docs/origin/git` or `docs/api/origin` as their own feeds), Cursor CLI (`docs/cli/overview`; clustered onto Agent overview; not `docs/cli/installation` as its own feed), Using Agent in CLI (`docs/cli/using`; clustered onto Agent overview), CLI Shell Mode (`docs/cli/shell-mode`; clustered onto Agent overview; not `docs/cli/installation` or `docs/cli/reference/permissions` as their own feeds), CLI ACP (`docs/cli/acp`; clustered onto Agent overview; not `docs/cli/installation`, `docs/cli/reference/permissions`, or `docs/cli/changelog` as their own feeds), Headless CLI (`docs/cli/headless`; clustered onto Agent overview; not `docs/cli/installation`, `docs/cli/changelog`, or `docs/cli/github-actions` as their own feeds), TypeScript SDK (`docs/sdk/typescript`; clustered onto Cloud Agents overview), Python SDK (`docs/sdk/python`; clustered onto Cloud Agents overview), SDK Bridge (`docs/sdk/bridge`; clustered onto Cloud Agents overview; not `docs/sdk/changelog`, `github.com/cursor/sdk-bridge`, or the Cursor Cookbook GitHub repo as their own feeds), Cursor Router, Usage and limits, Cloud Agents overview, Cloud Agent capabilities, Subagents, Agent overview (`/goal`), Agent Skills, Agent prompting / Custom Modes, Rules, Hooks, Cloud Agent Secrets & Network, Cloud Agent security overview, Cloud Agent settings, Cloud Agent Private Connectivity, Bugbot, Security Agents, Approval Agents (`docs/approval-agents`), Cursor for iOS (`docs/cloud-agent/mobile`), Cloud Agents API (`docs/cloud-agent/api/endpoints`), Agents Window (`docs/agent/agents-window`), Agent Review (`docs/agent/agent-review`), Plan Mode (`docs/agent/plan-mode`), Debug Mode (`docs/agent/debug-mode`), Design Mode (`docs/agent/design-mode`), Browser (`docs/agent/tools/browser`), Terminal (`docs/agent/tools/terminal`), Search (`docs/agent/tools/search`), Canvases (`docs/agent/tools/canvas`), Worktrees (`docs/configuration/worktrees`), Agent Security (`docs/agent/security`; not `run-modes` as its own feed), MCP, Plugins, and Customize Cursor (`docs/customize-cursor`; clustered onto Skills)
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
