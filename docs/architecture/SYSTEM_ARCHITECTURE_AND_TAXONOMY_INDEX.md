# EOS Mission OS — Índice Maestro de Arquitectura y Taxonomía Empresarial

> **Estándar:** Enterprise Defense-Grade & Monorepo Clean Architecture  
> **Gobernanza:** `NODE_BUILTINS_ONLY` (L0), $\Delta = 0$ en proyectos externos, JSON Schema Draft 2020-12.

---

## 1. Estructura de Directorios de Clase Mundial

```
EOS-SYSTEM/
├── .agents/                                # Definiciones de Agentes y Skills Autónomos
│   ├── rules/                              # Reglas globales de agentes
│   └── skills/                             # Skills declarativas con frontmatter YAML
│       ├── accessibility-auditor/
│       ├── browser-qa/
│       ├── deep-research/
│       ├── docker-ops/
│       ├── evidence-auditor/
│       ├── git-workflow/
│       ├── performance-auditor/
│       ├── quality-auditor/
│       ├── sdd/
│       ├── security-auditor/
│       └── seo-auditor/
│
├── .cursor/                                # Configuración de Cursor IDE
│   ├── mcp.json                            # Registro de servidores MCP (eos-local)
│   └── rules/                              # Reglas contextuales .mdc
│       ├── sdd-governance.mdc
│       ├── gentleman-book-rsc-0016.mdc
│       ├── tdd-pipeline.mdc
│       └── mcp-awareness.mdc
│
├── bin/                                    # Puntos de Entrada CLI del Plano de Control
│   └── eos.js                              # Dispatcher principal (eos doctor, next, mission, verify)
│
├── docs/                                   # Documentación Técnica Formal
│   ├── architecture/                       # C4 Models, ADRs y Mapas de Sistema
│   │   ├── adrs/                           # Decision Records Arquitectónicos (ADR-0001 a ADR-0009)
│   │   └── SYSTEM_ARCHITECTURE_AND_TAXONOMY_INDEX.md
│   ├── blueprints/                         # Plantillas de Misión y Ciclos de Vida
│   │   ├── GOLDEN_SPEC_DRIVEN_BLUEPRINT.json
│   │   └── GOLDEN_SPEC_DRIVEN_BLUEPRINT.md
│   ├── governance/                         # Modelos de Seguridad, Falsación y ZTA
│   ├── intelligence/research/              # Informes de Investigación Formal (RSC-0001 a RSC-0019)
│   ├── schemas/                            # 17 Esquemas Canónicos JSON Schema Draft 2020-12
│   └── specs/                              # Especificaciones Formales de Componentes
│
├── scripts/                                # Automatización de Auditoría y Verificación
│   ├── demo-golden-mission.js              # Runner de demostración de ciclo completo
│   ├── validate_schemas.js                 # Validador de esquemas Draft 2020-12
│   └── verify-eos.js                       # Verificador estricto de 478 invariantes
│
├── src/                                    # Código Fuente del Núcleo (L0 Node Built-ins)
│   ├── mcp-server.js                       # Servidor JSON-RPC 2.0 stdio (24 herramientas MCP)
│   └── core/                               # Módulos Arquitectónicos Hexagonales
│       ├── adapters/                       # Bridges para Cursor (.mdc) y Engram MCP
│       │   ├── cursor-slash-command-bridge.js
│       │   └── gentleman-sdd-bridge.js
│       ├── adversarial/                    # Red-Teaming y Falsación Proactiva (Popperian)
│       │   └── adversarial-falsification-engine.js
│       ├── authority/                      # Fuente de la Verdad y Control de Autoridad
│       │   ├── authority-truth-source.js
│       │   └── authority-adapter.js
│       ├── blueprints/                     # Motor Orquestador de Blueprints Canónicos
│       │   └── golden-blueprint-engine.js
│       ├── consensus/                      # Consenso Bizantino y Votación TMR
│       │   └── byzantine-consensus-engine.js
│       ├── contracts/                      # Validador Jerárquico de Esquemas
│       │   └── schema-validator.js
│       ├── discovery/                      # Descubrimiento Universal en 10 Dimensiones
│       │   ├── universal-technical-discovery-engine.js
│       │   └── governed-technical-selection-engine.js
│       ├── governance/                     # Centinela de Deriva de Contratos y Barreras
│       │   ├── contract-drift-monitor.js
│       │   └── integration-gatekeeper.js
│       ├── memory/                         # Destilación Epistémica de BKMs y Sanitización
│       │   └── epistemic-bkm-engine.js
│       ├── observability/                  # Terminal HUD en Vivo estilo Mission Control
│       │   ├── terminal-hud-engine.js
│       │   └── executive-mission-reporter.js
│       ├── optimization/                   # Simplificador Anti-Bloat y Optimizador Pareto
│       │   ├── first-principles-simplifier-engine.js
│       │   └── evolutionary-strategy-optimizer.js
│       ├── orchestration/                  # Ejecutor de Grafos DAG por Olas Topológicas
│       │   └── mission-dag-pipeline-engine.js
│       ├── resilience/                     # FDIR Hermético y Simulador de Caos PRNG
│       │   ├── fdir-self-healing-engine.js
│       │   └── deterministic-chaos-engine.js
│       ├── routing/                        # Ruteador Pareto de Modelos y Telemetría
│       │   └── cognitive-pareto-router.js
│       ├── runtime/                        # Runtime Central de Misiones
│       │   ├── mission-runtime.js
│       │   └── engine-surface.js
│       ├── sandbox/                        # Evaluador de Sandboxes con Reflexión TDD
│       │   ├── autonomous-sandbox-evaluator.js
│       │   └── worktree-mutation-engine.js
│       ├── scaffolding/                    # Generador de Arquitectura Limpia/Hexagonal
│       │   └── autonomous-scaffolder-engine.js
│       └── sdd/                            # Motor de Evidencia Epistémica y Puertas HITL
│           ├── epistemic-evidence-engine.js
│           └── hitl-gatekeeper.js
│
└── tests/                                  # Suite Exhaustiva de Pruebas (950 Tests PASS)
    ├── e2e-exhaustive-forensic-stress.test.js
    ├── golden-blueprint.test.js
    ├── autonomous-sandbox-evaluator.test.js
    ├── evolutionary-strategy-optimizer.test.js
    ├── cursor-slash-command-bridge.test.js
    ├── terminal-hud.test.js
    ├── autonomous-scaffolder.test.js
    ├── contract-drift.test.js
    └── gentleman-sdd-bridge.test.js
```

---

## 2. Taxonomía de Capas y Responsabilidades

| Capa Arquitectónica | Dominio | Principio Rector | Responsabilidad Central |
| :--- | :--- | :--- | :--- |
| **L0 Core Engine** | `src/core/` | `NODE_BUILTINS_ONLY` | Cero dependencias npm en producción; determinismo puro y portabilidad en Node 18-24. |
| **Gobernanza y Autoridad** | `authority/`, `governance/` | `NON_MUTABLE_TRANSITION` | Toda mutación requiere pasar por `commitTransition()`. Cero asignaciones directas de estado. |
| **Resiliencia & FDIR** | `resilience/`, `consensus/` | `NASA_FAIL_SAFE` | Aislamiento de fallos en sandboxes, safe-mode circuit breakers y votación por supermayoría bizantina. |
| **SDD & Contratos** | `blueprints/`, `contracts/` | `SPEC_BEFORE_CODE` | 100% de los intercambios de datos validados contra JSON Schema Draft 2020-12. |
| **Cognición & Memoria** | `routing/`, `memory/` | `PARETO_EFFICIENCY` | Telemetría económica ($\text{EVD}/\text{kTok}$), destilación de BKMs con SHA-256 y scrubbing anti-fugas. |
| **Ejecución y Sandboxing**| `sandbox/`, `scaffolding/` | `ISOLATED_TDD_CYCLE` | Trabajo en ramas efímeras con bucle ReAct de autorreparación y scaffolding hexagonal estricto. |
| **Observabilidad & HUD** | `observability/`, `adapters/` | `LIVE_MISSION_CONTROL` | Renderizado ANSI en tiempo real y puente nativo con Cursor IDE (`.mdc` y MCP). |

---

## 3. Matriz de Invariantes del Sistema

1. **Barrera Externa de Escritura ($\Delta = 0$)**: Prohibición estricta de mutar directorios de proyectos externos (ej. `Fundacion/`) sin autorización explícita de Nivel 2+.
2. **Inmutabilidad Criptográfica (SHA-256)**: Cada bloque de evidencia, recibo de decisión o BKM porta un hash SHA-256 inmutable y encadenado.
3. **Veto de Seguridad Absoluto**: Un veto emitido por `SECURITY_AUDITOR` tiene precedencia matemática sobre cualquier consenso o mayoría de votos.
4. **Validación Estricta de Esquemas**: 17 esquemas canónicos impiden el ingreso de propiedades huérfanas o tipos incompatibles.
5. **Aislamiento en Sandboxes Herméticos**: Toda prueba destructiva o mutación experimental se confina a entornos aislados con reversibilidad matemática.
