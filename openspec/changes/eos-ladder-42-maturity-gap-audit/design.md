# Design — Ladder 42 Maturity Gap Audit

**Status:** Proposed · docs-only · pending PO ratification.

## Method (reproducible)

```bash
ls src/core/composition/*-port.js | wc -l          # 68 ports
ls src/core/composition/*-receipt.js | wc -l       # 69 receipts
ls src/core/composition/ladder*-seam-port.js | wc -l  # 11 seam packs
ls docs/schemas/*.json | wc -l                     # 32 schema JSON

for k in agent-lifecycle rehearsal sandbox-ephemeral token-quota \
         evaluation-threshold hitl-threshold chargeback marginal-cost; do
  printf '%-20s %s\n' "$k" "$(grep -ril "$k" src/core --include='*.js' | wc -l)"
done
```

Any candidate axis must show **0** modules for its core families and must not be already covered by a closed ladder.

## Selection rule

1. Zero measured coverage in the core family.
2. Not already covered by a CLOSED ladder (L29 observability, L38–L41 attestation/delivery).
3. If two candidates qualify, prefer the one that is a **precondition** of the other.

Applied: Axis A qualifies and is the precondition of Axis B. A is proposed; B deferred.

## Satellite ordering (NOT authorized by this change)

Purely illustrative, to be re-derived after ratification:

```
Agent identity & signed lifecycle receipt   (identity substrate)
  ➔ Ephemeral lifecycle state machine
  ➔ Rehearsal sandbox (digital twin, no runtime side effects)
  ➔ Lifecycle honesty attestation
  ➔ Ladder 42 seam-pack + closeout
```

No ordinal is assigned here. SPEC-0176 / ADR-0161 remain free until ratification.

## Risks

- **Scope creep into runtime execution authority.** The rehearsal sandbox must remain side-effect-free: a rehearsal that can mutate production state is not a rehearsal.
- **Identity without custody.** Signed identity that cannot be revoked is a liability; revocation must be part of the axis, not a later patch.
- **Ordinal drift.** If satellites are numbered before ratification, the audit becomes a rubber stamp. Hence this change consumes none.

## Non-goals

Any `src/` change, schema JSON, freeze/matrix edit, pin movement, L42 OPEN declaration, or satellite spec.
