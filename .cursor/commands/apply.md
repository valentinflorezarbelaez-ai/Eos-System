# /apply

LIDR Specboot — implement **one** task with strict TDD evidence.

**Discipline:** ADR-0010. Optional OpenSpec alias: `/opsx-apply`.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.

## Do

1. RED → GREEN → TRIANGULATE → REFACTOR.
2. Record command output (`node --test <file>` or the nearest suite). Narrative is `NOT VERIFIED`.
3. Do not self-certify. Leave `/verify` to a separate pass (BUILDER ≠ VERIFIER).

## Next

`/verify`
