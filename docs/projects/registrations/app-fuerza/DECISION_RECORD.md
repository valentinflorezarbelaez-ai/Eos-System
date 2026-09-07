# DECISION RECORD — ATP STRENGTH (PRJ-APP-FUERZA)

* **Project ID:** `PRJ-APP-FUERZA`
* **Phase:** Phase 6 — Technical Status Reclassification & Level 2 Backend Deprecation Remediation
* **Date:** 2026-09-07
* **Author:** Product Owner & EOS System Lead Architect

---

## 1. Decision Matrix & Classification

| Decision ID | Topic | Required Now? | Decision Owner | Execution Mode | Impact on Implementation | Status |
|---|---|---|---|---|---|---|
| **DEC-FUE-001** | Technical Status Certification | Yes | Product Owner | `OWNER_APPROVED` | High — Certify status as VERIFIED based on 0-lint Turbopack & Pytest evidence | `RESOLVED` |
| **DEC-FUE-002** | Level 2 Backend Deprecation Remediation | Yes | Product Owner | `OWNER_APPROVED` | Medium — Authorize refactoring Pydantic v2 schemas and Python 3.12 datetime | `RESOLVED` |
| **DEC-FUE-003** | Production Deployment & Cloud Provisioning | No | Product Owner | `OWNER_REQUIRED` | Low — Local/staging verified; production cloud deployment pending | `DEFERRED` |
| **DEC-FUE-004** | Frontend SSR Hydration Remediation | Yes | Product Owner | `OWNER_APPROVED` | Medium — Eliminate SSR hydration mismatch caused by client localStorage state via dynamic import | `RESOLVED` |

---

## 2. Technical Rationale

- **DEC-FUE-001 (Certification):** Deterministic audit executed on 2026-09-07 proved that the previously reported 5 ESLint errors and 58 Ruff findings were completely remediated in commits `03d41c5` and `8c04cd7`. Next.js 16.3.4 (Turbopack) build generated 5/5 routes statically with exit code 0. Status is upgraded to `VERIFIED`.
- **DEC-FUE-002 (Backend Modernization):** The 18 deprecation warnings detected during test runs (`ConfigDict`, `json_schema_extra`, `datetime.now(datetime.UTC)`) must be resolved to eliminate technical debt before future framework upgrades (FastAPI / Pydantic v3).
- **DEC-FUE-004 (Frontend Hydration):** Resolved SSR vs client HTML divergence where server rendered CoachGuidedView while client localStorage had coachMode disabled, triggering Next.js hydration warning. Extracted client component and applied dynamic import with `{ ssr: false }`, ensuring 100% deterministic mounting and zero dev overlay issues.
