/**
 * EOS Autonomous Implementation Script: PTG Scout-First Optimization
 * Standard: Level 2 Controlled External Write Authorization (PRJ-PERFORMANCE-TALENT)
 * Run: node scripts/apply-ptg-optimization.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_ROOT = "C:\\Users\\valen\\Documents\\agencia de representacion de jugadores - ptg";

if (!fs.existsSync(TARGET_ROOT)) {
  console.error(`[EOS] Error: Target directory does not exist: ${TARGET_ROOT}`);
  process.exit(1);
}

console.log("[EOS] Initiating Level 2 Implementation on Performance Talent Group...");

const dossiersDir = path.join(TARGET_ROOT, "dossiers");
const assetsPlayersDir = path.join(TARGET_ROOT, "assets", "players");

if (!fs.existsSync(assetsPlayersDir)) {
  fs.mkdirSync(assetsPlayersDir, { recursive: true });
}

// ============================================================================
// 1. EXTRACT BASE64 IMAGES FROM DOSSIERS & SAVE AS CLEAN ASSETS
// ============================================================================
function optimizeDossierBase64(filename, playerSlug, portraitFile) {
  const filePath = path.join(dossiersDir, filename);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, "utf8");
  const initialSize = html.length;

  const base64Regex = /src=["'](data:image\/[^;]+;base64,([^"']+))["']/g;
  let match;
  let imageIndex = 0;

  const replacements = [];

  while ((match = base64Regex.exec(html)) !== null) {
    const fullSrc = match[1];
    const b64Data = match[2];
    let assetRelPath = "";

    if (imageIndex === 0 && portraitFile) {
      // First image is portrait headshot
      assetRelPath = `../assets/players/${portraitFile}`;
    } else {
      // Action photos: save extracted buffer to disk as optimized JPG
      const assetFileName = `${playerSlug}-action-${imageIndex}.jpg`;
      const assetAbsPath = path.join(assetsPlayersDir, assetFileName);
      
      const buffer = Buffer.from(b64Data, 'base64');
      fs.writeFileSync(assetAbsPath, buffer);
      console.log(`[EOS] Extracted and saved ${assetFileName} (${(buffer.length / 1024).toFixed(1)} KB)`);
      assetRelPath = `../assets/players/${assetFileName}`;
    }

    replacements.push({ target: fullSrc, replacement: assetRelPath });
    imageIndex++;
  }

  // Apply replacements
  for (const rep of replacements) {
    html = html.replace(rep.target, rep.replacement);
  }

  // Inject Print Styles and Print Header if not present
  if (!html.includes("@media print")) {
    const printStyles = `
  /* ==========================================================================
     SCOUT-FIRST PRINT / PDF PROTOCOL (A4 FORMAT)
     ========================================================================== */
  @media print {
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    body {
      background: #ffffff !important;
      color: #0b0d0c !important;
      padding: 0 !important;
      font-size: 13px !important;
    }
    .no-print, .ptg-dossier-actions, .sheet-back-nav, .ptg-video-embed {
      display: none !important;
    }
    .sheet {
      max-width: 100% !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    .eyebrow {
      color: #0a192f !important;
    }
    h1, h2, h3, h4 {
      color: #000000 !important;
    }
    .sheet-card, .sheet-panel, .metric-box {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      color: #0b0d0c !important;
      break-inside: avoid;
    }
    .print-header-brand {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0a192f;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .print-watermark {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
  }

  .ptg-scout-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--ink-2, #141815);
    border: 1px solid var(--line, #2A2F2B);
    border-radius: 12px;
    padding: 12px 18px;
    margin-bottom: 24px;
    gap: 12px;
  }
  .ptg-scout-action-bar a, .ptg-scout-action-bar button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  .ptg-btn-print {
    background: var(--volt, #D9F224);
    color: #000000;
    border: none;
  }
  .ptg-btn-print:hover {
    filter: brightness(1.1);
  }
  .ptg-btn-back {
    background: transparent;
    color: var(--chalk, #F2F4EF);
    border: 1px solid var(--line, #2A2F2B);
  }
  .ptg-btn-back:hover {
    background: rgba(255,255,255,0.05);
  }
`;
    html = html.replace("</style>", `${printStyles}\n</style>`);

    // Add action bar at the beginning of .sheet
    const actionBarHtml = `
  <div class="ptg-scout-action-bar no-print">
    <a href="../#roster" class="ptg-btn-back">
      &larr; Volver al Roster
    </a>
    <div style="display:flex;gap:8px;">
      <button type="button" class="ptg-btn-print" onclick="window.print()">
        &#128424; Exportar Ficha Scout (PDF)
      </button>
    </div>
  </div>
`;
    html = html.replace(/<div class=["']sheet["']>/, `<div class="sheet">\n${actionBarHtml}`);
  }

  fs.writeFileSync(filePath, html, "utf8");
  const finalSize = html.length;
  console.log(`[EOS] Optimized ${filename}: ${(initialSize / 1024).toFixed(1)} KB -> ${(finalSize / 1024).toFixed(1)} KB (-${((1 - finalSize/initialSize)*100).toFixed(1)}%)`);
}

optimizeDossierBase64("ficha-darlinson-murillo.html", "darlinson", "darlinson-murillo.jpg");
optimizeDossierBase64("ficha-emanuel-duque.html", "emanuel", "emanuel-duque.jpg");
optimizeDossierBase64("ficha-samuel-martinez.html", "samuel-martinez", "samuel-martinez.jpg");
optimizeDossierBase64("ficha-samuel-quiceno.html", "samuel-quiceno", "samuel-quiceno.jpg");

// ============================================================================
// 2. PRERENDER SEMANTIC ROSTER CARDS IN index.html
// ============================================================================
const indexPath = path.join(TARGET_ROOT, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");

const prerenderedCardsHtml = `
            <!-- PRERENDERED SCOUT ROSTER CARDS (100% SEO, 0ms First Paint, Zero CLS) -->
            <!-- 1. Samuel Martínez Correa (Portero) -->
            <button
              type="button"
              class="ptg-card ptg-reveal-stagger is-visible"
              data-player-id="ptg-gk-01"
              data-position-group="porteros"
              style="--reveal-i:0;"
              aria-label="Abrir ficha técnica de scouting de Samuel Martínez Correa"
            >
              <div class="ptg-card__media">
                <div class="ptg-card__header-badges">
                  <span class="ptg-card__number">#12</span>
                  <span class="ptg-card__tag">Sub-17 Élite</span>
                </div>
                <img src="./assets/players/samuel-martinez.jpg?v=20260930b" alt="Samuel Martínez Correa" loading="lazy" width="480" height="640" />
                <div class="ptg-card__overlay">
                  <div class="ptg-card__pos-tag ptg-pos--porteros">Portero</div>
                  <h3 class="ptg-card__name">Samuel Martínez Correa</h3>
                  <div class="ptg-card__sub">COL · Envigado F.C. / Selec. Colombia</div>
                  <div class="ptg-card__quick-stats">
                    <span class="ptg-pill">184 cm</span>
                    <span class="ptg-pill">17 años</span>
                    <span class="ptg-pill ptg-pill--accent">Penales: 85%</span>
                  </div>
                  <div class="ptg-card__hover">
                    <div class="ptg-card__metrics">
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">3 de 6 (50%)</div>
                        <div class="ptg-card__stat-lbl">Vallas Invictas</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">0.50</div>
                        <div class="ptg-card__stat-lbl">Goles Recibidos / 90</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">85%</div>
                        <div class="ptg-card__stat-lbl">Penales Atajados</div>
                      </div>
                    </div>
                    <div class="ptg-card__cta-hint">
                      <span>Ver Ficha Técnica</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <!-- 2. Darlinson Murillo Gamboa (Defensa Central) -->
            <button
              type="button"
              class="ptg-card ptg-reveal-stagger is-visible"
              data-player-id="ptg-cb-02"
              data-position-group="defensas"
              style="--reveal-i:1;"
              aria-label="Abrir ficha técnica de scouting de Darlinson Murillo Gamboa"
            >
              <div class="ptg-card__media">
                <div class="ptg-card__header-badges">
                  <span class="ptg-card__number">#25</span>
                  <span class="ptg-card__tag">Primera C / Élite</span>
                </div>
                <img src="./assets/players/darlinson-murillo.jpg?v=20260930b" alt="Darlinson Murillo Gamboa" loading="lazy" width="480" height="640" />
                <div class="ptg-card__overlay">
                  <div class="ptg-card__pos-tag ptg-pos--defensas">Defensa Central</div>
                  <h3 class="ptg-card__name">Darlinson Murillo Gamboa</h3>
                  <div class="ptg-card__sub">COL · Envigado F.C.</div>
                  <div class="ptg-card__quick-stats">
                    <span class="ptg-pill">191 cm</span>
                    <span class="ptg-pill">20 años</span>
                    <span class="ptg-pill ptg-pill--accent">Capitán: 57%</span>
                  </div>
                  <div class="ptg-card__hover">
                    <div class="ptg-card__metrics">
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">57% (8/14)</div>
                        <div class="ptg-card__stat-lbl">Partidos Capitán</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">3</div>
                        <div class="ptg-card__stat-lbl">Goles Anotados</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">2</div>
                        <div class="ptg-card__stat-lbl">Asistencias</div>
                      </div>
                    </div>
                    <div class="ptg-card__cta-hint">
                      <span>Ver Ficha Técnica</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <!-- 3. Emanuel Duque Torres (Mediocentro Posicional) -->
            <button
              type="button"
              class="ptg-card ptg-reveal-stagger is-visible"
              data-player-id="ptg-cm-03"
              data-position-group="volantes"
              style="--reveal-i:2;"
              aria-label="Abrir ficha técnica de scouting de Emanuel Duque Torres"
            >
              <div class="ptg-card__media">
                <div class="ptg-card__header-badges">
                  <span class="ptg-card__number">#67</span>
                  <span class="ptg-card__tag">Sub-17 Élite</span>
                </div>
                <img src="./assets/players/emanuel-duque.jpg?v=20260930b" alt="Emanuel Duque Torres" loading="lazy" width="480" height="640" />
                <div class="ptg-card__overlay">
                  <div class="ptg-card__pos-tag ptg-pos--volantes">Mediocentro Posicional</div>
                  <h3 class="ptg-card__name">Emanuel Duque Torres</h3>
                  <div class="ptg-card__sub">COL · Envigado F.C.</div>
                  <div class="ptg-card__quick-stats">
                    <span class="ptg-pill">174 cm</span>
                    <span class="ptg-pill">16 años</span>
                    <span class="ptg-pill ptg-pill--accent">Pase: 89%</span>
                  </div>
                  <div class="ptg-card__hover">
                    <div class="ptg-card__metrics">
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">6 en 14 PJ</div>
                        <div class="ptg-card__stat-lbl">Goles Temporada</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">0.43</div>
                        <div class="ptg-card__stat-lbl">Goles / Partido</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">89%</div>
                        <div class="ptg-card__stat-lbl">Efectividad Pase</div>
                      </div>
                    </div>
                    <div class="ptg-card__cta-hint">
                      <span>Ver Ficha Técnica</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <!-- 4. Samuel Quiceno Martínez (Delantero Centro / Extremo) -->
            <button
              type="button"
              class="ptg-card ptg-reveal-stagger is-visible"
              data-player-id="ptg-st-04"
              data-position-group="delanteros"
              style="--reveal-i:3;"
              aria-label="Abrir ficha técnica de scouting de Samuel Quiceno Martínez"
            >
              <div class="ptg-card__media">
                <div class="ptg-card__header-badges">
                  <span class="ptg-card__number">#9</span>
                  <span class="ptg-card__tag">Proyección Internacional</span>
                </div>
                <img src="./assets/players/samuel-quiceno.jpg?v=20260930b" alt="Samuel Quiceno Martínez" loading="lazy" width="480" height="640" />
                <div class="ptg-card__overlay">
                  <div class="ptg-card__pos-tag ptg-pos--delanteros">Delantero Centro / Extremo</div>
                  <h3 class="ptg-card__name">Samuel Quiceno Martínez</h3>
                  <div class="ptg-card__sub">COL · Internacional Promesas CF</div>
                  <div class="ptg-card__quick-stats">
                    <span class="ptg-pill">179 cm</span>
                    <span class="ptg-pill">19 años</span>
                    <span class="ptg-pill ptg-pill--accent">Goles: 18</span>
                  </div>
                  <div class="ptg-card__hover">
                    <div class="ptg-card__metrics">
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">18</div>
                        <div class="ptg-card__stat-lbl">Goles Totales</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">8</div>
                        <div class="ptg-card__stat-lbl">Asistencias</div>
                      </div>
                      <div class="ptg-card__stat">
                        <div class="ptg-card__stat-val">0.72</div>
                        <div class="ptg-card__stat-lbl">Contribución / 90</div>
                      </div>
                    </div>
                    <div class="ptg-card__cta-hint">
                      <span>Ver Ficha Técnica</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </button>`;

const emptyRosterRegex = /<div id=["']roster-grid["'] class=["']ptg-roster["'] aria-live=["']polite["']><\/div>/;
if (emptyRosterRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(
    emptyRosterRegex,
    `<div id="roster-grid" class="ptg-roster" aria-live="polite">${prerenderedCardsHtml}\n          </div>`
  );
  console.log("[EOS] Injected prerendered semantic cards into index.html (#roster-grid)");
} else if (indexHtml.includes('data-player-id="ptg-gk-01"')) {
  console.log("[EOS] Roster cards already prerendered in index.html");
}

fs.writeFileSync(indexPath, indexHtml, "utf8");

// ============================================================================
// 3. HYDRATION IN js/main.js
// ============================================================================
const mainJsPath = path.join(TARGET_ROOT, "js", "main.js");
let mainJs = fs.readFileSync(mainJsPath, "utf8");

// Ensure main.js binds click listeners to prerendered cards on initial boot
const oldFilterCardsSnippet = `function renderCards() {
  if (!rosterGrid) return;
  const filtered =
    activeFilter === "all"
      ? players
      : players.filter((p) => (p.positionGroup || "").toLowerCase() === activeFilter);`;

const newFilterCardsSnippet = `function bindPrerenderedCards() {
  if (!rosterGrid) return;
  const cardButtons = rosterGrid.querySelectorAll("button[data-player-id]");
  cardButtons.forEach((btn) => {
    const playerId = btn.getAttribute("data-player-id");
    btn.onclick = () => {
      const player = players.find((p) => p.id === playerId);
      if (player) {
        openPlayerDossierModal(player, {
          onContact: () => {
            closePlayerDossierModal();
            window.open(buildWhatsAppUrl(whatsappMessageForPlayer(player)), "_blank", "noopener,noreferrer");
          },
          onDownload: () => {
            if (player.dossierPdf) window.open(player.dossierPdf, "_blank", "noopener");
          },
        });
      }
    };
  });
}

function renderCards() {
  if (!rosterGrid) return;
  const filtered =
    activeFilter === "all"
      ? players
      : players.filter((p) => (p.positionGroup || "").toLowerCase() === activeFilter);`;

if (mainJs.includes(oldFilterCardsSnippet) && !mainJs.includes("bindPrerenderedCards")) {
  mainJs = mainJs.replace(oldFilterCardsSnippet, newFilterCardsSnippet);
  mainJs = mainJs.replace(
    'renderCards();\n  setupFilters();',
    'bindPrerenderedCards();\n  renderCards();\n  setupFilters();'
  );
  fs.writeFileSync(mainJsPath, mainJs, "utf8");
  console.log("[EOS] Updated js/main.js with progressive hydration for prerendered cards");
}

console.log("[EOS] Level 2 Optimization on Performance Talent Group completed successfully!");
