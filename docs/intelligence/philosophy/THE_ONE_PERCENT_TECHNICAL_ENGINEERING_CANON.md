# La Biblioteca y la Doctrina del 1% Técnico de la Computación

> **La Ley de Oro del 1% Técnico:**  
> **"Leer no te coloca en el 1%. Lo que te coloca en el 1% es: LEER $\longrightarrow$ IMPLEMENTAR $\longrightarrow$ MEDIR $\longrightarrow$ ROMPER $\longrightarrow$ EXPLICAR LAS DECISIONES $\longrightarrow$ REPETIR EL CICLO"**.  
> Para diseñar sistemas operativos, compiladores, bases de datos distribuidas y plataformas de escala planetaria, se debe abandonar el consumo pasivo y **construir artefactos reales defendidos con evidencia irrefutable**.

---

## 1. La Arquitectura de Conocimiento del 1% Técnico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EL NÚCLEO DE INGENIERÍA DE ÉLITE MUNDIAL                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1] NÚCLEO ÉLITE: LA MÁQUINA, EL LENGUAJE Y EL RIGOR                       │
│      • Knuth (TAOCP) + Abelson (SICP) + Cormen (CLRS)                       │
│      • Bryant (CS:APP) + Arpaci-Dusseau (OSTEP) + Nystrom (Crafting Interp) │
│                                                                             │
│  [2] SISTEMAS DISTRIBUIDOS Y STORAGE INTERNALS                              │
│      • MIT 6.5840 (Laboratorios de Raft / KV Store)                         │
│      • Kleppmann (DDIA) + Alex Petrov (Database Internals: B-Trees/LSM)     │
│      • Van Steen & Tanenbaum + Brendan Burns (Distributed Patterns)         │
│                                                                             │
│  [3] PAPERS FUNDACIONALES: CÓMO SE INVENTÓ LA COMPUTACIÓN MODERNA           │
│      • MapReduce, GFS, Bigtable, Dynamo, Spanner (TrueTime) y Raft          │
│      • Jay Kreps (The Log) + Fischer, Lynch, Paterson (FLP Theorem)         │
│                                                                             │
│  [4] PRODUCCIÓN, RESILIENCIA Y CONFIABILIDAD (SRE)                          │
│      • Trilogía Google SRE + Release It! (Nygard: Circuit Breakers)         │
│                                                                             │
│  [5] LIDERAZGO TÉCNICO STAFF / PRINCIPAL                                    │
│      • Will Larson (Staff Engineer / An Elegant Puzzle)                     │
│      • Tanya Reilly (The Staff Engineer's Path) + SWE at Google             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. La Ruta de las 7 Fases con Artefactos Reales

| Fase | Tarea de Construcción Obligatoria | Artefacto Generado / Entregable |
| :---: | :--- | :--- |
| **1** | **CS:APP**: Escribir programas en C que inspeccionen memoria, caches y procesos. | Analizador de memoria heap, stack y perfilador de cache L1-L3. |
| **2** | **OSTEP + xv6**: Construir partes de un sistema operativo. | Módulo de planificación de CPU o sistema de archivos con journaling. |
| **3** | **Crafting Interpreters**: Crear un lenguaje completo desde cero. | Intérprete AST (`jlox`) + Máquina Virtual de Bytecode con GC (`clox`). |
| **4** | **MIT 6.5840 + Papers**: Implementar Raft y KV store distribuido. | Cluster Raft pasando pruebas de partición de red y elecciones de líder. |
| **5** | **DDIA + Database Internals**: Diseñar un motor de almacenamiento. | Motor LSM-Tree con MemTable, WAL (Write-Ahead Log) y compactación SSTable. |
| **6** | **Google SRE + Chaos**: Operar un servicio bajo fuego real. | Dashboard con SLOs, Error Budgets y pruebas de inyección de fallos caóticos. |
| **7** | **Staff Engineer**: Liderar una transformación técnica transversal. | Documento RFC de arquitectura empresarial con matriz de trade-offs. |

---

## 3. Integración Directa en el Plano de Control de EOS
EOS no es una herramienta pasiva de código; es un **sistema de meta-ingeniería cibernética** programado para ejecutar cada fase de esta ruta, verificando matemáticamente que cada invariante ($\Delta = 0$, determinismo, Hoare Triples, y tolerancia a fallos) se cumpla sin excepción.
