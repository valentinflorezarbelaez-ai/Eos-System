# IMPLEMENTATION AUTHORIZATION RECORD — APP FUERZA (PRJ-APP-FUERZA)

* **Project ID:** `PRJ-APP-FUERZA`
* **Authorization Status:** `AUTHORIZED — LEVEL 2 (CONTROLLED PYDANTIC V2 & PYTHON 3.12 BACKEND HYGIENE)`
* **Approved Tasks:** `TASKS-FUERZA-002`
* **Target Project Path:** `C:\Users\valen\Documents\APP fuerza`
* **Date:** 2026-09-07
* **Author:** Product Owner / EOS Lead Architect

---

## 1. Authorized Execution Scope (`LEVEL 2 — CONTROLLED WRITE BARRIER`)

The execution agent is authorized to operate within `C:\Users\valen\Documents\APP fuerza` strictly within the following scope:

### A. Authorized Target Files (`authorized_files`)
- `atp-strength-backend/src/routes/state.py`
- `atp-strength-backend/src/routes/strength.py`
- `atp-strength-backend/src/repository/state_repo.py`
- `atp-strength-backend/src/repository/strength_repo.py`
- `atp-strength-frontend/src/app/page.tsx`
- `atp-strength-frontend/src/app/components/ZenDashboardClient.tsx`

### B. Authorized Metadata Directories (`authorized_metadata_dirs`)
- `.git/` (git commits using conventional commits)

---

## 2. Forbidden Execution Scope

The execution agent is strictly forbidden from:
1. Writing or modifying any files outside `authorized_files`.
2. Modifying database schemas or dropping tables.
3. Adding new external dependencies to `pyproject.toml` or `requirements.txt`.
4. Directly pushing unverified mutations to remote production.
5. Exposing plain secrets or credentials.

---

## 3. Mandatory Target Mutation Audit Rules

To certify Level 2 implementation success, the agent must verify:
- `python -m ruff check "atp-strength-backend"` exits with code 0 (0 errors, 0 warnings).
- `python -m pytest "atp-strength-backend"` exits with code 0 with 0 deprecation warnings from target codebase.
- Conventional commits followed in target repository.
