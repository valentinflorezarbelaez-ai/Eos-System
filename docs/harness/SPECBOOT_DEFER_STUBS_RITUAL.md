# SpecBoot DEFER stubs ritual (Ladder 9 U7 / K7)

**Status:** ACTIVE local governed ritual
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0
**Mode:** INDEX_STUBS (default delivered) — Gentleman invent FORBIDDEN

## 1. Purpose

Close SpecBoot gap for `docs/development_guide.md`, `docs/documentation-standards.md`, `docs/frontend-standards.md` without vibe mass invent or silent IGNORE of checklist paths.

## 2. Legal modes

### 2.1 INDEX_STUBS (default — U7 delivered)

- Track the three paths as **minimal honest EOS INDEX** stubs.
- Required markers: `INDEX`, `DEFER`, `PRODUCTION_READY`, SSOT pointers, **no Gentleman invent**.
- Stubs point at base-standards / backend-standards / ADR-0010 / SPECBOOT_CYCLE / layer rules.
- **FORBIDDEN:** inventing Gentleman/LIDR frontend or docs standards wholesale in these files.

### 2.2 IGNORE (selective — not used for these three)

- Legal for true noise (T8: lab / quarantine dumps / unreferenced binaries).
- **Not** preferred for SpecBoot-named checklist paths — IGNORE would hide required surfaces.
- IGNORE ≠ DISCARD; files may remain on disk.

### 2.3 GENTLEMAN_FILL (future — PO / satellite authorized only)

- Only when satellite scope authorizes Gentleman-calibrated content.
- Must not contradict EOS base-standards / ADR-0010.
- Out of scope for U7.

## 3. Disposition table (U7)

| Path | Class | Why |
| --- | --- | --- |
| `docs/development_guide.md` | INDEX_STUBS (PROMOTE) | SpecBoot checklist path; EOS index pointers only |
| `docs/documentation-standards.md` | INDEX_STUBS (PROMOTE) | Same |
| `docs/frontend-standards.md` | INDEX_STUBS (PROMOTE) | Same; no Gentleman frontend invent |
| `ai-specs/agents/backend-developer.md` | DEFER (unstaged) | Foreign template; not EOS-calibrated |
| `ai-specs/agents/frontend-developer.md` | DEFER (unstaged) | Foreign stub; not EOS-calibrated |
| `ai-specs/agents/product-strategy-analyst.md` | DEFER (unstaged) | Foreign stub; not EOS-governed |

## 4. Verify / gate

- Lock: `scripts/lib/specboot-defer-stubs-lock.js`
- Gate: `scripts/ci/specboot-defer-stubs-gate.js` (NON-MUTATING)
- Evidence: `docs/releases/EOS_U7_SPECBOOT_DEFER_STUBS_2026-09-09.md`
- Test: `npm run test:u7`

## 5. FORBIDDEN

- Gentleman invent / mass invent content in the three stubs
- Mass delete of DEFER without PO names
- Force-commit secrets
- Fundacion / App Fuerza mutation
- Staging foreign `ai-specs/agents/*` without EOS calibration
- Claiming Gentleman standards complete when only INDEX stubs exist
- CloudAgent as SpecBoot default

## 6. Non-claims

- INDEX stub ≠ Gentleman / LIDR standards complete
- Triage / PROMOTE ≠ PRODUCTION_READY flip
- DEFER unstaged ai-specs ≠ deleted
- Gate PASS ≠ permission to invent frontend standards
- Antigravity-first: CloudAgent out of SpecBoot default path
- PRODUCTION_READY remains **NO**
