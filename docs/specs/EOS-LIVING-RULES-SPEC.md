# [SPEC-EOS-009]: Context Minimalism & Living Rules Engine (`eos rules`)

* **Domain / Module:** `src/core/rules/living-rules-engine.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-RULES-001` ➔ `SPEC-EOS-009` ➔ `PLAN-EOS-009` ➔ `TASKS-EOS-009`

---

## 1. Problem Statement & Operational Doctrine

In autonomous engineering systems, prompt bloat and verbose instruction documents lead to severe LLM attention degradation (the "Lost in the Middle" phenomenon). Furthermore, static documentation quickly drifts from operational reality when recurring bugs, vetoes, and edge cases are not codified into living rules.

Inspired by **Boris Cherny's (Creator and Head of Claude Code at Anthropic) Context Minimalism & Living Rules Doctrine**:
1. **Context Minimalism**: Rules must be concise, high-density, and free of redundant narrative filler. Individual operational rules must stay within strict token budgets (≤ 250 tokens).
2. **Living Rule Distillation**: Whenever a failure occurs (test regression, linter block, or Byzantine arbitration veto), the engine automatically distills the root cause into a crisp, actionable EARS-compliant rule (`RULE-XXXX`).
3. **Continuous Bidirectional Synchronization**: Rules codified in the system must synchronize across IDE instructions (`.cursor/rules/`), agent manifests (`.agents/`), and runtime prompts without manual duplication.
4. **Zero Vibe Rule Auditing**: System prompts are audited to ensure 100% testable, unambiguous constraints conforming to IEEE 830 / ISO 29148.

---

## 2. Architectural Topology

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              OPERATIONAL SIGNALS / VETOES / TEST FAILURES               │
│          (Arbitration Veto, Linter Failure, TDD Regression)             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               LIVING RULES ENGINE (eos rules / distill)                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ 1. BLOAT &      │         │ 2. EARS RULE    │         │ 3. CONTEXT      │
│    TOKEN AUDIT  │         │    DISTILLER    │         │    MINIMALIZER  │
│ Scans .cursor/  │         │ Extracts atomic │         │ Compiles dense, │
│ rules & .agents │         │ WHEN/IF/WHILE   │         │ deduplicated    │
│ Token density   │         │ invariants      │         │ system prompts  │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. LIVING REPOSITORY RULES INDEX & SYNCHRONIZATION                      │
│    - docs/rules/CANONICAL_RULES_INDEX.json                              │
│    - .cursor/rules/harness-engineering-standard.mdc                     │
│    - .agents/AGENTS.md                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Functional Requirements (Formal EARS Syntax)

### FR-LR-001: Rule Bloat & Token Density Audit (Ubiquitous)
* **EARS**: `EL SISTEMA LivingRulesEngine auditará periódicamente los directorios de reglas (.cursor/rules/, .agents/), calculando el recuento estimado de tokens, la densidad sintáctica y detectando reglas con más de 250 tokens sin estructura formal EARS.`

### FR-LR-002: Dynamic Rule Distillation from Failures (Event-Driven)
* **EARS**: `CUANDO se registre un veto de arbitraje (VETO_REJECTED) o una falla de verificación de tests, EL SISTEMA destilará automáticamente una regla living atómica con identificador único RULE-XXXX, expresada en sintaxis formal EARS (CUANDO/SI/MIENTRAS).`

### FR-LR-003: Contradiction & Redundancy Detection (State-Driven)
* **EARS**: `MIENTRAS se auditen las reglas existentes, EL SISTEMA detectará duplicaciones semánticas o directivas contradictorias entre archivos de reglas del IDE y manifiestos de agentes.`

### FR-LR-004: Context Minimalist Prompt Export (Event-Driven)
* **EARS**: `CUANDO el orquestador solicite el contexto de instrucciones para un agente o tarea, EL SISTEMA generará un payload minimalista consolidado que filtre reglas redundantes y no supere el presupuesto de tokens asignado.`

### FR-LR-005: Canonical Rules Synchronization (Event-Driven)
* **EARS**: `CUANDO se ejecute eos rules --sync, EL SISTEMA sincronizará el índice canónico de reglas con los archivos activos de configuración de Cursor y del workspace de agentes.`

---

## 4. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Auditoría de reglas detecta bloat y evalúa presupuesto de tokens
  DADO un conjunto de reglas en el workspace
  CUANDO se ejecuta auditRules()
  ENTONCES el sistema retorna el recuento de reglas, tokens totales y lista de reglas que violan el presupuesto de 250 tokens
  Y ninguna regla válida es marcada erróneamente como bloat

ESCENARIO: Destilación de regla living ante un veto de seguridad
  DADO un resultado de arbitraje con VETO_REJECTED por credenciales en texto plano
  CUANDO se invoca distillRule(vetoEvent)
  ENTONCES el sistema genera una regla con formato RULE-XXXX en sintaxis formal EARS
  Y la regla queda indexada en el registro canónico de reglas living

ESCENARIO: Generación de prompt context minimalista
  DADO un presupuesto de 1000 tokens
  CUANDO se llama a exportMinimalPromptContext({ maxTokens: 1000 })
  ENTONCES el payload resultante contiene las reglas prioritarias sin duplicaciones
  Y el tamaño total no excede el límite establecido
```
