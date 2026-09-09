# EOS R5 Deferred Writers Inventory — 2026-09-09

**Branch:** `cursor/eos-r5-deferred-writers-governance`
**Base main tip:** `d35c65a07446bf0ac8dc8740127b540d394bf696` (post-R4 #71)
**Alcance:** R5 ONLY (Ladder 6 K5) — inventario rankeado + NON-CLAIM fail-closed (Choice B)
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**App Fuerza:** untouched
**Merge:** NO (push + compare only)

---

## 1. Goal (K5 / R5 DoD)

Gobernanza de writers diferidos post-Q5: subset nombrado vía Write Barrier / audited envelope **OR** NON-CLAIM documentado fail-closed. Esta entrega elige **Choice B**. Tests PASS; App Fuerza/Fundacion intactos; **sin ledger EVD paralelo**; PRODUCTION_READY=NO.

## 2. Investigation (Choice A vs B)

| Probe | Finding |
| --- | --- |
| Q5 `deferred_note` | Explicit: HashChainedLedger internal writes; other non-selected src writers; App/Fundacion untouched |
| Write Barrier SSOT | `repoRelativeAllowRoots` includes `.missions` but **not** `.eos` / `.eos/ledger` |
| Mission-artifact envelope | Path-bound to `.missions` only (`assertUnderMissionsRoot`) |
| HashChainedLedger persist | Append path uses `openSync`/`writeSync`/`fsyncSync` under advisory lock; `writeFileSync` only for recovery truncate @314/349 |
| ledger-recovery | Atomic temp `writeFileSync` @30 + `renameSync` — custody-critical local rewrite |
| ADR-0015 | EvidenceCustody = thin facade over HashChainedLedger; **no second hash-chain**; no parallel EVD ledger |

### Choice A rejected

Do **not** force-route HashChainedLedger / ledger-recovery through Write Barrier allowlist + mission-artifact envelope:

1. Wrong envelope (`.missions` vs `.eos/ledger`) — would DENY or require a semantic lie.
2. Expanding allowlist to `.eos` would be **fake route** theater: append path still bypasses `writeFileSync` envelope.
3. Recovery must stay local atomic rewrite under ledger lock (custody semantics).
4. Risk of blurring EVD seal path (ADR-0015) into a parallel / dual write facade.

## 3. Ranked deferred writers inventory

Inventory only — **do not delete / do not fake-route**. Ranked by K5 evidence priority then residual `src/core` write surface.

| Rank | Module | Write sites (approx) | Target root | Status | Why deferred / internal |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/core/sdd/epistemic-evidence-engine.js` (HashChainedLedger) | `writeFileSync` ~314/349 (recovery truncate); `writeSync` append ~273; lock `writeSync` ~184 | `.eos/ledger` | **INTERNAL BY DESIGN** | Canonical hash-chain (ADR-0015). Not `.missions`. Barrier allowlist omits `.eos`. |
| 2 | `src/core/runtime/ledger-recovery.js` | `writeFileSync` ~30 (temp) + rename | caller ledger path | **INTERNAL BY DESIGN** | Atomic crash repair; wrapping mission envelope breaks semantics. |
| 3 | `src/core/runtime/mission-artifact-write.js` | envelope `writeFileSync` (selected) | `.missions` | **Q5 ROUTED** (not deferred) | Selected scope already governed; listed for contrast. |
| 4 | `src/core/sdd/evd-seal-path.js` | seal writers | `docs/evidence` + custody | **EVD SSOT** (not R5 route) | G7/N2/P4 seal path — not mission-artifact; not parallel ledger. |
| 5 | `src/core/mcp/mission-loop-runtime.js` | `writeFileSync` ~107 loop state | mission control-plane state | non-selected residual | Outside Q5 selected artifact set; remains internal. |
| 6 | `src/core/runtime/kabbalah-ledger.js` | `appendFileSync` ~57 | runtime ledger path | non-selected residual | Separate runtime ledger helper; not EVD dual-ledger. |
| 7 | Other `src/core` writers (orchestrators, elevate, observability, memory, etc.) | various `writeFileSync` | mixed | non-selected residual | Inventory-only; out of R5 named subset rewrite. |
| 8 | App satellites / Fundacion | n/a | n/a | **FORBIDDEN / untouched** | Fundacion Δ=0; App Fuerza intact. |

### K5 evidence path crosswalk

- `mission-artifact-write.js` `deferred_note` — documents deferred set (source of honesty).
- `epistemic-evidence-engine.js` `writeFileSync` ~314/349 — HashChainedLedger recovery.
- `ledger-recovery.js` `writeFileSync` ~30 — atomic recovery temp write.
- Other non-selected `src/core` writers — ranked above; remain internal.

## 4. Decision: Choice B

**Choice B:** ranked inventory + fail-closed verify lock that required NON-CLAIM sections exist. Deferred writers **remain internal by design**. Do **not** force route through Write Barrier / mission-artifact envelope. Do **not** expand SSOT allowlist to `.eos`.

Lock module: `scripts/lib/deferred-writers-lock.js` → `auditDeferredWritersLock` wired in `verify:strict`.

## 5. Verify lock behavior

| Condition | Result |
| --- | --- |
| Inventory missing | DENY |
| Required sections/needles missing | DENY |
| PRODUCTION_READY not NO | DENY |
| Choice B / NON-CLAIM internal by design / no parallel EVD missing | DENY |
| Honest inventory + companion paths present | ALLOW |

## 6. Related surfaces (unchanged)

- Q5 selected mission-artifact envelope: intact
- Write Barrier SSOT: **no** `.eos` added
- EVD seal / EvidenceCustody: intact (ADR-0015)
- P6 inventory: inventory-only; **no prune executed**

## 7. Dirty tree

DEFER dirty untracked set left unstaged (ROI1 hygiene).

## 8. Follow-ups (explicitly out of R5)

- Future PO-named allowlist expansion for `.eos` would require separate ADR + append-path governance (not this change).
- R6 complexity-budget honesty lock remains separate Ladder 6 item.

## 9. Non-claims

- **NON-CLAIM:** Deferred writers remain **internal by design** — Choice B ≠ routed rewrite through Write Barrier / mission-artifact envelope.
- **NON-CLAIM:** No fake Write Barrier route for HashChainedLedger / ledger-recovery.
- **NON-CLAIM:** No parallel EVD ledger / no second hash-chain (ADR-0015 intact).
- **NON-CLAIM:** Inventory ≠ executed rewrite of deferred writers.
- **NON-CLAIM:** Lock ≠ P6 prune; inventory-only language preserved elsewhere.
- Fundacion Delta=0; App Fuerza untouched.
- **PRODUCTION_READY:** NO
