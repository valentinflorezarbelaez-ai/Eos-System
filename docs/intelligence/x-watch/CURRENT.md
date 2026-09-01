# Cursor / X watch — current learnings

Epistemic status: `TARGETS = WATCHLIST` | `RESULTS = OFFICIAL_FEEDS_ONLY`. `x_timeline_verified = false` for every row.

Updated: 2026-09-01T15:47:56.620Z
Store size: 199

## Official product actions
- **Start from scratch, without a repo** — Start from scratch creates an Origin repo without GitHub. GitHub remains source of truth for this synced repo. Do not Start from scratch or create an Origin repo for this watch. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.
  https://cursor.com/changelog/start-from-scratch
- **Cloud Agents and Cursor Harness Improvements** — Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS. Honor auto-CI-fix on PRs this agent opens.
  https://cursor.com/changelog/08-19-26
- **Cloud Agents Start 3x Faster with Builds** — Treat Cloud Agent Builds as the default start path. Keep install idempotent in environment.json; use start for live services.
  https://cursor.com/changelog/08-13-26
- **Cursor Router** — Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.
  https://cursor.com/changelog/router
- **Grok 4.6** — Honor Auto vs Composer pool and Grok 4.6 included-credit treatment from official help. Do not treat vendor quality claims as EOS evidence.
  https://cursor.com/help/models-and-usage/grok-4-6
- **Models & Pricing** — Honor included Cursor Models vs Other Models pools. Do not treat vendor rates as EOS budget evidence.
  https://cursor.com/docs/models-and-pricing
- **Cursor Agent** — Keep long-lived EOS objectives in /goal. Steer running agents with follow-ups that wait for the next tool call.
  https://cursor.com/docs/agent/overview
- **Agent Skills** — Pin an EOS skill as a Custom Mode when a session must stay on one playbook.
  https://cursor.com/docs/skills
- **Cloud Agents** — Cloud Agents run on isolated VMs. Use environment.json + Builds; keep this watch on official feeds, not X.
  https://cursor.com/docs/cloud-agent
- **Usage and limits** — Honor included quota. Stop this daily watch rather than switching to paid on-demand.
  https://cursor.com/help/models-and-usage/usage-limits

## @cursor_ai posts cited by third parties (not fetched)
- Cloud Agents can now start from scratch — cited by https://aicatchup.com/news/cursor-start-from-scratch-origin-vercel (not fetched from X)
  Start from scratch creates an Origin repo without GitHub. GitHub remains source of truth for this synced repo. Do not Start from scratch or create an Origin repo for this watch.
  https://x.com/cursor_ai/status/2093077548649570777
- the flow can use a private or internal repository — cited by https://aicatchup.com/news/cursor-start-from-scratch-origin-vercel (not fetched from X)
  https://x.com/cursor_ai/status/2093077549786300747
- We're continuing to improve cloud agents — cited by https://aicatchup.com/news/cursor-cloud-agents-event-triggers-goals-subagents (not fetched from X)
  https://x.com/cursor_ai/status/2090136956101414982
- Cursor can now monitor your PRs — cited by https://aicatchup.com/news/cursor-cloud-agents-event-triggers-goals-subagents (not fetched from X)
  https://x.com/cursor_ai/status/2090136958156546150
- Use any skill as a Custom Mode — cited by https://www.unrollnow.com/status/2090136956101414982 (not fetched from X)
  https://x.com/cursor_ai/status/2090136960295645431
- Subagents can now run on their own virtual machines — cited by https://aicatchup.com/news/cursor-cloud-agents-event-triggers-goals-subagents (not fetched from X)
  https://x.com/cursor_ai/status/2090136962376081531
- Steering now waits for the next tool call — cited by https://www.unrollnow.com/status/2090136956101414982 (not fetched from X)
  https://x.com/cursor_ai/status/2090136964116721902
- Use /goal — cited by https://aicatchup.com/news/cursor-cloud-agents-event-triggers-goals-subagents (not fetched from X)
  https://x.com/cursor_ai/status/2090136966121599117
- Origin, our code hosting platform, is now live — cited by https://www.unrollnow.com/status/2089399057659596847 (not fetched from X)
  https://x.com/cursor_ai/status/2089399057659596847
- We've partnered with some of the top GitHub integrations. Vercel, Buildkite, and Depot are already available with more coming soon. — cited by https://www.unrollnow.com/status/2089399057659596847 (not fetched from X)
  Origin GitHub integrations are optional vendor marketplace. GitHub remains source of truth for this synced repo.
  https://x.com/cursor_ai/status/2089399059488350447
- We're rolling out the beta starting today. — cited by https://www.unrollnow.com/status/2089399057659596847 (not fetched from X)
  https://x.com/cursor_ai/status/2089399061040308603
- Cloud agents now start 3x faster so you can hand them ambitious, long-running tasks — cited by https://www.unrollnow.com/status/2087941307624980753 (not fetched from X)
  https://x.com/cursor_ai/status/2087941307624980753
- Builds also make agents more resilient. A failed new build never goes live. Agents keep using the last successful build. — cited by https://www.unrollnow.com/status/2087941307624980753 (not fetched from X)
  https://x.com/cursor_ai/status/2087941309013397970
- Customers like Faire, Headway, and Descript are seeing agent start times drop from minutes to seconds with builds — cited by https://www.unrollnow.com/status/2087941307624980753 (not fetched from X)
  Customer names are vendor marketing, not EOS evidence.
  https://x.com/cursor_ai/status/2087941310217064850
- Cursor is now part of @SpaceX. Today, we have officially closed our acquisition. — cited by https://www.unrollnow.com/status/2088249881718919393 (not fetched from X)
  Cited X announcement mirrored by official blog https://cursor.com/blog/joining-spacex. Do not treat SpaceX/Grok marketing as EOS production evidence.
  https://x.com/cursor_ai/status/2088249881718919393
- Cursor Router keeps improving from millions of in-product user interactions each week — cited by https://www.unrollnow.com/status/2085390483740676365 (not fetched from X)
  Vendor routing and cost claims are not EOS evidence. EOS rules still bind model and governance choices.
  https://x.com/cursor_ai/status/2085390483740676365
- Cursor can now read, write, and act across your Google Workspace — cited by https://aicatchup.com/news/cursor-google-workspace-plugins (not fetched from X)
  Google Workspace plugins are optional vendor marketplace/Customize install. Do not rotate this Cloud Agent into marketplace plugin install for daily ingest. Official changelog names Drive, Gmail, and Calendar; do not treat Docs/Sheets as part of this announcement.
  https://x.com/cursor_ai/status/2084376701539405904
- Cloud agents are now 20-30% more token efficient, and 80% more efficient on runs with computer use — cited by https://aicatchup.com/news/cursor-cloud-agents-token-efficiency-computer-use (not fetched from X)
  Vendor efficiency claim cited by a third party. Do not treat token-percentage marketing as EOS evidence.
  https://x.com/cursor_ai/status/2084317547608911986
- Cursor is now on iPad. All the power of Cursor on iPhone, with more room to work with agents — cited by https://www.unrollnow.com/status/2082532273421955513 (not fetched from X)
  iPad/iOS can launch Cloud Agents; this watch still runs in the Cloud Agent VM, not on the tablet.
  https://x.com/cursor_ai/status/2082532273421955513
- Today we're launching Cursor Start, a new ₹649/month plan for developers in India — cited by https://www.unrollnow.com/status/2081978255004053560 (not fetched from X)
  Cursor Start is India regional pricing. Do not switch this watch to Start. Honor included quota. Do not add help/account-and-billing/cursor-start as a feed.
  https://x.com/cursor_ai/status/2081978255004053560
- Introducing Cursor Router, our intelligent model router that selects the right model for the task at hand — cited by https://www.unrollnow.com/status/2079993729532989500 (not fetched from X)
  Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices. Official docs restrict Router to Teams and Enterprise. Vendor cost-percentage claims are not EOS evidence.
  https://x.com/cursor_ai/status/2079993729532989500
- Introducing side chats, a new way to ask questions and explore ideas without interrupting your main conversation — cited by https://aicatchup.com/news/cursor-side-chats-durable-agent-threads (not fetched from X)
  Side chats are local-only and not available for Cloud Agents. This watch already runs in the Cloud Agent VM. Keep the Cursor/X learning goal on the main thread. Do not rotate this Cloud Agent into /side.
  https://x.com/cursor_ai/status/2075686268113916023
- GPT-5.6 Sol, Terra, and Luna are now available in Cursor — cited by https://www.unrollnow.com/status/2075265504105611674 (not fetched from X)
  GPT availability is vendor catalog news. EOS model policy stays in workspace rules. Do not treat CursorBench scores as EOS evidence.
  https://x.com/cursor_ai/status/2075265504105611674
- We've partnered with SpaceXAI to train Grok 4.5. It's our most powerful model yet and the first we've built for more than software engineering. — cited by https://www.unrollnow.com/status/2074915744999969059 (not fetched from X)
  Grok 4.5 availability is vendor catalog news. EOS still evidence-gates quality claims. The first-week double usage was a launch promo, not standing pricing. Honor included-credit treatment from official help. Do not treat vendor quality claims as EOS evidence.
  https://x.com/cursor_ai/status/2074915744999969059
- Introducing Cursor for iOS. Build from anywhere by launching always-on cloud agents — cited by https://aicatchup.com/news/cursor-ios-public-beta (not fetched from X)
  Composer 2.5 75% off through July 5, 2026 was a launch promo, not standing pricing. This watch still runs in the Cloud Agent VM, not on the phone.
  https://x.com/cursor_ai/status/2071641103191998810
- You can now delegate tasks to Cursor directly from Notion — cited by https://www.unrollnow.com/status/2069872515548340407 (not fetched from X)
  Notion SDK embedding is optional vendor integration. Do not install @cursor/sdk or rotate this watch into Notion task delegation. Do not add docs/integrations/notion as a feed.
  https://x.com/cursor_ai/status/2069872515548340407
- We're increasing usage limits for every Teams user — cited by https://www.unrollnow.com/status/2061550723503194426 (not fetched from X)
  Honor included quota. Do not switch this watch to Premium or on-demand. Do not treat vendor seat prices as EOS budget evidence. This Cloud Agent is not a Teams admin dashboard.
  https://x.com/cursor_ai/status/2061550723503194426
- Introducing the Cursor Developer Habits Report. We're sharing some of our findings on how software development is changing. — cited by https://www.unrollnow.com/status/2060025063899058458 (not fetched from X)
  Vendor research metrics are not EOS evidence. Do not add cursor.com/insights as a feed.
  https://x.com/cursor_ai/status/2060025063899058458
- Introducing Composer 2.5, our most powerful model yet — cited by https://aicatchup.com/news/cursor-composer-2-5-launch (not fetched from X)
  Composer is a vendor model family. Do not treat marketing metrics as EOS evidence. The first-week 2x included usage was a launch promo, not standing pricing.
  https://x.com/cursor_ai/status/2056415413077233983
- We're introducing the Cursor SDK so you can build agents with the same runtime, harness, and models that power Cursor — cited by https://www.unrollnow.com/status/2049499866217185492 (not fetched from X)
  Cursor SDK is optional vendor scripting. Do not install @cursor/sdk or rotate this watch into SDK scripts. Do not put CURSOR_API_KEY in git. Do not add docs/sdk/changelog as a feed. Customer names are vendor marketing, not EOS evidence.
  https://x.com/cursor_ai/status/2049499866217185492
- Composer 2 is now available in Cursor — cited by https://www.unrollnow.com/status/2034668943676244133 (not fetched from X)
  Composer is a vendor model family. Do not treat vendor rates or CursorBench scores as EOS evidence. Honor included quota.
  https://x.com/cursor_ai/status/2034668943676244133
- We're introducing Cursor Automations to build always-on agents — cited by https://www.unrollnow.com/status/2029604182286856663 (not fetched from X)
  Automations trigger on GitHub events, not X. This daily changelog timer already covers ingest.
  https://x.com/cursor_ai/status/2029604182286856663

