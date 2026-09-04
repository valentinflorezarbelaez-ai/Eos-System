# RSC-0019: La Anatomía Mecánica del Desarrollo de Software 100% Autónomo en Cursor

> **Entorno Primario y Único:** Cursor IDE (`.cursor/rules/`, Composer, Worktrees, MCP).  
> **Objetivo:** Desentrañar la ingeniería mecánica interna de cómo **Devin, Cursor, Factory.ai, OpenHands y Palantir** logran autonomía casi total, para integrarla directamente en **EOS**.

---

## 1. Los 5 Secretos Mecánicos de los Agentes 100% Autónomos

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│              LA ARQUITECTURA MECÁNICA DE UN AGENTE DE INGENIERÍA 100% AUTÓNOMO          │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
      ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
      │                  │                   │                   │                  │
┌─────▼────────────┐ ┌───▼─────────────┐ ┌───▼─────────────┐ ┌───▼────────────┐ ┌───▼────────────┐
│ 1. BUCLE ReAct   │ │ 2. AST & GRAFOS │ │ 3. WORKTREES    │ │ 4. ESQUEMAS    │ │ 5. COMPACTACIÓN │
│    + TDD REFLEX  │ │    DE LLAMADA   │ │    SANDBOX      │ │    ESTRICTOS   │ │    DE CONTEXTO  │
│ (Devin/SWE-agent)│ │ (Cursor Engine) │ │ (Factory / Git) │ │ (OpenAI/Palant)│ │ (LangGraph)     │
└──────────────────┘ └─────────────────┘ └─────────────────┘ └────────────────┘ └─────────────────┘
```

---

### Secreto 1: El Bucle ReAct con Reflexión TDD (Cómo Devin y SWE-agent no se detienen)
* **La falla del prompt común:** Un desarrollador novato le pide a la IA *"crea esta función"*. La IA escribe código, falla y el humano tiene que leer el error y volver a pedirlo.
* **El mecanismo autónomo de Devin / SWE-agent:**
  1. **Thought (Razonamiento Interno):** El agente formula una hipótesis de arquitectura y escribe primero el test que falla (`RED`).
  2. **Action (Acción Mínima):** Ejecuta el comando de test mediante el subproceso de terminal (`node --test ...`).
  3. **Observation (Lectura de Salida):** Lee el `stdout`, `stderr` y el código de salida (`exitCode`).
  4. **Reflexion (Auto-Corrección):** Si `exitCode !== 0`, el agente parsea el *stack trace*, identifica la línea exacta del fallo, refactoriza la función y re-ejecuta el test automáticamente.
  5. **Criterio de Parada:** El bucle itera de forma autónoma hasta que `exitCode === 0` sin requerir intervención humana.

---

### Secreto 2: Indexación AST y Grafos de Dependencia (Cómo Cursor entiende el proyecto completo)
* **La falla del prompt común:** Meter 50 archivos enteros al contexto satura la ventana de atención (*Needle-in-a-Haystack problem*), genera alucinaciones y cuesta caro.
* **El mecanismo interno de Cursor:**
  * Cursor analiza el código con **Tree-sitter** construyendo un Árbol de Sintaxis Abstracta (**AST**).
  * Mapea el **Grafo de Llamadas (Call Graph)**: Sabe exactamente qué funciones llaman a qué clases y qué tipos exportan.
  * Cuando se le pide modificar un módulo, no inyecta archivos enteros: inyecta únicamente los nodos del grafo relevantes (firmas de métodos, interfaces y contratos), logrando precisión quirúrgica con consumo mínimo de tokens.

---

### Secreto 3: Sandboxes Herméticos en Git Worktrees (Cómo operar con Cero Riesgo en tu repo)
* **La falla del prompt común:** Dejar que un agente edite directamente los archivos de tu rama principal. Si alucina o comete un error grave, te rompe el repositorio local.
* **El mecanismo de Factory.ai y EOS:**
  * El agente crea una rama shadow efímera en un worktree aislado:
    ```bash
    git worktree add .worktrees/agent-sandbox-<task-id> HEAD
    ```
  * El agente compila, ejecuta pruebas y muta archivos dentro de `.worktrees/`.
  * **Si todo pasa con 100% de éxito:** EOS realiza un merge limpio (*Fast-Forward*) a la rama principal.
  * **Si el agente falla:** Se destruye el worktree (`git worktree remove --force`) dejando el repositorio principal intacto ($\Delta = 0$).

---

### Secreto 4: Validación Estricta de Esquemas en la Frontera (Cómo Palantir y OpenAI evitan desvíos)
* **La falla del prompt común:** Pedir respuestas en texto libre que varían de formato de una llamada a otra.
* **El mecanismo de Palantir y OpenAI Strict Mode:**
  * Ninguna herramienta o acción se ejecuta si sus argumentos no pasan la validación de un **JSON Schema Draft 2020-12** en modo estricto (`additionalProperties: false`).
  * Si el LLM intenta inventar un parámetro, el plano de control rechaza la llamada en milisegundos antes de que toque el sistema operativo.

---

### Secreto 5: Compactación de Contexto y Checkpoints de Estado (Cómo LangGraph mantiene memoria)
* **La falla del prompt común:** Tras 20 pasos de terminal, el historial de chat se llena de logs ruidosos y el agente "olvida" el objetivo inicial.
* **El mecanismo de LangGraph / Replit Agent:**
  * Las salidas de terminal crudas se comprimen inmediatamente en un resumen tipado: `{ exitCode: 0, passed: 12, failed: 0, durationMs: 150 }`.
  * Cada hito completado se congela en un **Checkpoint Inmutable** en el ledger SHA-256.

---

## 2. Cómo EOS Convierte a Cursor en este Motor Supremo

Cursor es nuestro IDE exclusivo. Al alimentar a Cursor con:
1. **Reglas Dinámicas de Misión**: Generadas automáticamente en `.cursor/rules/sdd-governance.mdc` por [`GentlemanSddBridge`](file:///c:/Users/valen/Documents/Eos%20system/src/core/adapters/gentleman-sdd-bridge.js).
2. **Servidor MCP Local (`eos-local`)**: Con 20 herramientas de gobernanza expuestas a Cursor Composer.
3. **Plano de Control L0**: Ejecuta validación de esquemas, consenso BFT, FDIR y DAG pipelines en Node.js nativo.

El desarrollador en Cursor solo define el **Objetivo y la Visión**, y el motor EOS orquesta a Cursor Composer para que opere con la disciplina de un Senior Architect de clase mundial.
