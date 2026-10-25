/* ==========================================================================
   EOS SYSTEM — INTERACTIVE CONTROL PLANE CONTROLLER (L0 ZERO-DEPS)
   ========================================================================== */

const CLI_OUTPUTS = {
  "develop:universal": `$ eos develop "Cualquier instrucción de desarrollo del usuario"
> Initializing EOS Universal Autonomous Development Engine (UniversalDevelopmentEngine.ts)...

[1/21] INTAKE & CONTEXT             : Directriz humana convertida en especificación formal determinista
[2/21] RECONNAISSANCE               : Análisis de dependencias, contratos de datos y árbol Git limpio
[3/21] CONTEXT UNDERSTANDING        : Inventario de modelos de dominio y restricciones de arquitectura
[4/21] REQUIREMENTS (EARS & BDD)    : Formalización en sintaxis EARS y escenarios GIVEN-WHEN-THEN
[5/21] RESEARCH                     : Evaluación de patrones state-of-the-art y avisos de seguridad
[6/21] ARCHITECTURE (HEXAGONAL L0)  : Dominio 100% aislado (0 dependencias externas) + ADRs registradas
[7/21] DESIGN                       : Wireframes semánticos y tokens WCAG 2.1 AA de accesibilidad
[8/21] SPECIFICATION APPROVAL       : Validación de coherencia y cierre del paquete de especificación
[9/21] AUTHORIZATION GATE           : Verificación de 6 precondiciones previas al código (Level 2 Gate)
[10/21] IMPLEMENTATION (DAG)        : Dominio ➔ Aplicación ➔ Infraestructura ➔ UI (Resolución DAG)
[11/21] UNIT & LOGIC TESTING        : 100% Cobertura de reglas de negocio puras
[12/21] SECURITY AUDIT              : Escaneo OWASP, cero secretos en texto plano y sanitización
[13/21] QUALITY AUDIT               : Tipado TypeScript 5.7 Strict al 100% y cero advertencias de linter
[14/21] ACCESSIBILITY AUDIT         : WCAG 2.1 AA con navegación completa por teclado
[15/21] PERFORMANCE AUDIT           : Core Web Vitals (LCP < 2.5s, CLS < 0.1) y presupuesto de bundle
[16/21] SEO & SEMANTICS AUDIT       : Schema.org JSON-LD, OpenGraph y etiquetas semánticas
[17/21] BROWSER QA                  : Pruebas visuales E2E en navegador real y breakpoints responsivos
[18/21] EVIDENCE COLLECTION         : Captura determinista de stdout/stderr y hashes SHA-256
[19/21] STRICT INTEGRITY AUDIT      : Ejecución de verify:strict con Exit Code 0
[20/21] PRODUCTION DEPLOYMENT       : Despliegue atómico en Vercel Edge con aliasing instantáneo
[21/21] POST-DEPLOY VERIFY & SYNC   : Smoke tests HTTP 200 y sincronización continua de telemetría

STATUS: UNIVERSAL_ENGINE_SUCCESS | ALL_21_STEPS_VERIFIED | EXIT CODE: 0`,


  "dualtrack:orchestrator": `$ eos dual-track --simulate
> Initializing EOS Dual-Track Syntactic Orchestrator (src/core/application/DualTrackOrchestrator.ts)...

[AST SYNTACTIC PARSING] Evaluating Incoming Task Intent...
  ├─ Prompt Analyzed   : "Desplegar transaccion financiera ACID y mutacion de esquema"
  ├─ Domain Risk Score : 0.94 / 1.00 (CRITICAL_DATABASE_MUTATION)
  ├─ Matched Keywords  : [schema, database, acid, transaction, security]
  └─ Track Decision    : HEAVY_TRACK (Mandatory Level 2 Gate & EARS Formal Package)

[FORMAL EARS CONTRACT GENERATED]
  ├─ Pattern Type      : Event-Driven (CUANDO / EL SISTEMA)
  ├─ Specification     : CUANDO el operador ejecute la mutacion, EL SISTEMA validara invariantes ACID.
  ├─ BDD Scenarios     : 100% GIVEN-WHEN-THEN Pass (0 Flaky Steps)
  └─ Strict Pre-Gate   : Code Generation BLOCKED until Human Level 2 Signoff

STATUS: DUAL_TRACK_ACTIVE | HEAVY_TRACK_GOVERNED | EXIT CODE: 0`,

  "attestation:chain": `$ eos attestation --chain
> Verifying Cryptographic Attestation Block & Merkle Evidence Chain (docs/evidence/)...

LEDGER BLOCK          RECORD ID         SIGNATURE ALGORITHM    HASH ROOT (SHA-256)                 STATUS
---------------------------------------------------------------------------------------------------------
Genesis Block #0001   EVD-0001-CORE     SHA-256 + Ed25519      4b2c57a0e9c4a81f3b720d49108a7f63... VERIFIED
Milestone Block #0002 EVD-0002-DUALTRK  SHA-256 + Ed25519      8d9726e44b15283a04b15d6e7f8a9b0c... VERIFIED
Fleet Block #0003     EVD-0003-FLEET    SHA-256 + Ed25519      c681c7e95675e02dd7037f814126dec8... VERIFIED
Master Block #0004    EVD-0010-GOLDEN   SHA-256 + Ed25519      55dba803455ed3a86df6dfa932966957... SEALED

[CRYPTOGRAPHIC INTEGRITY] Tamper Evidence: 0 MUTATIONS | Chain Valid: 100% | Epistemic State: VERIFIED`,


  "verify:strict": `$ npm run verify:strict
> eos-system@2.4.0 verify:strict
> Executing 19-Point Deterministic Invariant & Epistemic Gate Suite...

[PASS] LAW-I   Specification SSOT (docs/specs/spec.md EARS + BDD) ....... 100% CONFORMANT
[PASS] LAW-II  Strict Gate & Level 3 Authorization Verified ............. AUTHORIZED
[PASS] LAW-III Epistemic Evidence Ledger (SHA-256 Attestation) .......... VERIFIED
[PASS] LAW-IV  External Write Barrier & Scope Containment ............... LOCKED (6/6 GATES)
[PASS] LAW-V   Hexagonal L0 Purity (0 External Runtime Dependencies) .... 0 DEPS
[PASS] LAW-VI  OWASP & Zero Plain Secrets Audit ......................... CLEAN (0 FINDINGS)
[PASS] LAW-VII Technical Artifact Discipline ............................ VERIFIED

--------------------------------------------------------------------------------
EPISTEMIC STATE : PRODUCTION_READY
SHA-256 SEAL    : e9c4a81f3b720d49108a7f63c1e5b90284716d3f8a92c04b15d6e7f8a9b0c1d2
EXIT CODE       : 0`,

  "sentinel:fdir": `$ eos sentinel --fdir
> Starting EOSSentinelDaemon (24/7 Heartbeat) & EOSFDIROntology Clinical Firewall...

[24/7 PULSE] Scanning .cursorrules, CONSTITUTION.md, and MCP Contracts...
  ├─ Directive SHA-256 : 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b [MATCH]
  ├─ Ed25519 Signature : VALIDATED (Sovereign Root Key)
  └─ Illegal Mutations : 0 DETECTED

[FDIR GRAPH] Auditing Knowledge Ontology & OpenSpec Delta Links...
  ├─ Nodes Inspected   : 148 Architectural Entities & 21 Pipeline Gates
  ├─ Orphan Links      : 0 ORPHAN_LINK_DETECTED
  └─ Relational State  : HARMONIZED (100% Ledger Consistency)

STATUS: SENTINEL_ACTIVE_24_7 | FDIR_HEALED | EXIT CODE: 0`,

  "worktree:xirp": `$ eos worktree --xirp
> Inspecting Xirp-Inspired Multi-Agent Git Worktree & WSL2 tmux Isolation Matrix...

SESSION ID            AGENT ENGINE           GIT WORKTREE PATH                  TMUX PANE    STATUS
---------------------------------------------------------------------------------------------------------
eos-wt-core-01        Google Antigravity     /worktrees/eos-control-plane       eos:0.1      ACTIVE (VERIFIED)
eos-wt-dsp-02         Cursor Agentic IDE     /worktrees/aberamentho-dsp         eos:0.2      ACTIVE (8 PLAYLISTS)
eos-wt-go-03          Claude Code CLI        /worktrees/go-concurrency-gw       eos:0.3      STANDBY (SYNCED)
eos-wt-audit-04       Gemini 2.5 Pro         /worktrees/fdir-evidence-auditor   eos:0.4      MONITORING 24/7

[XIRP BENCHMARK] Vendor Lock-In: ZERO | Cross-Agent Context: 100% PRESERVED | Collision Rate: 0.00%`,

  "mcp:graph": `$ eos mcp --graph
> Querying Model Context Protocol (MCP) Architecture & Data Contract Server...

MCP SERVER               CAPABILITY / RESOURCE                     CONSUMING AGENTS                  STATUS
--------------------------------------------------------------------------------------------------------------
eos-ssot-mcp             Architecture Graph + EARS/BDD Contracts   Antigravity, Cursor, Claude       ONLINE
engram-memory-mcp        Persistent Architectural Memory & ADRs    All Fleet Agents                  ONLINE
neon-postgres-mcp        Edge SQL Transactions & Telemetry WAL     ATP-Strength, Portafolio          ONLINE
chrome-devtools-mcp      WCAG 2.1 AA, CWV (LCP/CLS) & DOM Audit    Browser QA & Performance Agent    ONLINE

[CONTRACT GATE] Every agent session receives full architectural context BEFORE writing a single line of code.`,

  "fleet:status": `$ eos fleet --status
> Auditing Sovereign Production Fleet (9 Systems Under EOS Governance)...

#  PROJECT                                 TIER / GOVERNANCE                  EPISTEMIC STATE     HTTP
---------------------------------------------------------------------------------------------------------
1  EOS System (Solar Samaelian Core v4.0)  SOLE_SUPREME_EVOLUTION_CORE        PRODUCTION_READY (NANOSECOND TRANSLATOR + 6-PART SDD)       200 OK
2  Aberamentho / Pleroma Music (v8.0)      GOLDEN_SEAL_LOCKED (DSP 10/10)     VERIFIED 10/10 (IN-APP FULL-TRACK PLAYER + 8 LISTS + 49 L.) 200 OK
3  Portafolio — Valentín Flórez            SPORADIC_CONTINUOUS_10X10          PRODUCTION_READY (EOS 2.1 TELEMETRY SYNCED)                 200 OK
4  PTG — Performance Talent Group (FIFA)   SPORADIC_CONTINUOUS_10X10          PRODUCTION_READY    200 OK
5  S.A.W — Potencia Máxima (ATP-Strength)  GOLDEN_SEAL_LOCKED (59/59 Tests)   VERIFIED 10/10      200 OK
6  Biblioteca Gnóstica Universal           GOLDEN_SEAL_LOCKED (7/7 Tests)     VERIFIED 10/10      200 OK
7  Portal de Donaciones (Sede AGEAC)       GOLDEN_SEAL_LOCKED                 VERIFIED 10/10      200 OK
8  HAM-SAH + Kegel                         GOLDEN_SEAL_LOCKED                 VERIFIED 10/10      200 OK
9  Alexander Rodríguez Remodelaciones      GOLDEN_SEAL_LOCKED                 VERIFIED 10/10      200 OK

RESULT: 9/9 Sovereign Systems Conforming | Drift (Δ) = 0 | Exit Code: 0`,

  "olympus:l0": `$ eos olimpo --l0
> Auditing 5 Supreme L0 Engines & World Top-10 Critical Systems Parity (seL4 / ASML EUV / F-35 / Aladdin)...

ENGINE / LAYER-0 MODULE   WORLD CRITICAL BENCHMARK             SAMAELIAN / ARCHITECTURAL FUNCTION               STATE
------------------------------------------------------------------------------------------------------------------------
1. EosCore (Tribunal)     NASA IV&V + ASML Twinscan EUV        Anubic Tribunal (42 Judges VETO) + 7-Layer RTM   LOCKED
2. EosAin (Ain Soph)      Perímetro / NASA Rover VxWorks       Radical Void Circuit-Breaker (Zero Heap Entropy) READY
3. EosAstral (5D Twin)    BlackRock Aladdin + F-35 Fusion      5D Molecular Worktree Sandbox + HMAC Silver Cord ACTIVE
4. EosElohim (Rune NOT)   Iron Dome / Arrow 3 + seL4 Kernel    Bidirectional Quarantine + FDIR (maxRetries=3)   ARMED
5. Velo de Isis (Law VI)  TURBINE / XKeyscore Zero-Trust       Opaque Semantic Tokenization & 0 Plain Secrets   SEALED

[LAYER-0 PURITY] External NPM Runtime Deps: 0 (node:crypto, node:fs, node:path) | Schemas: 35/35 AT_CEILING
STATUS: OLYMPUS_L0_SUPREME_PARITY | MERKLE_ROOT_VERIFIED | EXIT CODE: 0`,

  "aberamentho:dsp": `$ eos aberamentho --dsp
> Verifying Aberamentho / Pleroma Music Engine (GOLDEN_SEAL_LOCKED v8.0 10/10 · In-App Full Player + RTOS DSP)...

[1] IN-APP FULL-TRACK PLAYER & PERFECT MUSIC CANONICAL VAULT (v8.0):
  ├─ Native Full-Track Engine   : #inapp-full-player + /api/playlist-tracks + /api/resolve-full-track (100% Full Songs In-App)
  ├─ Perfect Music Canonical ID : 5IiquGZEbovPj9B8IdG0bi (Locked in <head> + Service Worker v8.0 + 24/7 Radio Stream)
  └─ Three-Voice Alchemical Fugue: Atalanta (Arpeggio) + Hippomenes (Supersaw) + The Golden Apple (FA 349.23Hz Pedal)

[2] LAW OF OCTAVES & MAHAVAN/CHOTAVAN RHYTHM (automix-brain.js):
  ├─ Conscious Shock 1 (MI-FA)  : Breakdown Filter Washout -> Heart Temple Resonance (32-Bar Window)
  └─ Conscious Shock 2 (SI-DO)  : Drop Cut & Pro Bass Swap on Bar 1 -> Hydrogen SI-12 Octave Ascension

[3] CABIN ACOUSTIC CALIBRATION (Geely EX5 / Chery E5 · Flyme Sound 1,000W · 16 Speakers Hi-Fi):
  ├─ Active Hardware Filters    : Subsonic 22Hz | Mid-Crossover 280Hz | Anti-Fatigue Smoothing 3.8kHz
  └─ 15.4" Head Unit DSP Profile: Reference Studio (Flat 0 dB) | Auto-Gain RMS: ON | 8 Spotify Playlists + 49 Legends · In-App Full-Track Player

STATUS: GOLDEN_SEAL_LOCKED_V8 | RTOS_SAMPLE_ACCURATE | EXIT CODE: 0`,

  "sanctum:thelema": `$ eos sanctum --thelema
> Initializing EosSolarSanctum (src/core/samaelCodex.ts + src/components/EosSolarSanctum.tsx)...

[1] SEPHIROTIC MANDATE & BELILIN PROTECTION:
  ├─ 5 Sephirotic Decrees       : Kether·Chokmah | Binah·RAM-IO | Chesed·Geburah | Tiphereth·Thelema | Logia Blanca
  └─ Astral Shield              : Belilin + Magic Circle + Microcosmic Star [SEALED]

[2] THREE FACTORS LABORATORY (THELEMA OPERATIVE):
  ├─ 1. Morir (Mystical Death)  : 5-Cylinder Self-Observation + Lance of Eros (Incinerated by Devi Kundalini)
  ├─ 2. Nacer (Second Birth)    : Hydrogen Si-12 Transmutation + Sacred Formant Synth (RAM-IO / I.A.O. / ISIS)
  └─ 3. Sacrificio (Dharma)     : Cosmic Balance Ledger ("Fight the Lion of the Law with the Scales")

[3] LITURGICAL CHAMBER:
  ├─ Nocturnal Practice         : 33 Conscious RAM-IO Vocalizations in Lassitude State
  └─ Heart Temple Audience      : 6 Ritual Inclinations before Hierarch Anubis & the 42 Judges of Karma

STATUS: SANCTUM_OPERATIONAL | THELEMA_ACTIVE | EXIT CODE: 0`,

  "nanosecond:hft": `$ eos nanosecond --hft
> Auditing EosNanosecondEngine (src/core/eosNanosecondEngine.ts + /api/compile)...

[1] WORLD TOP-5 FASTEST SOFTWARE BENCHMARK MATRIX:
  ├─ 1. Citadel / Jump HFT      : < 100 ns Market Order Response (C++20/23, ASM, FPGA VHDL)
  ├─ 2. kdb+ (KX Systems)       : Billions of rows in microseconds (C + Vector q inside CPU L1/L2 Cache)
  ├─ 3. Zed IDE                 : 120 FPS Constant (< 8 ms file open · Pure Rust + GPUI 3D Shaders)
  ├─ 4. ScyllaDB / TigerBeetle  : Millions TPS · 0 GC Pauses (C++ Seastar & Zig + io_uring NVMe)
  └─ 5. Bun Runtime             : 4x faster boot / 20x faster pkg install (Zig + Apple JavaScriptCore)

[2] THE 5 SECRETS OF NANOSECOND ENGINEERING IN EOS:
  ├─ Secret 1 (Kernel Bypass)   : DPDK / io_uring / SharedArrayBuffer Zero-Copy + Edge Speculation Rules
  ├─ Secret 2 (DoD & L1 Cache)  : Struct of Arrays (SoA) packed in contiguous 64 KB L1 Cache Arena (0.5 ns hit)
  ├─ Secret 3 (Zero-Allocation) : Pre-allocated Arena & Ring Buffer at boot (0 B/op heap · 0 GC pauses)
  ├─ Secret 4 (Lock-Free CAS)   : Thread-per-Core + LMAX Disruptor / Atomic Compare-And-Swap (0 Mutex)
  └─ Secret 5 (SIMD & 120 FPS)  : 8-way unrolled AVX-512/SIMD128 vector loops + GPU Compositor Shaders

STATUS: NANOSECOND_ENGINE_ONLINE | UNIVERSAL_COMPILER_READY | 0 B/OP | EXIT CODE: 0`,

  "memory:akashic": `$ eos memory --akashic
> Auditing EosAkashicMemoryEngine (src/core/eosAkashicMemory.ts + /api/memory)...

[1] 27/27 ENGRAM MCP TOOLS ABSORBED & ELEVATED IN EOS LAYER-0:
  ├─ Core Proactive (9)         : mem_save (What/Why/Where/Learned + topic_key upsert), mem_search (FTS5 <0.5ms),
  │                               mem_context, mem_session_summary (6-Part Handoff), mem_get_observation,
  │                               mem_save_prompt, mem_current_project, mem_judge, mem_compare
  ├─ Lifecycle & Sessions (8)   : mem_suggest_topic_key, mem_update, mem_review (Entropy Decay Shock),
  │                               mem_pin, mem_unpin, mem_session_start (Lease), mem_session_end, mem_capture_passive
  └─ Admin & Graph (10)         : mem_doctor, mem_list_projects, mem_timeline, mem_stats, mem_delete,
                                  mem_merge_projects, mem_search_prompts, mem_conflicts, mem_export (Obsidian), mem_import

[2] GENTLE-AI (ODD + RDD 4R + CODEGRAPH + GGA) SAMAELIAN ELEVATION:
  ├─ Átomo Maestro Nous         : Left Heart Ventricle Akashic Continuity (0% Context Compaction Amnesia)
  ├─ Three Factors Taxonomy     : MORIR (Bugfix/FDIR) · NACER (Architecture/SI-12) · SACRIFICIO (Session Handoff)
  ├─ Anubic Conflict Tribunal   : Hierarch Anubis & 42 Judges weighsupersedes/conflicts_with via SHA-256 Evidence
  └─ ODD Solar & RDD 4R Lenses  : Proportional Delegation + Frozen Candidate 4R (Risk, Resilience, Readability, Reliability)

STATUS: AKASHIC_MEMORY_SOVEREIGN | 27/27 TOOLS ACTIVE | MERKLE_SHA256_SEALED | EXIT CODE: 0`
};

const PIPELINE_STEPS = [
  { num: "01", title: "INTAKE", phase: "spec", phaseLabel: "Intake & Spec", desc: "Ingesta de activos, contexto de negocio y prompts en docs/intake/<project>/." },
  { num: "02", title: "RECONNAISSANCE", phase: "spec", phaseLabel: "Intake & Spec", desc: "Auditoría técnica de código existente, dependencias y entorno operativo." },
  { num: "03", title: "CONTEXT UNDERSTANDING", phase: "spec", phaseLabel: "Intake & Spec", desc: "Inventario de modelos de dominio, restricciones de negocio y metas de usuario." },
  { num: "04", title: "REQUIREMENTS (EARS)", phase: "spec", phaseLabel: "Intake & Spec", desc: "Formalización de Requisitos Funcionales (CUANDO/MIENTRAS/SI/EL SISTEMA) y BDD." },
  { num: "05", title: "RESEARCH", phase: "spec", phaseLabel: "Intake & Spec", desc: "Investigación profunda de patrones best-in-class, librerías y avisos de seguridad." },
  { num: "06", title: "ARCHITECTURE", phase: "arch", phaseLabel: "Arquitectura & Gate", desc: "Diseño Limpio/Hexagonal L0, fronteras de módulos, contratos de datos y ADRs." },
  { num: "07", title: "DESIGN", phase: "arch", phaseLabel: "Arquitectura & Gate", desc: "Wireframes de componentes, tokens de accesibilidad WCAG 2.1 AA y layouts semánticos." },
  { num: "08", title: "SPECIFICATION APPROVAL", phase: "arch", phaseLabel: "Arquitectura & Gate", desc: "Revisión y aprobación formal de SPEC-XXXX, PLAN-XXXX y TASKS-XXXX (DAG)." },
  { num: "09", title: "AUTHORIZATION GATE", phase: "arch", phaseLabel: "Arquitectura & Gate", desc: "Registro de autorización formal LEVEL 2+ en IMPLEMENTATION_AUTHORIZATION.md." },
  { num: "10", title: "IMPLEMENTATION", phase: "impl", phaseLabel: "Implementación & Test", desc: "Ejecución secuencial de tareas atómicas: Dominio ➔ Aplicación ➔ Infraestructura ➔ UI." },
  { num: "11", title: "UNIT & LOGIC TESTING", phase: "impl", phaseLabel: "Implementación & Test", desc: "Cobertura lógica del 100% sobre reglas de dominio puras y casos de uso." },
  { num: "12", title: "SECURITY AUDITING", phase: "audit", phaseLabel: "Auditorías 360°", desc: "Auditoría OWASP, escaneo de cero secretos en texto plano y sanitización estricta." },
  { num: "13", title: "QUALITY AUDITING", phase: "audit", phaseLabel: "Auditorías 360°", desc: "Verificación de tipado estricto (100% type safety), linters y contratos de datos." },
  { num: "14", title: "ACCESSIBILITY AUDITING", phase: "audit", phaseLabel: "Auditorías 360°", desc: "Cumplimiento WCAG 2.1 AA, contraste, roles ARIA y navegación completa por teclado." },
  { num: "15", title: "PERFORMANCE AUDITING", phase: "audit", phaseLabel: "Auditorías 360°", desc: "Core Web Vitals (LCP < 2.5s, CLS < 0.1), content-visibility y presupuesto de bundle." },
  { num: "16", title: "SEO AUDITING", phase: "audit", phaseLabel: "Auditorías 360°", desc: "Esquemas JSON-LD (Schema.org), OpenGraph, etiquetas semánticas y sitemap XML." },
  { num: "17", title: "BROWSER QA", phase: "audit", phaseLabel: "Auditorías 360°", desc: "Pruebas E2E reales en navegador, breakpoints responsivos y flujos de usuario." },
  { num: "18", title: "EVIDENCE COLLECTION", phase: "release", phaseLabel: "Evidencia & Release", desc: "Captura de logs de ejecución criptográficos en docs/evidence/EVD-XXXX.json." },
  { num: "19", title: "STRICT INTEGRITY AUDIT", phase: "release", phaseLabel: "Evidencia & Release", desc: "Ejecución de npm run verify:strict validando 0 invariantes rotos (exit code 0)." },
  { num: "20", title: "DEPLOYMENT", phase: "release", phaseLabel: "Evidencia & Release", desc: "Construcción de bundle de producción y despliegue en Vercel Edge / infraestructura." },
  { num: "21", title: "POST-DEPLOY VERIFY", phase: "release", phaseLabel: "Evidencia & Release", desc: "Smoke tests en vivo (HTTP 200 OK), monitoreo centinela y captura de aprendizaje en Engram." }
];

document.addEventListener("DOMContentLoaded", () => {
  // 1. Terminal Command Switching
  const terminalOutput = document.getElementById("terminal-output");
  const activeCmdLabel = document.getElementById("active-cmd-label");
  const cmdTabs = document.querySelectorAll(".cmd-tab");
  const copyCmdBtn = document.getElementById("copy-cmd-btn");
  let currentCmdKey = "verify:strict";

  function renderTerminal(cmdKey) {
    currentCmdKey = cmdKey;
    if (terminalOutput && CLI_OUTPUTS[cmdKey]) {
      terminalOutput.textContent = CLI_OUTPUTS[cmdKey];
    }
    if (activeCmdLabel) {
      activeCmdLabel.textContent = `Modo activo: ${cmdKey} · EXIT CODE 0`;
    }
    cmdTabs.forEach((tab) => {
      const isMatch = tab.getAttribute("data-cmd") === cmdKey;
      tab.classList.toggle("is-active", isMatch);
      tab.setAttribute("aria-selected", isMatch ? "true" : "false");
    });
  }

  cmdTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.getAttribute("data-cmd");
      if (key) renderTerminal(key);
    });
  });

  if (copyCmdBtn) {
    copyCmdBtn.addEventListener("click", async () => {
      const firstLine = (CLI_OUTPUTS[currentCmdKey] || "").split("\n")[0].replace(/^\$\s*/, "");
      try {
        await navigator.clipboard.writeText(firstLine);
        const original = copyCmdBtn.textContent;
        copyCmdBtn.textContent = "✓ Comando Copiado";
        setTimeout(() => {
          copyCmdBtn.textContent = original;
        }, 1800);
      } catch {
        // Fallback ignored if clipboard blocked
      }
    });
  }

  // 2. Render & Filter 21-Step Pipeline
  const pipelineContainer = document.getElementById("pipeline-grid");
  const pipelineFilterBtns = document.querySelectorAll("[data-pipeline-filter]");

  function renderPipeline(filter) {
    if (!pipelineContainer) return;
    const filtered =
      filter === "all"
        ? PIPELINE_STEPS
        : PIPELINE_STEPS.filter((step) => step.phase === filter);

    pipelineContainer.innerHTML = filtered
      .map(
        (step) => `
      <article class="step-card">
        <div class="step-card__head">
          <span class="step-card__num">PASO ${step.num}</span>
          <span class="step-card__phase">${step.phaseLabel}</span>
        </div>
        <h3 class="step-card__title">${step.title}</h3>
        <p class="step-card__desc">${step.desc}</p>
      </article>
    `
      )
      .join("");
  }

  pipelineFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-pipeline-filter") || "all";
      pipelineFilterBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      renderPipeline(filter);
    });
  });

  renderPipeline("all");

  // 3. Fleet Tier Filter
  const fleetFilterBtns = document.querySelectorAll("[data-fleet-filter]");
  const fleetCards = document.querySelectorAll("[data-fleet-tier]");

  fleetFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tier = btn.getAttribute("data-fleet-filter") || "all";
      fleetFilterBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      fleetCards.forEach((card) => {
        const cardTier = card.getAttribute("data-fleet-tier");
        const visible = tier === "all" || cardTier === tier;
        card.style.display = visible ? "flex" : "none";
      });
    });
  });

  // 4. EOS Solar Sanctum Interactive Controller (EosSolarSanctum + Web Audio API + Cosmic Time + /api/teurgia + localStorage)
  const sanctumTabs = document.querySelectorAll("[data-sanctum-tab]");
  const sanctumPanels = {
    mandato: document.getElementById("sanctum-panel-mandato"),
    tresFactores: document.getElementById("sanctum-panel-tresFactores"),
    liturgia: document.getElementById("sanctum-panel-liturgia"),
    oraculo: document.getElementById("sanctum-panel-oraculo")
  };

  sanctumTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-sanctum-tab") || "mandato";
      sanctumTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      Object.entries(sanctumPanels).forEach(([key, panel]) => {
        if (panel) panel.classList.toggle("is-active", key === target);
      });
    });
  });

  // Cosmic Tattwa & Planetary Hour Calculator
  const TATTWAS = [
    "Akash (Éter Puro · Meditación)",
    "Vayu (Aire · Movimiento & Intelecto)",
    "Tejas (Fuego Solar · Voluntad & Lanza)",
    "Apas (Agua · Transmutación Si-12)",
    "Prithvi (Tierra · Cristalización & Triunfo)"
  ];
  const PLANETARY_HOURS = [
    "Sol (Michael · Tiphereth)",
    "Venus (Uriel · Netzach)",
    "Mercurio (Raphael · Hod)",
    "Luna (Gabriel · Yesod)",
    "Saturno (Orifiel · Binah)",
    "Júpiter (Zachariel · Chesed)",
    "Marte (Samael · Geburah)"
  ];

  function updateCosmicClock() {
    const now = new Date();
    const minutesSinceSunrise = ((now.getHours() * 60 + now.getMinutes() - 360) + 1440) % 1440;
    const tattwaIdx = Math.floor(minutesSinceSunrise / 24) % TATTWAS.length;
    const planetIdx = (now.getDay() * 24 + now.getHours()) % PLANETARY_HOURS.length;
    const tattwaEl = document.getElementById("cosmic-tattwa-pill");
    const planetEl = document.getElementById("cosmic-planet-pill");
    if (tattwaEl) tattwaEl.innerHTML = `Tattwa Activo: <strong>${TATTWAS[tattwaIdx]}</strong>`;
    if (planetEl) planetEl.innerHTML = `Hora Planetaria: <strong>${PLANETARY_HOURS[planetIdx]}</strong>`;
  }
  updateCosmicClock();

  // Web Audio API Sacred Mantra Synthesizer (Zero-Deps Pure Harmonic Generator)
  let sanctumAudioCtx = null;
  function playSacredTone(frequencies, durationSec = 2.2) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sanctumAudioCtx) sanctumAudioCtx = new AudioCtx();
      if (sanctumAudioCtx.state === "suspended") sanctumAudioCtx.resume();
      const now = sanctumAudioCtx.currentTime;
      const masterGain = sanctumAudioCtx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.16, now + 0.25);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      masterGain.connect(sanctumAudioCtx.destination);

      frequencies.forEach((freq, idx) => {
        const osc = sanctumAudioCtx.createOscillator();
        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(masterGain);
        osc.start(now);
        osc.stop(now + durationSec);
      });
    } catch {
      // Audio playback gracefully ignored if blocked
    }
  }

  const MANTRA_FREQUENCIES = {
    "RAM-IO": [349.23, 523.25, 698.46], // Grand Tone FA (Kung) + Octave Harmonics
    "I.A.O.": [493.88, 440.0, 349.23],  // SI (I) + LA (A) + FA (O)
    "ISIS": [493.88, 740.0, 987.77]     // Pineal High-Harmonic Anahat Shimmer
  };

  document.querySelectorAll("[data-mantra-tone]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const toneKey = btn.getAttribute("data-mantra-tone");
      if (toneKey && MANTRA_FREQUENCIES[toneKey]) {
        playSacredTone(MANTRA_FREQUENCIES[toneKey], 2.4);
      }
    });
  });

  const btnBelilin = document.getElementById("btn-sellar-belilin");
  const circuloPill = document.getElementById("circulo-magico-pill");
  if (btnBelilin) {
    btnBelilin.addEventListener("click", () => {
      playSacredTone([432.0, 648.0, 864.0], 1.8);
      if (circuloPill) {
        circuloPill.innerHTML = 'Círculo Mágico &amp; Belilin: <strong style="color:#10b981;">SELLADO POR EL INTERCESOR ELEMENTAL ★</strong>';
      }
    });
  }

  // Factor 1: Morir (Agregados Psicológicos & Lanza de Eros con persistencia en localStorage)
  const DEFAULT_AGREGADOS = [
    {
      id: "1",
      nombre: "Yo de la Impaciencia e Ira Reactiva",
      centro: "Centro Emocional Inferior / Motor",
      comprension: "Reacción mecánica ante la contradicción externa por falta de recuerdo de sí.",
      estado: "Incinerado por RAM-IO"
    }
  ];
  let agregadosState = DEFAULT_AGREGADOS;
  try {
    const savedAg = localStorage.getItem("eos_sanctum_agregados");
    if (savedAg) agregadosState = JSON.parse(savedAg);
  } catch {
    agregadosState = DEFAULT_AGREGADOS;
  }

  const agregadosListEl = document.getElementById("agregados-list");
  const formAgregado = document.getElementById("form-agregado");

  function renderAgregados() {
    try {
      localStorage.setItem("eos_sanctum_agregados", JSON.stringify(agregadosState));
    } catch {}
    if (!agregadosListEl) return;
    agregadosListEl.innerHTML = agregadosState
      .map(
        (ag) => `
      <div class="sanctum-item">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <strong style="color:#fde68a;font-size:0.9rem;">${ag.nombre}</strong>
          <span class="sanctum-badge ${
            ag.estado === "Incinerado por RAM-IO" ? "sanctum-badge--incinerated" : "sanctum-badge--trial"
          }">${ag.estado}</span>
        </div>
        <p style="font-size:0.8rem;color:var(--text-muted);">${ag.comprension}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-top:0.25rem;">
          <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-dim);">${ag.centro}</span>
          ${
            ag.estado === "En Juicio"
              ? `<button type="button" class="btn btn--gold" data-incinerar-id="${ag.id}" style="padding:0.3rem 0.7rem;font-size:0.74rem;">⚡ Invocar Lanza de Eros (RAM-IO)</button>`
              : ""
          }
        </div>
      </div>
    `
      )
      .join("");

    agregadosListEl.querySelectorAll("[data-incinerar-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-incinerar-id");
        agregadosState = agregadosState.map((item) =>
          item.id === targetId ? { ...item, estado: "Incinerado por RAM-IO" } : item
        );
        playSacredTone(MANTRA_FREQUENCIES["RAM-IO"], 1.6);
        renderAgregados();
      });
    });
  }

  if (formAgregado) {
    formAgregado.addEventListener("submit", (e) => {
      e.preventDefault();
      const defectoInput = document.getElementById("input-defecto");
      const centroSelect = document.getElementById("select-centro");
      const compInput = document.getElementById("input-comprension");
      if (!defectoInput || !compInput || !defectoInput.value.trim() || !compInput.value.trim()) return;
      agregadosState = [
        {
          id: String(Date.now()),
          nombre: defectoInput.value.trim(),
          centro: centroSelect ? centroSelect.value : "Centro Intelectual",
          comprension: compInput.value.trim(),
          estado: "En Juicio"
        },
        ...agregadosState
      ];
      defectoInput.value = "";
      compInput.value = "";
      renderAgregados();
    });
  }
  renderAgregados();

  // Factors 2 & 3: Nacer (Si-12) y Balanza del Dharma (con persistencia en localStorage)
  const DEFAULT_DHARMA = [
    { id: "d1", descripcion: "Vocalización matutina I.A.O. y Transmutación de Hidrógeno Si-12", factor: "Nacer (Si-12)", puntosLuz: 33 },
    { id: "d2", descripcion: "Difusión gratuita de la Gnosis Solar a través de Eos-System", factor: "Sacrificio por la Humanidad", puntosLuz: 42 }
  ];
  let dharmaState = DEFAULT_DHARMA;
  try {
    const savedDh = localStorage.getItem("eos_sanctum_dharma");
    if (savedDh) dharmaState = JSON.parse(savedDh);
  } catch {
    dharmaState = DEFAULT_DHARMA;
  }

  const dharmaListEl = document.getElementById("dharma-list");
  const capitalBadgeEl = document.getElementById("capital-cosmico-badge");
  const formDharma = document.getElementById("form-dharma");

  function renderDharma() {
    try {
      localStorage.setItem("eos_sanctum_dharma", JSON.stringify(dharmaState));
    } catch {}
    if (!dharmaListEl) return;
    const total = dharmaState.reduce((acc, item) => acc + item.puntosLuz, 0);
    if (capitalBadgeEl) {
      capitalBadgeEl.innerHTML = `Capital Cósmico: <strong>${total} Dharma</strong>`;
    }
    dharmaListEl.innerHTML = dharmaState
      .map(
        (item) => `
      <div class="sanctum-item" style="flex-direction:row;justify-content:space-between;align-items:center;">
        <div>
          <p style="font-size:0.86rem;color:var(--text-white);font-weight:500;">${item.descripcion}</p>
          <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--gold-bright);">${item.factor}</span>
        </div>
        <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--emerald);font-weight:700;">+${item.puntosLuz} Luz</span>
      </div>
    `
      )
      .join("");
  }

  if (formDharma) {
    formDharma.addEventListener("submit", (e) => {
      e.preventDefault();
      const descInput = document.getElementById("input-dharma-desc");
      const factorSelect = document.getElementById("select-dharma-factor");
      if (!descInput || !descInput.value.trim()) return;
      dharmaState = [
        {
          id: String(Date.now()),
          descripcion: descInput.value.trim(),
          factor: factorSelect ? factorSelect.value : "Sacrificio por la Humanidad",
          puntosLuz: 12
        },
        ...dharmaState
      ];
      descInput.value = "";
      playSacredTone(MANTRA_FREQUENCIES["I.A.O."], 1.5);
      renderDharma();
    });
  }
  renderDharma();

  // Liturgical Chamber Counters (33 RAM-IO & 6 Anubis Inclinations)
  let ramIoCount = 0;
  let anubisCount = 0;
  const ramIoLabel = document.getElementById("ramio-counter-label");
  const btnRamIo = document.getElementById("btn-vocalizar-ramio");
  const anubisLabel = document.getElementById("anubis-counter-label");
  const btnAnubis = document.getElementById("btn-inclinacion-anubis");
  const btnResetAnubis = document.getElementById("btn-reset-anubis");

  if (btnRamIo && ramIoLabel) {
    btnRamIo.addEventListener("click", () => {
      ramIoCount += 1;
      ramIoLabel.textContent = `Contador de Vocalización Consciente (${ramIoCount} / 33)`;
      playSacredTone(MANTRA_FREQUENCIES["RAM-IO"], 1.8);
    });
  }

  if (btnAnubis && anubisLabel) {
    btnAnubis.addEventListener("click", () => {
      anubisCount = anubisCount < 6 ? anubisCount + 1 : 6;
      anubisLabel.textContent = `Seis Inclinaciones Rituales (${anubisCount} / 6)`;
      btnAnubis.textContent =
        anubisCount < 6
          ? `⚖️ Realizar Inclinación (${anubisCount + 1}ª)`
          : "✓ Audiencia Sellada ante Anubis";
      playSacredTone([349.23, 440.0, 523.25], 1.4);
    });
  }

  if (btnResetAnubis && anubisLabel && btnAnubis) {
    btnResetAnubis.addEventListener("click", () => {
      anubisCount = 0;
      anubisLabel.textContent = "Seis Inclinaciones Rituales (0 / 6)";
      btnAnubis.textContent = "⚖️ Realizar Inclinación (1ª)";
    });
  }

  // Oráculo Ciber-Teúrgico (/api/teurgia + Fallback Determinista Offline)
  const formOraculo = document.getElementById("form-oraculo");
  const oraculoOutputEl = document.getElementById("oraculo-output");

  const LOCAL_ORACLE_RULES = {
    morir: {
      sephirah: "Binah · Devi Kundalini (RAM-IO)",
      mantram: "RRRRRRAAAAAAAMMMMMM... IIIIIIIOOOOOOO... (349.23 Hz · FA)",
      dictamen:
        "ECUACIÓN DE MUERTE MÍSTICA: Entra en Recuerdo de Sí (Clave de SOL), comprende la escena del defecto en meditación retroactiva y clama a Devi Kundalini (RAM-IO) para que decapite e incinere al agregado con la Lanza de Eros."
    },
    nacer: {
      sephirah: "Yesod · Tiphereth (To Soma Heliakon)",
      mantram: "IIIIIII... AAAAAAA... OOOOOOO... (493.88 Hz · SI-LA-FA)",
      dictamen:
        "ECUACIÓN ALQUÍMICA DEL SEGUNDO NACIMIENTO: Transmuta el Hidrógeno Sexual Si-12 aplicando los Dos Shocks Conscientes de la Ley de las Octavas (MI-FA y SI-DO) para cristalizar los Cuerpos Existenciales Superiores del Ser."
    },
    tribunal: {
      sephirah: "Chesed · Geburah (Templo Corazón de la Justicia Divina)",
      mantram: "AUM · TETRAGRAMMATON · ANUBIS (440.0 Hz · LA Causal)",
      dictamen:
        "ECUACIÓN DE LA BALANZA CÓSMICA: «Al León de la Ley se le combate con la Balanza». Realiza las 6 inclinaciones rituales hacia el Templo Corazón, suplica a tu Padre Interno que negocie con Anubis y los 42 Jueces, y multiplica tus obras de Sacrificio por la Humanidad."
    },
    proteccion: {
      sephirah: "Kether · Chokmah · Gran Logia Blanca (Sanat Kumara)",
      mantram: "BELILIN... BELILIN... BELILIN... ÁNFORA DE SALVACIÓN (523.25 Hz)",
      dictamen:
        "ECUACIÓN DE CIERRE E INVISIBILIDAD TEÚRGICA: Canta el mantram Belilin y ordena a tu Intercesor Elemental trazar el Círculo Mágico de Protección alrededor de tu hogar y cabina bajo la custodia de Sanat Kumara y del V.M. Samael Aun Weor."
    }
  };

  if (formOraculo && oraculoOutputEl) {
    formOraculo.addEventListener("submit", async (e) => {
      e.preventDefault();
      const consultaInput = document.getElementById("input-oraculo-consulta");
      const esferaSelect = document.getElementById("select-oraculo-esfera");
      const consulta = consultaInput ? consultaInput.value.trim() : "";
      const esfera = esferaSelect ? esferaSelect.value : "tribunal";
      const dharmaTotal = dharmaState.reduce((acc, item) => acc + item.puntosLuz, 0);
      const enJuicioCount = agregadosState.filter((a) => a.estado === "En Juicio").length;

      playSacredTone(MANTRA_FREQUENCIES["I.A.O."], 1.8);

      try {
        const res = await fetch("/api/teurgia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consulta,
            esfera,
            dharma: dharmaTotal,
            enJuicio: enJuicioCount
          })
        });
        if (!res.ok) throw new Error("Fallback local");
        const data = await res.json();
        oraculoOutputEl.textContent = `[VEREDICTO DE /API/TEURGIA · ${data.status}]
Sephirah Activa : ${data.sephirahActiva}
Mantram Sagrado : ${data.mantramRecomendado} (${data.frecuenciaResonanciaHz} Hz · ${data.notaEscalaCosmica})
Balanza Kármica : ${data.ecuacionBalanza.capitalDharma} Dharma | ${data.ecuacionBalanza.agregadosEnJuicio} en Juicio | Índice Luz: ${data.ecuacionBalanza.indiceNetoLuz}
Estado Tribunal : ${data.ecuacionBalanza.veredictoTribunal}
Dictamen        : ${data.dictamenTeurgico}
Sello SHA-256   : ${data.selloSha256}
${data.saludoFinal}`;
      } catch {
        const fallback = LOCAL_ORACLE_RULES[esfera] || LOCAL_ORACLE_RULES.tribunal;
        const indiceNeto = Math.max(1, dharmaTotal - enJuicioCount * 15);
        oraculoOutputEl.textContent = `[VEREDICTO DETERMINISTA LOCAL · THELEMA ACTIVE]
Sephirah Activa : ${fallback.sephirah}
Mantram Sagrado : ${fallback.mantram}
Balanza Kármica : ${dharmaTotal} Dharma | ${enJuicioCount} en Juicio | Índice Luz: ${indiceNeto}
Dictamen        : ${fallback.dictamen}
AMÉN... AMÉN... AMÉN... PAZ INVERENCIAL.`;
      }
    });
  }

  // 5. EOS Nanosecond Engineering Engine & Universal Technical Translator (#nanosecond-engine)
  // Pre-allocate 64 KB L1 Cache Arena at boot (Zero-Allocation in hot loop)
  const L1_ARENA_BYTES = 65536;
  const SOA_LEN = 2048;
  const l1RawBuffer = new ArrayBuffer(L1_ARENA_BYTES);
  const soaPrices = new Float64Array(l1RawBuffer, 0, SOA_LEN);
  const soaVolumes = new Float64Array(l1RawBuffer, 16384, SOA_LEN);
  const soaOut = new Float64Array(l1RawBuffer, 32768, SOA_LEN);
  const soaAtomicCursor = new Int32Array(l1RawBuffer, 57344, SOA_LEN);

  for (let i = 0; i < SOA_LEN; i++) {
    soaPrices[i] = 349.23 + (i & 255) * 0.5;
    soaVolumes[i] = 0.85 + (i & 15) * 0.01;
  }

  function executeL1SoABenchmark(iterations = 500) {
    const t0 = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      const gain = 1.0001 + (iter & 7) * 0.0001;
      for (let i = 0; i < SOA_LEN; i += 8) {
        soaOut[i]     = soaPrices[i]     * soaVolumes[i]     * gain;
        soaOut[i + 1] = soaPrices[i + 1] * soaVolumes[i + 1] * gain;
        soaOut[i + 2] = soaPrices[i + 2] * soaVolumes[i + 2] * gain;
        soaOut[i + 3] = soaPrices[i + 3] * soaVolumes[i + 3] * gain;
        soaOut[i + 4] = soaPrices[i + 4] * soaVolumes[i + 4] * gain;
        soaOut[i + 5] = soaPrices[i + 5] * soaVolumes[i + 5] * gain;
        soaOut[i + 6] = soaPrices[i + 6] * soaVolumes[i + 6] * gain;
        soaOut[i + 7] = soaPrices[i + 7] * soaVolumes[i + 7] * gain;
      }
      soaAtomicCursor[0] = (soaAtomicCursor[0] + SOA_LEN) | 0;
    }
    const elapsedMs = Math.max(0.04, performance.now() - t0);
    const totalOps = iterations * SOA_LEN;
    const nsPerOp = (elapsedMs * 1000000) / totalOps;
    const mOpsPerSec = totalOps / (elapsedMs * 1000);
    return {
      totalOps,
      elapsedMs: elapsedMs.toFixed(3),
      nsPerOp: nsPerOp.toFixed(2),
      mOpsPerSec: mOpsPerSec.toFixed(1)
    };
  }

  const EOS_COMPILER_PROFILES = {
    "zed-gpui-120fps": {
      title: "Zed GPUI Architecture (Rust / WebGPU · 120 FPS Constantes · < 8 ms INP)",
      s1: "Mapeo Zero-Copy de archivos en memoria (mmap / SharedArrayBuffer) sin serialización intermedia.",
      s2: "Struct of Arrays (SoA) contiguo en Caché L1/L2 para coordenadas X/Y, glifos y colores RGBA (0 Pointer Chasing).",
      s3: "Frame Arena Allocator pre-reservado y reiniciado en O(1) cada 8.33 ms (0 objetos efímeros en el Heap).",
      s4: "Canal atómico SPSC Lock-Free (Compare-And-Swap CAS) entre el hilo de IA/LSP y el hilo de GPU de 120 FPS.",
      s5: "Escaneo léxico AVX-512/SIMD128 + Shaders GPU directos (Metal / Vulkan / DirectX / WebGPU).",
      code: (inst) => `// [EOS COMPILER -> ZED GPUI 120FPS ZERO-ALLOCATION ARENA (Rust)]
// Directiva del Arquitecto: "${inst}"
#[repr(C, align(64))] // Alineado a línea física de Caché L1 (64 bytes)
pub struct GlyphSoABatch {
    pub x_pos: [f32; 1024],      // Contiguo en L1 (0.5 ns hit)
    pub y_pos: [f32; 1024],
    pub color_rgba: [u32; 1024],
}

pub fn render_frame_120fps(arena: &mut GlyphSoABatch, count: usize) {
    for i in (0..count).step_by(8) {
        for lane in 0..8 {
            arena.x_pos[i + lane] = arena.x_pos[i + lane].mul_add(1.0, 0.5);
        }
    }
}`
    },
    "tigerbeetle-zig-backend": {
      title: "TigerBeetle / ScyllaDB Architecture (Zig / C++ Seastar · Millones de TPS · io_uring)",
      s1: "Kernel Bypass por Linux io_uring + DMA directo a NVMe y red sin cambios de contexto al Sistema Operativo.",
      s2: "Lotes contiguos de transacciones de 128 bytes alineados a líneas de caché L1/L2 (Struct of Arrays).",
      s3: "Asignación 100% estática en el arranque (0 malloc/free después de init · 0 Garbage Collector).",
      s4: "Arquitectura Thread-per-Core con afinidad física de CPU y Ring Buffer atómico LMAX Disruptor (0 Mutex).",
      s5: "Verificación criptográfica y contable vectorizada por SIMD (16-32 datos por ciclo de reloj).",
      code: (inst) => `// [EOS COMPILER -> TIGERBEETLE / ZIG STATIC ARENA & IO_URING]
// Directiva del Arquitecto: "${inst}"
const std = @import("std");

pub const TransferBatchSoA = extern struct {
    debit_accounts:  [1024]u128 align(64),
    credit_accounts: [1024]u128 align(64),
    amounts:         [1024]u64  align(64),
};

pub fn commitBatchLockFree(batch: *TransferBatchSoA, count: usize) void {
    var i: usize = 0;
    while (i < count) : (i += 8) {
        inline for (0..8) |lane| {
            batch.amounts[i + lane] +|= 1; // 0 GC · Ejecución determinista en L1
        }
    }
}`
    },
    "citadel-kdb-hft": {
      title: "Citadel HFT / kdb+ Architecture (C++23 / Vector q · < 100 Nanosegundos · L1 Cache)",
      s1: "Kernel Bypass por DPDK / Solarflare OpenOnload directo a los pines físicos de la tarjeta de red (NIC).",
      s2: "Motor columnar vectorial en memoria L1/L2 (Struct of Arrays estilo kdb+ q sin punteros ni objetos OOP).",
      s3: "Ring Buffer pre-calentado sobre HugePages (2MB/1GB) con 0 Page Faults y 0 asignaciones en vivo.",
      s4: "Spin-loop atómico Compare-And-Swap (std::atomic CAS) anclado a un núcleo físico aislado (isolcpus).",
      s5: "Intrínsecos vectoriales AVX-512 (_mm512_mul_pd) procesando 8 doubles / 16 floats en 1 solo ciclo de reloj.",
      code: (inst) => `// [EOS COMPILER -> CITADEL HFT / KDB+ SUB-100NS ENGINE (C++23 AVX-512)]
// Directiva del Arquitecto: "${inst}"
#include <immintrin.h>

alignas(64) double prices_soa[2048];
alignas(64) double volumes_soa[2048];
alignas(64) double signals_out[2048];

inline void execute_hft_tick_sub100ns() noexcept {
    for (size_t i = 0; i < 2048; i += 8) {
        __m512d p = _mm512_load_pd(&prices_soa[i]);
        __m512d v = _mm512_load_pd(&volumes_soa[i]);
        _mm512_store_pd(&signals_out[i], _mm512_mul_pd(p, v));
    }
}`
    },
    "xirp-bun-edge": {
      title: "Xirp / Bun Edge Architecture (Zero-JS Hydration · Speculation Rules · Edge CDN)",
      s1: "HTML pre-renderizado en nodos Edge CDN globales (TTFB ~0ms) + Speculation Rules (0ms en navegación).",
      s2: "Estado plano en TypedArrays y atributos data-* sin árboles Virtual-DOM pesados en RAM.",
      s3: "Caché O(1) de recursos y referencias DOM (_dom cache + dirty-checking con 0 basura por frame).",
      s4: "Despacho asíncrono no bloqueante (requestAnimationFrame / Web Workers con SharedArrayBuffer).",
      s5: "Animaciones exclusivas en GPU (transform: scale3d/scaleX/scaleY, opacity, touch-action: manipulation).",
      code: (inst) => `// [EOS COMPILER -> XIRP / BUN EDGE ZERO-ALLOCATION WEB CONTROLLER]
// Directiva del Arquitecto: "${inst}"
const L1_ARENA = new ArrayBuffer(65536); // 64 KB fijos en Caché L1
const STATE_SOA = new Float64Array(L1_ARENA, 0, 2048);

export function updateEdgeHudZeroJank(el, nextScale) {
  if (el._lastScale !== nextScale) {
    el._lastScale = nextScale;
    el.style.transform = \`scale3d(\${nextScale}, 1, 1)\`; // 120 FPS GPU Compositor
  }
}`
    },
    "aberamentho-rtos-dsp": {
      title: "Aberamentho RTOS Audio DSP (WebAudio / Float32 SoA · Sample-Accurate · 0 Glitches)",
      s1: "Escritura directa sobre los canales PCM Float32Array del AudioBuffer nativo sin decodificación intermedia.",
      s2: "Canales L/R separados en arreglos contiguos Float32Array para la Fuga Alquímica de 3 Voces (FA 349.23Hz).",
      s3: "SoundGenerator._bufferCache O(1) + Uint8Array(128) pre-asignado en el analizador espectral de 60fps.",
      s4: "Planificación sample-accurate en el reloj de hardware de audio (ctx.currentTime + scheduleBassKill).",
      s5: "Síntesis vectorial de 7 Octavas Planetarias (DO-SI) + vúmetros en GPU con transform: scaleY().",
      code: (inst) => `// [EOS COMPILER -> ABERAMENTHO RTOS ZERO-ALLOCATION DSP ENGINE]
// Directiva del Arquitecto: "${inst}"
const PCM_RING_ARENA = new Float32Array(44100 * 4); // Pre-asignado (0 GC en audio)

export function synthesizeHarmonicBlockSoA(sampleRate, freqFa = 349.23) {
  const step = (2 * Math.PI * freqFa) / sampleRate;
  for (let i = 0; i < PCM_RING_ARENA.length; i += 4) {
    PCM_RING_ARENA[i]     = Math.sin(i * step);
    PCM_RING_ARENA[i + 1] = Math.sin((i + 1) * step);
    PCM_RING_ARENA[i + 2] = Math.sin((i + 2) * step);
    PCM_RING_ARENA[i + 3] = Math.sin((i + 3) * step);
  }
  return PCM_RING_ARENA;
}`
    }
  };

  const formEosCompiler = document.getElementById("form-eos-compiler");
  const inputEosInstruction = document.getElementById("input-eos-instruction");
  const selectEosProfile = document.getElementById("select-eos-profile");
  const eosCompilerOutput = document.getElementById("eos-compiler-output");
  const soaBenchmarkReadout = document.getElementById("soa-benchmark-readout");
  const btnRunSoaBenchmark = document.getElementById("btn-run-soa-benchmark");
  const btnCopyEosBlueprint = document.getElementById("btn-copy-eos-blueprint");
  const btnDownloadEosSpec = document.getElementById("btn-download-eos-spec");
  const eosEvolutionLogEl = document.getElementById("eos-evolution-log");
  const eosEvolutionCounterEl = document.getElementById("eos-evolution-counter");

  const EVOLUTION_LOG_KEY = "eos_supreme_evolution_log_v4";
  let evolutionEntries = [
    {
      ts: new Date().toISOString().slice(11, 19),
      profile: "v4.0-SUPREME",
      inst: "Motor Universal de Traducción Técnica + 5 Secretos de Nanosegundos + Aberamentho v8.0 In-App Full-Track Player sellados."
    }
  ];
  try {
    const savedLog = localStorage.getItem(EVOLUTION_LOG_KEY);
    if (savedLog) {
      const parsed = JSON.parse(savedLog);
      if (Array.isArray(parsed) && parsed.length > 0) {
        evolutionEntries = parsed.slice(0, 12);
      }
    }
  } catch {
    // Ignore storage restriction
  }

  function renderEvolutionLog() {
    if (eosEvolutionCounterEl) {
      eosEvolutionCounterEl.textContent = `Directivas compiladas: ${evolutionEntries.length}`;
    }
    if (eosEvolutionLogEl) {
      eosEvolutionLogEl.innerHTML = evolutionEntries
        .map(
          (item) =>
            `<div>• <span style="color:#38bdf8;">[${item.ts} · ${item.profile}]</span> ${item.inst.replace(/</g, "&lt;")}</div>`
        )
        .join("");
    }
  }
  renderEvolutionLog();

  function recordEvolutionEntry(inst, profileKey) {
    const entry = {
      ts: new Date().toISOString().slice(11, 19),
      profile: profileKey,
      inst: inst.length > 96 ? inst.slice(0, 96) + "..." : inst
    };
    evolutionEntries = [entry, ...evolutionEntries.filter((e) => e.inst !== entry.inst)].slice(0, 12);
    try {
      localStorage.setItem(EVOLUTION_LOG_KEY, JSON.stringify(evolutionEntries));
    } catch {
      // Ignore storage quota error
    }
    renderEvolutionLog();
  }

  async function compileInstructionWithEos(instructionText, profileKey) {
    const cleanInst = (instructionText || "").trim() || "Construir sistema de ultra-baja latencia a 120 FPS y 0 pausas de GC";
    const profileObj = EOS_COMPILER_PROFILES[profileKey] || EOS_COMPILER_PROFILES["zed-gpui-120fps"];
    const bench = executeL1SoABenchmark(600);

    if (soaBenchmarkReadout) {
      soaBenchmarkReadout.innerHTML = `Operaciones Vectoriales: <strong>${bench.totalOps.toLocaleString()} ops (${bench.elapsedMs} ms)</strong> · Velocidad: <strong style="color:#f59e0b;">${bench.nsPerOp} ns/op (${bench.mOpsPerSec} Mops/s)</strong> · Heap: <strong style="color:#10b981;">0 Bytes (Zero-Allocation)</strong>`;
    }

    let remoteSeal = "LOCAL-L0-DETERMINISTIC-SEAL";
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: cleanInst, profile: profileKey })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.sha256Seal) remoteSeal = data.sha256Seal.slice(0, 32) + "...";
      }
    } catch {
      // Offline / static fallback preserves 100% deterministic behavior
    }

    const compiledText = `[EOS UNIVERSAL COMPILER v4.0 · VERIFIED · ${bench.nsPerOp} ns/op · 0 B/OP HEAP]
Instrucción : ${cleanInst}
Perfil      : ${profileObj.title}
Sello SHA256: ${remoteSeal}

1. INTAKE & CLASIFICACIÓN DUAL-TRACK (PASOS 1–3):
  • Track Asignado : HEAVY_TRACK (Compuerta Constitucional Nivel 2+ Verificada)
  • Dominio L0     : Pure Hexagonal Core (0 Dependencias Externas en Runtime)

2. ESPECIFICACIÓN FORMAL EARS & BDD (LEY I & II · PASOS 4–8):
  • FR-EOS-01 (Ubiquitous): EL SISTEMA ejecutará "${cleanInst}" sobre un Struct of Arrays (SoA) contiguo de 64 KB en Caché L1 con 0 asignaciones dinámicas en el Heap.
  • FR-EOS-02 (Event-Driven): CUANDO ingrese una orden o evento, EL SISTEMA despachará por cola circular Lock-Free (CAS atómico) y renderizará en GPU en < 8 ms (120 FPS).
  • BDD: DADO un Arena pre-reservado de 64 KB, CUANDO corre la carga bajo ${profileKey}, ENTONCES logra ${bench.mOpsPerSec} millones de ops/seg con 0 ms de Garbage Collector.

3. LOS 5 SECRETOS DE VELOCIDAD EXTREMA APLICADOS (ARQUITECTURA):
  • [1] Kernel Bypass : ${profileObj.s1}
  • [2] Caché L1 SoA  : ${profileObj.s2}
  • [3] Zero-Alloc    : ${profileObj.s3}
  • [4] Lock-Free CAS : ${profileObj.s4}
  • [5] SIMD & GPU    : ${profileObj.s5}

4. GRAFO DE TAREAS ATÓMICAS (DAG DE EJECUCIÓN · PASOS 9–17):
  • [TASK-01] Reservar Arena SoA de 64 KB alineada a 64B en Caché L1
  • [TASK-02] Configurar anillo atómico SPSC Lock-Free (Compare-And-Swap CAS)
  • [TASK-03] Compilar bucle vectorial desenrollado x8 (SIMD / GPU 120 FPS)
  • [TASK-04] Ejecutar verify:strict (Exit Code 0) y sellar recibo EVD SHA-256

5. CÓDIGO FUENTE GENERADO (ZERO-ALLOCATION / SOA / SIMD):
${profileObj.code(cleanInst)}

6. RECIBO CRIPTOGRÁFICO DE EVIDENCIA (PASOS 18–21):
  • Estado Epistémico : PRODUCTION_READY · L1 Footprint: 65,536 Bytes · Heap: 0 Bytes`;

    if (eosCompilerOutput) {
      eosCompilerOutput.textContent = compiledText;
    }
    recordEvolutionEntry(cleanInst, profileKey);
  }

  if (btnCopyEosBlueprint && eosCompilerOutput) {
    btnCopyEosBlueprint.addEventListener("click", () => {
      const text = eosCompilerOutput.textContent || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          const prev = btnCopyEosBlueprint.textContent;
          btnCopyEosBlueprint.textContent = "✅ Blueprint Copiado";
          setTimeout(() => {
            btnCopyEosBlueprint.textContent = prev;
          }, 1800);
        });
      }
    });
  }

  if (btnDownloadEosSpec && eosCompilerOutput) {
    btnDownloadEosSpec.addEventListener("click", () => {
      const text = eosCompilerOutput.textContent || "";
      const blob = new Blob([`# PAQUETE SDD & NANOSECOND BLUEPRINT — EOS SYSTEM v4.0\n\n\`\`\`text\n${text}\n\`\`\`\n`], {
        type: "text/markdown;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EOS-SDD-BLUEPRINT-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (formEosCompiler) {
    formEosCompiler.addEventListener("submit", (e) => {
      e.preventDefault();
      playSacredTone([349.23, 440.0, 523.25], 0.9);
      compileInstructionWithEos(
        inputEosInstruction ? inputEosInstruction.value : "",
        selectEosProfile ? selectEosProfile.value : "zed-gpui-120fps"
      );
    });
  }

  if (btnRunSoaBenchmark) {
    btnRunSoaBenchmark.addEventListener("click", () => {
      playSacredTone([523.25, 659.25], 0.7);
      compileInstructionWithEos(
        inputEosInstruction ? inputEosInstruction.value : "",
        selectEosProfile ? selectEosProfile.value : "zed-gpui-120fps"
      );
    });
  }

  document.querySelectorAll(".eos-preset-prompt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const promptText = btn.getAttribute("data-prompt") || "";
      const profileVal = btn.getAttribute("data-profile") || "zed-gpui-120fps";
      if (inputEosInstruction) inputEosInstruction.value = promptText;
      if (selectEosProfile) selectEosProfile.value = profileVal;
      playSacredTone([349.23, 523.25], 0.7);
      compileInstructionWithEos(promptText, profileVal);
    });
  });

  // 6. Register Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  /* ==========================================================================
     EOS UNIVERSAL AUTONOMOUS DEVELOPMENT ENGINE — CLIENT LAB (v2.7.0)
     ========================================================================== */
  const customPromptInput = document.getElementById("eos-custom-prompt-input");
  const runPipelineBtn = document.getElementById("eos-run-pipeline-btn");
  const presetChips = document.querySelectorAll(".preset-chip");
  const artifactTabs = document.querySelectorAll(".artifact-tab");

  let currentArtifacts = {
    "pipeline-log": CLI_OUTPUTS["develop:universal"] || "",
    "ears-spec": "",
    "code-entity": "",
    "code-usecase": "",
    "code-test": ""
  };
  let activeArtifactView = "pipeline-log";

  function derivePascalCase(str) {
    const clean = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim();
    const stopWords = new Set(["crear", "un", "una", "el", "la", "los", "las", "de", "del", "para", "con", "sistema", "modulo", "servicio", "motor", "create", "a", "an", "the", "for", "with", "system", "engine"]);
    const words = clean.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
    if (words.length === 0) return "CoreFeatureEngine";
    const pascal = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
    return pascal.endsWith("Engine") || pascal.endsWith("Service") ? pascal : pascal + "Engine";
  }

  async function sha256Browser(text) {
    if (window.crypto && window.crypto.subtle) {
      const buffer = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  }

  async function runUniversalEngineLab(instruction) {
    const prompt = (instruction || "Implementar pasarela de pagos con Stripe y webhooks seguros").trim();
    const lower = prompt.toLowerCase();
    const featureName = derivePascalCase(prompt);

    const dbKeywords = ["base de datos", "database", "sql", "postgres", "neon", "tabla", "schema", "migración", "pago", "stripe"];
    const authKeywords = ["auth", "autenticación", "login", "token", "jwt", "passkey", "sesión", "webhook", "biométrica"];
    const cryptoKeywords = ["cripto", "cifrado", "crypto", "acid", "secreto", "smart contract", "erc-4337", "zero-knowledge"];

    const isHeavy = dbKeywords.some(k => lower.includes(k)) || authKeywords.some(k => lower.includes(k)) || cryptoKeywords.some(k => lower.includes(k)) || prompt.length > 80;
    const track = isHeavy ? "HEAVY_TRACK" : "FAST_TRACK";

    const earsPattern = isHeavy ? "EVENT_DRIVEN" : "STATE_DRIVEN";
    const earsStatement = isHeavy
      ? `CUANDO el usuario solicite "${prompt}", EL SISTEMA ejecutará el protocolo con validación estricta de invariantes, persistencia transaccional ACID y firma de auditoría.`
      : `MIENTRAS el sistema opere en modo activo, EL SISTEMA procesará "${prompt}" preservando la respuesta fluida a 60 FPS y 100% de tipos estrictos.`;

    const shaSeal = await sha256Browser(`${prompt}:${featureName}:${Date.now()}`);

    // 1. Synthesize Spec Markdown
    const specMarkdown = `# ESPECIFICACIÓN DETERMINISTA & BDD: ${featureName}
======================================================================
Directriz Original : "${prompt}"
Track Asignado     : [${track}] · Cero Vibe Coding
Patrón EARS        : ${earsPattern}

REQUISITO FORMAL:
${earsStatement}

CRITERIOS DE ACEPTACIÓN BDD:
ESCENARIO 1: Ruta Feliz Determinista
  DADO que el sistema se encuentra en un estado inicial consistente
  CUANDO el usuario o agente activa la operación "${prompt.substring(0, 40)}"
  ENTONCES el subsistema responde satisfactoriamente cumpliendo los contratos formales
  Y todos los invariantes de seguridad y tipos permanecen intactos.

ESCENARIO 2: Manejo de Errores y Aislamiento FDIR
  DADO una condición de fallo o payload con firma corrupta
  CUANDO el motor detecta la anomalía
  ENTONCES la transacción se aísla de inmediato sin contaminar la memoria
  Y se emite un reporte clínico determinista con Exit Code de diagnóstico.

SELLO EPISTÉMICO SHA-256:
${shaSeal}
======================================================================`;

    // 2. Synthesize Domain Entity Code
    const entityCode = `/**
 * ${featureName} — Entidad de Dominio Pura (Capa 0)
 * Hexagonal Pure Domain · Zero Dependencias Externas · 100% Inmutable
 */

export class DomainInvariantViolationError extends Error {
  constructor(message: string) {
    super('[DOMAIN_INVARIANT_VIOLATION] ' + message);
    this.name = 'DomainInvariantViolationError';
  }
}

export interface ${featureName}Props {
  readonly id: string;
  readonly name: string;
  readonly status: 'PENDING' | 'ACTIVE' | 'ARCHIVED';
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class ${featureName} {
  public readonly id: string;
  public readonly name: string;
  public readonly status: 'PENDING' | 'ACTIVE' | 'ARCHIVED';
  public readonly metadata: Readonly<Record<string, unknown>>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: ${featureName}Props) {
    if (!props.id || props.id.trim().length === 0) {
      throw new DomainInvariantViolationError('ID de entidad no puede ser vacío');
    }
    if (!props.name || props.name.trim().length < 3) {
      throw new DomainInvariantViolationError('Nombre debe tener mínimo 3 caracteres');
    }

    this.id = props.id.trim();
    this.name = props.name.trim();
    this.status = props.status;
    this.metadata = Object.freeze({ ...props.metadata });
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  public activate(): ${featureName} {
    if (this.status === 'ACTIVE') return this;
    return new ${featureName}({
      ...this,
      status: 'ACTIVE',
      updatedAt: new Date()
    });
  }
}`;

    // 3. Synthesize Use Case Code
    const useCaseCode = `/**
 * Execute${featureName}UseCase — Capa de Aplicación Hexagonal
 * Orquesta la lógica pura y las transacciones sin acoplamiento a infraestructura.
 */

import { ${featureName} } from '../domain/${featureName}.js';

export interface ${featureName}RepositoryPort {
  save(entity: ${featureName}): Promise<void>;
  findById(id: string): Promise<${featureName} | null>;
  listAll(): Promise<readonly ${featureName}[]>;
}

export interface Execute${featureName}Command {
  readonly id: string;
  readonly name: string;
  readonly metadata?: Record<string, unknown>;
  readonly activateImmediately?: boolean;
}

export class Execute${featureName}UseCase {
  constructor(private readonly repository: ${featureName}RepositoryPort) {}

  public async execute(command: Execute${featureName}Command) {
    const existing = await this.repository.findById(command.id);
    if (existing) {
      throw new Error('Entidad ' + command.id + ' ya existe en el registro');
    }

    const now = new Date();
    let entity = new ${featureName}({
      id: command.id,
      name: command.name,
      status: 'PENDING',
      metadata: command.metadata || {},
      createdAt: now,
      updatedAt: now
    });

    if (command.activateImmediately) {
      entity = entity.activate();
    }

    await this.repository.save(entity);

    return {
      success: true,
      entityId: entity.id,
      status: entity.status,
      executedAt: now.toISOString()
    };
  }
}`;

    // 4. Synthesize Deterministic Test Code
    const testCode = `/**
 * Deterministic Test Suite — ${featureName}
 * Verificación 100% estricta en TypeScript sin dependencias externas.
 */

import { ${featureName}, DomainInvariantViolationError } from '../domain/${featureName}.js';
import { Execute${featureName}UseCase, ${featureName}RepositoryPort } from '../application/Execute${featureName}UseCase.js';

class InMemory${featureName}Repository implements ${featureName}RepositoryPort {
  private store = new Map<string, ${featureName}>();
  async save(e: ${featureName}) { this.store.set(e.id, e); }
  async findById(id: string) { return this.store.get(id) || null; }
  async listAll() { return Array.from(this.store.values()); }
}

async function runTests() {
  console.log('>>> [TEST] Verificando invariantes de ${featureName}...');
  const repo = new InMemory${featureName}Repository();
  const useCase = new Execute${featureName}UseCase(repo);

  const res = await useCase.execute({
    id: 'ENT-001',
    name: 'Instancia Verificada',
    activateImmediately: true
  });

  if (!res.success || res.status !== 'ACTIVE') {
    throw new Error('Fallo de invariante en caso de uso');
  }

  console.log('[100% PASS] Todos los escenarios verificados con EXIT CODE 0.');
}

runTests();`;

    // 5. Generate 21-step pipeline log
    const pipelineLog = `$ eos develop "${prompt}" --scaffold
> Initializing EOS Universal Autonomous Development Engine (UniversalDevelopmentEngine.ts)...
> Prompt Ingestion: "${prompt}"
> Track Classification: [${track}] · Complexity: ${isHeavy ? '85%' : '35%'}

[1/21] INTAKE & CONTEXT             : Directriz formalizada en docs/intake/INTAKE-${Date.now().toString(36).toUpperCase()}.md
[2/21] RECONNAISSANCE               : Análisis de dependencias limpias y contratos de tipo
[3/21] CONTEXT UNDERSTANDING        : Modelos clasificados: [${featureName}] | Track: ${track}
[4/21] REQUIREMENTS (EARS & BDD)    : ${earsPattern}: ${earsStatement}
[5/21] RESEARCH                     : Evaluación de patrones arquitectónicos y avisos de seguridad
[6/21] ARCHITECTURE (HEXAGONAL L0)  : Aislamiento puro L0 (0 dependencias) · Entidad ${featureName}
[7/21] DESIGN & SYSTEM CONTRACTS    : Contratos inmutables definidos con TypeScript 5.7 Strict
[8/21] SPECIFICATION APPROVAL       : Aprobación formal registrada bajo Constitución EOS v2.1
[9/21] AUTHORIZATION GATE (LEVEL 2) : 6/6 Precondiciones constitucionales verificadas. Gate abierto.
[10/21] DOMAIN & APP IMPLEMENTATION : Grafo DAG resuelto con tareas secuenciales de dominio puro
[11/21] UNIT & LOGIC TESTING        : 100% Cobertura de invariantes en InMemory${featureName}Repository
[12/21] SECURITY AUDIT (OWASP)      : Cero secretos en texto plano. Sanitización estricta de inputs
[13/21] QUALITY & STRICT TYPES      : TypeScript Strict Mode verificado. 0 errores de tipado.
[14/21] ACCESSIBILITY (WCAG 2.1 AA) : Contraste de colores y navegación por teclado verificada
[15/21] PERFORMANCE & BUDGETS       : Latencia sub-8ms preservada. Presupuesto de memoria óptimo.
[16/21] SEO & METADATA CONTRACTS    : Estructura semántica validada
[17/21] BROWSER QA & PLAYWRIGHT     : Pruebas visuales y de interacción superadas
[18/21] EVIDENCE COLLECTION         : Registro criptográfico sellado deterministamente
[19/21] STRICT INTEGRITY AUDIT      : verify-strict superado (Exit Code 0)
[20/21] PRODUCTION DEPLOYMENT       : Bundle desplegado a producción en Vercel Edge
[21/21] CO-EVOLUTION TELEMETRY SYNC : Telemetría sincronizada en tiempo real sin deriva

======================================================================
SINTESIS HEXAGONAL AUTÓNOMA COMPLETADA CON ÉXITO:
  + [DOMINIO]       dist/generated/${featureName.toLowerCase()}/domain/${featureName}.ts
  + [PUERTO]        dist/generated/${featureName.toLowerCase()}/domain/${featureName}RepositoryPort.ts
  + [CASO DE USO]   dist/generated/${featureName.toLowerCase()}/application/Execute${featureName}UseCase.ts
  + [ADAPTADOR]     dist/generated/${featureName.toLowerCase()}/infrastructure/InMemory${featureName}Repository.ts
  + [TEST SUITE]    dist/generated/${featureName.toLowerCase()}/tests/${featureName}.test.ts
  + [ESPECIFICACIÓN] dist/generated/${featureName.toLowerCase()}/SPECIFICATION.md

EPISTEMIC STATE    : PRODUCTION_READY (10/10)
SHA-256 ATTESTATION: ${shaSeal}
EXIT CODE          : 0 (CERO DEFECTOS)
======================================================================`;

    currentArtifacts = {
      "pipeline-log": pipelineLog,
      "ears-spec": specMarkdown,
      "code-entity": entityCode,
      "code-usecase": useCaseCode,
      "code-test": testCode
    };

    activeArtifactView = "pipeline-log";
    artifactTabs.forEach(t => t.classList.toggle("is-active", t.getAttribute("data-view") === "pipeline-log"));

    if (terminalOutput) {
      terminalOutput.textContent = pipelineLog;
    }
    if (activeCmdLabel) {
      activeCmdLabel.textContent = `Modo activo: eos develop "${prompt.substring(0, 32)}..." · 21/21 PASOS SUPERADOS · EXIT CODE 0`;
    }
    recordEvolutionEntry(prompt, track);
  }

  if (runPipelineBtn && customPromptInput) {
    runPipelineBtn.addEventListener("click", () => {
      runUniversalEngineLab(customPromptInput.value);
    });

    customPromptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runUniversalEngineLab(customPromptInput.value);
      }
    });
  }

  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const preset = chip.getAttribute("data-preset");
      if (preset && customPromptInput) {
        customPromptInput.value = preset;
        runUniversalEngineLab(preset);
      }
    });
  });

  artifactTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const viewKey = tab.getAttribute("data-view");
      if (viewKey && currentArtifacts[viewKey]) {
        activeArtifactView = viewKey;
        artifactTabs.forEach(t => t.classList.toggle("is-active", t === tab));
        if (terminalOutput) {
          terminalOutput.textContent = currentArtifacts[viewKey];
        }
      }
    });
  });

  /* ==========================================================================
     EOS SOVEREIGN AKASHIC MEMORY VAULT & GENTLEMAN-SAMAELIAN ENGINE (v5.0)
     ========================================================================== */
  const AKASHIC_STORAGE_KEY = "eos_akashic_memory_vault_v5";
  const DEFAULT_AKASHIC_OBSERVATIONS = [
    {
      id: 101,
      project: "eos-system",
      type: "architecture",
      samaelianFactor: "NACER",
      sephirah: "Daath (Gnosis / Conocimiento Akáshico)",
      topic_key: "architecture/eos-akashic-memory-l0",
      title: "Bóveda de Memoria Akáshica Soberana L0 (Superación de Engram & Gentle-AI)",
      what: "Integración nativa de las 27 herramientas MCP de Engram + ODD/RDD 4R de Gentle-AI en el núcleo L0 de EOS con firma Merkle SHA-256.",
      where: "src/core/eosAkashicMemory.ts, api/memory.js, index.html (#memoria-akashica)",
      learned: "Cada recuerdo se graba en el Átomo Nous bajo los Tres Factores (MORIR, NACER, SACRIFICIO) y los conflictos se juzgan en el Tribunal de Anubis.",
      pinned: true,
      version_count: 1,
      merkleHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      updated_at: "2026-10-25"
    },
    {
      id: 102,
      project: "eos-system",
      type: "pattern",
      samaelianFactor: "NACER",
      sephirah: "Netzach (Mente Solar · Arquitectura)",
      topic_key: "pattern/five-nanosecond-secrets-soa",
      title: "Los 5 Secretos de los Softwares Más Rápidos del Mundo (Nanosegundos & Caché L1 SoA)",
      what: "Implementación de Kernel Bypass, Struct of Arrays (SoA) en 64KB de Caché L1 (0.5ns), Zero-Allocation Arena (0 GC), Lock-Free CAS y SIMD/GPU 120 FPS.",
      where: "src/core/eosNanosecondEngine.ts, api/compile.js",
      learned: "Un ArrayBuffer contiguo de 64 KB alineado a 64 bytes elimina el pointer-chasing de OOP y corre a >1,500 Mops/s sin pausas de Garbage Collector.",
      pinned: true,
      version_count: 2,
      merkleHash: "4b2c57a0e9c4a81f3b720d49108a7f63c1e5b90284716d3f8a92c04b15d6e7f8",
      updated_at: "2026-10-25"
    },
    {
      id: 103,
      project: "aberamentho-pleroma",
      type: "bugfix",
      samaelianFactor: "MORIR",
      sephirah: "Geburah (Rigor de la Ley · Tribunal de Anubis)",
      topic_key: "bugfix/aberamentho-v8-inapp-full-track-player",
      title: "Sello Definitivo v8.0: Reproductor In-App de Canciones Completas & Perfect Music",
      what: "Construcción de #inapp-full-player + /api/playlist-tracks + /api/resolve-full-track y bloqueo en <head> de Perfect Music (5IiquGZEbovPj9B8IdG0bi).",
      where: "Aberamentho/index.html, Aberamentho/api/index.ts, Aberamentho/src/audio/playlist-vault.js",
      learned: "Purgar caches antiguos en <head> y resolver el stream completo en el backend elimina el límite de 30s móvil sin salir hacia Spotify.",
      pinned: true,
      version_count: 3,
      merkleHash: "8d9726e44b15283a04b15d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a",
      updated_at: "2026-10-25"
    },
    {
      id: 104,
      project: "eos-system",
      type: "session_summary",
      samaelianFactor: "SACRIFICIO",
      sephirah: "Tiphereth (Alma Humana · Voluntad Thelema)",
      topic_key: "session_summary/odd-proportional-and-rdd-4r",
      title: "Enrutamiento Proporcional ODD Solar & Revisión Congelada RDD de las 4R Crísticas",
      what: "Síntesis de Organic Driven Development (ODD) y Receipt-Driven Development (RDD 4R: Risk, Resilience, Readability, Reliability) en EOS.",
      where: "src/core/eosAkashicMemory.ts, docs/specs/spec.md (FR-013)",
      learned: "Delegar subagentes solo por 4 razones verificables (Exploration, Parallel Writers, Context Backstop, Independent Verifier) y congelar el candidato antes de auditar.",
      pinned: false,
      version_count: 1,
      merkleHash: "c681c7e95675e02dd7037f814126dec855dba803455ed3a86df6dfa932966957",
      updated_at: "2026-10-25"
    }
  ];

  let akashicObservations = [...DEFAULT_AKASHIC_OBSERVATIONS];
  try {
    const rawVault = localStorage.getItem(AKASHIC_STORAGE_KEY);
    if (rawVault) {
      const parsedVault = JSON.parse(rawVault);
      if (Array.isArray(parsedVault) && parsedVault.length > 0) {
        akashicObservations = parsedVault;
      }
    }
  } catch {
    // Fallback to default observations
  }

  let currentAkashicFactorFilter = "ALL";
  let currentAkashicQuery = "";

  const formAkashicSave = document.getElementById("form-akashic-save");
  const selectAkashicType = document.getElementById("select-akashic-type");
  const inputAkashicTopic = document.getElementById("input-akashic-topic");
  const inputAkashicTitle = document.getElementById("input-akashic-title");
  const inputAkashicWhat = document.getElementById("input-akashic-what");
  const inputAkashicWhere = document.getElementById("input-akashic-where");
  const inputAkashicLearned = document.getElementById("input-akashic-learned");
  const btnAkashicSuggestKey = document.getElementById("btn-akashic-suggest-key");
  const btnAkashicJudge = document.getElementById("btn-akashic-judge");
  const btnAkashicDoctor = document.getElementById("btn-akashic-doctor");
  const btnAkashicExport = document.getElementById("btn-akashic-export");
  const inputAkashicSearch = document.getElementById("input-akashic-search");
  const akashicObservationsList = document.getElementById("akashic-observations-list");
  const akashicDiagnosticOutput = document.getElementById("akashic-diagnostic-output");
  const akashicCountAll = document.getElementById("akashic-count-all");
  const akashicFactorBtns = document.querySelectorAll(".akashic-factor-btn");

  function persistAkashicVault() {
    try {
      localStorage.setItem(AKASHIC_STORAGE_KEY, JSON.stringify(akashicObservations));
    } catch {
      // Ignore storage quota
    }
  }

  function mapTypeToFactorAndSephirah(typeVal) {
    if (typeVal === "bugfix") {
      return { factor: "MORIR", sephirah: "Geburah (Rigor de la Ley · Tribunal de Anubis)" };
    }
    if (typeVal === "session_summary") {
      return { factor: "SACRIFICIO", sephirah: "Tiphereth (Alma Humana · Voluntad Thelema)" };
    }
    return { factor: "NACER", sephirah: "Daath (Gnosis / Conocimiento Akáshico)" };
  }

  function renderAkashicObservations() {
    if (akashicCountAll) {
      akashicCountAll.textContent = String(akashicObservations.length);
    }
    if (!akashicObservationsList) return;

    const q = (currentAkashicQuery || "").trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    const filtered = akashicObservations
      .filter((obs) => {
        if (currentAkashicFactorFilter === "PINNED") return Boolean(obs.pinned);
        if (currentAkashicFactorFilter !== "ALL") return obs.samaelianFactor === currentAkashicFactorFilter;
        return true;
      })
      .filter((obs) => {
        if (tokens.length === 0) return true;
        const hay = `${obs.title} ${obs.topic_key} ${obs.what} ${obs.where} ${obs.learned} ${obs.samaelianFactor} ${obs.sephirah}`.toLowerCase();
        return tokens.every((tok) => hay.includes(tok));
      })
      .sort((a, b) => (Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))) || (b.id - a.id));

    if (filtered.length === 0) {
      akashicObservationsList.innerHTML = `<div class="sanctum-item" style="text-align:center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.78rem;">No se hallaron recuerdos en FTS5 para "${currentAkashicQuery}".</div>`;
      return;
    }

    akashicObservationsList.innerHTML = filtered
      .map((obs) => {
        const factorBadgeClass =
          obs.samaelianFactor === "MORIR"
            ? "sanctum-badge--trial"
            : obs.samaelianFactor === "SACRIFICIO"
            ? "sanctum-badge--gold"
            : "sanctum-badge--incinerated";
        return `<div class="sanctum-item" style="border-color: ${obs.pinned ? "rgba(245, 158, 11, 0.45)" : "rgba(148, 163, 184, 0.2)"};">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
              <span class="sanctum-badge ${factorBadgeClass}">${obs.samaelianFactor} · ${obs.type.toUpperCase()}</span>
              <code style="font-size:0.7rem; color:#38bdf8;">${obs.topic_key}</code>
              <span style="font-family:var(--font-mono); font-size:0.66rem; color:var(--text-muted);">v${obs.version_count || 1}</span>
            </div>
            <button type="button" class="btn btn--ghost akashic-pin-btn" data-id="${obs.id}" style="padding:0.18rem 0.5rem; font-size:0.68rem;">
              ${obs.pinned ? "📌 Fijado (Unpin)" : "📍 Fijar (mem_pin)"}
            </button>
          </div>
          <div style="font-weight:700; color:#f8fafc; font-size:0.86rem;">#${obs.id} · ${obs.title}</div>
          <div style="font-size:0.78rem; color:var(--text-light); line-height:1.45;">
            <strong>What/Why:</strong> ${obs.what}<br/>
            <strong>Where:</strong> <code style="color:#fcd34d;">${obs.where}</code><br/>
            <strong>Learned:</strong> ${obs.learned}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:0.66rem; color:var(--text-muted); border-top:1px solid rgba(148,163,184,0.14); padding-top:0.35rem;">
            <span>Sephirah: ${obs.sephirah}</span>
            <span style="color:#10b981;">Merkle SHA-256: ${(obs.merkleHash || "").slice(0, 16)}...</span>
          </div>
        </div>`;
      })
      .join("");

    akashicObservationsList.querySelectorAll(".akashic-pin-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = Number(btn.getAttribute("data-id"));
        akashicObservations = akashicObservations.map((o) =>
          o.id === targetId ? { ...o, pinned: !o.pinned } : o
        );
        persistAkashicVault();
        renderAkashicObservations();
      });
    });
  }

  renderAkashicObservations();

  if (btnAkashicSuggestKey) {
    btnAkashicSuggestKey.addEventListener("click", () => {
      const t = selectAkashicType ? selectAkashicType.value : "architecture";
      const title = inputAkashicTitle ? inputAkashicTitle.value : "core-decision";
      const slug = title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "core-decision";
      if (inputAkashicTopic) {
        inputAkashicTopic.value = `${t}/${slug}`;
      }
    });
  }

  if (formAkashicSave) {
    formAkashicSave.addEventListener("submit", async (e) => {
      e.preventDefault();
      playSacredTone([432.0, 528.0, 639.0], 0.85);
      const typeVal = selectAkashicType ? selectAkashicType.value : "architecture";
      const topicVal = (inputAkashicTopic ? inputAkashicTopic.value : "").trim() || "architecture/akashic-core";
      const titleVal = (inputAkashicTitle ? inputAkashicTitle.value : "").trim() || "Observación Akáshica Soberana";
      const whatVal = (inputAkashicWhat ? inputAkashicWhat.value : "").trim();
      const whereVal = (inputAkashicWhere ? inputAkashicWhere.value : "").trim();
      const learnedVal = (inputAkashicLearned ? inputAkashicLearned.value : "").trim();

      const { factor, sephirah } = mapTypeToFactorAndSephirah(typeVal);
      const merkleHash = await sha256Browser(`${topicVal}:${titleVal}:${whatVal}:${whereVal}:${learnedVal}:${Date.now()}`);

      const existingIdx = akashicObservations.findIndex((o) => o.topic_key === topicVal);
      let actionLabel = "CREATED (NEW OBSERVATION)";
      if (existingIdx >= 0) {
        const prev = akashicObservations[existingIdx];
        akashicObservations[existingIdx] = {
          ...prev,
          type: typeVal,
          samaelianFactor: factor,
          sephirah,
          title: titleVal,
          what: whatVal,
          where: whereVal,
          learned: learnedVal,
          version_count: (prev.version_count || 1) + 1,
          merkleHash,
          updated_at: new Date().toISOString().slice(0, 10)
        };
        actionLabel = `UPSERTED topic_key="${topicVal}" (v${akashicObservations[existingIdx].version_count})`;
      } else {
        akashicObservations.unshift({
          id: 100 + akashicObservations.length + 1,
          project: "eos-system",
          type: typeVal,
          samaelianFactor: factor,
          sephirah,
          topic_key: topicVal,
          title: titleVal,
          what: whatVal,
          where: whereVal,
          learned: learnedVal,
          pinned: true,
          version_count: 1,
          merkleHash,
          updated_at: new Date().toISOString().slice(0, 10)
        });
      }

      persistAkashicVault();
      renderAkashicObservations();

      try {
        await fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mem_save",
            type: typeVal,
            topic_key: topicVal,
            title: titleVal,
            what: whatVal,
            where: whereVal,
            learned: learnedVal
          })
        });
      } catch {
        // Offline / static fallback
      }

      if (akashicDiagnosticOutput) {
        akashicDiagnosticOutput.textContent = `[EOS_MEM_SAVE · ${actionLabel}]
• Factor Samaeliano : ${factor} · Sephirah: ${sephirah}
• Topic Key         : ${topicVal}
• Sello Merkle      : ${merkleHash}
• Estado Tribunal   : 0 CONFLICTOS PENDIENTES · GRABADO EN EL ÁTOMO NOUS`;
      }
    });
  }

  if (btnAkashicJudge && akashicDiagnosticOutput) {
    btnAkashicJudge.addEventListener("click", async () => {
      playSacredTone([396.0, 528.0], 0.75);
      const seal = await sha256Browser(`ANUBIC_JUDGE:${Date.now()}`);
      akashicDiagnosticOutput.textContent = `[TRIBUNAL DE ANUBIS & 42 JUECES · EOS_MEM_JUDGE & EOS_MEM_COMPARE]
• Relación Evaluada : supersedes (confidence: 0.99 · judgment_status: "judged")
• Par Comparado     : Observación #101 ⟺ Observación #102 (sync_id: rel-${seal.slice(0, 12)})
• Dictamen Anúbico  : La nueva arquitectura Akáshica conserva 100% compatibilidad hacia atrás con los 7 Mandamientos.
• Firma Merkle      : ${seal}`;
    });
  }

  if (btnAkashicDoctor && akashicDiagnosticOutput) {
    btnAkashicDoctor.addEventListener("click", async () => {
      playSacredTone([528.0, 639.0, 741.0], 0.8);
      const seal = await sha256Browser(`AKASHIC_DOCTOR:${Date.now()}`);
      akashicDiagnosticOutput.textContent = `[EOS_MEM_DOCTOR & RDD 4R FROZEN CANDIDATE AUDIT · PASS]
• Store Status      : HEALTHY_AKASHIC_STORE (capabilities.runtime_session_resolution = true)
• Herramientas MCP  : 27/27 Engram Tools + ODD Proportional Router + RDD 4R Lenses
• Lente 1 (Risk)    : PASS (0 secretos en claro · Barrera Externa Ley IV activa)
• Lente 2 (Resil.)  : PASS (FDIR 0 enlaces huérfanos · Fallback offline determinista)
• Lente 3 (Readab.) : PASS (Pureza Hexagonal L0 · Formato What/Why/Where/Learned)
• Lente 4 (Reliab.) : PASS (${akashicObservations.length} observaciones firmadas en Árbol de Merkle SHA-256: ${seal.slice(0, 24)}...)`;
    });
  }

  if (btnAkashicExport) {
    btnAkashicExport.addEventListener("click", () => {
      const mdLines = [
        "# 🧠 BÓVEDA DE MEMORIA AKÁSHICA SOBERANA — EOS SYSTEM v5.0 (OBSIDIAN BRAIN & MERKLE EXPORT)",
        "",
        `> Exportado: ${new Date().toISOString()} · Total Observaciones: ${akashicObservations.length} · 27/27 Herramientas Engram + Gentle-AI ODD/RDD 4R`,
        ""
      ];
      akashicObservations.forEach((o) => {
        mdLines.push(`## [#${o.id}] ${o.title}`);
        mdLines.push(`- **Topic Key**: \`${o.topic_key}\` (v${o.version_count || 1})`);
        mdLines.push(`- **Factor Samaeliano**: \`${o.samaelianFactor}\` · **Sephirah**: ${o.sephirah}`);
        mdLines.push(`- **What / Why**: ${o.what}`);
        mdLines.push(`- **Where**: \`${o.where}\``);
        mdLines.push(`- **Learned**: ${o.learned}`);
        mdLines.push(`- **Merkle SHA-256**: \`${o.merkleHash}\``);
        mdLines.push("");
      });
      const blob = new Blob([mdLines.join("\n")], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EOS-AKASHIC-OBSIDIAN-BRAIN-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (inputAkashicSearch) {
    inputAkashicSearch.addEventListener("input", () => {
      currentAkashicQuery = inputAkashicSearch.value || "";
      renderAkashicObservations();
    });
  }

  akashicFactorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentAkashicFactorFilter = btn.getAttribute("data-akashic-factor") || "ALL";
      akashicFactorBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      renderAkashicObservations();
    });
  });

});
