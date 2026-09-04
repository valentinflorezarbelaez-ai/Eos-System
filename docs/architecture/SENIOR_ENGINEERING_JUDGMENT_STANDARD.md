# Estándar de Juicio de Ingeniería Senior (Senior Engineering Judgment)

> **Principio Fundamental:**
> $$\boxed{ \text{SENIORITY} \neq \text{KNOWING MORE TECHNOLOGIES} }$$
> $$\boxed{ \text{SENIORITY} = \text{MAKING BETTER DECISIONS UNDER CONSTRAINTS} }$$
> 
> Un arquitecto senior no se define por las capas que agrega, sino por las abstracciones, agentes y dependencias innecesarias que **decide NO construir**.

---

## 1. El Bucle de Juicio Senior en 8 Fases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE SENIOR ENGINEERING JUDGMENT LOOP                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1] UNDERSTAND (¿Qué problema real estamos resolviendo?)                   │
│      • Falsificación de problemas imaginarios o "Architecture Theater".     │
│                                                                             │
│  [2] SIMPLIFY & DECOMPLECT (Rich Hickey Standard)                           │
│      • Desacoplar conceptos entrelazados; menos acoplamiento = simplicidad.│
│                                                                             │
│  [3] CHALLENGE PREMATURE ABSTRACTIONS (Dan North / Stroustrup)              │
│      • Si 2 capas resuelven el problema, rechazar 5 capas.                  │
│                                                                             │
│  [4] CONCEPTUAL INTEGRITY (Fred Brooks Standard)                            │
│      • El sistema debe parecer diseñado por una sola mente coherente.       │
│                                                                             │
│  [5] MINIMIZE COORDINATION COST (Jeff Dean Standard)                        │
│      • Menor cantidad de agentes y estados = menor probabilidad de fallas.  │
│                                                                             │
│  [6] BUILD SMALLEST VIABLE BEHAVIOR (Kent Beck Standard)                    │
│      • Un solo comportamiento mínimo testeable a la vez (RED -> GREEN).     │
│                                                                             │
│  [7] REFACTOR & CODE HEALTH (Uncle Bob / Martin Fowler)                     │
│      • ¿El cambio de hoy hace más fácil o más difícil el cambio de mañana?  │
│                                                                             │
│  [8] INTEGRATE & OBSERVE (Feedback Empírico)                                │
│      • Validar el resultado real con evidencia criptográfica SHA-256.       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariante Contra el "Architecture Theater"
Si una propuesta introduce capas, dependencias o agentes sin resolver un dolor o requerimiento concreto, el `SeniorJudgmentEngine` **rechaza la propuesta** con veredicto `REJECTED_ARCHITECTURE_THEATER`.
