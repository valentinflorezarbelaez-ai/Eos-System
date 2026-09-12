# Design — Mission AD (SPEC-0035)

## Architecture

```
createLlmProviderPort({
  providers?,          // injectable adapters map
  routingPath?,        // docs/model-routing/MODEL_ROUTING.md
  routingMarkdown?,    // inline SSOT for tests
  routingConfig?,      // pre-parsed
  env?,                // injectable process.env
  allowNetwork?=false, // CI default: stubs never dial
  fakeOptions?
})
  complete(request)
    1. resolveRoute({ intent, preferred }) → ordered chain
    2. try each provider.complete; on failure → next
    3. exhaust → ALL_PROVIDERS_FAILED
  resolveRoute / listProviders / health / getState
    kind:'eos-llm-provider-port', PRODUCTION_READY:'NO'
    Law VI sanitize on dumps + errors
```

## Providers

| Id | Default adapter | Credential env (names only) |
|----|-----------------|-----------------------------|
| fake | hermetic FakeLlmProvider | _(none)_ |
| openai | stub fail-closed | `OPENAI_API_KEY` |
| anthropic | stub fail-closed | `ANTHROPIC_API_KEY` |
| gemini | stub fail-closed | `GEMINI_API_KEY` / `GOOGLE_API_KEY` |
| ollama | stub fail-closed | `OLLAMA_BASE_URL` |

Missing env → `MISSING_PROVIDER_CREDENTIAL`. Unknown id → `UNKNOWN_PROVIDER`.
SSOT missing/malformed → `ROUTING_SSOT_INVALID`.

## Routing SSOT

`docs/model-routing/MODEL_ROUTING.md` YAML fence:

```yaml
default: fake
fallbacks: [ollama, openai, ...]
intents:
  chat: [fake, openai, ...]
```

## Controls

| ID | Control |
|----|---------|
| AD1 | kind + PRODUCTION_READY NO |
| AD2 | fake complete OK |
| AD3 | FakeLlmProvider hermetic |
| AD4 | missing env fail-closed |
| AD5 | unknown provider DENY |
| AD6 | SSOT file resolve |
| AD7 | preferred + fallback chain |
| AD8 | ALL_PROVIDERS_FAILED |
| AD9 | Law VI redact |
| AD10 | health / state / list |
| AD11 | ROUTING_SSOT_INVALID |
| AD12 | stub+env still no network |
| AD13 | injectable providers map |
| AD14 | env key names documented |
| AD15 | ollama missing URL |

## Honesty / NON-CLAIM

- live LLM ≠ PRODUCTION_READY
- keys never in repo
- not AE/AF/AG/AH
- Fundacion Δ=0
- not full eos-shell live loop (AF)

## Non-goals

No PRODUCTION_READY flip. No CloudAgent. No TR-01 raise. No new npm deps.
No Fundacion touches. No live SDK default path.
