# ROI3 I2.5 mutation and property testing 2026-09-08

Branch: cursor/roi3-i25-mutation-property
Base main tip: a212e5436761e7737befb053cdfb02abe5581734
Scope: ROI3 ONLY (no ROI4+)
Fundacion: Delta=0 untouched
PRODUCTION_READY: NO

## Goal
Raise assurance beyond unit/verify for post-fusion control-plane seams using lightweight L0 approaches. fast-check and Stryker are not in the ecosystem; dependency_policy remains L0_NODE_BUILTINS_ONLY.

## Seams selected
1. Write-barrier authorize/scope (empty path, NO_ACTIVE_SCOPE, FUNDACION_ALWAYS_DENY, allowlist, normalizeBarrierPath idempotence via PropertyBasedFalsifier).
2. Mission-loop transitions (exhaustive Cartesian adjacency, Archive sink, Act-tool gating, readonly allowlist, archive/verify gates, unknown-stage fuzz).
MCP-SSOT sync deferred this ROI (existing mcp-ssot-sync.test.js; residual risk higher on authorize + loop adjacency).

## Tests added
- tests/roi3-i25-mission-loop-properties.test.js (property / exhaustive + falsifier)
- tests/roi3-i25-write-barrier-properties.test.js (property / scope authorize)
- tests/roi3-i25-seam-mutants-a.test.js (targeted mutant kill corpus adjacency)
- tests/roi3-i25-seam-mutants-b.test.js (targeted mutant kill Fundacion + L0 docs)
Scripts: test:roi3 and audit:mutation:sample (existing mutation-audit.js runtime only).

## CI workflow harden
- assert-gha-contract.js fails on orphan workflow YAMLs not in CI_CD_CONTRACT.json
- assert-gha-contract.js rejects continue-on-error true in ci.yml
- Removed legacy eos-ci.yml (unpinned, Node 20, outside contract)
- ci.yml annotated fail-closed required checks

## Branch protection
gh unauthenticated. See ROI3_BRANCH_PROTECTION_HITL.md. Protection is NOT claimed as already on.

## Freeze follow-through
- Do not start ROI4+
- Do not merge in this change set
- Do not set PRODUCTION_READY=YES
- Do not touch Fundacion
- Leave ROI1 DEFER dirty files unstaged

## Verify
Run test:roi3, write-barrier-sandbox + mission-loop-enforcement node tests, and verify:strict.
