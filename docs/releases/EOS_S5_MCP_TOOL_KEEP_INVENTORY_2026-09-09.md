# EOS S5 MCP/tool KEEP inventory (PO prune) - 2026-09-09

**Branch:** `cursor/eos-s5-mcp-tool-keep-inventory`
**Base tip:** tip-refresh-post-specboot `c131bca` (main@b785f01 + tip honesty)
**Alcance:** S5 ONLY (Ladder 7 K5) — EOS-only, **docs inventory + verify lock**
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push + compare only)
**Code delete/prune MCP tools:** FORBIDDEN in this change set (inventory only; PO must name tools before any prune)
**AT_CEILING:** no new `docs/schemas` JSON

---

## 1. Goal (S5 / K5 DoD)

1. Inventario **KEEP** + candidatos a poda de superficie MCP/tool ("¿Qué puedo dejar de hacer?").
2. Fuente SSOT: `docs/mcp/EOS_MCP_TOOL_CATALOG.json` + `EOS_MCP_DEAD_OR_ORPHAN_REGISTER.json` (P5 reconcile 80==CANONICAL_TOOLS).
3. Verify lock fail-closed de existencia/secciones (`scripts/lib/mcp-tool-keep-lock.js`).
4. Prune **solo** PO-named; **NON-CLAIM** inventory ≠ executed prune.
5. Light `test:s5` TDD; PRODUCTION_READY=NO; Fundacion Delta=0; no silent delete.

---

## 2. Inventory method (evidence)

| Step | Action | Result @ tip |
| --- | --- | --- |
| A | Load MCP catalog SSOT | **80** tools (`metadata.total_tools=80`) |
| B | Cross dead/orphan register | **22** simulation + **1** legacy stub |
| C | KEEP = catalog tools NOT on dead/orphan | **57** Canonical operational |
| D | CANDIDATE = simulation + legacy | **23** ranked prune candidates |
| E | Align P5 mcp-catalog-lock | live CANONICAL_TOOLS length still 80; S5 does **not** change catalog |
| F | P6 complexity inventory | ROI2/src-core islands ≠ MCP tool surface (separate SSOT) |

**Classification legend**

- **KEEP** — Canonical operational tools on catalog SSOT; required for local governed Mission OS / governance / mission-loop surfaces; **do not prune** without PO + catalog reconcile.
- **CANDIDATE** — inventory-only prune candidate from dead/orphan / simulation register; **do not delete** until PO names exact tool names.
- **DEFER** — borderline adjacent to KEEP; leave alone (none named for silent action here).

---

## 3. KEEP set (do not prune) — evidence

**KEEP count: 57** (Canonical operational; catalog metadata `canonical_operational_tools=57`)

### 3.1 Governance / verify / doctor / mission-loop (high priority KEEP)

| Tool | Group | Classification | Why KEEP |
| --- | --- | --- | --- |
| `eos.kernel.boot` | CORE_OPERATIONAL | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.kernel.ledger` | LEDGER | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.kernel.evidence` | EVIDENCE | Canonical | Control-plane / governance / verify surface |
| `eos.mission.resolve` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.intent.expand` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.mission.start` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.mission.status` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.mission.recover` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.context.compile` | WORKSPACE | Canonical | Mission-loop / SDD path |
| `eos.authority.check` | AUTHORITY | Canonical | Control-plane / governance / verify surface |
| `eos.policy.validate` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.evidence.record` | EVIDENCE | Canonical | Control-plane / governance / verify surface |
| `eos.evidence.get` | EVIDENCE | Canonical | Control-plane / governance / verify surface |
| `eos.workspace.discover` | WORKSPACE | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.workspace.barrier_check` | WORKSPACE | Canonical | Control-plane / governance / verify surface |
| `eos.fdir.status` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.fdir.trip` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.fdir.recover` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.fdir.ontology.sanitize` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.sentinel.toggle` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.report.generate` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.orchestrator.init` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.orchestrator.advance` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.drift.check` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.drift.detect` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.hud.dashboard` | WORKSPACE | Canonical | Control-plane / governance / verify surface |
| `eos.skill.route` | WORKSPACE | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.orchestrator.rollback` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.sentinel.self_remember` | CORE_OPERATIONAL | Canonical | Control-plane / governance / verify surface |
| `eos.net.logos.resonance_check` | MISSION | Canonical | Mission-loop / SDD path |
| `eos.audit.ahimsa.verify` | SECURITY | Canonical | Control-plane / governance / verify surface |
| `eos.doctor` | GOVERNANCE | Canonical | Control-plane / governance / verify surface |
| `eos.verify.strict` | QUALITY | Canonical | Control-plane / governance / verify surface |
| `eos.log.evidence` | EVIDENCE | Canonical | Control-plane / governance / verify surface |
| `eos.mission.loop.status` | MISSION | Canonical | Control-plane / governance / verify surface |
| `eos.mission.loop.advance` | MISSION | Canonical | Control-plane / governance / verify surface |

### 3.2 Remaining Canonical KEEP

| Tool | Group | Classification | Why KEEP |
| --- | --- | --- | --- |
| `eos.ledger.get_features` | LEDGER | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.ledger.update_feature` | LEDGER | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.verifier.run` | SECURITY | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.provider.route` | PROVIDERS | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.resolve.conflict` | CORE_OPERATIONAL | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.audit.run` | CORE_OPERATIONAL | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.blueprint.run` | ENGINEERING | Canonical | Mission-loop / SDD path |
| `eos.scaffolder.generate` | ENGINEERING | Canonical | Mission-loop / SDD path |
| `eos.scaffolder.clean` | ENGINEERING | Canonical | Mission-loop / SDD path |
| `eos.process.governor.validate` | CORE_OPERATIONAL | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.ontology.query` | CORE_OPERATIONAL | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.ontology.link` | CORE_OPERATIONAL | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.scaffolder.execute` | ENGINEERING | Canonical | Mission-loop / SDD path |
| `eos.core.triamazikamno.validate` | ENGINEERING | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.audit.tescohan.scan` | SECURITY | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.ledger.octave.advance` | LEDGER | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.justice.adjudicate` | CORE_OPERATIONAL | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.ontological.firewall.inspect` | SECURITY | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.core.triamazikamno.synthesize` | ENGINEERING | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.compiler.l0.parse` | ENGINEERING | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |
| `eos.audit.project` | AUDIT | Canonical | Canonical operational (catalog SSOT; not on dead/orphan register) |

---

## 4. Ranked prune CANDIDATES (inventory only)

**Candidate count (ranked rows below): 23**

Pregunta LIDR / Anthropic citada: **"¿Qué puedo dejar de hacer?"** — candidatos abajo. Ninguna tool se elimina en S5.

| Rank | Tool | Group | Class | Why CANDIDATE | Why not KEEP |
| --- | --- | --- | --- | --- | --- |
| 1 | `eos.provider.health` | PROVIDERS | Legacy | Legacy stub / NOT_CONFIGURED (dead-or-orphan register) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 2 | `eos.audit.telemetry.stream` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 3 | `eos.audit.tescohan.telescope` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 4 | `eos.environment.sandbox.execute` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 5 | `eos.net.trogomesh.balance` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 6 | `eos.pleroma.akasha.engram` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 7 | `eos.pleroma.amens.audit` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 8 | `eos.pleroma.anupadaka.fuse` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 9 | `eos.pleroma.anupadaka.shield` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 10 | `eos.pleroma.auxiliary.state` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 11 | `eos.pleroma.elemental.intercede` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 12 | `eos.pleroma.jeu.watch` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 13 | `eos.pleroma.jubilee` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 14 | `eos.pleroma.kundalini.mirror` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 15 | `eos.pleroma.melchizedek.govern` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 16 | `eos.pleroma.mercabah.crystallize` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 17 | `eos.pleroma.moses.transmute` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 18 | `eos.pleroma.system.mahapralaya` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 19 | `eos.pleroma.trees.anchor` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 20 | `eos.pleroma.voices.modulate` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 21 | `eos.pleroma.zodiac.shield` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 22 | `eos.sdlc.engineer.autonomous` | SIMULATION | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |
| 23 | `eos.security.adversarial.review` | SECURITY | Simulation | Theatrical simulation (dead-or-orphan register; mock SHA / no physical work) | Not required by verify/fusion-cp/sentinel/doctor KEEP locks; inventory-only until PO-named |

---

## 5. Verify lock

- Lock: `scripts/lib/mcp-tool-keep-lock.js` (`auditMcpToolKeepLock`)
- Wired in `scripts/verify-eos.js` block **3g14**
- `test:s5` fail-closed if inventory doc/required sections missing
- Does **not** extend mcp-catalog-lock counts (P5 remains count SSOT); S5 locks inventory honesty

---

## 6. Freeze note

- S5 ready for review (push/compare); tip pin of freeze **not** moved here (tip refresh was tip-refresh-post-specboot @ b785f01)
- Dictamen unchanged; Fundacion Delta=0; DEFER dirty unstaged
- After merge: Ladder 7 S5 closed; S6 remains next

---

## 7. NON-CLAIM / Non-claims

- **NON-CLAIM:** inventory ≠ executed prune
- No silent delete/move/quarantine of MCP tools or catalog entries
- Prune solo PO-named (exact tool names) + follow-up catalog reconcile (P5 pattern)
- External Vercel −80% / rtk / token-tool figures = material claims, not EOS measurements
- PRODUCTION_READY:** NO
- Fundacion Delta=0; App Fuerza untouched
- AT_CEILING: no new docs/schemas JSON
- No swarm / no PRODUCTION_READY flip / no PR merge without PO

---

## 8. Verify commands

```bash
npm run test:s5
npm run test:p5
npm run verify:strict
```

## 9. Deliverables

1. This inventory doc
2. `scripts/lib/mcp-tool-keep-lock.js` + verify:strict wiring
3. `tests/eos-s5-mcp-tool-keep-inventory.test.js` + `test:s5`
4. OpenSpec change `openspec/changes/eos-s5-mcp-tool-keep-inventory/`
5. Freeze note section; dirty DEFER
