# EOS Gemini & Antigravity Configuration

Thin IDE entrypoint for Gemini and Antigravity agents. Do **not** duplicate policy here.

Before executing tasks, read and apply:

1. [`docs/base-standards.md`](docs/base-standards.md) — standards index (SSOT pointers)
2. [`.agents/AGENTS.md`](.agents/AGENTS.md) — **canonical** agent operating protocol
3. [`CONSTITUTION.md`](CONSTITUTION.md) and [`docs/core/CONSTITUTION.md`](docs/core/CONSTITUTION.md) — supreme constitution
4. [`docs/openspec-tasks-mandatory-steps.md`](docs/openspec-tasks-mandatory-steps.md) — mandatory self-executed verification
5. [`docs/mcp/MCP_SSOT.md`](docs/mcp/MCP_SSOT.md) — MCP consumer SSOT; sync with `npm run mcp:sync`
6. [`docs/harness/SPECBOOT_CYCLE.md`](docs/harness/SPECBOOT_CYCLE.md) — SpecBoot cycle SSOT; **Antigravity-first** (no Cursor CloudAgent)

Language: professional English for code, comments, docs, and commits.
Architecture: Clean/Hexagonal boundaries; L0 purity per `DEPENDENCY_POLICY_L0.md`.
Write-barrier, autonomy, and epistemic rules live **only** in `.agents/AGENTS.md` — do not restate them in this stub.
