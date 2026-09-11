# Design — Native Google Gemini AI Provider (SPEC-0013)

## Architecture

`src/core/providers/gemini-provider.js` resides within the Application/Infrastructure provider layer of EOS:

```text
+------------------------------------------+
| EOS Agent / Compute Worker / Evaluator   |
+--------------------+---------------------+
                     |
                     v
+------------------------------------------+
|     gemini-provider.js (queryGemini)     |
|  - reads process.env.GEMINI_API_KEY      |
|  - builds payload & generationConfig     |
|  - enforces timeoutMs & maxResponseBytes |
+--------------------+---------------------+
                     |
                     v
+------------------------------------------+
| Google Generative Language REST API      |
| (https://generativelanguage.googleapis)  |
+------------------------------------------+
```

## Security & Governance
- Law VI compliance: Never accepts hardcoded keys; reads strictly from environment or options.
- Bounded payload: Enforces max response size (default 2 MiB) to prevent memory exhaustion.
- Fail-closed: Throws `GeminiProviderError` with typed codes (`KEY_MISSING`, `API_ERROR`, `TIMEOUT`, `PAYLOAD_OVERSIZE`).
