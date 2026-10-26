# PLAN-016: Observability & Telemetry Pipeline — Architecture Plan

## Date: 2026-10-25
## Status: APPROVED

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER (L0 PURE)                     │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │   TelemetryEvent.ts  │  │   MetricCounter.ts   │           │
│  │ • Severity enum      │  │ • Counter/Gauge/Hist │           │
│  │ • Event creation     │  │ • Metric operations  │           │
│  │ • JSON serialization │  │ • Label dimensions   │           │
│  │ • Correlation IDs    │  │ • Snapshot export    │           │
│  └──────────────────────┘  └──────────────────────┘           │
├────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER (L1)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              TelemetryPipeline.ts                        │  │
│  │ • Event bus (in-memory pub/sub)                          │  │
│  │ • Subscriber management                                  │  │
│  │ • Severity filtering                                     │  │
│  │ • Transport dispatch                                     │  │
│  │ • Flush / drain operations                               │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│                  INFRASTRUCTURE LAYER (L2)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                LogTransport.ts                           │  │
│  │ • StdoutTransport: JSON to console                       │  │
│  │ • FileTransport: JSON append to .eos/logs/               │  │
│  │ • Transport interface abstraction                        │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│                         CLI (L3)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              eos-cli.mjs (logs subcommand)               │  │
│  │ • eos logs tail    → stream last N events                │  │
│  │ • eos logs search  → filter by query                     │  │
│  │ • eos logs export  → dump JSON to stdout                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## ADR-016-01: In-Memory Event Bus vs External Message Queue

**Decision:** Use in-memory pub/sub pattern.
**Rationale:** EOS operates as a single-process CLI and library. External message queues (Redis, RabbitMQ) add infrastructure complexity without benefit. In-memory event bus provides sub-millisecond delivery with zero dependencies.
**Rejected Alternative:** Redis Pub/Sub — adds external dependency, violates zero-dependency doctrine for core.

## ADR-016-02: Structured JSON Logging vs Text Logging

**Decision:** JSON-structured log lines (one JSON object per line, NDJSON format).
**Rationale:** Machine-parseable, greppable, compatible with log aggregation tools (ELK, Datadog, GCP Cloud Logging). Human readability achieved via CLI formatting.
**Rejected Alternative:** Unstructured text logs — not machine-parseable, difficult to search programmatically.

## ADR-016-03: Six Severity Levels

**Decision:** TRACE < DEBUG < INFO < WARN < ERROR < FATAL (RFC 5424 alignment).
**Rationale:** Industry standard. Six levels provide sufficient granularity without excessive fragmentation.
**Rejected Alternative:** Four levels (DEBUG/INFO/WARN/ERROR) — insufficient for production diagnostics (missing TRACE for verbose debugging and FATAL for unrecoverable errors).
