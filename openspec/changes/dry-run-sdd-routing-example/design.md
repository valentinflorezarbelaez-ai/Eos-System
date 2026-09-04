# Design — dry-run SDD routing example

## Technical approach

Plain markdown + YAML under `openspec/` and `ai-specs/`. A Node built-in helper `scripts/openspec-cli.js` may spawn a host-level `openspec` binary. No package import.

## Decisions

- Hand-scaffold `openspec/` instead of running `openspec init` in CI (L0 / clean-clone).
- Keep historical specs in `docs/specs/`.
- Slash-command docs live in `.cursor/commands/` and must mention Mission CLI remains canonical for missions.

## Risks

- Official CLI validation is `NOT VERIFIED` on clones without `openspec` on PATH. That is acceptable; folder layout is the contract.

## Rollback

Delete `openspec/changes/dry-run-sdd-routing-example/` if the example is retired. Do not delete ADR-0010.
