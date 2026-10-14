importScripts("i18n.js");

// ================= CONFIGURACIÓN DE NUBE (FIREBASE) =================
const FIREBASE_API_KEY = "AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU";
const FIREBASE_DB_URL = "https://novel-tracker-1d134-default-rtdb.firebaseio.com";
// ====================================================================

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DIAGNOSTIC_LOGS = 25;
const CHAPTER_STRIP_PATH_REGEX = /^(.*?)(?:\/|-|_)(?:chapter|capitulo|cap[ií]tulo|episode|episodio|parte|ch|cap|ep|c)[-_\/.]?\d+(?:[._-]\d+)?(?:\/.*)?$/i;
const CHAPTER_URL_REGEX = /(?:\/|-|_)(?:chapter|capitulo|cap[ií]tulo|episode|episodio|parte|ch|cap|ep|c)[-_\/.]?(\d+(?:[.-]\d+)?)(?:\/|$|\?|#)/i;
const INLINE_CHAPTER_CUT_REGEX = /\s*[-–—|:«»]*\s*(?:chapter|cap[ií]tulo|capitulo|episode|episodio|parte|ch\.|cap\.|ep\.|c\.)\s*#?\s*\d+.*$/i;
const TRAILING_MEDIA_SUFFIX_REGEX = /\s+\b(?:manhwa|manhua|manga|webtoon|novela\s*ligera|light\s*novel|web\s*novel|novela|novel|comic|raw|sub\s*espa[ñn]ol|en\s*espa[ñn]ol|online|gratis|free)\b\s*$/i;

const CATALOG_SEGMENTS = new Set([
  "novelas", "novela", "novels", "novel", "series", "serie",
  "manga", "mangas", "manhwa", "manhwas", "manhua", "manhuas",
  "webtoon", "webtoons", "comic", "comics", "book", "books",
  "obras", "obra", "lectura", "leer", "ver", "read"
]);

const READER_SEGMENTS = new Set(["leer", "ver", "read", "lectura", "viewer"]);

const BOGUS_NAMES = new Set([
  "novela_web", "homeinicio", "home_inicio", "inicio", "home", "portada",
  "index", "indice", "novelas", "novela", "novels", "novel", "series",
  "serie", "manga", "manhwa", "menu_book", "menu_booknovelas", "volver",
  "anterior", "siguiente", "leer", "ver", "episodios", "episodio",
  "capitulos", "capitulo", "chapters", "chapter", "lista", "lista_de_capitulos",
  "lista_de_episodios", "detalles", "ficha", "info", "informacion", "directorio",
  "sumario", "contenido", "catalogo", "biblioteca", "obra", "obras"
]);

const BLACKLIST_DOMAINS = [
  // Buscadores
  "google.", "bing.com", "duckduckgo.com", "yahoo.com", "baidu.com", "yandex.",
  // IA y Chatbots
  "gemini.google.com", "chatgpt.com", "chat.openai.com", "claude.ai", "deepseek.com", "perplexity.ai", "copilot.microsoft.com", "character.ai",
  // Streaming, Video y Música
  "youtube.com", "youtu.be", "twitch.tv", "netflix.com", "spotify.com", "vimeo.com", "dailymotion.com", "primevideo.com", "disneyplus.com", "soundcloud.com", "music.youtube.com", "tiktok.com",
  // Redes Sociales y Mensajería
  "facebook.com", "fb.com", "twitter.com", "x.com", "instagram.com", "reddit.com", "linkedin.com", "pinterest.com", "threads.net", "discord.com", "whatsapp.com", "telegram.org", "t.me",
  // Desarrollo y Programación
  "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "stackexchange.com", "npmjs.com", "pypi.org", "codepen.io", "replit.com", "vercel.app",
  // Comercio Electrónico
  "amazon.", "ebay.", "mercadolibre.", "aliexpress.com", "walmart.com", "shein.com", "temu.com",
  // Correo, Almacenamiento y Productividad
  "mail.google.com", "drive.google.com", "docs.google.com", "onedrive.live.com", "dropbox.com", "icloud.com", "notion.so", "trello.com",
  // Wikis y Enciclopedias
  "wikipedia.org", "wikimedia.org", "fandom.com", "imdb.com"
];

function isBlacklistedDomain(urlOrHost) {
  if (!urlOrHost) return false;
  let host = String(urlOrHost).toLowerCase();
  try {
    if (host.includes("://")) {
      host = new URL(host).hostname.toLowerCase();
    }
  } catch {}
  host = host.replace(/^www\./, "");
  for (const b of BLACKLIST_DOMAINS) {
    if (b.endsWith(".")) {
      if (host === b.slice(0, -1) || host.startsWith(b) || host.includes(`.${b}`)) return true;
    } else {
      if (host === b || host.endsWith(`.${b}`)) return true;
    }
  }
  return false;
}

function looksLikeReadingUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (isBlacklistedDomain(host)) return false;
    if (/(?:manga|novel|scan|webtoon|manhwa|manhua|comic|read|leer|wuxia|tu-novela|skynovel|olympus|yugen|lector|visormanga|bato|tapas|webnovel)/i.test(host)) {
      return true;
    }
    const path = u.pathname.toLowerCase();
    for (const seg of CATALOG_SEGMENTS) {
      if (path.includes(`/${seg}/`)) return true;
    }
    if (CHAPTER_URL_REGEX.test(path)) return true;
    if (/(?:episode_no|chapter_no|chapter=|capitulo=|cap=)/i.test(u.search.toLowerCase())) return true;
  } catch {}
  return false;
}

const THEMES_CONFIG = {
  cultivation: {
    id: "cultivation",
    nameKey: "theme_cultivation_name",
    icon: "⛩️",
    isPremium: false,
    realms: [
      { id: "qi_condensation", minQi: 0, nextQi: 100, hasStages: true, colors: ["#0ea5e9", "#6366f1", "#10b981"] },
      { id: "foundation_establishment", minQi: 100, nextQi: 400, hasStages: true, colors: ["#10b981", "#059669", "#fbbf24"] },
      { id: "golden_core", minQi: 400, nextQi: 1000, hasStages: true, colors: ["#f59e0b", "#d97706", "#fde047"] },
      { id: "nascent_soul", minQi: 1000, nextQi: 2500, hasStages: true, colors: ["#8b5cf6", "#ec4899", "#38bdf8"] },
      { id: "spirit_transformation", minQi: 2500, nextQi: 5000, hasStages: true, colors: ["#f43f5e", "#9333ea", "#fbbf24"] },
      { id: "void_refinement", minQi: 5000, nextQi: 9000, hasStages: true, colors: ["#3b82f6", "#1d4ed8", "#a855f7"] },
      { id: "body_integration", minQi: 9000, nextQi: 15000, hasStages: true, colors: ["#ea580c", "#dc2626", "#facc15"] },
      { id: "mahayana", minQi: 15000, nextQi: 25000, hasStages: true, colors: ["#06b6d4", "#6366f1", "#f472b6"] },
      { id: "heavenly_tribulation", minQi: 25000, nextQi: 40000, hasStages: true, colors: ["#7c3aed", "#db2777", "#fde047"] },
      { id: "immortal_ascension", minQi: 40000, nextQi: null, hasStages: false, colors: ["#fbbf24", "#ec4899", "#06b6d4"] }
    ],
    titles: [
      { id: "outer_disciple", tier: 1, symbol: "📜", color: "#0284c7", minRealmIndex: 0, minStage: 1, reqChapters: 5 },
      { id: "scroll_initiate", tier: 1, symbol: "📖", color: "#0284c7", minRealmIndex: 0, minStage: 2, reqNovelsStarted: 5 },
      { id: "diligent_reader", tier: 1, symbol: "🕯️", color: "#0284c7", minRealmIndex: 0, minStage: 3, reqSingleDay: 15 },
      { id: "body_refiner", tier: 1, symbol: "🥋", color: "#ea580c", minRealmIndex: 0, minStage: 5, reqChapters: 60, reqStreak: 5 },
      { id: "meridian_opener", tier: 2, symbol: "💫", color: "#0891b2", minRealmIndex: 1, minStage: 1, reqSingleDay: 25 },
      { id: "secluded_cultivator", tier: 2, symbol: "🪷", color: "#059669", minRealmIndex: 1, minStage: 2, reqStreak: 14 },
      { id: "thousand_scrolls", tier: 2, symbol: "📚", color: "#d97706", minRealmIndex: 1, minStage: 4, reqNovelsStarted: 25 },
      { id: "spirit_temperer", tier: 2, symbol: "🔮", color: "#6d28d9", minRealmIndex: 1, minStage: 6, req30Days: 150, reqStreak: 20 },
      { id: "pill_refiner", tier: 2, symbol: "🧪", color: "#10b981", minRealmIndex: 1, minStage: 7, reqNovelsCompleted: 3 },
      { id: "chapter_devourer", tier: 3, symbol: "⚡", color: "#e11d48", minRealmIndex: 2, minStage: 1, req30Days: 250 },
      { id: "tribulation_overcomer", tier: 3, symbol: "⚔️", color: "#ca8a04", minRealmIndex: 2, minStage: 4, reqNovelsCompleted: 7 },
      { id: "domain_ruler", tier: 3, symbol: "🌌", color: "#9333ea", minRealmIndex: 2, minStage: 7, reqStreak: 35 },
      { id: "bottleneck_breaker", tier: 3, symbol: "💥", color: "#0d9488", minRealmIndex: 3, minStage: 1, reqChapters: 400, reqQi: 1000 },
      { id: "ancient_scholar", tier: 3, symbol: "🏛️", color: "#3b82f6", minRealmIndex: 3, minStage: 5, reqChapters: 750, reqNovelsCompleted: 10 },
      { id: "dao_heart", tier: 4, symbol: "💖", color: "#7c3aed", minRealmIndex: 4, minStage: 1, reqStreak: 60 },
      { id: "golden_immortal", tier: 4, symbol: "👑", color: "#b45309", minRealmIndex: 5, minStage: 1, reqChapters: 1500, reqNovelsCompleted: 15 },
      { id: "heaven_defier", tier: 4, symbol: "🐉", color: "#be185d", minRealmIndex: 6, minStage: 1, reqChapters: 2500, reqStreak: 90 },
      { id: "cosmic_sovereign", tier: 4, symbol: "🪐", color: "#f59e0b", minRealmIndex: 7, minStage: 1, reqChapters: 3500, reqNovelsCompleted: 25 },
      { id: "primordial_immortal", tier: 4, symbol: "☯️", color: "#ec4899", minRealmIndex: 9, minStage: 1, reqQi: 40000 }
    ]
  },
  hunter: {
    id: "hunter",
    nameKey: "theme_hunter_name",
    icon: "🗡️",
    isPremium: true,
    realms: [
      { id: "hunter_rank_e", minQi: 0, nextQi: 100, hasStages: true, colors: ["#64748b", "#475569", "#94a3b8"] },
      { id: "hunter_rank_d", minQi: 100, nextQi: 400, hasStages: true, colors: ["#10b981", "#059669", "#34d399"] },
      { id: "hunter_rank_c", minQi: 400, nextQi: 1000, hasStages: true, colors: ["#3b82f6", "#2563eb", "#60a5fa"] },
      { id: "hunter_rank_b", minQi: 1000, nextQi: 2500, hasStages: true, colors: ["#8b5cf6", "#7c3aed", "#a78bfa"] },
      { id: "hunter_rank_a", minQi: 2500, nextQi: 6000, hasStages: true, colors: ["#f59e0b", "#d97706", "#fbbf24"] },
      { id: "hunter_rank_s", minQi: 6000, nextQi: 15000, hasStages: true, colors: ["#ef4444", "#dc2626", "#f87171"] },
      { id: "hunter_national", minQi: 15000, nextQi: null, hasStages: false, colors: ["#fbbf24", "#7c3aed", "#f43f5e"] }
    ],
    titles: [
      { id: "hunter_awakening", tier: 1, symbol: "🗡️", color: "#64748b", minRealmIndex: 0, minStage: 1, reqChapters: 5 },
      { id: "dungeon_scout", tier: 2, symbol: "🚪", color: "#059669", minRealmIndex: 1, minStage: 1, reqChapters: 120, reqStreak: 10 },
      { id: "shadow_monarch", tier: 3, symbol: "👥", color: "#7c3aed", minRealmIndex: 2, minStage: 1, reqChapters: 500, req30Days: 200 },
      { id: "national_hunter", tier: 4, symbol: "🛡️", color: "#f59e0b", minRealmIndex: 5, minStage: 1, reqChapters: 2000, reqNovelsCompleted: 15 }
    ]
  },
  legendary_novels: {
    id: "legendary_novels",
    nameKey: "theme_novels_name",
    icon: "📖",
    isPremium: true,
    realms: [
      { id: "novice_reader", minQi: 0, nextQi: 200, hasStages: true, colors: ["#0284c7", "#0369a1", "#38bdf8"] },
      { id: "lore_seeker", minQi: 200, nextQi: 800, hasStages: true, colors: ["#6366f1", "#4f46e5", "#818cf8"] },
      { id: "omniscient_observer", minQi: 800, nextQi: 3000, hasStages: true, colors: ["#9333ea", "#7e22ce", "#c084fc"] },
      { id: "mythic_chronicler", minQi: 3000, nextQi: null, hasStages: false, colors: ["#f59e0b", "#ec4899", "#06b6d4"] }
    ],
    titles: [
      { id: "fool_pathway", tier: 2, symbol: "🃏", color: "#6366f1", minRealmIndex: 1, minStage: 1, reqChapters: 150 },
      { id: "constellation_reader", tier: 3, symbol: "⭐", color: "#9333ea", minRealmIndex: 2, minStage: 1, reqChapters: 600, reqNovelsStarted: 20 },
      { id: "nano_symbiosis", tier: 3, symbol: "⚙️", color: "#06b6d4", minRealmIndex: 2, minStage: 1, reqSingleDay: 30 },
      { id: "primordial_author", tier: 4, symbol: "🖋️", color: "#f59e0b", minRealmIndex: 3, minStage: 1, reqChapters: 3000, reqNovelsCompleted: 20 }
    ]
  }
};

const CULTIVATION_REALMS = THEMES_CONFIG.cultivation.realms;

const TITLE_BADGE_COLORS = {};
const TITLE_BADGE_SYMBOLS = {};

Object.values(THEMES_CONFIG).forEach((tCfg) => {
  tCfg.titles.forEach((item) => {
    TITLE_BADGE_COLORS[item.id] = item.color;
    TITLE_BADGE_SYMBOLS[item.id] = item.symbol;
  });
});

let storageMutex = Promise.resolve();
function withStorageLock(task) {
  const next = storageMutex.then(() => task());
  storageMutex = next.catch((err) => console.error("Error en cola de storage:", err));
  return next;
}

// ================= SISTEMA DE LOGS DE DIAGNÓSTICO Y REPORTES =================

async function appendDiagnosticLog(entry) {
  try {
    const { diagnosticLogs } = await chrome.storage.local.get(["diagnosticLogs"]);
    const logs = Array.isArray(diagnosticLogs) ? diagnosticLogs : [];
    logs.unshift({
      ts: new Date().toISOString(),
      ...entry
    });
    if (logs.length > MAX_DIAGNOSTIC_LOGS) {
      logs.length = MAX_DIAGNOSTIC_LOGS;
    }
    await chrome.storage.local.set({ diagnosticLogs: logs });
  } catch {}
}

async function handleSubmitBugReport(payload) {
  const category = String(payload?.category || "other").slice(0, 40);
  const message = String(payload?.message || "").trim().slice(0, 1400);
  const attachLogs = Boolean(payload?.attachLogs);

  if (!message) return { ok: false, error: "empty" };

  const storage = await chrome.storage.local.get(["diagnosticLogs", "auth"]);
  let activeTabInfo = null;
  if (attachLogs) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        activeTabInfo = {
          url: tab.url || "",
          title: tab.title || ""
        };
      }
    } catch {}
  }

  const reportData = {
    category,
    message,
    createdAt: Date.now(),
    createdIso: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
    userEmail: storage.auth?.email || "anonymous",
    activeTab: attachLogs ? activeTabInfo : null,
    recentLogs: attachLogs ? (storage.diagnosticLogs || []).slice(0, 8) : null
  };

  const dbCleanUrl = FIREBASE_DB_URL.replace(/\/$/, "");
  const authParam = storage.auth?.idToken ? `?auth=${storage.auth.idToken}` : "";

  try {
    const res = await fetch(`${dbCleanUrl}/reports.json${authParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData)
    });

    if (!res.ok) {
      await appendDiagnosticLog({ event: "REPORT_SEND_ERROR", status: res.status });
      return { ok: false };
    }
    await appendDiagnosticLog({ event: "REPORT_SENT_OK", category });
    return { ok: true };
  } catch (err) {
    await appendDiagnosticLog({ event: "REPORT_NETWORK_ERROR", error: String(err) });
    return { ok: false };
  }
}

// ============================================================================

function drawExtensionIconSize(size, colors, hasEquippedTitle) {
  if (typeof OffscreenCanvas === "undefined") return null;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const r = size * 0.23;

  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, colors[0] || "#0ea5e9");
  bgGrad.addColorStop(0.55, colors[1] || "#6366f1");
  bgGrad.addColorStop(1, colors[2] || "#ec4899");

  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  const inset = Math.max(1, size * 0.055);
  ctx.beginPath();
  ctx.roundRect(inset, inset, size - inset * 2, size - inset * 2, r * 0.82);
  ctx.strokeStyle = hasEquippedTitle ? "rgba(253, 224, 71, 0.9)" : "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = Math.max(1, size * 0.055);
  ctx.stroke();

  ctx.fillStyle = "rgba(10, 10, 18, 0.28)";
  ctx.beginPath();
  ctx.roundRect(size * 0.16, size * 0.18, size * 0.68, size * 0.64, size * 0.12);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;

  const nGrad = ctx.createLinearGradient(0, size * 0.2, 0, size * 0.82);
  nGrad.addColorStop(0, "#ffffff");
  nGrad.addColorStop(1, hasEquippedTitle ? "#fef08a" : "#e0e7ff");

  ctx.strokeStyle = nGrad;
  ctx.lineWidth = Math.max(2, size * 0.13);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const leftX = size * 0.29;
  const rightX = size * 0.71;
  const topY = size * 0.27;
  const botY = size * 0.73;

  ctx.beginPath();
  ctx.moveTo(leftX, botY);
  ctx.lineTo(leftX, topY);
  ctx.lineTo(rightX, botY);
  ctx.lineTo(rightX, topY);
  ctx.stroke();
  ctx.restore();

  if (hasEquippedTitle) {
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.13, Math.max(1.5, size * 0.065), 0, Math.PI * 2);
    ctx.fill();
  }

  return ctx.getImageData(0, 0, size, size);
}

async function refreshBrowserActionAppearance() {
  try {
    await initI18n();
    const storage = await chrome.storage.local.get(["stats", "settings"]);
    const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
    const settings = storage.settings || {};
    const themeId = settings.activeThemeId || "cultivation";
    const cultState = getCultivationState(stats, themeId);
    const themeRealms = (THEMES_CONFIG[themeId] || THEMES_CONFIG.cultivation).realms;
    const realmObj = themeRealms[cultState.realmIndex] || themeRealms[0];

    const equippedId =
      stats.equippedTitle && (stats.unlockedTitles || []).includes(stats.equippedTitle)
        ? stats.equippedTitle
        : "";

    if (typeof OffscreenCanvas !== "undefined") {
      const imageData = {};
      for (const sz of [16, 32, 48, 128]) {
        const img = drawExtensionIconSize(sz, realmObj.colors, Boolean(equippedId));
        if (img) imageData[sz] = img;
      }
      if (Object.keys(imageData).length > 0) {
        await chrome.action.setIcon({ imageData }).catch(() => {});
      }
    }

    if (cultState.isBottleneckReady) {
      await chrome.action.setBadgeText({ text: "⚡" }).catch(() => {});
      await chrome.action.setBadgeBackgroundColor({ color: "#e11d48" }).catch(() => {});
    } else if (equippedId) {
      const badgeSymbol = TITLE_BADGE_SYMBOLS[equippedId] || t(`title_${equippedId}_tag`) || "★";
      const badgeColor = TITLE_BADGE_COLORS[equippedId] || "#6366f1";
      await chrome.action.setBadgeText({ text: badgeSymbol }).catch(() => {});
      await chrome.action.setBadgeBackgroundColor({ color: badgeColor }).catch(() => {});
    } else {
      await chrome.action.setBadgeText({ text: "" }).catch(() => {});
    }

    const realmName = t(`realm_${cultState.realmId}`);
    const stageStr = cultState.stage ? ` (${t("header_stage", { stage: cultState.stage })})` : "";
    const titleStr = equippedId ? `🏆 ${t(`title_${equippedId}_name`)} • ` : "";
    const bAlert = cultState.isBottleneckReady ? " [⚡ ¡Ruptura Lista!]" : "";
    await chrome.action.setTitle({
      title: `NovelTrack — ${titleStr}${realmName}${stageStr}${bAlert} • ${cultState.totalQi} Qi`
    }).catch(() => {});
  } catch (e) {
    console.error("Error actualizando apariencia del icono:", e);
  }
}

function getLocalDateStr(ts = Date.now()) {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetweenDateStrings(d1Str, d2Str) {
  if (!d1Str || !d2Str) return null;
  const [y1, m1, day1] = d1Str.split("-").map(Number);
  const [y2, m2, day2] = d2Str.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, day1);
  const utc2 = Date.UTC(y2, m2 - 1, day2);
  return Math.round((utc2 - utc1) / (24 * 60 * 60 * 1000));
}

function getDefaultStats() {
  return {
    chaptersRead: 0,
    novelsStarted: 0,
    novelsCompleted: 0,
    streakDays: 0,
    bestStreak: 0,
    lastReadDay: "",
    unlockedTitles: [],
    equippedTitle: "",
    dailyChapters: {},
    cultivatedRealmIndex: undefined,
    cultivatedStage: undefined,
    lastBreakthrough: null,
    updatedAt: 0
  };
}

function calculateQi(stats) {
  const chapters = Math.max(0, Number(stats?.chaptersRead) || 0);
  const completed = Math.max(0, Number(stats?.novelsCompleted) || 0);
  return chapters + 50 * completed;
}

function computeNaturalRealmAndStage(qi, realms = CULTIVATION_REALMS) {
  let realmIndex = 0;
  for (let i = realms.length - 1; i >= 0; i--) {
    if (qi >= realms[i].minQi) {
      realmIndex = i;
      break;
    }
  }
  const realm = realms[realmIndex] || realms[0];
  if (!realm.hasStages || realm.nextQi === null) {
    return { realmIndex, realmId: realm.id, stage: null };
  }
  const span = realm.nextQi - realm.minQi;
  const progress = Math.max(0, qi - realm.minQi);
  const stage = Math.min(9, Math.floor((progress * 9) / span) + 1);
  return { realmIndex, realmId: realm.id, stage };
}

function computeRealmAndStage(qi) {
  return computeNaturalRealmAndStage(qi, CULTIVATION_REALMS);
}

function getCultivationState(stats, themeId = "cultivation") {
  const theme = THEMES_CONFIG[themeId] || THEMES_CONFIG.cultivation;
  const realms = theme.realms;
  const totalQi = calculateQi(stats);

  let cultivatedRealmIndex = stats?.cultivatedRealmIndex;
  let cultivatedStage = stats?.cultivatedStage;

  if (cultivatedRealmIndex === undefined || cultivatedStage === undefined) {
    const natural = computeNaturalRealmAndStage(totalQi, realms);
    cultivatedRealmIndex = natural.realmIndex;
    cultivatedStage = natural.stage || 1;
  } else {
    cultivatedRealmIndex = Math.min(realms.length - 1, Math.max(0, Number(cultivatedRealmIndex) || 0));
    cultivatedStage = Math.min(9, Math.max(1, Number(cultivatedStage) || 1));
  }

  const currentRealm = realms[cultivatedRealmIndex] || realms[0];
  const isPeakRealm = (currentRealm.nextQi === null);

  let currentStageCapQi = null;
  let prevStageCapQi = currentRealm.minQi;
  let isBottleneckReady = false;
  let isMajorBottleneck = false;
  let overflowQi = 0;
  let pct = 100;

  if (!isPeakRealm && currentRealm.hasStages) {
    const span = currentRealm.nextQi - currentRealm.minQi;
    const stageStep = span / 9;
    currentStageCapQi = Math.round(currentRealm.minQi + cultivatedStage * stageStep);
    prevStageCapQi = Math.round(currentRealm.minQi + (cultivatedStage - 1) * stageStep);

    if (totalQi >= currentStageCapQi) {
      isBottleneckReady = true;
      isMajorBottleneck = (cultivatedStage >= 9);
      overflowQi = totalQi - currentStageCapQi;
      pct = 100;
    } else {
      isBottleneckReady = false;
      isMajorBottleneck = false;
      overflowQi = 0;
      const progressInStage = Math.max(0, totalQi - prevStageCapQi);
      const stageSpan = Math.max(1, currentStageCapQi - prevStageCapQi);
      pct = Math.min(99, Math.max(0, Math.round((progressInStage / stageSpan) * 100)));
    }
  }

  const nextRealm = (!isPeakRealm && cultivatedRealmIndex < realms.length - 1)
    ? realms[cultivatedRealmIndex + 1]
    : null;

  return {
    themeId,
    realmIndex: cultivatedRealmIndex,
    realmId: currentRealm.id,
    realmNameKey: `realm_${currentRealm.id}`,
    stage: cultivatedStage,
    colors: currentRealm.colors,
    gradient: currentRealm.gradient,
    totalQi,
    currentStageCapQi,
    prevStageCapQi,
    isBottleneckReady,
    isMajorBottleneck,
    overflowQi,
    pct,
    nextRealmId: nextRealm ? nextRealm.id : null,
    isPeakRealm
  };
}

function advanceCultivationBreakthrough(stats, themeId = "cultivation") {
  const state = getCultivationState(stats, themeId);
  if (!state.isBottleneckReady) return { ok: false, reason: "not_ready" };

  const theme = THEMES_CONFIG[themeId] || THEMES_CONFIG.cultivation;
  const realms = theme.realms;

  let newRealmIndex = state.realmIndex;
  let newStage = state.stage;

  if (state.isMajorBottleneck) {
    newRealmIndex = Math.min(realms.length - 1, state.realmIndex + 1);
    newStage = 1;
  } else {
    newStage = Math.min(9, state.stage + 1);
  }

  stats.cultivatedRealmIndex = newRealmIndex;
  stats.cultivatedStage = newStage;
  stats.lastBreakthrough = {
    realmId: realms[newRealmIndex].id,
    stage: newStage,
    timestamp: Date.now()
  };
  stats.updatedAt = Date.now();

  evaluateUnlockedTitles(stats, themeId);

  return {
    ok: true,
    stats,
    breakthroughInfo: stats.lastBreakthrough
  };
}

function pruneAndSumDailyChapters(dailyChapters, nowTs = Date.now()) {
  const pruned = {};
  const todayStr = getLocalDateStr(nowTs);
  let last30DaysSum = 0;
  let maxSingleDay = 0;

  for (const [dateStr, count] of Object.entries(dailyChapters || {})) {
    const diff = daysBetweenDateStrings(dateStr, todayStr);
    const validCount = Math.max(0, Number(count) || 0);
    if (diff !== null && diff >= 0 && diff <= 35 && validCount > 0) {
      pruned[dateStr] = validCount;
      if (diff <= 30) {
        last30DaysSum += validCount;
      }
      if (validCount > maxSingleDay) {
        maxSingleDay = validCount;
      }
    }
  }
  return { pruned, last30DaysSum, maxSingleDay };
}

function evaluateUnlockedTitles(stats, themeId = "cultivation") {
  const unlocked = new Set(Array.isArray(stats.unlockedTitles) ? stats.unlockedTitles : []);
  const totalQi = calculateQi(stats);
  const { last30DaysSum, maxSingleDay } = pruneAndSumDailyChapters(stats.dailyChapters);
  const maxStreak = Math.max(Number(stats.streakDays) || 0, Number(stats.bestStreak) || 0);

  const state = getCultivationState(stats, themeId);
  const currentRealmIndex = state.realmIndex;
  const currentStage = state.stage;

  for (const tConfig of Object.values(THEMES_CONFIG)) {
    for (const title of tConfig.titles) {
      if (unlocked.has(title.id)) continue;

      // 1. Level Gating: Check minimum realm and stage
      let levelSatisfied = false;
      if (currentRealmIndex > title.minRealmIndex) {
        levelSatisfied = true;
      } else if (currentRealmIndex === title.minRealmIndex) {
        levelSatisfied = (currentStage >= (title.minStage || 1));
      }

      if (!levelSatisfied) continue;

      // 2. Reading requirements
      let reqSatisfied = true;
      if (title.reqChapters && (Number(stats.chaptersRead) || 0) < title.reqChapters) reqSatisfied = false;
      if (title.reqNovelsStarted && (Number(stats.novelsStarted) || 0) < title.reqNovelsStarted) reqSatisfied = false;
      if (title.reqNovelsCompleted && (Number(stats.novelsCompleted) || 0) < title.reqNovelsCompleted) reqSatisfied = false;
      if (title.reqStreak && maxStreak < title.reqStreak) reqSatisfied = false;
      if (title.reqSingleDay && maxSingleDay < title.reqSingleDay) reqSatisfied = false;
      if (title.req30Days && last30DaysSum < title.req30Days) reqSatisfied = false;
      if (title.reqQi && totalQi < title.reqQi) reqSatisfied = false;

      if (reqSatisfied) {
        unlocked.add(title.id);
      }
    }
  }

  const unlockedArr = Array.from(unlocked);
  stats.unlockedTitles = unlockedArr;
  if (!stats.equippedTitle && unlockedArr.length > 0) {
    stats.equippedTitle = unlockedArr[unlockedArr.length - 1];
  }
  return stats;
}

function recordCultivationProgress(rawStats, chaptersDelta, isNewNovelStarted, completedDelta = 0) {
  const stats = { ...getDefaultStats(), ...(rawStats || {}) };

  // Ensure cultivated level is initialized so no auto-jumping occurs
  if (stats.cultivatedRealmIndex === undefined || stats.cultivatedStage === undefined) {
    const initialQi = calculateQi(stats);
    const natural = computeNaturalRealmAndStage(initialQi);
    stats.cultivatedRealmIndex = natural.realmIndex;
    stats.cultivatedStage = natural.stage || 1;
  }

  if (isNewNovelStarted) {
    stats.novelsStarted = Math.max(0, Number(stats.novelsStarted) || 0) + 1;
  }

  if (completedDelta !== 0) {
    stats.novelsCompleted = Math.max(0, (Number(stats.novelsCompleted) || 0) + completedDelta);
  }

  if (chaptersDelta > 0) {
    stats.chaptersRead = Math.max(0, Number(stats.chaptersRead) || 0) + chaptersDelta;

    const todayStr = getLocalDateStr();
    const diffDays = stats.lastReadDay ? daysBetweenDateStrings(stats.lastReadDay, todayStr) : null;

    if (!stats.lastReadDay || diffDays === null || diffDays > 1 || diffDays < 0) {
      stats.streakDays = 1;
    } else if (diffDays === 1) {
      stats.streakDays = (Number(stats.streakDays) || 0) + 1;
    } else if (diffDays === 0) {
      stats.streakDays = Math.max(1, Number(stats.streakDays) || 1);
    }

    stats.lastReadDay = todayStr;
    stats.bestStreak = Math.max(Number(stats.bestStreak) || 0, stats.streakDays);

    const daily = { ...(stats.dailyChapters || {}) };
    daily[todayStr] = (Number(daily[todayStr]) || 0) + chaptersDelta;
    const { pruned } = pruneAndSumDailyChapters(daily);
    stats.dailyChapters = pruned;
  }

  evaluateUnlockedTitles(stats);
  stats.updatedAt = Date.now();
  return stats;
}

function fnv1aHex(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stripChapterFromTitle(rawName) {
  if (!rawName) return "";
  let cleaned = String(rawName).replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(INLINE_CHAPTER_CUT_REGEX, "").trim();
  cleaned = cleaned
    .replace(/^(?:read|leer|ver)\s+/i, "")
    .replace(TRAILING_MEDIA_SUFFIX_REGEX, "")
    .replace(TRAILING_MEDIA_SUFFIX_REGEX, "")
    .replace(/[-|–—:«»•›]+\s*$/, "")
    .trim();
  return cleaned;
}

function isBogusNovelName(name, novelUrl = "") {
  const cleaned = stripChapterFromTitle(name);
  const norm = normalizeText(cleaned);
  if (!norm || norm.length < 2) return true;
  if (BOGUS_NAMES.has(norm)) return true;
  if (/^(?:home|inicio|menu|volver|anterior|siguiente|novelas|manhwa|manga|portada|leer|episodios|episodio|capitulos|capitulo|chapters|chapter|lista|detalles|ficha|info)+$/.test(norm.replace(/_/g, ""))) {
    return true;
  }

  if (novelUrl) {
    const slugHuman = humanizeSlugFromNovelUrl(novelUrl);
    if (slugHuman) {
      const slugWords = normalizeText(slugHuman).split("_").filter((w) => w.length >= 3 && !/^\d+$/.test(w));
      const nameWords = norm.split("_").filter((w) => w.length >= 3);
      if (slugWords.length >= 2 && nameWords.length <= 2) {
        const hasOverlap = nameWords.some((nw) => slugWords.includes(nw));
        if (!hasOverlap) return true;
      }
    }
  }
  return false;
}

function hasRicherFormatting(candidate, current) {
  if (!candidate || !current) return false;
  if (normalizeText(candidate) !== normalizeText(current)) return false;
  const nonAsciiOrPunct = /[^\x00-\x7F]|[,:;¡!¿?]/;
  return nonAsciiOrPunct.test(candidate) && !nonAsciiOrPunct.test(current);
}

function sanitizeRtdbKey(key) {
  const cleaned = String(key || "").replace(/[.$#[\]/\x00-\x1F\x7F]/g, "_").trim();
  return cleaned || `series_${fnv1aHex(String(key || Date.now()))}`;
}

function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "local";
  }
}

function isValidSeriesPath(pathname) {
  const segments = String(pathname || "").split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const first = normalizeText(segments[0]);
  if (segments.length === 1 && (BOGUS_NAMES.has(first) || CATALOG_SEGMENTS.has(first))) {
    return false;
  }
  const last = normalizeText(segments[segments.length - 1]);
  if (BOGUS_NAMES.has(last) && segments.length <= 2) {
    return false;
  }
  return true;
}

function canonicalizeSeriesPathForId(pathname) {
  const segments = decodeURIComponent(String(pathname || ""))
    .toLowerCase()
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);
  if (segments.length >= 2 && CATALOG_SEGMENTS.has(segments[0])) {
    segments[0] = "series";
  }
  return "/" + segments.join("/");
}

function deriveNovelUrlFromChapterUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const u = new URL(rawUrl);
    const pathname = u.pathname.replace(/\/+$/, "");
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "";

    const explicitMatch = pathname.match(CHAPTER_STRIP_PATH_REGEX);
    if (explicitMatch && explicitMatch[1]) {
      const stripped = explicitMatch[1].replace(/\/+$/, "");
      if (isValidSeriesPath(stripped)) {
        return `${u.origin}${stripped}`;
      }
    }

    const firstLower = segments[0].toLowerCase();

    if (READER_SEGMENTS.has(firstLower) && segments.length === 2) {
      const slugWithChap = segments[1];
      const matchTrailingChap = slugWithChap.match(/^([a-z0-9_-]*[a-z][a-z0-9_-]*?)-(\d+(?:[._-]\d+)?)$/i);
      if (matchTrailingChap && matchTrailingChap[1]) {
        const baseSlug = matchTrailingChap[1];
        const seriesPrefix = u.hostname.includes("manhwa") ? "manhwa" : segments[0];
        return `${u.origin}/${seriesPrefix}/${baseSlug}`;
      }
    }

    if (
      CATALOG_SEGMENTS.has(firstLower) &&
      segments.length >= 3 &&
      /^\d+$/.test(segments[1]) &&
      /[a-z]/i.test(segments[2])
    ) {
      return `${u.origin}/${segments[0]}/${segments[1]}/${segments[2]}`;
    }

    if (
      CATALOG_SEGMENTS.has(firstLower) &&
      segments.length >= 3 &&
      /[a-z]/i.test(segments[1]) &&
      (/^\d+(?:[._-]\d+)?$/.test(segments[2]) || CHAPTER_URL_REGEX.test("/" + segments[2]))
    ) {
      return `${u.origin}/${segments[0]}/${segments[1]}`;
    }

    if (
      segments.length >= 2 &&
      /^\d+(?:[._-]\d+)?$/.test(segments[segments.length - 1]) &&
      segments[segments.length - 2].includes("-") &&
      /[a-z]/i.test(segments[segments.length - 2])
    ) {
      const stripped = "/" + segments.slice(0, -1).join("/");
      if (isValidSeriesPath(stripped)) {
        return `${u.origin}${stripped}`;
      }
    }

    if (CATALOG_SEGMENTS.has(firstLower) && segments.length === 2 && /[a-z]/i.test(segments[1])) {
      return `${u.origin}/${segments[0]}/${segments[1]}`;
    }
  } catch {}
  return "";
}

function extractSlugFromNovelUrl(novelUrl) {
  if (!novelUrl) return "";
  try {
    const u = new URL(novelUrl);
    const segments = u.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      let seg = decodeURIComponent(segments[i]);
      if (/^\d+$/.test(seg)) continue;
      if (CATALOG_SEGMENTS.has(seg.toLowerCase()) || BOGUS_NAMES.has(normalizeText(seg))) continue;
      seg = seg.replace(/_\d{8,}$/, "");
      return normalizeText(seg);
    }
  } catch {}
  return "";
}

function humanizeSlugFromNovelUrl(novelUrl) {
  if (!novelUrl) return "";
  try {
    const u = new URL(novelUrl);
    const segments = u.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      let seg = decodeURIComponent(segments[i]);
      if (/^\d+$/.test(seg)) continue;
      if (CATALOG_SEGMENTS.has(seg.toLowerCase()) || BOGUS_NAMES.has(normalizeText(seg))) continue;
      seg = seg.replace(/_\d{8,}$/, "");
      if (seg.includes("-") && seg.length > 3) {
        const words = seg.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
        return words.charAt(0).toUpperCase() + words.slice(1);
      }
    }
  } catch {}
  return "";
}

function buildSeriesIdFromUrl(novelUrl) {
  try {
    const u = new URL(novelUrl);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const cleanPath = decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/, "");
    if (!isValidSeriesPath(cleanPath)) return "";
    const canonicalPath = canonicalizeSeriesPathForId(cleanPath);
    const canonical = `${host}${canonicalPath}`;
    const hostSlug = normalizeText(host).slice(0, 24);
    const pathSlug = normalizeText(canonicalPath).slice(0, 48);
    return `${hostSlug}__${pathSlug}_${fnv1aHex(canonical)}`;
  } catch {
    return "";
  }
}

function buildSeriesIdFromName(name, domain) {
  const hostSlug = normalizeText(domain || "local").slice(0, 24);
  const cleanedName = stripChapterFromTitle(name);
  const nameSlug = normalizeText(cleanedName).slice(0, 48);
  if (!nameSlug) return "";
  const canonical = `${hostSlug}::${nameSlug}`;
  return `${hostSlug}__${nameSlug}_${fnv1aHex(canonical)}`;
}

function computeCanonicalSeriesId(entry, fallbackKey) {
  const derivedFromChapter = deriveNovelUrlFromChapterUrl(entry.url);
  const derivedFromNovelUrl = deriveNovelUrlFromChapterUrl(entry.novelUrl);
  const bestNovelUrl = derivedFromChapter || derivedFromNovelUrl || "";

  if (bestNovelUrl) {
    const idFromUrl = buildSeriesIdFromUrl(bestNovelUrl);
    if (idFromUrl) return { seriesId: idFromUrl, novelUrl: bestNovelUrl };
  }

  const rawEffectiveName = entry.customName || (!isBogusNovelName(entry.novelName, bestNovelUrl) ? entry.novelName : "") || fallbackKey;
  const effectiveName = stripChapterFromTitle(rawEffectiveName);
  const domain = extractDomain(bestNovelUrl || entry.url);
  const idFromName = buildSeriesIdFromName(effectiveName, domain);
  return {
    seriesId: idFromName || sanitizeRtdbKey(fallbackKey),
    novelUrl: bestNovelUrl
  };
}

function deduplicateAndMigrateMap(rawMap) {
  const now = Date.now();
  const source = rawMap && typeof rawMap === "object" ? rawMap : {};
  const result = {};
  const activeGroups = new Map();
  const aliasToGroupId = new Map();
  let changed = false;

  const preparedEntries = [];

  for (const [rawKey, entry] of Object.entries(source)) {
    if (!entry || typeof entry !== "object") {
      changed = true;
      continue;
    }

    if (entry.deleted === true) {
      if (now - (entry.updatedAt || 0) > THIRTY_DAYS_MS) {
        changed = true;
        continue;
      }
      const safeKey = sanitizeRtdbKey(entry.seriesId || rawKey);
      if (safeKey !== rawKey) changed = true;
      const existing = result[safeKey];
      if (!existing || (entry.updatedAt || 0) > (existing.updatedAt || 0)) {
        result[safeKey] = {
          seriesId: safeKey,
          deleted: true,
          updatedAt: entry.updatedAt || now
        };
      }
      continue;
    }

    const { seriesId, novelUrl } = computeCanonicalSeriesId(entry, rawKey);
    const rawCustom = entry.customName ? stripChapterFromTitle(entry.customName) : "";
    const cleanedCustom = !isBogusNovelName(rawCustom, novelUrl) ? rawCustom : "";
    const cleanedNovelName = stripChapterFromTitle(entry.novelName || "");
    const rawName = cleanedCustom || cleanedNovelName;
    const fallbackSlugName = humanizeSlugFromNovelUrl(novelUrl);
    const validName = !isBogusNovelName(rawName, novelUrl) ? rawName : fallbackSlugName;

    if (!validName) {
      changed = true;
      continue;
    }

    const domain = extractDomain(novelUrl || entry.url);
    if (isBlacklistedDomain(domain) || isBlacklistedDomain(entry.url)) {
      changed = true;
      continue;
    }
    const nameAlias = `${normalizeText(validName)}@@${domain}`;
    const slugPart = extractSlugFromNovelUrl(novelUrl);
    const slugAlias = slugPart ? `${slugPart}@@${domain}` : "";

    if (novelUrl) {
      aliasToGroupId.set(nameAlias, seriesId);
      if (slugAlias) aliasToGroupId.set(slugAlias, seriesId);
    }

    preparedEntries.push({
      rawKey,
      entry: {
        ...entry,
        novelName: validName,
        customName: cleanedCustom
      },
      seriesId,
      novelUrl,
      validName,
      nameAlias,
      slugAlias
    });
  }

  for (const item of preparedEntries) {
    let targetGroupId =
      (item.slugAlias && aliasToGroupId.get(item.slugAlias)) ||
      aliasToGroupId.get(item.nameAlias) ||
      item.seriesId;

    aliasToGroupId.set(item.nameAlias, targetGroupId);
    if (item.slugAlias) aliasToGroupId.set(item.slugAlias, targetGroupId);

    if (
      item.rawKey !== targetGroupId ||
      item.entry.seriesId !== targetGroupId ||
      item.entry.novelUrl !== item.novelUrl ||
      item.entry.novelName !== item.validName
    ) {
      changed = true;
    }

    if (!activeGroups.has(targetGroupId)) {
      activeGroups.set(targetGroupId, []);
    }
    activeGroups.get(targetGroupId).push({
      ...item.entry,
      seriesId: targetGroupId,
      novelUrl: item.novelUrl || item.entry.novelUrl || "",
      _cleanName: item.validName
    });
  }

  for (const [groupId, items] of activeGroups.entries()) {
    if (items.length > 1) changed = true;

    items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const newest = items[0];

    const existingTombstone = result[groupId];
    if (existingTombstone && existingTombstone.deleted && existingTombstone.updatedAt >= (newest.updatedAt || 0)) {
      changed = true;
      continue;
    }

    const bestNovelUrl = items.find((i) => i.novelUrl)?.novelUrl || "";
    const customEntry = items.find((i) => i.customName && !isBogusNovelName(i.customName, bestNovelUrl));
    const customName = customEntry ? String(customEntry.customName).trim() : "";

    let bestAutoName = items.find((i) => !isBogusNovelName(i.novelName, bestNovelUrl))?.novelName || newest._cleanName;
    for (const candidate of items) {
      if (!isBogusNovelName(candidate.novelName, bestNovelUrl) && hasRicherFormatting(candidate.novelName, bestAutoName)) {
        bestAutoName = candidate.novelName;
      }
    }

    const stableName = customName || bestAutoName || humanizeSlugFromNovelUrl(bestNovelUrl);
    const maxCounted = Math.max(
      ...items.map((i) => parseFloat(i.maxCounted ?? i.chapter) || 0),
      parseFloat(newest.chapter) || 0
    );
    const statusManual = items.find((i) => i.statusManual)?.statusManual || "";
    const completedCounted = items.some((i) => i.completedCounted === true);

    const mergedEntry = {
      seriesId: groupId,
      novelName: stableName,
      novelUrl: bestNovelUrl,
      url: newest.url || bestNovelUrl,
      chapter: String(newest.chapter || "1"),
      maxCounted,
      scrollPct: typeof newest.scrollPct === "number" ? newest.scrollPct : 0,
      statusManual,
      completedCounted,
      alert: newest.alert || null,
      updatedAt: newest.updatedAt || now
    };
    if (customName) {
      mergedEntry.customName = customName;
    }

    result[groupId] = mergedEntry;
  }

  return { migratedNovels: result, changed };
}

function mergeStatsObjects(localStats, cloudStats) {
  const l = { ...getDefaultStats(), ...(localStats || {}) };
  const c = { ...getDefaultStats(), ...(cloudStats || {}) };

  const winner = (l.updatedAt || 0) >= (c.updatedAt || 0) ? l : c;
  const older = winner === l ? c : l;

  const mergedDaily = { ...(older.dailyChapters || {}) };
  for (const [day, count] of Object.entries(winner.dailyChapters || {})) {
    mergedDaily[day] = Math.max(Number(mergedDaily[day]) || 0, Number(count) || 0);
  }
  const { pruned } = pruneAndSumDailyChapters(mergedDaily);

  const mergedUnlocked = Array.from(new Set([...(l.unlockedTitles || []), ...(c.unlockedTitles || [])]));

  const merged = {
    chaptersRead: Math.max(Number(l.chaptersRead) || 0, Number(c.chaptersRead) || 0),
    novelsStarted: Math.max(Number(l.novelsStarted) || 0, Number(c.novelsStarted) || 0),
    novelsCompleted: Math.max(Number(l.novelsCompleted) || 0, Number(c.novelsCompleted) || 0),
    streakDays: Number(winner.streakDays) || 0,
    bestStreak: Math.max(Number(l.bestStreak) || 0, Number(c.bestStreak) || 0),
    lastReadDay: winner.lastReadDay || older.lastReadDay || "",
    unlockedTitles: mergedUnlocked,
    equippedTitle: winner.equippedTitle || older.equippedTitle || "",
    dailyChapters: pruned,
    lastBreakthrough: winner.lastBreakthrough || older.lastBreakthrough || null,
    updatedAt: Math.max(l.updatedAt || 0, c.updatedAt || 0)
  };

  evaluateUnlockedTitles(merged);
  return merged;
}

async function migrateLocalStorageNow() {
  return withStorageLock(async () => {
    await initI18n();
    const { savedNovels, stats } = await chrome.storage.local.get(["savedNovels", "stats"]);
    const { migratedNovels, changed } = deduplicateAndMigrateMap(savedNovels || {});
    const currentStats = evaluateUnlockedTitles({ ...getDefaultStats(), ...(stats || {}) });

    const activeCount = Object.values(migratedNovels).filter((n) => n && !n.deleted).length;
    let statsChanged = !stats;
    if (activeCount > currentStats.novelsStarted) {
      currentStats.novelsStarted = activeCount;
      currentStats.updatedAt = Date.now();
      evaluateUnlockedTitles(currentStats);
      statsChanged = true;
    }

    if (changed || statsChanged) {
      await chrome.storage.local.set({ savedNovels: migratedNovels, stats: currentStats });
      await pushToCloudUnlocked(migratedNovels, currentStats);
    }
    await refreshBrowserActionAppearance();
    return migratedNovels;
  });
}

migrateLocalStorageNow();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.stats || changes.settings) {
    refreshBrowserActionAppearance();
  }
});

// Sincronización periódica cada 30 min para ahorrar ancho de banda de Firebase Spark
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("periodic_cloud_sync", { periodInMinutes: 30 });
  migrateLocalStorageNow();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("periodic_cloud_sync", { periodInMinutes: 30 });
  refreshBrowserActionAppearance();
  pullFromCloud();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`tab_${tabId}`]).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && isBlacklistedDomain(changeInfo.url)) {
    setTabQuestionBadge(tabId, false);
    chrome.storage.local.remove([`tab_${tabId}`]).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === "NOVEL_DETECTED" && sender.tab) {
    handleNovelDetected(message.data, Boolean(message.confident), sender.tab.id)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "DIAGNOSTIC_LOG") {
    appendDiagnosticLog(message.entry || { event: "UNKNOWN_LOG" })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "SUBMIT_BUG_REPORT") {
    handleSubmitBugReport(message.payload)
      .then((res) => sendResponse(res))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "SCROLL_UPDATED") {
    handleScrollUpdated(message.data)
      .then((res) => sendResponse(res))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "TEST_WHATSAPP") {
    handleTestWhatsapp(message.data)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "IMPORT_DATA") {
    handleImportData(message.payload)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "REFRESH_ICON") {
    refreshBrowserActionAppearance()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "PERFORM_BREAKTHROUGH") {
    withStorageLock(async () => {
      const storage = await chrome.storage.local.get(["stats", "settings", "savedNovels"]);
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      const settings = storage.settings || {};
      const themeId = settings.activeThemeId || "cultivation";

      const res = advanceCultivationBreakthrough(stats, themeId);
      if (res.ok) {
        await chrome.storage.local.set({ stats: res.stats });
        await refreshBrowserActionAppearance();
        await pushToCloudUnlocked(storage.savedNovels || {}, res.stats);
      }
      return res;
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "FORCE_CLOUD_SYNC") {
    withStorageLock(async () => {
      const { savedNovels, stats } = await chrome.storage.local.get(["savedNovels", "stats"]);
      const { migratedNovels, changed } = deduplicateAndMigrateMap(savedNovels || {});
      const cleanStats = evaluateUnlockedTitles({ ...getDefaultStats(), ...(stats || {}) });
      if (changed) {
        await chrome.storage.local.set({ savedNovels: migratedNovels });
      }
      await refreshBrowserActionAppearance();
      await pushToCloudUnlocked(migratedNovels, cleanStats);
    })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "PULL_FROM_CLOUD") {
    pullFromCloud()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

function setTabQuestionBadge(tabId, showQuestion) {
  if (!tabId) return;
  if (showQuestion) {
    chrome.action.setBadgeText({ text: "?", tabId }).catch(() => {});
    chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId }).catch(() => {});
  } else {
    chrome.action.setBadgeText({ tabId }).catch(() => {});
    refreshBrowserActionAppearance();
  }
}

async function handleScrollUpdated(data) {
  if (!data || !data.seriesId) return { ok: false };
  return withStorageLock(async () => {
    const { savedNovels } = await chrome.storage.local.get(["savedNovels"]);
    const novels = savedNovels || {};
    const entry = novels[data.seriesId];
    if (!entry || entry.deleted) return { ok: false };

    if (String(entry.chapter) === String(data.chapter)) {
      entry.scrollPct = Math.min(100, Math.max(0, Number(data.scrollPct) || 0));
      entry.updatedAt = Date.now();
      novels[data.seriesId] = entry;
      await chrome.storage.local.set({ savedNovels: novels });
      return { ok: true };
    }
    return { ok: false };
  });
}

async function handleNovelDetected(novelData, confident, tabId) {
  return withStorageLock(async () => {
    // 1. Descartar de inmediato si es un dominio excluido o URL inválida
    if (!novelData || !novelData.url || isBlacklistedDomain(novelData.url)) {
      setTabQuestionBadge(tabId, false);
      await chrome.storage.local.remove([`tab_${tabId}`]);
      return { ok: false, ignored: true };
    }

    const storage = await chrome.storage.local.get(["savedNovels", "stats"]);
    const rawSaved = storage.savedNovels || {};
    let currentStats = { ...getDefaultStats(), ...(storage.stats || {}) };
    const { migratedNovels: savedNovels } = deduplicateAndMigrateMap(rawSaved);

    const { seriesId, novelUrl } = computeCanonicalSeriesId(novelData, novelData.seriesId || novelData.novelName);
    const existing = savedNovels[seriesId];
    const isAlreadyKnownActive = Boolean(existing && !existing.deleted && !isBogusNovelName(existing.novelName, novelUrl));

    // 2. Si no es una serie ya activa y tampoco tiene novelUrl ni indicios de lectura, ignorar por completo
    if (!isAlreadyKnownActive && !novelUrl && !looksLikeReadingUrl(novelData.url)) {
      setTabQuestionBadge(tabId, false);
      await chrome.storage.local.remove([`tab_${tabId}`]);
      return { ok: false, ignored: true };
    }

    const strippedIncoming = stripChapterFromTitle(novelData.novelName);
    const cleanIncomingName = !isBogusNovelName(strippedIncoming, novelUrl)
      ? strippedIncoming
      : humanizeSlugFromNovelUrl(novelUrl);

    // Resolver capítulos sin número explícito en el texto (ej. capítulos de SkyNovels con solo título literario)
    let resolvedChapterStr = String(novelData.chapter || "1");
    if (resolvedChapterStr === "AUTO_NEXT") {
      if (existing && !existing.deleted) {
        if (existing.url === novelData.url) {
          resolvedChapterStr = String(existing.chapter || "1");
        } else {
          const prevChap = parseFloat(existing.chapter) || 0;
          resolvedChapterStr = String(Math.floor(prevChap + 1));
        }
      } else {
        resolvedChapterStr = "1";
      }
    }

    if ((!confident && !isAlreadyKnownActive) || (!cleanIncomingName && !isAlreadyKnownActive)) {
      // Si la URL no tiene ningún indicio de lectura ni novelUrl, ignorar completamente para evitar falsos positivos
      if (!novelUrl && !looksLikeReadingUrl(novelData.url)) {
        setTabQuestionBadge(tabId, false);
        await chrome.storage.local.remove([`tab_${tabId}`]);
        return { ok: false, ignored: true };
      }

      await chrome.storage.local.set({
        savedNovels,
        [`tab_${tabId}`]: {
          ...novelData,
          chapter: resolvedChapterStr,
          novelName: cleanIncomingName || "",
          seriesId,
          novelUrl,
          unconfirmed: true,
          updatedAt: Date.now()
        }
      });
      await appendDiagnosticLog({
        event: "DETECT_UNCONFIRMED (?)",
        reason: !cleanIncomingName ? "MISSING_VALID_NAME" : "LOW_CONFIDENCE_SERIES_URL",
        url: novelData.url,
        pageTitle: novelData.pageTitle || "",
        rawName: novelData.novelName || "",
        chapter: resolvedChapterStr,
        seriesId
      });
      setTabQuestionBadge(tabId, true);
      return { ok: true, saved: false, unconfirmed: true };
    }

    const customName = existing?.customName && !isBogusNovelName(existing.customName, novelUrl)
      ? stripChapterFromTitle(existing.customName)
      : "";
    let stableNovelName =
      customName ||
      (!isBogusNovelName(existing?.novelName, novelUrl) ? existing.novelName : cleanIncomingName);

    if (!customName && cleanIncomingName && hasRicherFormatting(cleanIncomingName, stableNovelName)) {
      stableNovelName = cleanIncomingName;
    }

    const stableNovelUrl = novelUrl || existing?.novelUrl || "";
    const newChapNum = parseFloat(resolvedChapterStr);
    const prevChapNum = existing && !existing.deleted ? parseFloat(existing.chapter) : NaN;
    const prevMaxCounted = existing && !existing.deleted
      ? parseFloat(existing.maxCounted ?? existing.chapter)
      : NaN;

    let chaptersToCount = 0;
    let isNewNovelStarted = false;
    let newMaxCounted = !isNaN(prevMaxCounted) ? prevMaxCounted : (!isNaN(newChapNum) ? newChapNum : 0);
    let alertObj = existing?.alert || null;
    let scrollPct = 0;
    let restoreScrollPct = 0;

    if (!existing || existing.deleted) {
      if (!novelUrl && !looksLikeReadingUrl(novelData.url)) {
        setTabQuestionBadge(tabId, false);
        await chrome.storage.local.remove([`tab_${tabId}`]);
        return { ok: false, ignored: true };
      }
      chaptersToCount = 1;
      isNewNovelStarted = true;
      newMaxCounted = !isNaN(newChapNum) ? newChapNum : 1;
      alertObj = null;
      scrollPct = 0;
    } else if (!isNaN(newChapNum) && !isNaN(prevChapNum)) {
      const diffFromSaved = newChapNum - prevChapNum;

      if (diffFromSaved > 1) {
        alertObj = {
          type: "jump",
          from: String(existing.chapter),
          to: resolvedChapterStr,
          createdAt: Date.now()
        };
      } else if (
        diffFromSaved === 0 &&
        existing.lastTabId &&
        existing.lastTabId !== tabId &&
        Date.now() - (existing.updatedAt || 0) > 60000
      ) {
        alertObj = {
          type: "repeat",
          chapter: resolvedChapterStr,
          createdAt: Date.now()
        };
      } else if (diffFromSaved === 1) {
        alertObj = null;
      }

      if (String(existing.chapter) === resolvedChapterStr) {
        scrollPct = typeof existing.scrollPct === "number" ? existing.scrollPct : 0;
        restoreScrollPct = scrollPct;
      } else {
        scrollPct = 0;
        restoreScrollPct = 0;
      }

      const diffFromMax = newChapNum - newMaxCounted;
      if (diffFromMax >= 1 && diffFromMax <= 3) {
        chaptersToCount = Math.round(diffFromMax);
        newMaxCounted = newChapNum;
      } else if (diffFromMax > 3) {
        newMaxCounted = newChapNum;
      }
    }

    if (chaptersToCount > 0 || isNewNovelStarted) {
      currentStats = recordCultivationProgress(currentStats, chaptersToCount, isNewNovelStarted, 0);
    }

    const updatedEntry = {
      seriesId,
      novelName: stableNovelName,
      novelUrl: stableNovelUrl,
      url: novelData.url,
      chapter: resolvedChapterStr,
      maxCounted: newMaxCounted,
      scrollPct,
      statusManual: existing?.statusManual || "",
      completedCounted: Boolean(existing?.completedCounted),
      alert: alertObj,
      lastTabId: tabId,
      updatedAt: novelData.updatedAt || Date.now()
    };
    if (customName) {
      updatedEntry.customName = customName;
    }

    savedNovels[seriesId] = updatedEntry;

    await chrome.storage.local.set({
      savedNovels,
      stats: currentStats,
      [`tab_${tabId}`]: { ...updatedEntry, unconfirmed: false }
    });
    chrome.storage.sync.set({ savedNovels }).catch(() => {});

    await appendDiagnosticLog({
      event: "DETECT_SAVED_OK",
      novelName: stableNovelName,
      chapter: resolvedChapterStr,
      seriesId,
      novelUrl: stableNovelUrl,
      url: novelData.url
    });

    setTabQuestionBadge(tabId, false);
    chrome.alarms.clear(`inactive_${tabId}`);

    await refreshBrowserActionAppearance();
    await pushToCloudUnlocked(savedNovels, currentStats);
    return { ok: true, saved: true, seriesId, chapter: resolvedChapterStr, restoreScrollPct };
  });
}

async function handleTestWhatsapp(data) {
  await initI18n();
  const storage = await chrome.storage.local.get(["settings"]);
  const settings = { ...(storage.settings || {}), ...(data || {}) };
  const phone = String(settings.phone || "").replace(/[^0-9]/g, "");
  const apiKey = String(settings.apiKey || "").trim();

  if (!phone || !apiKey) {
    settings.whatsappStatus = "unconfigured";
    await chrome.storage.local.set({ settings });
    return { ok: false, status: "unconfigured" };
  }

  const textMsg = t("wa_msg_test");
  const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(textMsg)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(waUrl);
    const bodyText = await res.text().catch(() => "");
    const isErrorBody = /error|invalid|not activated/i.test(bodyText);
    if (res.ok && !isErrorBody) {
      settings.whatsappStatus = "working";
      await chrome.storage.local.set({ settings });
      return { ok: true, status: "working" };
    }
    settings.whatsappStatus = "error";
    await chrome.storage.local.set({ settings });
    await appendDiagnosticLog({ event: "WHATSAPP_TEST_FAIL", status: res.status });
    return { ok: false, status: "error" };
  } catch (err) {
    settings.whatsappStatus = "error";
    await chrome.storage.local.set({ settings });
    await appendDiagnosticLog({ event: "WHATSAPP_NETWORK_ERROR", error: String(err) });
    return { ok: false, status: "error" };
  }
}

async function handleImportData(payload) {
  return withStorageLock(async () => {
    if (!payload || typeof payload !== "object") {
      return { ok: false };
    }

    const storage = await chrome.storage.local.get(["savedNovels", "stats", "settings"]);
    const localNovels = storage.savedNovels || {};
    const incomingNovels = payload.novels && typeof payload.novels === "object" ? payload.novels : {};

    let added = 0;
    let updated = 0;
    let skipped = 0;

    const combinedNovels = { ...localNovels };

    for (const [rawKey, incEntry] of Object.entries(incomingNovels)) {
      if (!incEntry || typeof incEntry !== "object") continue;
      const { seriesId } = computeCanonicalSeriesId(incEntry, incEntry.seriesId || rawKey);
      const localEntry = combinedNovels[seriesId];

      if (!localEntry) {
        combinedNovels[seriesId] = { ...incEntry, seriesId };
        if (!incEntry.deleted) added++;
      } else if ((incEntry.updatedAt || 0) > (localEntry.updatedAt || 0)) {
        combinedNovels[seriesId] = { ...localEntry, ...incEntry, seriesId };
        updated++;
      } else {
        skipped++;
      }
    }

    const { migratedNovels } = deduplicateAndMigrateMap(combinedNovels);
    const mergedStats = mergeStatsObjects(storage.stats, payload.stats);

    const currentSettings = storage.settings || {};
    const incSettings = payload.settings || {};
    const mergedSettings = {
      ...currentSettings,
      language: incSettings.language || currentSettings.language || detectDefaultLanguage(),
      pauseDays: Number(incSettings.pauseDays) || Number(currentSettings.pauseDays) || 30,
      dropDays: Number(incSettings.dropDays) || Number(currentSettings.dropDays) || 90,
      waitMinutes: Number(incSettings.waitMinutes) || Number(currentSettings.waitMinutes) || 1,
      enableWhatsapp: currentSettings.enableWhatsapp ?? Boolean(incSettings.enableWhatsapp)
    };

    await chrome.storage.local.set({
      savedNovels: migratedNovels,
      stats: mergedStats,
      settings: mergedSettings
    });

    await refreshBrowserActionAppearance();
    await pushToCloudUnlocked(migratedNovels, mergedStats);
    return { ok: true, added, updated, skipped };
  });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const currentTabId = activeInfo.tabId;
  chrome.alarms.clear(`inactive_${currentTabId}`);

  const allData = await chrome.storage.local.get(null);
  const settings = allData.settings || { enableWhatsapp: false, waitMinutes: 1 };
  if (!settings.enableWhatsapp) return;

  const waitMinutes = parseFloat(settings.waitMinutes) || 1;

  for (const key of Object.keys(allData)) {
    if (key.startsWith("tab_")) {
      const tabData = allData[key];
      if (!tabData || tabData.unconfirmed) continue;
      const tabId = parseInt(key.replace("tab_", ""), 10);
      if (tabId !== currentTabId) {
        const alarmName = `inactive_${tabId}`;
        const existingAlarm = await chrome.alarms.get(alarmName);
        if (!existingAlarm) {
          chrome.alarms.create(alarmName, { delayInMinutes: waitMinutes });
        }
      }
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const tabKey = `tab_${tabId}`;
  const storage = await chrome.storage.local.get([tabKey, "settings"]);
  const tabData = storage[tabKey];
  const settings = storage.settings || { enableWhatsapp: false, waitMinutes: 1 };

  if (tabData && !tabData.unconfirmed && settings.enableWhatsapp) {
    const waitMinutes = parseFloat(settings.waitMinutes) || 1;
    chrome.alarms.create(`inactive_${tabId}`, { delayInMinutes: waitMinutes });
  } else {
    await chrome.storage.local.remove([tabKey]);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "periodic_cloud_sync") {
    await pullFromCloud();
    return;
  }

  if (!alarm.name.startsWith("inactive_")) return;

  await initI18n();
  const tabId = alarm.name.replace("inactive_", "");
  const tabKey = `tab_${tabId}`;
  const storage = await chrome.storage.local.get([tabKey, "notifiedHistory", "settings", "savedNovels"]);

  const tabNovel = storage[tabKey];
  const history = storage.notifiedHistory || {};
  const settings = storage.settings || {};
  const savedNovels = storage.savedNovels || {};

  try {
    await chrome.tabs.get(parseInt(tabId, 10));
  } catch {
    await chrome.storage.local.remove([tabKey]);
  }

  if (!tabNovel || tabNovel.unconfirmed || !settings.enableWhatsapp) return;
  if (!settings.phone || !settings.apiKey) return;

  const currentSaved = savedNovels[tabNovel.seriesId] || tabNovel;
  if (currentSaved.deleted) return;

  const historyKey = currentSaved.seriesId || currentSaved.novelName;
  if (history[historyKey] === String(currentSaved.chapter)) return;

  const displayName = currentSaved.customName || currentSaved.novelName;
  const textMsg = t("wa_msg_paused", {
    name: displayName,
    chapter: currentSaved.chapter,
    url: currentSaved.url
  });
  const encodedText = encodeURIComponent(textMsg);
  const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${settings.phone}&text=${encodedText}&apikey=${settings.apiKey}`;

  try {
    const res = await fetch(waUrl);
    if (res.ok) {
      history[historyKey] = String(currentSaved.chapter);
      settings.whatsappStatus = "working";
      await chrome.storage.local.set({ notifiedHistory: history, settings });
    } else {
      settings.whatsappStatus = "error";
      await chrome.storage.local.set({ settings });
    }
  } catch (err) {
    settings.whatsappStatus = "error";
    await chrome.storage.local.set({ settings });
  }
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  await initI18n();
  const query = String(text || "").toLowerCase().trim();
  const { savedNovels } = await chrome.storage.local.get(["savedNovels"]);
  const novels = Object.values(savedNovels || {})
    .filter((n) => n && !n.deleted && (n.customName || n.novelName))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const matches = novels
    .filter((n) => {
      const name = String(n.customName || n.novelName).toLowerCase();
      return !query || name.includes(query);
    })
    .slice(0, 5);

  const suggestions = matches.map((n) => {
    const name = String(n.customName || n.novelName).replace(/[&<>"']/g, "");
    const domain = extractDomain(n.novelUrl || n.url);
    return {
      content: n.url,
      description: t("omnibox_suggestion", { name, chapter: n.chapter, domain })
    };
  });

  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const input = String(text || "").trim();
  if (/^https?:\/\//i.test(input)) {
    openUrlInDisposition(input, disposition);
    return;
  }

  const query = input.toLowerCase();
  const { savedNovels } = await chrome.storage.local.get(["savedNovels"]);
  const novels = Object.values(savedNovels || {})
    .filter((n) => n && !n.deleted && (n.customName || n.novelName))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const match = novels.find((n) => String(n.customName || n.novelName).toLowerCase().includes(query)) || novels[0];
  if (match && match.url) {
    openUrlInDisposition(match.url, disposition);
  }
});

function openUrlInDisposition(url, disposition) {
  if (disposition === "currentTab") {
    chrome.tabs.update({ url });
  } else if (disposition === "newBackgroundTab") {
    chrome.tabs.create({ url, active: false });
  } else {
    chrome.tabs.create({ url, active: true });
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "continue-latest-novel") {
    const { savedNovels } = await chrome.storage.local.get(["savedNovels"]);
    const novels = Object.values(savedNovels || {})
      .filter((n) => n && !n.deleted && n.url)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (novels.length > 0) {
      chrome.tabs.create({ url: novels[0].url });
    }
  }
});

async function getValidAuth() {
  const { auth } = await chrome.storage.local.get(["auth"]);
  if (!auth || !auth.refreshToken) return null;

  if (auth.expiresAt && Date.now() < auth.expiresAt - 300000) {
    return auth;
  }

  try {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: auth.refreshToken
      })
    });
    const data = await res.json();
    if (data.id_token) {
      const updatedAuth = {
        ...auth,
        idToken: data.id_token,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + parseInt(data.expires_in, 10) * 1000
      };
      await chrome.storage.local.set({ auth: updatedAuth });
      return updatedAuth;
    }
  } catch (e) {
    console.error("Error renovando sesión:", e);
  }
  return null;
}

async function pushToCloudUnlocked(novelsMap, statsObj) {
  const auth = await getValidAuth();
  if (!auth) return;

  const safePayload = {};
  for (const [k, v] of Object.entries(novelsMap || {})) {
    const safeKey = sanitizeRtdbKey(k);
    safePayload[safeKey] = v;
  }

  const dbCleanUrl = FIREBASE_DB_URL.replace(/\/$/, "");
  try {
    const promises = [
      fetch(`${dbCleanUrl}/users/${auth.uid}/novels.json?auth=${auth.idToken}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safePayload)
      })
    ];

    if (statsObj) {
      promises.push(
        fetch(`${dbCleanUrl}/users/${auth.uid}/stats.json?auth=${auth.idToken}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statsObj)
        })
      );
    }

    await Promise.all(promises);
  } catch (e) {
    await appendDiagnosticLog({ event: "CLOUD_PUSH_ERROR", error: String(e) });
  }
}

async function pullFromCloud() {
  return withStorageLock(async () => {
    const { savedNovels, stats } = await chrome.storage.local.get(["savedNovels", "stats"]);
    const localMig = deduplicateAndMigrateMap(savedNovels || {});
    let localStats = evaluateUnlockedTitles({ ...getDefaultStats(), ...(stats || {}) });

    if (localMig.changed) {
      await chrome.storage.local.set({ savedNovels: localMig.migratedNovels });
    }

    const auth = await getValidAuth();
    if (!auth) {
      await refreshBrowserActionAppearance();
      return;
    }

    const dbCleanUrl = FIREBASE_DB_URL.replace(/\/$/, "");
    try {
      const [novelsRes, statsRes] = await Promise.all([
        fetch(`${dbCleanUrl}/users/${auth.uid}/novels.json?auth=${auth.idToken}`),
        fetch(`${dbCleanUrl}/users/${auth.uid}/stats.json?auth=${auth.idToken}`)
      ]);

      const rawCloudNovels = novelsRes.ok ? (await novelsRes.json()) || {} : {};
      const rawCloudStats = statsRes.ok ? (await statsRes.json()) || null : null;

      const cloudMig = deduplicateAndMigrateMap(rawCloudNovels);
      const cloudMap = cloudMig.migratedNovels;
      const localMap = localMig.migratedNovels;

      const allKeys = new Set([...Object.keys(cloudMap), ...Object.keys(localMap)]);
      const preMerged = {};
      const now = Date.now();
      let shouldPush = cloudMig.changed || localMig.changed;

      for (const key of allKeys) {
        const cItem = cloudMap[key];
        const lItem = localMap[key];

        let winner = null;
        let older = null;

        if (cItem && lItem) {
          if ((lItem.updatedAt || 0) > (cItem.updatedAt || 0)) {
            winner = lItem;
            older = cItem;
            shouldPush = true;
          } else {
            winner = cItem;
            older = lItem;
          }
        } else if (lItem) {
          winner = lItem;
          shouldPush = true;
        } else if (cItem) {
          winner = cItem;
        }

        if (!winner) continue;

        if (winner.deleted === true) {
          if (now - (winner.updatedAt || 0) <= THIRTY_DAYS_MS) {
            preMerged[key] = {
              seriesId: key,
              deleted: true,
              updatedAt: winner.updatedAt || now
            };
          } else {
            shouldPush = true;
          }
          continue;
        }

        const refUrl = winner.novelUrl || older?.novelUrl || winner.url || "";
        const customName =
          (winner.customName && !isBogusNovelName(winner.customName, refUrl) ? stripChapterFromTitle(winner.customName) : "") ||
          (older?.customName && !isBogusNovelName(older.customName, refUrl) ? stripChapterFromTitle(older.customName) : "");

        const validWinnerName = !isBogusNovelName(winner.novelName, refUrl) ? stripChapterFromTitle(winner.novelName) : "";
        const validOlderName = older && !isBogusNovelName(older.novelName, refUrl) ? stripChapterFromTitle(older.novelName) : "";
        let bestName = customName || validWinnerName || validOlderName;
        if (!customName && validOlderName && hasRicherFormatting(validOlderName, bestName)) {
          bestName = validOlderName;
        }

        const maxCounted = Math.max(
          parseFloat(winner.maxCounted ?? winner.chapter) || 0,
          parseFloat(older?.maxCounted ?? older?.chapter) || 0
        );

        const finalEntry = {
          ...winner,
          seriesId: key,
          novelName: bestName || humanizeSlugFromNovelUrl(refUrl),
          novelUrl: winner.novelUrl || older?.novelUrl || "",
          maxCounted,
          completedCounted: Boolean(winner.completedCounted || older?.completedCounted)
        };
        if (customName) {
          finalEntry.customName = customName;
        }

        preMerged[key] = finalEntry;
      }

      const finalPass = deduplicateAndMigrateMap(preMerged);
      const mergedStats = rawCloudStats ? mergeStatsObjects(localStats, rawCloudStats) : localStats;

      if (!rawCloudStats || (mergedStats.updatedAt || 0) > (rawCloudStats.updatedAt || 0)) {
        shouldPush = true;
      }

      await chrome.storage.local.set({
        savedNovels: finalPass.migratedNovels,
        stats: mergedStats
      });

      await refreshBrowserActionAppearance();

      if (shouldPush || finalPass.changed) {
        await pushToCloudUnlocked(finalPass.migratedNovels, mergedStats);
      }
    } catch (e) {
      await appendDiagnosticLog({ event: "CLOUD_PULL_ERROR", error: String(e) });
    }
  });
}