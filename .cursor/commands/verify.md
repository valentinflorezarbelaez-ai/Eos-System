# /verify

LIDR Specboot — independent spec verification. **Not** `npm run verify` and **not** a Mission CLI command.

**Discipline:** ADR-0010 (BUILDER ≠ VERIFIER).  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.  
Workspace health remains `npm run verify` / `verify:strict`.

## Do

1. Re-run the tests named in `/apply` plus any contract tests for the change.
2. Audit TDD receipts when Strict TDD is in scope (`auditTddReceipts` / `eos mission verify --strict-tdd`). Missing RED→GREEN fails the gate.
3. Compare behavior to the OpenSpec / `docs/specs/` acceptance criteria.
4. Mark gaps `NOT VERIFIED` or `PARTIALLY VERIFIED`. Do not claim `PRODUCTION_READY`.

## Next

`/adversarial-review`
