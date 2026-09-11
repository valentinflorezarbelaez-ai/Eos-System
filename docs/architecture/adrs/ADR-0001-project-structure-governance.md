# ADR-0001: Project Structure & Governance Foundation

**Status:** ACCEPTED  
**Date:** 2026-09-11  
**Decision Maker:** Engineering Authority  
**Impact:** STRUCTURAL  

## Context

Eos- is a multi-copilot Engineering Operating System with:
- Autonomous mission governance (Authority Truth Source, FSM barriers)
- MCP bridge to copilot agents (Cursor, GitHub, etc.)
- Satellite projects (Luxe-Registry, Multimodal-Creative-Suite) at Phase II
- 777 test cases across 132 files
- Zero npm dependencies by design

Current state: Structure is implicit and scattered. No canonical layout. Confusion on what is "core EOS" vs "example projects" vs "agent-facing APIs".

**Problem:** New contributors cannot onboard without tribal knowledge. Audit scope is ambiguous. Satellite projects muddy the mission OS signal.

## Decision

Adopt a **layered, boundary-respecting structure** with clear ownership:

```
Eos-/                           ← monorepo root
├── .github/                    ← CI/CD, governance automation
├── docs/                       ← mission-critical documentation
│   ├── architecture/           ← ADRs, system design, diagrams
│   ├── api/                    ← MCP contract, governance APIs
│   ├── guides/                 ← setup, deployment, runbooks
│   └── standards/              ← code standards, conventions
│
├── src/                        ← CORE EOS MISSION OS (auditable, zero side-effects)
│   ├── authority/              ← Authority Truth Source, ledger
│   ├── governance/             ← FSM, barriers, TransitionEnforcer
│   ├── mcp/                    ← MCP server ↔ agent bridge
│   ├── mission-runtime/        ← Mission execution, Elevate orchestration
│   ├── utilities/              ← evidence, tracing, common
│   └── index.js                ← unified exports
│
├── bin/                        ← CLI entry points
│   ├── eos.js                  ← main CLI
│   ├── eos-sentinel.js         ← FDIR sentinel daemon
│   ├── eos-orchestrator.js     ← orchestration control plane
│   ├── eos-hud.js              ← HUD display server
│   ├── eos-top.js              ← process monitor
│   └── eos-doctor.js           ← system diagnostics
│
├── tests/                      ← canonical test suite (Node.js native)
│   ├── unit/                   ← isolated component tests
│   ├── integration/            ← cross-component flows
│   ├── e2e/                    ← full mission chains
│   ├── security/               ← bypass battery, red team
│   ├── fixtures/               ← shared test data
│   └── *.test.js               ← test files (co-located ok)
│
├── scripts/                    ← maintenance & operational scripts
│   ├── ci/                     ← CI-only checks (contract, gameday)
│   ├── setup/                  ← initialization (git hooks, db, env)
│   ├── engine/                 ← autonomous engines (strategies, audit, etc.)
│   └── verify-eos.js           ← canonical verification harness
│
├── .agents/                    ← COPILOT AGENT SPECS (do not fork)
│   ├── skills/                 ← skill definitions for agents
│   └── symlinks.json           ← Copilot symlink mappings
│
├── ai-specs/                   ← AGENT REGISTRY & CONFIGURATION (read-only index)
│   ├── agents/                 ← REGISTRY.json, TEAM_COMPOSITION.json, etc.
│   └── skills/                 ← skill metadata & lifecycle specs
│
├── EOS-MISSION-CONTROL/        ← GOVERNANCE STATE (on-disk ledger)
│   ├── ACTIVE_TOOLS.json       ← connected MCP servers & status
│   ├── TEAM_COUNCIL.json       ← active agents & authority
│   └── CANONICAL_MISSIONS.json ← mission definitions
│
├── projects/                   ← SATELLITE PROJECTS (Phase II+)
│   ├── Luxe-Registry/          ← Premium gift-list platform
│   └── Multimodal-Creative-Suite/ ← Creative production
│
├── .github/
│   ├── workflows/
│   │   ├── test.yml            ← npm test, coverage, lint
│   │   ├── verify.yml          ← npm run verify:strict
│   │   ├── ci-contract.yml     ← GHA contract + Gameday
│   │   └── release.yml         ← version bump, changelog
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
│
├── .eslintrc.json              ← linting rules (ES2022 + Node.js)
├── .prettierrc.json            ← formatting consistency
├── jest.config.js              ← test runner config (if adopting Jest)
├── tsconfig.json               ← TypeScript config (optional future)
│
├── CONTRIBUTING.md             ← contributor onboarding
├── CODEOWNERS                  ← ownership rules (GitHub auto-review)
├── SECURITY.md                 ← security policy, vulnerability reporting
├── CODE_OF_CONDUCT.md          ← anti-harassment / professionalism
├── CHANGELOG.md                ← release notes
├── LICENSE                     ← UNLICENSED (currently) or Apache 2.0
└── README.md                   ← project overview
```

### Governance Layers

#### **Foundation Layer** (inviolable)
- Authority Truth Source: ledger, integrity manifests, snapshot anchors
- FSM: transition table, state chart
- Constitutional barriers: `requiresTaskContract`, `requiresOutputs`, `requiresRemediation`
- Ledger persistence, recovery, audit trail

**Ownership:** Only via peer review + 2 ADR approvals  
**Test coverage:** 100% (mutations kill all bypass tests)  
**Side effects:** NONE

#### **Core Layer** (mission-critical)
- Mission runtime: execution, elevate orchestration
- MCP bridge: protocol translation, security validation
- Governance enforcement: transition validation, barrier checking
- Evidence custody: recording, reconciliation, immutability

**Ownership:** Via code review (1 LGTM)  
**Test coverage:** ≥90%  
**Side effects:** Strictly managed (see: MissionRuntime lazy init)

#### **Integration Layer** (extensible)
- Sentinel, Orchestrator, HUD, Doctor: operational tools
- MCP provisioning, agent team composition
- Custom skills, strategic engines
- Satellite projects (Luxe-Registry, etc.)

**Ownership:** Standard PR review  
**Test coverage:** ≥80%  
**Side effects:** Allowed (logging, state reads)

### Enforcement Rules

1. **No Vendor Foreign Code**
   - Zero npm dependencies in `src/`
   - No vendored agent installers or theme kits
   - External integrations via MCP only

2. **No Duplicate Agent Runtimes**
   - One authority: Mission OS FSM in `src/governance/`
   - One MCP bridge in `src/mcp/`
   - No embedded Gentle-AI or Engram

3. **Immutable Governance Specs**
   - `.agents/` and `ai-specs/` are read-only index layers
   - Source of truth: `src/governance/CANONICAL_TOOLS.json` (in-memory)
   - Synced to disk in `EOS-MISSION-CONTROL/` only by explicit operator action

4. **Test Locality**
   - Prefer co-located `*.test.js` files
   - Large suites (security, e2e) → `tests/` directories
   - Fixtures in `tests/fixtures/`
   - No test code in `src/`

5. **Documentation as Code**
   - ADRs are governance decisions, kept in `docs/architecture/adrs/`
   - ARCHITECTURE.md is single source of truth for runtime shape
   - API documentation synced from `src/mcp/mcp-server.js` comments
   - Runbooks in `docs/guides/`, updated on every major change

## Rationale

- **Layered structure:** Foundation is immutable, Core is carefully reviewed, Integration is flexible → allows safe evolution
- **Satellite projects separated:** Prevents confusion; each has own `package.json`, tests, governance
- **src/ as auditable core:** Everything else can be regenerated; this is the mission OS
- **Docs as first-class:** ADRs, ARCHITECTURE, guides co-evolved with code
- **scripts/ as operational:** Distinct from product code; e.g., `scripts/ci/` is CI-only
- **tests/ as peer to src/:** Not inside src/ → clean separation of concern

## Consequences

### ✅ Benefits
- **Clarity:** New contributor sees immediately: "Mission OS is in `src/`, examples in `projects/`, CI in `.github/`"
- **Auditability:** Governance decisions live in ADRs; code changes are diffs against explicit decisions
- **Scalability:** Satellite projects can evolve independently; Foundation remains stable
- **Governance:** Layers enforce review rigor matching risk (Foundation ≥2 reviews, Core ≥1, Integration standard)
- **Testing:** Test boundary is explicit; full coverage possible per layer

### ⚠️ Costs
- Initial refactor: 2–3 commits to reorganize existing files (low risk, pure moves)
- Documentation burden: ADRs must precede major decisions (manageable, worth it)
- Stricter CI/CD: More checks pre-merge (builds confidence)

## Implementation

### Phase 1 (Week 1): Directory structure
1. Move `src/` → current files (no logic changes)
2. Move `bin/` → current CLI entry points
3. Create `docs/architecture/adrs/`, `docs/guides/`, `docs/standards/`
4. Create `tests/` with unit/, integration/, e2e/, security/ subdirs
5. Move test files into `tests/`
6. Create `.github/workflows/` (empty, populated in next ADR)

### Phase 2 (Week 2): Governance specs
1. Populate `.agents/skills/` with canonical skill definitions
2. Create `ai-specs/agents/REGISTRY.json` (read-only index)
3. Populate `EOS-MISSION-CONTROL/` with current governance state
4. Write `CANONICAL_TOOLS.json` in-memory spec

### Phase 3 (Week 3): Documentation
1. Write ARCHITECTURE.md (system design, data flow, FSM chart)
2. Write CONTRIBUTING.md (PR process, code style, standards)
3. Write SECURITY.md (vulnerability report, threat model)
4. Update README.md with quick-start and links

## Related

- ADR-0002: CI/CD Governance & Test Strategy
- ADR-0003: MCP Bridge Stability & Security Hardening
- ADR-0004: Evidence Custody & Ledger Integrity
- ARCHITECTURE.md (to be written)
- CONTRIBUTING.md (to be written)

## Approval Trail

- [ ] Authority Truth Source owner: _________
- [ ] Governance owner: _________
- [ ] Integration lead: _________
