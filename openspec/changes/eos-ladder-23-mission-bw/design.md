# Architectural Design — Mission BW: Sovereign Agentic Knowledge Graph & Associative Memory Port

## 1. Domain Model

```text
┌─────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE GRAPH STORE                    │
│                                                             │
│   Node: { id, label, type, properties, accessCount, ... }   │
│     │                                                       │
│     ▼ Edge: { sourceId, targetId, relation, weight, ... }   │
│     │                                                       │
│   Node: { id, label, type, properties, accessCount, ... }   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 ASSOCIATIVE QUERY ENGINE                    │
│  - Traversal: BFS bounded to maxDepth                       │
│  - Scoring:   Relevance = weight * accessDecay * recency    │
│  - Screening: Law VI secret scanning & Fundacion deny       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   RECEIPT SEALER (BW-RCPT-*)                │
│  - SHA-256 Canonical Snapshot Hash                          │
│  - Sequential Hash Chaining (prevReceiptHash)               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Policy Gate Invariants

1. `MALFORMED_NODE_DENY`: Nodes must have valid non-empty `id`, `label`, and `entityType`.
2. `MALFORMED_EDGE_DENY`: Edges must reference existing nodes with valid `relationType` and finite `weight > 0`.
3. `TRAVERSAL_LIMIT_EXCEEDED_DENY`: Graph queries cannot exceed `maxDepth=10` or `maxNodes=1000`.
4. `SECRET_DETECTED_DENY`: Any property matching known vendor key prefixes or token formats is rejected fail-closed.
5. `FUNDACION_ALWAYS_DENY`: Any entity property or path pointing to `Documents/Fundacion` is rejected.
