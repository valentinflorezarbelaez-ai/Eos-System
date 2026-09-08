---
description: Enforce mandatory steps from openspec/config.yaml when creating tasks.md artifacts and ensure agent executes all automated and verification steps
alwaysApply: true
---

# OpenSpec Tasks: Mandatory Steps & Self-Execution Standards

When creating or updating `tasks.md` artifacts in OpenSpec changes, agents must strictly follow this protocol.

## 1. Ground Truth Alignment

**BEFORE** creating or updating any `tasks.md` file, you MUST consult `openspec/config.yaml` and `docs/base-standards.md` to understand:
- Branch naming conventions and task sequencing
- Strict TDD requirements (RED → GREEN → TRIANGULATE → REFACTOR)
- Evidence capture paths and epistemic validation requirements
- L0 purity constraints (`DEPENDENCY_POLICY_L0.md`)

## 2. Mandatory Task Sequencing

All implementation task DAGs (`tasks.md`) MUST include these steps in sequential order:

### Step 0: Setup Feature Branch (MANDATORY FIRST STEP)
- **Location**: Must be Step 0.
- **Naming**: `feature/[ticket-id]` or `feature/[change-name]`.
- **Action**: Create and switch to isolated worktree or branch before modifying code.

### Mandatory Quality Steps:
- **Step N**: Review and Update Existing Unit Tests (TDD Regression Baseline)
- **Step N+1**: Run Unit Tests and Verify Invariants (MANDATORY - AGENT MUST EXECUTE)
- **Step N+2**: Endpoint / API Contract Verification with curl (MANDATORY - AGENT MUST EXECUTE)
- **Step N+3**: UI & E2E Validation via `browser-qa` / DevTools MCP (MANDATORY if UI affected)
- **Step N+4**: Update Technical Documentation and Spec Deltas (MANDATORY)

## 3. Autonomous Execution: Agent Must Execute (Zero User Delegation)

> [!CAUTION]
> **CRITICAL LAW**: The coding agent MUST execute all tests, linters, curls, and verification commands itself. **NEVER delegate testing to the user** (e.g. "please run curl", "open your browser and test this"). Delegating basic execution to the human is an operational failure.

### Step N+1: Run Unit Tests & Invariant Verification
1. **Prepare Environment**: Verify clean working tree and service dependencies.
2. **Execute Targeted Tests**: Run isolated test suites for affected modules (`node --test <file>`).
3. **Execute Full Verification**: Run project verification (`npm run verify` / `npm run verify:strict`).
4. **Produce Verification Artifact**: Capture command logs and exit codes in `docs/evidence/` or `specs/<change>/reports/`.
5. **Mark Task Complete**: Only mark complete `[x]` after verified exit code 0.

### Step N+2: Endpoint & Protocol Testing with curl
1. **Prepare Server**: Ensure backend service or mock harness is running.
2. **Test Endpoints**:
   - `GET`: Validate status codes (200, 404) and JSON payload schemas.
   - `POST`: Validate resource creation (201), then cleanup/restore state.
   - `PUT/PATCH`: Validate update and idempotent behavior, then restore state.
   - `DELETE`: Validate deletion (200, 204), then restore state.
   - `Error cases`: Validate input rejection (400, 422) with expected error envelope.
3. **Database & State Hygiene**: Restore any mutated state to pre-test baseline.
4. **Capture Evidence**: Log curl commands and HTTP responses in the verification report.

### Step N+3: E2E Browser Validation (UI Changes)
1. **Tooling**: Use `browser_subagent` or `chrome-devtools-mcp` tools.
2. **Execution**: Navigate to routes, simulate user clicks, fill forms, verify DOM states.
3. **Visual & Console Checks**: Verify no uncaught console errors, broken layouts, or accessibility violations.

## 4. Pre-Completion Checklist

Before marking any OpenSpec change complete or moving to `/verify` / `/archive`:
- [ ] Feature branch was created and work was isolated.
- [ ] 100% of unit and integration tests passed via autonomous agent execution.
- [ ] Manual endpoint tests (curl) executed by the agent with clean state cleanup.
- [ ] E2E browser tests executed by the agent if user-facing features changed.
- [ ] Verification report generated under `docs/evidence/` or `specs/<change>/reports/`.
- [ ] Living specification artifacts updated to reflect actual implementation.
