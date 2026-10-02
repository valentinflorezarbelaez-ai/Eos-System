# Project Context & Autonomous Discovery: [PRJ-BIBLIOTECA-GNOSTICA]

* **Project Name:** Biblioteca Gnóstica Universal
* **Project ID:** `PRJ-BIBLIOTECA-GNOSTICA`
* **Target Path:** `C:\Users\valen\Biblioteca-gnostica`
* **Repository:** `https://github.com/valentinflorezarbelaez-ai/Biblioteca-gnostica.git`
* **Branch:** `main`
* **Project Type:** `WEB_APP`
* **Onboarded At:** 2026-10-01T22:30:00Z

---

## 1. Discovered Stack & Runtimes
* **Languages:** TypeScript 5, JavaScript ES2022
* **Frameworks:** Next.js 16.2.11 (Turbopack), React 19.2.4, Tailwind CSS v4
* **UI Components:** Lucide React icons, EB Garamond editorial typography, JetBrains Mono
* **Package Manifest:** `package.json`
* **Hosting / Deployment:** Vercel Production (`https://biblioteca-gnostica.vercel.app`)

---

## 2. Core Functional Gaps Identified
1. **Offline Reading Failure:** The reading button loads external iframes to `vopus.org` or `libros.ageac.org`. When disconnected, iframes fail with network error.
2. **PDF Payload Size:** 10 PDFs in `public/pdfs` total 111.8 MB, precluding complete client-side cache download.
3. **Data Consumption:** Absence of native text reader forces heavy network streaming on cellular data.

---

## 3. Governance Baseline & Risk Profile
* **Risk Tier:** `LOW`
* **HITL Gates Required:** None (Level 2 Authorization granted by Product Owner)
* **Autonomy Model:** Level 2 Controlled Implementation (Specific target files for Native Reader).
