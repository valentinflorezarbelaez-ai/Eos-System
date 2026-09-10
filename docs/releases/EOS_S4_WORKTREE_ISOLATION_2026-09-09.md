# EOS S4 Worktree isolation policy + smoke — 2026-09-09

**Branch:** `cursor/eos-s4-worktree-isolation`  
**Base main tip:** `f1c157753dac21c6eb9054a78a5a2121a2e8f117` (post S3)  
**Alcance:** S4 ONLY (Ladder 7 K4) — EOS-only  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (sin tocar)  
**App Fuerza:** sin cambios  
**Merge:** NO (push + compare only)  
**Schemas:** AT_CEILING 35/35 — **sin** nuevos `docs/schemas/**/*.json`

## 1. Goal (S4 / K4 DoD)

1. Política vigente en `docs/harness/WORKTREE_ISOLATION_POLICY.md` (one agent/session ≠ shared dirty dir).
2. Mapa Spec-Boot `using-git-worktrees` **sin fork** (citas a `.agents/...` y `ai-specs/...`).
3. Límites: `.env` / `node_modules` / DB / ports.
4. `verify:strict` falla cerrado si falta política o needles (`scripts/lib/worktree-policy-lock.js`).
5. Smoke/named test `test:s4` **CI-safe** (policy/CLI help/invalid taskId/path lock — **sin** `git worktree add/remove`).
6. **NON-CLAIM:** **no swarm**; policy ≠ swarm orchestration; CI smoke ≠ churn real.
7. Evidencia ES + nota de freeze (sin mover main_tip).

## 2. Gap cerrado

- Existían `bin/eos-worktree.js`, skills Spec-Boot y specs históricas de swarm/P3, pero **no** había política de aislamiento en el pack de gobernanza con candado verify:strict ni smoke CI-safe en seam-pack.
- Ladder 7 audit S4 lo ordenó post S3 Loop Engineering 4Q.

## 3. Design entregado

| Artefacto | Rol |
| --- | --- |
| `openspec/changes/eos-s4-worktree-isolation/` | OpenSpec FIRST (proposal/design/tasks/spec) |
| `docs/harness/WORKTREE_ISOLATION_POLICY.md` | SSOT aislamiento + mapa Spec-Boot + límites |
| `scripts/lib/worktree-policy-lock.js` | Fail-closed existence + needles |
| `scripts/verify-eos.js` | Import + REQUIRED_PATHS + audit **3g12** |
| `tests/eos-s4-worktree-isolation.test.js` + `test:s4` | TDD CI-safe |
| CI seam-pack + contract | `test:s4` (rápido/seguro) |
| Esta evidencia + freeze note | Spanish release SSOT |

## 4. Cómo el smoke es CI-safe

- **No** ejecuta `git worktree add` / `remove` en el named test.
- Verifica: OpenSpec, `auditWorktreePolicyLock`, needles de política, paths de skills+CLI, `node bin/eos-worktree.js --help`, rechazo de taskId inválido.
- Lifecycle real permanece fuera de S4 seam-pack (`tests/eos-worktree.test.js` local/opcional).

## 5. NON-CLAIM

- **no swarm** — policy ≠ swarm orchestration; no promueve WorktreeSwarm a PRODUCTION_READY.
- CI-safe smoke ≠ prueba de lifecycle completo en CI.
- Spec-Boot map ≠ fork / install wholesale.
- **PRODUCTION_READY=NO**; Fundacion Delta=0; sin App Fuerza.
- Sin nuevos schemas JSON (AT_CEILING).
- No implementa S5–S6.

## 6. Freeze note

- S4 listo para review (push/compare); **main_tip de freeze no se mueve** aquí (tip refresh fue S1).
- Dictamen sin cambio; Fundacion Delta=0; DEFER dirty unstaged.

## 7. Verify

```text
npm run test:s4
npm run verify:strict
npm run ci:contract
```

## 8. Deliverables checklist

1. OpenSpec `openspec/changes/eos-s4-worktree-isolation/`
2. `docs/harness/WORKTREE_ISOLATION_POLICY.md` + pointers CONTEXT_PACK/LOOP
3. `scripts/lib/worktree-policy-lock.js` + wire verify:strict
4. `tests/eos-s4-worktree-isolation.test.js` + `package.json` `test:s4`
5. CI seam-pack opcional (sí — fast/safe)
6. Esta evidencia + nota en `EOS_FREEZE_GATE_STATUS.md`