# EOS: plan de construcción derivado del benchmark tecnológico

## Decisión central

EOS no debe intentar reproducir toda la infraestructura de OpenAI, Anthropic, Microsoft, Google, Meta, Palantir, NVIDIA, Amazon o SpaceX. Debe adoptar la estructura común que hace confiables sus sistemas: un runtime que separa misión, contexto, herramientas, autoridad, ejecución, evaluación, memoria y operación.

## Arquitectura P0

| Módulo | Contrato mínimo | Resultado |
| --- | --- | --- |
| `MissionOntology` | Objetos tipados con provenance, owner, status y relaciones | Una fuente semántica de verdad para misión y proyecto |
| `ContextCompiler` | `compile(missionId, nodeId, budget)` | Contexto mínimo, actualizado y just-in-time |
| `ToolGateway` | `authorize(tool, input, contract)` | Intercepta cada acción, valida scope, riesgo, coste y evidencia |
| `AgentHarness` | `run(session, context, tools)` | Turnos, compaction, todo tracking, approvals, retry, recovery |
| `MissionLedger` | `feature_list`, `progress`, `handoff`, `checkpoints` | Evita one-shotting, repetición y premature completion |
| `EvalPlane` | `evaluate(outcome, trajectory, safety)` | Valida resultado y camino, no solo texto |
| `EvidenceGraph` | Receipts enlazados a decisiones y artefactos | Explicabilidad y auditoría |

## Contratos de tools

Toda tool registrada debe declarar:

```typescript
interface ToolContract {
  id: string;
  version: string;
  purpose: string;
  inputSchema: unknown;
  outputSchema: unknown;
  requiredScopes: string[];
  sideEffects: 'none'|'workspace'|'external'|'production';
  reversibility: 'reversible'|'compensatable'|'irreversible';
  riskClass: 'low'|'medium'|'high'|'critical';
  timeoutMs: number;
  costEstimate?: number;
  healthCheck?: string;
  evidenceShape: string[];
}
```

El gateway debe bloquear una tool si no está registrada, si el provider está unhealthy, si el scope no está autorizado, si el presupuesto se agotó, si el ambiente no coincide o si falta aprobación.

## Context Compiler

El compiler debe construir el contexto por capas y presupuesto:

```
Constitution
→ Mission Authorization Contract
→ Current Node
→ Active Requirements
→ Relevant Artifacts
→ Recent Evidence
→ Selected Tools
→ Known Unknowns
→ Previous Failure / Recovery
→ Exact Next Decision
```

Nunca debe inyectar todo el historial. La memoria completa queda fuera del contexto y se recupera por identificadores. Cada compilación produce un `ContextReceipt` con fuentes, tokens estimados, elementos excluidos y razón de selección.

## Mission Ledger

La misión larga requiere un ledger mutable de estado operativo y una constitución inmutable. `feature_list.json` contiene outcomes end-to-end y solo Verification puede cambiar `passes` a verdadero. `progress.md` registra el estado legible por humanos. `run-log.jsonl` conserva eventos. Git/worktrees conservan recuperación de código. `handoff.md` prepara la siguiente sesión.

## Eval Plane

Cada misión debe tener:

1. **Outcome rubric:** requisitos funcionales, UX, seguridad, producto y operación.
2. **Trajectory rubric:** tools correctas, secuencia válida, scopes, retries, costes y escalamiento.
3. **Safety suite:** prompt injection, secret exposure, unsafe tool use, data boundary y policy bypass.
4. **Regression set:** fallos anteriores convertidos en casos reproducibles.
5. **Human review:** criterios que no pueden demostrarse automáticamente, como conformidad WCAG completa o aprobación comercial.

Un run no puede ser `PASS` si un gate crítico es `UNKNOWN`.

## Secuencia de implementación

### Incremento 1: Mission Ledger + Context Compiler

Construir primero porque desbloquea sesiones largas y reduce el riesgo más frecuente: perder contexto, repetir trabajo o declarar finalización prematura.

**Aceptación:** una misión puede detenerse, reiniciarse y continuar con el mismo objetivo, estado, presupuesto, evidencia y siguiente feature, sin cargar todo el historial.

### Incremento 2: ToolGateway

Integrar el Gateway con las tools MCP y locales actuales.

**Aceptación:** cada tool call produce decisión `allow`, `approval-required`, `deny` o `pause`, junto con receipt y razón explicable.

### Incremento 3: MissionOntology

Mover de JSONs independientes a entidades y relaciones tipadas, manteniendo export JSONL para portabilidad.

**Aceptación:** una consulta puede reconstruir misión, proyecto, agente, herramienta, gate, decisión, evidencia y outcome relacionados.

### Incremento 4: Outcome + Trajectory Eval

Añadir datasets, rubrics, trazas y replay.

**Aceptación:** una misión con outcome correcto y trayectoria no autorizada falla; una misión con trayectoria válida pero outcome incompleto no se entrega.

### Incremento 5: AgentHarness

Formalizar initializer, coding session, compaction, retry, timeout, recovery, clean-state y handoff.

**Aceptación:** una secuencia de sesiones puede avanzar un proyecto feature-by-feature y dejar el repositorio mergeable al terminar cada sesión.

### Incremento 6: Sandbox e identidad

Aislar filesystem, shell, browser, red, secretos y proveedores.

**Aceptación:** las pruebas demuestran que una tool de alto riesgo no puede escapar del scope autorizado y que toda acción externa tiene identity, expiry y audit record.

## Modos operativos

EOS debe seleccionar el modo más simple compatible con la misión:

| Modo | Uso |
| --- | --- |
| Deterministic function | Puede resolverse sin LLM |
| Governed workflow | Pasos definidos y repetibles |
| Single agent loop | Problema abierto acotado |
| Orchestrator-workers | Subtareas dinámicas e independientes |
| Parallel research | Investigación amplia y separable |
| Human-led | Alto riesgo, ambigüedad o decisión irreversible |

## Qué no construir todavía

No construir aún un swarm ilimitado, memoria vectorial compleja sin casos de uso, microservicios, pagos autónomos, despliegue productivo sin aprobación, modificación automática de la constitución, optimización libre de prompts en producción, ni un Project Factory que genere cualquier stack sin repositorios y proveedores reales.

## Primera misión de validación

La primera misión real debe ser sobre un repositorio controlado y debe ejecutar:

```
inspect read-only
→ create authorization contract
→ compile context
→ create feature ledger
→ plan one feature
→ execute in worktree
→ verify outcome and trajectory
→ security review
→ checkpoint
→ handoff
→ outcome record
```

El éxito se mide por recuperación, trazabilidad, no repetición, correcta escalada de autoridad y evidencia; no por cantidad de código generado.

## Indicadores de madurez

| Nivel | Capacidad demostrada |
| --- | --- |
| M0 | Runtime y MCP locales con políticas |
| M1 | Misión durable con checkpoints y Mission Resolver |
| M2 | Context Compiler, Ledger y Tool Gateway |
| M3 | Agent Harness multi-sesión y sandbox |
| M4 | Outcome/Trajectory Eval y learning loop controlado |
| M5 | Misión full-stack completa en staging |
| M6 | Operación productiva con SLO, incidentes, rollback y autorización graduada |

EOS debe avanzar de nivel solo con evidencia reproducible. No se asciende por intención, demo o número de features.
