# AUDIT-004: Aberamentho / Pleroma Music — Live Deployment Comprehensive Audit

| Metadata | Value |
|---|---|
| Project ID | `aberamentho-music` (in `docs/projects/registry.json`) |
| URL Audited | https://aberamentosprelomamusic.vercel.app/ |
| Date | 2026-10-25 |
| Method | Static Deployed Bundle Analysis + Headless Chrome Browser Subagent Telemetry |
| Epistemic State | `FINDINGS_IDENTIFIED` |
| Verified Scope | Deployed bundle (`index.html`, `app.js`, `sw.js`, `manifest.json`, `src/audio/*`, `src/ui/*`) |

---

## 1. Executive Summary & Epistemic Verdict

Aberamentho / Pleroma Music is a high-ambition Harmonic DJ & Automix web application featuring dual-deck Web Audio DSP, Camelot Wheel harmonic calculations, Flyme Sound 1000W / Car Audio calibration curves, and Spotify playlist integration.

While visually striking with rich glassmorphic aesthetics, our runtime audit and deep code review revealed critical architectural, DSP, and UX discrepancies that prevent it from achieving true 10/10 perfection. This document records all verified findings with exact reproduction data and remediation paths.

---

## 2. Runtime Telemetry (AUDIT_EXECUTED)

| Verification Dimension | Result | Evidence / Log |
|---|---|---|
| **Broken Image Detection** | `PASS (0 broken)` | 20/20 `HTMLImageElement` loaded with `naturalWidth > 0` |
| **Network Failure Rate** | `PASS (0 HTTP 4xx/5xx)` | All static assets, fonts, and scripts resolved with HTTP 200 |
| **Console Diagnostics** | `PASS (0 errors)` | Console is 100% clean during load and playback initialization |
| **Input Accessibility (a11y)** | `FINDING IDENTIFIED` | 4 range sliders lack `<label>` or `aria-label`: `pitch-alpha`, `vol-alpha`, `pitch-beta`, `vol-beta` |
| **Dialog Accessibility (a11y)** | `FINDING IDENTIFIED` | Pressing `Escape` does not dismiss `#legends-modal`. Focus is not trapped or restored |
| **Filter Selector Collision** | `FINDING IDENTIFIED` | Clicking category filters in "Altar de Honor" removes active highlight from "Artistas y Leyendas" button due to shared class `.pantheon-filter-btn` |
| **Horizontal Overflow** | `PASS` | `scrollWidth === innerWidth` at 1426px desktop and 501px mobile |

---

## 3. Comprehensive Categorized Findings

### Dimension A: Audio DSP & Automix Engine Invariants (P0)

1. **F-01 (AudioContext Lifecycle)**: In `audio-context.js`, `init()` checks `if (this.ctx.state === 'suspended') { await this.ctx.resume(); }` but recreates the entire context and graph when not strictly initialized, creating disconnected or zombie nodes on mobile background/resume cycles.
2. **F-02 (Playhead & Tempo Rebase)**: In `audio-context.js`, `getCurrentTime(deckId)` computes `(ctx.currentTime - deck.startTime) * deck.playbackRate`. When the user adjusts pitch or SYNC engages while playing, `startTime` is not rebased against the new rate, causing progressive playhead jumps and desynchronization in phrase tracking.
3. **F-03 (Automix Timing vs Display Divergence)**: The UI offers "Ventana de mezcla: 32 compases", but `automix-brain.js` artificially compresses the transition time via `Math.min(18.0, rawDuration * 0.35)`. Transitions should accurately respect real musical bars or provide explicit snappy transition modes (e.g., 4, 8, 16, 32 bars).
4. **F-04 (Bass Swap Clock Quantization)**: The Carl Cox Golden Rule Bass Swap is triggered on `progress >= 0.5` inside a `requestAnimationFrame` polling loop (~16.6ms jitter). It must be scheduled directly on the Web Audio hardware clock (`setValueAtTime(audioCtx.currentTime + delta)`) on the exact Bar 1 downbeat.
5. **F-05 (Gain Staging Clobbering)**: `loadBuffer()` calculates RMS loudness and applies `autoGainFactor` to `gainNode.gain`. However, `setDeckVolume()` immediately overwrites `deck.gainNode.gain.setTargetAtTime(clamped)`, erasing the auto-gain compensation. A dedicated two-stage gain architecture (`volumeGainNode` and `autoGainNode`) is required.
6. **F-06 (SYNC Pitch Fader Mismatch)**: Pitch sliders are hardcoded to `[0.92, 1.08]` (±8%). When tracks with different tempos (e.g. 128 BPM and 140 BPM, ratio 1.093) are synced, the computed rate exceeds the physical fader bounds. A multi-range selector (±8%, ±16%, ±50% WIDE) is needed.

### Dimension B: Harmonic Camelot Engine & Metadata (P1)

7. **F-07 (Silent Camelot Fallback)**: `CamelotEngine.parseKey()` silently defaults invalid or unparsed inputs to `8A`, falsely reporting 100% or 95% harmonic matches for unanalyzed or corrupted tracks.
8. **F-08 (User Upload Hardcoding)**: In `deck-controller.js`, dropped MP3/WAV files are assigned hardcoded dummy values: `bpm: 128`, `key: 8A/9A`. Real audio feature extraction or a clear "Analizando..." / "Tonalidad sin clasificar" status is mandatory.
9. **F-09 (Acoustic Profile Duplicate Keys)**: `ACOUSTIC_PROFILES` defines both `GEELY_EX5_1000W` and `GEELY_EX5_FLYME` with slightly diverging filter gains, causing confusion between HTML select options and internal DSP state.

### Dimension C: Visual Integrity, Likeness & Semantic Truth (P1/P2)

10. **F-10 (Artist Pantheon Likeness Mismatches)**:
   - RAM is mapped to `assets/vangelis-avatar.png` (photo of Vangelis).
   - Driftmoon is mapped to `assets/yanni-avatar.png` (photo of Yanni).
   - aura is mapped to `assets/enya-avatar.png` (photo of Enya).
   - בן צור (Ben Tzur) is mapped to `assets/kitaro-avatar.png` (photo of Kitaro).
   - Etasonic is mapped to `assets/paul-van-dyk-angel.jpg` (photo of Paul van Dyk).
   - Andy Moor is mapped to `assets/ferry-connect-original.jpg` (photo of Ferry Corsten).
   - Daxson is mapped to `assets/markus-portrait-2.png` (photo of Markus Schulz).
   These must be replaced with genuine portraits, official artist logos, or dedicated sacred iconography.
11. **F-11 (Honest Audio Source Labeling)**: Decks display "The Creation — Markus Schulz" or "We Control The Sunlight — Aly & Fila" while playing synthesized procedural stems, while Spotify embed plays separately above. The UI must clearly articulate: "Demostración Procedural Sagrada en Cabina" vs "Pista de Usuario" vs "Reproducción Spotify Oficial".
12. **F-12 (Header LEYENDAS Button Conflict)**: The header has two conflicting event listeners for `#btn-open-legends` (one scrolls to section, one opens modal directly).
13. **F-13 (PWA Offline Strategy)**: In `sw.js`, the service worker cache logic has fallbacks that can fail silently if static assets are updated without version cache busting.

---

## 4. Remediation Master Plan (R1 - R5)

- **Phase R1 (Audio Engine & DSP Integrity)**: Fix AudioContext lifecycle, playhead rebase, two-stage gain staging, scheduled downbeat bass swap, multi-range SYNC fader.
- **Phase R2 (Tonalidad & Camelot Intelligence)**: Honest handling of uploaded audio, client-side BPM/onset estimation, strict Camelot parsing.
- **Phase R3 (UI, Accessibility & Security)**: WCAG 2.1 AA keyboard support (`Escape`, focus trapping), slider `aria-label`, fix filter class collision, Spotify iframe input sanitization.
- **Phase R4 (Artist Likeness & Visual Perfection)**: Replace misattributed avatars with authenticated portraits/logos, fix header button conflict, synchronize count badges (43 vs 46).
- **Phase R5 (SEO, Performance & PWA)**: Proper OpenGraph image, JSON-LD Schema.org metadata, stale-while-revalidate SW cache optimization.
