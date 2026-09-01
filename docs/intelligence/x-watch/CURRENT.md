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
- We're making Git hosting more reliable, performant, and scalable — cited by https://www.unrollnow.com/status/2089758713183613266 (not fetched from X)
  Vendor git-scale narrative. GitHub remains source of truth for this synced repo. Do not Start from scratch or create an Origin repo for this watch. Do not treat Continuity or throughput marketing as EOS evidence.
  https://x.com/cursor_ai/status/2089758713183613266
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
- We're excited to welcome the Firetiger team to Cursor — cited by https://www.unrollnow.com/status/2087991786279251993 (not fetched from X)
  Firetiger is team and direction news, not a shipping feature for this watch. Do not treat production-agent marketing as EOS evidence. Do not add extra Firetiger feeds.
  https://x.com/cursor_ai/status/2087991786279251993
- Cursor is now part of @SpaceX. Today, we have officially closed our acquisition. — cited by https://www.unrollnow.com/status/2088249881718919393 (not fetched from X)
  Cited X announcement mirrored by official blog https://cursor.com/blog/joining-spacex. Do not treat SpaceX/Grok marketing as EOS production evidence.
  https://x.com/cursor_ai/status/2088249881718919393
- Cursor now supports Agent Plugins, an open standard for bundling skills and MCP servers for use across agents — cited by https://pulseaugur.com/cluster/186602-cursor-ai-introduces-agent-plugins-for-enhanced-agent-capabilities (not fetched from X)
  Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Agent Plugins is vendor packaging, not EOS governance. Do not rotate this Cloud Agent into dashboard team marketplace plugins for daily ingest.
  https://x.com/cursor_ai/status/2085464617694777762
- Cursor Router keeps improving from millions of in-product user interactions each week — cited by https://www.unrollnow.com/status/2085390483740676365 (not fetched from X)
  Vendor routing and cost claims are not EOS evidence. EOS rules still bind model and governance choices.
  https://x.com/cursor_ai/status/2085390483740676365
- No model dominates every kind of task. — cited by https://pulseaugur.com/cluster/186219-cursor-router-optimizes-ai-model-selection-for-cost-and-latency (not fetched from X)
  Vendor model-strength claims are not EOS evidence. EOS rules still bind model and governance choices.
  https://x.com/cursor_ai/status/2085390485502239171
- Cursor can now read, write, and act across your Google Workspace — cited by https://aicatchup.com/news/cursor-google-workspace-plugins (not fetched from X)
  Google Workspace plugins are optional vendor marketplace/Customize install. Do not rotate this Cloud Agent into marketplace plugin install for daily ingest. Official changelog names Drive, Gmail, and Calendar; do not treat Docs/Sheets as part of this announcement.
  https://x.com/cursor_ai/status/2084376701539405904
- Cloud agents are now 20-30% more token efficient, and 80% more efficient on runs with computer use — cited by https://aicatchup.com/news/cursor-cloud-agents-token-efficiency-computer-use (not fetched from X)
  Vendor efficiency claim cited by a third party. Do not treat token-percentage marketing as EOS evidence.
  https://x.com/cursor_ai/status/2084317547608911986
- In December, 1 in 10 of our merged PRs came from cloud agents. Today, it's 56% — cited by https://www.unrollnow.com/status/2082841397632086241 (not fetched from X)
  Vendor internal PR-share metrics are not EOS evidence. Keep environment.json + Builds. Do not treat cloud-agent share percentages as EOS production evidence.
  https://x.com/cursor_ai/status/2082841397632086241
- Read more about how we set up our cloud agent environment — cited by https://pulseaugur.com/cluster/172940-cursor-ai-ide-sees-56-of-prs-generated-by-cloud-agents (not fetched from X)
  Official engineering write-up. Keep environment.json + Builds. Vendor environment narrative is not EOS evidence.
  https://x.com/cursor_ai/status/2082841399838327289
- Cursor is now on iPad. All the power of Cursor on iPhone, with more room to work with agents — cited by https://www.unrollnow.com/status/2082532273421955513 (not fetched from X)
  iPad/iOS can launch Cloud Agents; this watch still runs in the Cloud Agent VM, not on the tablet.
  https://x.com/cursor_ai/status/2082532273421955513
- New to both iPhone and iPad: an inbox to stay organized, and a review experience that covers the full PR, including comments, checks and approvals. — cited by https://pulseaugur.com/cluster/171123-cursor-ai-ide-launches-on-ipad-and-iphone (not fetched from X)
  iPad/iOS inbox and PR review are mobile Cloud Agent surfaces. This watch still runs in the Cloud Agent VM, not on the tablet.
  https://x.com/cursor_ai/status/2082532274646745521
- Create, review, and merge from anywhere. — cited by https://pulseaugur.com/cluster/171123-cursor-ai-ide-launches-on-ipad-and-iphone (not fetched from X)
  Mobile create/review/merge is a vendor iPad/iOS surface. This watch still runs in the Cloud Agent VM, not on the tablet.
  https://x.com/cursor_ai/status/2082532275896692905
- Today we're launching Cursor Start, a new ₹649/month plan for developers in India — cited by https://www.unrollnow.com/status/2081978255004053560 (not fetched from X)
  Cursor Start is India regional pricing. Do not switch this watch to Start. Honor included quota. Do not add help/account-and-billing/cursor-start as a feed.
  https://x.com/cursor_ai/status/2081978255004053560
- Claude Opus 5 is now available in Cursor — cited by https://www.unrollnow.com/status/2080700479940759919 (not fetched from X)
  Opus 5 availability is vendor catalog news. EOS model policy stays in workspace rules. Do not treat CursorBench scores as EOS evidence. Honor included quota.
  https://x.com/cursor_ai/status/2080700479940759919
- Introducing Cursor Router, our intelligent model router that selects the right model for the task at hand — cited by https://www.unrollnow.com/status/2079993729532989500 (not fetched from X)
  Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices. Official docs restrict Router to Teams and Enterprise. Vendor cost-percentage claims are not EOS evidence.
  https://x.com/cursor_ai/status/2079993729532989500
- Select Auto mode and whether you'd like to optimize for Intelligence, Balance, or Cost — cited by https://pulseaugur.com/cluster/157845-cursor-launches-ai-model-router-to-optimize-cost-and-performance (not fetched from X)
  Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices. Vendor cost-percentage claims are not EOS evidence.
  https://x.com/cursor_ai/status/2079993731063955665
- In early access, customers observed no drop-off in quality with a lower cost per commit vs. routing all requests to Opus 4.8 — cited by https://pulseaugur.com/cluster/157845-cursor-launches-ai-model-router-to-optimize-cost-and-performance (not fetched from X)
  Vendor routing and cost claims are not EOS evidence. EOS rules still bind model and governance choices.
  https://x.com/cursor_ai/status/2079993733064646774
- Cursor Router is available today across all surfaces on Teams and Enterprise plans — cited by https://pulseaugur.com/cluster/157845-cursor-launches-ai-model-router-to-optimize-cost-and-performance (not fetched from X)
  Official docs restrict Router to Teams and Enterprise. EOS rules still bind model and governance choices. Vendor availability claims are not EOS evidence.
  https://x.com/cursor_ai/status/2079993735082016851
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
- Cursor now shows you a leaderboard of the most popular plugins, skills, and MCPs across your team — cited by https://www.unrollnow.com/status/2069512593887092811 (not fetched from X)
  Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Do not rotate this Cloud Agent into desktop Customize for daily ingest. Team marketplace is not EOS governance.
  https://x.com/cursor_ai/status/2069512593887092811
- Plugins can now include prebuilt canvases — cited by https://pulseaugur.com/cluster/107158-cursor-ai-ide-enhances-team-collaboration-with-new-integrations-and-plugin (not fetched from X)
  Plugin canvases are vendor marketplace templates, not a substitute for git evidence. Do not rotate this Cloud Agent into desktop Customize for daily ingest.
  https://x.com/cursor_ai/status/2069512595766173857
- You can also now use team marketplaces with GitLab, Bitbucket, and Azure DevOps in addition to local repos — cited by https://pulseaugur.com/cluster/107158-cursor-ai-ide-enhances-team-collaboration-with-new-integrations-and-plugin (not fetched from X)
  Team marketplace SCM imports are vendor distribution. Do not add extra GitLab, Bitbucket, or Azure DevOps feeds. GitHub remains source of truth for this synced repo. Do not rotate this Cloud Agent into desktop Customize for daily ingest.
  https://x.com/cursor_ai/status/2069512597628440908
- It's now easier to move local agents to the cloud so they can keep working with your laptop closed — cited by https://www.unrollnow.com/status/2067366343817805899 (not fetched from X)
  This watch already runs in the Cloud Agent VM. /in-cloud starts an isolated cloud subagent; do not rotate this Cloud Agent into the desktop Agents Window for daily ingest. Isolated VMs are optional parallelism, not an EOS Control Plane change.
  https://x.com/cursor_ai/status/2067366343817805899
- Cursor can now help you set up your dev environment in the cloud in under 10 minutes — cited by https://pulseaugur.com/cluster/97403-cursor-ai-ide-launches-cloud-agents-for-faster-dev-environment-setup (not fetched from X)
  This watch already runs in the Cloud Agent VM. Keep environment.json + Builds. Do not treat snapshot marketing as EOS evidence.
  https://x.com/cursor_ai/status/2067366345940087064
- Use /in-cloud to start a subagent in its own cloud VM — cited by https://pulseaugur.com/cluster/97403-cursor-ai-ide-launches-cloud-agents-for-faster-dev-environment-setup (not fetched from X)
  This watch already runs in the Cloud Agent VM. Isolated VMs are optional parallelism, not an EOS Control Plane change. Do not rotate this Cloud Agent into the desktop Agents Window for daily ingest.
  https://x.com/cursor_ai/status/2067366347890467266
- Auto-review is now the default for all new users — cited by https://www.unrollnow.com/status/2065137803084857845 (not fetched from X)
  Auto-review is a vendor run mode that reduces approval prompts. FUNDACION HITL gates still apply. Do not treat classifier marketing as EOS evidence. Do not rotate this Cloud Agent into Auto-review as governance.
  https://x.com/cursor_ai/status/2065137803084857845
- Claude Fable 5 is now available in Cursor — cited by https://www.unrollnow.com/status/2064394824313376787 (not fetched from X)
  Fable 5 availability is vendor catalog news. EOS model policy stays in workspace rules. Do not treat CursorBench scores as EOS evidence. Honor included quota.
  https://x.com/cursor_ai/status/2064394824313376787
- With Design Mode, you can now point, draw, or talk to update your UI — cited by https://www.unrollnow.com/status/2062950344687272144 (not fetched from X)
  Design Mode annotates UI in the Cursor browser. EOS still verifies web changes in a real browser. This watch stays in the Cloud Agent VM. Do not rotate this Cloud Agent into Design Mode for daily ingest.
  https://x.com/cursor_ai/status/2062950344687272144
- With canvases, Cursor can create apps like dashboards, reports, and internal tools. Now you can publish a canvas and share it with your team via URL. — cited by https://ethanbholland.com/2026/06/05/agents-and-copilots-ai-news-week-ending-06-05-2026/ (not fetched from X)
  Shared canvases are shareable artifacts, not a substitute for git evidence. Design Mode annotates UI in the Cursor browser. EOS still verifies web changes in a real browser. Do not rotate this Cloud Agent into canvas Design Mode for daily ingest.
  https://x.com/cursor_ai/status/2062611883249783083
- We're increasing usage limits for every Teams user — cited by https://www.unrollnow.com/status/2061550723503194426 (not fetched from X)
  Honor included quota. Do not switch this watch to Premium or on-demand. Do not treat vendor seat prices as EOS budget evidence. This Cloud Agent is not a Teams admin dashboard.
  https://x.com/cursor_ai/status/2061550723503194426
- Agent actions that aren't on your allowlist or can't be sandboxed go to a classifier subagent — cited by https://pulseaugur.com/cluster/60028-cursor-ai-ide-adds-auto-review-mode-for-safer-agent-actions (not fetched from X)
  Classifier subagent is vendor Auto-review plumbing. FUNDACION HITL gates still apply. Do not treat allowlist marketing as EOS evidence.
  https://x.com/cursor_ai/status/2060406014478831842
- Auto-review mode is now available in Cursor — cited by https://pulseaugur.com/cluster/60028-cursor-ai-ide-adds-auto-review-mode-for-safer-agent-actions (not fetched from X)
  Auto-review is a vendor run mode that reduces approval prompts. FUNDACION HITL gates still apply. Do not treat classifier marketing as EOS evidence. Do not rotate this Cloud Agent into Auto-review as governance.
  https://x.com/cursor_ai/status/2060406013098897765
- Introducing the Cursor Developer Habits Report. We're sharing some of our findings on how software development is changing. — cited by https://www.unrollnow.com/status/2060025063899058458 (not fetched from X)
  Vendor research metrics are not EOS evidence. Do not add cursor.com/insights as a feed.
  https://x.com/cursor_ai/status/2060025063899058458
- The cost per accepted line of code varies by roughly 7x across model families. — cited by https://ethanbholland.com/2026/05/29/agents-and-copilots-ai-news-week-ending-05-29-2026/ (not fetched from X)
  Vendor research metrics are not EOS evidence. Do not add cursor.com/insights as a feed.
  https://x.com/cursor_ai/status/2060025070425395562
- As agents use more context, input tokens have become the majority of price-equivalent token costs. — cited by https://ethanbholland.com/2026/05/29/agents-and-copilots-ai-news-week-ending-05-29-2026/ (not fetched from X)
  Vendor research metrics are not EOS evidence. Do not add cursor.com/insights as a feed.
  https://x.com/cursor_ai/status/2060025076947521984
- With the Cursor SDK, you can build your own agents with Composer 2.5. It's now available in Python and TypeScript. — cited by https://ethanbholland.com/2026/05/29/agents-and-copilots-ai-news-week-ending-05-29-2026/ (not fetched from X)
  Cursor SDK is optional vendor scripting. The long-weekend 90% off was a promo, not standing pricing. Do not install @cursor/sdk or rotate this watch into SDK scripts. Do not put CURSOR_API_KEY in git. Do not add docs/sdk/changelog as a feed.
  https://x.com/cursor_ai/status/2057913121558413770
- You can now create and manage automations in the same workspace as your agents. Automations are now available in the Agents Window. — cited by https://ethanbholland.com/2026/05/22/agents-and-copilots-ai-news-week-ending-05-22-2026/ (not fetched from X)
  Automations trigger on GitHub events, not X. This daily changelog timer already covers ingest. The 7-day 50% promo is not standing pricing. Do not rotate this Cloud Agent into the desktop Agents Window for daily ingest.
  https://x.com/cursor_ai/status/2057167359593603471
- Cursor is now available in Jira. — cited by https://ethanbholland.com/2026/05/22/agents-and-copilots-ai-news-week-ending-05-22-2026/ (not fetched from X)
  Jira is optional vendor issue intake. Do not rotate this Cloud Agent into Jira for daily ingest. Do not add docs/integrations/jira as a feed. Honor included quota.
  https://x.com/cursor_ai/status/2056803731367456993
- Introducing Composer 2.5, our most powerful model yet — cited by https://aicatchup.com/news/cursor-composer-2-5-launch (not fetched from X)
  Composer is a vendor model family. Do not treat marketing metrics as EOS evidence. The first-week 2x included usage was a launch promo, not standing pricing.
  https://x.com/cursor_ai/status/2056415413077233983
- Together with SpaceXAI, we're training a significantly larger model from scratch, using 10x more total compute. — cited by https://ethanbholland.com/2026/05/22/agents-and-copilots-ai-news-week-ending-05-22-2026/ (not fetched from X)
  Vendor training-compute narrative is not EOS evidence. EOS still evidence-gates quality claims. Honor included quota.
  https://x.com/cursor_ai/status/2056415419536461836
- Starting today, you can run cloud agents inside fully configured development environments. — cited by https://ethanbholland.com/2026/05/15/agents-and-copilots-ai-news-week-ending-05-15-2026/ (not fetched from X)
  This watch already runs in the Cloud Agent VM. Keep environment.json + Builds. Do not treat snapshot marketing as EOS evidence.
  https://x.com/cursor_ai/status/2054651526715502998
- A new PR review experience is now available in Cursor 3. Take PRs from creation to merge, all in one place. — cited by https://ethanbholland.com/2026/05/08/agents-and-copilots-ai-news-week-ending-05-08-2026/ (not fetched from X)
  PR Review in Cursor 3 is vendor editor chrome. This watch already runs in the Cloud Agent VM. GitHub remains source of truth for this synced repo.
  https://x.com/cursor_ai/status/2052489387305488609
- You can now see a breakdown of your agent's context usage in Cursor 3.3. — cited by https://ethanbholland.com/2026/05/08/agents-and-copilots-ai-news-week-ending-05-08-2026/ (not fetched from X)
  Context usage stats are vendor editor chrome. This Cloud Agent VM already searches the workspace. Do not rotate this Cloud Agent into desktop context stats for daily ingest.
  https://x.com/cursor_ai/status/2052059748544249918
- Cursor is now available in Microsoft Teams — cited by https://www.unrollnow.com/status/2053939390410612988 (not fetched from X)
  Microsoft Teams is optional vendor chat intake. Do not rotate this Cloud Agent into Teams for daily ingest. Do not add docs/integrations/microsoft-teams as a feed. Honor included quota.
  https://x.com/cursor_ai/status/2053939390410612988
- We're introducing the Cursor SDK so you can build agents with the same runtime, harness, and models that power Cursor — cited by https://www.unrollnow.com/status/2049499866217185492 (not fetched from X)
  Cursor SDK is optional vendor scripting. Do not install @cursor/sdk or rotate this watch into SDK scripts. Do not put CURSOR_API_KEY in git. Do not add docs/sdk/changelog as a feed. Customer names are vendor marketing, not EOS evidence.
  https://x.com/cursor_ai/status/2049499866217185492
- We've open-sourced a few starter projects for you to build on: a coding agent CLI, a prototyping tool, and an agent-powered kanban board. — cited by https://ethanbholland.com/2026/05/01/agents-and-copilots-ai-news-week-ending-05-01-2026/ (not fetched from X)
  Cursor SDK starter projects are optional vendor samples. Do not install @cursor/sdk or rotate this watch into SDK scripts. Do not put CURSOR_API_KEY in git. Do not add docs/sdk/changelog as a feed.
  https://x.com/cursor_ai/status/2049499874043830389
- Customers like Rippling, Notion, C3 AI, and Faire are using the Cursor SDK to build custom background agents, take bugs from ticket to merge-ready PR, and maintain self-healing codebases. — cited by https://ethanbholland.com/2026/05/01/agents-and-copilots-ai-news-week-ending-05-01-2026/ (not fetched from X)
  Customer names are vendor marketing, not EOS evidence. Do not install @cursor/sdk or rotate this watch into SDK scripts. Do not put CURSOR_API_KEY in git. Do not add docs/sdk/changelog as a feed.
  https://x.com/cursor_ai/status/2049499876388454903
- Cursor Security Review is now available for Teams and Enterprise plans — cited by https://www.unrollnow.com/status/2049926283061035254 (not fetched from X)
  Cursor Security Review is a vendor PR reviewer. EOS security-auditor remains the Control Plane check. /review-security is not a substitute. Do not treat vendor finding counts as EOS evidence. Honor included quota.
  https://x.com/cursor_ai/status/2049926283061035254
- Introducing /multitask in the new Cursor 3 interface. Cursor can now run async subagents to parallelize your requests instead of adding them to the queue. — cited by https://ethanbholland.com/2026/05/01/agents-and-copilots-ai-news-week-ending-05-01-2026/ (not fetched from X)
  /multitask is vendor desktop Agents Window parallelism. This Cloud Agent VM already runs one isolated agent. Do not rotate this Cloud Agent into desktop Agents Window or /multitask for daily ingest.
  https://x.com/cursor_ai/status/2047764651363180839
- Use /debug to find root causes and fix tricky bugs that are hard to reproduce or understand. — cited by https://ethanbholland.com/2026/04/24/agents-and-copilots-ai-news-week-ending-04-24-2026/ (not fetched from X)
  CLI /debug is vendor Cursor CLI. Do not install Cursor CLI or @cursor/sdk. Do not add docs/cli/installation as a feed. Keep changelog ingest on the main Cloud Agent thread.
  https://x.com/cursor_ai/status/2046324136377721128
- Through the end of this weekend, we are doubling Composer 2 usage limits inside of Cursor's new agents window. — cited by https://ethanbholland.com/2026/04/24/agents-and-copilots-ai-news-week-ending-04-24-2026/ (not fetched from X)
  Weekend usage doubling is a launch promo, not standing pricing. Composer is a vendor model family. Do not treat vendor rates as EOS evidence. Honor included quota.
  https://x.com/cursor_ai/status/2045236540784492845
- Cursor's code review agent can now learn from activity on PRs to self-improve in real time. — cited by https://ethanbholland.com/2026/04/10/agents-and-copilots-ai-news-week-ending-04-10-2026/ (not fetched from X)
  Bugbot learned rules are optional vendor PR review. EOS TDD evidence remains required. Do not rotate this Cloud Agent into Bugbot Autofix for daily ingest.
  https://x.com/cursor_ai/status/2041969870234120231
- Cursor cloud agents can now run on your infrastructure. — cited by https://ethanbholland.com/2026/03/27/agents-and-copilots-ai-news-week-ending-03-27-2026/ (not fetched from X)
  Self-hosted Cloud Agents are optional private workers. This watch already runs in the public Cloud Agent VM. Do not add docs/cloud-agent/self-hosted as a feed. Keep environment.json + Builds.
  https://x.com/cursor_ai/status/2036873885665419773
- We're introducing Cursor 3 — cited by https://www.unrollnow.com/status/2039768512894505086 (not fetched from X)
  Cursor 3 Agents Window is vendor editor chrome. This watch already runs in the Cloud Agent VM. Editor chrome is not an EOS Control Plane change. Honor included quota.
  https://x.com/cursor_ai/status/2039768512894505086
- Composer 2 is now available in Cursor — cited by https://www.unrollnow.com/status/2034668943676244133 (not fetched from X)
  Composer is a vendor model family. Do not treat vendor rates or CursorBench scores as EOS evidence. Honor included quota.
  https://x.com/cursor_ai/status/2034668943676244133
- We're introducing Cursor Automations to build always-on agents — cited by https://www.unrollnow.com/status/2029604182286856663 (not fetched from X)
  Automations trigger on GitHub events, not X. This daily changelog timer already covers ingest.
  https://x.com/cursor_ai/status/2029604182286856663
- Cursor is now available in JetBrains IDEs through the Agent Client Protocol. — cited by https://ethanbholland.com/2026/03/06/agents-and-copilots-ai-news-week-ending-03-06-2026/ (not fetched from X)
  JetBrains ACP is out of scope for this Cloud Agent workspace. Do not add help/getting-started/migrate-jetbrains as a feed. Keep environment.json + Builds.
  https://x.com/cursor_ai/status/2029222015736197205
- Cursor now supports MCP Apps. Agents can render interactive UIs in your conversations. — cited by https://ethanbholland.com/2026/03/06/agents-and-copilots-ai-news-week-ending-03-06-2026/ (not fetched from X)
  MCP Apps are vendor chat UIs. Keep repo skills, rules, hooks, and .cursor/mcp.json. Team marketplace is vendor distribution. Do not add a dashboard marketplace as a feed.
  https://x.com/cursor_ai/status/2028953584407085546
