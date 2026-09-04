# EOS Git Canonicalization & Tracking Plan
**Document ID:** GIT-PLAN-001  
**Classification:** RELEASE_ENGINEERING  

---

## 1. Current State vs Canonical Boundary

Over 100 essential files are currently untracked in Git. A fresh `git clone` will fail verification because schemas, specs, and agent configurations are absent from Git history.

### Required Tracking Matrix

| Directory / File | Current Status | Target Tracking Status | Rationale |
|---|---|---|---|
| `.agents/` | Untracked | **TRACKED** | Core agent skills, rules, and hook definitions |
| `.cursor/` | Untracked | **TRACKED** (mcp-status ignored) | Cursor IDE MDC rules and base MCP config |
| `.windsurf/` | Untracked | **TRACKED** | Windsurf IDE rules and workflows |
| `docs/specs/` | Partially Untracked | **TRACKED** | Canonical Phase 3 & 4 specifications |
| `docs/schemas/` | Partially Untracked | **TRACKED** | Strict JSON Schemas required for contract validation |
| `docs/intelligence/` | Partially Untracked | **TRACKED** | Global knowledge base and digests |
| `tests/fixtures/` | Partially Untracked | **TRACKED** | Essential test fixtures |
| `.missions/` | Untracked | **IGNORED** (`.gitignore`) | Ephemeral local mission runtime output |
| `.eos/` | Untracked | **IGNORED** (`.gitignore`) | Ephemeral local runtime cache & test scratch |
| `docs/evidence/raw_telemetry/` | Tracked | **IGNORED** | Machine-local telemetry output |

---

## 2. Updated `.gitignore` Specification

```gitignore
# Node & Dependencies
node_modules/
npm-debug.log*

# OS & Temp
.DS_Store
Thumbs.db
*.tmp
*.log

# EOS Local Runtime State (Ephemeral)
.missions/
.eos/
.worktrees/
worktrees/
docs/evidence/raw_telemetry/active_tunnel.json

# IDE Local Ephemeral Status
.cursor/mcp-status.json
.cursor/MCP_RELOAD_NOTE.txt

# Lab Ephemeral DBs
EOS-Lab/**/test_concurrency.db
```
