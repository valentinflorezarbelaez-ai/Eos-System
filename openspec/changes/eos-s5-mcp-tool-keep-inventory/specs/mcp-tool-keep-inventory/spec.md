# Spec delta — mcp-tool-keep-inventory

## Requirement

EOS MUST publish a ranked MCP/tool KEEP inventory documenting KEEP tools and prune candidates ("¿Qué puedo dejar de hacer?") sourced from MCP catalog SSOT and the dead/orphan register.

## Requirement

`verify:strict` MUST fail-closed if the S5 inventory doc or required sections are missing. `test:s5` MUST cover green path and fail-closed fixtures.

## Requirement

Prune of MCP tools MUST NOT execute in this change. NON-CLAIM: inventory ≠ executed prune. Prune only when PO names exact tool names in a follow-up.

## Requirement

PRODUCTION_READY MUST remain NO. Fundacion Delta=0. No new `docs/schemas` JSON while AT_CEILING.
