# Proposal — EOS Ladder 7 LIDR Harness Workshop adoption + maturity audit

## Why

Post Ladder 6 R1–R6 (#68–#73 @ `e431e2c`), EOS needs a **Ladder 7** audit that adopts the LIDR Harness Engineering workshop into EOS vocabulary and orders the next ≤6 steps — without flipping PRODUCTION_READY and without implementing follow-on work on this branch.

Workshop depth (Notion + grabación page + blogs + Spec-Boot repo) adds beyond prior intake:

1. Harness manages context **lifecycle** (inject/compact/discard; context rot; context anxiety + reset; revisit assumptions on model change).
2. **Four-quadrant** guides/sensors (feedforward/feedback × computational/inferential).
3. **Ratchet** (Hashimoto): error → durable control so it cannot recur.
4. **Spec-Boot** concrete flow/skills/symlinks (cite; map; do not fork).
5. Token cache static-first + tool claims (NON-CLAIM external audit).
6. AI Champion = shared team criterion (measure→feedback→improve→distribute).
7. METR/Faros whiplash — keep NON-CLAIM.

## What (this change only)

1. Spanish adoption doc: `docs/releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md`
2. Ladder 7 audit: `docs/releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md` with tip honesty gap + S1–S6 DoD
3. Freeze gate **L7 audit section** — tip pin **unchanged** until S1
4. This OpenSpec change folder (proposal + design + tasks + delta spec)

## Ladder S1–S6 (DoD summary)

| ID | Focus |
| --- | --- |
| S1 | Tip refresh post R1–R6 (+ this audit) |
| S2 | Context Pack TPC index + lifecycle notes + verify existence lock |
| S3 | Loop Engineering policy + 4Q guides/sensors + doctor/mission honesty NON-CLAIM |
| S4 | Worktree isolation policy + smoke (Spec-Boot using-git-worktrees map) |
| S5 | MCP/tool KEEP inventory (PO-gated prune; mirror P6) |
| S6 | Model routing + ratchet error→rule ritual |

**Recommend start S1.** Do **not** implement S1 here.

## Routing

**SDD** (ADR-0010 / docs/base-standards.md). Human requested 100% Spec-Driven Development + substantial governance docs.

## NON-goals

- PRODUCTION_READY flip
- Implement S1–S6 code/runtime
- Move freeze `main_tip` (S1)
- Fundacion / App Fuerza
- Execute prune / install token tools / clone Spec-Boot
- Claim "solves any problem" / whiplash solved
