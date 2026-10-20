# AI Engineer Profile & Typed Decision Models

* **Status:** CAPTURED (knowledge ingested; no capability adopted)
* **Date:** 2026-10-20
* **Provenance:** LIDR *AI Engineer PRO* workshop material (SRC-0074) plus public sources SRC-0075..SRC-0080
* **Evidence:** `docs/evidence/EVD-0073-ai-engineer-pro-knowledge-ingest.json`
* **Related:** `docs/intelligence/research/RSC-0021-ai-engineer-profile-and-typed-decision-models.json`, `docs/intelligence/patterns/PAT-0005-typed-decision-contracts.json`, `docs/intelligence/anti-patterns/ANT-0004-llm-for-every-decision.json`

> **NON-CLAIM:** This document records external knowledge. It does **not** authorize a new dependency, a new runtime module, or any change to kernel (`src/core/`) behaviour. Adoption of any element is explicitly `OBSERVE` (see RSC-0021). L0 purity (`DEPENDENCY_POLICY_L0.md`) and the external write barrier are untouched.

---

## 1. Purpose

Capture, in one place, the answer set the LIDR *AI Engineer PRO* workshop opens with — what an AI Engineer is, how the role differs from Machine Learning, which competencies it requires, why demand grew, and what typed decision models (Jev) add to an agent architecture — so that EOS can reason about the AI Engineer competency model and about decision-classification as a system primitive.

The workshop material page is video-first (a Vimeo recording plus a presentation `.mov`). No transcript is indexable, so every statement below is either (a) from the public workshop landing page, or (b) from the public sources in §10. Statements that reached us second-hand are flagged in-line.

---

## 2. What an AI Engineer is

Operational definition used across the market and the workshop:

> **Data Scientists answer questions. ML Engineers build systems. AI Engineers ship products.**

An **AI Engineer is a software engineer whose building material is third-party pre-trained models** (LLMs, embeddings, decision models) plus data plus orchestration. The deliverable is a **product with an SLA**: latency, cost per request, evaluations, guardrails and observability.

The boundary that matters is not "model knowledge", it is *what is the unit of work*:

| Dimension | Programming *with* AI | AI Engineering |
| --- | --- | --- |
| The AI is | your tool | the product being delivered |
| Optimized for | authoring speed | latency, cost, accuracy, reliability |
| Correctness proof | "works on my machine" | **evals** with recorded numbers |
| Core activity | prompting | architecture: RAG, agents, guardrails, routing, HITL |
| Key judgement | how to ask | **when not to call a model at all** |

The last row is the discriminating skill, and it is the bridge to §7.

---

## 3. Role boundary: Data Scientist vs ML Engineer vs AI Engineer

| | **Data Scientist** | **ML Engineer** | **AI Engineer** |
| --- | --- | --- | --- |
| Mission | Explain the business with data | Train and serve own models | Integrate foundation models into a product |
| Typical ticket | churn, A/B significance, KPI dashboard | training pipeline, drift, GPU, MLOps | model router, RAG, agent loop, evals, guardrails |
| Mathematics required | statistical inference | gradients, loss, architecture, distributions | enough to know model limits |
| Trains models? | occasionally | **yes, that is the job** | **almost never** (occasional fine-tune) |
| Stack | SQL, dbt, Airflow, sklearn | PyTorch, TF, JAX, Kubernetes | Python/TS, LangChain/LangGraph, vector DB, MCP, tracing |
| Entry barrier | lowest formality | highest (needs 2–4 years production SWE) | most **portfolio-driven** |

**Title inflation warning.** Roughly half of listings tagged "AI Engineer" are ML Engineer roles relabelled (SRC-0079). Reading a job title is not evidence of the work; running the interview loop is.

---

## 4. Market signals (dated, with provenance caveats)

Measured October 2026 from live postings that publish a pay range (SRC-0078, USD, mostly US):

| Role | Live postings | Median advertised annual | Interquartile range | Postings with pay |
| --- | --- | --- | --- | --- |
| AI Engineer | 643 | **$216k** | $183k – $265k | 155 |
| ML Engineer | 659 | **$238k** | $198k – $276k | 276 |

Most requested skills in AI Engineer postings: *AI agents* (314), *machine learning* (250), *RAG* (244), *AI safety* (183), *AI research* (168). Most named tools: Python (259), PyTorch (157), **LangChain (138)**, AWS (103), Hugging Face (99). ML Engineer postings instead concentrate on *ML* (444), *MLOps* (167), *fine-tuning* (142), with PyTorch (405) and TensorFlow (264).

Second-hand demand signals (aggregated by SRC-0079, originals not retrieved in this session):

- *AI Engineer is the #1 fastest-growing job in the US* per LinkedIn *Jobs on the Rise 2026*, ahead of AI Consultant, AI Strategist and Founder.
- **88%** of organizations report regular AI use in at least one business function, up from 78% a year earlier (McKinsey, *The State of AI 2025*).
- Nearly 9 in 10 companies are hiring for at least one of the three roles.
- ML Engineers sit **15–40%** above Data Scientists at median (KORE1 2026 salary guide).

> **Epistemic caveat — do not launder this.** The absolute figures are advertised ranges on US-centric postings with a small published-range sample; they are **not** a global benchmark and do **not** transfer to Spain or LATAM compensation bands, where the absolute range is materially lower. What is defensible is the *relative* ordering and the direction of demand, not the dollar numbers. The three demand bullets above are `DERIVED`: relayed by an interested aggregator.

**Why demand compounds.** The bottleneck moved. "Having a model" is a $20/month API call; "putting it in production without hallucinating, failing or burning tokens" is software engineering. The scarce input is engineering judgement, so the market is not uniformly saturated: it is *saturated at the generic layer* ("I use ChatGPT", prompt-collection certificates) and *thin at the engineering-judgement layer*. SRC-0079's phrasing is apt: one deployed RAG system with documented eval numbers outranks a master's thesis in interview practice.

---

## 5. Competency stack

Ordered layers; each one assumes the previous. Layer 0 filters harder than Layers 1–4 combined.

| Layer | Content | Failure mode if skipped |
| --- | --- | --- |
| **0. Software engineering** | git, tests, CI/CD, HTTP APIs, SQL, Docker, observability, Python **and** TypeScript | "demo that cannot ship" |
| **1. LLM fundamentals** | tokens, context window, embeddings, sampling/temperature, cost & latency per token, and the limits (non-determinism, no grounded reasoning) | magical thinking about model capability |
| **2. Data & retrieval** | chunking, embeddings, vector stores, hybrid search (BM25 + vector), reranking, **retrieval evaluation** | RAG that retrieves plausible garbage |
| **3. Structured output** | JSON Schema, tool/function calling, Pydantic/Zod validation | unparseable output; no software, only chat |
| **4. Agents** | the decide→act→observe loop, state and memory, subagents, **MCP**, LangGraph / LangChain / Claude Agent SDK | unbounded loops, context pollution |
| **5. Reliability** | evals as unit tests, guardrails, tracing, token budgets, fallbacks, model routing, HITL | "agent that works 70% of the time" |
| **6. Product & deployment** | FastAPI/Streamlit, Vercel, SLA, prompt-injection and context-exfiltration defence, data privacy | security incident |
| **7. Decision classification** | knowing when a step needs generation and when it needs a typed, calibrated decision | paying LLM latency and cost for an `if` |

Portfolio artefact that actually converts: **one deployed multi-agent system with a metrics panel** — p95 latency, cost per request, router accuracy, percentage of tool calls blocked by guardrails.

---

## 6. How LLMs got here

Causal chain, not trivia: each row removed the previous bottleneck.

| Period | Step | What it unlocked |
| --- | --- | --- |
| pre-2013 | statistical NLP, n-grams | fluency without semantics |
| 2013–14 | word2vec / GloVe | words become vectors → semantic similarity → the basis of every RAG system |
| 2014–15 | seq2seq + attention (Bahdanau) | models stop forgetting the start of the sentence |
| **2017** | *Attention Is All You Need* — Transformer | full parallelisation → GPU scaling → *scaling laws* |
| 2018–20 | BERT (encoder) / GPT (decoder), scaling | **in-context / few-shot learning**: no retraining per task |
| Nov 2022 | RLHF + InstructGPT → ChatGPT | from text completion to instruction following |
| 2023 | tool calling + RAG | LLM stops being an oracle, becomes a **reasoning engine wired to data and actions** |
| 2024 | multimodality, long context | whole documents, audio, images |
| 2024–25 | reasoning models (test-time compute, trained CoT) | deliberate "System 2": accuracy up, latency and cost up |
| 2024–26 | agentic era: MCP, Claude Code, Cursor, computer use, subagents | models operate tools and write code |
| **2026** | harness engineering + **typed decision models** | stop routing every step through an LLM |

The recurring pattern: every ~18 months the binding constraint moves from *can the model do it* to *what does doing it reliably cost in latency and money*. Layer 7 and §7 are that shift.

---

## 7. Typed decision models (Jev / "System One")

**Provenance.** Jev is the first public model of **TypeSafe AI** (San Francisco, founded 2024 by Diogo Almeida, formerly OpenAI research behind ChatGPT), released in limited early access on **2026-09-15** alongside a **$40M** seed round led by DCVC (SRC-0077, which cites Forbes; the vendor post SRC-0075 announces the release but not the round). TypeSafe calls the class **System One models**, after Kahneman's fast/intuitive mode; the name *Jev* references William Stanley Jevons and the Jevons paradox — cheaper intelligence expanding total demand rather than reducing it.

**Mechanism.** A **discriminative**, non-generative model. It consumes a *state* plus a set of *questions*, and returns **typed values with calibrated probabilities**. Three question primitives: `choice` (probability per option), `score` (ordered level, continuous score), `noul` (yes/no, probability that the statement holds). Multiple questions about the same state are evaluated **in parallel in a single call**.

```json
{
  "model": "jev-latest",
  "state": "I have been trying to connect Stripe for 3 days and it keeps failing.",
  "questions": {
    "is_urgent": { "type": "noul", "instructions": "Message conveys time-sensitivity" }
  }
}
```

Response shape: `{ "is_urgent": { "noul": 0.999 } }` — directly consumable by code, no parsing and no validation pass.

**Claimed delta versus a frontier LLM** (vendor claims, SRC-0075; restated by SRC-0076):

| Dimension | Frontier LLM | System One / Jev |
| --- | --- | --- |
| Output | strings, must be parsed and validated | typed values, schema fixed in advance |
| Type errors | possible | **impossible by construction** |
| Hallucination | structural risk | **cannot generate text**, so cannot hallucinate prose |
| Confidence | often overconfident and inconsistent | **calibrated probability on every answer** |
| Sampling | sequential, token by token | **parallel, single query** |
| Latency | 3–329 s | **70–500 ms** |
| Cost | $0.20–$10 / MTok input | **$0.042 / MTok input**, output **free** |
| Training signal | RLHF / RLVR (human preference) | **RLCD** — Reinforcement Learning for Calibrated Decisions, on synthetic data |

Headline figures: **40–200× faster**, **40–400× cheaper** on decision-shaped tasks. TypeSafe itself discloses that the benchmark workflows were authored by its own model-capabilities team and may be biased. Treat as order of magnitude, not as a measured truth.

**Where it fits in an agent architecture** (the workshop integrates it live):

1. **Model routing** — classify the request, pick the cheapest capable model (cheap for lookup and extraction, expensive for architecture and high-stakes reasoning).
2. **Guardrails on tool calls** — score each pending action before execution and block the risky ones. This is the classifier that shipped inside closed-source coding harnesses (Claude Code, Codex, Cursor), now available as a replaceable component.
3. **Triage / prioritisation** — urgency, category, sentiment, ticket routing.
4. **Any `if` currently implemented by prompting an LLM for JSON** and paying 800 ms plus a parse-failure rate.

**What it is not.** Not a replacement for an LLM: no generation, no reasoning, no planning. Proprietary, early access, external provider. On genuinely ambiguous semantic tasks a large model still wins. The correct question is never "which is better" but **"does this decision need generation or only classification?"**


---

## 8. Relevance to EOS

| EOS surface | What this knowledge changes |
| --- | --- |
| `ANT-0004` (new) | Formalizes *LLM-for-every-decision* as an anti-pattern: metering discrete structural decisions through a generative model inside a loop. |
| `PAT-0005` (new) | Formalizes *typed decision contracts*: decisions expressed as typed questions with calibrated confidence, evaluated outside the token stream. |
| `docs/model-routing/` | Provides the outside reference point for routing-by-decision rather than routing-by-heuristic. Observed, not adopted. |
| `docs/intelligence/ENGINEERING_ECONOMICS.md` | Cost-model input: output tokens at ~5× input makes long completions the dominant term; decision classification inverts that shape. |
| `DEPENDENCY_POLICY_L0.md` | Hard blocker for any implementation: Jev is a hosted network dependency. L0 stays `NODE_BUILTINS_ONLY`. Any pilot would be an adapter behind an existing seam, never a root dependency. |
| Competency model | Layer 0 (software engineering) is the hire filter; EOS already assumes it. No new policy derived. |

**Disposition:** `OBSERVE`. Knowledge is captured; the capability is not adopted. Revisit only with a measured pilot containing our own eval numbers.

---

## 9. What was not verified

- The workshop video content (Vimeo + `.mov`) was not transcribed; syllabus claims come from the public landing page.
- Every Jev performance multiplier is a **vendor claim**. No independent re-measurement exists in this repo.
- LinkedIn *Jobs on the Rise 2026*, McKinsey *State of AI 2025* and the KORE1 salary guide were **not** retrieved directly; they are relayed by SRC-0079.
- Salary bands are advertised US postings, not realised compensation, and do not transfer to other markets.
- Jev's internal architecture is undisclosed; third-party speculation (open-weight LLM or BERT-like base) is inference, not fact.

---

## 10. Source index

| ID | Source | Class |
| --- | --- | --- |
| `SRC-0074` | LIDR — *AI Engineer PRO* workshop material | PRIMARY_DOCS · VENDOR_PROPRIETARY · PARTIALLY VERIFIED |
| `SRC-0075` | TypeSafe AI — *Introducing System One Models & Jev* | ENGINEERING_BLOG · VENDOR_PROPRIETARY · PARTIALLY VERIFIED |
| `SRC-0076` | LangChain — *Building a Harness with Jev* | ENGINEERING_BLOG · DERIVED · PARTIALLY VERIFIED |
| `SRC-0077` | Wikipedia — *Jev (AI model)* | COMMUNITY_PATTERN · INDEPENDENT · PARTIALLY VERIFIED |
| `SRC-0078` | Level — AI Engineer vs ML Engineer market measurement, Oct 2026 | COMMUNITY_PATTERN · INDEPENDENT · PARTIALLY VERIFIED |
| `SRC-0079` | FoundRole — 2026 AI/ML/DS role and pay comparison | COMMUNITY_PATTERN · DERIVED · PARTIALLY VERIFIED |
| `SRC-0080` | McKinsey *State of AI 2025* / LinkedIn *Jobs on the Rise 2026* (accessed via SRC-0079) | PRIMARY_DOCS · DERIVED · PARTIALLY VERIFIED |
