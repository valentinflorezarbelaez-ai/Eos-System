# Mission OS — ATS / Mission-Loop Coherence Map

**Status:** Implemented (local governed)  
**PRODUCTION_READY:** NO  
**ADR:** ADR-0014 (mission loop is MCP overlay — does **not** replace ATS / Mission OS FSM)  
**Code SSOT:** `src/core/observability/mission-os-coherence.js`  
**HUD:** `src/core/observability/operator-hud.js` field `mission_os_coherence`

## Dual surfaces (not a merged FSM)

| Role | Owner | Disk truth | Stage enum |
| --- | --- | --- | --- |
| **Mission OS / ATS** | `AuthorityTruthSource` | `mission-package.json` phase / `authority-snapshot.json` state | `SDD_STATES` in `src/core/sdd/sdd-fsm-engine.js` |
| **MCP Mission Loop** | `MissionLoopRuntime` | `.missions/<id>/mission-loop.json` | `MISSION_LOOP_STAGES` in `src/core/mcp/mission-loop.js` |

The mission loop enforces Intent to Archive on mutating MCP tools. ATS remains the **sole writer** of mission-package phase. Operators must read both vocabularies; this map is the single operator correspondence — **no second FSM is invented**.

## Correspondence (overlay_corresponds)

| Mission-loop stage | ATS / SDD stages |
| --- | --- |
| Intent | VISION_INTAKE, MISSION_FORMULATION, HUMAN_DIRECTION_GATE |
| Spec | DISCOVER, DEFINE |
| Plan | PLAN |
| Act | DELEGATE, SUPERVISE |
| Evidence | SUPERVISE |
| Verify | VERIFY |
| Archive | REVIEW, HUMAN_RELEASE_GATE, OPERATE_AND_LEARN, COMPLETED |

## ATS control states (ATS-only)

`PAUSED`, `BLOCKED`, `FAILED`, `CANCELLED` — no mission-loop twin stages. Documented here so every `SDD_STATES` value is accounted for.

## Non-goals / deferred

- No mass prune of `src/core` (PO-named dead island only; default skip)
- Keep PRODUCTION_READY as NO
- No Fundacion mutation
- **G7** (EVD paths skipping custody) — **deferred next gap**, not implemented here

## Verify

Use package scripts `test:m6` and `verify:strict`.