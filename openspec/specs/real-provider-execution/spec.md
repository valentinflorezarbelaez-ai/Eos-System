# Real Provider Execution Specification

## Purpose

Formalizes the additive real execution path: `EOSProviderRouter` resolves a registered `LlmPort` adapter, passes the ECR budget gate, invokes `infer()` with Law VI credentials, and records usage; MCP `route`/`health` dispatch real behavior.

## Requirements

### Requirement: Real dispatch through the registry

The system MUST resolve taskType mapping via `LlmAdapterRegistry` (registry ids do not match matrix ids) and MUST dispatch real `infer()` calls through registered adapters (GeminiAdapter, OpenRouterAdapter) instead of simulated strings.

#### Scenario: Successful real dispatch

- GIVEN a registered adapter with credentials and a matrix mapping
- WHEN `eos.provider.route` receives a taskType and prompt
- THEN the router passes the ECR gate, invokes `infer()`, records usage, and returns a handle with `proveedorUtilizado`, `modo`, `latency_ms`, `usage`, `PRODUCTION_READY: NO`

#### Scenario: Unmapped matrix id

- GIVEN a taskType with no adapter mapping
- WHEN routing is requested
- THEN the router returns `ADAPTER_NOT_FOUND`; zero network I/O

### Requirement: Law VI credential acquisition

The system MUST acquire provider keys via the Law VI secret broker (env-gate allowlisted names); keys MUST NOT be serialized or logged; AU redaction covers outbound payloads.

#### Scenario: Key flows through the broker

- GIVEN the broker resolves `GEMINI_API_KEY`/`OPENROUTER_API_KEY` presence
- WHEN an adapter dispatches a real call
- THEN the key reaches the adapter only via `injectToAdapter`; no receipt, error, or state contains it

#### Scenario: Missing credentials

- GIVEN no credentials for any provider
- WHEN `eos.provider.route` is called
- THEN it returns a fail-closed `NO_CREDENTIALS`, never a simulated success

### Requirement: Budget gate before network I/O

The system MUST check ECR capacity before any network call and record usage after every real call.

#### Scenario: Exhausted budget

- GIVEN an ECR with exhausted budget
- WHEN routing is requested
- THEN the call is denied with `BUDGET_EXCEEDED` before any network I/O; no secrets in the receipt

### Requirement: Real health probe

The system MUST provide a real timed probe with timeout/retry for `eos.provider.health`, returning credential presence, latency, and `PRODUCTION_READY: NO`.

#### Scenario: Configured provider

- GIVEN a provider id with credentials
- WHEN `eos.provider.health` is called
- THEN it returns status, `latency_ms`, credential presence, `PRODUCTION_READY: NO`, no secrets

#### Scenario: Unknown provider

- GIVEN an unknown or unconfigured provider id
- WHEN `eos.provider.health` is called
- THEN it returns a graceful `PROVIDER_UNAVAILABLE` result without throwing

#### Scenario: Probe timeout

- GIVEN a provider exceeding the probe timeout
- WHEN the probe is attempted
- THEN it retries up to the limit, then reports `PROVIDER_TIMEOUT`

### Requirement: MCP tool boundary

The system MUST keep `eos.provider.route` as a real dispatch handle, preserve `forzarFallo*` flags additively, and add no new tools (tool count stays 80).

#### Scenario: Injection flags preserved

- GIVEN a `forzarFallo*` flag set
- WHEN routing is requested
- THEN the simulated failure contract remains available for hermetic tests

### Requirement: Hermetic CI

The system MUST place all real transport behind an injectable `fetchImpl` and run hermetic CI with zero network calls.

#### Scenario: CI without keys

- GIVEN CI without provider keys and a mock `fetchImpl`
- WHEN the full suite runs
- THEN zero real network calls occur, the suite is green, and the double sees no secrets in requests

### Requirement: Error taxonomy and observability

The system MUST classify failures with a stable taxonomy, redact secret-shaped content and full prompts from errors and logs, and complete real calls within the adapter timeout budget: `ADAPTER_NOT_FOUND` (no adapter/mapping) `NO_CREDENTIALS` (key absent) `BUDGET_EXCEEDED` (ECR denied) `PROVIDER_TIMEOUT` (timeout after retries) `PROVIDER_UNAVAILABLE` (unknown/unreachable).

#### Scenario: Opaque error redaction

- GIVEN an adapter failure from the real path
- THEN the surfaced error uses the taxonomy with all secret material and full prompt content redacted

## Non-Goals

- Mission AD stub port (`src/core/llm/*`) stays untouched and fail-closed.
- Agent-fabric terminal-loop execution is deferred.
- Per-call model SSOT UI is out of scope; SSOT default stays `fake`.
- Production release: `PRODUCTION_READY` remains `NO`.
