# RSC-0021 — Fazt digest: models, harnesses, orchestrators → EOS

**Decision:** ADAPT as a knowledge pin. Not a subsystem, not an engine, not a permission mode.  
**Constitution delta:** 0. `CONSTITUTION.md`, `Fundacion/`, and `src/core/` are untouched.  
**Ingest date:** 2026-10-05.  
**Subtitles downloaded:** none.  
**Epistemic split:** watch-page metadata and author-written description stay labeled as such. Spoken lines come from an English page reading (a tool translation, not a subtitle file). Where that reading deforms a proper name and there is no Spanish anchor, the string stays **NOT VERIFIED** and is not promoted to a fact.

## Canonical watch URLs

| # | Title (page) | Channel | Canonical URL | Publish (page `publishDate`) | Duration (page badge / `videoDetails`) |
| --- | --- | --- | --- | --- | --- |
| 1 | Modelos, Harnesses y Orquestadores: el mapa real de la IA | Fazt Code | https://www.youtube.com/watch?v=FK-Yh16MQLo | 2026-09-07 | 2:03 (`lengthSeconds` 123 on the Short `videoDetails`) |
| 2 | Así desarrollo con varios agentes a la par (Herdr + Claude Code) | Fazt Code | https://www.youtube.com/watch?v=Hr693AAnCV0 | 2026-10-03 | 39:00 (channel badge `39:00`; search text says 39 minutes) |
| 3 | No revises el código de la IA… usa esta estrategia en su lugar | Fazt | https://www.youtube.com/watch?v=3TgAwef00nc | 2026-07-31 | 11:35 (search label attached to the title and id) |

Author description of video 1 (author text): almost every new AI tool falls into three groups — intelligent models, harnesses, and orchestrators. Learning the groups tells you what a tool does before you install it.

Author description of video 2 (author text, not a paraphrase): a daily flow for several projects at once; Herdr orchestrates sessions; Claude Code is the harness; skills and git worktrees keep agents from stepping on each other. The example is a course platform built in the video. Links he publishes: https://github.com/fazt/academia, https://herdr.dev, https://www.onorca.dev, tmux, https://impeccable.style, https://fazt.dev. The description also contains a sponsored block. That block is not EOS policy.

Author description of video 3 (author text): Uncle Bob said he no longer reviews agent code and was misread. The video promises the exact line, why the clip spread out of context, the real strategy (TDD plus agents), how he uses agent speed, the contrast with spec-driven development, his experience with TDD, and when review is still warranted. No chapter index. A second sponsored block is present and is not EOS policy.

Sibling article, same author and same day as video 1, **not the audio**: https://fazt.dev/contenido/3-conceptos-ia-modelos-harnesses-orquestadores (2026-09-07). It writes orchestrator spellings and adds nuances (verbosity cost, company-tuned harnesses, OpenCode and Pi, orchestrator value when several subscriptions are already paid). Those nuances are not attributed to the Short.

Third-party article, **not the Fazt description**: https://raphamoura.dev/en/blog/o-direito-de-nao-ler-o-codigo/ carries a longer public quote dated 2026-07-23 (unit tests, Gherkin, QA, metrics, mutation testing, coverage, and review of acceptance tests and QA procedures). The Fazt page reading stays on TDD, unit tests, acceptance, and QA. It does not support attributing the words "mutation testing" to the video.

## Page-reading claims (not downloaded subtitles)

Aligned with the author descriptions and chapter titles. Status of the speech track: **NOT VERIFIED** as a subtitle file. Do not upgrade the name strings in the next section.

**Video 1.** New tools arrive weekly and need not be followed one by one. Models are the engine and, in the end, what you are paying for. Do not memorize names; the ranking moves. He points at Artificial Analysis. Do not stop at the intelligence column: a task may want a faster model, an open model, or a cheap model for text only. A harness is the program on top of the model. Most are used from a terminal. He names Claude Code, Codex, and OpenCode. They are not a chat: they run programs, touch the system, and write code. The same model can answer differently under a different harness because the harness adds rules, tools, and clearer instructions. An orchestrator coordinates several agents in parallel and can make several harnesses talk. It helps parallel work. For a single project it gets in the way more than it helps. He closes by pointing at a longer video on the channel.

**Video 2** (chapter titles are author text in the description). Herdr is a terminal orchestrator: several sessions, local or on a server, still alive if you close the terminal (detach). He compares it with Orca, which is graphical, and keeps Herdr because it is lighter. tmux is the same session idea but was not born for agents. In one UI he launches Claude Code, Codex, and Hermes. The demo shows daily commands, not a finished product. He enters the project folder before asking for code. An alias `CL` opens Claude Code in permission-bypass mode. His status line shows directory, model, context window, quota, and permission mode (Shift+Tab). He says he almost always works in bypass, still reads what the agent will do when the function is complicated, and has not seen it delete a database in his use. That is his experience, not a proof. If you will not read the code, he recommends plan mode instead of asking it to code immediately. In plan mode Claude loads skills from `~/.claude/skills`. His are short guides, not a framework (UI style, auth, Zod, Resend, DigitalOcean Spaces, light/dark, plus FX Docker, FX Commit, FX Browser, and a longer review skill written by an AI). The plan asks business model, where videos live (he chooses Cloudflare Stream), and stack. He separates frontend and backend: Next on the front, Hono on the API, PostgreSQL, plus reviews, PDF certificates, cart, coupons, quizzes, and per-chapter comments. He asks for a high-effort model to plan. Plan mode does not write files until you approve. He reads the plan and corrects it before saying implement. He warns that plan mode sometimes will not run searches or scripts. When code is generated, the agent checks the browser. He shows the Claude extension and, when it fails, Playwright CLI (visible window in the demo; he usually runs it headless). Playwright can open several instances; he says the extension and a Chrome DevTools MCP do not. He delegates login and navigation and looks himself at critical parts (purchase, player) after the report. For design he uses the Claude `design` skill more than Impeccable lately, because Impeccable repeats templates. `/btw` answers a question without cutting the current task. Claude Code shells list API and frontend; `/tasks` shows the same without leaving the session. Independent work (architecture notes, Swagger) goes to a background subagent and costs more tokens. He prefers Herdr's agent view because other harnesses appear there too. Two features on the same files collide: one agent deletes what the other just did, or they stop. He then asks for a git worktree (needs a base commit), works on the other branch, and must delete the worktree and merge when finished. `main` is what has been reviewed, what users would see; `dev` is the day's work; each parallel feature lives in its worktree. He renames Herdr terminals and marks them when done. When Claude quota runs out (he mentions the Max plan) he moves to Codex, and also uses OpenCode and Command Code with open models: the code can be decent, but in his experience they are slower and the harness gets along worse with background processes. He says recent Codex updates improved that. A capable model plus a decent harness moves faster. Day to day he uses Cursor most, for memory; Zed looks like a simpler UI for this kind of work. Deploy, in his summary: Railway for a simple cloud (skill and CLI); Cloudflare (Wrangler) for a static site, often without the dashboard; Azure when the client is already there; Google Cloud when the integration is Google's. PostHog and Sentry do not cover the same thing; he leaves that for another video. At the end he asks to merge worktrees into `dev` and delete them. With `/rename` he names sessions and tells one to send its result to the other when finished. The message waits and does not cut current work. In auto mode the receiving session asks for approval before continuing.

**Video 3.** The usual advice is to review AI-written code. A known figure said the opposite and the headline spread: Robert C. Martin (Uncle Bob). The circulating line is that his current strategy is not to read the code agents write. It was a reply to another programmer, old-school since 1983, who is not comfortable trusting generated code and tries to review everything. Reposts kept the first sentence. What follows is not "I trust it 100%". He relies on tests. The method is TDD, older than AI and the web: write tests first, they fail because there is no code yet, write the minimum to pass, refactor, repeat. A later post says agents write faster than a person, so the programmer's time goes to making them write unit tests, acceptance tests, and QA procedures. Fazt says this was already in use with AI for about a year; the name turned the clip into "I no longer review because it kills productivity". Uncle Bob left repos where he applies the technique; what would be reviewable there are the tests. Hacker News pushback is noted in the page reading. Fazt says TDD with agents has not worked well for him: the model can also edit the tests it wrote. A rule can forbid that, and he still finds it uncomfortable. He contrasts spec-driven development: specifications or requirements first, and the AI advances them one by one. He names Spec Kit, from GitHub/Microsoft, with skills and commands per spec. Those methods already split work between people; now the implementer is an agent. AI does not deliver perfect code: it generates text, and someone has to put it in order. For him, part of that order is still looking at the final code. His practice: let it generate and check itself (browser automation and acceptance tests) and, when that passes, a second manual review, then another iteration. He relates that to loop engineering: plan, execute, verify, correct, and again. Models improved and, for an ordinary interface or app, often suffice; for a desktop app or a backend of several subsystems he still wants to see the map. Fast "with AI" apps are often not designed to scale, because the person asking does not know how to scale them. In a large system a small change can alter a flag, delete data, or open a security hole; he says those cases already exist. Close: many people are meeting TDD through the headline. Read the whole post. He leaves a practical TDD video pending.

## NOT VERIFIED name strings (do not promote)

| String in the English page reading | Why it stays NOT VERIFIED |
| --- | --- |
| "Fable 5.1", "GPT Astra", "Grow 4.6" | Not in the video 1 description or player keywords. Keywords do include Artificial Analysis, GPT, Claude, and Grok. |
| "Orca, Herder, Cmax, Tracer" | Spoken spelling is not in a subtitle. The sibling article (not the audio) writes Orca, herdr, cmux, and Traycer. |
| "Opus 3.5", "extra high", "Ultra Code" | Video 2 chapter title only says "Grado de esfuerzo del modelo". |
| "Clean Bive" | No book title in the video 3 description. |
| "SpecIt" | English reading of Spec Kit. The description does not spell the product. |
| "mutation testing" as something Fazt said on camera | Present in a third-party article about the longer quote, not in the Fazt description or the page reading used here. |

Video 2 description links (Herdr, Orca, the academia repo) are author-published URLs. They are description text, not a verified transcript of the spoken names.

## Already stated in EOS (cite; do not copy into a second policy)

| Operating point | Existing surface |
| --- | --- |
| Spec before code; TDD with spec | `.cursor/rules/01-eos-engineering-doctrine.mdc`, `.cursor/rules/sdd-master-standard.mdc`, `GK-GP-02` / `GK-GP-04` in `docs/intelligence/EOS_GLOBAL_KNOWLEDGE.json`, `.cursor/rules/gentleman-book-rsc-0016.mdc` |
| No VERIFIED or PRODUCTION READY without executable evidence; local demo is not production | `.cursor/rules/02-eos-evidence-and-epistemics.mdc`, `.cursor/rules/08-eos-git-and-release.mdc`, `GK-EOS-01` |
| Do not edit tests to force a green result | `.cursor/rules/06-eos-testing-and-verification.mdc` |
| HITL; the agent does not raise its own authority | `.cursor/rules/04-eos-security-and-authority.mdc`, `.cursor/rules/00-eos-operating-system.mdc`, `.cursor/rules/eos-evolve-on-use.mdc` |
| No "trust the agent" bypass; Level 2; frozen Fundacion and core; write barrier | `.cursor/rules/05-eos-agentic-engineering.mdc`, `.cursor/rules/eos-governance-core.mdc` |
| One session does not share a dirty tree; remove the worktree after the isolated task; policy is not a swarm | `docs/harness/WORKTREE_ISOLATION_POLICY.md`, `.cursor/rules/harness-engineering-standard.mdc` §4 |
| Feature branch, reviewed PR, no direct push to `main` | `.cursor/rules/08-eos-git-and-release.mdc` |
| Browser check is a post-act sensor (guides → act → sensors → feedback) | `docs/harness/LOOP_ENGINEERING_4Q.md` |
| Short skills and tool pruning; Fazt deploy/ops thesis (software lives after deploy) | `.cursor/rules/harness-engineering-standard.mdc` §3, `.cursor/rules/engineering-conscious-playbook.mdc` Fazt row |
| Lessons do not mutate the constitution | `.cursor/rules/eos-evolve-on-use.mdc` |

## Operating note (gaps only)

These sentences are the part agents would miss. They do not weaken the rows above.

1. **Tool filter.** Model = what you pay for. Harness = rules, tools, and sensors. Orchestrator only when several sessions would actually collide. A single project does not get a new orchestrator. EOS already orchestrates missions; this pin does not add another orchestrator product.
2. **Reviewed line vs the day's work.** In the video, `main` is what has been reviewed and `dev` is the day's work, with one worktree per parallel feature, deleted after merge, and two agents kept off the same files. EOS git policy still owns the mechanism: feature branch, reviewed PR, no direct push to `main`.
3. **Playwright is not plan proof.** A browser check after the change is a sensor. A green run does not show that the plan was right.
4. **Do not adopt the headline.** Spec and TDD stay together. A test the same agent can rewrite is not evidence and must not be called VERIFIED. Acceptance checks and human review of the diff remain the sensor.
5. **Do not adopt permission bypass.** The bypass alias in video 2 is that demo's personal practice. Level 2 autonomy, frozen surfaces, and the write barrier stay in force. "It has not deleted a database on another machine" is not a policy.
6. **Stateful map.** For stateful systems, flags, or data, still look at the map when tests pass. Do not expand the change into the kernel, Fundacion, or the constitution. Do not mark PRODUCTION READY from a local demo.

## Pin path

Positive entries `GK-FZ-01` … `GK-FZ-05` live in `docs/intelligence/EOS_GLOBAL_KNOWLEDGE.json`. `loadGlobalKnowledge` in `src/core/runtime/global-knowledge.js` reads that file (positive entries, text capped at 400 characters) for CURSOR_PROMPT injection. Do not hand-edit a generated `CURSOR_PROMPT.md`. Machine-readable companion: `RSC-0021-fazt-model-harness-orchestrator-digest.json`.
