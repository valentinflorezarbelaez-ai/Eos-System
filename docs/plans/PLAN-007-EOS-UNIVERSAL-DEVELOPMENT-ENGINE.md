# PLAN-007: EOS UNIVERSAL DEVELOPMENT ENGINE PLAN
## Architecture Plan & Architectural Decision Records (ADR)

---

### 1. ARQUITECTURA DEL MOTOR UNIVERSAL

```mermaid
graph TD
    USER["Instrucción Arbitraria del Usuario"] --> ENGINE["UniversalDevelopmentEngine (L0 Pure Core)"]
    
    subgraph Engine_Pipeline ["Ciclo Maestro de 21 Pasos"]
        P1["Fase I: Intake & Reconocimiento (IntentionParser)"]
        P2["Fase II: Requisitos EARS & BDD (SpecSynthesizer)"]
        P3["Fase III: Plan Limpio & DAG Atómico (DAGBuilder)"]
        P4["Fase IV: Implementación Aislada (Domain -> App -> Infra)"]
        P5["Fase V: Auditorías 360° & FDIR Guard (Quality + Security)"]
        P6["Fase VI: Sello Criptográfico SHA-256 (AttestationLedger)"]
    end
    
    ENGINE --> P1
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    
    P6 --> CLI["CLI npm run eos -- develop"]
    P6 --> PORTAL["Live Web Lab (eos-system-ten.vercel.app)"]
```

---

### 2. ARCHITECTURAL DECISION RECORDS (ADR)

#### ADR-007-01: Dominio Puro y Motor de Síntesis Sin Dependencias de NPM
* **Contexto:** El motor debe poder ejecutarse en cualquier entorno (Node.js, Edge runtime, CLI, CI/CD) sin requerir librerías pesadas ni vendor lock-in.
* **Decisión:** Implementar `UniversalDevelopmentEngine.ts` y sus modelos de soporte (`AgentRoleMatrix.ts`, `IntentionParser.ts`) en TypeScript puro sin dependencias externas de runtime.
* **Alternativas Rechazadas:**
  * *Usar frameworks de agentes pesados en runtime:* Rechazado por violar el Mandamiento V (Hexagonal L0 Purity) e introducir vulnerabilidades en la cadena de suministro.

#### ADR-007-02: Matriz de 8 Roles Especializados de Agentes
* **Contexto:** La ejecución perfecta de cualquier desarrollo requiere separar responsabilidades (Principio de Responsabilidad Única y separación de preocupaciones).
* **Decisión:** Modelar formalmente los 8 roles de agentes que colaboran en el pipeline: `Architect`, `RequirementsEngineer`, `DomainCoder`, `SecurityAuditor`, `QualityAuditor`, `EvidenceAuditor`, `Deployer`, `SyncMaster`.
