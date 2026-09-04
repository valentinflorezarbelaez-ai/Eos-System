/**
 * @module EngineSurface
 * @description Surface boundary declaration between canonical Mission OS (`src/core/`)
 * and legacy simulation / research harnesses under `scripts/engine/`.
 * Canonical `src/core` is 100% self-contained with zero runtime dependencies on `scripts/engine/`.
 * Any legacy script under `scripts/engine/` is retained purely for historical simulation,
 * benchmark reproduction, and backwards-compatible tooling invocations.
 */
export const RUNTIME_ENGINE_FILES = [];
