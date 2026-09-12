# Spec — Law VI Secret Runtime Broker / Env Gate (SPEC-0052)

## ADDED Requirements

### Requirement: Runtime inject from process env only
WHEN a provider adapter needs a secret at call time, THE SYSTEM SHALL inject it via the Law VI runtime broker from process env only.

#### Scenario: Inject to allowlisted adapter
- GIVEN a hermetic env map with an allowlisted env key and an allowlisted adapter
- WHEN `injectToAdapter` is invoked
- THEN the system returns `OK` with a sealed receipt that does not contain the secret value, and the adapter receives the secret ephemerally

#### Scenario: Missing env DENY
- GIVEN an allowlisted env key with empty/absent value
- WHEN `injectToAdapter` or `resolveSecret` is invoked
- THEN the system returns `MISSING_ENV` with sealed receipt

### Requirement: DENY persist of secrets into EVD / federation / repo
IF a code path attempts to persist a provider secret into EVD bodies, federation envelopes, or repo files, THE SYSTEM SHALL DENY and emit a sealed receipt.

#### Scenario: EVD body leak DENY
- GIVEN a persist attempt targeting an EVD-shaped body with secret material
- WHEN `attemptPersist` is invoked
- THEN the system returns `SECRET_LEAK_FORBIDDEN` with sealed receipt

#### Scenario: Federation envelope leak DENY
- GIVEN a persist attempt targeting a federation envelope with secret material
- WHEN `attemptPersist` is invoked
- THEN the system returns `SECRET_LEAK_FORBIDDEN` with sealed receipt

#### Scenario: Repo-path leak DENY
- GIVEN a persist attempt targeting a repo-path-shaped destination with secret material
- WHEN `attemptPersist` is invoked
- THEN the system returns `SECRET_LEAK_FORBIDDEN` with sealed receipt

### Requirement: No static provider-secret prefix literals
WHILE the broker is active, THE SYSTEM SHALL never introduce static provider-secret prefix literals into the repository (Law VI).

#### Scenario: Source scan CLEAN
- GIVEN modules under `src/core/secrets/`
- WHEN scanned for the forbidden provider secret prefix as a contiguous literal
- THEN there are zero matches

### Requirement: Production honesty + NON-CLAIM
THE SYSTEM SHALL set `AU_PRODUCTION_READY='NO'` and MUST NOT claim vault, KMS, secret-manager SaaS, or cloud IAM. Fundacion writes SHALL always DENY (Δ=0).
