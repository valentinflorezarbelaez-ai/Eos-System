# Design — Mission I

Native Gemini tools bypass MCP stdio; worker routes `gemini_query` / `gemini_structured` (or serverName `eos-gemini`) through gemini-tool-bridge → queryGemini with injectable fetchImpl. Custody: input_hash + duration_ms + status VERIFIED per tool output; existing tool_execution_hashes seal remains.
