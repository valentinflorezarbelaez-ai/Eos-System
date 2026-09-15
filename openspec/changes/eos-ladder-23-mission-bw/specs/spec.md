# Specification — Mission BW: Sovereign Agentic Knowledge Graph & Associative Memory Port (SPEC-0080)

## 1. Functional Requirements (EARS)

### REQ-EARS-BW-01: Entity Node Ingestion & Schema Validation
- **Event-Driven**: WHEN an agent or system submits an entity node to the knowledge store, THE SYSTEM SHALL validate node properties, compute the canonical SHA-256 node digest, index the node, and seal an ingestion receipt (`BW-RCPT-*`).
- **Error Condition**: IF an entity node lacks a valid `id`, `label`, or `entityType`, THE SYSTEM SHALL DENY ingestion (`MALFORMED_NODE_DENY`) and emit a sealed receipt.

### REQ-EARS-BW-02: Relation Edge Linking & Topology Validation
- **Event-Driven**: WHEN an agent declares a directional or bidirectional relationship between two existing nodes, THE SYSTEM SHALL validate endpoint existence, record the weighted edge, update connectivity indices, and seal a linking receipt (`BW-RCPT-*`).
- **Error Condition**: IF an edge references a non-existent source or target node, or has a non-positive weight, THE SYSTEM SHALL DENY linking (`MALFORMED_EDGE_DENY`) and emit a sealed receipt.

### REQ-EARS-BW-03: Associative Contextual Traversal & Scoring
- **Event-Driven**: WHEN an associative query is initiated from a seed node, THE SYSTEM SHALL execute a bounded breadth-first traversal up to `maxDepth`, calculate decay-weighted relevance scores, return ranked entities, and seal an associative query receipt (`BW-RCPT-*`).
- **State-Driven**: WHILE traversing cyclic or complex graph subgraphs, THE SYSTEM SHALL maintain a visited entity set, strictly preventing infinite traversal loops.

### REQ-EARS-BW-04: Security Screening & Write Barrier Enforcement
- **Error Condition**: IF any node property, edge attribute, or query string contains plain secret credentials or vendor key patterns, THE SYSTEM SHALL DENY the operation (`SECRET_DETECTED_DENY`) and emit a sealed receipt.
- **Error Condition**: IF any node property or edge targets `Documents/Fundacion`, THE SYSTEM SHALL trigger `FUNDACION_ALWAYS_DENY` and preserve `Fundacion Δ=0`.

### REQ-EARS-BW-05: Cryptographic Receipts & Trail Custody
- **Ubiquitous**: THE SYSTEM SHALL serialize all memory operations into immutable nine-field cryptographic receipts (`BW-RCPT-*`) chained via `prevReceiptHash` and verified via canonical SHA-256 digest validation.

---

## 2. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Ingestión exitosa de nodo en grafo de memoria
  DADO un puerto de memoria agéntica soberana inicializado
  CUANDO el agente registra un nodo con id "concept:tdd", label "Test-Driven Development", y entityType "engineering-practice"
  ENTONCES la respuesta es exitosa con código "NODE_INGEST_OK"
  Y el nodo queda almacenado con digest SHA-256 válido
  Y se emite un recibo criptográfico con prefijo "BW-RCPT-"

ESCENARIO: Rechazo fail-closed de arista con nodos inexistentes
  DADO un puerto de memoria agéntica soberana inicializado
  CUANDO se intenta enlazar una arista desde "node:phantom-1" hacia "node:phantom-2"
  ENTONCES la operación es rechazada con código "MALFORMED_EDGE_DENY"
  Y se emite un recibo sellado con decisión de rechazo

ESCENARIO: Búsqueda asociativa con puntaje ponderado y prevención de ciclos
  DADO un grafo con nodos "A", "B", "C" conectados circularmente (A -> B -> C -> A)
  CUANDO se ejecuta una consulta asociativa desde "A" con maxDepth 2
  ENTONCES se retornan los nodos ordenados por relevancia sin entrar en bucle infinito
  Y el recibo de consulta certifica la profundidad explorada

ESCENARIO: Detección y bloqueo de secretos (Law VI)
  DADO un intento de almacenar un nodo con una API key simulada (sk-...) en sus propiedades
  CUANDO el policy gate evalúa el contenido
  ENTONCES la operación es denegada con código "SECRET_DETECTED_DENY"
  Y ninguna clave queda persistida en memoria

ESCENARIO: Barrera de escritura Fundacion intacta
  DADO un intento de asociar un nodo con ruta "C:/Users/valen/Documents/Fundacion/config"
  CUANDO el policy gate evalúa la ruta
  ENTONCES la operación es denegada con "FUNDACION_ALWAYS_DENY"
  Y Fundacion mantiene Delta=0
```
