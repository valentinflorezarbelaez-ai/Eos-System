# EOS M1 Strict-Verify Fusion Control-Plane Lock - 2026-09-08

**Branch:** `cursor/eos-m1-strict-verify-cp-lock`
**Base main tip:** `e88fc04` (Ladder 2 audit #38 merged)
**Scope:** M1 ONLY (Ladder 2 G1) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)

## Goal (G1 / M1 DoD)

Extend `verify:strict` / `scripts/verify-eos.js` so fusion control-plane surfaces are **locked** like custody/engram already are:

- Write Barrier (`src/core/write-barrier/`): existence + API + Fundacion DENY"+ scope fail-closed
- Mission loop runtime: existence + stages + Intent->Spec + ctor
- MCP SSOT (`config/mcp/eos-mcp.ssot.json` + sync): parse + `runSync({check:true})`
- Long-run GameDay harness: existence + ctor + CI N=25 + fault catalog (no soak)
- ADR-0013 / ADR-0014: required existence

Fail-closed if missing. Keep CI fast (no full GameDay soak).

## Deliverables

1. `scripts/lib/fusion-cp-lock.js` - `FUSION_CP_REQUIRED_PATHS` + `auditFusionControlPlane(rootDir)`
2. `scripts/verify-eos.js` - REQUIRED_PATHS spread + 3g4 smoke after engram
3. `tests/eos-m1-strict-verify-cp-lock.test.js` + `npm run test:m1`
4. This release note + freeze gate follow-through note
5. Dirty unstaged DEFERRED (App Fuerza / foreign agents / lab / ATP PNGs)

## Verify

```text
npm run test:m1
npm run verify:strict
```

## Non-claims / freeze follow-through

- No App Fuerza. No GitHub Team. No Fundacion mutation.
- No M2+ in this branch.
- Do not merge from this change set without PO; push + compare only.
- PRODUCTION_READY remains NO.
