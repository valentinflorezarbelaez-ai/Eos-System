# OPENSPEC CHANGE DELTA: ENGINEERING INTEGRITY GATE (CHANGE-040)

- **Status**: APPLIED_AND_VERIFIED
- **Authorization Level**: LEVEL_3_PRODUCTION_AUTHORIZED
- **Impacted Specifications**: `SPEC-001-CONSTITUTION.md` (Law I: Zero Vibe Coding, Law VI: Zero Plaintext Secrets)
- **Owner Squad**: `user:valentin-florez-arbelaez`

## 1. Rationale

The platform already gates security, architecture, SBOM, tests and performance. What it did **not**
gate was the truthfulness of its own governance surface. A manual audit of this repository found:

1. **Duplicate governance identities**: `SPEC-030`, `SPEC-031`, `SPEC-040` and `CHANGE-023`,
   `CHANGE-024`, `CHANGE-033` were each declared by **two different documents**, so
   "Zero Vibe Coding" traceability could resolve to the wrong requirement set.
2. **Documentation drift**: `README.md` advertised `v18.0` while `package.json` shipped `47.0.0`.
3. **Unverified contracts**: nothing proved that the 112 MCP tools advertised in `tools/list` were
   actually dispatchable (a class of bug already observed in the CLI, where `fp.linter` was printed
   but absent from the `PolyglotFingerprint` contract).
4. **God-files with no ratchet**: `eosMcpServer.ts` (3.2k lines), `bin/eos.mjs` (2.6k) and
   `js/eos.js` (4.2k) could grow unbounded silently.

Google/Meta enforce this class of invariant in CI (OWNERS/API-lint/doc-consistency checks), not in
reviewer memory.

## 2. Change

- **New Layer-0 module** `src/core/eosEngineeringIntegrityGate.ts`:
  - `inspectGovernance()` — unique `SPEC-NNN`/`CHANGE-NNN`, EARS heading present (specs only,
    `SPEC-001` constitution exempt), BDD/Gherkin reported as warning.
  - `inspectDocVersion()` — README headline must advertise the `package.json` major version.
  - `inspectMcpContract()` — bidirectional symmetry between advertised tools and `case` handlers.
  - `inspectFileSizes()` — frozen god-file ratchet (`DEFAULT_FILE_SIZE_BUDGETS` + 1200-line default).
  - `MAX_REQUIREMENT_ID_COLLISIONS = 26` — cross-spec FR/BDD collisions are frozen debt; the count
    may never grow (new collisions fail the gate).
  - `EosEngineeringIntegrityGate.inspect()` — aggregated report + SHA-256 Merkle receipt.
- **New gate script** `scripts/verify-engineering-integrity.mjs` (fail-closed, `--json` support).
- **Pipeline**: wired as **Stage 3.7/7**.
- **DX**: `npm run verify:integrity`, `npm run test:integrity`.

## 3. Remediation Performed (not just detection)

| Collision | Resolution |
|---|---|
| `SPEC-030` × 2 | Big-Tech-Tier-1 spec → **SPEC-042** (+ its CHANGE → **CHANGE-037**) |
| `SPEC-031` × 2 | Tier-Zero spec → **SPEC-043** (+ its CHANGE → **CHANGE-038**) |
| `SPEC-040` × 2 | 21-Step Loop spec → **SPEC-044** (+ its CHANGE → **CHANGE-039**) |
| README `v18.0` | → `v47.0` (matches shipped `47.0.0`) |

All cross-references updated: test headers, `src/core/eosSovereignLoop.ts`, plans/tasks/intake
documents and `IMPLEMENTATION_AUTHORIZATION.md`.

## 4. Verification Evidence

- `test/eosEngineeringIntegrityGate.test.mjs` — 9 tests: duplicate-ID detection, EARS/EARS-exemption,
  FR/BDD collision counting, doc-version drift + alignment, MCP asymmetry both directions, size
  ratchet, and a live-repository assertion (0 violations).
- `node scripts/verify-engineering-integrity.mjs` → 0 violations, 2 frozen-debt warnings,
  83 governance documents audited, 112/112 MCP tools symmetric.
- `npm test` → stages 1, 2, 3, 3.5, 3.7, 4, 4.5, 5, 6, 7 passed.
