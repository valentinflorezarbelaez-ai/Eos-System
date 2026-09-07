# LIDR Harness Engineering — Intelligence Intake

> **Sources:**
> - [Workshop Material — Harness Engineering 202609](https://lidr.notion.site/material-workshop-harness-engineering-202609)
> - [Blog — Cómo ahorrar tokens en desarrollo de software](https://www.lidr.co/blog/como-ahorrar-tokens-en-desarrollo-de-software/)
>
> **Author:** Álvaro Moya (CTO & Founder, LIDR)
> **Date ingested:** 2026-09-07
> **Status:** `INTAKE_COMPLETE`

---

## 1. Executive Summary

Two complementary sources from LIDR define the professional framework for **Harness Engineering** — the discipline of designing the operational environment (harness) that surrounds an AI model to make it productive in real software teams. Key thesis: **Agent = Model + Harness** (Mitchell Hashimoto / HashiCorp).

The material covers:
1. The **AI Champion** role and organizational adoption
2. **TPC methodology** (Tool, Prompt, Context)
3. **Context Engineering** as the foundation
4. **Harness Engineering** as the operational layer
5. **Token savings** strategies (up to 60% reduction)

---

## 2. Key Concepts

### 2.1 The AI Champion Role (OpenAI Academy Framework)

An internal employee who promotes, supports, and accelerates practical AI adoption. Two archetypes:
- **Leaders:** Strategic champions — governance, metrics, cross-functional alignment.
- **Activators:** Field champions — embedded in a team, designing practical workflows.

**LIDR definition for software dev:** The AI Champion creates the agentic layer and governs standardized AI adoption. Facilitates harness and SDD (Spec-Driven Development) incorporation.

### 2.2 The Productivity Paradox (CRITICAL DATA)

| Metric | Impact | Source |
|--------|--------|--------|
| Developer AI usage | 92.6% use AI monthly | Stack Overflow 2025 |
| Salary premium | +28% (~$18K/yr USD) | Lightcast |
| Time saved (routine) | -46% | McKinsey |
| **Bugs per developer** | **+54%** | Faros AI (22K devs) |
| **Incidents per PR** | **+242.7%** | Faros AI |
| **Review time** | **+441% (5x)** | Faros AI |
| **PRs merged without review** | **31.3%** | Faros AI |
| Perceived speed (subjective) | +20% faster | METR |
| Actual speed (measured) | **-19% slower** | METR |

> **Conclusion:** Individual acceleration without team governance doesn't reduce work — it redistributes it to the phase nobody watches (review, QA, production).

### 2.3 TPC Methodology (Tool, Prompt, Context)

1. **Tool:** Control parameters, MCPs, models, configurations.
2. **Prompt:** Structured instructions with quality engineering.
3. **Context:** The most important pillar — aligns generation with architecture and project directives.

### 2.4 Model Selection Strategy (2026)

| Dev Phase | Anthropic | Google | OpenAI | Rationale |
|-----------|-----------|--------|--------|-----------|
| Discovery / Ideas | Sonnet | Gemini LOW/MED | — | Fast, follows instructions |
| PRD / User Stories | Sonnet | Gemini LOW/MED | — | Agile iteration |
| **Architecture / Specs** | **Opus** | **Gemini HIGH** | **Codex** | Complex trade-off reasoning |
| Routine implementation | Sonnet | Gemini LOW/MED | — | Daily driver |
| **Complex implementation** | **Opus** | **Gemini HIGH** | **Codex** | Broad context, autonomous |
| Review / Surface debugging | Sonnet | Gemini LOW/MED | — | Sufficient for 80% |
| **Deep debugging / Security** | **Opus** | **Gemini HIGH** | **Codex** | — |
| **DevOps / CI-CD / Terminal** | **Opus** | **Gemini HIGH** | **Codex** | Codex 77.3% Terminal-Bench |
| Production maintenance | Sonnet | Gemini LOW/MED | — | Reasonable cost |

> **SDD Rule:** `Opus` plans and prepares specs; `Sonnet` executes atomized tasks.

### 2.5 Harness Engineering Definition

**Agent = Model + Harness** (Mitchell Hashimoto)

The harness provides: context, rules, tools, tests/evals, sandbox, and observability.

#### The Automation Pyramid
1. **Context Engineering (Base):** Information, conventions, stack, constraints.
2. **Harness Engineering (Middle):** Complete operational environment (tools, auto-checks, sandbox).
3. **Loop Engineering (Apex):** Autonomous systems that trigger agents, evaluate results, decide next steps.

#### The 5 Harness Primitives
1. **Filesystem:** Durable state storage.
2. **Code Execution:** Terminal / general-purpose computer access.
3. **Sandbox:** Isolated environment preventing production breakage.
4. **Memory & Search:** Continuous learning (web search, vector DBs).
5. **Context Management:** Compaction to avoid *context rot*.
6. **Guides vs Sensors:** Guides act before (`AGENTS.md`, linters); Sensors act after (tests, evals).

#### Real-World Harness Impact
| Company | Change | Result |
|---------|--------|--------|
| **Vercel** | Reduced 80% of agent tools (text-to-SQL) | 80%→100% success, 3.5x faster, -37% tokens |
| **LangChain** | Improved harness (no model change) | Position 30→5 on Terminal-Bench 2.0 (+14 pts) |
| **Stripe** | Agent-generated PRs with human review | 1,300 PRs/week merged |

#### Harness Frameworks
- **OpenSpec:** Open specification protocol (ideal for starting without infrastructure).
- **Spec-Kit (GitHub):** GitHub's bet, documented and auditable.
- **Superpowers:** Collection of skills/execution discipline.
- **Spec-Boot (LIDR):** Strict base context layer for team standardization.

### 2.6 Context Engineering — Recommended Files

- Stack and setup documentation
- Architecture and file structure
- Data model entities (`data-model.mdc`)
- Design patterns and conventions: APIs, `testing-standards.mdc`, naming, git workflow, SOLID, validations, logging, security, `frontend-standards.mdc`
- Workflow: defined deliverables (PRD, tickets, tests, reports), Git Worktrees per ticket

### 2.7 Boris Cherny's Claude Code Configuration (Creator)

1. **Multi-process Terminal:** 5 Claudes in parallel terminal tabs with notifications.
2. **Web & Mobile Sessions:** 5-10 Claudes on `claude.ai/code` in parallel.
3. **Model:** `Opus 4.5 with thinking` for everything.
4. **Shared CLAUDE.md:** Common Git repo where team adds rules when Claude makes errors.
5. **Plan Mode Default:** Start in Plan mode (`Shift+Tab` ×2) to validate before generating code.
6. **Slash Commands:** Saved in `.claude/commands/` (e.g., `/commit-push-pr`).
7. **Subagents:** `code-simplifier` (post-generation cleanup), `verify-app` (E2E tests).
8. **Hooks:** `PostToolUse` hook for automatic code formatting.
9. **Permissions:** Pre-approved in `.claude/settings.json`.
10. **Sandbox & Plugins:** Plugin `ralph-wiggum` + `--permission-mode=dontAsk` for long tasks.
11. **Autonomous Verification:** Give Claude a way to test its own work (Chrome extension, bash tests, simulators). Multiplies quality 2x-3x.

### 2.8 Recommended MCPs

| Category | MCP | Link |
|----------|-----|------|
| Context | Atlassian (Jira/Confluence) | [github.com/sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) |
| Context | Context7 | [context7.com](https://context7.com/docs/resources/all-clients) |
| Context | Figma/Framelink | [github.com/glips/figma-context-mcp](https://github.com/glips/figma-context-mcp) |
| QA | Playwright | [playwright.dev/mcp](https://playwright.dev/docs/getting-started-mcp) |
| Errors | Sentry | [docs.sentry.io/mcp](https://docs.sentry.io/product/sentry-mcp/#example-usage) |
| Security | Snyk | [docs.snyk.io/mcp](https://docs.snyk.io/integrations/developer-guardrails-for-agentic-workflows/quickstart-guides-for-mcp/cursor-guide#examples) |

---

## 3. Token Savings Strategies

### 3.1 The 4 Keys to Up to 60% Token Savings

1. **Document technical context in the repository.** Without a documentation folder with standards, architecture, and conventions, the AI reads the entire codebase per task to deduce them — wasting tokens and causing inconsistency.

2. **Use advanced models only for planning.** Use deep reasoning models (Opus, Gemini HIGH) for the spec phase; execute with faster/cheaper models (Sonnet). Structure `CLAUDE.md` with static content first to leverage **Prompt Caching (90% discount)**.

3. **Install plugins that compress what the model sees.** Use compression tools to strip noise from terminal output, code exploration, context, agent replies, and generated code.

4. **Activate automatic routing.** Use automatic model routing (Cursor/Copilot Auto Mode, OpenRouter, LiteLLM) to dispatch tasks to cheaper models when high reasoning is unnecessary.

### 3.2 Five Open Source Token Savings Tools

| # | Tool | Function | Savings | Install |
|---|------|----------|---------|---------|
| 1 | [**rtk**](https://github.com/rtk-ai/rtk) | Terminal output compression proxy | **60-90%** fewer tokens on routine commands | `brew install rtk` |
| 2 | [**codegraph**](https://github.com/colbymchenry/codegraph) | Local code knowledge graph | **~57%** fewer tokens, ~35% lower cost, ~70% fewer tool calls | `npx @colbymchenry/codegraph` |
| 3 | [**caveman**](https://github.com/JuliusBrussee/caveman) | Forces agent to reply in compressed format | **~65%** fewer output tokens | Claude plugin marketplace |
| 4 | [**ponytail**](https://github.com/DietrichGebert/ponytail) | Reduces over-engineering in generated code | **80-94%** less code in over-construction | — |
| 5 | [**Headroom**](https://github.com/headroomlabs-ai/headroom) | Context compression proxy (logs, tests) | **60-95%** context reduction | — |

### 3.3 Monitoring Tools

- **claude-usage** (Web dashboard): `git clone https://github.com/phuryn/claude-usage && python3 cli.py dashboard`
- **claude-usage-monitor** (Terminal real-time): `pip install claude-monitor`

### 3.4 Open Source Models for Code (2026)

| Model | Org | Key Metric | Notes |
|-------|-----|------------|-------|
| **Kimi K2.6** | Moonshot AI | 80.2% SWE-Bench Verified | 0.6 pts behind Opus 4.6; sustained >4,000 tool calls in 13h |
| **Qwen 3.6 Plus** | Alibaba | 1M token context window | Large codebases |
| **GLM-5.2** | Z.ai | 91.2% GPQA Diamond | Leads Code Arena for frontend |

### 3.5 Token Savings Metrics

| Source | Metric | Value |
|--------|--------|-------|
| 30-min TS/Rust session | Terminal noise tokens | >118,000 tokens |
| Anthropic Prompt Caching | Cached token discount | 90% off |
| Factory AI CEO | Work handleable by OSS models | ~60% |
| Stanford AI Index 2025 | #1 vs #10 model gap reduction | 11.9% → 5.4% |

> **Philosophy:** "Los tokens son el diagnóstico de tu arquitectura." If an agent consumes excessive tokens, it indicates noise in context, too many tools, or unclear specifications. Token savings come from providing better context, not running less AI.

---

## 4. EOS Relevance & Actionable Takeaways

### Direct Validations of EOS Architecture
1. **EOS's AGENTS.md + CONSTITUTION = Context Engineering** — Aligns with LIDR's emphasis on `CLAUDE.md` as shared team rules. EOS already implements this at a deeper level.
2. **EOS's SDD = Spec-Driven Development** — Direct match with LIDR's recommended methodology.
3. **EOS's 21-Step Pipeline = Harness Engineering** — EOS implements all 5 harness primitives plus governance.
4. **EOS's Engram MCP = Memory & Search primitive** — Continuous learning across sessions.
5. **EOS's Evidence Auditor = Sensors** — Acts after implementation to verify claims.

### Gaps to Investigate for EOS
1. **Terminal output compression** — EOS does not currently use `rtk` or similar to reduce token waste from command outputs. High-impact, low-effort improvement.
2. **Code knowledge graph** — `codegraph` could reduce exploration tokens. Worth evaluating for large projects.
3. **Automatic model routing** — EOS currently relies on manual model selection. Auto-routing per task phase could save 30-40% tokens.
4. **Agent output compression** — `caveman`-style compressed replies could reduce output tokens by ~65%.
5. **Context compaction tooling** — `Headroom` for compressing logs/test output before they count as input tokens.
6. **Token monitoring** — No usage dashboard currently. `claude-usage` could provide visibility.

### Data Points for EOS Governance
- The **Productivity Paradox** data (METR + Faros AI) directly justifies EOS's evidence-over-claims standard and mandatory review gates.
- The **31.3% PRs merged without review** stat is exactly what EOS's Write Barrier prevents.
- Vercel's **80% tool reduction → 100% success** validates EOS's principle of proportionality.
