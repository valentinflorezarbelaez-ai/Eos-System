# INTAKE-014: Semantic Versioning & Automated Changelog Engine

* **Project:** EOS Core System v3.0 Evolution
* **Intake ID:** INTAKE-014-SEMANTIC-VERSIONING
* **Timestamp:** 2026-10-25T17:03:00-05:00
* **Authorizer:** Lead Systems Architect & Valentin Florez (System Owner)
* **Status:** INTAKE_COMPLETE

---

## 1. Context & Business Need
EOS System has undergone significant evolutionary leaps (from v2.0.0 through 13 discrete specifications, adding sovereign engines for Audiovisual aesthetics, Production RAG PERT estimation, Multi-Agent Arbitration, native MCP gateway, and a 100% unit test suite). However, `package.json` has remained statically pinned at `2.0.0`, no formal `CHANGELOG.md` exists, and release bumping is performed manually without mathematical Semantic Versioning validation.

To establish enterprise release discipline, EOS requires an automated Conventional Commit parser, an immutable SemVer calculator, and an automated release orchestrator that generates structured `CHANGELOG.md` notes and coordinates atomic releases via the CLI (`eos release`).

## 2. Scope of Delivery
1. Pure Domain Model `SemanticVersion.ts`:
   - SemVer 2.0.0 compliance (major, minor, patch, pre-release identifiers, build metadata).
   - Immutable bump operations (`bumpMajor()`, `bumpMinor()`, `bumpPatch()`).
   - Comparison and precedence sorting (`compare()`, `isGreaterThan()`, `isEqual()`).
2. Pure Domain Model `ConventionalCommitParser.ts`:
   - Parses standard commit messages: `type(scope)!: description`.
   - Categorizes commit types (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`).
   - Detects breaking changes (`!` suffix or `BREAKING CHANGE:` footer).
   - Suggests semantic release increment (major/minor/patch) based on commit history.
3. Application Service `ReleaseOrchestrator.ts`:
   - Parses commit log since last release tag.
   - Computes next semantic version.
   - Formats clean markdown changelog entries grouped by commit types.
   - Updates `package.json` version and writes `CHANGELOG.md`.
4. Unit Test Suites with 100% line coverage for both domain models:
   - `tests/unit/domain/SemanticVersion.test.ts`
   - `tests/unit/domain/ConventionalCommitParser.test.ts`
5. CLI Integration:
   - Add `eos release [major|minor|patch|auto] [--dry-run]` to `scripts/eos-cli.mjs`.
