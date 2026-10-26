# SPEC-015: Runtime Configuration & Environment Profile Engine

* **Status:** SPECIFICATION_APPROVED
* **Author:** Lead Systems Architect & Valentin Florez
* **Version:** 1.0.0
* **Created:** 2026-10-25T17:11:30-05:00

---

## Functional Requirements (EARS Syntax)

### FR-015-01 (Ubiquitous)
THE SYSTEM SHALL encapsulate all runtime configuration within an immutable, validated `EnvironmentConfig` domain entity across four profile environments: `development`, `staging`, `production`, and `test`.

### FR-015-02 (Event-Driven)
WHEN configuration data contains environment reference placeholders formatted as `${ENV_VAR}` or `$ENV{ENV_VAR}`, THE SYSTEM SHALL resolve them against runtime environment variables.

### FR-015-03 (Error-Driven)
IF a configuration property contains an unexpanded secret reference in production profile, THEN THE SYSTEM SHALL throw an Error identifying the missing required environment variable.

### FR-015-04 (Event-Driven)
WHEN `scanForSecrets()` is invoked on a configuration tree, THE SYSTEM SHALL detect potential plaintext tokens, private keys, or high-entropy credentials and return a non-empty findings report.

### FR-015-05 (Event-Driven)
WHEN `ConfigLoader.loadConfig(profile, configDir)` is executed, THE SYSTEM SHALL load the default profile, merge profile-specific overrides, resolve environment variables, and return a validated `EnvironmentConfig`.

### FR-015-06 (Event-Driven)
WHEN the command `eos config validate` is executed, THE SYSTEM SHALL verify that all required secrets are present and no plaintext secrets are committed to the configuration directory.

---

## Non-Functional Requirements

| NFR | Constraint |
|:---|:---|
| NFR-015-01 | Domain entity (`EnvironmentConfig.ts`) must have 0 external dependencies (pure TypeScript) |
| NFR-015-02 | Configuration resolution must execute in < 10ms for cold startup |
| NFR-015-03 | 100% line coverage in unit tests |
| NFR-015-04 | Deep clone on config trees to prevent external mutation |

---

## Acceptance Criteria (BDD)

### SC-015-01: Profile Loading & Environment Reference Resolution
```gherkin
SCENARIO: Dynamic environment reference expansion
  GIVEN a config property "apiKey: ${GEMINI_API_KEY}"
  AND the environment variable GEMINI_API_KEY is "test-secret-123"
  WHEN EnvironmentConfig resolves the configuration
  THEN the property value becomes "test-secret-123"
```

### SC-015-02: Plaintext Secret Detection
```gherkin
SCENARIO: Scanning for hardcoded credentials
  GIVEN a configuration containing "aiKey: AIzaSyD-dummyKey1234567890abcdef"
  WHEN scanForSecrets is executed
  THEN a finding is identified for property "aiKey"
  AND the finding flags potential Google API key exposure
```

### SC-015-03: Missing Secret In Production Throws
```gherkin
SCENARIO: Unresolved variable in production
  GIVEN a production profile with required variable "DATABASE_URL"
  AND the environment variable DATABASE_URL is unset
  WHEN EnvironmentConfig validates the profile
  THEN an Error is thrown indicating missing required variable
```
