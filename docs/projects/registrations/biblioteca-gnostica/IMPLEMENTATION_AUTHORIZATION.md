# IMPLEMENTATION AUTHORIZATION RECORD — BIBLIOTECA GNÓSTICA (PRJ-BIBLIOTECA-GNOSTICA)

* **Project ID:** `PRJ-BIBLIOTECA-GNOSTICA`
* **Authorization Status:** `AUTHORIZED — LEVEL 2 (NATIVE OFFLINE READER & CACHE-FIRST PWA ENGINE)`
* **Approved Scope:** `SPEC-0001-native-offline-reader`
* **Target Project Path:** `C:\Users\valen\Biblioteca-gnostica`
* **Date:** 2026-10-01
* **Author:** Product Owner / EOS Lead Architect

---

## 1. Authorized Execution Scope (`LEVEL 2 — CONTROLLED WRITE BARRIER`)

The execution agent is authorized to operate within `C:\Users\valen\Biblioteca-gnostica` strictly within the following scope:

### A. Authorized Target Files (`authorized_files`)
- `data/nativeBookCatalog.ts` (Structured text & chapter catalog)
- `components/NativeBookReaderModal.tsx` (In-app editorial offline book reader)
- `components/AuthorClientView.tsx` (Integration of Native Reader with dual-mode switch)
- `public/sw.js` (Cache-First PWA service worker upgrade)
- `next.config.ts` (Immutable static asset cache headers)

### B. Authorized Metadata Directories (`authorized_metadata_dirs`)
- `.git/` (git commits using conventional commits)

---

## 2. Forbidden Execution Scope

The execution agent is strictly forbidden from:
1. Writing or modifying any files outside `authorized_files`.
2. Deleting books, covers, or existing PDFs.
3. Exposing plain secrets or credentials.
4. Pushing unverified code that breaks Next.js static generation (`npm run build`).

---

## 3. Mandatory Target Mutation Audit Rules

To certify Level 2 implementation success, the agent must verify:
- `npm run build` exits with code 0 (16/16 static pages generated successfully).
- Zero TypeScript compiler errors.
- Conventional commits followed in target repository.
