# ADR-0026 — Mission BJ Operator Dashboard / HUD Fabric

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Mission Continuity & Operator Fabric)
- **Spec:** SPEC-0067

## Context

Ladder 20 audit (ADR-0023) ordered BH→BL under axis **Sovereign Mission
Continuity & Operator Fabric**. L17/L18/L19 remain
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened. L20 is OPEN
(BH+BI MEASURED; BJ in progress; BK–BL pending).

Mission BH shipped the Mission Lifecycle State Machine (SPEC-0065 /
ADR-0024). Mission BI shipped Cross-Session Continuity & Replay Fabric
(SPEC-0066 / ADR-0025). Mission BJ needs a typed, hermetic **Operator
Dashboard / HUD Fabric** that aggregates freeze / matrix / evidence /
replay surfaces into sealed health snapshots with pure terminal-safe
text/ANSI summaries — without claiming observability SaaS
(Grafana/Datadog/Prometheus), external web GUI/HTTP server, or
PRODUCTION_READY=YES.

Base tip (expected): `15616330a9def2c2d0cd0cda698abae119841812`
(StartsWith `1561633`; post-#290 tip · BI MEASURED). WARN-continue.

## Decision

1. Add three **new** modules under `src/core/observability/` (compose;
   do not rewrite sibling HUD / freeze-drift / evidence / delivery modules):
   - `operator-dashboard-receipt.js` — sealed `BJ-RCPT-*` receipts
   - `operator-dashboard-policy-gate.js` — schema / freshness / integrity /
     Fundacion / malformed DENY
   - `operator-dashboard-hud-fabric.js` — facade
     (`createOperatorDashboardHudFabric`, `registerSurface`,
     `generateSnapshot`, `renderTextSummary`)
2. Compose AV/AJ/BF/BE + existing HUD via injectable ports/stubs ONLY —
   do not rewrite or vendor-copy their sources.
3. Seal every outcome (OK / DEGRADED / FAIL / DENY) with canonical
   seven-field SHA-256 body; chain `prevReceiptHash`.
4. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   Antigravity-first, Law VI CLEAN on BJ-owned `operator-dashboard-*`
   files only (siblings may coexist — BI/AT lesson).
5. Exclude hermetic BJ tests from SLIM (≤145) via CRLF-safe patcher.

## Alternatives considered AND REJECTED

### A. Heavy external web dashboard

**Rejected.** Shipping a browser SPA / HTTP server dashboard (React,
Grafana embed, Express UI) would claim observability SaaS / external web
GUI product completeness, require network listeners, and break hermetic
`node --test` / Antigravity-first. Technical reason: NON-CLAIM
`externalWebGui=false` / `httpServer=false` /
`grafanaDatadogPrometheus=false`; fabric is local in-memory terminal HUD
custody, not a hosted dashboard.

### B. Unvalidated terminal logs

**Rejected.** Dumping raw `console.log` surface state without sealed
receipts, freshness/integrity gates, or overallHealth aggregation would
soft-allow stale/missing/mismatched surfaces — violating fail-closed
custody. Technical reason: DEGRADED/FAIL + sealed diagnostic receipt is
the only honest outcome for throw / drift / mismatch / missing surfaces.

### C. Monolithic rewrite of surface collectors

**Rejected.** Folding freeze-drift / evidence / packaging / replay / HUD
engines into one observability megamodule would rewrite sibling missions
(AV/AJ/BF/BE) and break coexistence with pre-existing
`operator-hud.js` / `terminal-hud-engine.js`. Technical reason: compose
via injectable ports/stubs ONLY; BJ owns `operator-dashboard-*` files;
siblings may coexist (lesson from BI/AT).

## Consequences

- Payload ships ADR-0026 + evidence + OpenSpec (epistemic parity with BH/BI).
- Host bootstrap copies modules/tests/openspec/docs/patcher; runs
  `test:mission-bj`; holds SLIM≤145; runs verify:strict honestly (no fake
  check-count invention; prefer measured 914/0 pattern).
- BK–BL remain pending; L17/L18/L19 stay CLOSED forever relative to this ladder.
- BH+BI remain MEASURED (acknowledged); PRODUCTION_READY stays NO.

## NON-CLAIM

- ≠ observability SaaS (Grafana / Datadog / Prometheus)
- ≠ external web GUI / HTTP server
- ≠ PRODUCTION_READY=YES
- ≠ reopening L17 / L18 / L19
- ≠ BK–BL implementation in this change
