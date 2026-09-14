# Design — Mission BJ Operator Dashboard / HUD Fabric (SPEC-0067)

## Overview

Hermetic Layer-0 fabric under `src/core/observability/` that:

1. **Registers** surface providers (`freeze`, `matrix`, `evidence`, `replay`, …)
2. **Snapshots** all registered surfaces; aggregates overallHealth OK/DEGRADED/FAIL
3. **Seals** `BJ-RCPT-*` receipts (stableStringify + sha256) with chain `prevReceiptHash`
4. **Renders** pure terminal-safe ASCII/ANSI text summary (no display deps)
5. **DENYs** fail-closed on Fundacion / malformed / empty surface id / missing surfaces

Compose AV (freeze-drift), AJ (evidence), BF (packaging), BE (replay), HUD via
**injectable ports/stubs only** — never vendor-copy or rewrite those sources.

## Canonical seal (seven fields)

`{ receiptId, snapshotTimestamp, overallHealth, surfaceScores,
   surfaceCount, prevReceiptHash, status }`

`stableStringify` (sorted keys) + `sha256` via `node:crypto`.

## Ports

```
ports.avFreezeDrift  — optional call-through on snapshot
ports.ajEvidence     — optional call-through on snapshot
ports.bfPackaging    — optional call-through on snapshot
ports.beReplay       — optional call-through on snapshot
ports.hud            — optional call-through on snapshot
```

## Fail-closed / health codes

`MALFORMED_PAYLOAD`, `EMPTY_SURFACE_ID`, `MISSING_SURFACE`,
`STALE_SURFACE`, `MISMATCHED_SURFACE`, `PROVIDER_THROW`, `FUNDACION_DENY`,
plus snapshot codes `SNAPSHOT_OK` / `SNAPSHOT_DEGRADED` / `SNAPSHOT_FAIL`
and health `OK` / `DEGRADED` / `FAIL`.

## Constraints

- PRODUCTION_READY=NO · Fundacion Δ=0 · Law VI CLEAN on BJ-owned files only
- Hermetic: in-memory; no network; no real fs; no subprocess; no HTTP server
- L17/L18/L19 CLOSED never reopen; L20 OPEN (BH+BI MEASURED; BJ in progress;
  BK–BL pending)
- NON-CLAIM: ≠ observability SaaS (Grafana/Datadog/Prometheus) ·
  ≠ external web GUI/HTTP server · ≠ PRODUCTION_READY=YES
- Siblings in `src/core/observability/` may coexist (BI/AT lesson)
