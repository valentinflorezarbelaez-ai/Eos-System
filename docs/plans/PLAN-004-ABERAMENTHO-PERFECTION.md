# PLAN-004: ABERAMENTHO 10/10 PERFECTION ARCHITECTURAL PLAN & ADRs

---

## 1. Architectural Strategy

The remediation of Aberamentho is structured strictly under **Clean / Hexagonal Isolation (Law V)**:

```text
+-------------------------------------------------------------------------------+
|                             ABERAMENTHO DOMAIN LAYER                          |
|   * CamelotEngine (Strict key math, compatibility scores, harmonic paths)     |
|   * TempoMath (Rebase calculations, sample-accurate bar timings, phase lock)   |
|   * PlaylistVault & HarmonicCatalog (Pillars, metadata, verified likeness)    |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                            APPLICATION / AUDIO PORT                           |
|   * DJAudioEngine (Persistent AudioContext, 2-stage gain, biquad EQ, limiter) |
|   * AutomixBrain (Hardware-clock scheduled transitions, Bass Swap on Bar 1)  |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                         ADAPTERS / PRESENTATION LAYER                         |
|   * DeckController (DOM event bindings, accessible sliders, multi-range pitch)|
|   * DJVisualizer (60fps Canvas FFT, phase telemetry, Camelot radar)          |
|   * SpotifyEmbedAdapter (Pure streaming player dock, clear demarcation)       |
+-------------------------------------------------------------------------------+
```

---

## 2. Architecture Decision Records (ADRs)

### ADR-01: Clock-Scheduled Bass Swap vs rAF Polling
* **Context:** Current bass kill executes inside `requestAnimationFrame`, causing up to ~16ms of jitter and muddy kicks at the transition point.
* **Decision:** Pre-schedule `AudioParam.setValueAtTime` on the Web Audio hardware clock at the exact downbeat of the transition midpoint.
* **Status:** `ACCEPTED`
* **Rejected Alternatives:**
  - `setTimeout`: Subject to browser throttling in background tabs.
  - Retaining rAF: Incompatible with 10/10 audio engineering standards.

### ADR-02: Two-Stage Gain Staging
* **Context:** `setDeckVolume` currently overwrites `gainNode.gain`, canceling auto-gain loudness matching.
* **Decision:** Chain `source -> eq -> filter -> autoGainNode -> volumeGainNode -> crossfadeGain`.
* **Status:** `ACCEPTED`

### ADR-03: Real Artist Likeness & Licensed Iconography
* **Context:** Multiple artists in the catalog currently display unrelated classical or ambient musicians (Vangelis, Yanni, Enya, Kitaro, etc.).
* **Decision:** Replace with authentic, Creative Commons / Wikimedia licensed photographs with proper attribution, or high-fidelity consecrated artist monograms where free photography is unavailable.
* **Status:** `ACCEPTED`
