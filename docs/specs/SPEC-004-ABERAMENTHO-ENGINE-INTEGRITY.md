# SPEC-004: ABERAMENTHO ENGINE INTEGRITY, HONEST SOURCE LABELING & ARTIST LIKENESS
## Requirements in Formal EARS Syntax & BDD Acceptance Criteria

---

### 1. Specification Metadata
* **Specification ID:** SPEC-004-ABERAMENTHO-ENGINE-INTEGRITY
* **Version:** 1.0.0
* **Status:** `PROPOSED_FOR_APPROVAL`
* **Parent Audit:** [`docs/audits/AUDIT-004-ABERAMENTHO-LIVE.md`](file:///c:/Users/valen/Eos-System-1/docs/audits/AUDIT-004-ABERAMENTHO-LIVE.md)
* **Target System:** Aberamentho / Pleroma Music (`aberamentho-music`)
* **Standard:** IEEE 830 / ISO 29148 / Web Audio API Spec (W3C) / WCAG 2.1 AA

---

### 2. Functional Requirements (Formal EARS Syntax)

#### FR-01: Persistent AudioContext Lifecycle [Ubiquitous]
* **Syntax:** `THE SYSTEM SHALL maintain a single, reusable AudioContext instance throughout the application lifecycle, invoking resume() upon state suspension and never creating zombie or duplicate contexts.`

#### FR-02: Playhead Continuity on Tempo/Pitch Modulation [Event-Driven]
* **Syntax:** `CUANDO the user or Automix modifies the playbackRate of an active deck, EL SISTEMA SHALL rebase deck.startTime instantaneously such that getCurrentTime() exhibits zero discontinuous jumps or phase drift.`

#### FR-03: Two-Stage Gain Architecture [State-Driven]
* **Syntax:** `MIENTRAS a deck is loaded and playing, EL SISTEMA SHALL process audio through two segregated GainNodes (autoGainNode for RMS normalization and faderGainNode for user level control), ensuring volume adjustments do not eliminate loudness matching.`

#### FR-04: Sample-Accurate Clock-Quantized Bass Swap [Event-Driven]
* **Syntax:** `CUANDO an automated or manual transition reaches Compás 1 of the scheduled bar boundary, EL SISTEMA SHALL schedule the low-frequency isolator kill directly on the Web Audio hardware clock via AudioParam.setValueAtTime() within a 1-millisecond tolerance.`

#### FR-05: Multi-Range Pitch Slider & SYNC Lock [Event-Driven]
* **Syntax:** `CUANDO SYNC is triggered and the target BPM ratio exceeds ±8%, EL SISTEMA SHALL dynamically adjust the pitch slider range (±8%, ±16%, WIDE ±50%) to visually and mathematically match the synchronized playback rate.`

#### FR-06: Strict Camelot Harmonic Parsing [Error / Unwanted Condition]
* **Syntax:** `SI an invalid or unanalyzed key signature is provided to CamelotEngine, ENTONCES EL SISTEMA SHALL return an explicit UNKNOWN status and SHALL NOT default to 8A.`

#### FR-07: Accessible Keyboard Dialog Control [Event-Driven]
* **Syntax:** `CUANDO the Trance Legends modal is open and the user presses Escape, EL SISTEMA SHALL close the dialog and restore keyboard focus to the triggering element.`

#### FR-08: Isolated Filter Scope [Ubiquitous]
* **Syntax:** `EL SISTEMA SHALL namespace CSS classes and state listeners between the Altar de Honor gallery and the Master Artists catalog, ensuring category filter actions in one section never deactivate selections in the other.`

#### FR-09: Authentic Likeness in Artist Pantheon [Ubiquitous]
* **Syntax:** `EL SISTEMA SHALL display authentic, license-compliant portraits or verified official symbols for each artist in the 46-Master catalog, eliminating misattributed classical and ambient artist avatars.`

---

### 3. BDD Acceptance Criteria

```gherkin
ESCENARIO: Transición Armónica Automix con Bass Swap en Compás 1
  DADO que Deck A está reproduciendo a 134 BPM y Deck B está sincronizado en 8A
  CUANDO el usuario o el piloto automático lanza la transición de 16 compases
  ENTONCES la curva de volumen y filtro evoluciona progresivamente
  Y en el compás 1 exacto el bajo de Deck A se corta a -36dB y Deck B toma el control del subgrave sin colisión de fase
  Y ningún playhead salta ni se desincroniza la telemetría

ESCENARIO: Cierre Accesible del Modal de Leyendas
  DADO que el modal #legends-modal está activo en pantalla
  CUANDO el usuario presiona la tecla Escape
  ENTONCES el modal se oculta de inmediato
  Y el foco del teclado regresa al botón desencadenante en la cabecera
```
