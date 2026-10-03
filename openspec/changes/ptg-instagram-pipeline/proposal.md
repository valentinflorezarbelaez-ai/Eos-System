# Proposal — PTG Instagram pipeline (spec only)

## Why

Performance Talent Group needs a bounded Instagram publishing contract that stays off the public EOS homepage and out of the Control Plane kernel. An earlier intake (`docs/intake/performance-talent/PROJECT_CONTEXT.md`, `PRJ-PERFORMANCE-TALENT`) describes a recruiting website and is still `IN_PROGRESS`. It is not an Instagram pipeline. This change adds the pipeline spec beside that intake. It does not duplicate the website intake and it does not start an external project write.

## What

Specification only:

- Legal identity and people as `USER_ASSERTED` until a source file in the repo supports them.
- Roster figures as `USER_ASSERTED`. No minor-athlete personal data is cleared for publication.
- Media bounds for video and stills.
- Caption discipline: short, high density, no hype. Pattern Alpha and Pattern Beta are named intents. Token templates were not found in the repo and are not invented here.
- Hashtag count 3–5.

## Routing

**SDD** (ADR-0010). Documentation only. Cite `docs/base-standards.md`.

## Search note

On 2026-10-03 a repository search for Instagram pipeline specs, caption token templates, Pattern Alpha, Pattern Beta, Wyscout, and the roster names found no existing pipeline spec and no caption token templates. The website intake above is a different artifact and stays as it is.

## Authorization

- No writes under `Fundacion/`.
- No writes under `src/core/`.
- No write to `C:\Users\valen\Documents\Performance-Talent-Group`. External write barrier stays closed (`specification_status` on the registration remains untouched).
- No npm dependency.

## NON-goals

- No implementation, scheduler, or Instagram API client.
- No invented API, token template, or caption macro.
- No homepage section.
- No labeling of user-asserted biography or roster numbers as `VERIFIED`.
- No publication of personal data about minors.
- No auto-posting loop.
