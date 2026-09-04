# Delta for engineering-discipline

## ADDED Requirements

### Requirement: OpenSpec runtime layout is present

The repository MUST include a conventional OpenSpec tree (`openspec/config.yaml`, `openspec/specs/`, `openspec/changes/`) whose config context references `docs/base-standards.md`, `docs/backend-standards.md`, and `ai-specs/`. The layout MUST NOT require an npm dependency in root `package.json` or any import from `src/core/`.

#### Scenario: Clone without OpenSpec CLI

- GIVEN a clean L0 clone with no `openspec` binary on PATH
- WHEN an operator inspects `openspec/` and runs Control Plane tests
- THEN the folder layout and contract tests still hold
- AND `scripts/openspec-cli.js` exits with a pointer to `docs/manuals/OPENSPEC_RUNTIME.md` instead of installing packages
