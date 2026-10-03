# EOS MCP — local connection

```text
server: eos-local
entrypoint: node src/mcp-server.js
mode: read-write / LEVEL_1 / no external side effects
purpose: use Mission OS from Cursor via MCP
```

## Wired tools (MEASURED)

| Tool | Behavior |
| --- | --- |
| `eos.mission.resolve` | Propose DAG (no disk write) |
| `eos.mission.start` | `MissionRuntime.createMission` |
| `eos.mission.status` | Inspect or list `.missions` |
| `eos.mission.recover` | Legacy ledger recover |
| `eos.context.compile` | ContextCompiler |
| `eos.ledger.*` | MissionLedger |
| `eos.authority.check` | AuthorityAdapter |
| `eos.policy.validate` | Canonical rules cite |
| `eos.evidence.get/record` | Mission evidence dir |
| `eos.verifier.run` | Local schema validation |
| `eos.workspace.discover` | FS + git HEAD |
| `eos.workspace.barrier_check` | Fundación/governance barrier |
| `eos.fdir.status/trip` | IntegrationGatekeeper |
| `eos.audit.run` | Local summary audit |
| `eos.report.generate` | Executive mission report |

## Honest non-wiring

| Tool | Status |
| --- | --- |
| `eos.provider.route` / `health` | `NOT_CONFIGURED` (no network providers in local MVP) |

## API key (stdio and HTTP)

Editors pass `EOS_API_KEY` in the environment. Other local programs use `node src/mcp-server.js --http` and `Authorization: Bearer`. Missing or wrong key: no tool execution (HTTP 401). The gateway lists only `eos.doctor`, `eos.mission.status`, and `eos.authority.check`. Snippets and the issue command: `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md`. Use the placeholder `YOUR_KEY` in docs. Do not commit a real key.

## Reload

After pulling this change, reload MCP servers in Cursor (Command Palette → MCP: Restart / reload window) so `eos-local` picks up `src/mcp-server.js` v1.3.

## Example

```text
eos.mission.resolve { "goal": "Prove MCP mission start" }
eos.mission.start   { "goal": "Prove MCP mission start", "projectPath": "." }
eos.mission.status  { "missionId": "MIS-..." }
eos.report.generate { "missionId": "MIS-..." }
```

Underscore aliases (`eos_mission_status`) are normalized to dotted names.
