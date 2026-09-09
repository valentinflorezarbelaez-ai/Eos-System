# EOS R5 Gobernanza writers diferidos post-Q5 — 2026-09-09

**Branch:** `cursor/eos-r5-deferred-writers-governance`
**Base main tip:** `d35c65a07446bf0ac8dc8740127b540d394bf696` (post-R4 #71)
**Alcance:** R5 ONLY (Ladder 6 K5) — Choice **B** (inventario + candado NON-CLAIM fail-closed)
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**App Fuerza:** sin cambios
**Merge:** NO (push + compare only; HITL en navegador)

---

## 1. Goal (R5 / K5 DoD)

1. Gobernanza de writers diferidos post-Q5: subset nombrado (HashChainedLedger persist / ledger-recovery u otros no-selected) vía Write Barrier / audited envelope **OR** NON-CLAIM documentado fail-closed.
2. **Decisión: Choice B** — no forzar ruta falsa; inventario rankeado + verify lock.
3. Tests PASS (`test:r5`); App Fuerza/Fundacion intactos; **sin ledger EVD paralelo**.
4. `PRODUCTION_READY=NO`.

---

## 2. Decisión A vs B (rationale)

### Investigación

- Envelope Q5 (`mission-artifact-write.js`) está path-bound a `.missions`.
- SSOT Write Barrier **no** incluye `.eos` / `.eos/ledger` (destino de HashChainedLedger).
- HashChainedLedger append usa `writeSync`/`fsync` bajo lock; `writeFileSync` solo en recovery ~314/349.
- `ledger-recovery.js` `writeFileSync` ~30 es rewrite atómico temp+rename (custody).
- ADR-0015: EvidenceCustody = fachada sobre HashChainedLedger; **no** segundo hash-chain.

### Choice A rechazada

Enrutar HashChainedLedger / ledger-recovery por envelope mission-artifact o expandir allowlist a `.eos` sería:

1. Envelope incorrecto (`.missions` ≠ `.eos/ledger`).
2. Teatro de allowlist (append path seguiría fuera del envelope `writeFileSync`).
3. Riesgo a invariantes de custody/recovery y a dual-ledger / confusión con `sealEvd`.

### Choice B (elegida)

Inventario rankeado + candado fail-closed que exige secciones NON-CLAIM: deferred writers **remain internal by design**; no fake route; no parallel EVD ledger.

---

## 3. Entregables

1. OpenSpec: `openspec/changes/eos-r5-deferred-writers-governance/`
2. Inventario: `docs/releases/EOS_R5_DEFERRED_WRITERS_INVENTORY_2026-09-09.md`
3. Lock: `scripts/lib/deferred-writers-lock.js` + wire `scripts/verify-eos.js`
4. Tests: `tests/eos-r5-deferred-writers-governance.test.js` + `npm run test:r5`
5. Esta evidencia + nota freeze
6. Dirty tree **DEFER** (untracked sin stage)

---

## 4. NON-CLAIM

- Choice B ≠ routing HashChainedLedger through Write Barrier.
- Inventory ≠ executed rewrite of deferred writers.
- Lock ≠ parallel EVD ledger / no second hash-chain.
- doctor ≠ verify (R5 no toca doctor/fusion-light).
- Lock ≠ P6 prune.
- Fundacion Delta=0; App Fuerza untouched.
- `PRODUCTION_READY` permanece **NO**.

---

## 5. Freeze note

Tras push de esta rama (merge requiere PO / HITL):

- R5 Choice B listo para review: inventario + verify lock NON-CLAIM fail-closed.
- Tip pin de freeze (`main_tip`) **no** se mueve en R5 (tip refresh es misión aparte).
- Dictamen: COMPLETE_FOR_LOCAL_GOVERNED_USE; **PRODUCTION_READY: NO**.
- R6+ no se inicia en silencio en esta rama.

---

## 6. Verify (agent-executed)

| Command | Exit | Notes |
| --- | --- | --- |
| `npm run test:r5` | 0 | 8/8 PASS |
| `npm run test:q5` | 0 | 12/12 PASS (selected envelope intact) |
| `npm run verify:strict` | 0 | 679 checks; deferred-writers-lock VERIFIED |
| `node scripts/verify-eos.js --strict` | 0 | surrogate contract: lock checks present; failures=0 |

---

## 7. Paths K5

- `mission-artifact-write.js` `deferred_note`
- `epistemic-evidence-engine.js` `writeFileSync` ~314/349
- `ledger-recovery.js` `writeFileSync` ~30
- other non-selected `src/core` writers (inventario §3)
