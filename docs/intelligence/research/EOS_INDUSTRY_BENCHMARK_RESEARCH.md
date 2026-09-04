# Investigación comparativa de empresas de IA y tecnología

## Marco de lectura

Este archivo separa hechos documentados públicamente de inferencias operativas para EOS. La existencia de una API, producto o equipo no demuestra cómo funciona toda una compañía internamente; las conclusiones organizacionales se marcan como patrones transferibles, no como acceso a información privada.

## OpenAI

La documentación pública de OpenAI presenta a los agentes como sistemas que realizan tareas de forma independiente y señala que llevarlos a producción exige más que prompts: requiere orquestación, herramientas, observabilidad, tracing y evaluaciones. Su plataforma pública combina un primitive de responses, herramientas integradas, un SDK de agentes para workflows single-agent y multi-agent, y herramientas de observabilidad para inspeccionar ejecuciones.[1]

**Patrón transferible a EOS:** el runtime necesita una abstracción de ejecución observable, no solo un prompt; las tools, turnos de modelo y handoffs deben producir traces y datasets de evaluación. EOS debe tratar tracing y evaluación como parte del producto, no como debugging posterior.

## Anthropic

Anthropic describe context engineering como la curación del conjunto completo de información disponible para el modelo: instrucciones, tools, MCP, datos externos, historial y estado. Destaca que el contexto es un recurso finito con atención limitada y que los agentes de larga duración necesitan compresión, recuperación progresiva y referencias ligeras en vez de cargar todo el corpus en cada turno.[2]

Anthropic también recomienda herramientas claras, autónomas, robustas y poco solapadas. Un conjunto inflado de tools crea ambigüedad y reduce confiabilidad. El enfoque just-in-time permite que el agente mantenga identificadores —rutas, queries, enlaces— y recupere solo los datos necesarios en runtime.[2]

**Patrón transferible a EOS:** implementar Context Budgeting, progressive disclosure, compactación y referencias a artefactos. El Mission Resolver debe entregar un contexto pequeño pero suficiente; la memoria no debe ser un volcado infinito del historial.

## Microsoft

Microsoft Foundry documenta evaluaciones basadas en datasets, rúbricas, evaluadores de calidad, seguridad y comportamiento de agentes. Recomienda establecer umbrales de aceptación antes del release, combinar rubric evaluators con evaluadores de seguridad y convertir traces de producción en datasets de evaluación.[3]

**Patrón transferible a EOS:** cada misión debe generar un conjunto de casos, una rúbrica específica del objetivo y un registro de trazas. La evaluación debe ocurrir durante desarrollo, antes de release y con tráfico o resultados reales cuando estén disponibles.

## Google

Google Vertex AI distingue evaluación de respuesta final y evaluación de trayectoria. La trayectoria puede medirse por coincidencia exacta, orden, recall, precision y uso de una herramienta específica. Google enfatiza que evaluar solo el texto final es insuficiente para agentes que actúan sobre un entorno.[4]

**Patrón transferible a EOS:** evaluar tanto outcome como trajectory. Una misión puede producir una respuesta correcta por una ruta insegura, innecesariamente costosa o fuera de autoridad; EOS debe detectarlo aunque el resultado textual parezca correcto.

## Hallazgos cruzados iniciales

| Patrón | OpenAI | Anthropic | Microsoft | Google | Decisión EOS |
| --- | --- | --- | --- | --- | --- |
| Runtime de tools | Responses y built-in tools | Tools minimalistas y just-in-time | Tools evaluadas por rúbrica | Tool trajectory metrics | Tool registry con contrato, scope, health y traces |
| Contexto | Estado y tools integrados | Context engineering y progressive disclosure | Contexto usado para generar rubrics | Datasets y trazas | Context compiler con budget y compresión |
| Evaluación | Tracing y evaluations | Fallos de contexto y agent loops | Rúbricas, safety y traces | Resultado + trayectoria | Eval plane dual: outcome + trajectory |
| Multiagente | SDK y workflows | Agentes en loops con contexto curado | Agent evaluators | Framework-agnostic evaluation | Orquestación explícita, no swarm sin control |
| Producción | Herramientas para agentes | Operación sobre contextos largos | Thresholds antes de release | Experiments y métricas | Gates, SLO, error budget y release control |

## Fuentes

[1]: https://openai.com/index/new-tools-for-building-agents/ "OpenAI: New tools for building agents"  
[2]: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents "Anthropic: Effective context engineering for AI agents"  
[3]: https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/evaluate-agent "Microsoft Foundry: Evaluate your AI agents"  
[4]: https://cloud.google.com/blog/products/ai-machine-learning/introducing-agent-evaluation-in-vertex-ai-gen-ai-evaluation-service "Google Cloud: Introducing agent evaluation"  

## Palantir AIP

La documentación oficial de Palantir presenta AIP como una plataforma para conectar IA generativa con dominios operativos. Su arquitectura combina integración segura de múltiples LLMs, observabilidad end-to-end, context engineering, una Ontology que modela datos, lógica, acciones y seguridad, servicios vectoriales y de compute, governance, lifecycle de agentes, automatización, entornos de desarrollo, aplicaciones humano+IA y packaging/release/deploy.[5]

La Ontology representa los “nouns” y “verbs” de los procesos operativos: objetos, relaciones, lógica y acciones. La plataforma declara controles de rol, markings y purpose, audit logging, evaluación integrada, comparación entre modelos, variación entre ejecuciones y operaciones autónomas o human-in-the-loop sobre una base común.[5]

**Patrones transferibles a EOS:**

1. EOS necesita una **Mission Ontology** que modele Intent, Mission, Project, Artifact, Decision, Capability, Provider, Agent, Tool, Gate, Evidence, Outcome y Authority como objetos relacionados, no como JSONs aislados.
2. Las tools deben operar sobre objetos y acciones con permisos, propósito y audit trail, no sobre tablas o filesystem sin semántica.
3. Context engineering debe conectar datos, lógica y acción a la misión de forma continua.
4. La evaluación debe estar integrada en el mismo ciclo que construcción, release y operación.
5. Human-in-the-loop y autonomía total deben ser modos del mismo runtime, no productos separados.
6. El packaging y despliegue de una misión debe incluir código, contratos, configuración, agentes, workflows, tests, evidencia y canales de release.

## NVIDIA NeMo Agent Toolkit

NVIDIA documenta NeMo Agent Toolkit como una librería unificadora y agnóstica de framework: puede convivir con LangChain, LlamaIndex, CrewAI, Microsoft Semantic Kernel, Google ADK y agentes propios sin exigir replatforming. Sus unidades —agentes, tools y workflows— se expresan como function calls componibles y reutilizables.[11]

El toolkit trata profiling, observabilidad y evaluación como capacidades de primera clase. Puede perfilar workflows hasta tool/agent, seguir tokens y tiempos, integrar proveedores de tracing, observar ejecuciones, validar accuracy y exponer UI de debugging. También soporta MCP como cliente y servidor, y A2A para delegar tareas entre agentes.[11]

**Patrones transferibles a EOS:**

1. EOS debe ser framework-agnostic y funcionar alrededor de los agentes existentes.
2. Skills, tools, agents y workflows deben ser componibles y tener contratos uniformes.
3. Profiling de tokens, latencia, tool calls y retries debe ser parte del receipt.
4. MCP y A2A deben ser adaptadores de interoperabilidad, no el dominio central.
5. El runtime necesita plugins de observabilidad y evaluación que no obliguen a una plataforma única.

## Meta

Meta describe un enfoque system-centric de seguridad que aplica mitigaciones en cada nivel del desarrollo y despliegue: datos y entrenamiento, fine-tuning, evaluación automática y humana, red teaming, filtros de prompt y respuesta, herramientas de guardrails y guías para desarrolladores.[12] Para Llama 3.1 menciona evaluaciones previas al despliegue, red teaming interno y externo, Prompt Guard para prompt injection/jailbreak, Llama Guard para moderación y CyberSecEval para riesgos de ciberseguridad.[13]

Meta también comparte modelos, model cards, recetas y herramientas, manteniendo transparencia sobre capacidades y limitaciones. Diferencia controles que solo el proveedor del modelo puede aplicar de controles que deben implementarse en la aplicación concreta.[12]

**Patrones transferibles a EOS:**

1. Defense-in-depth: no confiar en una única constitución, scanner o prompt.
2. Separar seguridad de modelo, runtime, tool, aplicación y operación.
3. Mantener threat models y evaluaciones por dominio.
4. Incluir red teaming automatizado y humano antes de ampliar autonomía.
5. Publicar model/capability cards con límites, riesgos y casos de uso.

## SpaceX

La información pública disponible no describe la arquitectura interna completa de SpaceX. Sus páginas de carreras sí muestran una organización orientada a sistemas críticos con funciones separadas de flight software, embedded software, simulación, automatización, integración, pruebas, reliability, infraestructura, operaciones de lanzamiento y desarrollo de vehículos.[14]

**Inferencia operativa, no hecho privado:** la separación de simulación, integración, test, reliability y operaciones sugiere un patrón de ingeniería de sistemas donde el software se valida contra el entorno antes de actuar sobre el sistema físico. EOS puede adoptar el principio sin afirmar detalles internos: cada acción autónoma debe tener sandbox, simulación o dry-run cuando sea posible, y debe existir una separación clara entre desarrollo, integración, staging y operación.

**Patrones transferibles a EOS:**

1. Modelar el entorno y probar cambios antes de efectos reales.
2. Separar build, integration, test, reliability y operations.
3. Diseñar para fallos, recuperación y modos degradados.
4. Tratar cada misión como un sistema con interfaces, presupuestos y criterios de abort.
5. Promover ciclos cortos de aprendizaje con telemetría y pruebas, no solo revisión documental.

## Fuentes

[12]: https://ai.meta.com/blog/meta-llama-3-meta-ai-responsibility/ "Meta: Our responsible approach to Meta AI and Meta Llama 3"  
[13]: https://ai.meta.com/blog/meta-llama-3-1-ai-responsibility/ "Meta: Expanding our open source large language models responsibly"  
[14]: https://www.spacex.com/careers/jobs "SpaceX Careers and Engineering Roles"  

## Anthropic: workflows, agentes y larga duración

Anthropic distingue workflows —rutas de código predefinidas con LLMs y tools— de agentes —LLMs que dirigen dinámicamente su proceso y uso de tools— y recomienda usar la solución más simple posible. Workflows ofrecen predictibilidad; agentes ofrecen flexibilidad cuando el número de pasos no puede conocerse de antemano.[15]

Los patrones públicos incluyen prompt chaining, routing, parallelization, orchestrator-workers y evaluator-optimizer. Anthropic recomienda que cada patrón se use solo cuando el problema lo justifica. Para agentes, la fuente de verdad debe venir del entorno mediante resultados de tools o ejecución de código, con checkpoints, límites de iteración y posibilidad de pausar para feedback humano.[15]

En sus harnesses de larga duración, Anthropic describe dos roles: initializer agent, que prepara entorno, requisitos, script de arranque, progreso y commit inicial; y coding agent, que trabaja incrementalmente sobre una feature, prueba el sistema, deja el entorno limpio, actualiza progreso y commitea. Un feature list estructurado evita que el agente intente construir todo de una vez o declare el proyecto terminado prematuramente.[16]

Su sistema de investigación multiagente usa un lead/orchestrator que descompone una consulta y subagentes que exploran en paralelo. El patrón funciona mejor en investigación amplia y tareas realmente paralelizables; aumenta mucho el coste de tokens y no es ideal cuando las subtareas comparten demasiado contexto o tienen dependencias fuertes. La delegación necesita objetivos, formato de salida, límites, fuentes y herramientas claras.[17]

**Patrones transferibles a EOS:**

1. EOS debe elegir workflow o agent loop según incertidumbre, no usar autonomía por defecto.
2. Toda misión larga necesita initializer, feature/mission ledger, progress log, commits/checkpoints y coding sessions incrementales.
3. El Mission Resolver debe evitar one-shotting y premature completion mediante un backlog estructurado de outcomes verificables.
4. Orchestrator-workers deben reservarse para investigación, análisis o subtareas independientes; el código acoplado debe permanecer coordinado por un DAG.
5. Parallel processing debe tener presupuesto, límite de agentes, no-duplicación y consolidación obligatoria.

## OpenAI Agents SDK

OpenAI define agentes como aplicaciones que planifican, llaman tools, colaboran con especialistas y conservan suficiente estado para trabajo multi-step. La documentación diferencia Responses API —cuando la aplicación quiere poseer el loop, routing y branching— de Agents SDK —cuando se desea que el SDK ejecute el loop, handoffs, sessions, tracing, guardrails y approvals.[18]

**Patrón transferible a EOS:** EOS debe conservar el control del runtime y del estado, pero puede adoptar la separación entre model interaction, agent run, tool contract, handoff, approval, result y trace. La arquitectura debe permitir cambiar de proveedor sin que la misión dependa de un único SDK.

## Fuentes

[15]: https://www.anthropic.com/engineering/building-effective-agents "Anthropic: Building effective agents"  
[16]: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents "Anthropic: Effective harnesses for long-running agents"  
[17]: https://www.anthropic.com/engineering/multi-agent-research-system "Anthropic: How we built our multi-agent research system"  
[18]: https://developers.openai.com/api/docs/guides/agents "OpenAI Agents SDK"  

## Google ADK

Google documenta ADK como framework open source para construir, depurar, evaluar y desplegar agentes a escala. Combina pipelines previsibles mediante workflow agents con routing dinámico coordinado por agentes, composición multiagente, tools, evaluaciones de trayectorias y despliegue local o global en Runtime, Cloud Run o GKE. Está disponible en Python, TypeScript, Go y Java.[19]

**Aplicación a EOS:** separar la definición de workflow de la estrategia de routing, mantener un catálogo multi-lenguaje de providers y evaluar trayectorias como artefactos de primera clase.

## Microsoft Agent Framework

Microsoft combina agentes, un Agent Harness para tareas largas con planificación, todo tracking, compaction, acceso a archivos, memoria y observabilidad; workflows funcionales y basados en grafos; e integraciones de modelos, tools, MCP, middleware, evaluación y UI. También ofrece sessions, context providers y middleware para interceptar acciones.[20]

La documentación distingue agent para problemas abiertos y workflow para pasos bien definidos; recomienda usar una función determinista si puede resolver el problema sin agente. El framework hereda de AutoGen y Semantic Kernel abstracciones de agentes, state management, type safety, filters, telemetry y soporte de workflows gráficos.[20]

**Aplicación a EOS:** un Agent Harness explícito debe contener planificación, todo tracking, compaction, archivos, memoria, approvals, observabilidad y recovery; el DAG y el runtime deben ser tipados y no depender solo de prompts.

## Amazon Bedrock AgentCore

Amazon presenta AgentCore como plataforma modular para construir, desplegar y operar agentes con cualquier framework y modelo. Sus componentes públicos incluyen harness, runtime aislado por sesión, memoria corta y larga, gateway para APIs/MCP, identidad, sandbox, browser, observabilidad, evaluaciones, optimización, políticas deterministas y registry de agentes/tools/skills.[21]

La plataforma también trata las evaluaciones sobre sessions, traces y spans, y propone mejora continua mediante configuraciones versionadas y A/B testing. Esto confirma una dirección de la industria: el runtime de producción debe combinar ejecución, aislamiento, identidad, herramientas, memoria, evaluación y operación, pero mantener los componentes modulares.[21]

**Aplicación a EOS:** separar EOS Core de adapters; añadir Execution Sandbox, Identity/Scopes, Tool Gateway, Registry y Eval/Optimization Plane. La optimización automática debe generar bundles versionados y experimentos controlados, nunca mutar la constitución en vivo.

## Fuentes

[19]: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk "Google Agent Development Kit"  
[20]: https://learn.microsoft.com/en-us/agent-framework/overview/ "Microsoft Agent Framework Overview"  
[21]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html "Amazon Bedrock AgentCore"  
