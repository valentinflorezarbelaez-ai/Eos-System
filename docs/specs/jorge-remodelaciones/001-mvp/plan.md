# [PLAN-JORGE-001]: Technical Architecture & Modernization Plan

* **Target Spec:** `[SPEC-JORGE-001]`
* **Status:** `APPROVED` (Authorized by Product Owner)
* **Architect:** Senior Architect / EOS Control Plane

---

## 1. System Architecture & Module Boundaries

The project adheres to Clean Architecture principles tailored for high-performance JAMstack web applications:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION / UI LAYER                          │
│        (Semantic HTML5, CSS Custom Properties, Responsive Layout)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION / INTERACTION SERVICES                   │
│        (Split Sliders, Lightbox Modal, Mobile Nav, Scroll Tracker)      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                         CORE / DOMAIN LOGIC                             │
│     (Particle Physics Engine, Metric Interpolator, Filter Predicates)   │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                      INFRASTRUCTURE & EXTERNAL                          │
│     (Vercel CDN, WhatsApp API, Google Fonts, Structured Data LD+JSON)   │
└─────────────────────────────────────────────────────────────────────────┘
```

* **Module Breakdown**:
  * `index.html`: Structural semantic layout, WCAG landmark tags (`main`, `nav`, `aside`, `header`, `footer`), JSON-LD schema, open graph metadata.
  * `styles.css`: Central design tokens, `:focus-visible` outlines, `@media (prefers-reduced-motion)` overrides, utility classes.
  * `app.js`: Autonomous, modular interaction services with graceful degradation when JavaScript or canvas context is unavailable.
  * `assets/`: Optimized WebP and JPEG media assets.
  * `robots.txt` & `sitemap.xml`: Static search engine indexing directives.

---

## 2. Architecture Decision Records (ADRs) & Trade-offs

### ADR-01: Asset Optimization via WebP Conversion vs External Image CDN
* **Decision**: Convert repository JPEG assets to WebP with dual `<picture>` / `srcset` fallbacks directly in the static repository.
* **Justification**: Eliminates third-party latency, protects against external API quota outages, adheres to zero-dependency rule, and runs natively on Vercel Edge.
* **Alternatives Considered & Rejected**:
  * *Cloudinary / Imgix*: Discarded due to ongoing recurring SaaS costs and added external network dependency.
  * *Client-side canvas compression*: Discarded because CPU decoding overhead on mobile defeats the purpose of initial page speed.

### ADR-02: Native Design System Extension vs CSS Utility Framework
* **Decision**: Extend existing CSS Custom Properties (`--corp-blue-hover`, `--border-accent`) with standardized `:focus-visible` and accessibility tokens.
* **Justification**: Preserves the existing dark luxury aesthetic without introducing 50KB+ of framework classes or breaking existing component styling.
* **Alternatives Considered & Rejected**:
  * *Tailwind CSS*: Discarded because injecting a build step and rewriting 1000+ lines of HTML markup violates the project's minimal churn policy and adds node_modules complexity to an otherwise clean static site.

### ADR-03: Modular Vanilla Interactivity vs External Animation Libraries
* **Decision**: Fix lifecycle invocations in `app.js` and keep pure vanilla browser APIs (`IntersectionObserver`, `requestAnimationFrame`, `CanvasRenderingContext2D`).
* **Justification**: Total JavaScript payload remains under 15 KB while providing 60 FPS hardware-accelerated animations.
* **Alternatives Considered & Rejected**:
  * *GSAP / Framer Motion*: Discarded due to bundle bloat (>60 KB) and licensing considerations for commercial landing pages.
  * *Three.js / WebGL Canvas*: Discarded due to excessive battery drain and initial parse times on mobile devices.

---

## 3. Verification Harness & Auditor Checklist

* [ ] **Quality Auditor**: Verify that `initParticles()` and `initMetricCounters()` execute cleanly on `DOMContentLoaded` without console warnings.
* [ ] **Accessibility Auditor**: Verify WCAG 2.1 AA conformance, focusing on `:focus-visible` ring visibility and skip-link functionality.
* [ ] **Performance Auditor**: Benchmark image asset weights, verifying >70% compression savings and zero missing dimensions.
* [ ] **SEO Auditor**: Verify `robots.txt`, `sitemap.xml`, canonical URL, and absolute OpenGraph previews.
* [ ] **Security Auditor**: Validate link safety and lack of XSS vectors.
