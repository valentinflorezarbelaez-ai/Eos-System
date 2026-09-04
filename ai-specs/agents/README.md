# ai-specs / agents

Canonical EOS agent registry (do not fork):

- `docs/agents/REGISTRY.json`
- `docs/agents/SELECTION_ENGINE.json`
- `docs/agents/TEAM_COMPOSITION.json`
- `docs/agents/AGENT_COUNCIL.json`

Roles used with Specboot (map; do not duplicate prompts):

| Role | EOS id (typical) | Specboot step |
| --- | --- | --- |
| RESEARCH | `AGT-RESEARCH` | `/enrich-us` |
| ARCHITECT / SPECIFICATION | `AGT-SPECIFICATION` | `/propose`, `/ff` |
| IMPLEMENTER | implementation agents | `/apply` |
| AUDITOR / VERIFIER | verification agents | `/verify` (≠ builder) |
| REDTEAM | adversarial / independent review | `/adversarial-review` (RDD, informational) |

Anti-majority: consensus is not authority. Evidence, tests, and the Constitution win.
