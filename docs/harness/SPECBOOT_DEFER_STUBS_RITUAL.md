# SpecBoot DEFER stubs ritual (Ladder 9 U7 / K7)

**Status:** ACTIVE local governed ritual
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0
**Mode:** IGNORE (U7 delivered) — Gentleman invent FORBIDDEN; INDEX_STUBS legal later only if S2 TPC lock is revised

## 1. Purpose

Close SpecBoot gap for `docs/development_guide.md`, `docs/documentation-standards.md`, `docs/frontend-standards.md` without vibe mass invent and without violating S2 Context Pack TPC **must not invent** locks.

## 2. Legal modes

### 2.1 INDEX_STUBS

- Track the three paths as **minimal honest EOS INDEX** stubs.
- Required markers: `INDEX`, `DEFER`, `PRODUCTION_READY`, SSOT pointers, **no Gentleman invent**.
- **Blocked for U7 while S2 TPC asserts must-not-invent** those paths (`tests/eos-s2-context-pack-tpc.test.js`).
- **FORBIDDEN:** inventing Gentleman/LIDR frontend or docs standards wholesale in these files.

### 2.2 IGNORE (U7 delivered)

- SpecBoot-named checklist paths stay **ABSENT** from the tree (and gitignored).
- Honesty lives in allowed index: `docs/harness/SPECBOOT_DEFER_STUBS_INDEX.md` + CONTEXT_PACK_TPC MISSING/DEFER rows.
- IGNORE ≠ DISCARD; recreations on disk stay untracked via `.gitignore`.
- Prefer IGNORE over invent when TPC / context-pack forbids the paths.

### 2.3 GENTLEMAN_FILL (future — PO / satellite authorized only)

- Only when satellite scope authorizes Gentleman-calibrated content **and** S2 TPC lock is revised.
- Must not contradict EOS base-standards / ADR-0010.
- Out of scope for U7.

## 3. Disposition table (U7)

| Path | Class | Why |
| --- | --- | --- |
| `docs/development_guide.md` | IGNORE | S2 TPC must-not-invent; proxy via harness INDEX + base-standards |
| `docs/documentation-standards.md` | IGNORE | Same |
| `docs/frontend-standards.md` | IGNORE | Same; no Gentleman frontend invent |
| `docs/harness/SPECBOOT_DEFER_STUBS_INDEX.md` | PROMOTE (index) | Allowed pointer; not a forbidden checklist path |
| `ai-specs/agents/backend-developer.md` | DEFER (unstaged) | Foreign template; not EOS-calibrated |
| `ai-specs/agents/frontend-developer.md` | DEFER (unstaged) | Foreign stub; not EOS-calibrated |
| `ai-specs/agents/product-strategy-analyst.md` | DEFER (unstaged) | Foreign stub; not EOS-governed |

## 4. Verify / gate

- Lock: `scripts/lib/specboot-defer-stubs-lock.js`
- Gate: `scripts/ci/specboot-defer-stubs-gate.js` (NON-MUTATING)
- Evidence: `docs/releases/EOS_U7_SPECBOOT_DEFER_STUBS_2026-09-09.md`
- Test: `npm run test:u7` (+ `npm run test:s2` must stay green)

## 5. FORBIDDEN

- Gentleman invent / mass invent content at the three SpecBoot checklist paths
- Creating `docs/{development_guide,documentation-standards,frontend-standards}.md` while S2 TPC must-not-invent stands
- Mass delete of DEFER without PO names
- Force-commit secrets
- Fundacion / App Fuerza mutation
- Staging foreign `ai-specs/agents/*` without EOS calibration
- Claiming Gentleman standards complete when only IGNORE + harness INDEX exist
- CloudAgent as SpecBoot default

## 6. Non-claims

- harness INDEX ≠ Gentleman / LIDR standards complete
- Triage / IGNORE ≠ PRODUCTION_READY flip
- DEFER unstaged ai-specs ≠ deleted
- Gate PASS ≠ permission to invent frontend standards
- Antigravity-first: CloudAgent out of SpecBoot default path
- PRODUCTION_READY remains **NO**
