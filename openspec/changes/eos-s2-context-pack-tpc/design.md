# Design — eos-s2-context-pack-tpc

## Approach (TDD)

1. OpenSpec FIRST (proposal/design/tasks/spec).
2. RED: `tests/eos-s2-context-pack-tpc.test.js` asserts index path, lock module, verify wiring, NON-CLAIM needles.
3. GREEN: implement `docs/harness/CONTEXT_PACK_TPC.md` + `scripts/lib/context-pack-lock.js` + verify-eos wire + `test:s2`.
4. Evidence (ES) + freeze note; optional AGENTS/CLAUDE one-liners.
5. Run `test:s2` + `verify:strict`; commit/push; **no PR**.

## SSOT path decision

**Chosen:** `docs/harness/CONTEXT_PACK_TPC.md`

Rationale: aligns with LIDR harness vocabulary; `docs/harness/` is the natural home for harness SSOT indexes; avoids root `docs/CONTEXT_PACK.md` collision risk with future packs.

## Index content (INDEX only — do not rewrite surfaces)

### Tool pillar (refs)

- `docs/mcp/MCP_SSOT.md`, `docs/mcp/EOS_MCP_TOOL_CATALOG.json` / NORMALIZED catalog
- `scripts/lib/mcp-catalog-lock.js` (P5)
- Write barrier: `docs/security/WRITE_BARRIER_SANDBOX.md`, `config/security/write-barrier-ssot-roots.json`, `src/core/write-barrier/`
- Verify surfaces: `scripts/verify-eos.js`, `npm run verify:strict`

### Prompt pillar (refs)

- `AGENTS.md`, `CLAUDE.md`, `.agents/AGENTS.md`
- `docs/base-standards.md`, `docs/backend-standards.md`
- `.cursor/rules/*` especially `context-engineering-standards.mdc`, `harness-engineering-standard.mdc`, `00–09` eos rules
- `CONSTITUTION.md` / `docs/core/CONSTITUTION.md`
- `openspec/`, `docs/openspec-tasks-mandatory-steps.md`

### Context pillar (refs)

- `docs/core/FOUNDATIONAL_CONTEXT.md`
- `docs/policies/EOS-CONTEXT-AND-TOKEN-EFFICIENCY-POLICY.md`
- Engram / compactation rules (`.cursor/rules/engram.mdc`, context-engineering)
- This index itself as the TPC map

### Spec-Boot gaps (DEFER — do not invent)

- `docs/frontend-standards.md` — MISSING
- `docs/documentation-standards.md` — MISSING
- `docs/development_guide.md` — MISSING

Point at existing proxies (`.cursor/rules/07-eos-product-and-ux.mdc`, `09-eos-documentation.mdc`, `docs/base-standards.md`) without authoring full Spec-Boot content.

### Lifecycle policy (NON-CLAIM ≠ runtime orchestrator)

Document operator/agent policy text for:

| Verb | Intent |
| --- | --- |
| inject | Load only the minimal TPC refs needed for the active task |
| compact | Summarize / Engram / drop stale noise before window pressure |
| discard | Remove task-local context that is no longer actionable |
| reset | Clear anxious/rotten window state; restart from SSOT index + constitution |
| revisit-on-model-change | Re-check harness assumptions (limits, tool claims, compaction thresholds) when the model changes |

## Lock design (mirror p6-inventory-lock)

- Module: `scripts/lib/context-pack-lock.js`
- Export: `CONTEXT_PACK_INDEX`, `CONTEXT_PACK_REQUIRED_SECTIONS`, `CONTEXT_PACK_REQUIRED_PATHS`, `auditContextPackLock(rootDir, options)`
- Fail-closed: missing index OR missing required section needles OR missing PRODUCTION_READY=NO / NON-CLAIM language
- Wire: import + spread REQUIRED_PATHS + strict block after deferred writers / complexity-budget (e.g. **3g10**)
- Fixture overrides: `docText`, `docMissing`, `skipPathChecks` (same pattern as P6)

## Constraints

- Fundacion Δ=0; PRODUCTION_READY=NO
- NON-CLAIM: index ≠ full runtime context engineering
- No new docs/schemas JSON (AT_CEILING)
- If TR-01 ceiling threatened → bump with evidence (not expected: docs+lock only)

## Verification

- `npm run test:s2`
- `npm run verify:strict`
