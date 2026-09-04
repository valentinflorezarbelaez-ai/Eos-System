# Dossier de BettaTech: Las 8 Estructuras de Datos Fundamentales

> **Axioma de Rob Pike & Linus Torvalds:**  
> **"Los malos programadores se preocupan por el código. Los buenos programadores se preocupan por las estructuras de datos y sus relaciones"**.

---

## 1. La Matriz de las 8 Estructuras de Datos Esenciales

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 LAS 8 ESTRUCTURAS DE DATOS QUE DOMINAN EL SOFTWARE          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1] ARRAYS (ARREGLOS CONTIGUOS)                                            │
│      • Memoria contigua en RAM. Acceso aleatorio $\mathcal{O}(1)$.           │
│      • Ventaja suprema: Localidad de referencia en caches de CPU (L1/L2/L3). │
│                                                                             │
│  [2] LINKED LISTS (LISTAS ENLAZADAS)                                        │
│      • Nodos dispersos con punteros `next`/`prev`. Inserción $\mathcal{O}(1)$│
│      • Desventaja: Pobre localidad de cache y sobrecosto de punteros.        │
│                                                                             │
│  [3] STACKS (PILAS - LIFO)                                                  │
│      • `Push` / `Pop` en $\mathcal{O}(1)$. Base de call stacks y VMs bytecode.│
│                                                                             │
│  [4] QUEUES (COLAS - FIFO)                                                  │
│      • `Enqueue` / `Dequeue` en $\mathcal{O}(1)$. Event loops y buffers.    │
│                                                                             │
│  [5] HASH TABLES (TABLAS HASH)                                              │
│      • Función hash determinista y buckets. Búsqueda promedio $\mathcal{O}(1)$│
│                                                                             │
│  [6] TREES (ÁRBOLES: BST, HEAPS, TRIES)                                     │
│      • Heaps para colas de prioridad ($\mathcal{O}(\log N)$), Tries para    │
│        prefijos y autocompletado, Árboles B/LSM para bases de datos.        │
│                                                                             │
│  [7] GRAPHS & DAGs (GRAFOS DIRIGIDOS ACÍCLICOS)                             │
│      • Matriz/Lista de adyacencia. Ordenamiento topológico en pipelines     │
│        de tareas (el núcleo de `MissionDagPipelineEngine` en EOS).          │
│                                                                             │
│  [8] SETS (CONJUNTOS)                                                       │
│      • Unicidad garantizada y test de pertenencia inmediato.                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Aplicación Directa en el Plano de Control de EOS

En EOS, **el motor de ejecución de misiones (`MissionDagPipelineEngine`)** se basa en un **Grafo Dirigido Acíclico (DAG)** con ordenamiento topológico en tiempo $\mathcal{O}(V + E)$, y la memoria interna de tokens utiliza **Tablas Hash y B-Trees** para garantizar latencias $< 0.1\text{ ms}$.
