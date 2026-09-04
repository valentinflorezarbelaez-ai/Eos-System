# EOS Mission OS: arquitectura rediseñada para construcción

## 1. Decisión central

EOS no debe ser un modelo con muchas herramientas. Debe ser un **control plane de misiones autónomas** que coordina modelos, agentes, tools, MCPs, datos, ambientes y personas bajo un contrato observable. La capacidad de hacer “cualquier proyecto” no proviene de preprogramar todos los proyectos, sino de combinar una ontología estable, capability registry, project factory extensible, providers intercambiables y evaluación continua.

## 2. Arquitectura objetivo

```
Command Center
  Cursor · Devin · CLI · Web UI · API · MCP Host
                    │
                    ▼
Mission Control Plane
  Intent Resolver · Mission Contract · Ontology · Authority · Policy
                    │
                    ▼
Mission Runtime
  Session · DAG · Scheduler · Budget · Checkpoint · FDIR · Safe Mode
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
Capability Plane  Evidence Plane  Platform Plane
Agents/Skills     Traces/Events    Registry/Providers
Tools/MCP        Evaluators        Models/Memory
Sandbox/Browser  Outcomes          Secrets/Environments
       └────────────┼────────────┘
                    ▼
Execution Environments
  Read-only · Worktree · Sandbox · Staging · Production
```

## 3. Módulos y contratos

| Módulo | Responsabilidad | Contrato de terminado |
| --- | --- | --- |
| **Mission Control** | Intención, objetivo, unknowns, owner y DoD | Mission contract válido y versionado |
| **Mission Ontology** | Objetos, relaciones, acciones, owners, provenance | Cada acción se refiere a objetos tipados |
| **Authority Engine** | Niveles, scopes, expiración, approvals y purpose | Acción permitida, bloqueada o escalada explicablemente |
| **Capability Registry** | Agents, skills, tools, MCPs, providers y health | Asset descubierto, firmado y evaluado |
| **Tool Gateway** | Interceptar y gobernar side effects | Cada call tiene schema, policy, timeout, budget y receipt |
| **Provider Router** | Modelo/MCP/API por fit, salud, coste y portabilidad | Selección reproducible y sustituible |
| **Mission Runtime** | DAG, sesiones, workers, budgets y checkpoints | Misión reanudable y determinista en control |
| **FDIR/Jidoka** | Detectar, aislar, recuperar y entrar en safe mode | Fallo no produce continuación silenciosa |
| **Evidence Plane** | Traces, logs, receipts, artifacts y lineage | Claim con fuente y hash o marcado UNKNOWN |
| **Evaluation Plane** | Outcome, trajectory, security, UX y SLO evals | PASS/FAIL/UNKNOWN con scorer y threshold |
| **Mission Twin** | Simulación, dependencias, impacto y estado vivo | Dry-run de cambios de alto impacto |
| **Learning Plane** | Outcomes, incidentes, recomendaciones y versiones | Aprendizaje no muta constitución sin aprobación |

## 4. Ciclo de misión completo

```
INTENT
  → CONTEXT_COMPILE
  → DISCOVER_CAPABILITIES
  → RESOLVE_UNKNOWNs
  → SELECT_PROJECT_FACTORY
  → BUILD_MISSION_TWIN
  → CLASSIFY_CAPABILITY_LEVEL
  → PLAN_DAG
  → APPROVAL_GATE
  → EXECUTE_IN_SANDBOX
  → VERIFY_OUTCOME_AND_TRAJECTORY
  → ADVERSARIAL_REVIEW
  → PROMOTE_OR_REPAIR
  → RELEASE_WITH_ROLLBACK
  → OPERATE_WITH_SLO
  → LEARN_AND_VERSION
```

Cada transición debe ser un evento durable. EOS no debe depender de la memoria de una conversación para continuar.

## 5. P0 de construcción

### P0.1 Control Plane durable

Implementar Mission Catalog, Mission Contract, Authority Engine, Event Ledger, Evidence Receipt y Checkpoint Store sobre una interfaz de almacenamiento sustituible. El primer backend puede ser local JSONL/SQLite, pero las interfaces deben permitir Postgres, object storage y event bus después.

### P0.2 Tool Gateway y Capability Registry

Todo tool y MCP server entra por un registry con schema, version, owner, scopes, cost, health, network policy, side effects, rollback y provenance. El gateway debe rechazar tool calls sin contrato y dejar un trace antes y después de cada llamada.

### P0.3 Harness de larga duración

Añadir scheduler, queue, leases, retries con backoff, timeout, cancellation, compaction, checkpoint, resume, dead-letter state y safe mode. La misión debe continuar aunque el provider cambie o el proceso reinicie.

### P0.4 Evaluación de trayectoria

Crear un formato de trajectory span que registre decisiones, tool calls, observations, policy decisions, retries, deviations, evidence y outcome. Añadir scorers deterministas y model-judges independientes, con calibración humana para casos críticos.

### P0.5 Sandbox e identidad

Separar read-only, worktree, sandbox, staging y production. Cada ambiente posee credenciales, red, mounts y scopes propios. Production siempre requiere MCL-3 con aprobación humana, canary, rollback y SLO.

### P0.6 Mission Twin mínimo

Representar requirements, unknowns, files, tools, agents, providers, decisions, tests, artifacts, incidents y outcomes como un grafo consultable. El primer uso es dependency impact analysis y dry-run de cambios.

## 6. P1 de construcción

El siguiente nivel añade registry web, Project Factory ampliable por plugins, simulación sintética, red teaming, model routing, A/B de prompts/tools, online evaluation, SLO dashboard, SBOM/provenance firmado, FDIR avanzado y colaboración A2A.

## 7. Anti-patrones explícitos

EOS no debe convertirse en swarm ilimitado, framework acoplado a un proveedor, microservicios prematuros, memoria vectorial sin provenance, skills sin firma, MCP sin gateway, autonomía productiva por defecto, evaluación por una sola métrica, claim de calidad sin cobertura o arquitectura basada en información privada no verificable.

## 8. Métricas de éxito

EOS debe medir: tasa de misiones terminadas con evidencia, porcentaje de decisiones correctas, recovery success, change failure rate, time to recover, tool-call policy violations, unknowns resueltos, coste por outcome, latencia, calidad de software, cobertura de tests, incidentes, regresiones, DevEx y satisfacción del usuario. La velocidad de tokens o líneas de código no es una métrica de éxito suficiente.

## 9. Orden de implementación

```
1. Event Ledger + Mission Catalog
2. Authority Engine + Tool Gateway
3. Capability Registry + Provider Router
4. Long-running Harness + FDIR
5. Trajectory Evaluation + OpenTelemetry
6. Sandbox + Identity + Supply Chain
7. Mission Twin + Impact Simulation
8. Registry UI + Golden Paths
9. A2A + Multi-agent collaboration
10. Production canary + SLO operations
```

## 10. Resultado esperado

La definición de EOS “impecable” no es ausencia de fallos. Es un sistema que hace visibles sus límites, detecta anomalías, se detiene antes del daño, conserva contexto, permite recuperación, aprende sin corromper su constitución y mejora sus outcomes a través de ciclos medibles.
