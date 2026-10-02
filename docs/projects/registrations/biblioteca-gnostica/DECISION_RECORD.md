# DECISION RECORD — BIBLIOTECA GNÓSTICA (PRJ-BIBLIOTECA-GNOSTICA)

* **Project ID:** `PRJ-BIBLIOTECA-GNOSTICA`
* **Status:** `APPROVED`
* **Date:** 2026-10-01
* **Deciders:** Product Owner / EOS Lead Architect

---

## Context and Problem Statement
Biblioteca Gnóstica Universal is a web platform for gnostic study. While the UI, PWA shell, and branding are visually refined, the reading experience fails when the user is disconnected from the internet:
1. The reading feature relied exclusively on external `<iframe>` embeds to `vopus.org` and `libros.ageac.org`. When offline or on airplane mode, the browser throws `ERR_INTERNET_DISCONNECTED`.
2. Existing PDFs in `public/pdfs` total 111.8 MB across 10 files, making full PWA precaching impossible on mobile data plans.

## Decision
1. Implement a **Native Offline Reader (`NativeBookReaderModal.tsx`)** that renders structured, compressed book text and chapters directly in-app.
2. Provide **Dual-Mode Reading**:
   - `Lector Nativo Offline (0 Datos)` as default, loading in <50ms with 0 KB network data.
   - `Visor Oficial AGEAC / VOPUS` available when online.
3. Include editorial reading controls:
   - Font size adjuster (`A-`, `A`, `A+`).
   - 3 immersive reading themes: Obsidiana (OLED black), Papiro (warm sepia), Medianoche (indigo navy).
   - Local reading position persistence (`localStorage.getItem('gnosis_read_pos_' + bookId)`).
   - Chapter quick-selector drawer.
4. Upgrade Service Worker to Cache-First for static assets to ensure near-zero mobile data consumption on repeat visits.

## Consequences
- **Positive:** True 100% offline reading capability. Near-zero data consumption (<150 KB per book). Instant boot under 50ms.
- **Negative / Tradeoff:** Advanced formatting in external AGEAC visors (like scanned page illustrations) requires internet or local text representation.
