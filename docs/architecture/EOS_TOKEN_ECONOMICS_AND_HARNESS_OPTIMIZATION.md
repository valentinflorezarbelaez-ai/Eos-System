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
