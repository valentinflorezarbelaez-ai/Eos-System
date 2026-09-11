# EOS U7 SpecBoot DEFER stubs - 2026-09-09

**Branch:** cursor/eos-u7-specboot-defer-stubs
**Base tip:** c8d79c100dca4fa3319492262546949b1c86056a (U6 #97 merged on main) — rebased onto origin/main
**Prior U6 tip (pre-merge branch):** 69a1ff9ad9bf8d32cdaad93d2cca87e25ab648eb
**Alcance:** U7 ONLY (Ladder 9 K7) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push only; update PR #98 only)
**AT_CEILING:** yes (no new docs/schemas JSON)
**Decision:** **IGNORE** — do not invent docs/{development_guide,documentation-standards,frontend-standards}.md (S2 TPC must-not-invent); harness INDEX pointer under docs/harness/; no Gentleman invent; foreign ai-specs remain DEFER unstaged

## Objetivo (U7 / K7 DoD)

Fill SpecBoot DEFER stubs as EOS index **or** IGNORE — delivered as **IGNORE** (INDEX at forbidden paths blocked by S2):

1. `docs/development_guide.md`, `docs/documentation-standards.md`, `docs/frontend-standards.md` remain **ABSENT** (gitignore IGNORE)
2. Honesty via `docs/harness/SPECBOOT_DEFER_STUBS_INDEX.md` + CONTEXT_PACK_TPC MISSING/DEFER
3. **No Gentleman invent** / no mass invent content
4. Tests PASS (`test:u7` + `test:s2`); Fundacion Delta=0; foreign ai-specs DEFER unstaged; AT_CEILING
5. NON-CLAIM: harness INDEX ≠ Gentleman standards complete; CloudAgent out of path

## Disposition

| Path | Class | Why |
| --- | --- | --- |
| `docs/development_guide.md` | **IGNORE** | S2 TPC must-not-invent; not tracked |
| `docs/documentation-standards.md` | **IGNORE** | Same |
| `docs/frontend-standards.md` | **IGNORE** | Same; no Gentleman frontend invent |
| `docs/harness/SPECBOOT_DEFER_STUBS_INDEX.md` | PROMOTE (index) | Allowed pointer to SpecBoot DEFER proxies |
| `ai-specs/agents/backend-developer.md` | DEFER (unstaged) | Foreign template; not EOS-calibrated |
| `ai-specs/agents/frontend-developer.md` | DEFER (unstaged) | Foreign stub; not EOS-calibrated |
| `ai-specs/agents/product-strategy-analyst.md` | DEFER (unstaged) | Foreign stub; not EOS-governed |

Mode: **IGNORE**. INDEX_STUBS at forbidden paths is **not delivered** (superseded — CI blocker vs S2 TPC).

## Entregables

1. OpenSpec `openspec/changes/eos-u7-specboot-defer-stubs/`
2. Ritual `docs/harness/SPECBOOT_DEFER_STUBS_RITUAL.md`
3. Harness INDEX `docs/harness/SPECBOOT_DEFER_STUBS_INDEX.md`
4. Lock `scripts/lib/specboot-defer-stubs-lock.js` + gate `scripts/ci/specboot-defer-stubs-gate.js`
5. Tests `tests/eos-u7-specboot-defer-stubs.test.js` + `test:u7`
6. verify-eos REQUIRED_PATHS U7 (without inventing forbidden docs)
7. Esta nota + freeze U7 + matrix MEASURED
8. SPECBOOT_CYCLE gap #7 + base-standards pointer to IGNORE/index
9. `.gitignore` IGNORE entries for the three SpecBoot checklist paths
10. Foreign ai-specs DEFER sin stage; no Gentleman invent

## Verificacion

- npm run test:u7
- npm run test:s2
- node scripts/ci/specboot-defer-stubs-gate.js → mode IGNORE
- Fundacion porcelain vacio
- PRODUCTION_READY=NO
- ai-specs remain untracked DEFER
- Forbidden three paths ABSENT

## No-claims

NON-CLAIM:

- harness INDEX ≠ Gentleman / LIDR standards complete.
- Triage / IGNORE ≠ PRODUCTION_READY flip.
- Gate PASS ≠ permission to invent frontend standards.
- ai-specs DEFER unstaged ≠ deleted.
- IGNORE ≠ invent SpecBoot checklist paths while S2 TPC must-not-invent stands.
- CloudAgent out of path ≠ ban local Cursor IDE editing.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin U8 en esta rama.
- Push to PR #98 only; do not merge.
- PRODUCTION_READY permanece NO.
- FORBIDDEN Gentleman invent / mass invent / pretend Gentleman standards COMPLETE.
