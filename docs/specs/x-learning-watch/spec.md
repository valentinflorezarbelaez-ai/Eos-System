# Specification: SPEC-X-LEARNING-WATCH-0001

* **Status:** IN IMPLEMENTATION
* **Author:** EOS Cloud Agent
* **Date:** 2026-08-26
* **Target Project:** Control Plane (`docs/intelligence/x-watch`, `scripts/engine`)

## 1. Executive Summary
A local learning watch that records requested X accounts, fetches official Cursor RSS/Atom feeds plus named docs/help HTML pages, diffs against previously seen item IDs, and writes dated briefings. X timelines are recorded as `BLOCKED`.

## 2. Product & Functional Requirements
- **FR-1:** Persist a watchlist that includes `cursor_ai` (`https://x.com/cursor_ai`) plus additional handles without requiring an X API.
- **FR-2:** Fetch and parse RSS 2.0, Atom 1.0, the official Cursor blog HTML index, and named official docs/help HTML pages from configured feeds (changelog RSS, forum announcements RSS, `https://cursor.com/blog`, Grok 4.6 help, Models & Pricing, Cloud Agent automations, Cloud Agent Builds, Origin, Cursor Router, Usage and limits, Cloud Agents overview, Cloud Agent capabilities, Subagents, Agent overview `/goal`, Agent Skills, Agent prompting / Custom Modes). Do not ingest `latest.rss`. Do not scrape X. Docs/help pages use `kind: html-page` with a stable id equal to the page URL. For those pages, also fetch the official `cursor.com` `.md` companion when present and keep the longer summary.
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
- [x] **AC-26:** `parseOfficialMarkdown` includes product `###` subheadings (for example Steer a running agent, Custom Modes, Which Build) and still skips docs chrome and generic tool H3s.

## 6. Verification & Evidence Plan
```bash
node --test tests/x-learning-watch.test.js
```
Live ingest (optional, evidence of feed reachability):
```bash
node scripts/engine/x-learning-watch.js --ingest
```
