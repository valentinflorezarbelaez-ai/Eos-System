# Design — Mission L

Native builtin tools: Gemini (SPEC-0014) + Stitch (SPEC-0017). Both bypass MCP stdio. `needsMcpDispatcher` only for non-native calls. Soft infra errors from stitch bridge → STITCH_TOOL_FAILED + rollbackDiff; applyDiff never runs after tool failure.
