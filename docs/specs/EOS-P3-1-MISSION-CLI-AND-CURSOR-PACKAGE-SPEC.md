# EOS P3.1 Technical Specification: Mission CLI & Cursor Mission Package

**Document ID:** SPEC-P3-1-001  
**Status:** CANONICAL_IMPLEMENTATION_SPEC  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Overview and Architecture

Milestone P3.1 establishes the operational operator interface of EOS:
1. **Unified Mission CLI (`bin/eos.js`, `src/cli/mission-cli.js`)**: Operator command dispatcher managing end-to-end lifecycle.
2. **Local Mission Runtime (`src/core/runtime/mission-runtime.js`)**: Storage layout, ledger chain logging, task decomposition, and cryptographic verification under `.missions/<mission-id>/`.
3. **Cursor Mission Package Generator (`src/core/adapters/cursor-mission-package.js`)**: Compiles canonical machine JSON (`mission-package.schema.json`) and compact operator prompt (`CURSOR_PROMPT.md`) referencing context by relative paths and SHA-256 hashes.

```text
Human Director
      │
      ▼ (eos mission create --goal "..." --project "...")
┌─────────────────────────────────────────────────────────────┐
│                    EOS Mission CLI (bin/eos.js)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Mission Runtime Engine                      │
│   - UniversalTechnicalDiscoveryEngine (project-profile.json)│
│   - GovernedTechnicalSelectionEngine (plan.json / tasks/)   │
│   - CursorMissionPackageGenerator (CURSOR_PROMPT.md / JSON) │
│   - HashChainedLedger (ledger-events.jsonl)                 │
│   - ExecutiveMissionReporter (reports/EXECUTIVE_REPORT.md)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  .missions/<mission-id>/                    │
│   ├── direction.json                                        │
│   ├── project-profile.json                                  │
│   ├── mission-package.json                                  │
│   ├── tasks/ (TASK-01.json, TASK-02.json)                   │
│   ├── cursor/ (CURSOR_PROMPT.md, mission-package.json)      │
│   ├── reports/ (executive-report.json, EXECUTIVE_REPORT.md) │
│   ├── ledger/ (ledger-events.jsonl)                         │
│   └── integrity-manifest.json                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Storage Invariants

Each mission directory contains:
- `direction.json`: Raw intent, business context, budget cap, and authority level.
- `project-profile.json`: 10-domain static discovery output.
- `mission-package.json`: Canonical top-level mission envelope.
- `plan.json`: Task sequence, roles, and governance gates.
- `tasks/*.json`: Individual task contracts complying with `task-contract.schema.json`.
- `cursor/CURSOR_PROMPT.md`: Human/Agent ergonomic instructions.
- `cursor/mission-package.json`: Machine-readable package.
- `ledger/ledger-events.jsonl`: Cryptographically chained event sequence.
- `integrity-manifest.json`: Map of all mission artifact filenames to SHA-256 hashes.

---

## 3. CLI Command Matrix

| Command | Action | Output / Return |
|---|---|---|
| `eos mission create --goal "<text>" [--project <path>]` | Discovers project, initializes mission directory and ledger. | Mission ID & initial profile. |
| `eos mission inspect <mission-id>` | Queries metadata, direction, and current phase. | Formatted state summary. |
| `eos mission plan <mission-id>` | Generates atomic task contracts and plan. | Number of tasks & governance gates. |
| `eos mission package <mission-id> [--target cursor]` | Generates Cursor prompt & package with manifest hash. | Package path & SHA-256 hash. |
| `eos mission status <mission-id>` | Quick state and phase query. | Status string. |
| `eos mission report <mission-id> [--format json\|markdown]` | Generates Executive Mission Report with metric provenance. | Dual format executive report. |
| `eos mission verify <mission-id>` | Cryptographically audits ledger and manifest hashes. | `VALID` or discrepancies. |
| `eos mission pause <mission-id>` | Transitions status to `paused` and logs event. | Status update. |
| `eos mission resume <mission-id>` | Transitions status to `active` and logs event. | Status update. |
| `eos mission close <mission-id>` | Transitions status to `completed` and seals ledger. | Status update. |

---

## 4. Epistemic Status & Bounds

- **Claim Permitted**: `EOS provides a locally executable, offline mission CLI and a verified Cursor Mission Package generator for bounded, human-governed planning and handoff.`
- **Prohibitions**: Zero live cloud API connections, zero real credential access, zero external repository mutations ($\Delta = 0$).
