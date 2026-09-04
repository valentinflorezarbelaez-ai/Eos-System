# IMPLEMENTATION AUTHORIZATION RECORD — APP FUERZA (PRJ-APP-FUERZA)

* **Project ID:** `PRJ-APP-FUERZA`
* **Authorization Status:** `AUTHORIZED — LEVEL 2 (CONTROLLED REACT 19 HOOK HYGIENE)`
* **Approved DAG:** `TASKS-FUERZA-001`
* **Target Working Branch:** `fix/react19-hook-hygiene`
* **Target Project Path:** `C:\Users\valen\Documents\APP fuerza`
* **Date:** 2026-09-03
* **Author:** Product Owner / EOS Lead Architect

---

## 1. Authorized Execution Scope (`LEVEL 2 — CONTROLLED WRITE BARRIER`)

The execution agent (Cursor / Antigravity) is authorized to operate strictly on branch `fix/react19-hook-hygiene` within the following scope:

### A. Authorized Target Files (`authorized_files`)
- `atp-strength-frontend/src/app/page.tsx` (T1, T2, T3, T4)

### B. Authorized Metadata Directories (`authorized_metadata_dirs`)
- `.git/` (git branch checkout and conventional commits)

---

## 2. Forbidden Execution Scope

The execution agent is strictly forbidden from:
1. Writing or modifying any files outside `authorized_files`.
2. Mutating the backend `atp-strength-backend` or database schema.
3. Adding new external npm dependencies to `package.json`.
4. Directly pushing unverified mutations to `main` branch.
5. Exposing plain secrets or credentials.

---

## 3. Mandatory Target Mutation Audit Rules

To certify Level 2 implementation success, Task T4 must verify:
- `npm --prefix "atp-strength-frontend" run lint` exits with code 0 (0 errors, 0 warnings).
- `npm --prefix "atp-strength-frontend" run build` compiles with code 0.
- Conventional commits followed on `fix/react19-hook-hygiene`.
