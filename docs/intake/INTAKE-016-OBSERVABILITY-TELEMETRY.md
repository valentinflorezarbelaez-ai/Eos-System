# INTAKE-016: Observability & Telemetry Pipeline

## Date: 2026-10-25
## Requestor: Lead Architect & System Owner
## Priority: HIGH (Phase D of Master Evolution Plan v3.0)

---

## Context

EOS has 13 domain models, 9 application services, 4 infrastructure adapters, and a sentinel daemon. However, there is **zero structured logging**, **zero metrics collection**, and **zero tracing**. The Sentinel daemon monitors file integrity via SHA-256 but emits no structured telemetry events. Production operations require observability to diagnose issues, track performance, and understand system behavior.

## Gap Analysis

| Dimension | Current State | Target State |
|:---|:---|:---|
| **Logging** | `console.log` only | Structured JSON logs with severity, correlation IDs, timestamps |
| **Metrics** | None | Counter, gauge, histogram metric types with dimensional labels |
| **Event Bus** | None | In-memory pub/sub for telemetry events with subscriber pattern |
| **Transports** | None | Pluggable stdout/file transports with configurable formatting |
| **CLI** | No log commands | `eos logs [tail|search|export]` subcommands |
| **Sentinel** | Basic audit | Sentinel emits heartbeat telemetry events |

## Dependencies

- **SPEC-015 (Runtime Config)**: Log levels and transport config read from `EnvironmentConfig`.
- **SPEC-014 (Semantic Versioning)**: Version tagging stamped in all telemetry event metadata.

## Acceptance Criteria Summary

1. Pure domain `TelemetryEvent` model with zero external dependencies.
2. Pure domain `MetricCounter` model for counter/gauge/histogram metric types.
3. Application service `TelemetryPipeline` orchestrating event emission.
4. Infrastructure adapter `LogTransport` for stdout and file JSON log output.
5. CLI `eos logs` subcommand for tail, search, and export operations.
6. 100% unit test coverage on all new domain models.
7. Invariant K added to `verify-strict.ps1`.
8. `npm run verify:strict` → Exit Code 0.
