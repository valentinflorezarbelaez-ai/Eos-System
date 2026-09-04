---
name: deep-research
description: Multi-tool research workflow combining Brave Search, Fetch, Context7, and Sequential Thinking to produce structured, evidence-backed research reports.
---

# Deep Research Skill

Execute thorough, multi-source research using the full MCP tool arsenal.

## When to Use

- Technology evaluation or comparison
- Library/framework selection
- Architecture decision research
- Bug investigation requiring external context
- Competitive analysis or market research
- Security vulnerability assessment

## Workflow

### Step 1: Define Research Question

Clearly articulate:
- What specific question needs answering?
- What constraints exist (stack, budget, timeline)?
- What quality of evidence is needed?

### Step 2: Broad Search (Brave Search)

Execute 2-3 targeted searches:
```
Search 1: "[topic] best practices 2026"
Search 2: "[topic] vs [alternative] comparison benchmark"
Search 3: "[topic] production issues gotchas"
```

Capture the top 5-8 URLs from results.

### Step 3: Deep Read (Fetch)

For each promising URL:
1. Fetch the full page content
2. Extract key claims, data points, code examples
3. Note the publication date (discard sources > 18 months old unless foundational)
4. Record contradictions between sources

### Step 4: Library Documentation (Context7)

If the research involves specific libraries:
1. Resolve the library ID via Context7
2. Query for the specific API or feature in question
3. Get version-pinned documentation
4. Cross-reference with what Fetch returned

### Step 5: Structured Analysis (Sequential Thinking)

Use Sequential Thinking to process all gathered information:

```
Thought 1: Summarize the problem space
Thought 2: List all viable options with key characteristics
Thought 3: Build tradeoff matrix (performance, DX, maintenance, community)
Thought 4: Identify risks and mitigations for top options
Thought 5: Formulate recommendation with confidence level
```

### Step 6: Persist Findings (Engram)

Save the research decision to Engram:
```
title: "Research: [topic] — [recommendation]"
type: decision
content: |
  What: [1-sentence summary]
  Why: [motivation]
  Options: [list considered]
  Decision: [chosen option with justification]
  Risks: [identified risks]
```

## Output Template

```markdown
# Research Report: [Topic]

## Executive Summary
[2-3 sentences]

## Sources Consulted
1. [URL] — [key takeaway]
2. [URL] — [key takeaway]
...

## Options Analysis

| Criterion | Option A | Option B | Option C |
|:---|:---|:---|:---|
| Performance | ... | ... | ... |
| DX | ... | ... | ... |
| Community | ... | ... | ... |
| Maintenance | ... | ... | ... |

## Recommendation
**[Option]** — [justification with evidence references]

## Confidence Level
[NOT VERIFIED | PARTIALLY VERIFIED | VERIFIED]

## Risks & Mitigations
- Risk 1: ... → Mitigation: ...
```

## Anti-Hallucination Checklist

Before finalizing any research report:
- [ ] Every cited source was actually fetched and read
- [ ] No benchmark numbers were invented
- [ ] Confidence level accurately reflects evidence quality
- [ ] Contradictions between sources are acknowledged
- [ ] Publication dates are noted for time-sensitive claims
