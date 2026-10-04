# Tasks — EOS local chat

## 1. Spec this change

- [x] `proposal.md`, `design.md`, this file, and `specs/eos-chat/spec.md` exist before the chat client.
- Done when those OpenSpec files are on the branch.

## 2. Failing test

- [x] `tests/eos-chat-client.test.js` fails before `site/chat-client.js` exists.
- Cases: missing key refused, unknown tool refused, a doctor result rendered from a fixture.

## 3. Minimum implementation

- [x] `site/chat-client.js` plans a turn and renders a gateway body. No DOM. No key in the JSON-RPC body.
- [x] `site/index.html` explains stdio plus `EOS_API_KEY`, and HTTP for any other program, and hosts the chat.
- [x] `site/chat.js` and `site/styles.css` wire and present the chat. The key is not stored.
- [x] `src/mcp/http-gateway.js` answers a CORS preflight for `POST /mcp`.
- [x] `vercel.json` rewrites `/chat.js` and `/chat-client.js` to `eos-site` only.
- [x] `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md` points at the page chat.

## 4. Verify

- [x] `node --test tests/eos-chat-client.test.js` exits 0 after the client exists. Before `site/chat-client.js` existed, the same file exited 1 (`ERR_MODULE_NOT_FOUND`).
- [ ] `node scripts/verify-eos.js --strict` exit code recorded.
- [ ] No writes under `Fundacion/`, `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, `DEPENDENCY_POLICY_L0.md`, or `src/core/`.
- [ ] No `vercel --prod`. A 402 on preview creation stops the deploy attempt.
