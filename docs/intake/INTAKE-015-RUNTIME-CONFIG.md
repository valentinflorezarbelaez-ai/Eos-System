# INTAKE-015: Runtime Configuration & Environment Profile Engine

* **Project:** EOS Core System v3.0 Evolution
* **Intake ID:** INTAKE-015-RUNTIME-CONFIG
* **Timestamp:** 2026-10-25T17:11:00-05:00
* **Authorizer:** Lead Systems Architect & Valentin Florez (System Owner)
* **Status:** INTAKE_COMPLETE

---

## 1. Context & Business Need
EOS System previously relied on ambient file paths, hardcoded default configurations, and loose environment variable assumptions. There was no centralized, type-safe configuration schema, no environment profile isolation (dev vs staging vs prod), and no automated guardrail to detect plaintext credentials or unexpanded secret references in configuration trees.

Commandment VI ("The Law of Absolute Security & Zero Plain Secrets") dictates that all configuration must be strictly bounded, sanitized, and type-safe, preventing plaintext API keys, passwords, and bearer tokens from entering the repository or runtime memory unvalidated.

## 2. Scope of Delivery
1. Pure Domain Model `EnvironmentConfig.ts`:
   - Profile types: `development`, `staging`, `production`, `test`.
   - Immutable type-safe configuration schema.
   - Secret reference resolver (e.g. `$ENV{FOO}` or `${FOO}`).
   - Plaintext secret scanner (flags potential API keys, JWTs, private keys).
2. Infrastructure Adapter `ConfigLoader.ts`:
   - Loads base configuration and overrides from profile files (`.eos/config/default.json`, `dev.json`, `prod.json`).
   - Deep merges configuration hierarchies with deterministic precedence.
3. CLI Command in `scripts/eos-cli.mjs`:
   - `eos config [show|validate|switch]`
4. Unit Tests with 100% line coverage:
   - `tests/unit/domain/EnvironmentConfig.test.ts`
   - `tests/unit/infrastructure/ConfigLoader.test.ts`
5. Strict Verification & Invariant audit:
   - Updated `verify-strict.ps1` with 13 domain models and zero plain secrets validation.
