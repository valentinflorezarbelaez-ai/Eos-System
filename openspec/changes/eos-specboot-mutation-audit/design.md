# Design — SpecBoot S14 Mutation Testing Audit Harness

## Architecture

```text
                  SpecbootAgentRunner.runCycle
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
         PROPOSE             APPLY              VERIFY
                                                  │
                                                  ▼
                                      Evidence Receipts Checked
                                                  │
                                                  ▼
                                      Mutation Audit (S14 Gate)
                                                  │
                                                  ▼
                                     MutationTestingHarness
                                   ┌──────────────┴──────────────┐
                                   ▼                             ▼
                            Inject Mutants               Run Isolated Tests
                         (Boolean, Equality,              (Strip IPC Env:
                           Math, Logical)              NODE_TEST_CONTEXT)
                                   │                             │
                                   └──────────────┬──────────────┘
                                                  ▼
                                       Evaluate Mutation Score
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                           Mutants Survived > 0           All Mutants Killed
                                    │                           │
                                    ▼                           ▼
                        SPECBOOT_MUTATION_AUDIT_FAILED       ARCHIVE ➔ COMMIT_READY
```

## Mutator Families

| Mutator ID | Pattern | Replacement | Target Fault Class |
| :--- | :--- | :--- | :--- |
| `InvertBoolean` | `/true/g` | `'false'` | Inverted Boolean flags |
| `InvertBoolean` | `/false/g` | `'true'` | Inverted Boolean flags |
| `InvertEquality` | `/===/g` | `'!=='` | Boundary and equality inversion |
| `InvertEquality` | `/!==/g` | `'==='` | Boundary and inequality inversion |
| `MathAddition` | `/\+/g` | `'-'` | Arithmetic addition fault |
| `MathSubtraction` | `/-/g` | `'+'` | Arithmetic subtraction fault |
| `LogicalAnd` | `/&&/g` | `'\|\|'` | Compound conditional inversion |
| `LogicalOr` | `/\|\|/g` | `'&&'` | Compound conditional inversion |

## Cross-Platform Test Isolation

Node.js `node:test` sets parent runner environment variables (`NODE_TEST_CONTEXT`, `NODE_TEST_WORKER_ID`). Injected subprocesses inheriting these variables will attempt to connect to parent IPC channels, leading to silent exit-0 bypasses. `MutationTestingHarness` clones `process.env` and removes these keys, ensuring each mutation trial executes in a fresh, isolated process.
