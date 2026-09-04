# /apply

LIDR Specboot — implement **one** task with strict TDD evidence.

**Discipline:** ADR-0010. Optional OpenSpec alias: `opsx:apply` / `/opsx-apply`.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.

## Do

1. RED → GREEN → TRIANGULATE → REFACTOR.
2. Record command output (`node --test <file>` or the nearest suite) as TDD receipts (`src/core/sdd/tdd-evidence-receipt.js`). Narrative is `NOT VERIFIED`. Missing receipts fail `/verify`.
3. Update OpenSpec artifacts (proposal / spec / design / tasks) so they match what was built. Do not leave a code-only tree.
4. Do not self-certify. Leave `/verify` to a separate pass (BUILDER ≠ VERIFIER).

## Next

`/verify`, then `/archive` only after those OpenSpec artifacts are current.
