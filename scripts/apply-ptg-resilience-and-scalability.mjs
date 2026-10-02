/**
 * EOS Autonomous Implementation Script: PTG Resilience & Scalability Engine
 * Standard: Level 2 Controlled External Write Authorization (PRJ-PERFORMANCE-TALENT)
 * Run: node scripts/apply-ptg-resilience-and-scalability.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_ROOT = "C:\\Users\\valen\\Documents\\agencia de representacion de jugadores - ptg";

if (!fs.existsSync(TARGET_ROOT)) {
  console.error(`[EOS] Error: Target directory does not exist: ${TARGET_ROOT}`);
  process.exit(1);
}

console.log("[EOS] Initiating Resilience & Scalability Architecture on PTG...");

// ============================================================================
// 1. CREATE DATA/ANNOUNCEMENTS.JSON (BOARD & CORPORATE UPDATES ARCHITECTURE)
// ============================================================================
const announcementsPath = path.join(TARGET_ROOT, "data", "announcements.json");
const announcementsData = {
  "_meta": {
    "agency": "Performance Talent Group S.A.S.",
    "version": "2026.1",
    "description": "Novedades institucionales, acuerdos de junta directiva, convocatorias de jugadores e hitos deportivos oficiales."
  },
  "announcements": [
    {
      "id": "ann-2026-01",
      "date": "2026-09-28",
      "category": "Selección Nacional",
      "title": "Samuel Martínez convocado a Microciclos de Selección Colombia Sub-17",
      "summary": "El portero titular de Envigado F.C. y prospecto élite de PTG se integra a la concentración oficial de la FCF rumbo a la preparación mundialista.",
      "tag": "Convocatoria FCF",
      "badge": "Sub-17 Élite",
      "link": "#roster",
      "playerSlug": "samuel-martinez-correa"
    },
    {
      "id": "ann-2026-02",
      "date": "2026-09-15",
      "category": "Gobierno Corporativo",
      "title": "Junta Directiva: Blindaje Legal FIFA y Expansión a Europa y MLS",
      "summary": "PTG consolida alianzas directas con secretarías técnicas internacionales bajo la dirección jurídica del Abogado Especialista FIFA Andrés Isaza Olarte.",
      "tag": "Junta Directiva",
      "badge": "Licencia FIFA",
      "link": "#empresa",
      "playerSlug": null
    },
    {
      "id": "ann-2026-03",
      "date": "2026-09-02",
      "category": "Rendimiento Competitivo",
      "title": "Darlinson Murillo consolida capitanía y liderazgo en zaga central",
      "summary": "Con 1.91m de estatura y 57% de capitanías en Primera C (8/14 PJ), el defensor chocoano ratifica su proyección inmediata a fútbol profesional.",
      "tag": "Rendimiento Élite",
      "badge": "Capitán 191cm",
      "link": "#roster",
      "playerSlug": "darlinson-murillo-gamboa"
    }
  ]
};

fs.writeFileSync(announcementsPath, JSON.stringify(announcementsData, null, 2), "utf8");
console.log("[EOS] Created data/announcements.json with corporate updates structure.");

// ============================================================================
// 2. CREATE MANIFEST.WEBMANIFEST (PWA SCOUT-FIRST STANDALONE)
// ============================================================================
const manifestPath = path.join(TARGET_ROOT, "manifest.webmanifest");
const manifestData = {
  "name": "Performance Talent Group · Scouting & Sports Representation",
  "short_name": "PTG Sports",
  "description": "Agencia boutique de representación deportiva de élite con Licencia Oficial FIFA. Dossiers técnicos, radar biométrico y gestión integral de futbolistas.",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#06090e",
  "theme_color": "#06090e",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "./assets/brand/ptg-logo.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./assets/brand/ptg-logo.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
};

fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf8");
console.log("[EOS] Created manifest.webmanifest for PWA capability.");

// ============================================================================
// 3. CREATE SW.JS (SERVICE WORKER FOR STADIUM OFFLINE RESILIENCE)
// ============================================================================
const swPath = path.join(TARGET_ROOT, "sw.js");
const swCode = `/**
 * PTG Service Worker — Stadium Offline Resilience & Asset Caching
 * Ensures scouts can inspect player dossiers even with zero network coverage.
 */

const CACHE_NAME = "ptg-scout-v2026.1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/theme.css",
  "./css/layout.css",
  "./css/components/player-dossier.css",
  "./css/components/brand-mark.css",
  "./css/components/apple-sections.css",
  "./js/main.js",
  "./js/i18n.js",
  "./js/contact.js",
  "./js/brand-mark.js",
  "./js/player-dossier.js",
  "./data/players.demo.json",
  "./data/announcements.json",
  "./assets/brand/ptg-logo.png",
  "./assets/players/samuel-martinez.jpg",
  "./assets/players/darlinson-murillo.jpg",
  "./assets/players/emanuel-duque.jpg",
  "./assets/players/samuel-quiceno.jpg",
  "./dossiers/ficha-samuel-martinez.html",
  "./dossiers/ficha-darlinson-murillo.html",
  "./dossiers/ficha-emanuel-duque.html",
  "./dossiers/ficha-samuel-quiceno.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[PTG-SW] Pre-caching non-fatal item failure", err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Network-first for dynamic player / announcements data
  if (url.pathname.includes("/data/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first with stale-while-revalidate for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
`;

fs.writeFileSync(swPath, swCode, "utf8");
console.log("[EOS] Created sw.js for offline stadium resilience.");

// ============================================================================
// 4. UPDATE JS/I18N.JS WITH BILINGUAL KEYS FOR SEARCH, BOARD & DEEP LINKING
// ============================================================================
const i18nPath = path.join(TARGET_ROOT, "js", "i18n.js");
let i18nCode = fs.readFileSync(i18nPath, "utf8");

// Check if search keys already exist
if (!i18nCode.includes("scoutSearchPlaceholder")) {
  const esInsertMarker = `    builderEyebrow: "Directores Deportivos & Ojeadores",`;
  const esNewKeys = `    // Scout Search & Dynamic Filtering
    scoutSearchPlaceholder: "Buscar por nombre, club, demarcación o categoría...",
    noPlayersFound: "No se encontraron prospectos que coincidan con la búsqueda.",
    contactCustomScout: "Solicitar Scouting de Perfil Personalizado por WhatsApp",
    clearSearch: "Limpiar filtros",
    shareDossier: "Compartir Ficha",
    dossierCopied: "¡Enlace directo al perfil copiado al portapapeles!",
    offlineReadyBadge: "Modo Offline Activo",

    // Board & Corporate Updates
    announcementsEyebrow: "Gobierno Corporativo & Hitos",
    announcementsTitle: "Novedades de Junta & Convocatorias",
    announcementsLead: "Seguimiento institucional de acuerdos directivos, avances contractuales y actividad competitiva oficial de nuestros atletas.",
    viewMilestone: "Ver Hito",
    corporateBoard: "Junta Directiva",\n`;

  i18nCode = i18nCode.replace(esInsertMarker, esNewKeys + esInsertMarker);

  const enInsertMarker = `    builderEyebrow: "Sporting Directors & Scouts",`;
  const enNewKeys = `    // Scout Search & Dynamic Filtering
    scoutSearchPlaceholder: "Search by player name, club, position, or category...",
    noPlayersFound: "No prospects found matching your search criteria.",
    contactCustomScout: "Request Bespoke Scouting Profile via WhatsApp",
    clearSearch: "Clear search filters",
    shareDossier: "Share Dossier",
    dossierCopied: "Direct profile link copied to clipboard!",
    offlineReadyBadge: "Offline Stadium Mode Active",

    // Board & Corporate Updates
    announcementsEyebrow: "Corporate Governance & Milestones",
    announcementsTitle: "Board Updates & Call-ups",
    announcementsLead: "Institutional tracking of board resolutions, contractual developments, and official competitive performance.",
    viewMilestone: "View Milestone",
    corporateBoard: "Executive Board",\n`;

  i18nCode = i18nCode.replace(enInsertMarker, enNewKeys + enInsertMarker);

  fs.writeFileSync(i18nPath, i18nCode, "utf8");
  console.log("[EOS] Injected bilingual keys into js/i18n.js.");
}

// ============================================================================
// 5. UPDATE CSS/LAYOUT.CSS WITH STYLES FOR SEARCH BAR & ANNOUNCEMENTS
// ============================================================================
const layoutCssPath = path.join(TARGET_ROOT, "css", "layout.css");
let layoutCss = fs.readFileSync(layoutCssPath, "utf8");

if (!layoutCss.includes(".ptg-scout-search")) {
  const extraStyles = `
/* ==========================================================================
   PTG SCOUT SEARCH & BOARD ANNOUNCEMENTS (EOS SCALABILITY ENGINE)
   ========================================================================== */
.ptg-search-filter-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.ptg-scout-search-wrap {
  position: relative;
  max-width: 580px;
  width: 100%;
  margin: 0 auto;
}

.ptg-scout-search-icon {
  position: absolute;
  left: 1.1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ptg-muted);
  pointer-events: none;
  transition: color 0.2s ease;
}

.ptg-scout-search-input {
  width: 100%;
  padding: 0.9rem 2.8rem 0.9rem 2.9rem;
  background: var(--ptg-surface-card);
  border: 1px solid var(--ptg-border-subtle);
  border-radius: var(--radius-pill);
  color: var(--ptg-text);
  font-family: var(--font-body);
  font-size: 0.92rem;
  outline: none;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ptg-scout-search-input:focus {
  border-color: var(--ptg-lime);
  box-shadow: 0 0 0 3px rgba(184, 255, 44, 0.15);
}

.ptg-scout-search-input:focus + .ptg-scout-search-icon {
  color: var(--ptg-lime);
}

.ptg-scout-search-clear {
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ptg-text);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  transition: background 0.2s ease;
}

.ptg-scout-search-clear:hover {
  background: var(--ptg-lime);
  color: var(--ptg-surface-black);
}

.ptg-empty-roster {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3.5rem 1.5rem;
  background: var(--ptg-surface-card);
  border: 1px dashed var(--ptg-border-subtle);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.ptg-empty-roster p {
  color: var(--ptg-muted);
  font-size: 1rem;
  max-width: 480px;
}

/* Board Announcements Section */
.ptg-announcements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.ptg-announcement-card {
  background: var(--ptg-surface-card);
  border: 1px solid var(--ptg-border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
}

.ptg-announcement-card:hover {
  transform: translateY(-4px);
  border-color: rgba(184, 255, 44, 0.4);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
}

.ptg-announcement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.ptg-announcement-tag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ptg-lime);
  background: rgba(184, 255, 44, 0.1);
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-pill);
}

.ptg-announcement-date {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--ptg-muted);
}

.ptg-announcement-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--ptg-text);
  margin-bottom: 0.65rem;
}

.ptg-announcement-summary {
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--ptg-muted);
  margin-bottom: 1.25rem;
  flex-grow: 1;
}

.ptg-announcement-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--ptg-border-subtle);
}

.ptg-announcement-badge {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--ptg-cyan);
}

.ptg-announcement-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ptg-lime);
  text-decoration: none;
  transition: gap 0.2s ease;
}

.ptg-announcement-link:hover {
  gap: 0.65rem;
}
`;
  layoutCss += extraStyles;
  fs.writeFileSync(layoutCssPath, layoutCss, "utf8");
  console.log("[EOS] Appended search & board announcement styles to css/layout.css.");
}

// ============================================================================
// 6. UPDATE JS/MAIN.JS WITH SEARCH, DEEP LINKING, SW & RESILIENCE
// ============================================================================
const mainJsPath = path.join(TARGET_ROOT, "js", "main.js");
let mainJs = fs.readFileSync(mainJsPath, "utf8");

// Replace top roster state declarations
const oldStateRegex = /const rosterGrid = document\.getElementById\("roster-grid"\);[\s\S]*?let activeFilter = "all";/;
const newStateSnippet = `// Roster state
const rosterGrid = document.getElementById("roster-grid");
const chips = document.querySelectorAll(".ptg-filters [data-filter]");
const scoutSearchInput = document.getElementById("ptg-scout-search");
const scoutSearchClear = document.getElementById("ptg-search-clear");
let players = [];
let activeFilter = "all";
let searchQuery = "";`;

if (oldStateRegex.test(mainJs)) {
  mainJs = mainJs.replace(oldStateRegex, newStateSnippet);
}

// New renderCards implementation
const newRenderCards = `function renderCards() {
  if (!rosterGrid) return;
  
  const query = searchQuery.trim().toLowerCase();
  
  const filtered = players.filter((player) => {
    const matchesFilter =
      activeFilter === "all" ||
      (player.positionGroup || "").toLowerCase() === activeFilter;
      
    if (!matchesFilter) return false;
    if (!query) return true;
    
    const nameMatch = (player.name || "").toLowerCase().includes(query);
    const posMatch = (player.position || "").toLowerCase().includes(query);
    const clubMatch = (player.club || "").toLowerCase().includes(query);
    const catMatch = (player.category || "").toLowerCase().includes(query);
    const natMatch = (player.nationality || "").toLowerCase().includes(query);
    
    return nameMatch || posMatch || clubMatch || catMatch || natMatch;
  });

  if (!filtered.length) {
    rosterGrid.innerHTML = \`
      <div class="ptg-empty-roster ptg-reveal is-visible">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ptg-lime);margin-bottom:0.5rem;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <p>\${t("noPlayersFound") || "No se encontraron prospectos que coincidan con la búsqueda."}</p>
        <button type="button" class="ptg-btn ptg-btn--lime" id="empty-wa-btn">
          \${t("contactCustomScout") || "Solicitar Scouting de Perfil por WhatsApp"}
        </button>
      </div>
    \`;
    const emptyWaBtn = document.getElementById("empty-wa-btn");
    if (emptyWaBtn) {
      emptyWaBtn.addEventListener("click", () => {
        const msg = "Hola PTG. Solicito scouting institucional para un perfil específico que no encontré en el roster actual.";
        window.open(buildWhatsAppUrl(msg), "_blank", "noopener,noreferrer");
      });
    }
    return;
  }

  rosterGrid.replaceChildren(
    ...filtered.map((player, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ptg-card ptg-reveal-stagger is-visible";
      btn.style.setProperty("--reveal-i", String(index % 6));
      btn.setAttribute("aria-label", \`Abrir ficha técnica de scouting de \${player.name}\`);
      btn.setAttribute("data-player-slug", player.slug || "");

      const category = player.category ?? "Élite";
      const posTranslated = translateTerm(player.position);
      const photoSrc = player.photo ? (player.photo.includes("?") ? player.photo : player.photo + "?v=20260930b") : "";

      btn.innerHTML = \`
        <div class="ptg-card__media">
          <div class="ptg-card__header-badges">
            <span class="ptg-card__number">#\${player.number ?? "—"}</span>
            <span class="ptg-card__tag">\${category}</span>
          </div>
          \${
            photoSrc
              ? \`<img src="\${photoSrc}" alt="\${player.name}" loading="lazy" width="480" height="640" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="ptg-card__placeholder" style="display:none;">
                   \${getAthleteSilhouetteSvg()}
                 </div>\`
              : \`
                <div class="ptg-card__placeholder">
                  \${getAthleteSilhouetteSvg()}
                  <div style="margin-top:0.85rem;font-family:var(--font-mono);font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ptg-lime);text-align:center">
                    \${t("prospectBadge")}
                  </div>
                </div>\`
          }
          <div class="ptg-card__overlay">
            <div class="ptg-card__pos-tag ptg-pos--\${(player.positionGroup || 'defensas').toLowerCase()}">\${posTranslated}</div>
            <h3 class="ptg-card__name">\${player.name}</h3>
            <div class="ptg-card__sub">\${player.nationalityCode ?? "COL"} · \${player.club ?? "PTG Core"}</div>
            <div class="ptg-card__quick-stats">
              <span class="ptg-pill">\${player.bio?.heightCm ?? 185} cm</span>
              <span class="ptg-pill">\${player.bio?.age ?? 21} años</span>
              <span class="ptg-pill ptg-pill--accent">\${Object.values(player.metrics || {})[0] || 'TOP TIER'}</span>
            </div>
            <div class="ptg-card__hover">
              \${metricPreviewCards(player.metrics)}
              <div class="ptg-card__cta-hint">
                <span>\${t("viewDossier")}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </div>
        </div>
      \`;

      btn.addEventListener("click", () => handlePlayerModalOpen(player));
      return btn;
    })
  );
}`;

const renderCardsRegex = /function renderCards\(\) \{[\s\S]*?return btn;\s*\}\)\s*\);\s*\}/;
if (renderCardsRegex.test(mainJs)) {
  mainJs = mainJs.replace(renderCardsRegex, newRenderCards);
}

// Modal open handler with URL deep linking synchronization
const deepLinkHandlerSnippet = `
function handlePlayerModalOpen(player) {
  // Update URL deep link without page reload
  if (player && player.slug) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("player", player.slug);
      window.history.replaceState({ playerSlug: player.slug }, "", url.toString());
    } catch (_) {}
  }

  openPlayerDossierModal(player, {
    onClose: () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("player");
        window.history.replaceState({}, "", url.pathname + url.hash);
      } catch (_) {}
    },
    onContact: () => {
      closePlayerDossierModal();
      window.open(
        buildWhatsAppUrl(whatsappMessageForPlayer(player)),
        "_blank",
        "noopener,noreferrer"
      );
    },
    onDownload: () => {
      if (player.dossierPdf) {
        window.open(player.dossierPdf, "_blank", "noopener");
        return;
      }
      window.open(
        buildWhatsAppUrl(
          whatsappMessageForPlayer(player) +
            "\\n\\n(Solicito el dossier técnico extendido en formato PDF para análisis de secretaría técnica.)"
        ),
        "_blank",
        "noopener,noreferrer"
      );
    },
  });
}

// Deep Linking Check on Initial Load
function checkDeepLinkPlayer() {
  try {
    const params = new URLSearchParams(window.location.search);
    const playerSlug = params.get("player");
    if (!playerSlug) return;
    const targetPlayer = players.find(p => p.slug === playerSlug || p.id === playerSlug);
    if (targetPlayer) {
      setTimeout(() => {
        handlePlayerModalOpen(targetPlayer);
      }, 350);
    }
  } catch (_) {}
}

// Setup Scout Search Listeners
if (scoutSearchInput) {
  scoutSearchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    if (scoutSearchClear) {
      scoutSearchClear.style.display = searchQuery ? "flex" : "none";
    }
    renderCards();
  });
}

if (scoutSearchClear) {
  scoutSearchClear.addEventListener("click", () => {
    if (scoutSearchInput) {
      scoutSearchInput.value = "";
      scoutSearchInput.focus();
    }
    searchQuery = "";
    scoutSearchClear.style.display = "none";
    renderCards();
  });
}

// Service Worker Registration for Stadium Offline Resilience
if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// Load and Render Board Announcements
async function loadAnnouncements() {
  const container = document.getElementById("board-announcements-grid");
  if (!container) return;
  try {
    const res = await fetch("./data/announcements.json?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const items = data.announcements || [];
    if (!items.length) return;

    container.innerHTML = items.map(ann => \`
      <article class="ptg-announcement-card ptg-reveal-stagger is-visible">
        <div>
          <div class="ptg-announcement-header">
            <span class="ptg-announcement-tag">\${ann.tag || "Oficial"}</span>
            <time class="ptg-announcement-date" datetime="\${ann.date}">\${ann.date}</time>
          </div>
          <h3 class="ptg-announcement-title">\${ann.title}</h3>
          <p class="ptg-announcement-summary">\${ann.summary}</p>
        </div>
        <div class="ptg-announcement-footer">
          <span class="ptg-announcement-badge">\${ann.badge || "PTG"}</span>
          <a href="\${ann.link || '#roster'}" class="ptg-announcement-link" \${ann.playerSlug ? \`data-open-player="\${ann.playerSlug}"\` : ""}>
            <span>\${t("viewMilestone") || "Ver Hito"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </article>
    \`).join("");

    container.querySelectorAll("[data-open-player]").forEach(link => {
      link.addEventListener("click", (e) => {
        const slug = link.getAttribute("data-open-player");
        const pl = players.find(p => p.slug === slug);
        if (pl) {
          e.preventDefault();
          handlePlayerModalOpen(pl);
        }
      });
    });
  } catch (err) {
    console.warn("Novedades institucionales no disponibles en este momento", err);
  }
}
`;

if (!mainJs.includes("handlePlayerModalOpen")) {
  mainJs = mainJs.replace("renderCards();", "renderCards();\n  loadAnnouncements();\n  checkDeepLinkPlayer();");
  mainJs += deepLinkHandlerSnippet;
  fs.writeFileSync(mainJsPath, mainJs, "utf8");
  console.log("[EOS] Injected search, deep linking, SW registration and announcements in js/main.js.");
}

// ============================================================================
// 7. UPDATE INDEX.HTML (PWA HEAD, SCHEMA.ORG RICH SNIPPETS, SEARCH & BOARD SECTION)
// ============================================================================
const indexHtmlPath = path.join(TARGET_ROOT, "index.html");
let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

// Add manifest link in head
if (!indexHtml.includes('rel="manifest"')) {
  indexHtml = indexHtml.replace('</head>', '    <link rel="manifest" href="./manifest.webmanifest" />\n  </head>');
}

// Enhance Schema.org JSON-LD with ItemList of Athletes
const oldLdJsonRegex = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
const enhancedLdJson = `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SportsOrganization",
          "@id": "https://ptg-performance-talent-group.vercel.app/#organization",
          "name": "Performance Talent Group",
          "alternateName": "PTG",
          "url": "https://ptg-performance-talent-group.vercel.app/",
          "logo": "https://ptg-performance-talent-group.vercel.app/assets/brand/ptg-logo.png",
          "description": "Agencia boutique de representación y gestión deportiva integral de futbolistas de élite con Licencia Oficial FIFA. Scouting biomecánico, blindaje contractual y puentes directos con clubes globales.",
          "telephone": "+573146308743",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Carrera 42 3 Sur 81, Edificio Milla de Oro P15 T1",
            "addressLocality": "Medellín",
            "addressRegion": "Antioquia",
            "addressCountry": "CO"
          },
          "founder": {
            "@type": "Person",
            "name": "Andrés Isaza Olarte",
            "jobTitle": "CEO & Abogado Especialista FIFA"
          }
        },
        {
          "@type": "ItemList",
          "@id": "https://ptg-performance-talent-group.vercel.app/#roster-list",
          "name": "PTG High-Performance Scouting Roster",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "item": {
                "@type": "Person",
                "name": "Samuel Martínez Correa",
                "jobTitle": "Portero",
                "memberOf": { "@id": "https://ptg-performance-talent-group.vercel.app/#organization" },
                "nationality": "Colombian",
                "description": "Portero Sub-17 Élite con Selección Colombia y Envigado F.C."
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "item": {
                "@type": "Person",
                "name": "Darlinson Murillo Gamboa",
                "jobTitle": "Defensa Central",
                "memberOf": { "@id": "https://ptg-performance-talent-group.vercel.app/#organization" },
                "nationality": "Colombian",
                "description": "Defensa central de 1.91m, capitán en Primera C con Envigado F.C."
              }
            },
            {
              "@type": "ListItem",
              "position": 3,
              "item": {
                "@type": "Person",
                "name": "Emanuel Duque Torres",
                "jobTitle": "Mediocentro Posicional",
                "memberOf": { "@id": "https://ptg-performance-talent-group.vercel.app/#organization" },
                "nationality": "Colombian",
                "description": "Mediocentro formativo en Cantera de Héroes con 89% de efectividad de pase."
              }
            },
            {
              "@type": "ListItem",
              "position": 4,
              "item": {
                "@type": "Person",
                "name": "Samuel Quiceno Martínez",
                "jobTitle": "Delantero Centro",
                "memberOf": { "@id": "https://ptg-performance-talent-group.vercel.app/#organization" },
                "nationality": "Colombian",
                "description": "Goleador Sub-16/Sub-17 con 32 goles en 23 partidos oficiales."
              }
            }
          ]
        }
      ]
    }
    </script>`;

indexHtml = indexHtml.replace(oldLdJsonRegex, enhancedLdJson);

// Add Scout Search Bar above Filters
const searchBarHtml = `          <div class="ptg-search-filter-container">
            <div class="ptg-scout-search-wrap">
              <svg class="ptg-scout-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                id="ptg-scout-search"
                class="ptg-scout-search-input"
                placeholder="Buscar por nombre, club, demarcación o categoría..."
                aria-label="Buscar jugadores en el roster oficial"
                autocomplete="off"
              />
              <button type="button" id="ptg-search-clear" class="ptg-scout-search-clear" aria-label="Limpiar búsqueda" style="display:none;">&times;</button>
            </div>
            <div class="ptg-filters-wrapper">
              <div class="ptg-filters" role="toolbar" aria-label="Filtros de posición">
                <button type="button" class="ptg-chip is-active" data-filter="all" data-i18n="filterAll">Todos</button>
                <button type="button" class="ptg-chip" data-filter="porteros" data-i18n="filterGk">Porteros</button>
                <button type="button" class="ptg-chip" data-filter="defensas" data-i18n="filterDef">Defensas</button>
                <button type="button" class="ptg-chip" data-filter="volantes" data-i18n="filterMid">Volantes</button>
                <button type="button" class="ptg-chip" data-filter="delanteros" data-i18n="filterFwd">Delanteros</button>
              </div>
            </div>
          </div>`;

if (!indexHtml.includes('id="ptg-scout-search"')) {
  indexHtml = indexHtml.replace(/<div class="ptg-filters-wrapper">[\s\S]*?<\/div>\s*<\/div>/, searchBarHtml);
}

// Add Board Announcements Section before Contact
const boardAnnouncementsSectionHtml = `
      <!-- Corporate Governance & Board Milestones Section -->
      <section id="novedades" class="ptg-section ptg-section--tight" aria-labelledby="novedades-heading">
        <div class="ptg-container">
          <div class="ptg-section-head ptg-text-reveal">
            <span class="ptg-kicker" data-i18n="announcementsEyebrow">Gobierno Corporativo & Hitos</span>
            <h2 id="novedades-heading" class="ptg-title" data-i18n="announcementsTitle">Novedades de Junta & Convocatorias</h2>
            <p data-i18n="announcementsLead">
              Seguimiento institucional de acuerdos directivos, avances contractuales y actividad competitiva oficial de nuestros atletas.
            </p>
          </div>

          <div id="board-announcements-grid" class="ptg-announcements-grid" aria-live="polite">
            <!-- Dynamic announcements loaded via data/announcements.json -->
          </div>
        </div>
      </section>
`;

if (!indexHtml.includes('id="novedades"')) {
  indexHtml = indexHtml.replace('<section id="contacto"', boardAnnouncementsSectionHtml + '\n      <section id="contacto"');
}

// Add nav link for Novedades in top nav and mobile menu
if (!indexHtml.includes('href="#novedades"')) {
  indexHtml = indexHtml.replace('<a href="#contacto" data-i18n="navContact">Contacto</a>', '<a href="#novedades" data-i18n="corporateBoard">Junta</a>\n            <a href="#contacto" data-i18n="navContact">Contacto</a>');
  indexHtml = indexHtml.replace('<a href="#contacto" data-i18n="navContact">Contacto</a>', '<a href="#novedades" data-i18n="corporateBoard">Junta</a>\n        <a href="#contacto" data-i18n="navContact">Contacto</a>');
}

fs.writeFileSync(indexHtmlPath, indexHtml, "utf8");
console.log("[EOS] Successfully updated index.html with PWA, Schema.org ItemList, search bar, and board section.");

console.log("[EOS] All resilience and scalability enhancements successfully executed!");
