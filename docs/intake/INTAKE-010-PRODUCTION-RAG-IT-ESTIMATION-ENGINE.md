# INTAKE RECORD: EOS-010
## Production-Ready RAG & Multi-Agent IT Project Effort & Cost Estimation Engine

---

### 1. Document Metadata
* **Intake ID:** `INTAKE-010`
* **Target System:** EOS System Core (`C:\Users\valen\Eos-System-1`) & Associated Fleet Control Planes
* **Authorizer:** Valentín Flórez Arbeláez (Lead Architect & System Owner)
* **Status:** `INTAKE_COMPLETE`
* **Timestamp:** 2026-10-25T13:06:00-05:00
* **Source Reference:** LIDR Academy / Antonio Pérez Workshop ("AI Engineer Pro: Diseña sistemas RAG listos para producción")
  - URLs: `https://tech.lidr.co/material-workshop-ai-engineer-pro`, `https://github.com/williamsnieves/rag-estimation-platform`, `https://github.com/williamsnieves/rag-estimation-service`
* **Mandate Statement:**
  > "Diseña sistemas RAG listos para producción... un sistema de estimación de tareas, esfuerzo y coste de proyectos IT, integrado en un software real de gestión de proyectos. De esta manera, durante el directo este martes nos podremos centrar en la arquitectura multi-agente y en cómo reemplazar decisiones con modelos de decisión como Jev."

---

### 2. Business & Engineering Drivers

#### A. The Decoupled 2-Tier Production RAG Architecture
1. **Management & UI Platform (Tier 1)**:
   - Manages proposals, project management integrations (Jira, Linear, ClickUp), PDF/JSON quote exports, and background asynchronous queue execution.
2. **Specialized RAG & Embedding Service (Tier 2)**:
   - High-performance vector service powered by PostgreSQL + `pgvector` (cosine similarity $\ge 0.75$).
   - Ingestion and chunking of historical quotes, meeting transcriptions, and budget line items.
   - Normalized unit extraction (hours, days $\times 8$).

#### B. The 5-Phase Advanced RAG Pipeline
1. **Query Preprocessing & Expansion**:
   - Acronym disambiguation (JWT, OAuth, CI/CD, PWA, SPA, ORM, etc.) and technology alias canonicalization (`ts` $\to$ TypeScript, `postgres` $\to$ PostgreSQL, `k8s` $\to$ Kubernetes).
2. **Per-Task Granular Retrieval (`_search_per_task`)**:
   - Decomposes the high-level business scope into a Work Breakdown Structure (WBS) of functional blocks and granular tasks.
   - Executes parallel semantic queries against vector stores via `asyncio.gather` / `Promise.all` with minimum similarity thresholds.
3. **Multi-Factor Confidence & Grounding Engine**:
   - Computes deterministic confidence scores based on:
     - Reference Volume Factor ($C \ge 10 \implies 1.0$)
     - Semantic Similarity Factor ($\max(0, (\text{avg\_similarity} - 0.5) / 0.5)$)
     - Technology Stack Match Ratio (Jaccard index)
     - Variance Penalty on historical hourly variance.
4. **Tri-Point PERT Effort & Seniority-Weighted Costing**:
   - Mathematical distribution: $T_e = \frac{O + 4M + P}{6}$ (Optimistic, Most Likely, Pessimistic).
   - Seniority role matrix: Tech Lead, Senior Fullstack, Mid Dev, QA Engineer, DevOps Specialist with calibrated market rates.
5. **Multi-Agent Decision Calibration (Replacing Heuristics with Decision Models)**:
   - Deploys consensus between Decomposition, Retrieval, Cost Allocation, and Adversarial Risk Auditor agents to detect scope creep and missing technical prerequisites.

---

### 3. Constraints & Invariants
* **Clean Hexagonal Isolation**: Pure Layer 0 domain models with 0 external runtime dependencies.
* **Deterministic Statistical Math**: Mathematical PERT distributions and variance calculations must be deterministic.
* **Evidence Before Claims**: 100% type safety, cryptographic SHA-256 evidence attestation, and Exit Code 0 across verification suites.
