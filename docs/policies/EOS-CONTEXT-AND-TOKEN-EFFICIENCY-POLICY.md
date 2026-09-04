# EOS Context and Token Efficiency Policy

**Status:** Proposed canonical policy
**Authority:** LEVEL_0 / MCL-0
**Scope:** All EOS missions, agents, workflows and tool calls

## Purpose

EOS must maximize useful engineering progress per unit of context, tokens, tool calls and wall-clock time without reducing correctness or evidence quality. Economy never means omitting necessary reasoning, tests or safety information. It means sending each agent the smallest complete context required to perform its contract correctly.

## Core Rules

| Rule | Requirement |
| --- | --- |
| **Canonical context** | Store facts, standards, decisions and contracts once; reference them by stable ID and content hash rather than duplicating them in every prompt |
| **Layered context** | Load context in layers: mission summary, task contract, relevant files, focused evidence, optional background |
| **Budget before execution** | Every mission and task declares token, tool-call, duration and retry budgets before work starts |
| **Structured outputs** | Agents return schema-conformant JSON or bounded Markdown sections, not unrestricted essays |
| **Early validation** | Validate inputs, schemas, permissions and preconditions before invoking an expensive model or tool |
| **Small tasks** | Prefer one independently verifiable task over a large multi-purpose task |
| **Evidence reuse** | Reuse previously verified evidence by reference when its source hash and validity window remain current |
| **No blind retries** | Retry only after classifying the failure as transient, input-related, tool-related, environment-related or agent-related |
| **Escalate uncertainty** | Ask the human when resolving uncertainty is cheaper and safer than repeated speculative execution |
| **Stop on divergence** | Pause when the observed repository, contract, permissions or output shape diverges from the mission |
| **No false savings** | Never reduce test, security, privacy or review evidence solely to save tokens |

## Context Tiers

| Tier | Contents | Default use |
| --- | --- | --- |
| **T0** | Mission ID, objective, authority, task ID, status and stop conditions | Every call |
| **T1** | Contract, acceptance criteria, allowed tools, protected surfaces and output schema | Every task call |
| **T2** | Relevant project context and selected source files | Only when required by the task |
| **T3** | Prior evidence, decisions, risks and related artifacts by reference | When needed to resolve dependencies |
| **T4** | Broad repository history, external research or optional examples | Explicitly requested or justified only |

Agents must not receive T4 context when T0–T2 are sufficient.

## Budget Accounting

EOS records requested, reserved, consumed and remaining budgets. A budget overrun is a policy event, not a hidden continuation.

```yaml
budget:
  max_input_tokens: 0
  max_output_tokens: 0
  max_tool_calls: 0
  max_retries: 0
  max_duration_seconds: 0
  max_parallel_tasks: 0
```

The orchestrator may reserve a small emergency budget for error classification and escalation. It may not use emergency budget to expand scope.

## Agent Output Contract

Every agent output must contain only the sections required by its task contract:

```yaml
result:
  status: completed | blocked | failed | needs_human | partial
  summary: string
  artifacts: []
  evidence_refs: []
  risks: []
  unknowns: []
  next_action: string | null
  budget_consumed: {}
```

A concise output is preferred, but concise does not mean unsupported. Claims without evidence references are incomplete.

## Failure and Retry Policy

EOS retries at most the declared limit. Each retry must change something meaningful: input correction, reduced scope, alternate tool, refreshed context, or explicit human decision. Identical retries are prohibited.

| Failure class | Default response |
| --- | --- |
| **Schema or input error** | Reject before model invocation and request correction |
| **Permission denial** | Stop; do not retry with broader permissions |
| **Transient tool failure** | Retry within budget with backoff |
| **Repository divergence** | Pause and recompile context |
| **Agent contract violation** | Stop task, preserve evidence and create remediation |
| **Ambiguous requirement** | Ask or escalate; do not invent facts |
| **Test failure** | Route to diagnosis/remediation, not success |
| **Budget exhaustion** | Stop with `budget_exhausted`; require reprioritization |

## Efficiency Metrics

EOS should measure useful efficiency, not token volume alone:

- Verified acceptance criteria per 1,000 model tokens;
- Successful task completions per tool call;
- Percentage of reused valid context references;
- Retry rate by failure class;
- Budget variance;
- Rework caused by ambiguous specifications;
- Percentage of outputs accepted without clarification;
- Evidence completeness per completed task.

These metrics are operational indicators. They must not be used to reward agents for suppressing risks or shortening necessary evidence.
