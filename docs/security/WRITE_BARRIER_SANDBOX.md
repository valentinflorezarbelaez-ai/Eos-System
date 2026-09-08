# Write Barrier Sandbox (Phase 4)

**Status:** Implemented (local governed)  
**PRODUCTION_READY:** NO  
**Module:** `src/core/write-barrier/`  
**SSOT config:** `config/security/write-barrier-ssot-roots.json`

## Purpose

Process-scoped write authorization so in-process mutations only succeed inside an explicit `withWriteScope` against a **realpath allowlist** of repo-governed SSOT roots. Fundacion remains Δ=0 (always denied).

## API surface (Phase 5 seam)

```js
import {
  withWriteScope,
  authorizeWrite,
  assertWritable,
  installWriteBarrierHooks,
  checkWritePathPolicy,
  barrierCheck,
  loadSsotRoots
} from '../src/core/write-barrier/index.js';

await withWriteScope({ roots: ['src', 'tests'] }, async () => {
  // authorizeWrite / hooked fs writes allowed only under scoped realpaths
});
```

| API | Role |
|---|---|
| `withWriteScope({ roots, repoRoot }, fn)` | Opens ALS scope; roots ∩ SSOT allowlist |
| `authorizeWrite(path)` | Fail-closed verdict (`NO_ACTIVE_SCOPE`, `OUTSIDE_ALLOWLIST`, `FUNDACION_ALWAYS_DENY`, …) |
| `assertWritable(path)` | Throws `WriteBarrierDeniedError` |
| `installWriteBarrierHooks()` | Patches `fs` write surfaces to call `assertWritable` |
| `checkWritePathPolicy(path)` | SSOT/Fundacion policy without ALS (IDE `governance-gate`) |
| `barrierCheck({ path })` | MCP `eos.workspace.barrier_check` compatible verdict |

## SSOT roots source

Single JSON: `config/security/write-barrier-ssot-roots.json`

- `repoRelativeAllowRoots` — allowed write trees (resolved with `realpath` at runtime)
- `alwaysDenyRepoRelative` — denied even inside an open scope (includes `Fundacion`)
- No tracked hardcoded `C:\Users\valen\...` paths

## Integration

- `scripts/hooks/governance-gate.js` — PreToolUse fail-closed via `checkWritePathPolicy`
- `McpMissionBridge.barrierCheck` — delegates protected-surface + scoped checks to this module
- L8 adversarial suite remains authoritative for Fundacion external paths

## Non-goals

- Not a full OS sandbox / seccomp
- Does not set `PRODUCTION_READY=YES`
- Does not authorize Fundacion writes under any scope
