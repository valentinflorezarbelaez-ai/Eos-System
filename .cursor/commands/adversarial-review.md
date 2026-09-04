# /adversarial-review

LIDR Specboot / Gentleman RDD — independent red-team of the change.

**Discipline:** ADR-0010. Review is **INFORMATIONAL**. It does not authorize delivery.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.

## Do

1. Look for write-barrier escapes, self-certification, missing tests, and refused NON-goals (Engram drop-in, installers, coverage quotas).
2. Record findings. A clean review still does **not** merge to `main`, release, or write Fundacion.

## Next

`/archive` (docs/spec merge) then `/commit` only under existing git / HITL rules.
