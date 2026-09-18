# MODEL_ROUTING — SSOT (Mission AD / SPEC-0035)

**PRODUCTION_READY: NO**  
**NON-CLAIM:** live LLM ≠ PRODUCTION_READY · API keys never in repo · Fundacion Δ=0 · not AE/AF/AG/AH

This document is the **single source of truth** for default provider selection
and dynamic fallback chains consumed by `src/core/llm/model-router.js` and
`src/core/llm/llm-provider-port.js`.

## Schema (YAML fence required for machine parse)

| Field | Type | Meaning |
| --- | --- | --- |
| `default` | string | Default provider id when intent is absent/`default` |
| `fallbacks` | string[] | Ordered fallback chain after primary |
| `intents` | map → string[] | Per-intent ordered provider preference |

### Provider ids

`openai` | `anthropic` | `gemini` | `ollama` | `openrouter` | `fake`

### Env var names (values NEVER in repo — Law VI)

| Provider | Env names (document only) |
| --- | --- |
| openai | `OPENAI_API_KEY` |
| anthropic | `ANTHROPIC_API_KEY` |
| gemini | `GEMINI_API_KEY` or `GOOGLE_API_KEY` |
| openrouter | `OPENROUTER_API_KEY` (document only; value never in repo — Law VI) |
| ollama | `OLLAMA_BASE_URL` (URL; not a secret) |
| fake | _(none — hermetic)_ |

Missing required env for a non-fake provider → fail-closed
`MISSING_PROVIDER_CREDENTIAL` / `PROVIDER_UNAVAILABLE`.

```yaml
# Mission AD hermetic-first defaults (CI path uses fake).
default: fake
fallbacks:
  - ollama
  - openai
  - anthropic
  - gemini
intents:
  chat:
    - fake
    - openai
    - anthropic
  codegen:
    - fake
    - anthropic
    - openai
  summarize:
    - fake
    - gemini
    - openai
  local:
    - ollama
    - fake
  hermetic:
    - fake
```

## Resolve semantics

`resolveRoute({ intent, preferred? })` → ordered unique provider list:

1. If `preferred` present → prepend those ids.
2. Else if intent has an `intents` entry → that list.
3. Else → `[default, ...fallbacks]`.
4. Append remaining fallbacks/default (deduped) so exhaust path is defined.
5. On provider failure at runtime, try next in chain; exhaust → `ALL_PROVIDERS_FAILED`.
6. Malformed/missing SSOT → `ROUTING_SSOT_INVALID` (fail-closed).

## Honesty

- Default CI / hermetic path uses **`fake`** (no network).
- Real stubs fail-closed without env keys; Mission AD does **not** ship live
  HTTP transports (that is later AF+ wiring).
- This SSOT is **not** a billing platform, **not** PRODUCTION_READY, and
  **must not** contain secret values.
