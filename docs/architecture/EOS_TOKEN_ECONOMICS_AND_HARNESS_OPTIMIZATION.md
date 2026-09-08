# EOS Token Economics & Ultra-Efficient Agent Harness Guide

> **Objetivo:** Máximo impacto con el mínimo consumo de tokens, cómputo y energía ($\text{Max}(\text{EVD}) / \text{Min}(\text{kTok})$).  
> **Filosofía:** Eficiencia de Pareto, precisión milimétrica de contexto y enrutamiento inteligente de modelos.

---

## 1. Los 5 Pilares de la Eficiencia Milimétrica de Cómputo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ARQUITECTURA DE EFICIENCIA ENERGÉTICA                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. INYECCIÓN QUIRÚRGICA DE CONTEXTO (AST-Level Pruning)                    │
│     • En lugar de inyectar archivos completos de 2.000 líneas, inyectar     │
│       únicamente las firmas de funciones, interfaces y puertos requeridos.  │
│                                                                             │
│  2. ENRUTAMIENTO MULTI-MODELO POR FRONTERA DE PARETO                        │
│     • Nivel 1 (Ultrarrápido / Centavos - Haiku, 4o-mini):                   │
│       Scaffolding, formateo, verificación de sintaxis y diffs.              │
│     • Nivel 2 (Balanceado - Sonnet 3.5, GPT-4o):                            │
│       Implementación TDD, pruebas unitarias y lógica de dominio.            │
│     • Nivel 3 (Razonamiento Profundo - o3-mini, DeepSeek-R1):               │
│       Diseño de arquitectura, resolución de fallas críticas y consenso.     │
│                                                                             │
│  3. DEDUPLICACIÓN DE CÓMPUTO VÍA MEMORIA PERSISTENTE (Engram BKM)           │
│     • Si un problema o patrón ya fue resuelto en una sesión anterior, se    │
│       recupera en 1 ms desde la memoria en vez de quemar 50.000 tokens      │
│       razonando desde cero.                                                 │
│                                                                             │
│  4. MUTACIONES POR DELTA MÍNIMO (Surgical Patching)                         │
│     • Reemplazos contiguos de líneas exactas (`replace_file_content`)       │
│       en lugar de sobreescribir archivos enteros.                           │
│                                                                             │
│  5. CIRCUIT BREAKERS Y BUCLES ACOTADOS (Anti-Token Burn)                    │
│     • Bounded ReAct Reflexion Loop con parada temprana (máximo 3 intentos). │
│     • Falsación popperiana y kill-switch FDIR en microsegundos.             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Métrica de Eficiencia Epistémica ($\text{EVD}/\text{kTok}$)

$$\text{Efficiency Index} = \frac{\text{Evidencias Criptográficas Verificadas (EVD)}}{\text{Miles de Tokens Consumidos (kTok)}}$$

* **Objetivo de Misión Óptima**: $\ge 1.5 \text{ EVD} / \text{kTok}$.
* **Alerta de Ineficiencia**: $< 0.5 \text{ EVD} / \text{kTok}$ (dispara optimización de contexto y simplificación de prompts).

---

## 3. Guía de Buenas Prácticas en Cursor para Ahorrar Tokens

1. **Uso de `@symbols` y `@file` precisos**: En lugar de `@codebase` para todo, referenciar solo los módulos atómicos involucrados.
2. **Prompts declarativos y directos**: Evitar rodeos; definir la entrada, la regla de negocio y el test esperado.
3. **Reutilización de Reglas `.mdc`**: Centralizar las directivas en `.cursor/rules/` para no tener que repetirlas en cada prompt de chat.

---

## 4. Model Routing Matrix by SDD Phase (2026)

> **Source:** LIDR Harness Engineering Workshop (Sep 2026), Álvaro Moya.

The generic 3-tier model routing (Section 2) is operationalized into a concrete per-phase matrix. The governing principle:

> **Opus plans and prepares exhaustive specs; Sonnet executes atomized tasks.**

For Google Gemini, thinking budget levels map directly: `LOW/MED ≈ Sonnet-tier`, `HIGH ≈ Opus-tier`.

| SDD Phase | Anthropic | Google | OpenAI | Rationale |
|---|---|---|---|---|
| Discovery / Ideation | Sonnet | Gemini LOW/MED | — | Fast iteration, no overengineering |
| PRD / User Stories | Sonnet | Gemini LOW/MED | — | Agile iteration on requirements |
| Technical Design / Specs | **Opus** | **Gemini HIGH** | **Codex** | Deep reasoning on trade-offs |
| Routine Implementation | Sonnet | Gemini LOW/MED | — | Daily driver (near-zero edit error) |
| Complex Implementation | **Opus** | **Gemini HIGH** | **Codex** | Broad context + autonomy |
| Review / Basic Debugging | Sonnet | Gemini LOW/MED | — | Covers 80% of cases |
| Deep Debugging / Security | **Opus** | **Gemini HIGH** | **Codex** | Focus on the hard 20% |
| DevOps / CI-CD / Terminal | **Opus** | **Gemini HIGH** | **Codex** | Codex leads Terminal-Bench (77.3%) |

### Practical Rules
1. **Never use Opus/HIGH for routine scaffolding** — it burns tokens without proportional quality gain.
2. **Always use Opus/HIGH for architecture, security, and spec generation** — the cost of a bad spec dwarfs the token savings.
3. **Codex excels at terminal-native workflows** (CI/CD, DevOps, shell scripting) due to its Terminal-Bench optimization.
4. **Multi-model within a single SDD cycle is expected** — switch models between phases, not mid-phase.

---

## 5. Open Source Token Savings Tooling

> **Target:** 60–90% reduction in token consumption per engineering session.

| # | Tool | What It Does | Token Savings | Repository |
|---|---|---|---|---|
| 1 | **rtk** | Compresses terminal output before injecting into LLM context | 60–90% input tokens | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) |
| 2 | **codegraph** | Builds local code graph for navigation instead of file-by-file exploration | ~57% exploration tokens | [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) |
| 3 | **caveman** | Reduces verbose filler text in agent output responses | ~65% output tokens | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) |
| 4 | **ponytail** | Anti-overengineering guard that reduces generated code bloat | 80–94% code reduction | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) |
| 5 | **headroom** | Compresses logs, test output, and context before injection | Up to 95% context compression | [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom) |

### Integration Points with EOS
- **rtk** maps to Primitive #2 (Code Execution) — wrap `run_command` terminal output.
- **codegraph** maps to Primitive #5 (Context Management) — replace broad `grep_search` sweeps.
- **caveman** maps to Token & Context Hygiene Protocol (AGENTS.md §8) — enforce output discipline.
- **ponytail** maps to Anti-Overengineering Gate (AGENTS.md §6) — automated Ponytail Decision Ladder.
- **headroom** maps to Primitive #5 (Context Management) — compress evidence logs before context injection.
