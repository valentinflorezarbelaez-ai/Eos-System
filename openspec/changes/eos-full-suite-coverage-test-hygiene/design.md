# Design — Full-Suite Coverage & Test Hygiene

Ponytail ladder: Tier 1/2 only (one boolean option on an existing pure function, one CLI flag). No new modules, dependencies, or schemas.

- `--full` is consumed by the runner and not forwarded to `node --test`.
- Full discovery is a strict superset: `full \ SLIM_SUITE_EXCLUDES === slim` (TR-07), so slim behavior cannot drift.
- CI keeps `npm test` (contract-required) and adds `npm run test:full` in the same job; measured cost ≈ 14 s for 320 files / 4200 tests.
- Test isolation prefers the smallest seam: override `ExecutiveDossierEngine#reportsDir` with a temp dir; snapshot/restore the single file the MCP audit phase seals (a temp `baseDir` would require copying registrations and auditors).
