# PLAN-018: Plugin & Extension System

## Milestone: `SPEC-018-PLUGIN-SYSTEM`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Architectural Strategy & Clean Hexagonal Design

The Plugin & Extension System is structured into three clean layers:

```
[ Presentation: CLI (eos plugin) ]
             │
             ▼
[ Application Layer: PluginManager (src/core/application/PluginManager.ts) ]
             │
             ▼ (pure entities)
[ Domain Layer: PluginManifest (src/core/domain/models/PluginManifest.ts) ]
```

---

## 2. Architectural Decision Records (ADRs)

### ADR-018-01: In-Process Hook System vs Inter-Process Plugin IPC
- **Context:** Plugins can either run in-process via typed asynchronous hook functions or out-of-process via IPC/RPC.
- **Decision:** Implement in-process typed hooks with defensive `try/catch` sandboxing.
- **Rationale:** In-process hooks offer sub-millisecond execution times, zero serialization overhead, and full TypeScript typing. Out-of-process IPC introduces significant latency and complex failure modes unnecessary for internal extension points.
- **Alternatives Rejected:**
  - *Forked subprocess per hook:* Rejected due to high process spawn latency (50-100ms per step).
  - *WebAssembly sandbox:* Overly restrictive for plugins that need telemetry or logger access.

### ADR-018-02: Manifest SemVer Validation via SemanticVersion Model
- **Context:** Plugin compatibility requires reliable version parsing.
- **Decision:** Leverage existing pure domain model `SemanticVersion` (SPEC-014) to validate plugin versions.
- **Rationale:** Maximizes code reuse within the pure domain layer.

---

## 3. Module Boundaries & Data Contracts

### 3.1 Domain Model: `src/core/domain/models/PluginManifest.ts`
- Types: `PluginHookType` (`'onInit' | 'preStep' | 'postStep' | 'onDestroy'`), `PluginMetadata`
- Class: `PluginManifest`
  - Validates `name`, `version`, `description`, `author`, `hooks`
  - Immutability with `Object.freeze`

### 3.2 Application Service: `src/core/application/PluginManager.ts`
- Manages plugin lifecycle: `registerPlugin()`, `unregisterPlugin()`, `listPlugins()`
- Hook dispatch: `dispatchHook(hookType, payload)`
- Defensive sandboxing around hook callbacks
- Integration with `TelemetryPipeline`
