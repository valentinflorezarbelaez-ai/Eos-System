# Design — Mission AU Law VI Secret Runtime Broker (SPEC-0052)

## Architecture

Injectable runtime broker over a hermetic env map + env-gate allowlists.
Secrets never leave process env into EVD / federation / repo; inject-only
to allowlisted adapters at call time.

```
resolveSecret(envKey) → gate → env map presence/hash (no raw on public result)
injectToAdapter(adapterId, envKey, adapter) → gate → raw to adapter only → sealed receipt
attemptPersist({payload, target}) → leak-guard → DENY SECRET_LEAK_FORBIDDEN | FUNDACION_DENIED
```

## Fail-closed DENY paths

| Condition | Code |
| --- | --- |
| Env value absent / empty | `MISSING_ENV` |
| Adapter not on allowlist | `ADAPTER_NOT_ALLOWLISTED` |
| Env key not on allowlist | `ENV_KEY_NOT_ALLOWLISTED` |
| Secret into EVD / federation / repo | `SECRET_LEAK_FORBIDDEN` |
| Fundacion write target | `FUNDACION_DENIED` |
| Env map injector absent (when required) | `MISSING_DEP` |
| Bad / missing envKey or adapterId | `INVALID_REQUEST` |

## Receipts

Sealed receipts carry `envKeyPresent` + `envValueHash` only — never raw
secret values. Law VI sanitize on getState / errors.

## Explicit non-goals

Vault, KMS, secret-manager SaaS, cloud IAM product, AV/AW,
PRODUCTION_READY flip, static provider-secret prefix literals in repo,
CloudAgent path.
