# Mission AD — LLM Provider Port & Model Routing Adapter (SPEC-0035) — 2026-09-12

## Summary

Fail-closed **LLM Provider Port** with injectable adapters
(`openai` | `anthropic` | `gemini` | `ollama` | `fake`) plus **Model Routing
SSOT** (`docs/model-routing/MODEL_ROUTING.md`) and dynamic fallback.
Hermetic **FakeLlmProvider** for CI; real adapters are thin stubs that
fail-closed without env keys and perform **no network I/O** on the default
path. Law VI secret sanitization on errors and state dumps. Additive under
`src/core/llm/` — **does not** implement AE/AF/AG/AH, **does not** wire the
full eos-shell live loop (AF), **does not** flip PRODUCTION_READY, **does not**
use CloudAgent, **does not** put API keys in repo.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `6be6aaf` (main tip after #195 tip-194 + #196 L14 audit) |
| Branch | `grok/mission-ad-llm-provider-port` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ad` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ad-payload` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Live LLM | **NON-CLAIM** — live LLM ≠ PRODUCTION_READY |
| API keys in repo | **FORBIDDEN** — env names only (`OPENAI_API_KEY`, …) |
| AE / AF / AG / AH | **NOT implemented** in this mission |
| eos-shell live loop | **OUT** — AF territory |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| External LLM SDKs for CI | **NOT required** |

## Routing

| Signal | Path |
| --- | --- |
| Port | `createLlmProviderPort` → complete / health / getState / listProviders / resolveRoute |
| SSOT | `docs/model-routing/MODEL_ROUTING.md` (YAML fence) |
| Router | `createModelRouter` / `resolveRoute({ intent, preferred? })` |
| Fake | `createFakeLlmProvider` — hermetic, deterministic |
| Fail-closed codes | `MISSING_PROVIDER_CREDENTIAL`, `PROVIDER_UNAVAILABLE`, `UNKNOWN_PROVIDER`, `ROUTING_SSOT_INVALID`, `ALL_PROVIDERS_FAILED` |
| Law VI | `sanitizeLlmPayload` — redact apiKey/token/authorization |
| AGY / CloudAgent | **NON-CLAIM** |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/llm/llm-provider-port.js` | **NEW** |
| `src/core/llm/model-router.js` | **NEW** |
| `src/core/llm/fake-llm-provider.js` | **NEW** |
| `docs/model-routing/MODEL_ROUTING.md` | **NEW** |
| `tests/eos-ad-llm-provider-port.test.js` | **NEW** |
| `scripts/patch-mission-ad.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ad-payload && npm run test:llm-provider-port
```

→ **15 PASS**, 0 SKIP, 0 FAIL (AD1–AD15)

Slim exclude basename: `eos-ad-llm-provider-port.test.js`  
Scripts: `npm run test:llm-provider-port` / `npm run test:mission-ad`

## Cases

| ID | Result |
| --- | --- |
| AD1 kind + PRODUCTION_READY NO | PASS |
| AD2 fake complete OK | PASS |
| AD3 FakeLlmProvider hermetic | PASS |
| AD4 missing env fail-closed | PASS |
| AD5 unknown provider DENY | PASS |
| AD6 SSOT file resolve | PASS |
| AD7 preferred + fallback | PASS |
| AD8 ALL_PROVIDERS_FAILED | PASS |
| AD9 Law VI redact | PASS |
| AD10 health/state/list | PASS |
| AD11 ROUTING_SSOT_INVALID | PASS |
| AD12 stub+env no network | PASS |
| AD13 injectable adapters | PASS |
| AD14 env key names only | PASS |
| AD15 ollama missing URL | PASS |

## Secrets hygiene

- No `sk-…` live secrets in source (test uses ephemeral fake strings only in
  memory assertions; redaction verified).
- Env **names** documented in SSOT + `LLM_ENV_KEYS`; values never committed.
