# Proposal — EOS U6 OpenSpec CLI optional HOLD

## Why

Ladder 9 audit **U6 / K6**: OpenSpec CLI is optional (ceremony aliases `opsx:*`; not required for L0). Gap is operator install honesty, not a fail-closed runtime hole. U6 delivers **checklist/evidence + fail-closed detect**: if CLI absent → explicit **HOLD**; if present → smoke evidence. Do **not** invent install success.

## What (this change only)

1. OpenSpec light folder (this proposal + tasks + .openspec.yaml) — allowed even when CLI absent
2. Ritual `docs/harness/OPENSPEC_CLI_HOLD_RITUAL.md` — modes CLI_ABSENT_HOLD | CLI_PRESENT_SMOKE
3. Evidence `docs/releases/EOS_U6_OPENSPEC_CLI_HOLD_2026-09-09.md` — honest probe result
4. Lock `scripts/lib/openspec-cli-hold-lock.js` + gate `scripts/ci/openspec-cli-hold-gate.js` (NON-MUTATING; never npm installs)
5. TDD `tests/eos-u6-openspec-cli-hold.test.js` + `test:u6`
6. verify-eos REQUIRED_PATHS; freeze U6 + matrix MEASURED; ANTIGRAVITY_FIRST + OPENSPEC_RUNTIME pointers
7. NON-CLAIM: HOLD ≠ CLI installed; helper exit 2 ≠ L0 failure; smoke ≠ production; CloudAgent out of path

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- npm install -g / inventing PRESENT when PATH probe is ABSENT
- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; U7+; CloudAgent default; new schemas JSON; stage DEFER dirty
