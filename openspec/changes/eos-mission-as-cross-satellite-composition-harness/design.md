# Design — Mission AS Cross-Satellite Composition Harness

## Architecture

```
createCrossSatelliteCompositionHarness({ an, ao, ap, aq, now, hash })
  ├── runScenario(scenario)     → COMPOSITION_OK | DENY + sealed receipt
  ├── composePlanes(req)        → observe AN×AO×AP×AQ; PLANE_INCONSISTENT
  ├── advanceComposition(meta)  → blocked while open composition
  ├── beginComposition / endComposition
  ├── sealReceipt(body)         → shared EVD linkage
  └── getState / getReceipts / health
```

Plane injectors are **stubs/fakes** (or thin adapters) — AS does not vendor
full AN/AO/AP/AQ implementations. Each plane exposes at least `observe()`;
optional action ports (`exportCustody` / `route` / `exportRange`) participate
in the happy-path scenario.

## Consistency rules (fail-closed)

1. Any plane `observe()` with `ok===false` or `consistent===false` →
   `PLANE_INCONSISTENT`.
2. Optional `requireTipMatch`: AN `custodyTip` must equal AQ `chainTip`.
3. AP `authorityOpen` without `allowOpenAuthority` → `HITL_REQUIRED`.
4. Open composition + `forceAdvance` / `advanceComposition` →
   `COMPOSITION_DENIED`.
5. Missing plane injector (when `requireAllPlanes`) → `MISSING_DEP`.
6. Fundacion targets → `FUNDACION_DENIED` (Δ=0).
7. Secret persist flags → `SECRET_LEAK_FORBIDDEN` (Law VI).

## Shared EVD linkage

Each scenario mints `sharedEvdLink = hash({ compositionId, scenarioId, at })`
and threads it through plane actions + sealed composition receipt.

## NON-CLAIM surface

Every result / state / health exposes:
- `e2eProductSuiteClaim: false`
- `productionReadyIntegrationClaim: false`
- `cloudAgentOrchestrationClaim: false`
- `PRODUCTION_READY: 'NO'`
- `fundacionDelta: 0`

## Law VI

Sanitize via runtime-synthesized vendor prefix (`['s','k','-'].join('')` /
`String.fromCharCode(115,107,45)`). Never embed static vendor-key literals.
