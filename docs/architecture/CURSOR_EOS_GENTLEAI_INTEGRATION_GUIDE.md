# Guía Maestra de Integración: Cursor IDE, EOS Mission OS, Engram & Gentle AI

> **Entorno:** Cursor IDE (Editor Principal y Exclusivo)  
> **Protocolo de Comunicación:** Model Context Protocol (MCP) JSON-RPC 2.0 stdio (`.cursor/mcp.json`)  
> **Gobernanza:** `NODE_BUILTINS_ONLY` (L0), $\Delta = 0$, JSON Schema Draft 2020-12, SHA-256 Ledger.

---

## 1. La Arquitectura de Cursor y sus Componentes Clave

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CURSOR IDE WORKSPACE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    CURSOR CORE INTERACTION ENGINES                    │  │
│  │  • Chat & Composer (Ctrl+I / Agent Mode)                              │  │
│  │  • Codebase Semantic Indexing (Tree-sitter AST + Merkle Tree)         │  │
│  │  • Reglas Contextuales Modulares (.cursor/rules/*.mdc)                │  │
│  │  • Background Agents (Ejecución asíncrona de subprocesos)             │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      │ Protocolo MCP (JSON-RPC 2.0 stdio)   │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │               CENTRAL DE HERRAMIENTAS GOBERNADAS POR MCP             │  │
│  ├──────────────────────────┬─────────────────────────┬──────────────────┤  │
│  │    1. EOS CONTROL PLANE  │  2. ENGRAM MEMORY MCP   │  3. CONTEXT7 &   │  │
│  │       (eos-local)        │     (Memoria BKM)       │     BRAVE MCP    │  │
│  │  • 24 Tools de gobierno  │  • mem_save (What/Why)  │  • Documentación │  │
│  │  • Scaffolding hexagonal │  • mem_context (Sesión) │    oficial en    │  │
│  │  • FDIR & Consenso BFT   │  • mem_search (Patrones)│    tiempo real   │  │
│  │  • Golden Blueprint SDD  │  • mem_session_summary  │  • Búsqueda web  │  │
│  └──────────────────────────┴─────────────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Coordinación Armónica Paso a Paso en Cada Tarea

Cada vez que iniciás una tarea en Cursor (usando Chat o Composer), el flujo de trabajo sigue 5 etapas coordinadas:

### Etapa 1: Recuperación de Memoria y Contexto
1. **Engram MCP**: Cursor invoca `mem_context` o `mem_search` para recuperar decisiones arquitectónicas pasadas, convenciones del equipo y BKMs previamente destilados.
2. **Context7 MCP**: Si la tarea involucra librerías de terceros (React, Next.js, Node), consulta `query-docs` para obtener la documentación oficial exacta y evitar alucinaciones de API.

### Etapa 2: Gobernanza, Especificación y Scaffolding (EOS)
1. **Reglas de Cursor (`.cursor/rules/*.mdc`)**: Imponen la filosofía de *Clean Architecture* (Gentleman Programming) y la prohibición de mutar capas externas.
2. **EOS Scaffolder (`eos.scaffolder.generate`)**: Si se requiere crear un módulo nuevo, genera la estructura hexagonal completa (`domain/entities`, `domain/ports`, `application/use-cases`, `infrastructure/adapters` y `tests/unit`) con tipado estricto.

### Etapa 3: Ejecución Hermética en TDD (Cursor Composer + Sandbox)
1. **Cursor Composer**: Escribe primero el test que falla (`RED`) y aplica los cambios exclusivamente en los archivos autorizados (`allowed_write_roots`).
2. **EOS Evaluator (`AutonomousSandboxEvaluator`)**: Ejecuta el comando de test; si falla, el bucle ReAct parsea el stack trace y realiza auto-corrección sin requerir intervención humana.

### Etapa 4: Verificación Criptográfica y Consenso (EOS)
1. **EOS Verifier (`eos.verifier.run`)**: Comprueba que los 17 esquemas canónicos JSON Schema Draft 2020-12 sigan siendo 100% válidos.
2. **Consenso Bizantino (`ByzantineConsensusEngine`)**: En tareas críticas, valida la aprobación de los roles de arquitectura y seguridad (con veto inmediato ante vulnerabilidades).
3. **Ledger Criptográfico (`eos.evidence.record`)**: Registra el hash SHA-256 de la evidencia en el ledger inmutable.

### Etapa 5: Destilación de Conocimiento y Cierre
1. **EOS BKM Engine (`EpistemicBkmEngine`)**: Extrae la lección aprendida y sanitiza cualquier dato privado (`<REDACTED_HOME>`, `<REDACTED_KEY>`).
2. **Engram MCP (`mem_save`)**: Guarda el nuevo patrón destilado en la memoria persistente para que todas las sesiones futuras de Cursor lo conozcan.
