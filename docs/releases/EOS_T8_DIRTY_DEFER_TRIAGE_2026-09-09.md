# EOS T8 Dirty DEFER triage - 2026-09-09

**Branch:** cursor/eos-t8-dirty-defer-triage  
**Base / tip fijado:** 1b48ff5c386e83667d2caae78be29f3ad5a5efbb (T7 #89 merged on main)  
**Alcance:** T8 ONLY (Ladder 8 K8) + L8 closeout tip pin — EOS-only  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (sin tocar)  
**Merge:** NO (push only; HITL en navegador)  
**AT_CEILING:** yes (no new docs/schemas JSON)  
**Decision:** **CATALOG + selective IGNORE** — no mass delete of DEFER without PO names

## Objetivo (T8 / K8 DoD)

Untracked set triaged (promote/quarantine/ignore) docs-only; Fundacion Delta=0; no force-commit secrets.

1. Disposition table for current porcelain (PROMOTE / DEFER / IGNORE)
2. **No mass delete** / no DISCARD without PO names
3. PROMOTE triage + ritual + lock + L8 closeout + tip pin machinery only
4. Selective IGNORE for lab / quarantine KAIZEN copies / unreferenced ATP png
5. Tests PASS (`test:t8` + `test:m4`); PRODUCTION_READY=NO; Fundacion Delta=0; AT_CEILING

## Disposition table (re-inspected 2026-09-09 post T7 #89)

| Path | Class | Why |
| --- | --- | --- |
| `ai-specs/agents/backend-developer.md` | DEFER | Foreign Prisma/Express template; no EOS agent markers; not in tracked set |
| `ai-specs/agents/frontend-developer.md` | DEFER | Foreign React Bootstrap stub; not EOS-calibrated |
| `ai-specs/agents/product-strategy-analyst.md` | DEFER | Generic Claude product-strategist stub; not EOS-governed |
| `docs/development_guide.md` | DEFER | Thin SpecBoot stub (~0.5KB); fill later with EOS stack — do not invent Gentleman frontend standards |
| `docs/documentation-standards.md` | DEFER | Thin SpecBoot stub; same as development_guide |
| `docs/frontend-standards.md` | DEFER | Thin SpecBoot stub; same as development_guide |
| `docs/audits/atp_apple_light.png` | IGNORE | Unreferenced ATP screenshot (~387KB); gitignore; not deleted |
| `docs/audits/atp_tidal_dark.png` | IGNORE | Unreferenced ATP screenshot (~426KB); gitignore; not deleted |
| `EOS-Lab/Transmission-Live/` | IGNORE | Audio/visualizer lab experiment; unrelated to control-plane; gitignore |
| `archive/quarantine/docs/evolution/*.json` | IGNORE | KAIZEN dump copies under quarantine (pattern already ignored under `docs/evolution/`); gitignore copies; not ROI2 engine quarantine |

## TRACK this pass (PROMOTE)

| Path | Reason |
| --- | --- |
| `docs/releases/EOS_T8_DIRTY_DEFER_TRIAGE_2026-09-09.md` | This triage SSOT |
| `docs/releases/EOS_LADDER_8_CLOSEOUT_2026-09-09.md` | L8 formal closeout + tip honesty |
| `docs/harness/DIRTY_DEFER_TRIAGE_RITUAL.md` | Ritual / modes / FORBIDDEN |
| `scripts/lib/dirty-defer-triage-lock.js` + gate + `test:t8` | Fail-closed verify |
| freeze / matrix / m4 tip pin → `1b48ff5` | Tip SSOT after T7 #89 |
| `.gitignore` selective IGNORE entries | IGNORE disposition (not delete) |
| OpenSpec `openspec/changes/eos-t8-dirty-defer-triage/` | SDD light |

## DISCARD

**None.** No PO-named deletes this pass. FORBIDDEN mass delete of DEFER without PO names.

## Verificacion

- npm run test:t8
- node scripts/ci/dirty-defer-triage-gate.js
- npm run test:m4
- Fundacion porcelain vacio
- PRODUCTION_READY=NO

## No-claims

- Triage / IGNORE ≠ deleted from disk.
- Catalog ≠ permission to silent-delete.
- Tip pin ≠ PRODUCTION_READY flip.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin force-commit secrets.
- Push only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
- CloudAgent out of SpecBoot default (Antigravity-first).
