/**
 * @module write-barrier
 * Phase 4 production Write Barrier sandbox — process-scoped realpath allowlist.
 *
 * Phase 5 Mission/MCP seam:
 *   await withWriteScope({ roots: ['src', 'tests'] }, async () => { ... });
 *   authorizeWrite(path) / assertWritable(path)
 *   installWriteBarrierHooks() for in-process fs mutation enforcement
 *   barrierCheck({ path }) for MCP eos.workspace.barrier_check
 *   checkWritePathPolicy(path) for IDE governance-gate (no ALS)
 */
export { WriteBarrierDeniedError, WriteBarrierConfigError } from './errors.js';
export {
  normalizeBarrierPath,
  realpathSafe,
  isFundacionPath,
  isPathInsideRoot,
  resolveRepoRoot
} from './paths.js';
export { loadSsotRoots, resolveScopedAllowRoots, SSOT_CONFIG_REL } from './roots.js';
export { withWriteScope, withWriteScopeSync, getActiveWriteScope } from './scope.js';
export {
  authorizeWrite,
  assertWritable,
  checkWritePathPolicy,
  barrierCheck
} from './authorize.js';
export {
  installWriteBarrierHooks,
  uninstallWriteBarrierHooks,
  isWriteBarrierHooksInstalled,
  extractWriteTargetsFromCommand
} from './hooks.js';
