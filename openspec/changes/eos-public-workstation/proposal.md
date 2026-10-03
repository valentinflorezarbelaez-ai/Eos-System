# Proposal — EOS public workstation

## Why

Operators need a public page that says what EOS is, who it is for, and which IDEs or agents may drive it, without claiming a hyperscale monorepo or unsupervised autonomy. The same change needs a small, testable shield outside the frozen kernel: atomic state IO and payload rejection before a value is treated as a contract. Promotion stays a human act. A failing verify job must keep blocking it.

## What

- A static site under `site/` (semantic HTML, CSS, and a small script). No framework. No npm packages.
- A multi-IDE contract on that site: original letter marks plus product names. No third-party logo files.
- `src/shield/` atomic JSON state (try/catch, `ENOENT` means empty, temp file plus rename) and a payload gate that rejects malformed objects.
- A release note that cites the existing GitHub Actions jobs. No workflow that commits, merges, or repairs production by itself.

## Routing

**SDD** (ADR-0010). The human asked for a public surface, a contract, and behavior with tests. Cite `docs/base-standards.md`. Not DIRECT.

## Authorization

- `src/core/` product kernel: not authorized. EosMemory lives in `src/core/memory.js`. The MCP schema validator lives in `src/core/runtime/mcp-schema-validator.js`. This change does not edit them.
- `Fundacion/` and `PRJ-FUNDACION`: `Δ = 0`.
- `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, `DEPENDENCY_POLICY_L0.md`: not edited.
- L0: Node built-ins only. No root dependency added.
- Autonomy remains `LEVEL_2_SUPERVISED_AUTONOMY`. No auto-merge. No HITL bypass.

## NON-goals

- No autonomous loop that commits, merges, or “fixes production” without a human.
- No `fileHandle.lock`. That method is not a Node.js `FileHandle` API.
- No `fs.existsSync` followed by read or write in the new shield.
- No third-party trademark logo files.
- No claim of Google-scale monorepo, Spanner, or superiority to Devin, Cursor, or any other product.
- No `PRODUCTION_READY` claim.
- No Performance Talent Group content on the public homepage.
- No new engine, plane, or Mission CLI wrapper.
- No kernel adoption of the shield until a human names that exact change.
