# [PLAN-JORGE-002]: Architecture & Implementation Plan — Mobile-First Ergonomics

* **Target Spec:** `[SPEC-JORGE-002]`
* **Status:** `APPROVED`
* **Architect:** Senior Architect / EOS Control Plane

---

## 1. Technical Strategy & Breakpoint Architecture

```text
┌───────────────────────────┬────────────────────────────────────────────┐
│ Breakpoint Range          │ Architectural Role & Layout Strategy       │
├───────────────────────────┼────────────────────────────────────────────┤
│ 320px – 480px (Mobile)    │ Single column, 2x2 trust grid, fluid clamp │
│ 481px – 767px (Large Mob) │ 2-col gallery, 2x2 trust grid, 44px tap    │
│ 768px – 1023px (Tablet)   │ 3-col packages, 2-col process, static nav  │
│ 1024px+ (Desktop/Laptop)  │ Full container, 4-col units, 5-col process │
└───────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Architecture Decisions (ADRs)

### ADR-01: Native CSS Morphing Hamburger vs Icon Swap
* **Decision**: Animate the 3 native `.toggle-bar` elements using CSS transforms (`rotate(45deg)`, `rotate(-45deg)`, `opacity: 0`) when `aria-expanded="true"`.
* **Justification**: Zero added SVGs or DOM churn, hardware-accelerated 60fps micro-interaction.

### ADR-02: Document Scroll Lock via Body Overflow vs Fixed Position
* **Decision**: Toggle `document.body.style.overflow = 'hidden'` on open, and restore `''` on close.
* **Justification**: Prevents background scroll chaining without causing the page to jump to top like `position: fixed` does on iOS.

### ADR-03: Viewport Fit & Notch Accommodation
* **Decision**: Update viewport meta tag to `width=device-width, initial-scale=1.0, viewport-fit=cover`.
* **Justification**: Eliminates white bands on landscape iOS Safari and allows floating WhatsApp button to properly respect bottom gesture bar safe areas.

---

## 3. Verification Checklist
* [ ] Test viewports: 320px, 375px, 412px, 768px, 1024px.
* [ ] Verify 0 horizontal scrollbar.
* [ ] Verify hamburger morphing and body scroll lock.
* [ ] Verify touch feedback `:active` states.
