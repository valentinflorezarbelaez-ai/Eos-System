# Proposal — Native Google Gemini AI Provider Integration (SPEC-0013)

## Motivation

Google AI Studio provides access to `gemini-3.6-flash` and `gemini-3.6-pro` models with massive context windows and low latency. To activate the full Google development stack within the EOS Control Plane, we introduce a native, pure Node.js Gemini client (`gemini-provider.js`) without adding third-party npm dependencies (Tier-2 compliance).

## Scope

1. Pure Node.js standard library client using native `fetch`.
2. Secure API key resolution from `process.env.GEMINI_API_KEY` (fail-closed if missing).
3. Structured generation, JSON mode, deterministic timeouts, and bounded buffer protection.
4. Comprehensive TDD test suite with mockable fetch and live capability verification.
5. Invariants preserved: `PRODUCTION_READY: NO`, `Fundacion Delta: 0`, `SLIM <= 145`.
