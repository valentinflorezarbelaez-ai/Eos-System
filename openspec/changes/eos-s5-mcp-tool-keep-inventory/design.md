# Design — S5 MCP/tool KEEP inventory

## Approach

1. Rank KEEP vs CANDIDATE from `EOS_MCP_TOOL_CATALOG.json` crossed with `EOS_MCP_DEAD_OR_ORPHAN_REGISTER.json` (22 simulation + 1 legacy).
2. Docs-only inventory under `docs/releases/`; no catalog mutation.
3. New lock module `mcp-tool-keep-lock.js` (do not overload P5 count lock); wire verify:strict 3g14.
4. TDD `test:s5` green on real doc; fail-closed on missing/stripped fixtures.

## Risks

Low — inventory + lock only. Accidental prune prevented by NON-CLAIM + FORBIDDEN language + lock sections.

## AT_CEILING

No new `docs/schemas/**/*.json`.
