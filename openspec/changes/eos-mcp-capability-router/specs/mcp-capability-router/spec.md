# Spec — Dynamic MCP Capability Router (SPEC-0009)

## Functional Requirements (EARS Standard)

1. **Ubiquitous Requirement**:
   `EL SISTEMA MANTENDRÁ un catálogo canónico de capacidades que asocia dominios de ingeniería a servidores MCP específicos.`

2. **Event-Driven Requirement (Envelope Resolution)**:
   `CUANDO un agente o tarea solicite la resolución de herramientas para un conjunto de capacidades y una fase de ciclo de vida, EL SISTEMA PROYECTARÁ un McpCapabilityEnvelope inmutable con el subconjunto mínimo de servidores necesarios.`

3. **State-Driven Requirement (Least-Privilege Enforcement)**:
   `MIENTRAS la fase solicitada pertenezca a [INTAKE, SPEC, PLAN, VERIFY, REVIEW], EL SISTEMA ASIGNARÁ el perfil L0_READONLY y denegará la autoridad de escritura (writeAllowed = false).`

4. **State-Driven Requirement (Apply Authority)**:
   `MIENTRAS la fase solicitada sea APPLY, EL SISTEMA ASIGNARÁ el perfil L1_LOCAL_GOVERNED con autoridad de escritura bajo el control de Write Barrier.`

5. **Error / Unwanted Condition (Missing Capability Fail-Closed)**:
   `SI una capacidad requerida no cuenta con ningún servidor activo o configurado en el registro de servidores disponibles, ENTONCES EL SISTEMA MARCARÁ el sobre como DEFICIENT y listará los servidores faltantes sin inventar herramientas simuladas.`

---

## Acceptance Criteria (BDD GIVEN-WHEN-THEN)

### Scenario 1: Resolution of Frontend & QA Capabilities
```gherkin
GIVEN a task requiring capabilities ['DESIGN', 'BROWSER_QA']
AND phase is 'VERIFY'
AND available servers include ['StitchMCP', 'chrome-devtools-mcp', 'engram', 'eos-local']
WHEN McpCapabilityRouter.resolveEnvelope() executes
THEN result.status is 'RESOLVED'
AND result.profile is 'L0_READONLY'
AND result.authority.writeAllowed is false
AND result.resolvedServers contains 'StitchMCP' and 'chrome-devtools-mcp'
AND result.resolvedServers does NOT contain unneeded servers like 'supabase' or 'github'
```

### Scenario 2: Parse Task Text Annotation
```gherkin
GIVEN a task description string "- [ ] Audit login flow @needs(VCS, BROWSER_QA)"
AND phase is 'APPLY'
WHEN McpCapabilityRouter.parseTaskCapabilities() and resolveEnvelope() execute
THEN extracted capabilities are ['VCS', 'BROWSER_QA']
AND result.profile is 'L1_LOCAL_GOVERNED'
AND result.authority.writeAllowed is true
AND result.resolvedServers contains 'github' and 'chrome-devtools-mcp'
```

### Scenario 3: Fail-Closed on Missing Critical Capability
```gherkin
GIVEN a task requiring capability 'DATABASE'
AND available servers configuration has NO database server configured
WHEN McpCapabilityRouter.resolveEnvelope() executes
THEN result.status is 'DEFICIENT'
AND result.missingRequiredServers contains 'DATABASE'
AND result.resolvedServers does NOT claim database readiness
```

### Scenario 4: Preservation of Core Invariants
```gherkin
GIVEN any resolution request
WHEN McpCapabilityRouter executes
THEN Fundacion write targets are strictly classified as restricted
AND PRODUCTION_READY is 'NO'
AND zero external network side-effects occur during resolution
```
