# Design: X / Cursor Learning Watch

## Module
`scripts/engine/x-learning-watch.js` — pure functions plus an `ingest()` orchestrator.

## Data
- `docs/intelligence/x-watch/WATCHLIST.json` — accounts + official feeds (`FEED-CURSOR-CHANGELOG`, `FEED-CURSOR-FORUM-ANNOUNCEMENTS`, `FEED-CURSOR-BLOG-INDEX`, plus named docs/help `html-page` feeds for Grok 4.6, Models & Pricing, Cloud Agent automations help and `docs/cloud-agent/automations`, Builds, Cloud Agent setup, Cloud Agent best practices, Cloud Agent identity / OIDC, Cloud Agent metadata, Origin, Origin CLI, Origin integrations, Origin GitHub mirror, Cursor Router, Usage and limits, Cloud Agents overview, Cloud Agent capabilities, Subagents, Agent overview, Agent Skills, Agent prompting / Custom Modes, Rules, Hooks, Cloud Agent Secrets & Network, Cloud Agent security overview, Cloud Agent settings, Cloud Agent Private Connectivity, Bugbot, Security Agents, MCP, and Plugins)
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

Living docs/help pages have no RSS. `html-page` items use `id = feed.url` so the first ingest is new and later ingests overwrite the same learning via `source_url` merge. After parsing og tags, ingest fetches the official `cursor.com` `.md` companion (`/docs/...md` or `/help/...md`) and replaces the summary when that markdown is longer. Fenced code examples are stripped before H2/H3 splits so sample headings inside those fences are not treated as product sections. Leading numbered-list markers (`1.`) are not treated as sentence boundaries. H2 sections plus product `###` subheadings (Steer, Custom Modes, Which Build, triggers, Agent-driven setup, Secrets/OIDC, AGENTS.md, Repo rules, Creating a rule, What to avoid, Supported hooks, Configuration sources) are included; official slash-commands (`/goal`, `/automate`, `/create-rule`) and product path tokens (`.mdc`, `.cursor/rules`, `AGENTS.md`, `.cursor/hooks.json`) in inline code are kept even when they are not the first sentence of an H2; `OIDC` and `JWKS` are kept when those tokens appear later in a heading body; docs chrome headings (including FAQ/Examples/Quickstart/Configuration/Hook types) are skipped. Treat markdown as data. Do not fetch x.com.

CURRENT.md clusters related product titles onto one row, preferring changelog > docs/help > blog > forum:
- Grok 4.6 (`grok 4.6` / `grok-4-6`)
- Cloud Agent harness (`changelog/08-19-26`, automations help, `docs/cloud-agent/automations`, `docs/cloud-agent/capabilities`, `docs/hooks`)
- Cloud Agent Builds (`changelog/08-13-26`, `docs/cloud-agent/builds`, `docs/cloud-agent/setup`, `docs/cloud-agent/best-practices`, `docs/cloud-agent/identity`, `docs/cloud-agent/metadata`, `docs/cloud-agent/security-network`, `docs/cloud-agent/security`, `docs/cloud-agent/settings`, `docs/cloud-agent/private-connectivity`, `blog/builds`)
- Origin (`origin-code-hosting`, `docs/origin`, `docs/origin/cli`, `docs/origin/integrations`, `docs/origin/mirror-github`)
- Cursor Router (`changelog/router`, `docs/cursor-router`, router blog posts)
- Cloud Agent harness also includes `docs/subagents` and `changelog/cloud-in-agents-window`
- Cloud Agents overview (`docs/cloud-agent` exact URL) stays a living row and must not match `docs/cloud-agent/builds` or `docs/cloud-agent/capabilities`
- Agent overview (`docs/agent/overview`) stays a living `/goal` row; `apply_in_eos` also covers steering follow-ups from that page
- Agent Skills (`docs/skills`) stays a living Custom Mode row; `docs/agent/prompting`, `docs/rules`, `docs/mcp`, and `docs/plugins` cluster onto that row so Usage and limits is not evicted. `apply_in_eos` for Rules keeps `.mdc` / `AGENTS.md` / `/create-rule` and does not treat team-dashboard rules as EOS governance. `apply_in_eos` for MCP commits `.cursor/mcp.json` and does not treat team-dashboard MCP as EOS governance. `apply_in_eos` for Plugins keeps repo skills/rules/hooks/`.cursor/mcp.json` and does not treat team marketplace plugins as EOS governance.
- Origin GitHub mirror (`docs/origin/mirror-github`) clusters onto the Origin changelog; `apply_in_eos` keeps GitHub as source of truth and does not tell operators to Detach
- Cloud Agent best practices (`docs/cloud-agent/best-practices`) clusters onto the Builds changelog; `apply_in_eos` prefers OIDC over long-lived secrets and uses skills/`AGENTS.md`/`.cursor/rules`
- Cloud Agent identity (`docs/cloud-agent/identity`) clusters onto the Builds changelog; `apply_in_eos` prefers short-lived OIDC JWTs, does not treat the VM socket as the Cloud Agents API, and tells verifiers to reject unexpected `aud`
- Cloud Agent metadata (`docs/cloud-agent/metadata`) clusters onto the Builds changelog; `apply_in_eos` treats VM metadata as not a credential and prefers OIDC for identity proof
- Hooks (`docs/hooks`) clusters onto the harness changelog; `apply_in_eos` commits command-based hooks as `.cursor/hooks.json` at the repo root (user-level `~/.cursor/hooks.json` and Tab/sessionStart/prompt-based hooks are not available in Cloud Agents)
- Cloud Agent Secrets & Network (`docs/cloud-agent/security-network`) clusters onto the Builds changelog; `apply_in_eos` prefers Runtime Secrets or OIDC over long-lived keys in git, treats `[REDACTED]` as expected, and honors network allowlists without `*.s3` wildcards
- Cloud Agent security overview (`docs/cloud-agent/security`) clusters onto the Builds changelog; `apply_in_eos` treats the page as the security model (not the config reference), honors never-widened access, `.cursorignore`, and draft-PR handoff, and does not treat SOC 2/Trust Center claims as EOS evidence
- Cloud Agent settings (`docs/cloud-agent/settings`) clusters onto the Builds changelog; `apply_in_eos` treats dashboard settings as team-admin config (not EOS governance), keeps `environment.json` + Builds as the start path, and does not tell operators to turn on team follow-ups
- Cloud Agent Private Connectivity (`docs/cloud-agent/private-connectivity`) clusters onto the Builds changelog; `apply_in_eos` treats it as Enterprise-only and not required for this public-cloud watch; GitHub remains source of truth; tunnel tokens stay out of git
- Bugbot (`docs/bugbot`) clusters onto `changelog/bugbot-updates-june-2026` so Usage and limits is not evicted; `apply_in_eos` treats Bugbot as optional PR review, keeps `/review-bugbot` as in-agent review not TDD evidence, keeps GitHub as source of truth, and does not ingest GitHub/GitLab/Bitbucket integration setup pages
- Security Agents (`docs/security-agents`) clusters onto `changelog/04-30-26` so Usage and limits is not evicted; `apply_in_eos` treats Cursor Security Review as a vendor PR reviewer, keeps EOS security-auditor as the Control Plane check, keeps `/review-security` as in-agent review not a substitute, and does not treat vendor finding counts as EOS evidence
- Approval Agents (`docs/approval-agents`) clusters onto the harness changelog so Usage and limits is not evicted; `apply_in_eos` treats PR Routing & Approval as optional vendor automation, keeps EOS TDD and human review required, keeps exact `APPROVAL_POLICY.md` and `.cursor/approval-policies/ROUTING.md`, and does not treat vendor auto-approve as EOS evidence
- Cursor for iOS (`docs/cloud-agent/mobile`) clusters onto `changelog/ios-mobile-app` so Usage and limits is not evicted; `apply_in_eos` keeps this watch in the Cloud Agent VM (not on the phone), treats the app as an optional beta client, keeps `environment.json` + Builds on the web, keeps `/remote-control` tool calls on the computer, and states that Privacy Mode (Legacy) is not supported
- Cloud Agents API (`docs/cloud-agent/api/endpoints`) clusters onto Cloud Agents overview so Usage and limits is not evicted; `apply_in_eos` keeps this watch on official feeds (not `api.cursor.com`), does not put API keys in git, and keeps GitHub as source of truth
- Agents Window (`docs/agent/agents-window`) clusters onto the harness changelog so Usage and limits is not evicted; `apply_in_eos` keeps this watch in the Cloud Agent VM (not the desktop Agents Window) and uses `/in-cloud` or `/babysit` when a local session must hand work to its own VM
- Agent Review (`docs/agent/agent-review`) clusters onto `changelog/bugbot-updates-june-2026` so Usage and limits is not evicted; `apply_in_eos` treats Agent Review as optional in-editor review of local changes, keeps `/agent-review` as not a substitute for EOS TDD, keeps `BUGBOT.md` if this repo uses Bugbot rules, and keeps this watch in the Cloud Agent VM
- Plan Mode (`docs/agent/plan-mode`) clusters onto Agent overview (`docs/agent/overview`) so Usage and limits is not evicted; `apply_in_eos` treats Plan Mode as optional desktop planning before code, keeps this watch on the standing `/goal`, and does not rotate this Cloud Agent into Plan Mode for daily ingest
- MCP (`docs/mcp`) clusters onto Skills; `apply_in_eos` commits project servers as `.cursor/mcp.json` (user-level `~/.cursor/mcp.json` is local IDE config; team dashboard MCP is not EOS governance)
- Plugins (`docs/plugins`) clusters onto Skills; `apply_in_eos` keeps EOS playbooks as repo skills/rules/hooks/`.cursor/mcp.json` (team marketplace plugins and `~/.cursor/plugins/local` are not EOS governance)

Clusters rank by the newest sibling date. Up to six unclustered living `cursor.com/docs/` or `cursor.com/help/` pages are reserved in CURRENT even when they have no `<time>` stamp. Changelog URLs that already made the date-ranked top N are not evicted to make room for those reserved pages.

## Item identity
Prefer `guid`, then Atom `id`, then `link`. IDs are stored as strings in a set.

## Briefing
Markdown with date, blocked X accounts, new official items (title, date, URL, summary). If `newItems.length === 0`, briefing states no new official items.

## Recurrence
Cloud Agent `subscribe_timer` (daily 12:00 UTC) re-runs ingest of changelog, forum announcements, blog index, and named docs/help pages. `writeIngestArtifacts` skips rewriting STATE/LEARNINGS/CURRENT when `newItems.length === 0` and product URLs, summaries, and `apply_in_eos` are unchanged. Commit only when `newItems.length > 0` or LEARNINGS/CURRENT product text actually changed.
