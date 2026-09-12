# Spec — Cross-Satellite Composition Harness (SPEC-0050)

## Purpose

Composition harness observing/integrating AN federation × AO failover ×
AP authority × AQ export fail-closed, with shared EVD receipt linkage.
Hermetic; injectable plane stubs; PRODUCTION_READY=NO.

## EARS

### EARS-1
WHEN an operator scenario requires coordinated AN federation + AO failover +
AP authority + AQ export, THE SYSTEM SHALL run a composition harness that
observes plane interactions fail-closed.

### EARS-2
IF any composed plane reports inconsistent custody / authority / budget /
export state, THE SYSTEM SHALL DENY further progress and emit a sealed receipt.

### EARS-3
WHILE composition is in progress, THE SYSTEM SHALL not claim E2E product-suite
completeness or PRODUCTION_READY.

## Requirements

- Kind: `eos-cross-satellite-composition-harness`
- `AS_PRODUCTION_READY = 'NO'`
- Fail-closed codes (frozen): `OK`, `COMPOSITION_OK`, `PLANE_INCONSISTENT`,
  `COMPOSITION_DENIED`, `MISSING_DEP`, `INVALID_REQUEST`,
  `SECRET_LEAK_FORBIDDEN`, `EVD_LINK_FAIL`, `FUNDACION_DENIED`, `HITL_REQUIRED`
- Injectable plane ports: `{ an, ao, ap, aq }` with at least `observe()`
- Shared EVD receipt linkage across planes
- Concurrent/open composition blocks inconsistent advance
- Fundacion ALWAYS_DENY / Δ=0
- Law VI: no static vendor-key literals; sanitize receipts/state
- Hermetic: no fetch/http/CloudAgent
- NON-CLAIM: ≠ E2E product suite / ≠ PRODUCTION_READY integration platform /
  ≠ CloudAgent orchestration; not AT/AU/AV/AW
- Compose, don't rewrite AN–AQ (stubs/thin adapters only)

## Verification

- `node --test tests/eos-as-cross-satellite-composition.test.js` → all PASS
- `rg` vendor-prefix CLEAN (runtime synth only)
- slim exclude; SLIM≤145 on host
