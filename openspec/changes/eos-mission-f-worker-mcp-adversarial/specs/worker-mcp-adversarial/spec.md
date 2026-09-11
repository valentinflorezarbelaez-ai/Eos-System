# Spec — worker-mcp-adversarial

## Requirements

### Requirement: Fail-closed capability tokens
The worker SHALL reject `@needs` tokens that are non-identifiers or pollution/path-like before calling the MCP router.

### Requirement: Path traversal rejection
Task markdown containing `..`, absolute paths, or percent-encoded path separators SHALL raise `PATH_TRAVERSAL_REJECTED`.

### Requirement: Pre-disk DEFICIENT gate
When `enforceMcp` is true and the envelope status is `DEFICIENT`, `executeComputeRun` SHALL return without invoking `applyDiff`.

### Requirement: Custody envelope integrity
`sealComputeRunCustody` SHALL fail closed (`MCP_ENVELOPE_TAMPERED`) if the envelope is missing, structurally invalid, profile-spoofed, or disagrees with a re-resolved projection when config is available.

### Requirement: Slim opt-in
The Mission F suite basename SHALL be listed in `SLIM_SUITE_EXCLUDES` and reachable via `npm run test:compute-worker-f`.
