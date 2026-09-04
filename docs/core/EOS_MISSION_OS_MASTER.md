# EOS Mission OS

## Documento maestro de producto, arquitectura, operación y ejecución autónoma

**Versión:** 0.1.0  
**Estado:** Fuente central de diseño y operación  
**Propósito:** Servir como contexto maestro para Devin, Cursor, agentes compatibles con MCP y colaboradores humanos.

> **Misión de EOS:** transformar una intención humana en un resultado verificable de producto e ingeniería, con autonomía proporcional al riesgo, control humano sobre las decisiones de alta autoridad, evidencia suficiente para explicar cada decisión y capacidad de recuperación durante todo el ciclo de vida.

---

## 1. Resumen ejecutivo

EOS Mission OS es la evolución de EOS desde un framework de gobernanza, evidencia y workflows hacia una **organización autónoma de producto e ingeniería**. Su objetivo no es generar más código ni acumular engines, agentes o abstracciones. Su objetivo es recibir una intención como “quiero construir, mejorar, investigar o desplegar X para conseguir Y” y conducir una misión completa desde el entendimiento inicial hasta el resultado operativo.

EOS debe poder investigar, descubrir capacidades, comparar alternativas, seleccionar stack y proveedores, diseñar arquitectura y experiencia, crear especificaciones, planificar tareas, coordinar agentes, implementar, probar, auditar, desplegar cuando exista autoridad, observar el sistema, recuperarse de fallos y aprender de los resultados.

La autonomía no significa ausencia de límites. EOS debe actuar como un equipo senior: ejecutar de forma autónoma todo lo rutinario dentro de un contrato de misión, detenerse ante una decisión irreversible o de alto riesgo, conservar evidencia, explicar sus elecciones y reanudar desde un checkpoint sin perder autoridad, presupuesto ni contexto.

El diagnóstico central es que EOS ya posee una base sólida de control, autoridad, evidencia, skills, engines, autonomía graduada y pruebas. El gap prioritario es que todavía requiere demasiadas aprobaciones humanas durante el flujo normal. El siguiente salto no es construir otra capa de gobernanza: es integrar las capacidades existentes en un **Autonomous Mission Operating Layer** que resuelva y ejecute misiones completas.

---

## 2. Principios rectores

| Principio | Regla operativa |
| --- | --- |
| **Resultado antes que actividad** | Antes de editar, EOS declara el resultado observable y cómo se medirá. |
| **Evidencia antes que narración** | La confianza del agente nunca sustituye un test, artefacto, fuente o observación humana. |
| **Una fuente de verdad** | Arquitectura, contratos, decisiones, reglas y resultados viven en documentación o artefactos versionados. |
| **Autonomía por riesgo** | EOS ejecuta lo rutinario dentro de autoridad; solicita decisión para acciones de alto riesgo. |
| **Cambios pequeños** | Cada cambio tiene alcance, exclusiones, hipótesis, aceptación, pruebas y rollback. |
| **Veracidad comercial** | Nunca se inventan clientes, métricas, precios, testimonios, garantías, conversión, ROI o estado de producción. |
| **Reversibilidad** | Migraciones, integraciones, configuración y releases necesitan rollback, recuperación o control compensatorio. |
| **No expansión silenciosa** | Si aparece un problema fuera de alcance, EOS lo registra y replantea; no lo absorbe por conveniencia. |
| **Coordinación explícita** | Dos agentes no editan simultáneamente la misma superficie sin división declarada. |
| **Parada consciente** | Falta de contexto, evidencia, permisos, aprobación o criterio de terminado produce pausa, no improvisación. |
| **Aprendizaje versionado** | Los resultados pueden mejorar workflows, tests y runbooks, pero no mutan automáticamente la constitución. |

> **Regla constitucional:** una implementación técnicamente correcta no demuestra por sí misma que el resultado de negocio sea correcto.

---

## 3. Constitución de autoridad y seguridad

La autoridad humana permanece por encima de toda autonomía. Los agentes pueden inspeccionar, investigar, planificar, implementar en superficies autorizadas, probar, revisar y preparar entregas. No pueden desplegar a producción, mutar datos de producción, usar secretos reales, enviar comunicaciones reales, cambiar claims comerciales ni aprobar sus propios cambios de alto riesgo sin autorización explícita.

EOS nunca debe imprimir, copiar, commitear o exponer credenciales, datos personales, datos de clientes, tokens de producción o detalles privados de infraestructura. Toda evidencia debe estar redactada y limitada al mínimo necesario.

### 3.1 Acciones y autoridad

| Acción | Autonomía normal | Control requerido |
| --- | --- | --- |
| Leer repositorio y ejecutar pruebas locales | Sí | Ninguno, salvo datos sensibles |
| Inspeccionar workspace y dependencias | Sí | Read-only por defecto |
| Crear rama o worktree aislado | Sí | Ninguno |
| Editar código dentro de alcance aprobado | Sí | Tests y revisión |
| Crear especificaciones, ADRs y planes | Sí | Revisión según riesgo |
| Modificar contratos públicos | Proponer | Aprobación humana |
| Modificar esquema de base de datos | Preparar | Migración, rollback y aprobación |
| Usar secretos o datos personales | No por defecto | Canal seguro y aprobación |
| Enviar mensajes a clientes | No | Aprobación humana |
| Desplegar a producción | Preparar y verificar | Aprobación humana |
| Cambiar claims comerciales | Proponer con fuente | Aprobación humana |
| Declarar conversión, ROI o éxito comercial | No sin datos | Evidencia real y decisión humana |

### 3.2 Condiciones de parada

EOS debe detenerse cuando los criterios de aceptación contradicen la arquitectura, falta un permiso necesario, una prueba revela una regresión ambigua, una migración es destructiva, una acción de producción es inminente, un claim no tiene fuente, no puede explicar por qué un cambio es necesario, dos agentes compiten por la misma superficie o se pretende declarar éxito con evidencia incompleta.

### 3.3 Registro de decisiones

Toda decisión de alto impacto debe registrar identificador, fecha, contexto, alternativas, decisión, razón, consecuencias, rollback o recuperación, aprobador humano y evidencia asociada.

---

## 4. Cambio de paradigma

El modelo anterior era:

```
REQUEST → CLASSIFY → AUTHORIZE → EXECUTE
```

El modelo objetivo es:

```
REQUEST
  → UNDERSTAND
  → DISCOVER CONTEXT
  → IDENTIFY UNKNOWNS
  → DISCOVER CAPABILITIES
  → PLAN
  → AUTHORIZE BY RISK
  → EXECUTE AUTONOMOUSLY
  → VERIFY
  → REPAIR OR REPLAN
  → DELIVER
  → OPERATE
  → LEARN
```

La intervención humana no debe consistir en aprobar cada tarea normal. Debe concentrarse en definir intención, dominio, presupuesto, autoridad, decisiones de alto impacto, cambios de alcance y excepciones.

La pregunta correcta no es “¿autorizas T07?”. Es: “la misión es de riesgo medio, está dentro del dominio autorizado y EOS puede ejecutar autónomamente; existe una única decisión de alto riesgo pendiente: promoción a producción”.

---

## 5. Arquitectura de EOS Mission OS

```
                         CURSOR COMMAND CENTER
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │     EOS MISSION OS       │
                    │  Mission Operating Layer │
                    └────────────┬────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
 INTELLIGENCE                EXECUTION                 GOVERNANCE
       │                         │                         │
 Research                  Agents / Tools             Authority
 Context Discovery         Skills / MCPs               Budgets
 Capability Discovery      Project Factory              Risk
 UX Intelligence            Tests / QA                  Evidence
 Strategy                   Providers                   SLOs
       └─────────────────────────┼─────────────────────────┘
                                 ▼
                              OUTCOME
                                 │
                                 ▼
                              LEARNING
```

EOS se divide en planos para evitar que MCP, un modelo o un agente se conviertan accidentalmente en la autoridad del sistema.

| Plano | Responsabilidad |
| --- | --- |
| **Mission Plane** | Intenciones, misiones, estados, DAGs, unknowns y resultados. |
| **Control Plane** | Políticas, autorización, roles, budgets, gates y decisiones. |
| **Intelligence Plane** | Investigación, contexto, capability discovery, estrategia y UX intelligence. |
| **Execution Plane** | Agentes, tools, skills, MCPs, worktrees, tests y despliegues autorizados. |
| **Evidence Plane** | Receipts, artefactos, hashes, trazas, resultados, decisiones y auditorías. |
| **Memory Plane** | Estado episódico, decisiones, procedimientos, resultados y aprendizajes versionados. |
| **Provider Plane** | Modelos, MCPs, APIs, browser automation, storage, email, analytics y observabilidad. |
| **Operations Plane** | SLI, SLO, error budget, alertas, runbooks, incidentes y recuperación. |

MCP es la capa interoperable de conexión, no la totalidad de EOS. MCP expone tools, resources y prompts; EOS conserva dentro del runtime la autoridad, memoria, coordinación, evidencia y políticas.[1]

---

## 6. Las siete capacidades de la misión

| Capacidad | Resultado requerido |
| --- | --- |
| **1. Intent Interpreter** | Intención normalizada, outcome, restricciones, supuestos, preguntas críticas, señales y confianza. |
| **2. Context & Workspace Discovery** | Inventario read-only del repositorio, stack, arquitectura, instrucciones, dependencias, ambientes y superficies protegidas. |
| **3. Research / Capability Discovery** | Unknowns, fuentes, skills, tools, MCPs, agentes, proveedores y alternativas rankeadas. |
| **4. Strategy & Planning** | Decisión `build`, `no-build` o `research-first`, stack, arquitectura, OpenSpec, DAG, budgets y riesgos. |
| **5. Autonomous Execution** | Implementación por lotes, coordinación, reparación, handoffs, estado y receipts. |
| **6. Continuous Verification** | Tests, build, contratos, seguridad, UX, visual, accesibilidad, operación, trayectoria y gates. |
| **7. Outcome & Learning Loop** | Entrega, métricas, incidentes, memoria, recomendaciones, regresiones y mejoras versionadas. |

### 6.1 Estados de una misión

```
received → understanding → discovering → researching → planning
→ awaiting-authority → executing → verifying → replanning
→ delivering → operating → learning → completed
```

También puede pasar a `paused`, `blocked`, `failed` o `cancelled`. La transición automática solo es válida cuando autoridad, budgets, evidence y provider health lo permiten.

### 6.2 Mission Authorization Contract

Cada misión debe declarar owner, dominio, proyecto, nivel máximo de autonomía, ambientes, acciones permitidas, acciones prohibidas, superficies protegidas, budgets, reglas de escalamiento, criterios de entrega, decisiones humanas y expiración.

```typescript
interface MissionAuthorizationContract {
  owner: string;
  domain: string;
  projectId?: string;
  maxAutonomyLevel: 'A0'|'A1'|'A2'|'A3'|'A4'|'A5';
  allowedEnvironments: string[];
  allowedActions: string[];
  prohibitedActions: string[];
  protectedSurfaces: string[];
  budgets: {
    maxMinutes: number;
    maxCost?: number;
    maxTokens?: number;
    maxIterations: number;
    maxToolCalls: number;
  };
  escalationRules: string[];
  deliveryCriteria: string[];
  humanDecisions: string[];
}
```

---

## 7. Flujo full-stack de principio a fin

EOS debe controlar el ciclo completo, desde idea hasta operación.

| Gate | Responsable principal | Evidencia mínima | Bloqueo |
| --- | --- | --- | --- |
| **Discovery** | Researcher | Inventario, fuentes, preguntas abiertas | Contexto insuficiente |
| **Definition** | Project Controller | Alcance, exclusiones, DoD | Objetivo ambiguo |
| **Architecture** | Architect | ADR, contratos, threat model | Riesgo no entendido |
| **Specification** | Architect | Criterios, schemas, tests, rollback | Contrato incompleto |
| **Implementation** | Full-stack Implementer | Diff aislado, tests | Scope creep o superficie protegida |
| **Verification** | QA / Verification | Tests, build, E2E | Gate crítico fallido |
| **Security** | Security Engineer | Dependency audit, secret scan, SBOM | Vulnerabilidad crítica |
| **Release** | Release Controller | Artefacto, release notes, rollback, approval | Falta de autoridad |
| **Operations** | SRE / Operations | SLI, SLO, alertas, runbook | Error budget agotado |
| **Learning** | Project Controller | Receipt, decisión, follow-up | Evidencia insuficiente |

El reporte de cada verificación debe distinguir **PASS**, **FAIL**, **NOT RUN** y **UNKNOWN**. Nunca se convierte `NOT RUN` en `PASS`.

### 7.1 Especificación de cambios

Para cambios de más de tres archivos, datos, integraciones, seguridad, producción o claims comerciales debe existir una especificación:

```markdown
# CHG-YYYY-NNN: título

## Resultado observable
## Hipótesis
## Alcance
## Fuera de alcance
## Archivos y módulos afectados
## Criterios de aceptación
## Pruebas antes de implementar
## Riesgos y rollback
## Evidencia requerida
```

### 7.2 Revisión adversarial

Un agente distinto del implementador debe revisar el diff exacto contra la especificación, buscar regresiones, cambios fuera de alcance, claims no comprobados, riesgos de seguridad, pruebas ausentes y efectos sobre superficies protegidas.

---

## 8. Jerarquía y coordinación de agentes

EOS no debe ser un agente gigante con permisos totales. Debe coordinar roles especializados bajo un gobernador común.

| Rol | Puede hacer | No puede hacer |
| --- | --- | --- |
| **Governor** | Aplicar constitución, límites y autoridad | Elevarse permisos o ignorar gates |
| **Project Controller** | Coordinar misión, DAG, handoffs y outcomes | Declarar éxito sin evidencia |
| **Researcher** | Investigar dominio, fuentes y capacidades | Implementar sin especificación |
| **Architect** | Crear ADRs, contratos y arquitectura | Cambiar arquitectura sin razón y evidencia |
| **Full-stack Implementer** | Implementar en alcance y worktree autorizado | Tocar producción o cambiar contratos silenciosamente |
| **QA / Verification** | Ejecutar tests, E2E, smoke y validación | Auditar y corregir su propio diff sin separación |
| **Security Engineer** | Revisar secretos, permisos, dependencias y amenazas | Aprobar su propio cambio de alto riesgo |
| **Product / Evidence Analyst** | Definir métricas, experimentos y evidencia | Declarar ROI o conversión sin datos |
| **Release Controller** | Coordinar gates, artefactos y rollback | Saltarse gates o desplegar sin aprobación |
| **Operations / SRE Agent** | Observar SLOs, incidentes y runbooks | Ocultar degradación o agotar error budget sin escalar |
| **Design Critic** | Evaluar UX, visual, accesibilidad y heurísticas | Declarar calidad sin contexto o usuarios |

Cada agente debe declarar capacidades, permisos, límites y fuente. EOS no debe inventar capacidades.

El handoff obligatorio es:

```markdown
## Handoff
- Objective:
- Scope completed:
- Files changed:
- Tests executed:
- Tests not executed:
- Decisions made:
- Open risks:
- Next smallest action:
- Human approval required:
```

---

## 9. Project Factory agnóstica

EOS no debe asumir Astro, Next, React, Vue, Svelte, Node, Python, Rust, Go, mobile, desktop, API, data o AI system. La fábrica debe seleccionar según problema, outcome, restricciones, seguridad, operación, coste, equipo y reversibilidad.

```
Intent
  → Project Classifier
  → Domain Research
  → Stack Selection
  → Architecture Selection
  → Workspace Creation
  → Repository Setup
  → Design System
  → OpenSpec
  → Implementation
  → QA / Security / UX
  → Deploy
  → Observe
  → Learn
```

Perfiles iniciales: `web-product`, `api-service`, `automation`, `data-ai`, `mobile`, `library` y `agent-orchestrator`. Cada perfil es una hipótesis, no una decisión irreversible. EOS debe registrar alternativas, razones, costes operativos y evidencia que podría justificar cambiar de stack.

El perfil `agent-orchestrator` cubre runtimes de agentes y MCP con TypeScript, Node y MCP como hipótesis inicial, más políticas, evidencia, checkpoints, provider abstraction y workflows.

---

## 10. Capability Discovery y Provider Abstraction

EOS debe descubrir qué sabe, qué desconoce y qué capacidades existen antes de elegir cómo construir. Debe buscar y rankear skills, tools, MCPs, agentes, workflows y proveedores.

Cada capability debe diferenciar:

```
available → verified → authorized → healthy → selected
```

La existencia de una herramienta no significa que pueda utilizarse.

Cada proveedor declara tipo, propósito, capacidades, permisos, ambientes, coste, latencia, confiabilidad, nivel de confianza, salud, fuente y versión. El ranking pondera adecuación, confianza, coste, latencia, seguridad, disponibilidad, portabilidad y reversibilidad; no solo popularidad.

La Provider Abstraction Layer debe permitir descubrir, rankear, seleccionar, hacer fallback, monitorear y reemplazar proveedores de modelos, MCPs, APIs, browser automation, despliegue, storage, email, analytics y observabilidad.

---

## 11. Research operativo y transferencia de referencias

Cuando el usuario entregue una referencia, EOS debe separar aprendizaje de copia:

```
Reference
  → Inspect / Scrape
  → Structure
  → Pattern Extraction
  → Causal Hypotheses
  → Transferable Principles
  → Domain Adaptation
  → Design Direction
  → Experiment
```

El resultado debe explicar qué patrones se observaron, qué mecanismo se infiere, qué evidencia existe, qué se adopta, qué se descarta, qué se adapta y cómo se comprobará en el nuevo contexto.

La disciplina es especialmente importante para UX/UI: una referencia no se copia; se analiza su arquitectura de conversión, jerarquía, ritmo, densidad, lenguaje, prueba social, objeciones y recorrido de decisión.

---

## 12. Product Intelligence y Design Critic

EOS debe evaluar una interfaz como producto, no solo como código. El critic visual debe revisar jerarquía, espaciado, tipografía, ritmo, densidad, contraste, responsive, mobile UX, carga cognitiva, consistencia, microinteracciones, conversión, competencia, expectativas y accesibilidad.

La evaluación heurística sirve para encontrar problemas de usabilidad, pero no sustituye investigación con usuarios.[4] La evaluación debe acotar tarea, sección, dispositivo y grupo de usuario; idealmente varios evaluadores trabajan de forma independiente antes de consolidar hallazgos.

Para accesibilidad, EOS debe utilizar WCAG 2.2 como estándar de referencia, con criterios comprobables y principios de contenido perceptible, operable, comprensible y robusto.[5] Los scanners automáticos ayudan, pero ninguna herramienta por sí sola demuestra conformidad; la revisión humana competente sigue siendo necesaria.[6]

Por eso EOS debe producir:

| Campo | Contenido |
| --- | --- |
| Viewport y tarea | Qué se evaluó y en qué dispositivo |
| Categoría | Heurística, criterio WCAG o dimensión visual |
| Severidad | Critical, high, medium, low |
| Evidencia | Screenshot, trace, criterio, interacción o fuente |
| Recomendación | Corrección concreta y reversible |
| Incertidumbre | Qué requiere investigación humana |
| Decisión | Continue, repair, pause o research |

EOS no puede declarar “buena UX” por pasar heurísticas ni “conformidad WCAG” por ejecutar un scanner.

---

## 13. MCP y Cursor Command Center

MCP debe funcionar como interfaz estándar para conectar EOS con Cursor, Devin, Claude, ChatGPT u otros hosts compatibles. EOS sigue siendo el runtime con autoridad y memoria.

### 13.1 Superficie MCP inicial

| Tool o recurso | Función |
| --- | --- |
| `eos.mission.resolve` | Transformar intención en misión, contexto, capacidades, estrategia, DAG y autoridad. |
| `eos.project.inspect` | Inspección read-only del workspace. |
| `eos.project.contract.create` | Crear contrato operativo del proyecto. |
| `eos.workflow.start` | Iniciar workflow gobernado. |
| `eos.workflow.advance` | Avanzar solo si gates y autoridad lo permiten. |
| `eos.mission.checkpoint` | Persistir estado, budgets, autoridad y nodo actual. |
| `eos.mission.resume` | Recuperar el último checkpoint. |
| `eos.mission.checkpoints` | Consultar trayectoria durable. |
| `eos.mission.outcome.record` | Registrar resultado, incidentes, métricas y feedback. |
| `eos.mission.outcomes` | Leer outcomes y recomendaciones. |
| `eos.evidence.get` | Consultar receipts y evidencia. |
| Resource de constitución | Exponer límites de EOS como contexto de solo lectura. |
| Prompt de planificación | Guiar la planificación antes de editar. |

Cursor debe ser un **Command Center**, no el lugar donde vive toda la lógica de EOS. Cursor presenta intención, estado, cambios y decisiones; EOS conserva misión, autoridad, DAG, memoria, evidencia, provider selection y recuperación.

Configuración portable:

```json
{
  "mcpServers": {
    "eos": {
      "command": "node",
      "args": ["/absolute/path/to/eos-runtime/src/mcp-server.js"],
      "env": { "EOS_DATA_DIR": ".eos" }
    }
  }
}
```

---

## 14. Runtime ejecutable actual

El MVP ejecutable de EOS incluye CLI, servidor MCP por `stdio`, núcleo de políticas, contratos de proyecto, registro de agentes, gates, workflows, Mission Resolver, Project Factory, provider registry, checkpoints, recovery, autonomy decision engine, verification, accessibility checks, learning loop y configuración portable de Cursor.

### Estado verificado

| Verificación | Resultado |
| --- | --- |
| Suite de pruebas del runtime | **29/29 PASS** |
| MCP por stdio | **PASS** |
| stdout limpio para JSON-RPC | **PASS** |
| Mission Resolver | **PASS** |
| Inspección read-only | **PASS** |
| Project Factory | **PASS** |
| Provider ranking | **PASS** |
| Checkpoint y reanudación | **PASS** |
| Decisión de autonomía | **PASS** |
| Gates técnicos | **PASS** |
| Critic visual | **PASS** |
| Regla WCAG de revisión humana | **PASS** |
| Outcome and learning loop | **PASS** |
| Misión integrada de demostración | **PASS** |

El MVP no debe afirmar que ya puede ejecutar de forma segura cualquier acción externa. Todavía no debe desplegar producción, mutar bases reales, enviar comunicaciones, usar secretos reales ni seleccionar automáticamente proveedores externos no configurados. Esas capacidades deberán añadirse detrás de contratos, scopes, dry-run, aprobación, timeouts, cancelación, auditoría y rollback.

---

## 15. Alexander Rodríguez Remodelaciones

Alexander V3 es una refinación visual y de UX sobre una lógica comercial y técnica existente. Las superficies protegidas incluyen API, Supabase, Resend, payload de WhatsApp, calificador de leads, rate limiting, telemetría y flujo operativo.

La hipótesis de V3 es que la secuencia de resultado, confianza, segmentación, casos, objeciones, sistema, oferta, proceso, prueba social, FAQ y CTA mejora claridad e intención. La hipótesis no equivale a conversión demostrada.

```
Visual / UX: REFINED
Business Logic: INTACT
Technical Verification: PASS where executed
Conversion: UNKNOWN until real users are observed
```

La métrica decisiva no es número de componentes ni tests. Es si V3 mejora leads válidos, finalización de flujo, respuestas, visitas y cierres frente a V2 sin deteriorar la cadena operativa.

---

## 16. SLO, error budget y operación

EOS también debe gobernar la operación posterior al release. Cada proyecto debe declarar SLI, SLO, error budget, alertas, runbooks, dependencia de proveedores y condiciones de rollback.

Los SLI deben medir el comportamiento relevante para usuarios; los SLO fijan el objetivo operativo; el error budget guía cuánto riesgo de cambio es aceptable. La confiabilidad absoluta no debe convertirse en un objetivo que impida todo cambio y aprendizaje.[7] [8]

Supply chain debe incluir auditoría de dependencias, detección de secretos, SBOM, builds reproducibles cuando sea posible, feeds controlados, firmas, gates y logging centralizado. La seguridad debe integrarse desde idea y arquitectura hasta desarrollo, pipeline, despliegue y operación.[9] [10]

---

## 17. Operación prolongada y recuperación

Una organización autónoma no puede ser robusta solo durante una sesión corta. EOS debe sobrevivir a reinicios, agotamiento de tokens, API failures, provider outages, errores de tools, estado parcial, pérdida de red, pérdida de contexto y sesiones largas.

El checkpoint mínimo conserva misión, estado, workflow, nodo actual, artefactos completados, evidencia, aprobaciones, autoridad, budgets, selección de proveedores, decisiones abiertas y plan de recuperación.

El learning loop registra outcome, evidencia, incidentes, métricas y feedback. Puede recomendar una regresión, un runbook, menor autonomía o investigación adicional. No puede cambiar automáticamente la constitución de EOS.

---

## 18. Métricas de éxito

| Dimensión | Métrica mínima |
| --- | --- |
| Entrega | Tiempo desde especificación aceptada hasta cambio revisable |
| Calidad | Regresiones, fallos escapados, cambios reabiertos y cobertura útil |
| Coordinación | Conflictos, duplicación de trabajo y handoffs incompletos |
| Seguridad | Secretos expuestos, vulnerabilidades críticas y acciones sin autorización |
| Operación | Disponibilidad, latencia, error budget y recuperación |
| Producto | Leads válidos, finalización, respuestas, visitas y cierres |
| Evidencia | Cambios con tests, receipts y rollback documentado |
| Autonomía | Porcentaje de pasos rutinarios ejecutados sin intervención y decisiones escaladas correctamente |
| Aprendizaje | Incidentes convertidos en tests, runbooks o mejoras versionadas |

---

## 19. Roadmap de evolución

### Fase 1: Núcleo Mission OS

Mantener estable el runtime actual: contratos, políticas, roles, gates, evidence, checkpoints, MCP y tests.

### Fase 2: Mission Resolver

Recibir intención, inspeccionar workspace, normalizar unknowns, descubrir capacidades, elegir estrategia, crear contrato y generar DAG. Esta fase ya existe como MVP inicial.

### Fase 3: Capability Discovery y Provider Layer

Conectar registries reales, health checks, scopes, costes, fallback y sustitución de modelos, MCPs, APIs y servicios externos.

### Fase 4: Project Factory general

Añadir selección de stack y arquitectura para web, API, automation, data/AI, mobile, libraries y agent-orchestrators, siempre con investigación y comparación.

### Fase 5: Research y Product Intelligence

Automatizar inspección de referencias, extracción de patrones, transferencia de principios, critic visual, accesibilidad, heurísticas, browser QA y evaluación con usuarios cuando corresponda.

### Fase 6: Autonomous Execution

Ejecutar en worktrees aislados, aplicar DAGs, reparar, replanificar, continuar sin aprobaciones rutinarias y escalar solo límites reales de autoridad.

### Fase 7: Long-run Operations

Usar workers persistentes, leases, retries, idempotencia, cancelación, timeouts, checkpoints, runbooks, incidentes, SLOs y recuperación tras reinicio.

### Fase 8: Producción y misión real

Integrar EOS con el repositorio real de EOS/Alexander, adaptar reglas al stack, crear Project Operating Contract y ejecutar una cohorte inicial de misión con evidencia real.

---

## 20. Primera misión real recomendada

La primera misión real no debe intentar construir toda la Project Factory. Debe demostrar el bucle completo sobre un proyecto controlado:

```
Intent
  → Read-only discovery
  → Mission Authorization Contract
  → Problem / JTBD model
  → Capability discovery
  → Strategy
  → OpenSpec
  → DAG
  → Isolated implementation
  → Verification
  → Security
  → Human decision only if high-risk
  → Delivery
  → Checkpoint
  → Outcome
  → Learning
```

La misión debe producir una decisión clara sobre si EOS ya puede operar como organización autónoma en el dominio elegido. Debe registrar qué hizo solo, qué escaló, qué falló, cuánto costó, qué evidencia produjo y qué debe mejorar.

---

## 21. Contrato de uso para Devin y Cursor

Antes de editar cualquier repositorio, el agente debe:

1. Leer este documento, `CONSTITUTION.md`, `AGENTS.md` y las reglas específicas de la superficie.
2. Inspeccionar el workspace en modo read-only.
3. Crear o validar el Mission Authorization Contract.
4. Declarar objetivo, alcance, exclusiones, riesgo, criterios de aceptación y plan de verificación.
5. Consultar capabilities y providers autorizados.
6. Crear OpenSpec y DAG cuando el cambio exceda una modificación trivial.
7. Trabajar en un worktree aislado.
8. Ejecutar pruebas estrechas y luego la suite relevante.
9. Registrar PASS, FAIL, NOT RUN y UNKNOWN sin ocultar incertidumbre.
10. Crear handoff con cambios, evidencia, riesgos, siguiente acción y aprobaciones pendientes.

El agente debe recordar que **el documento es una fuente de verdad operativa**, no un prompt decorativo. Si el repositorio tiene reglas más estrictas, prevalecen las reglas más estrictas; si existe conflicto, EOS debe detenerse y pedir decisión.

---

## 22. Estado actual y límites honestos

EOS Mission OS ya tiene un núcleo ejecutable verificable y una arquitectura coherente para comenzar el salto hacia una organización autónoma. La implementación local demuestra contratos, workflows, gates, misión, discovery, factory, proveedores, checkpoints, autonomía, verificación, accesibilidad, aprendizaje y MCP.

Todavía no está demostrado que pueda recibir cualquier proyecto del mundo y completarlo sin supervisión. Esa es la misión de evolución, no una capacidad que deba afirmarse prematuramente. La prueba real requerirá conectar el runtime con el repositorio de EOS/Alexander, proveedores autorizados, ambientes y una misión de producción controlada.

El criterio de éxito es que EOS pueda conducir la misión completa con pocas intervenciones humanas, escalar correctamente las decisiones de autoridad, recuperarse de fallos y entregar evidencia suficiente para que un tercero entienda qué ocurrió.

---

## Referencias

[1]: https://modelcontextprotocol.io/specification/2026-07-28 "Model Context Protocol Specification"  
[2]: https://cursor.com/docs/rules "Cursor Rules Documentation"  
[3]: https://github.com/Gentleman-Programming/gentle-ai "Gentleman Programming Gentle AI"  
[4]: https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ "Nielsen Norman Group: How to Conduct a Heuristic Evaluation"  
[5]: https://www.w3.org/TR/WCAG22/ "W3C Web Content Accessibility Guidelines 2.2"  
[6]: https://www.w3.org/WAI/test-evaluate/ "W3C Evaluating Web Accessibility"  
[7]: https://sre.google/sre-book/service-level-objectives/ "Google SRE: Service Level Objectives"  
[8]: https://sre.google/workbook/implementing-slos/ "Google SRE Workbook: Implementing SLOs"  
[9]: https://learn.microsoft.com/en-us/security/zero-trust/security-adoption-discipline-development-security "Microsoft Development Security"  
[10]: https://learn.microsoft.com/en-us/security/zero-trust/sfi/protect-software-supply-chain "Microsoft Software Supply Chain Security"  
[11]: https://github.com/LIDR-academy/lidr-specboot "LIDR Academy Specboot"  
[12]: https://docs.devin.ai/work-with-devin/devin-review "Devin Review Documentation"  
[13]: https://docs.nvidia.com/nemo/agent-toolkit/latest/index.html "NVIDIA NeMo Agent Toolkit"  
[14]: https://learn.microsoft.com/en-us/agent-framework/overview/ "Microsoft Agent Framework"  
[15]: https://developers.googleblog.com/agent-development-kit-easy-to-build-multi-agent-applications/ "Google Agent Development Kit"  
[16]: https://agents.md/ "AGENTS.md Open Format"  

---

**Documento maestro:** este archivo consolida y reemplaza como referencia de alto nivel a los documentos separados de arquitectura, autonomía, operación y Mission OS. Los archivos especializados pueden permanecer en el repositorio como documentos derivados, pero no deben contradecir este documento sin una decisión registrada.

---

# Apéndice A. Benchmark operativo de compañías líderes de IA y tecnología

## A.1. Cómo leer este benchmark

La operación interna completa de estas compañías no es pública. Por lo tanto, este apéndice separa tres niveles: **hecho documentado**, **patrón observado en productos o documentación pública** e **inferencia transferible**. No se debe presentar una inferencia como si fuera conocimiento privado de sus organizaciones.

La conclusión general es que ninguna de estas empresas confía en un único prompt, un único agente o una única barrera. Las arquitecturas maduras combinan runtime, herramientas, datos, identidad, evaluación, observabilidad, aislamiento, operaciones y aprendizaje. La diferencia es qué capa prioriza cada una.

## A.2. Comparación ejecutiva

| Empresa | Centro de gravedad público | Cómo operan los sistemas de IA | Lección principal para EOS |
| --- | --- | --- | --- |
| **OpenAI** | Primitives de modelo, tools, Agents SDK, tracing y evaluaciones | Agentes planifican, usan tools, colaboran mediante handoffs y conservan estado; la aplicación puede poseer el loop o delegarlo al SDK.[1] [18] | EOS necesita un runtime de runs, tools, handoffs, approvals, state y traces, pero debe conservar independencia de proveedor. |
| **Anthropic** | Context engineering, workflows simples, agentes y harnesses largos | Distingue workflow predefinido de agente dinámico; usa compresión, sesiones incrementales, progress files, feature ledgers, commits y herramientas bien acotadas.[2] [15] [16] | EOS necesita Context Compiler, Mission Ledger, initializer, sesiones incrementales y prevención explícita de one-shotting. |
| **Microsoft** | Agent Framework, Foundry, harness, workflows, middleware y evaluación | Combina agentes, harness para tareas largas, memoria, compaction, sesiones, middleware, graph workflows y evaluadores con rúbricas.[3] [20] | EOS debe tener un Agent Harness tipado, un Workflow/DAG explícito y middleware que intercepte acciones. |
| **Google** | ADK, runtime, herramientas y evaluación de trayectorias | Ofrece pipelines previsibles, routing dinámico, composición multiagente, tools, evaluación de trajectories y escalado de runtime.[4] [19] | EOS debe evaluar el recorrido de tools, no solo el resultado textual, y separar workflow de routing. |
| **Meta** | Modelos abiertos, seguridad por capas y herramientas de responsible use | Aplica pre-deployment assessments, red teaming, filtros, Prompt Guard, Llama Guard, CyberSecEval, model cards y mitigaciones a nivel de modelo y aplicación.[12] [13] | EOS necesita defense-in-depth, threat models por dominio, capability cards y red teaming humano + automático. |
| **Palantir** | Ontology, operaciones, gobernanza y despliegue | Conecta LLMs, datos, lógica y acciones en una Ontology; integra contexto, observabilidad, evaluación, roles, purpose, auditoría, automatización y release.[5] | EOS necesita una Mission Ontology y una capa semántica de objetos, relaciones, acciones, autoridad y evidencia. |
| **NVIDIA** | Framework-agnostic agent toolkit, profiling y observabilidad | Compone agentes, tools y workflows como funciones; integra frameworks, MCP, A2A, profiling, tracing, evaluación y UI de debugging.[11] | EOS debe ser modular, agnóstico de framework y capaz de instrumentar cualquier provider. |
| **Amazon** | AgentCore modular de producción | Separa harness, runtime aislado, memory, gateway, identity, sandbox, browser, observabilidad, evaluación, optimización, políticas y registry.[21] | EOS debe evolucionar a módulos de sandbox, identity/scopes, tool gateway, registry, eval/optimization y memoria durable. |
| **SpaceX** | Ingeniería de sistemas críticos, simulación, integración y reliability | La información pública no revela toda la arquitectura; sus roles muestran separación de flight software, simulación, integración, pruebas, reliability e infraestructura.[14] | EOS debe probar en sandbox/dry-run, separar build/integration/test/operations y definir abort, recuperación y modos degradados. |

## A.3. Patrones comunes de operación

### 1. Runtime por encima del modelo

Las compañías no tratan al modelo como el sistema completo. El modelo es un componente dentro de un runtime que gestiona estado, tools, contexto, permisos, errores, sesiones, observabilidad y evaluación. OpenAI diferencia una Responses API donde la aplicación controla el loop de un Agents SDK donde el SDK administra el loop; Microsoft separa agentes de workflows; Amazon separa harness y runtime; NVIDIA ofrece un toolkit alrededor de frameworks existentes.[18] [20] [21] [11]

**Decisión EOS:** `EOS Core` debe controlar misión, autoridad, estado, evidencia y policy evaluation. Los modelos son providers intercambiables. El runtime nunca debe delegar la decisión de autorización al LLM.

### 2. Workflow cuando se puede; agente cuando se necesita

Anthropic recomienda empezar por la solución más simple. Un workflow ofrece predictibilidad cuando los pasos son conocidos; un agente es útil cuando el camino depende de descubrimientos y el número de pasos es incierto.[15] Microsoft formula la misma distinción: agent para problemas abiertos y workflow para pasos definidos.[20]

**Decisión EOS:** `Strategy Resolver` debe decidir entre `deterministic`, `workflow`, `agent-loop`, `orchestrator-workers`, `research-parallel` y `human-led`. La autonomía no es un modo permanente: es una estrategia elegida por problema, incertidumbre y riesgo.

### 3. Contexto como recurso presupuestado

Anthropic describe el contexto como un recurso finito con pérdida de foco y recomienda cargar referencias just-in-time, mantener identificadores ligeros y aplicar progressive disclosure.[2] Los harnesses largos necesitan compaction, progreso durable y artefactos claros entre sesiones.[16]

**Decisión EOS:** crear un `Context Compiler` que produzca por turno el contexto mínimo suficiente: contrato, estado actual, restricciones, evidencia relevante, herramientas seleccionadas, artefactos referenciados y siguiente decisión. El historial completo permanece en storage; no se vuelca entero al modelo.

### 4. Evaluación de resultado y trayectoria

Google distingue respuesta final y trayectoria: un agente puede alcanzar el resultado por una secuencia incorrecta, costosa o insegura.[4] Microsoft combina rúbricas de calidad con seguridad y evaluación basada en traces.[3] OpenAI incorpora tracing y evaluaciones en el desarrollo de agentes.[1]

**Decisión EOS:** cada run producirá dos objetos evaluables:

```
Outcome Evaluation
  - Did the mission achieve its acceptance criteria?
  - Is the result useful, correct and safe?

Trajectory Evaluation
  - Did the agent choose authorized tools?
  - Did it follow the intended order or valid alternative?
  - Did it exceed budget, repeat work or bypass gates?
  - Did it escalate when required?
```

### 5. Seguridad en profundidad

Meta describe controles distribuidos entre datos, modelo, fine-tuning, prompt, respuesta, aplicación y operación; también combina evaluaciones, red teaming, Prompt Guard, Llama Guard y CyberSecEval.[12] [13] Palantir añade controles de rol, markings, purpose y auditoría; Amazon añade políticas deterministas que interceptan tool calls.[5] [21]

**Decisión EOS:** ningún prompt debe ser la única seguridad. El stack de defensa debe incluir constitución, policy engine, scopes, tool gateway, sandbox, secret scanning, input/output checks, environment isolation, red teaming, human approval y audit trail.

### 6. Ontología antes que automatización masiva

Palantir centra su propuesta en una Ontology que representa objetos, relaciones, lógica y acciones del dominio, en vez de permitir que agentes naveguen datos sin significado operativo.[5]

**Decisión EOS:** introducir `Mission Ontology` con entidades canónicas:

```
Intent
Mission
Project
Workspace
Artifact
Requirement
Unknown
Capability
Provider
Agent
Tool
Workflow
Node
Gate
Authority
Decision
Evidence
Outcome
Incident
Learning
```

Cada entidad debe tener owner, status, provenance, permissions, timestamps, relations y lifecycle. Una herramienta debe declararse sobre objetos y acciones semánticas, por ejemplo `create_requirement`, `inspect_workspace`, `run_verification`, `request_approval` o `record_outcome`, en vez de exponer un shell general como primera opción.

### 7. Long-running exige turnos de trabajo, no un loop infinito

Anthropic encontró que los agentes de larga duración tienden a intentar construir demasiado de una vez, dejar implementaciones incompletas o declarar el trabajo terminado prematuramente. La solución pública incluye initializer agent, progress log, feature list estructurado, un feature por sesión, commits descriptivos y verificación end-to-end.[16]

**Decisión EOS:** toda misión larga tendrá:

| Artefacto | Función |
| --- | --- |
| `mission.json` | Contrato, estado, autoridad y budgets |
| `feature_list.json` | Outcomes verificables, inicialmente fallidos hasta demostración |
| `progress.md` | Resumen humano-legible por sesión |
| `run-log.jsonl` | Eventos, tool calls, decisions y receipts |
| `checkpoints/` | Recuperación durable |
| `init.sh` o equivalente | Arranque reproducible |
| Git history/worktrees | Estados recuperables y separación de cambios |
| `handoff.md` | Transferencia entre sesiones y agentes |

### 8. Multiagente solo donde añade valor

Anthropic reporta que la investigación amplia se beneficia del patrón orchestrator-worker y de subagentes paralelos, pero que el coste de tokens aumenta considerablemente y el patrón es peor para tareas con dependencias fuertes.[17]

**Decisión EOS:** incluir un `Parallelization Budget`: número máximo de subagentes, tool calls, coste y tiempo. El orquestador debe declarar por qué una tarea es paralelizable y consolidar resultados con deduplicación, provenance y resolución de conflictos. Para código acoplado, debe preferir un DAG secuencial o una división por interfaces.

## A.4. Lo que EOS no debe copiar

No conviene copiar el tamaño, la nube, la cantidad de modelos ni la complejidad organizacional de estas empresas. EOS debe extraer principios:

| No copiar | Sustituir por |
| --- | --- |
| Microservicios desde el primer día | Monolito modular con contratos |
| Swarm de agentes por defecto | Orchestrator con workers solo cuando se justifica |
| Contexto ilimitado | Context compiler y presupuesto de atención |
| Dependencia de un cloud/model provider | Provider abstraction y portability |
| Autonomía sin sandbox | Dry-run, worktree, sandbox y scopes |
| Métrica única de calidad | Outcome + trajectory + safety + operations |
| Guardrails solo en prompt | Policy engine y defense-in-depth |
| Cambios infinitos durante una sesión | Incrementos, checkpoints, commits y clean state |
| Declarar éxito por build verde | Gates técnicos, producto, seguridad y negocio |

## A.5. Arquitectura EOS actualizada

```
                         EOS MISSION OS

 ┌──────────────────────────────────────────────────────────┐
 │ Mission Ontology + Event Log + Evidence Graph            │
 └──────────────────────────┬───────────────────────────────┘
                            │
 ┌──────────────────────────▼───────────────────────────────┐
 │ Mission Controller                                        │
 │ Intent → Context → Strategy → DAG → Authority → Outcome  │
 └──────┬─────────┬─────────┬─────────┬─────────┬───────────┘
        │         │         │         │         │
        ▼         ▼         ▼         ▼         ▼
 Context     Provider   Agent       Tool      Eval &
 Compiler    Registry   Harness     Gateway   Learning Plane
        │         │         │         │         │
        └─────────┴─────────┴─────────┴─────────┘
                            │
                    Execution Sandbox
                worktree · shell · browser
                 data scopes · secrets policy
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
       MCP / A2A                         Model Providers
```

### Componentes prioritarios

| Prioridad | Componente | Motivo |
| --- | --- | --- |
| P0 | Context Compiler | Reduce confusión y mantiene misiones largas operables. |
| P0 | Mission Ontology | Unifica estado, provenance, autoridad, evidencia y acciones. |
| P0 | Feature/Mission Ledger | Evita one-shotting y premature completion. |
| P0 | Outcome + Trajectory Eval | Mide resultado y camino de ejecución. |
| P0 | Tool Gateway | Intercepta cada acción, aplica scope, budget y policy. |
| P1 | Execution Sandbox | Aísla código, shell, browser y filesystem. |
| P1 | Capability/Provider Registry | Permite selección, health checks y fallback. |
| P1 | Agent Harness | Turnos, compaction, recovery, approvals, todo tracking. |
| P1 | Mission Ontology API | Acciones semánticas sobre objetos autorizados. |
| P2 | Registry UI / Command Center | Visualiza misiones, trazas, gates, evidencia y approvals. |
| P2 | Optimization Plane | A/B testing de prompts/tools/providers con bundles versionados. |
| P2 | A2A adapter | Delegación entre EOS y agentes externos. |

## A.6. Plan de construcción priorizado

### Sprint 1: Context Compiler y Mission Ledger

Implementar `compileContext(missionId, nodeId)` con presupuesto de tokens, resumen de contrato, unknowns, artefactos relevantes, tools seleccionadas, evidencia reciente y siguiente criterio. Crear `feature_list.json`, `progress.md`, `run-log.jsonl` y handoff automático.

**Definition of done:** una misión puede reiniciarse en una sesión nueva sin cargar el historial completo y el siguiente agente sabe qué feature sigue, qué falló y cómo verificarla.

### Sprint 2: Mission Ontology y Tool Gateway

Convertir entidades y actions en contratos tipados. Toda tool declara input, output, scope, side effects, reversibilidad, required authority, cost, timeout y evidence shape. El gateway intercepta, valida, ejecuta o bloquea.

**Definition of done:** ninguna tool externa puede ejecutar sin registro, provider saludable, scope válido y receipt.

### Sprint 3: Outcome + Trajectory Evaluation

Crear datasets de misiones, reference trajectories cuando sean posibles, custom rubrics, safety evaluators, tool-use metrics, budget metrics y trajectory checks. Reproducir runs y comparar versiones de agentes y providers.

**Definition of done:** EOS puede explicar que una misión alcanzó el outcome, pero utilizó una trayectoria no autorizada o demasiado costosa, y por ello debe repararse o pausarse.

### Sprint 4: Execution Sandbox

Añadir worktree aislado, shell sandbox, browser sandbox, filesystem allowlist, secret redaction, network policy, timeouts, cancellation y resource limits.

**Definition of done:** EOS puede implementar en un entorno reproducible y demostrar que el intento no tocó producción ni superficies fuera de alcance.

### Sprint 5: Agent Harness de larga duración

Implementar initializer, session runner, compaction, progress update, feature selection, clean-state check, commit y recovery. El harness no marca una feature como passing; solo Verification puede hacerlo.

**Definition of done:** varias sesiones consecutivas pueden avanzar un proyecto sin perder contexto ni repetir trabajo.

### Sprint 6: Research y multiagente controlado

Añadir orchestrator-worker con límites de paralelización, objetivos, formato de salida, herramientas permitidas, deduplicación y consolidación. Reservarlo para research, alternativas, auditoría y tareas independientes.

**Definition of done:** EOS puede demostrar que el paralelismo redujo tiempo o aumentó cobertura más de lo que costó en tokens y complejidad.

### Sprint 7: Operations y optimization

Integrar SLOs, error budgets, incidentes, runbooks, providers health, A/B testing y bundles de configuración versionados. Ninguna optimización cambia la constitución directamente.

**Definition of done:** EOS puede comparar dos versiones de prompt/tool/provider y promover una solo si la evaluación y el error budget lo permiten.

## A.7. Resultado estratégico

El patrón común de los grandes tecnológicos no es “más autonomía sin límites”. Es **autonomía con runtime, contexto, herramientas, evaluación, identidad, aislamiento y operación**. Palantir aporta la lección de la ontología y la acción gobernada; Anthropic, la disciplina de contexto, workflows simples y sesiones largas; OpenAI, la abstracción de runs, tools, handoffs y tracing; Microsoft, el harness y los workflows tipados; Google, la evaluación de trayectorias; Meta, la seguridad por capas; NVIDIA, la interoperabilidad y observabilidad; Amazon, la modularidad productiva; SpaceX, la simulación, integración y confiabilidad.

EOS debe convertirse en la capa que compone esos principios sin depender de ninguna empresa. El próximo hito no es sumar un agente más. Es implementar **Context Compiler + Mission Ontology + Tool Gateway + Outcome/Trajectory Evaluation + Long-running Harness** sobre el runtime existente y demostrarlo con una misión real controlada.

## Fuentes adicionales

[22]: https://openai.com/careers/software-engineer-agent-infrastructure-san-francisco/ "OpenAI Agent Infrastructure"  
[23]: https://openai.com/safety/ "OpenAI Safety and Responsibility"  
[24]: https://openai.com/index/updating-our-preparedness-framework/ "OpenAI Preparedness Framework"  
[25]: https://www.anthropic.com/news/model-context-protocol "Anthropic: Introducing the Model Context Protocol"  
[26]: https://docs.nvidia.com/nemo/agent-toolkit/latest/index.html "NVIDIA NeMo Agent Toolkit"  
[27]: https://palantir.com/docs/foundry/architecture-center/aip-architecture/ "Palantir AIP Architecture"  
[28]: https://ai.meta.com/blog/meta-llama-3-1-ai-responsibility/ "Meta Llama 3.1 Responsible AI"  
[29]: https://www.spacex.com/careers/jobs "SpaceX Careers and Engineering Roles"  
[30]: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk "Google Agent Development Kit"  
[31]: https://learn.microsoft.com/en-us/agent-framework/overview/ "Microsoft Agent Framework"  
[32]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html "Amazon Bedrock AgentCore"  

---

# Apéndice B. Secuencia P0 de construcción derivada de la investigación

La investigación confirma que EOS debe priorizar cinco capacidades transversales antes de ampliar la cantidad de agentes: **Context Compiler, Mission Ontology, Tool Gateway, Outcome/Trajectory Evaluation y Agent Harness de larga duración**. Estas capacidades aparecen con nombres distintos en OpenAI, Anthropic, Microsoft, Google, Palantir, NVIDIA y Amazon, pero cumplen la misma función estructural: convertir un modelo con tools en un sistema operable, observable y gobernable.

| Orden | Componente | Contrato mínimo | Criterio de terminado |
| --- | --- | --- | --- |
| 1 | **Mission Ledger + Context Compiler** | `compile(missionId, nodeId, budget)` | Una sesión nueva retoma misión, estado, evidencia, presupuesto y siguiente feature sin cargar todo el historial. |
| 2 | **Tool Gateway** | `authorize(tool, input, contract)` | Cada tool call produce `allow`, `approval-required`, `deny` o `pause`, junto con receipt y razón. |
| 3 | **Mission Ontology** | Entidades tipadas y relaciones con provenance | Una consulta reconstruye mission, project, agent, tool, gate, decision, evidence y outcome relacionados. |
| 4 | **Outcome + Trajectory Eval** | Rúbricas de resultado, trayectoria, seguridad y regresión | Un outcome correcto con trayectoria no autorizada falla; una trayectoria correcta con outcome incompleto no se entrega. |
| 5 | **Agent Harness** | initializer, session, compaction, retry, timeout, recovery, clean-state y handoff | Varias sesiones avanzan feature-by-feature y dejan el repositorio mergeable. |
| 6 | **Sandbox + Identity** | filesystem, shell, browser, red, secretos, scopes e identidad | Ninguna tool excede el scope y toda acción externa tiene identidad, expiración y auditoría. |

Toda herramienta debe declarar propósito, schemas, scopes, side effects, reversibilidad, clase de riesgo, timeout, coste, health check y forma de evidencia. El gateway debe bloquear tools no registradas, providers no saludables, scopes inválidos, presupuestos agotados, ambientes incorrectos y acciones sin aprobación.

El `Context Compiler` debe construir solo el contexto relevante: constitución, contrato de misión, nodo actual, requisitos activos, artefactos relevantes, evidencia reciente, tools seleccionadas, unknowns, fallos previos y siguiente decisión. El historial completo permanece fuera del contexto y se recupera por identificadores. Cada compilación debe producir un `ContextReceipt` con fuentes, presupuesto estimado, elementos excluidos y razón de selección.

EOS debe elegir el modo más simple compatible con la misión: función determinista, workflow gobernado, single-agent loop, orchestrator-workers, investigación paralela o human-led. No se debe construir todavía un swarm ilimitado, microservicios prematuros, pagos autónomos, despliegue productivo sin aprobación, memoria compleja sin caso de uso o modificación automática de la constitución.

La primera misión real debe ejecutarse sobre un repositorio controlado siguiendo este recorrido:

```
inspect read-only
→ authorization contract
→ compile context
→ feature ledger
→ plan one feature
→ isolated implementation
→ outcome + trajectory verification
→ security review
→ checkpoint
→ handoff
→ outcome record
```

EOS asciende de nivel únicamente con evidencia reproducible. El número de agentes, tokens, archivos o demos no constituye por sí mismo madurez.

---

# Apéndice C. Segunda ola de investigación: seguridad, datos, evaluación e industria

## C.1. De la seguridad como gate a la seguridad como sistema operativo

La investigación adicional confirma que la seguridad madura no es una revisión final. Google DeepMind utiliza niveles críticos de capacidad, evaluaciones de alerta temprana y mitigaciones escaladas por dominio y contexto.[22] xAI declara evaluaciones de seguridad desde pretraining hasta deployment, model cards, evaluaciones públicas y canales de reporte.[23] Cohere presenta un marco de seguridad frontier que identifica, prueba y mitiga riesgos durante el ciclo del modelo.[30] NIST organiza la gestión mediante gobernar, mapear, medir y gestionar riesgos.[26]

**EOS debe implementar `Capability Risk Levels` y `Early-Warning Evaluations`.** El nivel de autonomía se determina por capacidad efectiva, herramientas, datos, entorno, impacto y reversibilidad, no solo por la intención escrita por el usuario. Cada capability y provider debe tener una tarjeta con intended use, limitaciones, evaluaciones, riesgos y mitigaciones.

## C.2. Datos gobernados y contexto semántico

Snowflake Cortex Agents reúne datos estructurados y no estructurados mediante semantic views, search, tools, skills, ejecución aislada y conectores MCP. Sus agentes poseen threads persistentes, runs que emiten eventos de planificación y tool calls, y controles de acceso ligados a privilegios y contexto de ejecución.[24] Palantir ya mostró que una Ontology conecta objetos, relaciones, lógica, acciones y permisos; Snowflake confirma que una plataforma de datos necesita una semántica operativa para que el agente actúe con seguridad.

**EOS debe distinguir `Thread`, `Run`, `Mission`, `Tool`, `Skill`, `Agent`, `Semantic Context` y `Resource Budget`.** La conversación persistente no debe confundirse con una ejecución; el run debe emitir eventos y receipts; la autoridad debe resolverse sobre identidad, propósito y scope.

## C.3. Evaluación independiente y basada en evidencia

MLflow propone Evaluation-Driven Development: datasets versionados con inputs y expectativas, predict functions y scorers, combinados con feedback humano, LLM-as-a-judge, evaluación sistemática, regression testing y monitoreo en producción.[25] Inspect AI separa datasets, solvers, tools y scorers y permite evaluar coding, agentes, reasoning, comportamiento y multimodalidad en sandbox, incluyendo tools MCP y agentes externos.[32]

**EOS debe poseer un Eval Plane que pueda evaluarse a sí mismo y a proveedores externos.** Cada mission capability necesita dataset de aceptación, scorer funcional, scorer de trayectoria, suite de seguridad, regresiones y criterios de revisión humana. La evidencia de una evaluación debe permanecer independiente de la afirmación del agente que está siendo evaluado.

## C.4. Ingeniería de procesos e industrialización

Toyota enseña que la automatización madura parte de comprender el trabajo manualmente, eliminar desperdicio, variabilidad y sobrecarga, hacer el flujo reproducible y después automatizarlo. Su principio jidoka detiene el proceso ante anomalías y evita que un defecto fluya al siguiente paso; Just-in-Time mantiene el flujo sincronizado.[27]

Salesforce formula un Agent Development Lifecycle específico porque los agentes son no deterministas: ideación y diseño, desarrollo inner loop, testing y validación, despliegue/release y monitoreo/tuning outer loop.[29] Mistral Studio añade workflows persistentes con retry/resume, experimentos controlados, campañas versionadas, jueces, datasets de tráfico real, observabilidad, guardrails, registry, lineage y rollback.[31]

**EOS debe adoptar una disciplina de jidoka para agentes:** ante una anomalía de evidencia, seguridad, presupuesto, scope o resultado, la misión se detiene antes de propagar el defecto. Antes de automatizar una capability, EOS debe ejecutarla manualmente y documentar su contrato. Después, la automatización debe conservar señales de anomalía, abort, retry, reparación y escalamiento.

## C.5. Infraestructura como producto reproducible

NVIDIA describe AI Factories como arquitecturas validadas y repetibles con compute, networking, storage, Kubernetes, provisioning y observabilidad. Sus guías separan deployment, storage y health monitoring, y soportan agentic AI, simulación, HPC, training e inference.[28]

**EOS debe tener una referencia de despliegue reproducible**, incluso si al principio corre como monolito local. El runtime debe separar control plane, execution plane, evidence/storage plane, telemetry y adapters de modelos. La portabilidad debe permitir local, VM, container o cloud sin cambiar la constitución ni los contratos.

## C.6. Deducción combinada para EOS

Los patrones convergen en una arquitectura de seis capas:

```
1. Mission & Ontology Plane
   intent · project · requirement · unknown · authority · outcome

2. Context & Memory Plane
   compiler · thread · run · semantic context · checkpoints · handoff

3. Agent & Workflow Plane
   harness · DAG · routing · workers · skills · MCP/A2A

4. Tool & Execution Plane
   gateway · scopes · sandbox · browser · shell · providers · secrets

5. Evaluation & Safety Plane
   outcome · trajectory · security · capability risk · early warning

6. Operations & Learning Plane
   SLO · error budget · incidents · registry · lineage · rollback · learning
```

EOS no debe crecer agregando agentes aislados. Debe reforzar estas capas en orden, demostrando cada una con una misión reproducible. Un nuevo agente solo se justifica si aumenta cobertura o reduce tiempo sin romper trazabilidad, presupuesto, seguridad o claridad de roles.

## C.7. Nuevas prioridades derivadas

| Prioridad | Capacidad | Por qué ahora |
| --- | --- | --- |
| P0 | `Capability Risk Levels` + early-warning evals | Ajusta autonomía a capacidad y contexto, no a prompts. |
| P0 | `Mission Ontology` con Thread/Run/Tool/Skill | Evita que el estado quede disperso en JSON y conversaciones. |
| P0 | `Eval Plane` externo y reproducible | Impide que EOS se otorgue a sí mismo un PASS sin evidencia independiente. |
| P0 | `Jidoka Controller` | Detiene misión ante anomalías antes de propagar defectos. |
| P1 | `Context Compiler` con semantic context | Reduce pérdida de contexto y carga innecesaria al modelo. |
| P1 | `Tool Gateway` con purpose y identity | Vincula cada acción a un alcance, identidad, riesgo y receipt. |
| P1 | `Agent Harness` multi-sesión | Convierte long-running en sesiones recuperables y verificables. |
| P1 | `Reference Deployment` | Hace portable y reproducible el runtime. |
| P2 | `Registry + Lineage + Rollback` | Permite gobernar modelos, agents, prompts, skills, datasets y workflows. |
| P2 | `Optimization Plane` | Experimenta con providers y configuraciones sin mutar la constitución. |

## C.8. Límite epistemológico

Las fuentes públicas describen productos, frameworks, políticas, ofertas de empleo, investigaciones y prácticas declaradas. No demuestran toda la operación interna de cada compañía, y en el caso de SpaceX u otras organizaciones privadas la arquitectura interna completa no está disponible. EOS debe usar estas fuentes como patrones y hipótesis verificables, no como permiso para afirmar conocimiento secreto.

## Fuentes de la segunda ola

[22]: https://deepmind.google/blog/introducing-the-frontier-safety-framework/ "Google DeepMind Frontier Safety Framework"  
[23]: https://x.ai/safety "xAI Safety"  
[24]: https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents "Snowflake Cortex Agents"  
[25]: https://mlflow.org/docs/latest/genai/eval-monitor/ "MLflow LLM and Agent Evaluation"  
[26]: https://www.nist.gov/itl/ai-risk-management-framework "NIST AI Risk Management Framework"  
[27]: https://global.toyota/en/company/vision-and-philosophy/production-system/ "Toyota Production System"  
[28]: https://www.nvidia.com/en-us/technologies/enterprise-reference-architecture/ "NVIDIA Enterprise Reference Architectures"  
[29]: https://architect.salesforce.com/docs/architect/fundamentals/guide/agent-development-lifecycle.html "Salesforce Agent Development Lifecycle"  
[30]: https://cohere.com/blog/building-trust-in-ai-coheres-approach-to-ai-governance "Cohere AI Governance"  
[31]: https://mistral.ai/products/studio/ "Mistral Studio"  
[32]: https://inspect.aisi.org.uk/ "Inspect AI"  

---

# Apéndice D. Interoperabilidad, protocolos y control de capacidades

## D.1. MCP y A2A cumplen funciones diferentes

MCP estandariza la conexión entre hosts, clients y servers mediante JSON-RPC. Sus servers pueden ofrecer `resources`, `prompts` y `tools`, y el protocolo contempla progreso, cancelación, logging, roots, elicitation y sampling.[34] A2A complementa MCP para que agentes opacos colaboren mediante tareas, mensajes, artifacts, Agent Cards, estados y capability discovery, con soporte para long-running tasks, autenticación y negociación de modalidades.[33]

EOS no debe tratar MCP y A2A como sinónimos:

| Capa | Pregunta que responde | Uso de EOS |
| --- | --- | --- |
| **MCP** | ¿Qué contexto y herramientas puede consumir o exponer un agente? | Tools, resources, prompts, connectors y acceso controlado a sistemas. |
| **A2A** | ¿Cómo delegan agentes tareas entre sí? | Remote agents, task lifecycle, artifacts, feedback y colaboración. |
| **EOS Core** | ¿Quién tiene autoridad y qué puede ocurrir? | Mission ontology, policy, scopes, budgets, gates, evidence y learning. |

Un agente remoto nunca obtiene autoridad global por estar disponible vía A2A. EOS debe envolver la tarea remota en un `Mission Node`, validar el `Agent Card`, asignar un scope temporal, imponer presupuesto, exigir artifact con provenance y evaluar la trayectoria antes de aceptar el resultado.

## D.2. Consentimiento y autorización no son opcionales en el diseño

MCP exige que las implementaciones consideren consentimiento y control del usuario, privacidad, autorización explícita de tools y cautela ante rutas de acceso a datos y ejecución de código.[34] Para transportes HTTP, su especificación de autorización utiliza OAuth 2.1, Protected Resource Metadata, discovery, resource indicators y scopes mínimos; en stdio las credenciales se gestionan desde el entorno.[35]

EOS debe añadir una capa por encima del protocolo:

```
MCP discovery
→ capability verification
→ provider health check
→ tool contract validation
→ identity + purpose + scope
→ risk decision
→ consent/approval if required
→ sandboxed execution
→ receipt + trace + outcome
```

La descripción de una tool remota no se considera evidencia de seguridad. La fuente de confianza debe incluir servidor, versión, contrato, health check, permisos, historial de incidentes, resultados de evaluación y provenance.

## D.3. Evaluación externa de EOS

Inspect AI demuestra que la evaluación puede modelarse como `dataset + solver + scorer`, incluir tools MCP, agentes externos, sandbox y tareas multi-turno.[32] MLflow propone datasets versionados, expectativas, judges, feedback humano, regression testing y monitoreo.[25] EOS debe combinar ambos patrones y evaluarse desde fuera del runtime que ejecuta la misión.

Cada release del EOS runtime debe ejecutar:

| Suite | Contenido |
| --- | --- |
| **Core deterministic** | Estado, políticas, schemas, budgets, checkpoints y receipts. |
| **Mission suite** | Intent resolution, factory, unknowns, DAG y replanning. |
| **Tool safety** | Scope escape, prompt injection, secrets, unauthorized calls y sandbox escape. |
| **Trajectory** | Orden de tools, escalamiento, retries, redundancia, coste y duración. |
| **Outcome** | Acceptance criteria funcionales, UX, seguridad, operación y producto. |
| **Recovery** | Reinicio, provider failure, cancellation, timeout, resume y rollback. |
| **Human review** | Decisiones irreversibles, conformidad WCAG completa, claims, negocio y producción. |

Un resultado textual correcto no basta. El estado final es `PASS` solo cuando outcome, trajectory, safety y evidencia cumplen sus gates; de lo contrario es `FAIL`, `UNKNOWN`, `PAUSE` o `REVIEW_REQUIRED`.

## D.4. Capacidad efectiva y autonomía graduada

Los marcos de Google DeepMind introducen niveles críticos de capacidad, evaluaciones de alerta temprana y mitigaciones ajustadas al contexto.[22] EOS debe aplicar el mismo razonamiento al runtime: una tarea puede parecer de bajo riesgo en abstracto, pero volverse de alto riesgo al combinar datos sensibles, shell, browser, acceso externo, despliegue o duración larga.

Por ello, cada misión calcula:

```
Effective Capability
= model capability
+ selected tools
+ accessible data
+ environment privileges
+ autonomy level
+ duration/budget
+ external impact
```

El resultado determina scopes, sandbox, reviewer, rate limits, logging, approval, model/provider eligibility y condiciones de release. Subir de autonomía requiere evidencia de que la capability se comporta dentro de límites, no solo que el agente la describe correctamente.

## D.5. Jidoka para el runtime

Inspirado en Toyota, EOS debe detener automáticamente la misión cuando detecta una anomalía crítica en evidencia, scope, seguridad, presupuesto, provider, contrato o outcome.[27] La detención no es un fallo del sistema; es una acción correcta de control. La misión debe generar un incident record, conservar checkpoint, explicar la anomalía y elegir `repair`, `replan`, `approval` o `rollback`.

La automatización solo se amplía cuando el proceso manual ya fue comprendido, medido y convertido en contrato. EOS no debe automatizar un proceso ambiguo para ocultar su ambigüedad.

## D.6. Capas de operación que deben estar presentes antes de producción

```
Evidence Graph + Mission Ontology
  ↓
Context Compiler + Agent Harness
  ↓
Tool Gateway + MCP/A2A adapters
  ↓
Identity, scopes, sandbox, secrets and network policy
  ↓
Outcome/Trajectory/Safety Evaluation
  ↓
SLO, error budget, incident response and rollback
  ↓
Versioned learning, registry and controlled optimization
```

Esta estructura es la síntesis transferible de los patrones investigados. EOS debe crecer como un sistema operativo de misiones, no como una colección de agentes con permisos acumulativos.

## Fuentes

[33]: https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/ "Google Agent2Agent Protocol"  
[34]: https://modelcontextprotocol.io/specification/2025-06-18 "Model Context Protocol Specification"  
[35]: https://modelcontextprotocol.io/specification/draft/basic/authorization "MCP Authorization Specification"  

---

# Apéndice E. Platform engineering e instrucciones portables

GitHub documenta una arquitectura de instrucciones por capas para agentes de ingeniería: instrucciones globales del repositorio, `AGENTS.md` como contexto portable, reglas específicas por ruta, agent instructions, skills y servidores MCP.[37] Esto confirma que EOS debe ser portable y vivir junto al código, no depender únicamente de un prompt externo o de memoria de una herramienta concreta.

## Contrato de precedencia recomendado

```
EOS Constitution
  ↓
Project Operating Contract
  ↓
AGENTS.md
  ↓
.github/copilot-instructions.md / Cursor rules / Devin instructions
  ↓
Subsystem instructions
  ↓
Task specification
  ↓
Runtime policy and Tool Gateway
```

Las capas inferiores pueden especializar, pero no relajar una prohibición de una capa superior. EOS debe registrar qué archivos de instrucciones fueron descubiertos, desde qué branch/worktree, con qué hashes y qué precedencia se aplicó. La rama de origen del cambio es la fuente de contexto operativo de la revisión; una regla nueva no debe poder esconderse en una rama base o ser ignorada por el agente.

El patrón de platform engineering también indica que EOS debe ofrecer **golden paths**: contratos, plantillas, worktrees, pipelines de evaluación, observabilidad y despliegues aprobados que reduzcan carga cognitiva sin eliminar la capacidad de desviarse con una justificación registrada. La plataforma debe ser un producto para agentes y humanos, con catálogo, ownership, documentación, templates y APIs estables.

## Implicaciones para EOS

| Capacidad | Implementación |
| --- | --- |
| **Repositorio** | `AGENTS.md`, constitución y reglas especializadas versionadas. |
| **Catálogo** | Mission/Project/Agent/Tool/Skill/Provider Registry con owner y lineage. |
| **Golden paths** | Plantillas de misión, worktree, test suite, deploy y rollback. |
| **Experiencia** | Cursor como Command Center, MCP como acceso y EOS como autoridad. |
| **Gobernanza** | Precedencia de reglas, scopes, approvals, receipts y branch-aware context. |
| **Feedback** | PR review, traces, incidents, outcomes y learning loop. |

[37]: https://docs.github.com/es/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review "GitHub Copilot Code Review"

---

# Apéndice F. Capability thresholds y defensa en profundidad

Los marcos de OpenAI, Anthropic y Google DeepMind convergen en una idea que EOS debe adoptar: la autonomía no puede clasificarse solo por la tarea descrita; debe clasificarse por la **capacidad efectiva del sistema** y sus posibles vías de daño.[40] [41] [42]

## F.1. EOS Mission Capability Levels

| Nivel | Descripción | Controles mínimos |
| --- | --- | --- |
| **MCL-0 Observación** | Lectura, clasificación, síntesis y planificación sin cambios externos. | Read-only, sin secrets, evidencia de fuentes. |
| **MCL-1 Construcción reversible** | Edición en worktree o sandbox con tests y rollback local. | Scope de archivos, budget, tests, diff review y checkpoint. |
| **MCL-2 Integración controlada** | Uso de APIs, MCP, datos no públicos o ambientes de staging. | Identity, purpose, scopes temporales, audit trail, approvals condicionadas. |
| **MCL-3 Impacto externo** | Deploy, mensajes, cambios de datos, pagos, publicación o operación de usuarios. | Human approval explícita, canary, rollback, SLO, incident plan y doble evidencia. |
| **MCL-4 Capacidad crítica** | Acceso combinado a sistemas sensibles, autonomía larga, high-impact decisions o potencial de daño severo. | Pausa por defecto, sandbox fuerte, revisión experta, safeguards report y autorización especial. |

El nivel se recalcula cuando cambia cualquiera de estos factores: modelo, provider, tool, dataset, credencial, branch, environment, duración, volumen, modalidad, número de agentes o impacto externo. El sistema debe elevar el nivel por composición aunque cada componente individual parezca de bajo riesgo.

## F.2. Capability Report y Safeguard Report

Antes de promover una capability a una misión autónoma, EOS genera dos artefactos separados. El `Capability Report` documenta qué puede hacer el sistema, bajo qué condiciones, con qué tasa de éxito, qué fallos conoce y qué unknowns persisten. El `Safeguard Report` documenta controles preventivos, detectivos y correctivos, pruebas adversariales, residual risk, límites y condiciones de rollback.

La decisión de release no se toma porque el agente diga “completado”. Se toma cuando el capability report y safeguard report cumplen el gate, el trajectory scorer no detecta desviaciones y el reviewer apropiado acepta el residual risk.

## F.3. Defensa en profundidad para EOS

```
Identity and purpose
  → least-privilege scopes
  → input/context screening
  → tool allowlist and contract checks
  → sandbox/network/filesystem isolation
  → real-time policy intervention
  → asynchronous monitoring
  → post-hoc incident detection
  → checkpoint, rollback and learning
```

Ninguna capa debe considerarse suficiente por sí misma. La defensa en profundidad debe cubrir tanto misuse externo como error del propio agente, provider defectuoso, prompt injection, tool poisoning, credential leakage, scope drift, reward hacking y decisiones incorrectas bajo incertidumbre.

## Fuentes

[40]: https://openai.com/index/updating-our-preparedness-framework/ "OpenAI Updated Preparedness Framework"  
[41]: https://www.anthropic.com/responsible-scaling-policy "Anthropic Responsible Scaling Policy"  
[42]: https://deepmind.google/frontier-safety/ "Google DeepMind Frontier Safety"  

---

# Apéndice G. El patrón cloud: Build, Scale, Govern, Optimize

Las plataformas empresariales actuales convergen en cuatro funciones. Microsoft Foundry separa agentes definidos por prompt de agentes hospedados con código y ofrece catálogo, runtime, MCP, identidad, RBAC, observabilidad y publicación versionada.[43] Google organiza su Agent Platform en Build, Scale, Govern y Optimize, incorporando ADK, runtime stateful, sessions, Memory Bank, Agent Registry, Agent Identity, Agent Gateway, threat scanning y simulación multi-turno.[45] AWS AgentCore descompone el runtime en Harness, Runtime, Memory, Gateway, Identity, Sandbox, Browser, Observability, Evaluations, Optimization, Policy y Registry.[46]

EOS debe reflejar el mismo patrón sin copiar el tamaño de esas nubes:

```
EOS Build
  specifications · mission factory · skills · templates · experiments

EOS Scale
  sessions · checkpoints · workers · queues · long-running runs

EOS Govern
  ontology · identity · purpose · scopes · policy · registry · consent

EOS Optimize
  evaluation · trajectories · incidents · A/B experiments · learning · rollback
```

La infraestructura inicial puede seguir siendo un monolito modular local, pero cada módulo debe tener una interfaz equivalente a estas superficies. Esto permite que el runtime evolucione desde local/stdio hacia container/HTTP/cloud sin reescribir la constitución ni la lógica de misión.

## Control Plane de EOS

El `EOS Control Plane` deberá resolver cinco preguntas antes de cada acción:

| Pregunta | Contrato |
| --- | --- |
| **Quién actúa** | Identity / Agent / Provider principal y delegados. |
| **Para qué actúa** | Mission purpose, goal y expected outcome. |
| **Qué puede hacer** | Capability, tool contract, scope y environment. |
| **Cómo se controlará** | Policy, risk level, budget, evaluator y approval. |
| **Cómo se sabrá que terminó bien** | Outcome, trajectory, evidence, SLO y human review. |

No se permitirá que un modelo o provider resuelva por sí mismo estas preguntas. El modelo propone; el Control Plane autoriza, registra, limita y verifica.

[43]: https://learn.microsoft.com/en-us/azure/foundry/agents/overview "Microsoft Foundry Agent Service"  
[45]: https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview "Google Gemini Enterprise Agent Platform"  
[46]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html "Amazon Bedrock AgentCore"  

---

# Apéndice H. Fault management y safe mode

NASA muestra que los sistemas autónomos críticos no pueden dejar la recuperación para el final. Fault management debe detectar, aislar y recuperar fallos; sus requisitos y pruebas deben estar dentro de la arquitectura desde el inicio, porque añadirlo tarde crea cambios secundarios, falta de visibilidad y restricciones operativas sobre funciones no probadas.[47]

EOS debe implementar un `FDIR/Jidoka Controller` con cuatro estados:

```
NOMINAL → ANOMALY_DETECTED → ISOLATED → RECOVERED | SAFE_MODE | HUMAN_REVIEW
```

Cada capability declara:

| Elemento | Pregunta |
| --- | --- |
| **Detector** | ¿Qué señal indica que el comportamiento salió de lo esperado? |
| **Isolation** | ¿Qué tool, provider, agent, credential o worktree se aísla? |
| **Recovery** | ¿Qué retry, repair, rollback o provider substitution es seguro? |
| **Safe mode** | ¿Qué mínima operación se conserva sin aumentar impacto? |
| **Evidence** | ¿Qué trace, receipt y incident record demuestran lo ocurrido? |
| **V&V** | ¿Qué pruebas demuestran que la recuperación funciona? |

Un agente nunca debe continuar por inercia después de una anomalía importante. El estado seguro de EOS conserva evidencia y contexto, reduce permisos y espera una decisión válida de `repair`, `replan`, `approval` o `resume`.

[47]: https://llis.nasa.gov/lesson/2049 "NASA Improving Fault Management for Spaceflight Missions"  

---

# Apéndice I. Catálogo semántico y gobierno unificado

Databricks Unity Catalog muestra un patrón que EOS debe adoptar: un catálogo único puede gobernar datos, apps, modelos, agentes y MCPs con descubrimiento, semántica compartida, permisos granulares, lineage, auditoría y controles de runtime.[48] Esto complementa la Ontology de Palantir y el semantic layer de Snowflake.

EOS necesita una `Mission Catalog` con objetos mínimos:

```
Project · Mission · Requirement · Unknown · Agent · Skill · Tool · MCP Server
Provider · Model · Dataset · Prompt · Run · Thread · Artifact · Policy · Gate
Incident · Outcome · SLO · Evidence · Owner · Environment · Credential Scope
```

Cada objeto debe tener identidad, owner, purpose, versión, estado, tags de riesgo, permisos, relaciones, provenance, última evaluación, health y condiciones de uso. Una tool no es solo una función: es un asset gobernado que puede tener datos sensibles, side effects, costes, latencia, requisitos de autorización y un historial de incidentes.

[48]: https://www.databricks.com/product/unity-catalog "Databricks Unity Catalog"  

---

# Apéndice J. Infraestructura modular y separación de investigación/producción

Meta describe una plataforma de IA que integra hardware especializado, networking, software y clusters de gran escala para crear, desplegar, escalar y operar modelos; PyTorch funciona como framework modular que permite iteración de investigación y estabilidad de producción.[49]

EOS debe separar explícitamente:

```
Research Plane
  experiments · synthetic data · provider comparisons · speculative agents

Production Plane
  approved models · locked tools · SLOs · stable policies · rollback

Shared Contracts
  model interface · tool interface · trace schema · dataset schema · evidence schema
```

La optimización del modelo, hardware o provider no debe modificar la autoridad de la misión. EOS puede sustituir un provider si el contrato de capability se mantiene; debe conservar lineage y demostrar que el nuevo provider no reduce seguridad, calidad, coste o portabilidad.

[49]: https://ai.meta.com/infrastructure/ "Meta AI Infrastructure"  

---

# Apéndice K. Mission Twin: simulación y trazabilidad viva

Siemens muestra que un digital twin combina modelo, datos en tiempo real, simulación, análisis, control y lifecycle traceability. La representación virtual conecta requisitos, diseño, producción, servicio y desempeño para anticipar fallos y validar cambios antes de aplicarlos.[50]

EOS debe desarrollar un `Mission Twin` como representación ejecutable del proyecto:

```
Human Intent
  → Requirements and Unknowns
  → Architecture and Design Decisions
  → Agents, Tools, Providers and Permissions
  → Workflows, Runs and Artifacts
  → Tests, Evaluations and Incidents
  → Deployment, SLOs and Outcomes
  → Learning and Next Mission
```

El Mission Twin no reemplaza el código ni la realidad operacional. Su función es conectar evidencia y permitir preguntas como: qué requirement depende de qué decisión; qué tool produjo qué artifact; qué provider participó; qué pruebas cubren el cambio; qué incident motivó la modificación; y qué outcome confirma o refuta la hipótesis.

Antes de un cambio de alto impacto, EOS debería poder ejecutar una simulación o dry-run sobre el Mission Twin, detectar conflictos de permisos, presupuestos, dependencias y SLOs, y solo después solicitar autorización o ejecutar.

[50]: https://www.siemens.com/en-us/technology/digital-twin/ "Siemens Digital Twin"  

---

# Apéndice L. Ontology, workflows y evaluación operacional

Palantir AIP refuerza un patrón distintivo: la IA empresarial no se evalúa solo como conversación, sino como workflow operativo conectado a una Ontology, con objetos, acciones, funciones, permisos, lineage, observabilidad y AIP Evals.[51] [52]

EOS debe llevar cada misión a una ontología operacional donde un agente no pueda “hacer cualquier cosa” de forma abstracta. Debe seleccionar una acción tipada sobre un objeto o recurso, declarar precondiciones, emitir un plan, ejecutar bajo autorización y dejar un artifact con resultado y provenance.

```
Object/Resource
  → Typed Action
  → Preconditions
  → Policy Decision
  → Agent Proposal
  → Execution
  → Evaluation
  → Ontology Update
  → Incident or Outcome
```

La ontología de EOS debe representar no solo archivos de software, sino decisiones, proveedores, gates, environments, credentials, deployments, incidents, SLOs y outcomes. Esto permite que la autonomía sea operacionalmente consciente y que el sistema pueda razonar sobre dependencias y consecuencias, no solo sobre texto.

[51]: https://palantir.com/docs/foundry/aip/aip-features/ "Palantir AIP Features"  
[52]: https://palantir.com/docs/foundry/aip/overview/ "Palantir AIP Overview"  

---

# Apéndice M. AgentOps, platform engineering y DevSecOps

EOS debe operar como una plataforma interna de ingeniería para agentes, no como una colección de prompts. DORA describe las plataformas como productos internos con golden paths, self-service, feedback claro, extensibilidad y scorecard de delivery, estabilidad, experiencia y éxito de tareas. También advierte que la IA amplifica tanto las fortalezas como los cuellos de botella organizacionales.[54]

## M.1. Telemetría estándar

EOS adoptará un esquema compatible con OpenTelemetry para que cada misión emita traces, metrics y logs interoperables. Un trace debe poder responder: qué intención inició la misión, qué agente tomó la decisión, qué modelo generó la propuesta, qué tool se invocó, con qué scopes, qué artefacto cambió, qué evaluación ocurrió y qué outcome resultó.[53]

## M.2. Skills como supply chain

Las skills se tratarán como código ejecutable y contenido de control, no como documentación inocua. Antes de instalar una skill EOS debe verificar publisher, firma, versión, permisos, dependencias, hash, sandbox, egress y resultados de scanning. Una skill no puede leer secretos, memoria privada o archivos fuera de scope por el simple hecho de estar instalada. OWASP identifica la capa de skills como una superficie distinta de la del modelo y MCP, porque define el comportamiento multi-step que conecta herramientas, memoria y acciones.[55]

## M.3. SSDF aplicado a EOS

El ciclo de cada capability debe mapearse a NIST SSDF:

| SSDF | EOS |
| --- | --- |
| **Prepare Organization** | Owners, roles, threat model, security requirements, training y environment policy. |
| **Protect Software** | Branch/worktree isolation, signatures, provenance, secrets management, least privilege. |
| **Produce Secure Software** | Secure design, tests, SAST/DAST, dependency checks, SBOM, artifact attestations y release gates. |
| **Respond to Vulnerabilities** | Incident records, triage, containment, rollback, disclosure, patch, regression test y learning. |

SP 800-218A añade que los sistemas GenAI requieren controles específicos para datos, modelos, evaluaciones, prompts, tools, provenance y dual-use capabilities.[56]

La plataforma debe automatizar el máximo posible, pero debe mantener la diferencia entre `check passed`, `risk assessed` y `humanly reviewed`. Un scanner no convierte una afirmación en verdad.

[53]: https://opentelemetry.io/blog/2025/ai-agent-observability/ "OpenTelemetry AI Agent Observability"  
[54]: https://dora.dev/capabilities/platform-engineering/ "DORA Platform Engineering"  
[55]: https://owasp.org/www-project-agentic-skills-top-10/ "OWASP Agentic Skills Top 10"  
[56]: https://csrc.nist.gov/Projects/ssdf "NIST Secure Software Development Framework"  

---

# Apéndice N. Matriz de transferibilidad y decisiones

La investigación comparativa completa se consolidó en `EOS_TRANSFERABILITY_MATRIX.md`. La matriz separa patrones documentados, inferencias y hipótesis, y clasifica cada decisión como P0, P1, P2 o No ahora.

La síntesis P0 es: **runtime separado del modelo; control plane de identidad y propósito; tool gateway; Mission Ontology; evaluación de trayectoria e independiente; OpenTelemetry; checkpoints; sandbox; capability thresholds; defense in depth; provenance de supply chain; FDIR/Jidoka; provider abstraction y registry gobernado**.

La síntesis P1 es: **platform engineering; Mission Twin; separación research/production; optimización versionada y A/B; golden paths por tipo de proyecto; simulación y fault injection**.

La síntesis No ahora es: **swarm ilimitado, microservicios prematuros, autonomía productiva sin sandbox, memoria no versionada y declarar éxito por el texto del agente**.

La decisión de arquitectura resultante es una separación entre `Human/Command Center`, `Mission Control Plane`, `Mission Runtime`, `Capability Plane`, `Evidence/Evaluation Plane` y `Execution Environments`. Los modelos proponen; EOS decide, autoriza, registra, limita y verifica.

El documento no afirma conocer procesos internos privados de las empresas. Cuando la evidencia pública no basta, el patrón se conserva como hipótesis y debe validarse mediante experimentos propios.

---

# Apéndice O. Arquitectura rediseñada de construcción

La arquitectura consolidada se documenta en `EOS_REDESIGNED_BUILD_ARCHITECTURE.md`. La conclusión es que EOS debe ser un **Mission Control Plane** que coordina modelos, agentes, tools, MCPs, datos, ambientes y personas bajo contratos observables.

Sus módulos centrales son: Mission Control, Mission Ontology, Authority Engine, Capability Registry, Tool Gateway, Provider Router, Mission Runtime, FDIR/Jidoka, Evidence Plane, Evaluation Plane, Mission Twin y Learning Plane.

La secuencia P0 queda fijada así:

```
Event Ledger + Mission Catalog
  → Authority Engine + Tool Gateway
  → Capability Registry + Provider Router
  → Long-running Harness + FDIR
  → Trajectory Evaluation + OpenTelemetry
  → Sandbox + Identity + Supply Chain
  → Mission Twin + Impact Simulation
```

P1 añade Registry UI, golden paths, plugins de Project Factory, red teaming, A/B de prompts y tools, online evaluation, SLO dashboard, provenance firmado, A2A y colaboración multiagente.

La regla de progreso es que cada nueva capacidad debe demostrar una mejora observable en outcomes, seguridad, recovery, coste, calidad o experiencia. No se añadirá complejidad por imitación superficial de una gran empresa.
