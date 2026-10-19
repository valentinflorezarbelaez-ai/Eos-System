# EOS Project Retirement — 2026-10-18

**Status:** EXECUTED
**Scope:** Four pilot/lab projects retired from the active tree
**PRODUCTION_READY:** NO
**Fundacion:** Δ=0 (untouched)

---

## 1. Retired paths (exact)

| Path | Files | Lines | Tests removed |
| --- | ---: | ---: | ---: |
| `EOS-Lab/FlowDesk/` | 15 | 3,175 | 3 test files (opt-in lab) |
| `EOS-Lab/Sonrisa-Nova/` | 18 | 6,947 | 0 |
| `Luxe-Registry/` | 4 | 482 | 7 |
| `Multimodal-Creative-Suite/` | 4 | 440 | 7 |
| **Total** | **41** | **11,044** | **14 + 3 lab files** |

Approximate tracked payload removed: **374,774 bytes (~366 KiB)**.

These were pilot/lab deliverables, not EOS control-plane dependencies. None was imported by
`src/`, `bin/`, `tests/`, CI, or root `package.json` scripts.

---

## 2. Active references cleaned

| Surface | Before | After |
| --- | ---: | ---: |
| `docs/projects/registry.json` projects | 9 | 7 |
| `docs/projects/registrations/` | included Luxe + Multimodal | removed both |
| `scripts/generate_d2_manifest.js` pilot groups | included Luxe + Multimodal | removed both |
| `scripts/d2_manifest_analyzer.js` pilot groups | included Luxe + Multimodal | removed both |
| `package.json` `test:lab` | `npx tsx --test EOS-Lab/**/*.test.ts` (no files left) | `node scripts/test-lab-runner.js` (L0, cross-platform) |
| `docs/intake/MASTER_GAP_REGISTER.json` GAP-MCP-001 | OPEN (FlowDesk tests) | CLOSED — project retired |

The lab runner discovers the remaining `EOS-Lab/Canary-Alpha` tests: **31/31 pass**.

No active reference remains under `src/`, `bin/`, `scripts/`, `tests/`, `.github/`, or `package.json`.

---

## 3. Historical evidence retained (not deleted)

Audits, ADRs, specs, intake records, evidence receipts, and knowledge notes remain as
historical evidence of the retired pilots:

- `docs/audits/EOS_PHASE_II_*LUXE*`, `*MULTIMODAL*`, `*FLOWDESK*`, `*SONRISA*`
- `docs/architecture/adrs/ADR-0002-luxe-registry-architecture.md`
- `docs/architecture/adrs/ADR-0003-flowdesk-stack-and-architecture.md`
- `docs/architecture/adrs/ADR-0006-multimodal-creative-architecture.md`
- `docs/specs/luxe_registry/`, `docs/specs/multimodal_creative/`, `docs/specs/flowdesk/`
- `docs/intake/luxe_registry/`, `docs/intake/multimodal_creative/`
- Related `EVD-*` receipts

**NON-CLAIM:** Retaining historical documents does not mean the projects remain active,
supported, or part of the EOS product surface. They are archived evidence.

---

## 4. Explicit non-actions

- No `src/core/**` file changed.
- No test, lock, schema, MCP catalog entry, or verify check changed.
- No `Fundacion/` mutation (Δ=0).
- No external target-project write.
- No `PRODUCTION_READY` flip.

---

## 5. Verification

```text
npm test                 → 1460 tests, 1460 pass
npm run verify:strict    → 913 checks, 0 failures
Active reference grep    → 0 under src/bin/scripts/tests/package.json/.github
git status               → clean after commit
```
