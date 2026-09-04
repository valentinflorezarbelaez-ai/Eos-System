---
name: git-workflow
description: Git and GitHub MCP integration for branch management, PR workflows, code review, and repository operations within EOS governance.
---

# Git Workflow Skill

Leverage Git MCP (local) and GitHub MCP (remote) for governed version control operations.

## When to Use

- Creating feature branches and PRs
- Code review workflows
- Investigating commit history and blame
- Branch management and release workflows
- Cross-repository code search

## Available Tools

### Git MCP (Local Operations)
- `git_log` — View commit history with filters
- `git_diff` — Compare branches, commits, or working tree
- `git_blame` — Attribution for specific file lines
- `git_branch` — List, create, delete branches
- `git_status` — Working tree status
- `git_show` — Inspect specific commits

### GitHub MCP (Remote Operations)
- `search_repositories` — Find repos by topic, language, stars
- `search_code` — Search code across GitHub
- `create_pull_request` — Open a PR with title, body, reviewers
- `list_issues` — Browse and filter issues
- `create_issue` — File new issues
- `get_file_contents` — Read files from remote repos
- `create_or_update_file` — Push file changes

## Workflow: Feature Branch + PR

### 1. Create Branch
```bash
git checkout -b feat/[feature-name]
```

### 2. Implement (with TDD)
Follow TDD pipeline: RED → GREEN → REFACTOR → VERIFY

### 3. Review Before PR
Use Git MCP:
- `git_diff main..HEAD` — Review all changes
- `git_log --oneline -20` — Check commit history quality

### 4. Create PR
Use GitHub MCP:
```
create_pull_request:
  title: "feat: [description]"
  body: |
    ## Changes
    - [bullet points]
    
    ## Testing
    - [ ] Unit tests pass
    - [ ] Integration tests pass
    
    ## Evidence
    - Verification status: [VERIFIED/PARTIALLY VERIFIED]
  base: main
  head: feat/[feature-name]
```

### 5. Code Review
Use Git MCP for deep investigation:
- `git_blame [file]` — Understand why code exists
- `git_log --follow [file]` — Track file evolution
- `git_diff --stat` — Scope assessment

## Workflow: Investigation

### Blame Analysis
```
1. git_blame [file] — Who wrote this and when?
2. git_show [commit] — What was the full change?
3. git_log --all --grep="[keyword]" — Related commits?
```

### Release Archaeology
```
1. git_log --since="2026-01-01" --oneline — Recent history
2. git_diff v0.2.0..v0.3.0 — What changed between releases?
3. search_code on GitHub — How do other projects handle this?
```

## Commit Message Convention

```
type(scope): description

Types: feat, fix, refactor, test, docs, chore, perf
Scope: module or area affected
```

## Governance Integration

- All commits in EOS are tracked via EVIDENCE_STREAM
- Branch names follow: `feat/`, `fix/`, `refactor/`, `release/`
- PRs require test evidence before merge
- FROZEN paths cannot be modified even via git operations
