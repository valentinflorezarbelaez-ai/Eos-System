# Tasks — EOS MCP API key gateway

## 1. Spec this change

- [x] `proposal.md`, `design.md`, this file, and `specs/mcp-api-key-gateway/spec.md` exist before product code.
- Done when those OpenSpec files are on the branch.

## 2. Failing test

- [x] `tests/mcp-api-key-gateway.test.js` failed before the modules existed (`ERR_MODULE_NOT_FOUND`, exit 1).
- Cases: missing key rejected, wrong key rejected, right key accepted, hash file does not contain the raw key.
- Also: HTTP 401, write tool not executed, `git check-ignore` on the key path.

## 3. Minimum implementation

- [x] `src/mcp/api-key-gate.js` issues and verifies a scrypt hash with `timingSafeEqual`.
- [x] `src/mcp/readonly-gateway.js` checks the key, then allows only the three read-only tools.
- [x] `src/mcp/http-gateway.js` returns 401 and does not dispatch when the bearer is missing or wrong.
- [x] `src/mcp-server.js` stdio `tools/call` uses that gate. `--http` starts the HTTP transport.
- [x] `scripts/eos-mcp-api-key.js` prints the secret once.
- [x] `.gitignore` names `.eos/mcp-api-key.json`.
- [x] SSOT env carries `EOS_API_KEY` as `${EOS_API_KEY}` and consumers are regenerated.
- [x] `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md` shows the Cursor snippet and one HTTP call with `YOUR_KEY`.

## 4. Verify

- [x] `node --test tests/mcp-api-key-gateway.test.js` — 12 pass, 0 fail, exit 0. Before the modules existed the same file exited 1 (`ERR_MODULE_NOT_FOUND`).
- [x] `node scripts/verify-eos.js --strict` — exit 0. Log contains 832 `[VERIFIED]` lines and no failed checks.
- [x] Live process: HTTP missing and wrong bearer returned 401; matching bearer ran `eos.doctor` (`executed: true`, `VERDICT: PASS`). stdio without a key returned `UNAUTHORIZED` and no result.
- [x] Aikido `aikido_full_scan` asked for sign-in. No scan result. Not treated as a pass.
- [x] No writes under `Fundacion/`, `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, or `DEPENDENCY_POLICY_L0.md`.
- [x] `site/` spiritual copy left unchanged.
