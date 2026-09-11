# Spec — gemini-tool-bridge

## Requirement: Tool discovery
The system SHALL expose tools named `gemini_query` and `gemini_structured`.

## Requirement: Bounds
Tool execution SHALL use timeout ≤ 30s and reject inputs/responses exceeding 2MiB (`PAYLOAD_OVERSIZE`).

## Requirement: Key fail-closed
WHEN GEMINI_API_KEY is missing and no apiKey is injected, execution SHALL fail with `KEY_MISSING`.

## Requirement: Custody
Successful executions SHALL attach a custody record with tool name, input_hash (SHA-256), duration_ms, and status `VERIFIED`.

## Requirement: Hermetic tests
Live network tests SHALL run only when `RUN_LIVE_GEMINI_TESTS=true`.
