# FlowDesk pipeline (current behavior)

Capability: tenant-scoped lead pipeline snapshot on the EOS-Lab/FlowDesk sandbox. Archived from `openspec/changes/flowdesk-lead-pipeline-snapshot/` after apply + verify. Lab only — not Fundacion, not Core kernel.

## Requirements

### Requirement: Tenant pipeline snapshot by status

`LeadService` MUST expose `countLeadsByStatus(userId)` that returns a complete map of every `LeadStatus` (`NUEVO`, `CONTACTADO`, `CALIFICADO`, `GANADO`, `PERDIDO`) to a non-negative integer count of that tenant's leads. Other tenants MUST NOT contribute to the counts. Missing statuses MUST be `0`.

#### Scenario: Operator reads a mixed pipeline

- GIVEN a tenant with leads in more than one status
- WHEN `countLeadsByStatus(userId)` is called
- THEN each key is a valid `LeadStatus`
- AND each value equals the number of that tenant's leads in that status

#### Scenario: Empty pipeline is zeros, not missing keys

- GIVEN a tenant with zero leads
- WHEN `countLeadsByStatus(userId)` is called
- THEN the result includes all five status keys
- AND every value is `0`

#### Scenario: Tenant isolation

- GIVEN tenant A has leads and tenant B has leads in different statuses
- WHEN `countLeadsByStatus` is called for tenant A
- THEN tenant B's leads are not included in any count
