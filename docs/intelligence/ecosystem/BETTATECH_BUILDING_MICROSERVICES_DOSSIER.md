# Dossier de BettaTech: "Building Microservices" (Sam Newman) y la Madurez del Ingeniero

> **Axioma de la Arquitectura de Microservicios:**  
> **"La complejidad nunca desaparece; solo decides dónde pagarla: o en el código dentro de un monolito, o en la red y la infraestructura distribuida con microservicios"**.

---

## 1. Los 4 Principios de Madurez Arquitectónica del Video

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PRINCIPIOS DE MADUREZ EN MICROSERVICIOS                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1] CONSERVACIÓN DE LA COMPLEJIDAD                                         │
│      • No elijas microservicios para "eliminar" complejidad. La complejidad │
│        se traslada de las llamadas a funciones a la red (latencia, fallos,  │
│        consistencia y observabilidad).                                      │
│                                                                             │
│  [2] DELIMITACIÓN POR MODELO DE NEGOCIO (BOUNDED CONTEXTS)                 │
│      • Nunca dividas servicios por capas técnicas (Frontend, Backend, DB).  │
│        Organízalos en torno a dominios de negocio (Facturación, Envíos,     │
│        Usuarios) para que el cambio organizacional sea autónomo.            │
│                                                                             │
│  [3] EL MICROSERVICIO COMO PRODUCTO INTERNO (INTERNAL SAAS)                │
│      • Trata cada microservicio como si fuera una API pública o un SaaS     │
│        interno: contratos explícitos, versionado estricto y cero acoplamiento│
│        a la base de datos de otros servicios.                               │
│                                                                             │
│  [4] TESTING DIRIGIDO POR EL CONSUMIDOR (CONSUMER-DRIVEN CONTRACTS)        │
│      • Pruebas de contrato (ej. Pact) para garantizar que los cambios en un │
│        productor no rompan a los consumidores en producción.                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Aplicación Directa en EOS

En EOS, cada módulo o motor del plano de control opera bajo este principio: **Aislamiento hexagonal estricto (`Ports & Adapters`), contratos JSON-Schema versionados y barreras de lectura/escritura deterministas ($\Delta = 0$)**.
