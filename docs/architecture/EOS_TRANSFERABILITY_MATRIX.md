# EOS: matriz de patrones transferibles

**Autor:** Manus AI  
**Estado:** Borrador técnico priorizado  
**Propósito:** Separar lo que las organizaciones líderes hacen públicamente de lo que EOS debe adoptar, adaptar, posponer o rechazar.

## 1. Criterio de lectura

Esta matriz no afirma conocer procesos privados. Clasifica patrones documentados públicamente y propone una transferencia razonada. La evidencia se divide en tres niveles: **Público** cuando existe documentación primaria; **Inferencia** cuando el patrón se deduce de varios productos o publicaciones; y **Hipótesis** cuando todavía requiere validación mediante una misión real.

La prioridad se expresa así: **P0** es imprescindible para que EOS pueda operar con seguridad; **P1** es necesario para convertirse en plataforma autónoma usable; **P2** mejora escala, optimización o sofisticación; **No ahora** debe evitarse hasta que exista una necesidad demostrada.

## 2. Matriz ejecutiva

| Patrón | Referentes públicos | Evidencia | Transferencia a EOS | Prioridad | Decisión |
| --- | --- | --- | --- | --- | --- |
| Runtime separado del modelo | Microsoft, Google, AWS, OpenAI | Público | EOS conserva control plane, runtime, tools, memory, policy y evaluators fuera del provider | P0 | Adoptar |
| Control plane de identidad y propósito | Microsoft, Google, AWS, Palantir | Público | Cada acción declara actor, misión, purpose, scopes, environment y approval | P0 | Adoptar |
| Tool gateway | Microsoft, AWS, Databricks, Snowflake | Público | Interceptar cada tool/MCP call con allowlist, policy, cost, network y evidence | P0 | Adoptar |
| Ontología operacional | Palantir, Databricks, Snowflake | Público | Mission Catalog con objetos, relaciones, acciones, owners, lineage y permisos | P0 | Adoptar |
| Evaluación de trayectoria | Google, Microsoft, MLflow, Palantir, AWS | Público | Evaluar outcome, pasos, tool calls, desviaciones, coste y evidencia | P0 | Adoptar |
| Evaluación independiente | Inspect AI, HELM, red teaming | Público | No depender de autoevaluación del provider; usar scorers y datasets versionados | P0 | Adoptar |
| Observabilidad estándar | OpenTelemetry, Microsoft, AWS, Google | Público | Traces, metrics, logs y spans compatibles con GenAI/MCP | P0 | Adoptar |
| Checkpoints y sesiones durables | Anthropic, Microsoft, Google, AWS | Público | Reanudar misiones después de reinicios, fallos y compactación de contexto | P0 | Adoptar |
| Sandbox y aislamiento | AWS, Google, Anthropic, NASA | Público | Worktrees, microVM/container, filesystem/network scopes y safe mode | P0 | Adoptar |
| Capability thresholds | OpenAI, Anthropic, Google DeepMind | Público | Mission Capability Levels que elevan safeguards al cambiar modelo, tool o impacto | P0 | Adoptar |
| Defense in depth | Anthropic, Meta, OpenAI, NIST | Público | Access, screening, gateway, sandbox, monitoring, incident response y rollback | P0 | Adoptar |
| Supply-chain provenance | NIST SSDF, SLSA, OWASP | Público | Firmar/versionar agents, skills, tools, prompts, dependencies, artifacts y MCPs | P0 | Adoptar |
| Platform engineering | DORA, CNCF, Backstage, GitHub | Público | EOS como producto interno con golden paths, catalog, templates y feedback claro | P1 | Adoptar |
| Mission Twin | Siemens, Palantir, NASA | Inferencia razonada | Modelo vivo de requisitos, decisiones, artifacts, estados, simulación y outcomes | P1 | Adoptar |
| FDIR/Jidoka Controller | NASA, Toyota | Público | Detener ante anomalía, aislar, recuperar, safe mode y registrar incident | P0 | Adoptar |
| Research/production split | Meta, cloud platforms, labs frontier | Inferencia razonada | Separar experimentación de releases aprobados mediante contratos compartidos | P1 | Adoptar |
| Provider abstraction | Mistral, Microsoft, AWS, NVIDIA | Público | Router con capability fit, health, trust, cost, latency y portability | P0 | Adoptar |
| Registry de agents/tools/skills | Google, AWS, Databricks, Backstage | Público | Registry gobernado con owner, version, permissions, health, lineage y approval | P0 | Adoptar |
| Optimización versionada y A/B | AWS, MLflow, Mistral | Público | Cambiar prompts/tools/providers solo mediante bundles, evals y canary | P1 | Adoptar |
| Golden paths por tipo de proyecto | DORA, CNCF, Salesforce | Público | Project Factory con perfiles web, API, data/AI, automation, mobile, MCP y library | P1 | Adoptar |
| Fault injection y simulación | NASA, Siemens, cloud platforms | Público/inferencia | Probar provider failure, stale context, tool poisoning, drift y rollback antes de release | P1 | Adoptar |
| Multi-agent swarm ilimitado | Algunos frameworks | Inferencia negativa | Evitar; usar pocos agentes especializados y DAG explícito | No ahora | Rechazar |
| Microservicios desde el inicio | Plataformas grandes | Inferencia negativa | Evitar; mantener monolito modular hasta demostrar necesidad | No ahora | Rechazar |
| Autonomía productiva sin sandbox | Anti-patrón | Público por incidentes y guías de seguridad | Prohibir; toda acción externa debe tener scope y approval adecuado | P0 | Rechazar |
| Memoria no versionada | Anti-patrón | Inferencia | Prohibir; memoria debe tener provenance, TTL, sensibilidad y rollback | P0 | Rechazar |
| Declarar éxito por texto del agente | Anti-patrón | Inferencia | Prohibir; exigir outcome, trajectory, tests y evidence | P0 | Rechazar |

## 3. Decisiones de arquitectura

La transferencia común de los referentes es una arquitectura por planos, no un agente monolítico:

```
Human / Command Center
        ↓ intent + authority
Mission Control Plane
        ↓ ontology + policy + identity + budgets
Mission Runtime
        ↓ sessions + DAG + checkpoints + recovery
Capability Plane
        ↓ agents + skills + tools + MCP + providers
Evidence / Evaluation Plane
        ↓ traces + outcomes + trajectory + incidents + learning
Execution Environments
        ↓ worktree · sandbox · staging · production
```

La regla de diseño es que **los modelos proponen y EOS decide**. Un modelo puede sugerir un plan, seleccionar una tool o proponer un cambio; el control plane valida propósito, permisos, presupuesto, nivel de capacidad, precondiciones y evidencia antes de ejecutar.

## 4. P0: contrato mínimo que debe existir antes de autonomía real

EOS no debe promover una misión por encima de MCL-1 hasta tener estos contratos implementados y probados:

| Contrato | Campos mínimos | Resultado verificable |
| --- | --- | --- |
| Mission | intent, objective, owner, scope, unknowns, definition of done | misión reproducible |
| Authority | level, actor, approvals, expires_at, protected surfaces | acción permitida o bloqueada |
| Capability | name, inputs, outputs, side effects, risk, provider | tool seleccionable con límites |
| Tool | schema, scopes, cost, timeout, network, rollback | llamada interceptable |
| Evidence | source, hash, actor, timestamp, artifact, claim | receipt auditable |
| Evaluation | dataset, scorer, threshold, reviewer, result | PASS/FAIL/UNKNOWN |
| Runtime | session, checkpoint, retry, safe mode, recovery | reanudación segura |
| Supply chain | version, digest, signature, provenance, dependencies | artifact confiable |

## 5. Anti-patrones que EOS debe vigilar

El sistema debe emitir una alerta o bloquear cuando detecte: alcance indefinido, provider no verificado, skill con permisos implícitos, tool sin schema, credentials compartidas, memoria sin provenance, evidence ausente, evaluación solo sintética, release sin rollback, provider substitution sin re-evaluation, autonomía superior al capability level probado, o demasiados agentes sin ownership.

## 6. Preguntas que todavía son hipótesis

No existe evidencia pública suficiente para afirmar exactamente cómo cada empresa organiza todos sus equipos internos, sus prompts privados, sus routing policies, sus datasets confidenciales o sus incident response playbooks completos. EOS debe tratar esos elementos como hipótesis de diseño y validarlos mediante experimentos controlados, no copiarlos como hechos.

## Referencias principales

[1]: https://openai.com/index/updating-our-preparedness-framework/ "OpenAI Preparedness Framework"  
[2]: https://www.anthropic.com/responsible-scaling-policy "Anthropic Responsible Scaling Policy"  
[3]: https://deepmind.google/frontier-safety/ "Google DeepMind Frontier Safety"  
[4]: https://learn.microsoft.com/en-us/azure/foundry/agents/overview "Microsoft Foundry Agent Service"  
[5]: https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview "Google Gemini Enterprise Agent Platform"  
[6]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html "Amazon Bedrock AgentCore"  
[7]: https://palantir.com/docs/foundry/aip/aip-features/ "Palantir AIP Features"  
[8]: https://www.databricks.com/product/unity-catalog "Databricks Unity Catalog"  
[9]: https://opentelemetry.io/blog/2025/ai-agent-observability/ "OpenTelemetry AI Agent Observability"  
[10]: https://dora.dev/capabilities/platform-engineering/ "DORA Platform Engineering"  
[11]: https://owasp.org/www-project-agentic-skills-top-10/ "OWASP Agentic Skills Top 10"  
[12]: https://csrc.nist.gov/Projects/ssdf "NIST SSDF"  
[13]: https://llis.nasa.gov/lesson/2049 "NASA Fault Management"  
[14]: https://www.siemens.com/en-us/technology/digital-twin/ "Siemens Digital Twin"  
[15]: https://ai.meta.com/infrastructure/ "Meta AI Infrastructure"  
[16]: https://backstage.io/docs/features/software-templates/ "Backstage Software Templates"  
