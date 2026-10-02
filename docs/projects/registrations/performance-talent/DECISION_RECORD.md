# Decision Record: Scout-First Platform Architecture & Optimization

**Project ID:** `PRJ-PERFORMANCE-TALENT`  
**Date:** 2026-10-01  
**Status:** `APPROVED`  
**Deciders:** Product Owner & Senior Software Architect

---

## 1. Context & Problem Statement

Performance Talent Group represents elite young football talent (Envigado F.C., Colombian Youth National Team). The digital platform must project the authority of a top-tier international sports agency while providing European and South American scouts with instantaneous, friction-free access to player data under varied mobile stadium network conditions.

The previous implementation relied on client-side JS DOM injection for the roster, embedded 1MB+ base64 blobs inside static dossiers, and lacked an executive print/PDF protocol.

---

## 2. Decision

We approve:
1. **Prerendered Semantic Roster**: Injecting fully formed semantic HTML player cards into `index.html` with progressive JS enhancement for instant first-paint and 100% SEO discoverability.
2. **Base64 Purge & Asset Decoupling**: Removing inline base64 bloat from `dossiers/*.html` to achieve ultra-lightweight (<35 KB) technical sheet payloads.
3. **Printable Executive Scout Sheet**: Adding `@media print` CSS rules, print-friendly monochrome/contrast modes, and a dedicated "Imprimir / Exportar Ficha Scout" button with embedded QR codes.
4. **Enhanced Human & Ethical Manifesto**: Integrating the agency's holistic human development pillars directly into the brand presentation.

---

## 3. Consequences

### Positive:
- **Instant First-Paint (<100ms)**: Zero blank state when navigating to the roster section.
- **Extreme Mobile Data Savings**: Dossier HTML sizes drop from ~1.07 MB to ~25 KB (97% payload reduction).
- **Executive Utility**: Scouts and sporting directors can immediately export clean 1-page PDF dossiers for club board reviews.
- **Ethical Differentiation**: Clearly distinguishes PTG from speculative player brokering.

### Tradeoffs:
- `index.html` raw file size increases slightly (~4 KB) to hold the prerendered semantic cards, which is overwhelmingly offset by the elimination of CLS and instantaneous render.
