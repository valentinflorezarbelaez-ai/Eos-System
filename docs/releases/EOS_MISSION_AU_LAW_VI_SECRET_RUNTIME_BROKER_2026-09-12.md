# Mission AU — Law VI Secret Runtime Broker / Env Gate (SPEC-0052) — 2026-09-12

## Summary

Hermetic **Law VI Secret Runtime Broker / Env Gate** — typed runtime broker
over AO (+ AD concepts) that injects provider secrets only at call time from
an injectable process-env map into allowlisted adapters:
`resolveSecret` → presence/hash only; `injectToAdapter` → raw to adapter only
+ sealed receipt without secret values; `attemptPersist` → DENY
`SECRET_LEAK_FORBIDDEN` for EVD / federation / repo-shaped targets;
Fundacion ALWAYS_DENY; Law VI sanitize. Hermetic fake env only. Additive under
`src/core/secrets/` — **does not** implement AV/AW, **does not** flip
PRODUCTION_READY, **does not** use CloudAgent, **does not** claim vault / KMS /
secret-manager SaaS / cloud IAM.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `c12cc82` |
| Branch | `grok/mission-au-law-vi-secret-runtime-broker` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-au` |
| Payload | `C:\Users\valen\Documents\Eos-mission-au-payload` |
| Ladder 17 | AT MEASURED (#248); **AU this mission**; AV/AW not this mission |
| Commit | `feat(secrets): Law VI secret runtime broker / env gate (SPEC-0052)` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `AU_PRODUCTION_READY='NO'` |
| vault / KMS | **NON-CLAIM** — broker ≠ vault / KMS |
| secret-manager SaaS | **NON-CLAIM** — ≠ secret-manager product |
| cloud IAM | **NON-CLAIM** — ≠ cloud IAM |
| AV/AW | **NOT implemented** in this mission |
| Secrets in repo | **FORBIDDEN** — Law VI; zero contiguous forbidden provider prefix literals |
| CloudAgent | **NON-CLAIM** — Antigravity-first |

## Routing

| Signal | Path |
| --- | --- |
| Kind | `eos-law-vi-secret-runtime-broker` |
| Codes | `OK`, `DENY`, `MISSING_ENV`, `ADAPTER_NOT_ALLOWLISTED`, `ENV_KEY_NOT_ALLOWLISTED`, `SECRET_LEAK_FORBIDDEN`, `INVALID_REQUEST`, `MISSING_DEP`, `FUNDACION_DENIED` |
| Tests | `tests/eos-au-law-vi-secret-runtime-broker.test.js` (AU1–AU20) |
| Scripts | `test:law-vi-broker` / `test:secret-runtime-broker` / `test:mission-au` |
| Slim | exclude `eos-au-law-vi-secret-runtime-broker.test.js` (≤145) |
| Patcher | `scripts/patch-mission-au.mjs` (CRLF-safe) |

## EARS (L17 audit §AU)

1. WHEN a provider adapter needs a secret at call time, THE SYSTEM SHALL inject it via the Law VI runtime broker from process env only.
2. IF a code path attempts to persist a provider secret into EVD bodies, federation envelopes, or repo files, THE SYSTEM SHALL DENY and emit a sealed receipt.
3. WHILE the broker is active, THE SYSTEM SHALL never introduce static provider-secret prefix literals into the repository (Law VI).

## Artifacts

- `src/core/secrets/secret-runtime-broker.js`
- `src/core/secrets/env-gate.js`
- `src/core/secrets/secret-leak-guard.js`
- `src/core/secrets/broker-receipt.js`
- `tests/eos-au-law-vi-secret-runtime-broker.test.js`
- `scripts/patch-mission-au.mjs`
- `openspec/changes/eos-mission-au-law-vi-secret-runtime-broker/`
- `PACKAGE_SCRIPTS_NOTE.md`
- `MISSION_AU_BOOTSTRAP.ps1`

## Verify (box)

```bash
node --test tests/eos-au-law-vi-secret-runtime-broker.test.js
node --check src/core/secrets/*.js
# forbidden provider prefix: CLEAN (0 matches) across payload
```

Host bootstrap NOT run in box (Antigravity-first payload-only).

## MEASURED (box-green)

| Metric | Value |
| --- | --- |
| Tests | **20/20 PASS** (`node --test`) |
| Forbidden provider prefix | **CLEAN** (0 matches) |
| `node --check` | **PASS** |
| PRODUCTION_READY | **NO** |
| Fundacion Δ | **0** |

See `BOX_GREEN.md`.
