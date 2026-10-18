# EOS Orphan Script Prune — 2026-10-18

**Status:** EXECUTED (scripts-only, evidence-backed)
**Scope:** Repository root `scripts/` one-shot utilities
**PRODUCTION_READY:** NO
**Fundacion:** Δ=0 (untouched)
**P6 / KEEP_PO HOLD:** retained (no `src/core`, MCP tool, or KEEP candidate pruned)

---

## 1. Objective

Remove zero-reference, one-shot scripts that cannot run in this workspace because
they hardcode external Windows paths or patch source files that no longer need
patching. This is a narrow hygiene prune, not a complexity-budget or MCP-tool prune.

**NON-CLAIM:** Removing dead scripts does not change maturity, closure, evidence
custody, or `PRODUCTION_READY`. Inventory ≠ silent delete; this note is the delete record.

---

## 2. Method (evidence)

1. Enumerated every `.js` / `.mjs` / `.cjs` / `.ts` file under the repository.
2. Scanned all code, JSON, Markdown, YAML, and CI files for full-path, basename,
   relative-import, and path-without-extension references.
3. Excluded `tests/`, `archive/`, generated `.astro/` output, and intentional
   `.agents` ↔ `ai-specs` skill mirrors.
4. Cross-checked `package.json` scripts, `bin` entries, `scripts/verify-eos.js`
   required paths, governance locks, and `.github/workflows`.
5. Kept files with any live reference or governance role.

Result: 20 zero-reference files. Of those, 12 are `.d.ts` declarations for KEEP
modules, and `bin/eos-syntax-guard.js` is a documented operator CLI wrapper.
Those 13 were **kept**. The 7 files below were removed.

---

## 3. Removed paths

| Path | Why removed |
| --- | --- |
| `scripts/apply-coach-guided-ux.mjs` | One-shot App Fuerza patch; hardcodes `C:\Users\...` outside the workspace; zero references. |
| `scripts/decompose-app-fuerza-page.mjs` | One-shot App Fuerza decomposer; hardcodes `C:\Users\...`; zero references. |
| `scripts/fix-exercise-type.mjs` | One-shot App Fuerza patch; hardcodes `C:\Users\...`; zero references. |
| `scripts/extract-workout-logger.mjs` | Dead extraction helper; uses `require()` inside `.mjs`; hardcodes `C:/Users/...`; zero references. |
| `scripts/extract-workout-logger.cjs` | Byte-identical duplicate of the dead `.mjs` helper; zero references. |
| `scripts/wire-host-honesty.mjs` | Obsolete migration patcher; would reintroduce pre-fix honesty wiring; zero references. |
| `scripts/amend-hud-lag.mjs` | Obsolete one-shot HUD patcher; superseded by the live implementation; zero references. |

---

## 3.1 Generated artifacts removed (not source)

| Path | Why removed |
| --- | --- |
| `EOS-Lab/FlowDesk/flowdesk.db` | Runtime SQLite state; recreated on demand by `createDbConnection()`. |
| `EOS-Lab/FlowDesk/flowdesk.db-shm` | SQLite WAL shared-memory sidecar. |
| `EOS-Lab/FlowDesk/flowdesk.db-wal` | SQLite write-ahead log sidecar. |
| `EOS-Lab/FlowDesk/test_concurrency.db` | Leftover test database; the concurrency suite deletes it in `after()`. |
| `EOS-Lab/Sonrisa-Nova/.astro/content-assets.mjs` | Astro generated cache (empty `Map`). |
| `EOS-Lab/Sonrisa-Nova/.astro/content-modules.mjs` | Astro generated cache. |
| `EOS-Lab/Sonrisa-Nova/.astro/content.d.ts` | Astro generated type surface. |
| `EOS-Lab/Sonrisa-Nova/.astro/types.d.ts` | Astro generated type surface. |

`.gitignore` now excludes `.astro/`, `*.db-shm`, `*.db-wal`, `*.sqlite-shm`, and
`*.sqlite-wal` so the same residue cannot be recommitted. `*.db` / `*.sqlite`
were already excluded but tracked files are not auto-untracked by git.

**Non-action:** `package-lock.json`, source `.ts`, tests, and config files under
`EOS-Lab/` remain untouched.

---

## 4. Explicit non-actions

- No `src/core/**` file removed.
- No P6 CANDIDATE path removed or moved.
- No MCP tool, catalog entry, or KEEP_PO inventory changed.
- No test, fixture, evidence file, release note, lock, or ADR removed.
- No `Fundacion/` or external target-project mutation (Δ=0).
- `HOLD — no prune this quarter` remains in force for KEEP_PO / MCP tools.

---

## 5. Verification

```text
npm test                 → 1460 tests, 1460 pass, 0 fail
npm run verify:strict    → 913 checks passed, 0 failures
npm run prune:eos        → 0 residual temp files
```

Any future script prune must repeat the reference scan, name exact paths here,
and pass both commands above before merge.
