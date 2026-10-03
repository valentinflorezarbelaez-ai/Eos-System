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

- [ ] `node --test tests/mcp-api-key-gateway.test.js` exit code recorded.
- [ ] `node scripts/verify-eos.js --strict` exit code recorded. Pre-existing failures called out if any.
- [ ] No writes under `Fundacion/`, `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, or `DEPENDENCY_POLICY_L0.md`.
- [ ] `site/` spiritual copy left unchanged.
