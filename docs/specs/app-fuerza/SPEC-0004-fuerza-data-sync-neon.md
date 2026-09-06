# SPEC-0004: Fuerza Data Resilience & Neon PostgreSQL Telemetry Sync

* **Component ID:** `FUE-DATA-SYNC-2026`
* **Status:** `APPROVED_FOR_TDD_IMPLEMENTATION`
* **Target Project:** `PRJ-APP-FUERZA`
* **Path:** `.eos/satellites/app-fuerza`
* **Version:** `1.0.0`
* **Traceability Index:** `REQ-FUE-004` -> `EVD-FUE-0040`
* **Policy:** `CLEAN_HEXAGONAL_RESILIENCE`

---

## 1. Requirements Engineering (EARS Syntax)

- **[REQ-EARS-SYNC-01] (Ubiquitous - Complete Telemetry Ingestion)**:  
  **THE SYSTEM** SHALL accept, validate, and persist neuromuscular telemetry fields (`rpe`, `rir`, `e1rm`) across all `/api/state/log-set` payloads without truncating or dropping precision.

- **[REQ-EARS-SYNC-02] (Event-Driven - Resilient Neon PostgreSQL Connection)**:  
  **WHEN** initializing the database engine with a remote PostgreSQL or Neon connection URI (`postgresql://` or `postgres://`),  
  **THE SYSTEM SHALL** configure SSL mode (`sslmode=require`), connection pre-pinging (`pool_pre_ping=True`), and connection recycling (`pool_recycle=300`) to prevent dropped proxy connections.

- **[REQ-EARS-SYNC-03] (State-Driven - Graceful Local Development Fallback)**:  
  **WHILE** the external PostgreSQL / Neon database is unreachable or unset during local testing or CI runs,  
  **THE SYSTEM SHALL** safely fall back to local embedded SQLite storage with identical table schemas, ensuring uninterrupted operational uptime.

- **[REQ-EARS-SYNC-04] (Error / Unwanted Condition - Corrupted Sync Quarantine)**:  
  **IF** an incoming WAL synchronization request fails payload validation or SHA-256 integrity,  
  **THEN THE SYSTEM SHALL** respond with HTTP 422/400 and log the quarantine reason, allowing client-side retry or isolation without corrupting historical records.

---

## 2. Acceptance Scenarios (Gherkin / BDD)

### Business Rule 01: Ingestion of Neuromuscular Telemetry from Offline WAL

```gherkin
Scenario: Ingestion of logged set with RPE, RIR, and e1RM
  Given the client flushes a WAL entry for exercise "Sentadilla Trasera"
  And the payload contains load_kg: 140.0, completed_reps: 3, rpe: 9.5, rir: 0.5, e1rm: 154.4
  When the backend processes POST /api/state/log-set
  Then the HTTP status must be 200 OK
  And the persisted ExerciseExecution record must contain exact rpe=9.5, rir=0.5, and e1rm=154.4
```

### Business Rule 02: Neon PostgreSQL SSL & Pooling Reliability

```gherkin
Scenario: Database engine initialization with Neon SSL URL
  Given the environment variable DATABASE_URL contains "postgresql://user:pass@ep-cool-pooler.neon.tech/neondb?sslmode=require"
  When the application initializes the SQLAlchemy engine
  Then pool_pre_ping must be enabled
  And pool_recycle must be set to 300 seconds
  And all database tables must be verified or created automatically
```
