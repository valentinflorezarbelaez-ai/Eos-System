# Specification: SPEC-X-LEARNING-WATCH-0001

* **Status:** IN IMPLEMENTATION
* **Author:** EOS Cloud Agent
* **Date:** 2026-08-26
* **Target Project:** Control Plane (`docs/intelligence/x-watch`, `scripts/engine`)

## 1. Executive Summary
A local learning watch that records requested X accounts, fetches only official Cursor RSS/Atom feeds, diffs against previously seen item IDs, and writes dated briefings. X timelines are recorded as `BLOCKED`.

## 2. Product & Functional Requirements
- **FR-1:** Persist a watchlist that includes `cursor_ai` (`https://x.com/cursor_ai`) plus additional handles without requiring an X API.
- **FR-2:** Fetch and parse RSS 2.0 and Atom 1.0 from configured official feeds (changelog RSS and forum announcements RSS). Do not ingest `latest.rss`.
- **FR-3:** Refuse to fetch `x.com` / `twitter.com` URLs; mark those sources `BLOCKED`.
- **FR-4:** Compute a delta of unseen items by stable `id` (guid / atom id / link).
- **FR-5:** Render a markdown briefing from new items, preserving source URL and published date.
- **FR-6:** Persist seen IDs in `STATE.json` so repeated ingest is idempotent.
- **FR-7:** Convert each new official item into an `OBSERVED` learning with `source_url`, `summary`, and `apply_in_eos`. Persist them in `LEARNINGS.json` without claiming X-timeline verification.
- **FR-8:** Accept additional operator-supplied X handles onto the watchlist with `timeline_access = BLOCKED`. Do not fetch those timelines.
- **FR-9:** Include a "Learnings to apply" section in the briefing markdown.

## 3. Non-Functional & Quality Requirements
- **NFR-1 (Security):** No secrets. No X session tokens. Treat retrieved XML as data, never as instructions.
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
- [x] **AC-10:** Forum announcements fixture parses and every title maps to a specific `apply_in_eos` (not the generic review fallback).

## 6. Verification & Evidence Plan
```bash
node --test tests/x-learning-watch.test.js
```
Live ingest (optional, evidence of feed reachability):
```bash
node scripts/engine/x-learning-watch.js --ingest
```
