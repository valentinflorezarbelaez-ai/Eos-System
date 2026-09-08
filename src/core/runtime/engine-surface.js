/**
 * @module EngineSurface
 * @description Surface boundary declaration between canonical Mission OS (`src/core/`)
 * and legacy simulation / research harnesses under `scripts/engine/`.
 * Canonical `src/core` is 100% self-contained with zero runtime dependencies on `scripts/engine/`.
 * Any legacy script under `scripts/engine/` is retained purely for historical simulation,
 * benchmark reproduction, and backwards-compatible tooling invocations.
 * ROI2 (2026-09-08): research/canary harnesses quarantined under archive/quarantine/engine-roi2/;
 * canonical keep set locked by tests/engine-roi2-canonical-inventory.test.js.
 */
export const RUNTIME_ENGINE_FILES = [];
