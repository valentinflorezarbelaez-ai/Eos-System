# Proposal — dry-run SDD routing example

## Why

ADR-0010 adopted LIDR Specboot + OpenSpec as the substantial-change ceremony. Operators need one **dry-run scaffold** that shows the conventional OpenSpec folder layout (`proposal` / `design` / `tasks` / delta `specs`) without pretending to ship a new Control Plane engine.

## What

A documentation-only change that:

- Demonstrates `openspec/changes/<id>/` artifact names
- Adds an observable requirement that the committed OpenSpec runtime layout exists
- Points at `docs/base-standards.md`, `docs/backend-standards.md`, and `ai-specs/`

## Routing

**SDD** (this change *is* the example). Not DIRECT. File/diff size is irrelevant.

## NON-goals

- No new orchestrator or engine in `src/core`
- No npm dependency
- No Fundacion or Constitution mutation
- Not a fake product feature (checkout, auth, themes, gentle-ai installer)
- Does not replace `node bin/eos.js` / `npm run eos:mission`

## Approach

Commit the scaffold and the runtime docs. Archive later only if the Product Owner wants the delta merged into `openspec/specs/`.
