# Design — FlowDesk lead pipeline snapshot

## Technical approach

Extend the existing `LeadService` (Node built-in `node:sqlite`) with one method:

```ts
countLeadsByStatus(userId: string): Record<LeadStatus, number>
```

Implementation: one `GROUP BY status` query scoped by `user_id`, then fill missing statuses with `0`. Do not invent a new repository or engine.

## Decisions

- Lab target is `EOS-Lab/FlowDesk` (in-repo sandbox). Not an external write; not Fundacion.
- Tests stay on `node:test` (existing FlowDesk unit file). Prefer `node --experimental-strip-types --test` so the loop does not require a new root dependency. If strip-types cannot resolve `.ts` via `.js` specifiers, use FlowDesk's already-declared `tsx` via that satellite's lockfile — still not a root L0 change.
- TDD receipts use `src/core/sdd/tdd-evidence-receipt.js` (`createTddPhaseReceipt`). Builder receipts stay `NOT VERIFIED`.
- Mission CLI drives organic gate: `--spawn-sdd` without `--explicit-sdd` must fail-close; with `--explicit-sdd` it proceeds.
- OpenSpec CLI (`scripts/openspec-cli.js`) is exercised; missing binary is recorded as `BLOCKED`.

## Risks

- FlowDesk satellite `node_modules` may be absent on the CI VM. Fallback command must be recorded honestly.
- Official OpenSpec CLI is not part of L0. Do not fake a version check.

## Rollback

Delete `countLeadsByStatus` and its tests; leave `openspec/changes/flowdesk-lead-pipeline-snapshot/` as a historical change folder. Do not revert ADR-0010 or tranche C modules.
