import * as fs from 'node:fs';

const htmlPath = 'C:\\Users\\valen\\Eos-System\\index.html';
const jsPath = 'C:\\Users\\valen\\Eos-System\\js\\eos.js';

// 1. Update index.html terminal tabs
let html = fs.readFileSync(htmlPath, 'utf-8');

const targetTab = `<button type="button" role="tab" aria-selected="false" class="cmd-tab" data-cmd="nanosecond:hft">
              9. eos nanosecond --hft
            </button>`;

const newTabs = `<button type="button" role="tab" aria-selected="false" class="cmd-tab" data-cmd="nanosecond:hft">
              9. eos nanosecond --hft
            </button>
            <button type="button" role="tab" aria-selected="false" class="cmd-tab" data-cmd="dualtrack:orchestrator">
              10. eos dual-track
            </button>
            <button type="button" role="tab" aria-selected="false" class="cmd-tab" data-cmd="attestation:chain">
              11. eos attestation --chain
            </button>`;

if (html.includes(targetTab) && !html.includes('data-cmd="dualtrack:orchestrator"')) {
  html = html.replace(targetTab, newTabs);
}

// Update Aberamentho description in fleet section of index.html
html = html.replace(
  '43 Leyendas de la Electrónica, y calibración automotriz Flyme Sound 1,000W 16 parlantes.',
  '47 Leyendas del Trance, Grabador Hi-Fi de Sets en Vivo, Controles al Volante MediaSession, Pioneer CDJ Jog Nudge, Visualizador de Cimática Sagrada (φ=1.618) y calibración Flyme Sound 1,000W.'
);

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('[OK] index.html updated');

// 2. Update js/eos.js with dualtrack and attestation commands
let js = fs.readFileSync(jsPath, 'utf-8');

const dualtrackBlock = `  "dualtrack:orchestrator": \`$ eos dual-track --simulate
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

STATUS: DUAL_TRACK_ACTIVE | HEAVY_TRACK_GOVERNED | EXIT CODE: 0\`,

  "attestation:chain": \`$ eos attestation --chain
> Verifying Cryptographic Attestation Block & Merkle Evidence Chain (docs/evidence/)...

LEDGER BLOCK          RECORD ID         SIGNATURE ALGORITHM    HASH ROOT (SHA-256)                 STATUS
---------------------------------------------------------------------------------------------------------
Genesis Block #0001   EVD-0001-CORE     SHA-256 + Ed25519      4b2c57a0e9c4a81f3b720d49108a7f63... VERIFIED
Milestone Block #0002 EVD-0002-DUALTRK  SHA-256 + Ed25519      8d9726e44b15283a04b15d6e7f8a9b0c... VERIFIED
Fleet Block #0003     EVD-0003-FLEET    SHA-256 + Ed25519      c681c7e95675e02dd7037f814126dec8... VERIFIED
Master Block #0004    EVD-0010-GOLDEN   SHA-256 + Ed25519      55dba803455ed3a86df6dfa932966957... SEALED

[CRYPTOGRAPHIC INTEGRITY] Tamper Evidence: 0 MUTATIONS | Chain Valid: 100% | Epistemic State: VERIFIED\`,

`;

if (!js.includes('"dualtrack:orchestrator"')) {
  js = js.replace('const CLI_OUTPUTS = {', `const CLI_OUTPUTS = {\n${dualtrackBlock}`);
}

// Update fleet:status in js/eos.js
js = js.replace(
  '2  Aberamentho / Pleroma Music (8 Lists)   GOLDEN_SEAL_LOCKED (DSP 10/10)     VERIFIED 10/10      200 OK',
  '2  Aberamentho / Pleroma Music (8 Lists)   GOLDEN_SEAL_LOCKED (DSP 10/10)     VERIFIED 10/10 (47 LEYENDAS · HI-FI SET REC · MEDIASESSION) 200 OK'
);

js = js.replace(
  '3  Portafolio — Valentín Flórez            SPORADIC_CONTINUOUS_10X10          PRODUCTION_READY    200 OK',
  '3  Portafolio — Valentín Flórez            SPORADIC_CONTINUOUS_10X10          PRODUCTION_READY (EOS 2.1 TELEMETRY SYNCED)                 200 OK'
);

// Update aberamentho:dsp in js/eos.js with latest 10/10 God-Tier features
js = js.replace(
  '8 Spotify Playlists + 43 Legends',
  '8 Spotify Playlists + 47 Legends · Hi-Fi Set Rec · MediaSession Car Controls · Pioneer Jog Nudge · Sacred Cymatics'
);

fs.writeFileSync(jsPath, js, 'utf-8');
console.log('[OK] js/eos.js updated');
