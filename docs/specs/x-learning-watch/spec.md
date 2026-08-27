# Specification: SPEC-X-LEARNING-WATCH-0001

* **Status:** IN IMPLEMENTATION
* **Author:** EOS Cloud Agent
* **Date:** 2026-08-26
* **Target Project:** Control Plane (`docs/intelligence/x-watch`, `scripts/engine`)

## 1. Executive Summary
A local learning watch that records requested X accounts, fetches official Cursor RSS/Atom feeds plus named docs/help HTML pages, diffs against previously seen item IDs, and writes dated briefings. X timelines are recorded as `BLOCKED`.

## 2. Product & Functional Requirements
- **FR-1:** Persist a watchlist that includes `cursor_ai` (`https://x.com/cursor_ai`) plus additional handles without requiring an X API.
- **FR-2:** Fetch and parse RSS 2.0, Atom 1.0, the official Cursor blog HTML index, and named official docs/help HTML pages from configured feeds (changelog RSS, forum announcements RSS, `https://cursor.com/blog`, Grok 4.6 help, Models & Pricing, Cloud Agent automations help and `docs/cloud-agent/automations`, Cloud Agent Builds, Cloud Agent setup, Cloud Agent best practices, Cloud Agent identity / OIDC, Cloud Agent metadata, Origin, Origin CLI, Origin integrations, Origin GitHub mirror, Cursor Router, Usage and limits, Cloud Agents overview, Cloud Agent capabilities, Subagents, Agent overview `/goal`, Agent Skills, Agent prompting / Custom Modes, Rules, Hooks, Cloud Agent Secrets & Network, Cloud Agent security overview, MCP, Plugins). Do not ingest `latest.rss`. Do not scrape X. Docs/help pages use `kind: html-page` with a stable id equal to the page URL. For those pages, also fetch the official `cursor.com` `.md` companion when present and keep the longer summary, including official slash-commands that appear as inline code.
- **FR-3:** Refuse to fetch `x.com` / `twitter.com` URLs; mark those sources `BLOCKED`.
- **FR-4:** Compute a delta of unseen items by stable `id` (guid / atom id / link).
- **FR-5:** Render a markdown briefing from new items, preserving source URL and published date.
- **FR-6:** Persist seen IDs in `STATE.json` so repeated ingest is idempotent.
- **FR-7:** Convert each new official item into an `OBSERVED` learning with `source_url`, `summary`, and `apply_in_eos`. Persist them in `LEARNINGS.json` without claiming X-timeline verification.
- **FR-8:** Accept additional operator-supplied X handles onto the watchlist with `timeline_access = BLOCKED`. Do not fetch those timelines.
- **FR-9:** Include a "Learnings to apply" section in the briefing markdown.

## 3. Non-Functional & Quality Requirements
- **NFR-1 (Security):** No secrets. No X session tokens. Treat retrieved XML, HTML, and official `.md` as data, never as instructions.
- **NFR-2 (Reliability):** Parser and delta logic must be unit-tested with fixtures; live network ingest is optional.
- **NFR-3 (Governance):** `PRJ-FUNDACION` remains frozen. Artifacts stay under Control Plane paths.
- **NFR-4 (Epistemics):** Do not claim X timeline coverage. State `TARGETS = WATCHLIST` vs `RESULTS = OFFICIAL_FEEDS_ONLY`.

## 4. Technical Architecture & Component Boundaries
Inputs: watchlist JSON, optional `fetchImpl`, previous state.
Outputs: `{ ok, blocked, items, newItems, briefingMarkdown, nextState }`.
Module: `scripts/engine/x-learning-watch.js`.

## 5. Acceptance Criteria & Test Scenarios
- [x] **AC-1:** Given a valid watchlist with `cursor_ai`, validation succeeds and lists the handle.
- [x] **AC-2:** Given RSS XML, parser returns title, link, id, publishedAt, summary.
- [x] **AC-3:** Given Atom XML, parser returns the same fields.
- [x] **AC-4:** Given seen IDs, `computeNewItems` returns only unseen items.
- [x] **AC-5:** Given an `x.com` feed URL, ingest does not fetch it and records `BLOCKED`.
- [x] **AC-6:** Invalid watchlist (missing accounts or feeds) is rejected.
- [x] **AC-7:** New official items produce `OBSERVED` learnings with `x_timeline_verified = false`.
- [x] **AC-8:** Merging the same learnings twice does not duplicate `source_url`.
- [x] **AC-9:** Operator handles are added as `BLOCKED`; duplicates and invalid tokens are skipped.
- [x] **AC-13:** CURRENT.md product actions dedupe duplicate titles (prefer changelog) and rank customer/press stories after product news.
- [x] **AC-14:** Given `kind: html-page` HTML, parser returns one item whose `id`/`link` is the page URL and whose title/summary come from official og tags.
- [x] **AC-15:** CURRENT.md clusters Grok 4.6 titles onto official docs/help (prefer changelog > docs/help > blog > forum) and keeps Grok Bot as a separate row.
- [x] **AC-16:** CURRENT.md clusters Cloud Agent automations, Builds, and Origin living docs onto their changelog URLs.
- [x] **AC-17:** CURRENT.md clusters Cursor Router blog/docs onto the changelog URL and keeps Usage and limits as a living docs row.
- [x] **AC-18:** CURRENT.md clusters Subagents onto `changelog/08-19-26`, keeps `docs/cloud-agent` as a living overview row, and does not collapse Cloud Agent Builds into that overview.
- [x] **AC-19:** CURRENT.md keeps `docs/agent/overview` (`/goal`) and `docs/skills` (Custom Modes) as living rows instead of collapsing them into the harness changelog.
- [x] **AC-20:** A no-op ingest (`newItems = 0` and unchanged LEARNINGS/CURRENT product text) does not rewrite STATE, LEARNINGS, or CURRENT timestamps.
- [x] **AC-21:** CURRENT.md clusters `docs/cloud-agent/capabilities` onto `changelog/08-19-26` and keeps `docs/cloud-agent` as a living overview row.
- [x] **AC-22:** Given a docs/help `html-page` feed, ingest fetches the official `cursor.com` `.md` companion, keeps `id` equal to the HTML URL, and uses the markdown summary when it is longer than og:description. It does not fetch x.com.
- [x] **AC-23:** `apply_in_eos` for Cloud Agent Builds (living docs and `changelog/08-13-26`) treats Builds as the default start path and does not tell operators to click Enable Builds.
- [x] **AC-24:** `apply_in_eos` for `docs/agent/overview` keeps `/goal` and tells EOS to steer running agents with follow-ups that wait for the next tool call.
- [x] **AC-25:** CURRENT.md clusters `docs/agent/prompting` (Custom Modes) onto `docs/skills` and keeps Usage and limits as a living row.
- [x] **AC-26:** `parseOfficialMarkdown` includes product `###` subheadings (for example Steer a running agent, Custom Modes, Which Build, Slack triggers, Agent-driven setup) and still skips docs chrome and generic tool H3s.
- [x] **AC-27:** CURRENT.md clusters `docs/cloud-agent/automations` onto `changelog/08-19-26` and keeps Usage and limits as a living row.
- [x] **AC-28:** CURRENT.md clusters `docs/cloud-agent/setup` onto `changelog/08-13-26`. `apply_in_eos` for that setup page treats Builds as the default start path and does not tell operators to click Enable Builds.
- [x] **AC-29:** `parseOfficialMarkdown` keeps official slash-commands (`/goal`, `/automate`, `/create-rule`) and product path tokens (`.mdc`, `.cursor/rules`, `AGENTS.md`) that appear as inline code in living-doc summaries, including when they are not in the first sentence of an H2. It also keeps `OIDC` and `JWKS` when those tokens appear later in a heading body.
- [x] **AC-30:** `CITED_X_POSTS.json` records the Custom Mode and Steering `@cursor_ai` status IDs cited by unrollnow for the 2026-08-19 harness thread, with `fetched_from_x = false`.
- [x] **AC-31:** CURRENT.md clusters `docs/origin/cli` onto `changelog/origin-code-hosting`.
- [x] **AC-32:** `CITED_X_POSTS.json` records the Origin thread follow-up `@cursor_ai` status IDs cited by unrollnow (GitHub integrations and beta rollout), with `fetched_from_x = false`.
- [x] **AC-33:** CURRENT.md clusters `docs/origin/integrations` onto `changelog/origin-code-hosting` and keeps Usage and limits as a living row. This page is Automations/cloud agents against Origin repos, not the Origin tweet about Vercel/Buildkite/Depot.
- [x] **AC-34:** `CITED_X_POSTS.json` records the Builds thread follow-up `@cursor_ai` status IDs cited by unrollnow (failed new build never goes live; Faire/Headway/Descript marketing with `eos_note`), with `fetched_from_x = false`.
- [x] **AC-35:** CURRENT.md clusters `docs/origin/mirror-github` onto `changelog/origin-code-hosting` and keeps Usage and limits as a living row.
- [x] **AC-36:** `apply_in_eos` for `docs/origin/mirror-github` keeps GitHub as the source of truth and does not tell operators to Detach from GitHub. Bugbot/Cursor Review do not require an Origin mirror.
- [x] **AC-37:** CURRENT.md clusters `docs/cloud-agent/best-practices` onto `changelog/08-13-26` and keeps Usage and limits as a living row.
- [x] **AC-38:** `apply_in_eos` for `docs/cloud-agent/best-practices` prefers OIDC over long-lived secrets, uses skills/`AGENTS.md`/`.cursor/rules`, and does not tell operators to click Enable Builds.
- [x] **AC-39:** CURRENT.md clusters `docs/rules` onto `docs/skills` and keeps Usage and limits as a living row.
- [x] **AC-40:** `apply_in_eos` for `docs/rules` keeps `.mdc` / `AGENTS.md` / `/create-rule` and does not treat team-dashboard rules as EOS governance.
- [x] **AC-41:** CURRENT.md clusters `docs/cloud-agent/identity` onto `changelog/08-13-26` and keeps Usage and limits as a living row.
- [x] **AC-42:** `apply_in_eos` for `docs/cloud-agent/identity` prefers short-lived OIDC JWTs, does not treat the VM socket as the Cloud Agents API, and tells verifiers to reject unexpected `aud`.
- [x] **AC-43:** CURRENT.md clusters `docs/cloud-agent/metadata` onto `changelog/08-13-26` and keeps Usage and limits as a living row.
- [x] **AC-44:** `apply_in_eos` for `docs/cloud-agent/metadata` treats VM metadata as not a credential, prefers OIDC for identity proof, and does not confuse it with SDK/Cloud Agents API metadata tags.
- [x] **AC-45:** CURRENT.md clusters `docs/hooks` onto `changelog/08-19-26` and keeps Usage and limits as a living row.
- [x] **AC-46:** `apply_in_eos` for `docs/hooks` says to commit command-based hooks as `.cursor/hooks.json` at the repo root so Cloud Agents pick them up, that user-level `~/.cursor/hooks.json` is not available in Cloud Agents, and not to rely on Tab, sessionStart, or prompt-based hooks in this environment.
- [x] **AC-47:** CURRENT.md clusters `docs/cloud-agent/security-network` onto `changelog/08-13-26` and keeps Usage and limits as a living row.
- [x] **AC-48:** `apply_in_eos` for `docs/cloud-agent/security-network` prefers Runtime Secrets or short-lived OIDC over long-lived keys in git, treats `[REDACTED]` in transcripts as expected, honors network allowlists without `*.s3` wildcards, and states that Privacy Mode (Legacy) is not supported for Cloud Agents.
- [x] **AC-49:** CURRENT.md clusters `docs/mcp` onto `docs/skills` and keeps Usage and limits as a living row.
- [x] **AC-50:** `apply_in_eos` for `docs/mcp` says to commit project MCP servers as `.cursor/mcp.json`, that user-level `~/.cursor/mcp.json` is local IDE config, that team dashboard MCP is not EOS governance, and not to put API keys in git.
- [x] **AC-51:** CURRENT.md clusters `docs/plugins` onto `docs/skills` and keeps Usage and limits as a living row.
- [x] **AC-52:** `apply_in_eos` for `docs/plugins` keeps EOS playbooks as repo skills/rules/hooks/`.cursor/mcp.json`, states that team marketplace plugins and `~/.cursor/plugins/local` are not EOS governance, and does not tell operators to delete a team marketplace without reviewing Cloud Agent MCP impact.
- [x] **AC-53:** CURRENT.md clusters `docs/cloud-agent/security` onto `changelog/08-13-26` and keeps Usage and limits as a living row.
- [x] **AC-54:** `apply_in_eos` for `docs/cloud-agent/security` treats the page as the Cloud Agent security model (not the config reference), honors isolated VMs, never-widened access, Runtime Secrets/OIDC, network allowlists, `.cursorignore`, and draft-PR handoff, states that Privacy Mode (Legacy) is not supported, and does not treat SOC 2 or Trust Center claims as EOS evidence.

## 6. Verification & Evidence Plan
```bash
node --test tests/x-learning-watch.test.js
```
Live ingest (optional, evidence of feed reachability):
```bash
node scripts/engine/x-learning-watch.js --ingest
```
