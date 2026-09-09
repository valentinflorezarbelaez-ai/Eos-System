# Design — R5 deferred writers governance (Choice B)

## Context (investigation)

| Probe | Observation |
| --- | --- |
| Q5 envelope | `mission-artifact-write.js` path-bound to `.missions` only; `deferred_note` explicitly lists HashChainedLedger + non-selected writers |
| Write Barrier SSOT | `config/security/write-barrier-ssot-roots.json` allowlist includes `.missions`, `src`, `docs`, … — **does not** include `.eos` / `.eos/ledger` |
| HashChainedLedger | Default baseDir `.eos/ledger`; append uses `openSync`/`writeSync`/`fsyncSync` under advisory lock; `writeFileSync` only at recovery truncate (~314/349) |
| ledger-recovery | Atomic temp `writeFileSync` + `renameSync` for JSONL repair (~30) — custody-critical local rewrite |
| ADR-0015 | EvidenceCustody is thin facade over HashChainedLedger; **no second hash-chain**; no parallel EVD ledger |
| K5 DoD | Named subset via barrier/envelope **OR** documented NON-CLAIM fail-closed |

## Decision: **B** (smallest honest path)

**Do not force route A.**

### Why A is unsafe / dishonest here

1. **Wrong envelope:** Mission-artifact envelope asserts `.missions` root. Ledger paths under `.eos/ledger` would always DENY or require semantic lie.
2. **Allowlist expansion theater:** Adding `.eos` to Write Barrier SSOT widens write surface without governing the dominant append path (`writeSync`), so barrier coverage would be fake for HashChainedLedger persist.
3. **Custody / recovery invariants:** Recovery truncate must stay local atomic rewrite under ledger lock; wrapping through mission envelope or ALS scope risks breaking crash-recovery and L0 purity of the hash-chain module.
4. **Dual-ledger risk:** A second “governed write facade” that looks like custody sealing would blur ADR-0015 (EVD seal path remains `sealEvd` / EvidenceCustody — not mission-artifact).

### What B delivers

1. Ranked inventory doc of deferred / non-selected writers (K5 evidence paths + other `src/core` residuals).
2. Explicit NON-CLAIM sections: deferred remain **internal by design**; no fake route; no parallel EVD ledger; PRODUCTION_READY=NO; Fundacion Δ=0; App Fuerza untouched.
3. Fail-closed lock module `scripts/lib/deferred-writers-lock.js` → `auditDeferredWritersLock` asserting required inventory sections + companion paths.
4. Wire into `scripts/verify-eos.js` (strict path), mirror Q6/P6 inventory lock pattern.
5. TDD suite `tests/eos-r5-deferred-writers-governance.test.js` + `npm run test:r5`.

## NON-claims

- Choice B ≠ routing HashChainedLedger through Write Barrier.
- Inventory ≠ executed rewrite of deferred writers.
- Lock ≠ parallel EVD ledger.
- doctor ≠ verify (R5 does not extend doctor/fusion-light).
- Gate/lock ≠ P6 prune.
