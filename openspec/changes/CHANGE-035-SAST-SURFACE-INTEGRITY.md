# OPENSPEC CHANGE DELTA: SOURCE-CONTROLLED SAST SURFACE & DETERMINISTIC REPO IDENTITY (CHANGE-035)

- **Status**: APPLIED_AND_VERIFIED
- **Authorization Level**: LEVEL_3_PRODUCTION_AUTHORIZED
- **Impacted Specifications**: `SPEC-019-UNIVERSAL-POLYGLOT-ADAPTER.md`, `SPEC-001-CONSTITUTION.md` (Law VI: Zero Plaintext Secrets)
- **Owner Squad**: `user:valentin-florez-arbelaez`

## 1. Problem (Evidence-Driven)

The audit surface of the platform was defined by the checkout directory, not by the repository:

1. `EosUniversalProjectAdapter` derived the project identity from `path.basename()` (with a hardcoded
   `path0`/`tmp*` fallback to `Eos-System`), so the same commit audited from `/workspace`, `/tmp/...`
   or any CI runner produced different identities and different Merkle receipts.
2. `scanDir()` emitted paths relative to the *process working directory* while resolving artifacts
   against the *audited repository*, so nested descriptors (`deploy/Dockerfile`) were unreachable for
   out-of-tree targets, and directory entries were counted as "source files".
3. Repository-wide secret scanners (`eosTurboEngine`, `scripts/verify-cicd-pipeline.mjs`) walked the
   whole filesystem, including git-ignored local tool state (`.cline-home/` agent transcripts, `.env`
   files, caches). Any developer or agent-enabled runner produced phantom `STAGE 1 FAIL` violations,
   turning the CI/CD gate red for reasons unrelated to the commit.

## 2. Change

- **Identity determinism**: manifests are now the single source of identity
  (`catalog-info.yaml` → `package.json` → `go.mod` → `Cargo.toml` → `pyproject.toml` → `pubspec.yaml`
  → `pom.xml`/`build.gradle` → checkout directory name).
- **Weighted polyglot fingerprint**: primary language is ranked by source mass (manifest baseline +
  one unit per source file) with a deterministic tie-breaker, instead of manifest probe order.
- **Path anchoring + file-only counting**: scan paths are anchored to the audited root and only
  regular files are enumerated, so `totalSourceFiles` is truthful and nested artifacts resolve.
- **Shift-left toolchain detection**: `linter` is now part of the `PolyglotFingerprint` contract.
- **Source-controlled SAST surface**: `eosTurboEngine.collectSourceFiles()` and the Stage 1 gate of
  `scripts/verify-cicd-pipeline.mjs` enumerate `git ls-files --cached --others --exclude-standard`,
  falling back to the bounded filesystem walk for non-Git targets.
- **Repository hygiene**: `.gitignore` now protects `.env*` (allowing `.env.example`) and local tool
  state/caches.

## 3. Impact

- `EOS` self-audit: `86/100 TIER_2_PRODUCTION` (false-positive secret finding from local state) →
  `100/100 TIER_1_SOVEREIGN`.
- CI/CD gate: `npm test` 7/7 stages green from a clean clone *and* from an agent-enabled workspace.
- Zero external runtime dependencies preserved (`dependencies: {}`); `git` is consumed as a system
  tool with a graceful fallback.

## 4. Verification Evidence

- `test/eosUniversalProjectAdapter.test.mjs` — Suite 4 (identity & path integrity, including a real
  `git init` fixture proving ignored files are never secret-scanned) and Suite 5 (toolchain detection).
- `test/eosTurbo.test.mjs` — "excludes git-ignored local state from the SAST surface".
- Full suite: `node --test test/*.test.mjs` → 396 tests, 0 failures.
- Sovereign gate: `npm test` → 7/7 stages passed, deployment authorized.
