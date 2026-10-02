/**
 * EOS Autonomous Implementation Script: Update PTG js/main.js
 * Standard: Level 2 Controlled External Write Authorization (PRJ-PERFORMANCE-TALENT)
 * Run: node scripts/update-ptg-mainjs.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_ROOT = "C:\\Users\\valen\\Documents\\agencia de representacion de jugadores - ptg";
const mainJsPath = path.join(TARGET_ROOT, "js", "main.js");

let mainJs = fs.readFileSync(mainJsPath, "utf8");

// 1. Update roster state to include search
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

// 2. New renderCards with search filtering, silhouette fallback on broken images, and deep linking
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

// 3. Append handlers
const deepLinkHandlerSnippet = `
function handlePlayerModalOpen(player) {
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

if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

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

// Hook into load lifecycle
mainJs = mainJs.replace("renderCards();\n  initScrollReveal();", "renderCards();\n  loadAnnouncements();\n  checkDeepLinkPlayer();\n  initScrollReveal();");
mainJs += deepLinkHandlerSnippet;

fs.writeFileSync(mainJsPath, mainJs, "utf8");
console.log("[EOS] Successfully updated js/main.js with search, deep linking, SW, and announcements!");
