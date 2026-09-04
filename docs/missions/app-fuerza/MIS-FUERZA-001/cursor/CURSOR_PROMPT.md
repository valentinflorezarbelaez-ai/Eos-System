# EOS MISSION PACKAGE: MIS-FUERZA-001
**Contract ID:** `CON-FUERZA-001`  
**Authority Level:** `LEVEL_2` (Read-Only / Bounded Local Execution)  
**Budget Cap:** `$0.15` | **Max Tokens:** `40.000`  
**Target Project:** `PRJ-APP-FUERZA` (`C:/Users/valen/Documents/APP fuerza`)  

---

## 0. Roles (do not invert)
- **Human Director:** vision, instructions, priorities, and HITL approvals (Tony Stark / decide).
- **EOS:** understand, analyze, recommend, advise, propose, and execute inside that direction (Jarvis / orchestrate).
- **Subagents/skills:** specialists with clean context — not one god-agent improvising the whole project.
- EOS does not replace the Director. If vision is missing or risk is high, stop and ask.

---

## 0.5 Global knowledge (pinned — not constitution)
*Positive operational theses always on. Company handbook still wins on stack/process form.*

- (none pinned)

SDD reminder: proposal → (specs ∥ design) → tasks → apply → verify → archive. Missing dependency → STOP. Specs before code. Evidence before VERIFIED.

---

## 1. Human Direction & Objective
- **Goal:** Eliminate 5 React 19 setState-in-effect cascading render errors and achieve 0 ESLint warnings on atp-strength-frontend
- **Business Context:** ATP Strength (App Fuerza) production hygiene refactor to ensure maximum performance and clean lifecycle compliance in React 19 / Next.js 16
- **Success Criteria:**
  - [ ] npm --prefix atp-strength-frontend run lint exits with code 0 (0 errors, 0 warnings)
  - [ ] npm --prefix atp-strength-frontend run build compiles with 0 errors via Turbopack
  - [ ] Preserve 100% backward compatibility of localStorage state hydration
  - [ ] Zero mutation to backend or database schemas

---

## 2. Scope & Security Invariants
- **Included Scope:** `atp-strength-frontend/src/app/page.tsx`
- **Protected Surfaces (Strict $\Delta = 0$):**
  - `atp-strength-backend/**`
  - `render.yaml`
  - `package.json`
- **Authority Constraints:**
  - ⚠️ No external network egress without explicit P2/P3 gate receipt
  - ⚠️ External target mutation blocked (Δ = 0)
  - ⚠️ No secret leakage in logs or prompts

---

## 3. Context Files by Reference & Content Hash
*Files are referenced by relative path and SHA-256 hash to optimize context economy:*

| Relative Path | Content SHA-256 Hash | Purpose / Notes |
|---|---|---|
| `docs/specs/app-fuerza/001-react19-hygiene/spec.md` | `CALCULATED_ON_DEMAND` | EARS specification & acceptance criteria |
| `docs/specs/app-fuerza/001-react19-hygiene/plan.md` | `CALCULATED_ON_DEMAND` | Architecture plan & ADRs |
| `docs/specs/app-fuerza/001-react19-hygiene/tasks.md` | `CALCULATED_ON_DEMAND` | Task DAG |

---

## 4. Assigned Roles & Task Breakdown
### Task 1: `T1` — Move Date.now() timestamp out of pure render
- **Assigned Role:** `CORE_ENGINEER`
- **Objective:** Move Date.now() timestamp out of pure render
- **Status:** `READY_FOR_EXECUTION`
- **Required Outputs:** `Code changes, Test passes`

### Task 2: `T2` — Refactor localStorage state hydration to lazy useState initializers
- **Assigned Role:** `CORE_ENGINEER`
- **Objective:** Refactor localStorage state hydration to lazy useState initializers
- **Status:** `READY_FOR_EXECUTION`
- **Required Outputs:** `Code changes, Test passes`

### Task 3: `T3` — Encapsulate fetchMaxes and fetchHistory with active cancellation flags
- **Assigned Role:** `CORE_ENGINEER`
- **Objective:** Encapsulate fetchMaxes and fetchHistory with active cancellation flags
- **Status:** `READY_FOR_EXECUTION`
- **Required Outputs:** `Code changes, Test passes`

### Task 4: `T4` — Prune unused NEUROMUSCULAR_PHASES and verify 0 errors on npm run lint
- **Assigned Role:** `EVIDENCE_AUDITOR`
- **Objective:** Prune unused NEUROMUSCULAR_PHASES and verify 0 errors on npm run lint
- **Status:** `READY_FOR_EXECUTION`
- **Required Outputs:** `Code changes, Test passes`


---

## 5. Permitted Tools & Dispatcher Policy
- **Allowed Tools:** `read_file, grep_search, list_dir`
- **Prohibited Effects:** Live external API calls, unstaged credentials, mutations outside approved worktrees.

---

## 6. Definition of Done & Evidence Requirements
A task is not done until all of the following are true:
1. **TDD:** a failing test existed first (RED), then minimal code (GREEN).
2. **Deterministic command output:** stdout/stderr with exit code 0 (or a justified non-zero).
3. **Automated tests:** `node --test` or the project's equivalent, 100% of the scoped suite.
4. **Epistemic honesty:** never label MEASURED, VERIFIED, or PRODUCTION READY without that command output.
5. **Scope:** diffs only under included paths; protected surfaces stay Δ = 0.
6. **Proof:** SHA-256 of changed artifacts listed in the return package.

---

## 7. Return Instructions for Cursor Operator
When returning completed work to EOS:
1. Report each task as `VERIFIED` or `BLOCKED` with explicit reasoning.
2. Provide unified diffs for modified files.
3. Provide raw test output logs.
4. Write a return package JSON and ingest it:
   `eos mission submit MIS-FUERZA-001 --file <return-pkg.json>`
5. Only then run `eos mission report MIS-FUERZA-001`.

---

## 8. Stop conditions (do not improvise)
- Missing permission, HITL, or a destructive/external write.
- Temptation to invent metrics, clients, or production readiness.
- Work outside the goal or included paths — record it, do not absorb it.
- Adding engines, agents, or frameworks "for power" without a spec.

---

## 9. Lessons from prior missions (versioned — not constitution)
- (none yet — this run will append one on close)
