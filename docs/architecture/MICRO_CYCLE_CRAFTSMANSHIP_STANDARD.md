# Estándar de Ingeniería en Micro-Ciclos (Uncle Bob Craftsmanship)

> **Principio Maestro:** La verdadera maestría no está en generar 40 archivos de golpe, sino en avanzar comportamiento por comportamiento a través de micro-ciclos atómicos de feedback inmediato.  
> **Ecuación Central:**
> $$\boxed{ \text{PROBLEM} \rightarrow \text{SMALLEST BEHAVIOR} \rightarrow \text{RED} \rightarrow \text{GREEN} \rightarrow \text{REFACTOR} \rightarrow \text{REVIEW} \rightarrow \text{INTEGRATE} }$$

---

## 1. Los 7 Pasos del Micro-Ciclo Atómico de EOS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   EL MICRO-CICLO DE INGENIERÍA ATÓMICA                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [P1] BEHAVIOR ISOLATION                                                    │
│       • Identificar el comportamiento mínimo y atómico a demostrar.         │
│                                                                             │
│  [P2] RED TEST (Falla Primero)                                              │
│       • Escribir ÚNICAMENTE el test que demuestra la ausencia del cambio.   │
│       • Ejecutar y verificar que falla por la razón correcta.              │
│                                                                             │
│  [P3] GREEN CODE (Mínimo Necesario)                                         │
│       • Escribir la implementación mínima indispensable para pasar el test. │
│                                                                             │
│  [P4] REFACTOR & CODE HEALTH (Dejar el sistema más sano)                    │
│       • Eliminar duplicaciones, mejorar nombres y simplificar diseño.       │
│       • Invariante: Los tests siguen en VERDE durante todo el refactor.     │
│                                                                             │
│  [P5] ADVERSARIAL REVIEW (Criterio Google / Senior)                         │
│       • ¿La abstracción está justificada? ¿El naming comunica intención?    │
│       • ¿Dejamos deuda técnica? ¿El sistema quedó más sano?                 │
│                                                                             │
│  [P6] RE-VALIDATION & INVARIANTS                                            │
│       • Ejecutar suite de regresión completa y verificar límite Δ = 0.      │
│                                                                             │
│  [P7] ATOMIC INTEGRATION                                                    │
│       • Registrar incremento en el ledger inmutable con firma SHA-256.      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariante "Leave the System Healthier"
Cada micro-ciclo completado debe demostrar matemáticamente que:
1. Ningún test previo sufrió regresión.
2. La complejidad ciclomática se mantuvo acotada.
3. Las dependencias externas se mantuvieron en `NODE_BUILTINS_ONLY` (L0).
