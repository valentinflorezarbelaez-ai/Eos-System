# Proposal — EOS local chat on the public site

## Why

The public page already says what EOS is. Operators still need a place on that same page to call the MCP gateway that already exists (`eos-local`, `node src/mcp-server.js --http`). The call uses a local API key in `Authorization: Bearer` and only the three read-only tools already on that gateway.

## What

- Keep the spiritual copy, the seal favicon, and the `eos-site` rewrites. Add one section that explains the connector in Spanish and hosts the chat.
- A vanilla HTML/CSS/JS chat. No new npm dependency. The person pastes a local key into the page. The page does not write that key into the repository, into `localStorage`, or into `sessionStorage`.
- Client logic, testable without a browser, refuses a missing key and an unknown tool before any request is built. A doctor JSON-RPC fixture renders `VERDICT`.
- The browser calls `POST /mcp` on the operator's machine. The HTTP gateway answers a CORS preflight so a page served on another local port can send `Authorization`. The default bind stays `127.0.0.1`. The key check stays in front of every tool.
- Write tools stay refused, in the page and on the gateway.
- Public asset URLs for the new scripts get matching `vercel.json` rewrites on `eos-site` only.

## Routing

**SDD** (ADR-0010). The human asked for an OpenSpec, a chat surface, and tests. Cite `docs/base-standards.md`. Not DIRECT.

## Authorization

- `src/core/` product kernel: not authorized. This change does not edit it.
- `Fundacion/` and `PRJ-FUNDACION`: `Δ = 0`.
- `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, `DEPENDENCY_POLICY_L0.md`: not edited.
- L0: Node built-ins and the existing static site. No root dependency added.
- Autonomy remains `LEVEL_2_SUPERVISED_AUTONOMY`. No auto-merge. No `vercel --prod`. No HITL bypass.

## NON-goals

- No claim of parity with Claude Code, Codex, Gemini, Antigravity, Gentle AI, or Engram.
- No second brand and no rewrite of the spiritual copy into hype.
- No write tools, no production deploy, no Fundacion access, no tool that skips human approval.
- No key committed, logged, or stored in the browser.
- No new MCP server name. The chat is an HTTP client of `eos-local`.
- No `PRODUCTION_READY` claim.
- No publish of FlowDesk, Sonrisa Nova, Luxe Registry, or the multimodal suite.
