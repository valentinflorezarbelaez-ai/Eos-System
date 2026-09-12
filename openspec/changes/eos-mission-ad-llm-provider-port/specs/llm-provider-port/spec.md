# Spec — llm-provider-port (SPEC-0035 / Mission AD)

## Requirement: Injectable provider port

The system SHALL expose `createLlmProviderPort(options)` with
`kind: 'eos-llm-provider-port'` and `PRODUCTION_READY: 'NO'`. Methods SHALL
include `complete`, `health`, `getState`, `listProviders`, and `resolveRoute`.
Provider ids SHALL include `openai`, `anthropic`, `gemini`, `ollama`, and
`fake`. Adapters SHALL be injectable via `options.providers`.

### Scenario: Fake complete succeeds hermetically

- GIVEN a port with default fake adapter and valid routing SSOT
- WHEN `complete({ preferred: 'fake', prompt })` runs
- THEN the result is `ok:true` with `provider:'fake'` and no network I/O

## Requirement: Fail-closed credentials

Non-fake providers SHALL require documented env key names
(`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`/`GOOGLE_API_KEY`,
`OLLAMA_BASE_URL`). Missing required env SHALL fail-closed with
`MISSING_PROVIDER_CREDENTIAL` or `PROVIDER_UNAVAILABLE`. Secret **values**
SHALL never appear in source, errors, or `getState` dumps (Law VI).

### Scenario: Missing OPENAI_API_KEY

- GIVEN env without `OPENAI_API_KEY` and `fallback:false`
- WHEN `complete({ provider: 'openai' })` runs
- THEN it throws `MISSING_PROVIDER_CREDENTIAL`

## Requirement: Unknown provider DENY

Unknown provider ids SHALL fail-closed with `UNKNOWN_PROVIDER`.

## Requirement: Model routing SSOT

The router SHALL load `docs/model-routing/MODEL_ROUTING.md` (YAML fence or
documented table). `resolveRoute({ intent, preferred? })` SHALL return an
ordered unique provider list. Missing/malformed SSOT SHALL fail-closed with
`ROUTING_SSOT_INVALID`. On provider failure, the port SHALL try the next
provider in the chain; exhaustion SHALL yield `ALL_PROVIDERS_FAILED`.

## Requirement: PRODUCTION_READY remains NO + NON-CLAIM

`LLM_PRODUCTION_READY` SHALL equal `'NO'`. Health/state SHALL include
NON-CLAIM markers: live LLM ≠ PRODUCTION_READY, keys never in repo, not
AE/AF/AG/AH, Fundacion Δ=0. Mission AD SHALL NOT wire the full eos-shell
live loop (that is AF).
