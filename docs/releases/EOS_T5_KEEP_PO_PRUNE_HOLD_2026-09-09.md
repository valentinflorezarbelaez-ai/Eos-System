# EOS T5 KEEP PO-named prune HOLD / gate - 2026-09-09

**Branch:** cursor/eos-t5-keep-po-prune-hold
**Base main tip:** 203a8ca5e26ebd40a1ca0432e7e93252ee35c238 (T4 #86 merged)
**Alcance:** T5 ONLY (Ladder 8 K4) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push only; HITL en navegador)
**AT_CEILING:** yes (no new docs/schemas JSON)
**Decision:** **HOLD — no prune this quarter** (PO has not named exact CANDIDATE tools)

## Objetivo (T5 / K4 DoD)

PO names tools **or** documented "no prune" hold; si prune: catalog reconcile + lock green; NON-CLAIM inventory≠silent delete; PRODUCTION_READY=NO.

1. Deliver **gate/process only** (runbook + verify lock + observational gate CLI)
2. Explicit HOLD (no prune this quarter) — no executed deletes
3. Catalog reconcile remains green under HOLD (80==CANONICAL_TOOLS)
4. NON-CLAIM: inventory ≠ silent delete; HOLD ≠ executed prune
5. Tests PASS (`test:t5`); Fundacion Delta=0; DEFER dirty unstaged; AT_CEILING

## Decision HOLD (rationale)

- S5 CANDIDATE set (23) is inventory-only until PO names exact tools.
- User/PO steering for T5: deliver gate/process only; **NO silent deletes**.
- Therefore Choice = **HOLD** + fail-closed ritual; prune execution deferred to a future PO-named change set.

## Entregables

1. OpenSpec `openspec/changes/eos-t5-keep-po-prune-hold/`
2. Runbook `docs/harness/KEEP_PO_PRUNE_RITUAL.md`
3. Lock `scripts/lib/keep-po-prune-hold-lock.js` + gate `scripts/ci/keep-po-prune-gate.js`
4. Tests `tests/eos-t5-keep-po-prune-hold.test.js` + `test:t5`
5. verify-eos 3g16 + REQUIRED_PATHS; TR-01 ceiling 130→140 (Ladder8 intentional suites)
6. Esta nota + freeze T5 + matrix MEASURED
7. Dirty DEFER sin stage; catalog untouched; no silent MCP prune

## Catalog reconcile (HOLD)

- P5 `auditMcpCatalogLock` expected green (live 80 / catalog 80)
- S5 KEEP inventory unchanged (57 KEEP / 23 CANDIDATE)
- T5 does **not** mutate `EOS_MCP_TOOL_CATALOG.json` or `src/mcp-server.js`

## Verificacion

- npm run test:t5
- node scripts/ci/keep-po-prune-gate.js
- npm run test:s5
- Fundacion porcelain vacio
- PRODUCTION_READY=NO

## No-claims

- HOLD / gate ≠ executed prune / silent delete.
- Inventory (S5) ≠ permission to delete.
- Catalog reconcile green ≠ PRODUCTION_READY flip.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin T6+ complexity prune en esta rama.
- Push only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
- CloudAgent out of SpecBoot default (Antigravity-first).
