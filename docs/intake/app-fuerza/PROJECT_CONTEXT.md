# Project Context & Engineering Intake: [PRJ-APP-FUERZA]

* **Project Name:** ATP Strength (App Fuerza)
* **Project ID:** `PRJ-APP-FUERZA`
* **Target Path:** `C:\Users\valen\Documents\APP fuerza`
* **Repository:** `https://github.com/valentinflorezarbelaez-ai/ATP-STRENGTH`
* **Operating Model:** Monorepo (Next.js 16 Presentation + FastAPI REST Backend)

---

## 1. Domain & Business Intent
ATP Strength is an offline-first neuromuscular strength training and interval progression PWA. Its purpose is to guide strength lifters through scientific auto-regulation based on:
1. **ATP-PCr Bioenergetic Resynthesis Timing:** Strictly timing 180s-300s rest intervals to guarantee 95%+ replenishment of intracellular phosphocreatine and motor unit recovery before subsequent heavy sets.
2. **5-Phase Neuromuscular Ramping:** Calculating progressive warmup stages (F0 Mobility -> F1 Dynamic Activation -> F2 Light -> F3 Medium -> F4 PAP -> F5 Working Sets) adapted to 1RM/Training Max and barbell type (Olympic 20kg, EZ 10kg, Bodyweight).
3. **Hardware Telemetry & Bioacoustics:** Utilizing native Web Audio API to synthesize 528 Hz Solfeggio sound cues and pocket haptics without external media latency.

---

## 2. Technical Stack Inventory
* **Frontend:** Next.js 16.3.4 (Turbopack), React 19.2.8, Tailwind CSS v4, TypeScript 5, PWA Service Worker.
* **Backend:** FastAPI 0.141, Python 3.12, PostgreSQL (Neon Cloud), SQLAlchemy 2.0.
* **Design Standard:** OLED True Black (`#000000`) for gym battery preservation.

---

## 3. Governance State & Operational Focus
* **Audit Baseline:** Documented in `docs/audits/app-fuerza/AUDIT_REPORT.md`.
* **Primary Technical Debt:** 5 ESLint React 19 `react-hooks/set-state-in-effect` errors in `page.tsx` causing cascading re-renders during active workout sessions.
