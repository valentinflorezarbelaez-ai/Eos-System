# Project Intake Record: [PRJ-JORGE-REMODELACIONES] Jorge Remodelaciones & Acabados

* **Intake ID:** ITK-JORGE-001
* **Target Project:** PRJ-JORGE-REMODELACIONES
* **Intake Status:** COMPLETE
* **Date:** 2026-09-03
* **Owner:** EOS Lead Architect / Control Plane

---

## 1. Executive Summary & Value Proposition
Jorge Remodelaciones & Acabados is a specialized residential finishing and remodeling contractor operating in the Oriente Antioqueño and Valle de Aburrá regions (Medellín, Rionegro, La Ceja, El Retiro, Marinilla). The business model transforms newly delivered grey-work ("obra gris") apartments into turnkey, luxury residential homes.

The landing page functions as an inbound conversion funnel designed to build authority, showcase tangible before-and-after craftsmanship, demonstrate proven track record in specific residential buildings, and route prospective property owners directly into WhatsApp conversations with commercial lead Alejandra Arbeláez.

---

## 2. Stakeholders & Key Contacts
* **Contractor & Project Leader:** Jorge (Head of Craftsmanship & Execution, 1200+ completed units).
* **Commercial Advisor & Lead Qualifier:** Alejandra Arbeláez (`+57 310 801 1600`).
* **Target Audience:** Middle-to-high income property buyers who have purchased apartments in grey work and require turnkey finishing with written guarantee and direct supervision.

---

## 3. Technology Baseline & Architecture
* **Frontend Stack:** Semantic HTML5, Vanilla CSS3 (Custom Properties Design System, Dark Luxury theme), Vanilla JavaScript.
* **Hosting Platform:** Vercel Static Web Hosting (`cleanUrls: true`).
* **External Integrations:** WhatsApp Click-to-Chat API (`wa.me`), Google Fonts API, Schema.org `HomeAndConstructionBusiness` JSON-LD.
* **Key Components:**
  1. Particle physics canvas header.
  2. Dual interactive before/after split sliders (Kitchen & Master Bathroom).
  3. Interactive tabbed gallery with modal lightbox.
  4. Residential building experience list (Citrika, Nativa, Naté, Bosque Ceibal, Bosque Robledal, Pinares, Olivar, Torres de San Juan).
  5. 3-tier finishing packages (Básico, Estándar, Full Luxury).
  6. Dedicated WhatsApp conversion hub and sticky mobile floating FAB.

---

## 4. Key Business Constraints & Invariants
1. **Zero Framework Bloat:** Maintain fast loading with zero heavy runtime dependencies (no React/Vue overhead).
2. **Offline Resilience & Asset Integrity:** All critical images must be optimized and responsive.
3. **Frictionless Lead Routing:** Every CTA must cleanly route to Alejandra Arbeláez with context-specific pre-populated WhatsApp messages.
4. **Trust & Proof Dominance:** Maintain visual proof of actual delivered work with clear distinctions between "Antes / Obra Gris" and "Después / Terminado".
