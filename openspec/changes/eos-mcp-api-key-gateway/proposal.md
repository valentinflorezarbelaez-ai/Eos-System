# Proposal — EOS MCP API key gateway

## Why

Editors and other local programs need one authenticated way to call EOS over MCP. The server that already exists is `eos-local` (`node src/mcp-server.js`, SSOT `config/mcp/eos-mcp.ssot.json`). This change adds an API key check on that server. It does not add a second MCP name.

## What

- A local command prints a new secret once and stores only a scrypt hash under `.eos/mcp-api-key.json` (already covered by `.gitignore`, with an explicit path too).
- stdio: the editor puts the secret in `EOS_API_KEY`. `tools/call` checks it before any tool runs.
- HTTP: `Authorization: Bearer <key>` on `POST /mcp`. Missing or wrong key returns HTTP 401 and does not run a tool.
- The external surface advertises three existing read-only tools: `eos.doctor`, `eos.mission.status`, `eos.authority.check`. Write tools are not callable on this surface.
- Client snippets live in `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md` and use the placeholder `YOUR_KEY`.

## Routing

**SDD** (ADR-0010). The human asked for a spec, tests, and a gateway. Cite `docs/base-standards.md`. Not DIRECT.

## Authorization

- `src/core/` product kernel: not authorized. This change does not edit it. It may call existing read-only handlers already exported by `src/mcp-server.js`.
- `Fundacion/` and `PRJ-FUNDACION`: `Δ = 0`.
- `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, `DEPENDENCY_POLICY_L0.md`: not edited.
- L0: Node built-ins only. No root dependency added.
- Autonomy remains `LEVEL_2_SUPERVISED_AUTONOMY`. No auto-merge. No production deploy. No HITL bypass.

## NON-goals

- No claim that every program on earth can connect. Transports in this slice: stdio and HTTP.
- No write tools, no production deploy tool, no Fundacion tool, no tool that skips human approval.
- No SSO change, no `vercel --prod`, no merge to `main`.
- No second MCP server name. `eos-local` stays the server id. `serverInfo.name` stays `eos-mission-os`.
- No raw key in git, docs, evidence, or logs.
- No `PRODUCTION_READY` claim.
- No rewrite of the spiritual copy in `site/`.
