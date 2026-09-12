# Design — Mission N

Composition reuses the existing sequential toolCalls loop (SPEC-0012/0014/0017/0018). `buildMultiNativeComposeToolCalls` emits ordered calls: `gemini_query` → `stitch_generate_screen` → `browser_qa_run`. Soft Browser QA (CWV/a11y) still delivers toolOutputs ok:true and allows applyDiff; infra throws abort later natives and skip applyDiff. Natives-only plans do not require `McpToolDispatcher`.
