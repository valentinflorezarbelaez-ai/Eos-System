# Contributing to Eos-

> **Eos- is a governed system.** All contributions must respect the architectural layers, governance barriers, and test coverage requirements. This guide explains the process.

## Quick Start

1. **Pick an issue** or propose a feature (file an issue first)
2. **Create a branch:** `git checkout -b feature/your-feature-name`
3. **Make changes** following this guide
4. **Write tests** (see Test Coverage section)
5. **Verify locally:** `npm run verify:strict` + `npm test`
6. **Open a PR** with a clear description
7. **Address feedback** + get approval
8. **Merge** using squash or rebase (see Commit Strategy)

## Code Organization

See `docs/ARCHITECTURE.md` for the complete system design. Key directories:

- **`src/`** — Mission OS core (auditable, zero side-effects)
  - `authority/` — Ledger, integrity manifests, snapshots
  - `governance/` — FSM, barriers, transition enforcement
  - `mcp/` — MCP server, tool dispatch, evidence custody
  - `mission-runtime/` — Mission lifecycle, orchestration
  - `utilities/` — Common utilities, tracing

- **`tests/`** — Test suite (Node.js native)
  - `unit/` — Isolated component tests
  - `integration/` — Cross-component flows
  - `e2e/` — Full mission chains
  - `security/` — Bypass battery, red team
  - `fixtures/` — Shared test data

- **`scripts/`** — Operational scripts
  - `ci/` — CI-only checks (contract, gameday)
  - `setup/` — Initialization (git hooks, env)
  - `engine/` — Autonomous engines (audit, strategies, etc.)

- **`bin/`** — CLI entry points
  - `eos.js` — Main mission OS CLI
  - `eos-sentinel.js` — FDIR daemon
  - `eos-orchestrator.js` — Orchestration control plane
  - `eos-hud.js` — Status display
  - `eos-top.js` — Process monitor
  - `eos-doctor.js` — System diagnostics

## Governance Layers

Contribution rules depend on which layer you're modifying:

### 🔴 **Foundation Layer** (inviolable)
**Files:** `src/authority/`, `src/governance/fsm.js`, constitutional barriers

**What requires change?** Authority Truth Source, ledger semantics, constitutional rules

**Review requirement:** 2 approvals (governance + authority owner)

**Test coverage:** 100% (mutations must kill all bypass tests)

**Side effects:** NONE — pure logic only

**Process:**
1. Write ADR explaining the change (see `docs/architecture/adrs/`)
2. Implement with full test coverage + mutation tests
3. Submit for peer review
4. Get 2 ADR approvals before merge

### 🟡 **Core Layer** (mission-critical)
**Files:** `src/mission-runtime/`, `src/mcp/`, mission lifecycle, governance enforcement

**What requires change?** Mission execution, MCP bridge, data flow

**Review requirement:** 1 code review ("LGTM")

**Test coverage:** ≥90% (critical paths fully covered)

**Side effects:** Strictly managed (lazy init, no global state)

**Process:**
1. File an issue describing the change
2. Implement with comprehensive tests
3. Submit PR with clear rationale
4. Address review feedback
5. Merge when approved

### 🟢 **Integration Layer** (extensible)
**Files:** `bin/`, `scripts/`, satellite projects, skills, tools

**What requires change?** Operational tools, integrations, features

**Review requirement:** Standard PR review (1 approval)

**Test coverage:** ≥80% (flexibility allowed)

**Side effects:** Allowed (logging, state reads)

**Process:**
1. File an issue or discussion
2. Implement with tests
3. Submit PR
4. Merge when approved

## Code Style

Eos- follows Node.js + ES2022 conventions. Use `.eslintrc.json` and `.prettierrc.json`:

```bash
# Check style
npm run lint

# Auto-fix
npm run lint -- --fix

# Format
npm run format
```

### Naming Conventions

- **Classes:** PascalCase (`MissionRuntime`, `TransitionEnforcer`)
- **Functions:** camelCase (`createMission`, `validateBarrier`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_EVIDENCE_SIZE`, `CANONICAL_TOOLS`)
- **Private methods:** Prefix with `_` (`_loadSnapshot`, `_validateNonce`)
- **Files:** kebab-case for exports, `.test.js` for tests

### Documentation

**Every exported function must have JSDoc:**

```javascript
/**
 * Validates governance barriers before state transition.
 *
 * @param {MissionState} mission - Current mission state
 * @param {string} targetState - Desired FSM state
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 *   Resolves with {allowed: true} or {allowed: false, reason: '...'}
 * @throws {MissionNotFoundError} If mission does not exist
 *
 * @example
 * const result = await enforcer.validate(mission, 'PLANNING');
 * if (!result.allowed) console.log('Barrier violation:', result.reason);
 */
async function validate(mission, targetState) {
  // ...
}
```

## Test Coverage

### Writing Tests

Use Node.js native `test()` + `assert()` (no external test framework required):

```javascript
// tests/unit/authority-snapshot.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import { AuthoritySnapshot } from '../../src/authority/snapshot.js';

test('AuthoritySnapshot', async (t) => {
  await t.test('creates valid snapshot', async () => {
    const snap = new AuthoritySnapshot({ mission_id: 'TASK-001', state: 'PLANNING' });
    assert.strictEqual(snap.state, 'PLANNING');
    assert(snap.hash); // should have cryptographic hash
  });

  await t.test('detects tampering', async () => {
    const snap = new AuthoritySnapshot({ mission_id: 'TASK-001' });
    const original = snap.hash;
    snap.state = 'HACKED';  // tamper
    assert.notStrictEqual(snap.hash, original);
  });
});
```

### Coverage Requirements

- **Foundation Layer:** 100% (every line, every branch)
- **Core Layer:** ≥90% (critical paths fully exercised)
- **Integration Layer:** ≥80% (good coverage preferred)

**Check coverage:**
```bash
npm run test:coverage
```

### Mutation Testing

Critical paths are mutation-tested to ensure tests actually catch bugs:

```bash
# For Foundation/Core layers: run mutations
npm run audit:mutation
```

If adding a new barrier or foundational rule, include a mutation test case:

```javascript
test('bypass: removing barrier allows invalid state', async () => {
  // This test SHOULD fail if you remove the barrier check.
  // If it passes even after removing the barrier, the test is weak.
  const mission = { state: 'VISION_INTAKE', outputs: [] };
  const result = await barrier.check(mission, 'PLANNING');
  assert.strictEqual(result.allowed, false); // should deny
});
```

## Commit Strategy

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

Body (optional): Detailed explanation

Footer (optional): Closes #123
```

**Types:**
- `feat` — New feature (integration layer)
- `fix` — Bug fix (core layer)
- `refactor` — Code reorganization (core layer)
- `test` — Test additions or fixes
- `docs` — Documentation
- `chore` — Build, CI, dependencies
- `security` — Security vulnerability (always high priority)

**Examples:**
```
feat(mcp): add tool result caching
fix(authority): prevent nonce replay in mission transitions
refactor(governance): simplify barrier DSL
docs(architecture): update FSM diagram
security(evidence): validate path traversal in evidence IDs
```

### Squash vs. Rebase

- **Prefer squash:** Feature branches → 1 commit to main
- **Use rebase:** Cherry-picking or conflict resolution
- **Avoid merge commits:** Keep history linear

## Pull Request Process

### Before Opening

1. **Verify locally:**
   ```bash
   npm run lint          # ESLint
   npm test              # Full test suite
   npm run verify:strict # Governance checks (471 checks)
   ```

2. **Check your changes don't:**
   - Introduce external dependencies (src/ must stay dependency-free)
   - Add hardcoded paths (use relative paths or environment variables)
   - Create side effects at module load time
   - Duplicate existing utilities

3. **Write a clear PR description** (see template below)

### PR Description Template

```markdown
## What this does

Brief 1-2 sentence summary.

## Why

What problem does this solve? Why now?

## Changes

- Item 1
- Item 2
- Item 3

## Testing

How did you test this? (unit tests, manual verification, etc.)

## Checklist

- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] Coverage maintained (≥required threshold)
- [ ] Docs updated (ADR, README, ARCHITECTURE if needed)
- [ ] Commit messages follow Conventional Commits
- [ ] No new external dependencies

## Related

Closes #123 (if applicable)
```

### Review Process

1. **CI/CD checks must pass:**
   - Linting (`.eslintrc.json`)
   - All tests pass
   - Coverage meets threshold
   - `npm run verify:strict` passes

2. **Code review:**
   - Foundation layer: 2 approvals
   - Core layer: 1 approval
   - Integration layer: 1 approval

3. **Approval means:**
   - Code is correct and solves the problem
   - Follows code style and conventions
   - Test coverage is adequate
   - No security issues
   - Aligns with architecture

4. **Merge:** Squash to main (1 commit per feature)

## Running Tests Locally

### Full Suite
```bash
npm test                    # ~3 seconds, 772 tests
npm run test:coverage       # With coverage report
```

### Specific Test
```bash
node --test tests/unit/authority-snapshot.test.js
```

### Test Categories
```bash
npm run test:unit           # Fast unit tests only
npm run test:integration    # Cross-component tests
npm run test:e2e            # Full mission chains
npm run test:security       # Bypass battery + red team
```

## Reporting Issues

### Security Issues

**Do NOT file public issues for security vulnerabilities.** Email `security@eos-system.dev` (see `SECURITY.md`).

### Bug Reports

Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, OS, etc.)
- Relevant logs/traces
- Related issues/PRs

### Feature Requests

Explain:
- Use case / JTBD
- Why this feature is needed
- Proposed solution (or alternatives)
- Affected layers (Foundation/Core/Integration)

## Questions?

- **Architecture:** See `docs/ARCHITECTURE.md`
- **Decisions:** Check `docs/architecture/adrs/`
- **Setup:** See `docs/guides/SETUP.md`
- **API:** See `docs/api/`

---

**Thank you for contributing!** 🙏
