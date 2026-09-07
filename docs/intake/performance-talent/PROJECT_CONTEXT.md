# Project Context: [PRJ-PERFORMANCE-TALENT] Performance Talent Group

* **Project ID:** `PRJ-PERFORMANCE-TALENT`
* **Intake Status:** `IN_PROGRESS (Awaiting Client Asset Package)`
* **Owner:** Performance Talent Group Leadership / EOS Control Plane
* **Date:** 2026-09-07

---

## 1. Executive Summary

Performance Talent Group requires a high-authority, executive-tier web platform to position its specialized talent acquisition, executive search, and high-performance talent representation services. The platform must project institutional credibility, speed, and seamless dual conversion paths:
1. **For Employers / Companies**: Submit talent requests, schedule executive advisory calls.
2. **For Talent / Candidates**: Submit executive credentials, browse specialized practice areas.

---

## 2. Architectural Blueprint & Standards

- **Architecture Style**: Clean / Modular presentation with accessible, semantic HTML5, modern Tailwind CSS tokens, and zero heavy dependencies.
- **Visual Design Standard**: Premium corporate aesthetic (Dark Mode / High Contrast Executive palette, refined typography, subtle micro-interactions).
- **Core Web Vitals Target**:
  - LCP < 1.8s
  - CLS < 0.05
  - INP < 100ms
  - 100% WCAG 2.1 AA keyboard navigability and screen-reader readiness.
- **Lead Capture & Conversion**: Form validation with client-side sanitization, honeypot spam protection, and instant confirmation states.

---

## 3. Immediate Action Protocol Upon Client Package Delivery

Once the client provides their package, EOS will immediately execute:
1. **Intake Ingestion**: Log and classify all brand assets, vectors, and texts in `inventory.json`.
2. **EARS Specification**: Formalize functional requirements in `docs/specs/performance-talent/spec.md`.
3. **Scaffold & Build**: Initialize target workspace in `C:\Users\valen\Documents\Performance-Talent-Group` under Level 2 authorization.
4. **Sensor Suite**: Run full automated audits (`accessibility-auditor`, `seo-auditor`, `performance-auditor`, `security-auditor`).
