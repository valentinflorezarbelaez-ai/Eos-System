# Architectural Design — Mission BY: Autonomous EARS/BDD Spec Synthesizer & Verification Compiler Port

## 1. Domain Model

```text
┌─────────────────────────────────────────────────────────────┐
│                 GOAL & OBJECTIVE INGESTION                  │
│                                                             │
│   Goal: { goalId, title, objective, context, targetSystem,  │
│           constraints, inputs, outputs, ... }               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 EARS SYNTACTIC COMPILER                     │
│  - 4 Formal Patterns:                                       │
│    * Event-Driven:  WHEN <trigger>, THE SYSTEM SHALL <action>│
│    * State-Driven:  WHILE <state>, THE SYSTEM SHALL <action> │
│    * Error/Unwanted: IF <condition>, THEN SYSTEM SHALL <resp>│
│    * Ubiquitous:    THE SYSTEM SHALL <action>                │
│  - Ambiguity & Passive Voice Pruning                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 BDD SCENARIO GENERATOR                      │
│  - Mapping each EARS requirement to Gherkin scenarios       │
│  - Enforcing GIVEN (precondition), WHEN (action),           │
│    THEN (observable outcome), AND (invariant preserved)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            POLICY GATE & ENVELOPE VALIDATOR                 │
│  - Schema Validation: ID, Title, Non-empty text             │
│  - Secret Screening: Law VI regex detection                 │
│  - Write Barrier: FUNDACION_ALWAYS_DENY                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   RECEIPT SEALER (BY-RCPT-*)                │
│  - SHA-256 Canonical Spec Envelope Digest                   │
│  - Sequential Hash Chaining (prevReceiptHash)               │
│  - Nine-field canonical seal                                │
└─────────────────────────────────────────────────────────────┘
```

## 2. Policy Gate Invariants

1. `MALFORMED_GOAL_DENY`: Goals must have non-empty `goalId`, `title`, and `objective`.
2. `INVALID_EARS_SYNTAX_DENY`: Every generated requirement must match at least one of the 4 formal EARS regex grammars (`WHEN...THE SYSTEM SHALL...`, `WHILE...THE SYSTEM SHALL...`, `IF...THEN THE SYSTEM SHALL...`, `THE SYSTEM SHALL...`).
3. `INVALID_BDD_SYNTAX_DENY`: Every generated BDD scenario must have valid `GIVEN`, `WHEN`, and `THEN` clauses.
4. `SECRET_DETECTED_DENY`: Any goal, requirement, or scenario text containing plain secret patterns (Law VI) is rejected fail-closed.
5. `FUNDACION_ALWAYS_DENY`: Any goal target or path targeting `Documents/Fundacion` triggers immediate rejection and preserves `Fundacion Δ=0`.
