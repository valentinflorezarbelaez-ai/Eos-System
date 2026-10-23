# EOS CORE SYSTEM 2.0
## The Synthesis of Rigorous Engineering, Lean Velocity & Verifiable Evidence

---

### Overview
EOS System 2.0 is an enterprise-grade AI agent governance and software engineering framework. It synthesizes the three critical lessons of contemporary AI engineering:
1. **Zero Vibe Coding** ([Victor Robles critique](https://www.youtube.com/watch?v=pO6x9GI07WA)): Eradicates fragile, unverified, halluncinated prompt-code via pure Clean/Hexagonal architecture, strict typing, and automated contracts.
2. **Lean Dual-Track Execution** ([HolaMundo SDD critique](https://www.youtube.com/watch?v=5JjuF1zpNbI)): Eradicates bureaucratic paralysis and waterfall spec drift by routing tasks dynamically between Fast-Track (TDD loop) and Heavy-Track (formal EARS/BDD specifications).
3. **Kernel Pragmatism & Evidence** ([Linus Torvalds doctrine](https://www.youtube.com/watch?v=Z5iNYBYIZVo)): Demands clean taste in code, zero warning tolerances, autonomous FDIR healing, and cryptographic machine verification (`exit code 0` + SHA-256 signatures).

---

### Project Structure
```text
Eos-System-1/
├── CONSTITUTION.md                     # The Master Constitution v2.0
├── IMPLEMENTATION_AUTHORIZATION.md     # Formal Level 2 Authorization Gate
├── package.json                        # System manifest and test scripts
├── tsconfig.json                       # Extreme TypeScript compiler configuration
├── docs/
│   ├── intake/                         # Context, background, and requirements intake
│   │   └── INTAKE-001-EOS-V2-EVOLUTION.md
│   ├── specs/                          # Formal EARS & BDD specifications
│   │   └── SPEC-001-EOS-CORE.md
│   ├── plans/                          # Clean Architecture plans & ADRs
│   │   └── PLAN-001-EOS-HEXAGONAL-ARCHITECTURE.md
│   ├── tasks/                          # Atomic Task DAG
│   │   └── TASKS-001-DAG.md
│   ├── projects/                       # System project registry
│   │   └── registry.json
│   └── evidence/                       # Machine-generated cryptographic evidence
│       └── EVD-0001-BASELINE-STRICT-PASS.json
├── src/
│   ├── index.ts                        # Main public API export
│   ├── core/
│   │   ├── domain/                     # 100% Pure Domain (0 external I/O)
│   │   │   ├── types.ts
│   │   │   └── models/
│   │   │       ├── Requirement.ts      # Strict EARS syntax validator
│   │   │       ├── EvidenceRecord.ts   # Epistemic evidence entity
│   │   │       └── OntologyGraph.ts    # Graph entity with orphan detection
│   │   └── application/                # Application orchestration
│   │       └── DualTrackOrchestrator.ts# Fast vs Heavy Track risk router
│   └── sentinel/                       # Monitoring & Recovery (FDIR)
│       ├── EOSSentinelDaemon.ts        # SHA-256 control plane integrity
│       └── EOSFDIROntology.ts          # Clinical graph orphan link healing
└── scripts/
    └── verify-strict.ps1               # Automated machine verification runner
```

---

### Strict Verification
To execute the automated verification suite, run:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/verify-strict.ps1
```
Or via npm:
```bash
npm run verify:strict
```
All runs enforce 100% pass rates, compile clean, and update the cryptographic ledger in [`docs/evidence/`](docs/evidence/).
