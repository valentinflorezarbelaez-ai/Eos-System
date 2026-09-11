# Proposal — Mission J: Stitch UI Generator Bridge (SPEC-0015)

## Why
EOS needs a governed, hermetic bridge to Google Stitch capabilities (projects, screen generation, designMd export) with cryptographic custody — without coupling CI to live Stitch MCP.

## What
1. `src/core/mcp/stitch-tool-bridge.js` — stitchListProjects / stitchGenerateScreen / stitchGetScreen / stitchExportDesignMd + executeStitchTool.
2. Injectable `clientImpl` transport; 30s timeout; 2MiB prompt bound; custody VERIFIED.
3. Suite `eos-stitch-tool-bridge.test.js`; slim-exclude; `test:stitch`.
4. Release report.

## DoD
Branch `grok/mission-j-stitch-tool-bridge` from main@354d7c4; tests green; SLIM≤145; verify:strict EXIT 0.
