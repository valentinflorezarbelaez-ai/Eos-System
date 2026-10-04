# Tasks — EOS local chat

## 1. Spec this change

- [ ] `proposal.md`, `design.md`, this file, and `specs/eos-chat/spec.md` exist before the chat client.
- Done when those OpenSpec files are on the branch.

## 2. Failing test

- [ ] `tests/eos-chat-client.test.js` fails before `site/chat-client.js` exists.
- Cases: missing key refused, unknown tool refused, a doctor result rendered from a fixture.

## 3. Minimum implementation

- [ ] `site/chat-client.js` plans a turn and renders a gateway body. No DOM. No key in the JSON-RPC body.
- [ ] `site/index.html` explains stdio plus `EOS_API_KEY`, and HTTP for any other program, and hosts the chat.
- [ ] `site/chat.js` and `site/styles.css` wire and present the chat. The key is not stored.
- [ ] `src/mcp/http-gateway.js` answers a CORS preflight for `POST /mcp`.
- [ ] `vercel.json` rewrites `/chat.js` and `/chat-client.js` to `eos-site` only.
- [ ] `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md` points at the page chat.

## 4. Verify

- [ ] `node --test tests/eos-chat-client.test.js` exits 0 after the client exists.
- [ ] `node scripts/verify-eos.js --strict` exit code recorded.
- [ ] No writes under `Fundacion/`, `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, `DEPENDENCY_POLICY_L0.md`, or `src/core/`.
- [ ] No `vercel --prod`. A 402 on preview creation stops the deploy attempt.
