# /archive

LIDR Specboot — fold accepted spec deltas into `openspec/specs/` (or record why they stay in `docs/specs/`).

**Discipline:** ADR-0010. Optional OpenSpec alias: `/opsx-archive`.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.  
Archive is not a production release.

## Do

Move or merge delta requirements. Keep the change folder under `openspec/changes/archive/` if the official CLI is used; otherwise leave a note in `tasks.md`.
