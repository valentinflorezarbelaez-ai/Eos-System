# /propose

LIDR Specboot — write the OpenSpec envelope (`proposal.md`, specs, `design.md`, `tasks.md`).

**Discipline:** ADR-0010. Official OpenSpec / Adonis alias: `opsx:propose` / `/opsx-propose`.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.

## Do

1. Put new changes under `openspec/changes/<id>/`. Keep historical specs in `docs/specs/`.
2. Include NON-goals. Cite `docs/base-standards.md` and `docs/backend-standards.md`. Write specs as Given/When/Then (EARS is not a LIDR import).
3. No Core / Fundacion writes without recorded authorization.

## Next

`/apply` after the proposal is accepted (human or existing authorization).
