# /ff

LIDR Specboot — fast-forward a thin, already-enriched change into a complete OpenSpec envelope.

**Discipline:** ADR-0010. Same artifacts as `/propose`.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.

## Do

Use `/ff` only when `/enrich-us` is done and the change is small enough to skip a long explore. File/diff size alone is not the criterion — honesty of scope is.

## Next

`/apply` on the first task only.
