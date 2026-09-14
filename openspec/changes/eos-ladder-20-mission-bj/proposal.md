# Proposal — Mission BJ Operator Dashboard / HUD Fabric (SPEC-0067)

## Why

Ladder 20 axis **Sovereign Mission Continuity & Operator Fabric** needs a
typed, fail-closed **Operator Dashboard / HUD Fabric** that aggregates
freeze / matrix / evidence / replay surfaces into sealed health snapshots
with pure terminal-safe text/ANSI summaries. Without it, operators cannot
honestly view cross-surface health under evidence custody after BH+BI MEASURED.

## What changes

- New Layer-0 modules under `src/core/observability/` (compose, do not rewrite siblings):
  - `operator-dashboard-receipt.js` — sealed `BJ-RCPT-*` receipts
  - `operator-dashboard-policy-gate.js` — fail-closed preconditions
  - `operator-dashboard-hud-fabric.js` — facade
    (`registerSurface`, `generateSnapshot`, `renderTextSummary`)
- Hermetic tests `tests/eos-bj-operator-dashboard-hud-fabric.test.js`
- CRLF-safe patcher `scripts/patch-mission-bj.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0026, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- Observability SaaS (Grafana/Datadog/Prometheus) / external web GUI/HTTP server product claims
- BK–BL implementation
- Reopening L17 / L18 / L19
- Rewriting `operator-hud.js`, `terminal-hud-engine.js`, freeze-drift, evidence, delivery BE/BF

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L20 | OPEN (BH+BI MEASURED; BJ in progress; BK–BL pending) |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BJ test excluded) |
| Base tip | `15616330a9def2c2d0cd0cda698abae119841812` (StartsWith `1561633`) |
