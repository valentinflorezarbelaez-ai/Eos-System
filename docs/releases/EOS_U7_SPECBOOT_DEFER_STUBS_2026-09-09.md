# EOS U7 SpecBoot DEFER stubs - 2026-09-09

**Branch:** cursor/eos-u7-specboot-defer-stubs
**Base tip:** c8d79c100dca4fa3319492262546949b1c86056a (U6 #97 merged on main) — rebased onto origin/main
**Prior U6 tip (pre-merge branch):** 69a1ff9ad9bf8d32cdaad93d2cca87e25ab648eb
**Alcance:** U7 ONLY (Ladder 9 K7) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push only; NO PR)
**AT_CEILING:** yes (no new docs/schemas JSON)
**Decision:** **INDEX_STUBS** — promote three SpecBoot docs as minimal honest EOS INDEX stubs; no Gentleman invent; foreign ai-specs remain DEFER unstaged

## Objetivo (U7 / K7 DoD)

Fill SpecBoot DEFER stubs as EOS index **or** IGNORE — delivered as INDEX:

1. `docs/development_guide.md`, `docs/documentation-standards.md`, `docs/frontend-standards.md` tracked as **INDEX** stubs (DEFER/SSOT markers + pointers)
2. **No Gentleman invent** / no mass invent content
3. Selective IGNORE remains legal for T8 noise only — **not** used for SpecBoot-named checklist paths
4. Tests PASS (`test:u7`); Fundacion Delta=0; foreign ai-specs DEFER unstaged; AT_CEILING
5. NON-CLAIM: INDEX stub ≠ Gentleman standards complete; CloudAgent out of path

## Disposition

| Path | Class | Why |
| --- | --- | --- |
| `docs/development_guide.md` | **INDEX_STUBS** (PROMOTE) | SpecBoot checklist path; EOS index pointers only |
| `docs/documentation-standards.md` | **INDEX_STUBS** (PROMOTE) | Same |
| `docs/frontend-standards.md` | **INDEX_STUBS** (PROMOTE) | Same; no Gentleman frontend invent |
| `ai-specs/agents/backend-developer.md` | DEFER (unstaged) | Foreign template; not EOS-calibrated |
| `ai-specs/agents/frontend-developer.md` | DEFER (unstaged) | Foreign stub; not EOS-calibrated |
| `ai-specs/agents/product-strategy-analyst.md` | DEFER (unstaged) | Foreign stub; not EOS-governed |

Mode: **INDEX_STUBS**. Prefer INDEX over IGNORE for SpecBoot-required paths.

## Entregables

1. OpenSpec `openspec/changes/eos-u7-specboot-defer-stubs/`
2. Ritual `docs/harness/SPECBOOT_DEFER_STUBS_RITUAL.md`
3. Lock `scripts/lib/specboot-defer-stubs-lock.js` + gate `scripts/ci/specboot-defer-stubs-gate.js`
4. Tests `tests/eos-u7-specboot-defer-stubs.test.js` + `test:u7`
5. Three INDEX stubs tracked
6. verify-eos REQUIRED_PATHS U7
7. Esta nota + freeze U7 + matrix MEASURED
8. SPECBOOT_CYCLE gap #7 + base-standards pointer
9. Foreign ai-specs DEFER sin stage; no Gentleman invent

## Verificacion

- npm run test:u7
- node scripts/ci/specboot-defer-stubs-gate.js → mode INDEX_STUBS
- Fundacion porcelain vacio
- PRODUCTION_READY=NO
- ai-specs remain untracked DEFER

## No-claims

NON-CLAIM:

- INDEX stub ≠ Gentleman / LIDR standards complete.
- Triage / PROMOTE ≠ PRODUCTION_READY flip.
- Gate PASS ≠ permission to invent frontend standards.
- ai-specs DEFER unstaged ≠ deleted.
- IGNORE not applied to SpecBoot checklist paths in U7.
- CloudAgent out of path ≠ ban local Cursor IDE editing.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin U8 en esta rama.
- Push only; NO PR.
- PRODUCTION_READY permanece NO.
- FORBIDDEN Gentleman invent / mass invent / pretend Gentleman standards COMPLETE.
