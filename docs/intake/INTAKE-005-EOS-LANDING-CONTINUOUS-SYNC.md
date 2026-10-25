# INTAKE-005: EOS & LANDING PAGE CONTINUOUS CO-EVOLUTION
## Registro de Requerimiento de Usuario y Contexto de Negocio

---

### 1. DATOS DE IDENTIFICACIÓN
* **ID:** `INTAKE-005`
* **Título:** Continuous Co-Evolution and Synchronization Between EOS Control Plane and Public Landing Page
* **Fecha:** 2026-10-25
* **Solicitante:** Valentín Flórez Arbeláez (Fundador & Creador)
* **Objetivo:** "Ir mejorando EOS a la par de la landing page, irla actualizando con todo lo nuevo que pongamos; es decir, irla mejorando continuamente en la medida que EOS mejora, actualizarla con la mejora de EOS."

---

### 2. CONTEXTO Y PROBLEMÁTICA
* **Desfase de Percepción vs Realidad:** 
  El sistema de control de ingeniería `Eos-System-1` y sus proyectos soberanos (como `Aberamentho / Pleroma Music`, `Biblioteca Gnóstica`, `ATP Strength`, etc.) han alcanzado hitos masivos (DSP cuantizado, grabador Hi-Fi de master sets, integración automotriz `navigator.mediaSession`, resonador toroidal de cimática sagrada, demonio centinela FDIR, motor Dual-Track Fast/Heavy). Sin embargo, la landing page pública ([portafolio-valentin.vercel.app](https://portafolio-valentin.vercel.app/)) mantenía descripciones anteriores (ej. "43 artistas" vs 47, sin mención de grabación Hi-Fi, sin telemetría en vivo de la flota).
* **Ausencia de Canal de Propagación Continuo:**
  No existía un script formal ni un protocolo determinista que extrajera el estado verificado de `docs/projects/registry.json` y la evidencia de EOS para reflejarlo de forma continua e inquebrantable en la landing page.

---

### 3. ALCANCE Y CRITERIOS DE ÉXITO
1. **Sincronización Continua de Telemetría y Capacidades:**
   Diseñar e implementar `scripts/sync-landing-page.mjs` en el plano de control EOS que sincronice metadatos, commits, métricas y logros verificados hacia `C:\Users\valen\portafolio`.
2. **Actualización Integral de la Landing Page:**
   Elevar `portfolio.ts` en `portafolio`:
   - Incorporar las 47 leyendas, el grabador de sets Hi-Fi, el jog wheel nudge y los controles vehiculares de Aberamentho.
   - Reflejar la arquitectura EOS Core 2.1 (Dual-Track, Sentinel Daemon, FDIR Self-Healing, HUD de Flota).
   - Actualizar las estadísticas de la flota (7-8 sistemas activos y verificados).
3. **Verificación Estricta en Ambos Lados:**
   - `npm run build` o typecheck limpio en `portafolio`.
   - `verify-strict.ps1` exit code 0 en `Eos-System-1`.
   - Despliegue en producción con commit pushed a GitHub en ambos repositorios.
