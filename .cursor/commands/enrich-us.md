# /enrich-us

LIDR Specboot — enrich the user story into a JTBD and value hypothesis before proposing a change.

**Discipline:** ADR-0010. **SSOT:** `docs/base-standards.md`.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission` — do not wrap or replace it.

## Do

1. Name the user, the job, and the success signal.
2. Prefer `NO_BUILD` when there is no job-to-be-done.
3. Apply organic routing: if this is a trivial local fix, stop and use DIRECT (file/diff size alone does not force SDD).

## Next

`/propose` or `/ff` when SDD applies.
