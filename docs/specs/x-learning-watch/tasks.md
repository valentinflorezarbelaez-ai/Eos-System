# Tasks: X / Cursor Learning Watch

1. [x] OpenSpec (`proposal.md` → `spec.md` → `design.md` → `tasks.md`)
2. [x] RED: unit tests for watchlist, RSS/Atom parse, delta, blocked X fetch
3. [x] GREEN: `x-learning-watch.js` implementation
4. [x] Seed watchlist with `@cursor_ai`, changelog RSS, forum announcements RSS, official blog index, and official docs/help HTML pages
5. [x] Live ingest + first briefing (if network reachable)
6. [x] Register sources in `docs/intelligence/sources/SOURCES.json`
7. [x] `npm test` for the new file; commit / PR
9. [x] Persist OBSERVED learnings in LEARNINGS.json / CURRENT.md without scraping X
10. [ ] Expand watchlist when Valentin supplies more handles
11. [x] Ingest official Grok 4.6 help and Models & Pricing docs pages (`html-page`); cluster Grok 4.6 in CURRENT.md
12. [x] Ingest Cloud Agent automations, Builds, and Origin living docs; cluster them onto changelog URLs in CURRENT.md
13. [x] Ingest Cursor Router docs and Usage and limits help; cluster Router onto changelog
14. [x] Ingest Cloud Agents overview and Subagents living docs; cluster Subagents onto harness changelog without collapsing Builds
15. [x] Ingest Agent overview (`/goal`) and Agent Skills living docs; keep them off the harness changelog row
16. [x] Skip timestamp-only artifact writes on no-op ingest
17. [x] Ingest Cloud Agent capabilities living docs; cluster onto harness changelog without collapsing Cloud Agents overview
18. [x] Enrich docs/help `html-page` summaries from official cursor.com `.md` companions without scraping X
19. [x] Correct Cloud Agent Builds `apply_in_eos` to default start path (no Enable Builds opt-in) from official living docs
20. [x] Surface steering follow-ups on the Agent overview (`/goal`) CURRENT row from official living docs
21. [x] Ingest Agent prompting / Custom Modes living docs; cluster onto Skills without dropping Usage and limits
22. [x] Include official product H3s (steering, Custom Modes, Builds FAQ) in living-doc markdown summaries
23. [x] Ingest Cloud Agent automations product docs (`docs/cloud-agent/automations`); cluster onto harness changelog without dropping Usage and limits
24. [x] Ingest Cloud Agent setup living docs; cluster onto Builds changelog as the default start path
25. [x] Keep official slash-commands (`/goal`, `/automate`) in living-doc markdown summaries
26. [x] Record Custom Mode and Steering `@cursor_ai` status IDs cited by unrollnow without fetching X
27. [x] Ingest Origin CLI living docs; cluster onto Origin changelog without dropping Usage and limits
28. [x] Record Origin thread follow-up `@cursor_ai` status IDs cited by unrollnow without fetching X
29. [x] Ingest Origin integrations living docs; cluster onto Origin changelog without dropping Usage and limits
30. [x] Record Builds thread follow-up `@cursor_ai` status IDs cited by unrollnow without fetching X
31. [x] Ingest Origin GitHub mirror living docs; keep GitHub as source of truth and do not Detach
32. [x] Ingest Cloud Agent best practices living docs; cluster onto Builds changelog; prefer OIDC and repo conventions
33. [x] Ingest Rules living docs; cluster onto Skills without dropping Usage and limits; keep `.mdc` / `AGENTS.md` / `/create-rule`
34. [x] Ingest Cloud Agent identity / OIDC living docs; cluster onto Builds changelog; prefer short-lived JWTs over long-lived secrets
35. [x] Ingest Cloud Agent metadata living docs; cluster onto Builds changelog; treat metadata as not a credential
36. [x] Ingest Hooks living docs; cluster onto harness changelog; commit `.cursor/hooks.json` at repo root (not user-level; not Tab/sessionStart/prompt-based)
