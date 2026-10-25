# TASK DAG: TASKS-008
## EOS Universal Autonomous Code Scaffolder & Interactive Live Web Lab

---

### 1. Task Dependency Graph (DAG)

```text
[TASK-008-01: Implement CodeScaffolderService]
       │
       ▼
[TASK-008-02: Integrate --scaffold into eos-cli.mjs]
       │
       ▼
[TASK-008-03: Implement Interactive Terminal Prompt & Code Tabs in Eos-System Web Portal]
       │
       ▼
[TASK-008-04: Verify Strict Invariants & Synchronize Portals]
       │
       ▼
[TASK-008-05: Deploy to Vercel Production & Browser QA Verification]
```

---

### 2. Atomic Task Breakdown

#### TASK-008-01: Implement `CodeScaffolderService.ts`
* **Layer**: Application Layer (`src/core/application/CodeScaffolderService.ts`).
* **Description**: Synthesizes pure Hexagonal TypeScript code from any instruction and intent, generating Entity, Port, UseCase, In-Memory Adapter, and Test file strings.
* **Done Criteria**: Exported from `src/index.ts`, 0 external dependencies, compiles cleanly under TypeScript strict mode.

#### TASK-008-02: Integrate `--scaffold` into `scripts/eos-cli.mjs`
* **Layer**: Infrastructure / CLI Tooling.
* **Description**: When `npm run eos -- develop "<prompt>" --scaffold` is executed, creates the generated folder, writes all files, runs TypeScript syntax check, and asserts Exit Code 0.
* **Done Criteria**: Running with `--scaffold` writes real files and exits with code 0.

#### TASK-008-03: Implement Interactive Terminal Prompt & Code Tabs in `Eos-System`
* **Layer**: Web Portal UI & Dynamic Client Engine (`C:\Users\valen\Eos-System`).
* **Description**:
  - Add prompt input bar and preset chips above the terminal in `index.html`.
  - Add artifact preview sub-tabs (Pipeline Log, EARS Spec, Domain Entity Code, Use Case Code, Test Suite).
  - Enhance `js/eos.js` to dynamically run the 21 steps on user input, generate authentic SHA-256 proofs with `crypto.subtle`, and display dynamic synthesized code.
* **Done Criteria**: Interactive input handles user prompts, displays dynamic 21-step pipeline and generated code tabs.

#### TASK-008-04: Verify Strict Invariants & Synchronize Portals
* **Layer**: Quality & Verification.
* **Description**: Execute `scripts/verify-landing.mjs` on `Eos-System` (6/6 pass) and `scripts/sync-landing-page.mjs`.
* **Done Criteria**: All verification scripts pass with Exit Code 0.

#### TASK-008-05: Deploy to Vercel Production & Browser QA Verification
* **Layer**: Deployment & Epistemic Attestation.
* **Description**: Deploy updated portal to `https://eos-system-ten.vercel.app/` with cache-busting, run Browser Subagent to type a custom instruction, verify the live terminal and code tabs, and record video/screenshots.
* **Done Criteria**: Browser subagent verifies successful run on production site with zero console errors.
