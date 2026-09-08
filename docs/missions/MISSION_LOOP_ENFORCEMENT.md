# Mission Loop Enforcement (Phase 5)

**Status:** Implemented (local governed)  
**PRODUCTION_READY:** NO  
**Module:** `src/core/mcp/mission-loop.js` + `mission-loop-runtime.js`  
**Bridge:** `src/core/mcp/mcp-mission-bridge.js`  
**MCP tools:** `eos.mission.loop.status`, `eos.mission.loop.advance`

## Purpose

Make the governed mission lifecycle **mandatory** for mutating / delivery MCP paths:

```text
Intent → Spec → Plan → Act → Evidence → Verify → Archive
```

This is a thin MCP enforcement seam. It does **not** replace `AuthorityTruthSource` / `SDD_STATES` (those remain the sole writers of `mission-package.json` phase). Loop state lives beside the package as `.missions/<id>/mission-loop.json`.

## SSOT

| Export | Role |
|---|---|
| `MISSION_LOOP_STAGES` / `MISSION_LOOP_ORDER` | Canonical stage enum |
| `MISSION_LOOP_TRANSITIONS` | Fail-closed adjacency (no skips) |
| `MISSION_LOOP_READONLY_ALLOWLIST` | Tools usable without a live loop |
| `MISSION_LOOP_ACT_WRITE_TOOLS` | Act delivery tools that require `withWriteScope` |
| `MISSION_LOOP_TOOL_STAGES` | Tool → allowed stage map |

Illegal jumps (e.g. Intent→Act) return `DENIED` / `ILLEGAL_STAGE_TRANSITION`.

## Runtime

- `eos.mission.start` initializes loop at **Intent**
- `eos.mission.loop.advance` moves one legal step; persists receipts
- Evidence→Verify requires an evidence receipt hook
- Verify→Archive requires a Verify receipt with `ok: true` (no fake green)
- Act tools (`eos.scaffolder.clean`, `eos.scaffolder.execute`, …) require stage **Act**, `missionId`, and Phase 4 `withWriteScope` (Fundacion always denied)

## Read-only allowlist (no full loop required)

`eos.context.compile`, `eos.ledger.get_features`, `eos.authority.check`, `eos.workspace.barrier_check`, `eos.mission.status`, `eos.mission.loop.status`, `eos.mission.resolve`, `eos.policy.validate`, `eos.evidence.get`, `eos.fdir.status`, `eos.workspace.discover`, `eos.doctor`, `eos.drift.check`, `eos.drift.detect`, `eos.provider.*`, `eos.hud.dashboard`, `eos.skill.route`, `eos.ontology.query`, `eos.report.generate`, `eos.audit.run`, `eos.verify.strict`, `eos.kernel.boot`, `eos.intent.expand`, `eos.scaffolder.generate`

## Non-goals

- No `PRODUCTION_READY=YES`
- No Fundacion mutation
- No rewrite of Mission OS / ATS FSM
