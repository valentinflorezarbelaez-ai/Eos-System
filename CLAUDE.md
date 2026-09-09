# EOS Claude Configuration

Thin IDE entrypoint for Claude Code agents. Do **not** duplicate policy here.

Before executing tasks, read and apply:

1. [`docs/base-standards.md`](docs/base-standards.md) — standards index (SSOT pointers)
2. [`.agents/AGENTS.md`](.agents/AGENTS.md) — **canonical** agent operating protocol
3. [`CONSTITUTION.md`](CONSTITUTION.md) and [`docs/core/CONSTITUTION.md`](docs/core/CONSTITUTION.md) — supreme constitution
4. [`docs/openspec-tasks-mandatory-steps.md`](docs/openspec-tasks-mandatory-steps.md) — mandatory self-executed verification
5. [`docs/mcp/MCP_SSOT.md`](docs/mcp/MCP_SSOT.md) — MCP consumer SSOT; sync with `npm run mcp:sync`

Context Pack TPC index (Ladder 7 S2): [docs/harness/CONTEXT_PACK_TPC.md](docs/harness/CONTEXT_PACK_TPC.md) — Tool/Prompt/Context map + lifecycle policy (NON-CLAIM: index ≠ runtime orchestrator).

Language: professional English for code, comments, docs, and commits.
Architecture: Clean/Hexagonal boundaries; L0 purity per `DEPENDENCY_POLICY_L0.md`.
Write-barrier, autonomy, and epistemic rules live **only** in `.agents/AGENTS.md` — do not restate them in this stub.
