# OPENSPEC BASE SPECIFICATION: CLOSED-LOOP AUTONOMOUS HEALER & FDIR (SPEC-005)

## 1. Scope
Governs Failure Detection, Isolation, and Recovery (FDIR Level 4) for autonomous codebases.

## 2. Requirements (EARS)
- **EVENT-DRIVEN**: WHEN static analysis or CI/CD gate violations occur, THE SYSTEM SHALL localize the root cause directly in the AST code graph.
- **UBIQUITOUS**: THE SYSTEM SHALL synthesize non-destructive surgical patches preserving existing comments and domain invariants.
- **STATE-DRIVEN**: WHILE running in dry-run mode, THE SYSTEM SHALL simulate remediations without mutating the physical disk.
- **UBIQUITOUS**: THE SYSTEM SHALL emit an immutable cryptographic ledger entry (`docs/evidence/HEAL-XXXX.json`) for every applied remediation.
