# SpecBoot DEFER stubs index (U7 IGNORE)

**Status:** ACTIVE index pointer — **not** the forbidden SpecBoot checklist paths
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0
**Disposition (U7):** **IGNORE** for `docs/{development_guide,documentation-standards,frontend-standards}.md`

## Purpose

Point at SpecBoot DEFER gaps **without creating** `docs/frontend-standards.md`, `docs/documentation-standards.md`, or `docs/development_guide.md`.

S2 Context Pack TPC (`docs/harness/CONTEXT_PACK_TPC.md` + `test:s2`) hard-locks **must not invent** those three paths. U7 therefore delivers **IGNORE** + this harness index — not INDEX_STUBS at forbidden paths.

## SpecBoot gaps (IGNORE — do not invent)

| Expected Spec-Boot file | U7 class | Existing proxy (use until satellite-authorized) |
| --- | --- | --- |
| `docs/development_guide.md` | **IGNORE** | `docs/base-standards.md` + `.agents/AGENTS.md` + `docs/harness/SPECBOOT_CYCLE.md` |
| `docs/documentation-standards.md` | **IGNORE** | `.cursor/rules/09-eos-documentation.mdc` + `docs/base-standards.md` |
| `docs/frontend-standards.md` | **IGNORE** | `.cursor/rules/07-eos-product-and-ux.mdc` + `docs/base-standards.md` |

Also indexed in CONTEXT_PACK_TPC as **MISSING / DEFER**. Gentleman wholesale content remains DEFER — **no Gentleman invent**.

## Related

- Ritual: `docs/harness/SPECBOOT_DEFER_STUBS_RITUAL.md`
- Evidence: `docs/releases/EOS_U7_SPECBOOT_DEFER_STUBS_2026-09-09.md`
- ADR-0010: `docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`
- Dirty-defer: T8 catalogued DEFER; U7 supersedes those three to IGNORE + gitignore

**NON-CLAIM:** IGNORE ≠ DISCARD from disk forever; index ≠ Gentleman standards complete; PRODUCTION_READY remains NO.
