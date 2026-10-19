importScripts("i18n.js");
try {
  importScripts("achievements_data.js");
} catch (_e) {
  console.error("[Background] Error cargando achievements_data.js:", _e);
}

// ================= CONFIGURACIÓN DE NUBE (FIREBASE) =================
const FIREBASE_API_KEY = "AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU";
const FIREBASE_DB_URL = "https://novel-tracker-1d134-default-rtdb.firebaseio.com";
// ====================================================================

function getFirebaseUrl(path, idToken) {
  const dbCleanUrl = (typeof FIREBASE_DB_URL !== "undefined" && FIREBASE_DB_URL)
    ? FIREBASE_DB_URL.replace(/\/+$/, "")
    : "https://novel-tracker-1d134-default-rtdb.firebaseio.com";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const authQuery = idToken ? `?auth=${encodeURIComponent(idToken)}` : "";
  return `${dbCleanUrl}${cleanPath}${authQuery}`;
}

function verifyExportIntegrity(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "INVALID_STRUCTURE" };
  }
  let target = payload;
  if (payload.exportMetadata && payload.data) {
    if (typeof payload.exportMetadata !== "object" || Array.isArray(payload.exportMetadata)) {
      return { ok: false, error: "INVALID_METADATA" };
    }
    if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
      return { ok: false, error: "INVALID_DATA" };
    }
    target = payload.data;
  }
  const hasNovels = (target.novels && typeof target.novels === "object") || (target.savedNovels && typeof target.savedNovels === "object");
  const hasStats = target.stats && typeof target.stats === "object" && !Array.isArray(target.stats);
  const hasSettings = target.settings && typeof target.settings === "object" && !Array.isArray(target.settings);
  const hasBlacklist = Array.isArray(target.domainBlacklist);
  if (!hasNovels && !hasStats && !hasSettings && !hasBlacklist) {
    return { ok: false, error: "NO_VALID_DATA_FOUND" };
  }
  return { ok: true };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DIAGNOSTIC_LOGS = 25;
const CHAPTER_STRIP_PATH_REGEX = /^(.*?)(?:\/|-|_)(?:chapters?|cap[ií]tulos?|capitulos?|episodes?|episodios?|partes?|secci[oó]n|secciones|sections?|ch|cap|ep|c|bab)[-_\/.]?\d+(?:[._-]\d+)?(?:\.html?|\/.*)?$/i;
const CHAPTER_URL_REGEX = /(?:\/|-|_|\b)(?:chapters?|cap[ií]tulos?|capitulos?|episodes?|episodios?|partes?|secci[oó]n|secciones|sections?|ch|cap|ep|c|bab)[-_\/.]?(\d{1,7}(?:[.-]\d{1,2})?)(?:\/|$|\?|#|-|_)/i;
const INLINE_CHAPTER_CUT_REGEX = /\s*[-–—|:«»]*\s*(?:chapters?|cap[ií]tulos?|capitulos?|episodes?|episodios?|partes?|secci[oó]n|secciones|sections?|ch(?:[\s._-]|\\.)|cap(?:[\s._-]|\\.)|ep(?:[\s._-]|\\.)|c(?:[\s._-]|\\.)|bab|#)\s*#?\s*\d+.*$/i;
const TRAILING_MEDIA_SUFFIX_REGEX = /\s+\b(?:manhwa|manhua|manga|webtoon|novela\s*ligera|light\s*novel|web\s*novel|novela|novel|comic|raw|sub\s*espa[ñn]ol|en\s*espa[ñn]ol|online|gratis|free)\b\s*$/i;

const CATALOG_SEGMENTS = new Set([
  "novelas", "novela", "novels", "novel", "series", "serie",
  "manga", "mangas", "manhwa", "manhwas", "manhua", "manhuas",
  "webtoon", "webtoons", "comic", "comics", "webcomic", "webcomics",
  "book", "books", "obras", "obra", "lectura", "leer", "ver", "read",
  "title", "titles"
]);

const READER_SEGMENTS = new Set(["leer", "ver", "read", "lectura", "viewer"]);

const BOGUS_NAMES = new Set([
  "novela_web", "homeinicio", "home_inicio", "inicio", "home", "portada",
  "index", "indice", "novelas", "novela", "novels", "novel", "series",
  "serie", "manga", "manhwa", "menu_book", "menu_booknovelas", "volver",
  "anterior", "siguiente", "leer", "ver", "episodios", "episodio",
  "capitulos", "capitulo", "chapters", "chapter", "lista", "lista_de_capitulos",
  "lista_de_episodios", "detalles", "ficha", "info", "informacion", "directorio",
  "sumario", "contenido", "catalogo", "biblioteca", "obra", "obras",
  "comic_episode", "comic_episodes", "webcomic_episode", "webcomic_episodes",
  "comic_chapter", "comic_chapters", "webcomic", "webcomics", "comic", "comics"
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

function normalizeDomain(input) {
  if (!input || typeof input !== "string") return "";
  let raw = input.trim().toLowerCase();
  raw = raw.replace(/^[a-z0-9+.-]+:\/\//i, "");
  if (raw.includes("@")) {
    raw = raw.split("@").pop();
  }
  raw = raw.split(/[/?#]/)[0];
  raw = raw.split(":")[0];
  raw = raw.replace(/^www\./i, "");
  raw = raw.replace(/^\*+\.?/i, "");
  raw = raw.replace(/^\.+|\.+$/g, "");
  return raw.trim();
}

function matchesDomainPattern(host, pattern) {
  if (!host || !pattern) return false;
  const cleanHost = normalizeDomain(host);
  const cleanPattern = normalizeDomain(pattern);
  if (!cleanHost || !cleanPattern) return false;

  if (cleanHost === cleanPattern) return true;
  if (cleanHost.endsWith("." + cleanPattern)) return true;
  return false;
}

let cachedDomainBlacklist = [];

async function getStoredDomainBlacklist() {
  try {
    const { domainBlacklist } = await chrome.storage.local.get(["domainBlacklist"]);
    if (Array.isArray(domainBlacklist)) {
      const normalizedList = domainBlacklist
        .map((item) => {
          if (typeof item === "string") {
            const d = normalizeDomain(item);
            return d ? { domain: d, addedAt: Date.now() } : null;
          }
          const d = normalizeDomain(item?.domain);
          return d ? { domain: d, addedAt: Number(item?.addedAt) || Date.now() } : null;
        })
        .filter(Boolean);
      cachedDomainBlacklist = normalizedList;
      return normalizedList;
    }
    await chrome.storage.local.set({ domainBlacklist: [] });
    cachedDomainBlacklist = [];
    return [];
  } catch {
    return cachedDomainBlacklist || [];
  }
}

async function isDomainBlacklisted(urlOrHost) {
  if (!urlOrHost) return false;
  if (isBlacklistedDomain(urlOrHost)) return true;

  const cleanHost = normalizeDomain(urlOrHost);
  if (!cleanHost) return false;

  const list = await getStoredDomainBlacklist();
  for (const item of list) {
    const pattern = typeof item === "string" ? item : item?.domain;
    if (matchesDomainPattern(cleanHost, pattern)) {
      return true;
    }
  }
  return false;
}

function isHostBlacklistedSync(urlOrHost, userBlacklist = cachedDomainBlacklist) {
  if (!urlOrHost) return false;
  if (isBlacklistedDomain(urlOrHost)) return true;

  const cleanHost = normalizeDomain(urlOrHost);
  if (!cleanHost) return false;

  const list = Array.isArray(userBlacklist) ? userBlacklist : cachedDomainBlacklist;
  for (const item of list) {
    const pattern = typeof item === "string" ? item : item?.domain;
    if (matchesDomainPattern(cleanHost, pattern)) {
      return true;
    }
  }
  return false;
}

async function addDomainToBlacklist(rawDomain, customAddedAt = null) {
  const domain = normalizeDomain(rawDomain).slice(0, 253);
  if (!domain || !domain.includes(".")) {
    return { ok: false, error: "invalid_domain" };
  }

  let alreadyExists = false;
  let updatedList = [];

  await withStorageLock(async () => {
    const currentList = await getStoredDomainBlacklist();
    const exists = currentList.some((item) => normalizeDomain(item.domain) === domain);
    if (exists) {
      alreadyExists = true;
      updatedList = currentList;
      return;
    }

    const addedAt = typeof customAddedAt === "number" ? customAddedAt : Date.now();
    updatedList = [{ domain, addedAt }, ...currentList];
    cachedDomainBlacklist = updatedList;
    await chrome.storage.local.set({ domainBlacklist: updatedList });
  });

  if (alreadyExists) {
    return { ok: true, alreadyExists: true, domainBlacklist: updatedList };
  }

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CHECK_BLACKLIST_AND_DISMISS", blockedDomain: domain }).catch(() => {});
        if (tab.url && matchesDomainPattern(tab.url, domain)) {
          setTabQuestionBadge(tab.id, false);
          await chrome.storage.local.remove([`tab_${tab.id}`]);
          chrome.tabs.sendMessage(tab.id, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
        }
      }
    }
  } catch {}

  await pushDomainBlacklistToCloud(updatedList);
  return { ok: true, domainBlacklist: updatedList };
}

async function removeDomainFromBlacklist(rawDomain) {
  const domain = normalizeDomain(rawDomain);
  let updatedList = [];
  await withStorageLock(async () => {
    const currentList = await getStoredDomainBlacklist();
    updatedList = currentList.filter((item) => normalizeDomain(item.domain) !== domain);
    cachedDomainBlacklist = updatedList;
    await chrome.storage.local.set({ domainBlacklist: updatedList });
  });
  await pushDomainBlacklistToCloud(updatedList);
  return { ok: true, domainBlacklist: updatedList };
}

async function clearDomainBlacklist() {
  await withStorageLock(async () => {
    cachedDomainBlacklist = [];
    await chrome.storage.local.set({ domainBlacklist: [] });
  });
  await pushDomainBlacklistToCloud([]);
  return { ok: true, domainBlacklist: [] };
}

async function pushDomainBlacklistToCloud(list) {
  const auth = await getValidAuth();
  if (!auth) return;
  try {
    const payload = Array.isArray(list) ? list : await getStoredDomainBlacklist();
    await fetch(getFirebaseUrl(`/users/${auth.uid}/domainBlacklist.json`, auth.idToken), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    await appendDiagnosticLog({ event: "CLOUD_BLACKLIST_PUSH_ERROR", error: String(e) });
  }
}

const NON_READER_SUBPAGE_REGEX = /\/(?:reviews?|comments?|threads?|forum|community|characters?|author|stats|statistics|gallery|recommendations|about|info|details|glossary|fan-?art|edit|settings|tos|privacy|contact)(?:\.(?:html?|php|asp[x]?))?(?:[\/?#]|$)/i;
const CHAPTER_LISTING_SUBPAGE_REGEX = /\/(?:toc|table-of-contents|chapters|capitulos|indice|index)(?:\.(?:html?|php|asp[x]?))?(?:[\/?#]|$)/i;

function isInformationalOrNonReaderUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const u = new URL(urlStr);
    const path = u.pathname.toLowerCase();
    if (NON_READER_SUBPAGE_REGEX.test(path)) return true;
    if (CHAPTER_LISTING_SUBPAGE_REGEX.test(path) && !CHAPTER_URL_REGEX.test(path)) {
      return true;
    }
  } catch {}
  return false;
}

function looksLikeReadingUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  if (isInformationalOrNonReaderUrl(urlStr)) return false;
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (isHostBlacklistedSync(host)) return false;
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

if (typeof THEMES_CONFIG === "undefined" && typeof require === "function") {
  try {
    const achData = require("./achievements_data.js");
    Object.assign(globalThis, achData);
  } catch (_e) {}
}

var THEMES_CONFIG = globalThis.THEMES_CONFIG || (typeof THEMES_CONFIG !== "undefined" ? THEMES_CONFIG : null);
var CULTIVATION_REALMS = globalThis.CULTIVATION_REALMS || (THEMES_CONFIG ? THEMES_CONFIG.cultivation.realms : []);
var ALL_TITLES = globalThis.ALL_TITLES || [];
var TITLE_CONFIG = globalThis.TITLE_CONFIG || {};
var TITLE_BADGE_COLORS = globalThis.TITLE_BADGE_COLORS || {};
var TITLE_BADGE_SYMBOLS = globalThis.TITLE_BADGE_SYMBOLS || {};
var CULTIVATION_TITLES = globalThis.CULTIVATION_TITLES || [];

let storageMutex = Promise.resolve();
function withStorageLock(task) {
  const next = storageMutex.then(() => task());
  storageMutex = next.catch((err) => console.error("Error en cola de storage:", err));
  return next;
}

// ================= SISTEMA DE LOGS DE DIAGNÓSTICO Y REPORTES =================

function getHostnameFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const candidate = rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`;
    return new URL(candidate).hostname || "";
  } catch {
    return "";
  }
}

async function clearInactiveAlarms() {
  try {
    if (chrome.alarms && typeof chrome.alarms.getAll === "function") {
      const allAlarms = await new Promise((resolve) => {
        try {
          const res = chrome.alarms.getAll((alarms) => resolve(alarms));
          if (res && typeof res.then === "function") res.then(resolve);
        } catch {
          resolve([]);
        }
      });
      if (Array.isArray(allAlarms)) {
        for (const a of allAlarms) {
          if (a && a.name && a.name.startsWith("inactive_")) {
            chrome.alarms.clear(a.name);
          }
        }
      }
    }
  } catch {}

  try {
    const all = await chrome.storage.local.get(null);
    for (const k of Object.keys(all || {})) {
      if (k.startsWith("tab_")) {
        const tid = k.replace("tab_", "");
        if (chrome.alarms?.clear) {
          chrome.alarms.clear(`inactive_${tid}`);
        }
      }
    }
  } catch {}
}

async function appendDiagnosticLog(entry) {
  try {
    const safeEntry = { ...entry };
    for (const key of Object.keys(safeEntry)) {
      if ((key.toLowerCase().endsWith("url") || key === "url" || key === "href") && typeof safeEntry[key] === "string" && safeEntry[key]) {
        safeEntry[key] = getHostnameFromUrl(safeEntry[key]) || safeEntry[key];
      }
    }
    const { diagnosticLogs } = await chrome.storage.local.get(["diagnosticLogs"]);
    const logs = Array.isArray(diagnosticLogs) ? diagnosticLogs : [];
    logs.unshift({
      ts: new Date().toISOString(),
      ...safeEntry
    });
    if (logs.length > MAX_DIAGNOSTIC_LOGS) {
      logs.length = MAX_DIAGNOSTIC_LOGS;
    }
    await chrome.storage.local.set({ diagnosticLogs: logs });
  } catch {}
}

function sanitizeLogsForReport(logs) {
  const sensitiveRegex = /token|auth|pass|secret|key|cred|bearer|cookie|session|jwt|authorization/i;

  function cleanString(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/\/\/[^:]+:[^@]+@/g, "//[CREDENTIALS_REDACTED]@")
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[API_KEY_REDACTED]")
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, "[JWT_REDACTED]")
      .replace(/(key|auth|token|secret|password|bearer|api_key|access_token|refresh_token)=([A-Za-z0-9_\-.~%]+)/gi, "$1=[REDACTED]")
      .replace(/(?:Bearer\s+)[A-Za-z0-9_\-.~+/=]+/gi, "Bearer [REDACTED]")
      .slice(0, 500);
  }

  function sanitizeValue(val, depth = 0) {
    if (val === null || val === undefined) return null;
    if (typeof val === "string") return cleanString(val);
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "boolean") return val;

    if (depth < 2 && typeof val === "object") {
      if (Array.isArray(val)) {
        return val.slice(0, 8).map((el) => {
          if (typeof el === "string") return cleanString(el).slice(0, 200);
          if (typeof el === "number" && Number.isFinite(el)) return el;
          if (typeof el === "boolean") return el;
          return null;
        }).filter((el) => el !== null);
      }

      const cleanObj = {};
      const entries = Object.entries(val).slice(0, 10);
      for (const [subK, subV] of entries) {
        if (!/^[A-Za-z0-9_]{1,40}$/.test(subK)) continue;
        if (sensitiveRegex.test(subK)) continue;
        const subSanitized = sanitizeValue(subV, depth + 1);
        if (subSanitized !== null && subSanitized !== undefined) {
          cleanObj[subK] = subSanitized;
        }
      }
      return cleanObj;
    }
    return null;
  }

  return (Array.isArray(logs) ? logs : []).slice(0, 8).map((entry) => {
    const out = {};
    const src = entry && typeof entry === "object" ? entry : {};
    for (const [k, v] of Object.entries(src)) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) continue;
      if (sensitiveRegex.test(k)) continue;
      const sanitized = sanitizeValue(v, 0);
      if (sanitized !== null && sanitized !== undefined) {
        out[k] = sanitized;
      }
    }
    return out;
  });
}

async function handleSubmitBugReport(payload) {
  const category = String(payload?.category || "other").slice(0, 40);
  const message = String(payload?.message || "").trim().slice(0, 1400);
  const attachLogs = Boolean(payload?.attachLogs);
  const includeEmail = Boolean(payload?.includeEmail);

  if (!message) return { ok: false, error: "empty" };

  const storage = await chrome.storage.local.get(["diagnosticLogs", "auth"]);
  let activeTabInfo = null;
  if (attachLogs) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && !tab.incognito) {
        const sanitizedTabLogs = sanitizeLogsForReport([{ url: tab.url, title: tab.title }]);
        const sanitizedTab = sanitizedTabLogs[0] || {};
        activeTabInfo = {
          url: String(sanitizedTab.url || "").slice(0, 1024),
          title: String(sanitizedTab.title || "").slice(0, 300)
        };
      }
    } catch {}
  }

  let activeAuth = null;
  try {
    activeAuth = typeof getValidAuth === "function" ? await getValidAuth(true) : storage.auth;
  } catch {
    activeAuth = storage.auth;
  }
  if (!activeAuth && storage.auth) {
    activeAuth = storage.auth;
  }

  if (!activeAuth || !activeAuth.idToken) {
    if (typeof initI18n === "function") {
      try { await initI18n(); } catch {}
    }
    const errorMsg = (typeof t === "function" ? t("report_auth_required_err") : null) ||
      ((typeof currentLang !== "undefined" && currentLang === "en")
        ? "Sign in to send reports or write to us at mynovelsystem@gmail.com"
        : "Inicia sesión para enviar reportes o escríbenos a mynovelsystem@gmail.com");
    return { ok: false, error: "AUTH_REQUIRED", message: errorMsg };
  }

  const userEmail = (includeEmail && activeAuth?.email) ? String(activeAuth.email).trim() : "anonymous";
  const sanitizedRecentLogs = attachLogs ? sanitizeLogsForReport(storage.diagnosticLogs) : null;

  const reportData = {
    category,
    message,
    createdAt: Date.now(),
    createdIso: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
    userEmail
  };

  if (attachLogs && activeTabInfo && Object.keys(activeTabInfo).length > 0) {
    reportData.activeTab = activeTabInfo;
  }
  if (attachLogs && Array.isArray(sanitizedRecentLogs) && sanitizedRecentLogs.length > 0) {
    reportData.recentLogs = sanitizedRecentLogs.slice(0, 8);
  }

  const reportsEndpoint = getFirebaseUrl("/reports.json", activeAuth.idToken);

  try {
    const res = await fetch(reportsEndpoint, {
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

let refreshIconDebounceTimer = null;
let lastRenderedStateKey = null;

function resetRenderedStateKey() {
  lastRenderedStateKey = null;
}

const TIER_ROMAN = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
  6: "VI", 7: "VII", 8: "VIII", 9: "IX"
};

const RARITY_BADGE_COLORS = (typeof BADGE_RARITY_COLORS !== "undefined")
  ? BADGE_RARITY_COLORS
  : {
      common: "#d97706",
      rare: "#06b6d4",
      epic: "#c084fc",
      legendary: "#fbbf24",
      negative: "#e11d48"
    };

const BASE_TOOLBAR_ICONS = {
  16: "assets/icon16.png",
  24: "assets/icon32.png",
  32: "assets/icon32.png",
  48: "assets/icon48.png"
};

function getToolbarIconPathsForTitle(titleId, rarity) {
  const safeRarity = ["common", "rare", "epic", "legendary"].includes(rarity) ? rarity : "common";
  const titlePaths = titleId ? {
    16: `assets/toolbar/${titleId}_16.png`,
    24: `assets/toolbar/${titleId}_24.png`,
    32: `assets/toolbar/${titleId}_32.png`,
    48: `assets/toolbar/${titleId}_48.png`
  } : null;

  const fallbackPaths = {
    16: `assets/toolbar/badge_${safeRarity}_16.png`,
    24: `assets/toolbar/badge_${safeRarity}_24.png`,
    32: `assets/toolbar/badge_${safeRarity}_32.png`,
    48: `assets/toolbar/badge_${safeRarity}_48.png`
  };

  return { titlePaths, fallbackPaths, basePaths: BASE_TOOLBAR_ICONS };
}

async function refreshBrowserActionAppearance() {
  try {
    await initI18n();
    const storage = await chrome.storage.local.get(["stats", "settings"]);
    const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
    const settings = storage.settings || {};
    const themeId = settings.activeThemeId || "cultivation";
    const cultState = getCultivationState(stats, themeId);

    // Fallback: Check if equippedTitle exists in TITLE_CONFIG and is unlocked
    let rawEquippedId = stats.equippedTitle;
    let equippedId = typeof rawEquippedId === "string" ? rawEquippedId : "";
    let cfg = (equippedId && TITLE_CONFIG) ? (TITLE_CONFIG[equippedId] || null) : null;
    if (equippedId && cfg) {
      const isUnlocked = Boolean(Array.isArray(stats.unlockedTitles) && stats.unlockedTitles.includes(equippedId));
      if (!isUnlocked) {
        equippedId = "";
        cfg = null;
      }
    }

    const rarity = cfg ? (cfg.rarity || "common") : (stats.equippedRarity || "common");
    const tier = cfg ? (cfg.tier || 1) : (Number(stats.equippedTier) || 0);
    const showTier = Boolean(settings.showTierOnIcon);

    const stateKey = `${themeId}::${equippedId || "none"}::${rarity}::${tier}::${cultState.isBottleneckReady ? "1" : "0"}::${showTier ? "1" : "0"}::${cultState.realmId}::${cultState.stage}::${cultState.totalQi}::${currentLang || "es"}`;
    if (lastRenderedStateKey === stateKey) {
      return;
    }

    // Set Extension Icon via pre-generated PNGs (fallback chain: title PNG -> rarity fallback -> base "N")
    if (!equippedId) {
      await chrome.action.setIcon({ path: BASE_TOOLBAR_ICONS }).catch(() => {});
    } else {
      const { titlePaths, fallbackPaths, basePaths } = getToolbarIconPathsForTitle(equippedId, rarity);
      let setSuccess = false;
      if (titlePaths && cfg) {
        try {
          await chrome.action.setIcon({ path: titlePaths });
          setSuccess = true;
        } catch {
          setSuccess = false;
        }
      }
      if (!setSuccess) {
        try {
          await chrome.action.setIcon({ path: fallbackPaths });
          setSuccess = true;
        } catch {
          await chrome.action.setIcon({ path: basePaths }).catch(() => {});
        }
      }
    }

    // Badge Text & Background Color (Tier hidden by default; restored only if showTierOnIcon is explicitly true)
    if (cultState.isBottleneckReady) {
      await chrome.action.setBadgeText({ text: "⚡" }).catch(() => {});
      await chrome.action.setBadgeBackgroundColor({ color: "#e11d48" }).catch(() => {});
    } else if (equippedId && showTier && tier > 0) {
      const tierText = TIER_ROMAN[tier] || String(tier);
      const badgeColor = RARITY_BADGE_COLORS[rarity] || "#6366f1";
      await chrome.action.setBadgeText({ text: tierText }).catch(() => {});
      await chrome.action.setBadgeBackgroundColor({ color: badgeColor }).catch(() => {});
    } else {
      await chrome.action.setBadgeText({ text: "" }).catch(() => {});
    }

    // Tooltip Title: "MyNovelSystem — {nombre del logro} · {rareza} · Tier {n}"
    const bAlert = cultState.isBottleneckReady ? ` [⚡ ${t("bottleneck_ready_alert") || "¡Ruptura Lista!"}]` : "";
    if (equippedId && cfg) {
      const achTitleName = t(`title_${equippedId}_name`) || cfg.name || equippedId;
      const achRarityName = t(`ach_rarity_${rarity}`) || rarity;
      const tooltipTitle = `MyNovelSystem — ${achTitleName} · ${achRarityName} · Tier ${tier}${bAlert}`;
      await chrome.action.setTitle({ title: tooltipTitle }).catch(() => {});
    } else if (equippedId && !cfg) {
      const achTitleName = t(`title_${equippedId}_name`) || stats.equippedTitleName || equippedId;
      const achRarityName = t(`ach_rarity_${rarity}`) || rarity;
      const tierSuffix = tier > 0 ? ` · Tier ${tier}` : "";
      const tooltipTitle = `MyNovelSystem — ${achTitleName} · ${achRarityName}${tierSuffix}${bAlert}`;
      await chrome.action.setTitle({ title: tooltipTitle }).catch(() => {});
    } else {
      const realmName = t(`realm_${cultState.realmId}`);
      const stageStr = cultState.stage ? ` (${t("header_stage", { stage: cultState.stage })})` : "";
      const resUnit = (typeof t === "function" ? t(cultState.resource?.unitKey) : "") || cultState.resource?.name || "Qi";
      await chrome.action.setTitle({
        title: `MyNovelSystem — ${realmName}${stageStr}${bAlert} • ${cultState.totalQi} ${resUnit}`
      }).catch(() => {});
    }

    lastRenderedStateKey = stateKey;
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
    claimedRewards: [],
    bonusQi: 0,
    inventory: [],
    equippedItems: [],
    systemAchievements: [],
    genreAchievements: [],
    dailyChapters: {},
    cultivatedRealmIndex: undefined,
    cultivatedStage: undefined,
    lastBreakthrough: null,
    updatedAt: 0
  };
}

var calculateBonusQi = globalThis.calculateBonusQi;
var calculateQi = globalThis.calculateQi;
var computeNaturalRealmAndStage = globalThis.computeNaturalRealmAndStage;
var computeRealmAndStage = globalThis.computeRealmAndStage;
var getCultivationState = globalThis.getCultivationState;
var advanceCultivationBreakthrough = globalThis.advanceCultivationBreakthrough;
var pruneAndSumDailyChapters = globalThis.pruneAndSumDailyChapters;
var evaluateUnlockedTitles = globalThis.evaluateUnlockedTitles;
var claimAchievementReward = globalThis.claimAchievementReward;
var getUnclaimedAchievements = globalThis.getUnclaimedAchievements;
var recordCultivationProgress = globalThis.recordCultivationProgress;
var syncUserInventory = globalThis.syncUserInventory;
var equipItem = globalThis.equipItem;
var unequipItem = globalThis.unequipItem;
var getEquippedQiMultiplier = globalThis.getEquippedQiMultiplier;
var calculateQiBreakdown = globalThis.calculateQiBreakdown;
var SYSTEM_ACHIEVEMENTS_CONFIG = globalThis.SYSTEM_ACHIEVEMENTS_CONFIG;
var evaluateSystemAchievements = globalThis.evaluateSystemAchievements;
var normalizeGenre = globalThis.normalizeGenre;
var evaluateGenreAchievements = globalThis.evaluateGenreAchievements;
var GENRE_TAXONOMY = globalThis.GENRE_TAXONOMY;

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

function stripChapterFromTitle(rawName, chapterHint = "") {
  if (!rawName) return "";
  let cleaned = String(rawName).replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(INLINE_CHAPTER_CUT_REGEX, "").trim();
  if (chapterHint && /^\d+(?:\.\d+)?$/.test(String(chapterHint).trim())) {
    const chapEsc = String(chapterHint).trim().replace(".", "\\.");
    const chapPattern = new RegExp(`(?:\\s*[-–—|:«»#]+\\s*|\\s+)(?:cap[ií]tulo|capitulo|chapter|episode|episodio|parte|ch|cap|ep|c|part|seccion|section|#)?\\s*0*${chapEsc}\\b.*$`, "i");
    cleaned = cleaned.replace(chapPattern, "").trim();
  }
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

  // Reject UUID or long hex hashes as novel names (hyphenated, spaced or raw hex)
  if (
    /^[0-9a-f]{8}[-_\s][0-9a-f]{4}[-_\s][0-9a-f]{4}[-_\s][0-9a-f]{4}[-_\s][0-9a-f]{12}$/i.test(cleaned) ||
    /^[0-9a-f]{24,}$/i.test(cleaned) ||
    /^[0-9a-f]{32}$/i.test(norm.replace(/_/g, ""))
  ) {
    return true;
  }

  // Action button labels
  if (/^(?:leer_ahora|read_now|continue_reading|continuar_leyendo|ver_capitulos|view_chapters|start_reading|comenzar_lectura|read_first|read_last|bookmark|favorito|compartir|share|series_page|pagina_serie|pagina_de_la_serie|comic_page|novel_page|follow|subscribe|suscribirse|seguir|follow_this_series)$/.test(norm)) {
    return true;
  }

  if (novelUrl) {
    try {
      const parsedHost = new URL(novelUrl, "https://example.com").hostname.replace(/^www\./i, "");
      const domainBase = normalizeText(parsedHost.split(".")[0]);
      const normRaw = norm.replace(/_/g, "");
      if (norm === domainBase || normRaw === domainBase) return true;
      if (domainBase.startsWith(normRaw) && (domainBase.endsWith("webcomics") || domainBase.endsWith("comics") || domainBase.endsWith("novels") || domainBase.endsWith("manga") || domainBase.endsWith("scans"))) {
        return true;
      }
    } catch {}
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

function isSameDomainOrSubdomain(domA, domB) {
  if (!domA || !domB) return false;
  const a = String(domA).toLowerCase().replace(/^www\./, "").trim();
  const b = String(domB).toLowerCase().replace(/^www\./, "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.endsWith("." + b) || b.endsWith("." + a)) return true;
  return false;
}

function isValidSeriesPath(pathname) {
  const segments = String(pathname || "").split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const first = normalizeText(segments[0]);
  if (["chapter", "chapters", "capitulo", "capitulos", "episode", "episodio", "ch", "cap", "ep", "sec", "seccion", "section", "comic_episode", "comic_episodes", "webcomic_episode", "webcomic_episodes"].includes(first)) {
    return false;
  }
  if (segments.length === 1 && (BOGUS_NAMES.has(first) || CATALOG_SEGMENTS.has(first))) {
    return false;
  }
  const last = normalizeText(segments[segments.length - 1]);
  if (BOGUS_NAMES.has(last) && segments.length <= 2) {
    return false;
  }
  return true;
}

function safeDecode(s) { try { return decodeURIComponent(s); } catch { return String(s); } }

function canonicalizeSeriesPathForId(pathname) {
  const segments = safeDecode(String(pathname || ""))
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
      /[a-z]/i.test(segments[segments.length - 2])
    ) {
      const stripped = "/" + segments.slice(0, -1).join("/");
      if (isValidSeriesPath(stripped)) {
        return `${u.origin}${stripped}`;
      }
    }

    if (CATALOG_SEGMENTS.has(firstLower) && segments.length === 2 && /[a-z]/i.test(segments[1])) {
      const slug = segments[1];
      const matchTrailingChap = slug.match(/^([a-z0-9_-]*[a-z][a-z0-9_-]*?)-(?:(?:chapters?|cap[ií]tulos?|ch|cap|ep|c)-)?(\d+(?:[._-]\d+)?)$/i);
      if (matchTrailingChap && matchTrailingChap[1]) {
        return `${u.origin}/${segments[0]}/${matchTrailingChap[1]}`;
      }
      return `${u.origin}/${segments[0]}/${segments[1]}`;
    }
  } catch {}
  return "";
}

function extractSlugFromNovelUrl(novelUrl) {
  if (!novelUrl) return "";
  try {
    const derived = deriveNovelUrlFromChapterUrl(novelUrl);
    const u = new URL(derived || novelUrl);
    const segments = u.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      let seg = decodeURIComponent(segments[i]);
      if (/^\d+$/.test(seg)) continue;
      if (CHAPTER_URL_REGEX.test("/" + seg) || CHAPTER_STRIP_PATH_REGEX.test("/" + seg)) continue;
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

  const rawEffectiveName = (!isBogusNovelName(entry.novelName, bestNovelUrl) ? entry.novelName : "") || entry.customName || fallbackKey;
  const effectiveName = stripChapterFromTitle(rawEffectiveName, entry.chapter);
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
    const rawCustom = entry.customName ? stripChapterFromTitle(entry.customName, entry.chapter) : "";
    const cleanedCustom = !isBogusNovelName(rawCustom, novelUrl) ? rawCustom : "";
    const cleanedNovelName = stripChapterFromTitle(entry.novelName || "", entry.chapter);
    const rawName = cleanedCustom || cleanedNovelName;
    const fallbackSlugName = humanizeSlugFromNovelUrl(novelUrl);
    const validName = !isBogusNovelName(rawName, novelUrl) ? rawName : fallbackSlugName;

    if (!validName) {
      changed = true;
      continue;
    }

    const domain = extractDomain(novelUrl || entry.url);
    // CRÍTICO: Las novelas guardadas de dominios en lista negra NUNCA se borran al migrar o sincronizar.
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

    items.sort((a, b) => {
      const cA = parseFloat(a.chapter) || 0;
      const cB = parseFloat(b.chapter) || 0;
      if (cA !== cB) return cB - cA;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
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

    const allGenres = Array.from(
      new Set(items.flatMap((i) => (Array.isArray(i.genres) ? i.genres : [])))
    );
    const genreSource = items.some((i) => i.genreSource === "manual")
      ? "manual"
      : items.some((i) => i.genreSource === "source")
      ? "source"
      : items.some((i) => i.genreSource === "inferred")
      ? "inferred"
      : newest.genreSource || "unknown";

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
      genres: allGenres,
      genreSource,
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

function findExistingNovelKey(savedNovels, novelData, candidateSeriesId, candidateNovelUrl) {
  if (!savedNovels || typeof savedNovels !== "object") return null;

  // 1. Direct candidateSeriesId lookup
  if (candidateSeriesId && savedNovels[candidateSeriesId] && !savedNovels[candidateSeriesId].deleted) {
    return candidateSeriesId;
  }

  // 2. Direct novelData.seriesId lookup
  if (novelData?.seriesId && savedNovels[novelData.seriesId] && !savedNovels[novelData.seriesId].deleted) {
    return novelData.seriesId;
  }

  const incomingUrl = String(novelData?.url || "").trim();
  const incomingNovelUrl = String(candidateNovelUrl || novelData?.novelUrl || "").trim();
  const incomingDomain = extractDomain(incomingNovelUrl || incomingUrl);
  const incomingChapter = String(novelData?.chapter || "").trim();
  const incomingCleanName = stripChapterFromTitle(novelData?.novelName || "", incomingChapter);
  const incomingNormName = normalizeText(incomingCleanName);

  const derivedIncomingSeriesUrl =
    (incomingNovelUrl && deriveNovelUrlFromChapterUrl(incomingNovelUrl)) ||
    (incomingUrl && deriveNovelUrlFromChapterUrl(incomingUrl)) ||
    incomingNovelUrl ||
    "";
  const incomingSeriesIdFromDerived = derivedIncomingSeriesUrl ? buildSeriesIdFromUrl(derivedIncomingSeriesUrl) : "";
  const incomingSlug = extractSlugFromNovelUrl(derivedIncomingSeriesUrl || incomingNovelUrl || incomingUrl);

  for (const [key, entry] of Object.entries(savedNovels)) {
    if (!entry || typeof entry !== "object" || entry.deleted) continue;

    // Check A: Key matches derived canonical series ID
    if (incomingSeriesIdFromDerived && (key === incomingSeriesIdFromDerived || entry.seriesId === incomingSeriesIdFromDerived)) {
      return key;
    }

    const entryDomain = extractDomain(entry.novelUrl || entry.url);
    if (entryDomain && incomingDomain && !isSameDomainOrSubdomain(entryDomain, incomingDomain)) {
      continue;
    }

    // Check B: Direct or derived novelUrl equality
    if (derivedIncomingSeriesUrl && entry.novelUrl) {
      const entrySeriesUrl = deriveNovelUrlFromChapterUrl(entry.novelUrl) || entry.novelUrl;
      if (entrySeriesUrl) {
        if (entrySeriesUrl === derivedIncomingSeriesUrl) return key;
        const entryIdFromUrl = buildSeriesIdFromUrl(entrySeriesUrl);
        if (entryIdFromUrl && (entryIdFromUrl === incomingSeriesIdFromDerived || entryIdFromUrl === candidateSeriesId)) {
          return key;
        }
      }
    }

    // Check C: Chapter URLs derive to identical series base URL
    if (incomingUrl && entry.url) {
      const entryDerived = deriveNovelUrlFromChapterUrl(entry.url);
      if (entryDerived && derivedIncomingSeriesUrl && entryDerived === derivedIncomingSeriesUrl) {
        return key;
      }
    }

    // Check D: Normalized title match within the same domain (checks BOTH novelName and customName)
    const entryCleanNovelName = stripChapterFromTitle(entry.novelName || "", entry.chapter);
    const entryNormNovelName = normalizeText(entryCleanNovelName);
    const entryCleanCustomName = entry.customName ? stripChapterFromTitle(entry.customName, entry.chapter) : "";
    const entryNormCustomName = normalizeText(entryCleanCustomName);

    if (incomingNormName && incomingNormName.length >= 2) {
      if (
        (entryNormNovelName && incomingNormName === entryNormNovelName) ||
        (entryNormCustomName && incomingNormName === entryNormCustomName)
      ) {
        return key;
      }
    }

    // Check E: Slug match within the same domain (minimum 3 chars to prevent false positives)
    if (incomingSlug && incomingSlug.length >= 3) {
      const entrySlug = extractSlugFromNovelUrl(entry.novelUrl || entry.url);
      if (entrySlug && entrySlug === incomingSlug) {
        return key;
      }
    }
  }

  return null;
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

  const lUnlocked = Array.isArray(l.unlockedTitles) ? l.unlockedTitles : [];
  const cUnlocked = Array.isArray(c.unlockedTitles) ? c.unlockedTitles : [];
  const mergedUnlocked = Array.from(new Set([...lUnlocked, ...cUnlocked]));
  const lClaimed = Array.isArray(l.claimedRewards) ? l.claimedRewards : [];
  const cClaimed = Array.isArray(c.claimedRewards) ? c.claimedRewards : [];
  const mergedClaimed = Array.from(new Set([...lClaimed, ...cClaimed]));

  const lInventory = Array.isArray(l.inventory) ? l.inventory : [];
  const cInventory = Array.isArray(c.inventory) ? c.inventory : [];
  const mergedInventory = Array.from(new Set([...lInventory, ...cInventory]));
  const lSystem = Array.isArray(l.systemAchievements) ? l.systemAchievements : [];
  const cSystem = Array.isArray(c.systemAchievements) ? c.systemAchievements : [];
  const mergedSystem = Array.from(new Set([...lSystem, ...cSystem]));
  const lGenre = Array.isArray(l.genreAchievements) ? l.genreAchievements : [];
  const cGenre = Array.isArray(c.genreAchievements) ? c.genreAchievements : [];
  const mergedGenre = Array.from(new Set([...lGenre, ...cGenre]));
  const rawEquipped = Array.isArray(winner.equippedItems)
    ? winner.equippedItems
    : (Array.isArray(older.equippedItems) ? older.equippedItems : []);
  const mergedEquipped = Array.from(new Set(rawEquipped))
    .filter((id) => mergedInventory.includes(id))
    .slice(0, 3);

  // Resolver nivel y etapa de cultivo evitando regresiones y asegurando persistencia
  let realmIndex = undefined;
  let stage = undefined;
  const lRealm = l.cultivatedRealmIndex;
  const cRealm = c.cultivatedRealmIndex;
  const lStage = l.cultivatedStage;
  const cStage = c.cultivatedStage;

  if (lRealm !== undefined && cRealm !== undefined) {
    if (lRealm > cRealm) {
      realmIndex = lRealm;
      stage = lStage;
    } else if (cRealm > lRealm) {
      realmIndex = cRealm;
      stage = cStage;
    } else {
      realmIndex = lRealm;
      const cultRealms = (typeof THEMES_CONFIG !== "undefined" && THEMES_CONFIG.cultivation?.realms) || [];
      const rObj = cultRealms[realmIndex];
      const isPeak = rObj && (!rObj.hasStages || rObj.nextQi === null);
      if (isPeak) {
        stage = null;
      } else {
        const validL = (lStage !== null && lStage !== undefined) ? Number(lStage) : null;
        const validC = (cStage !== null && cStage !== undefined) ? Number(cStage) : null;
        if (validL !== null && validC !== null) {
          stage = Math.max(validL || 1, validC || 1);
        } else if (validL !== null) {
          stage = validL || 1;
        } else if (validC !== null) {
          stage = validC || 1;
        } else {
          stage = 1;
        }
      }
    }
  } else if (winner.cultivatedRealmIndex !== undefined) {
    realmIndex = winner.cultivatedRealmIndex;
    stage = winner.cultivatedStage;
  } else if (older.cultivatedRealmIndex !== undefined) {
    realmIndex = older.cultivatedRealmIndex;
    stage = older.cultivatedStage;
  }

  // Si el reino consolidado no tiene etapas, stage debe ser estrictamente null
  if (realmIndex !== undefined) {
    const cultRealms = (typeof THEMES_CONFIG !== "undefined" && THEMES_CONFIG.cultivation?.realms) || [];
    const rObj = cultRealms[realmIndex];
    if (rObj && (!rObj.hasStages || rObj.nextQi === null)) {
      stage = null;
    }
  }

  // Fusión por temática si existen estructuras multi-tema
  const allThemeKeys = new Set([
    ...Object.keys(l.cultivationThemes || {}),
    ...Object.keys(c.cultivationThemes || {})
  ]);
  let mergedThemes = undefined;
  if (allThemeKeys.size > 0) {
    mergedThemes = {};
    for (const tKey of allThemeKeys) {
      const lT = (l.cultivationThemes || {})[tKey];
      const cT = (c.cultivationThemes || {})[tKey];
      if (lT && cT) {
        const tTheme = (typeof THEMES_CONFIG !== "undefined" && THEMES_CONFIG[tKey]);
        const tRealms = tTheme?.realms || [];
        const lR = Number(lT.realmIndex) || 0;
        const cR = Number(cT.realmIndex) || 0;
        const mergedRIndex = Math.max(lR, cR);
        const tRObj = tRealms[mergedRIndex];
        const isPeak = tRObj && (!tRObj.hasStages || tRObj.nextQi === null);

        let mergedStage = null;
        if (isPeak) {
          mergedStage = null;
        } else if (lR > cR) {
          mergedStage = lT.stage !== null && lT.stage !== undefined ? Number(lT.stage) || 1 : 1;
        } else if (cR > lR) {
          mergedStage = cT.stage !== null && cT.stage !== undefined ? Number(cT.stage) || 1 : 1;
        } else {
          const validL = (lT.stage !== null && lT.stage !== undefined) ? Number(lT.stage) : null;
          const validC = (cT.stage !== null && cT.stage !== undefined) ? Number(cT.stage) : null;
          if (validL !== null && validC !== null) {
            mergedStage = Math.max(validL || 1, validC || 1);
          } else if (validL !== null) {
            mergedStage = validL || 1;
          } else if (validC !== null) {
            mergedStage = validC || 1;
          } else {
            mergedStage = 1;
          }
        }

        mergedThemes[tKey] = {
          realmIndex: mergedRIndex,
          stage: mergedStage,
          exp: Math.max(Number(lT.exp) || 0, Number(cT.exp) || 0),
          totalExp: Math.max(Number(lT.totalExp) || 0, Number(cT.totalExp) || 0),
          chaptersRead: Math.max(Number(lT.chaptersRead) || 0, Number(cT.chaptersRead) || 0),
          lastBreakthrough: (lT.lastBreakthrough?.timestamp || 0) >= (cT.lastBreakthrough?.timestamp || 0)
            ? lT.lastBreakthrough
            : cT.lastBreakthrough
        };
      } else {
        const singleTheme = lT || cT;
        const tTheme = (typeof THEMES_CONFIG !== "undefined" && THEMES_CONFIG[tKey]);
        const tRealms = tTheme?.realms || [];
        const singleR = Number(singleTheme?.realmIndex) || 0;
        const tRObj = tRealms[singleR];
        const isPeak = tRObj && (!tRObj.hasStages || tRObj.nextQi === null);
        mergedThemes[tKey] = {
          ...(singleTheme || {}),
          realmIndex: singleR,
          stage: isPeak ? null : (singleTheme?.stage !== null && singleTheme?.stage !== undefined ? Number(singleTheme.stage) || 1 : 1),
          exp: Number(singleTheme?.exp) || 0,
          totalExp: Number(singleTheme?.totalExp) || 0,
          chaptersRead: Number(singleTheme?.chaptersRead) || 0
        };
      }
    }
  }

  let bestBreakthrough = winner.lastBreakthrough;
  if (older.lastBreakthrough) {
    if (!bestBreakthrough || (older.lastBreakthrough.timestamp || 0) > (bestBreakthrough.timestamp || 0)) {
      bestBreakthrough = older.lastBreakthrough;
    }
  }

  // Sincronizar tema cultivation con campos raíz
  if (mergedThemes && mergedThemes.cultivation && realmIndex !== undefined) {
    if (realmIndex > (mergedThemes.cultivation.realmIndex || 0)) {
      mergedThemes.cultivation.realmIndex = realmIndex;
      mergedThemes.cultivation.stage = stage;
    } else if (realmIndex === (mergedThemes.cultivation.realmIndex || 0)) {
      if (stage !== null && mergedThemes.cultivation.stage !== null) {
        const sMax = Math.max(Number(stage) || 1, Number(mergedThemes.cultivation.stage) || 1);
        stage = sMax;
        mergedThemes.cultivation.stage = sMax;
      }
    } else {
      realmIndex = mergedThemes.cultivation.realmIndex;
      stage = mergedThemes.cultivation.stage;
    }
  } else if (!mergedThemes && realmIndex !== undefined) {
    mergedThemes = {
      cultivation: {
        realmIndex,
        stage,
        lastBreakthrough: bestBreakthrough || null
      }
    };
  }

  const merged = {
    chaptersRead: Math.max(Number(l.chaptersRead) || 0, Number(c.chaptersRead) || 0),
    novelsStarted: Math.max(Number(l.novelsStarted) || 0, Number(c.novelsStarted) || 0),
    novelsCompleted: Math.max(Number(l.novelsCompleted) || 0, Number(c.novelsCompleted) || 0),
    streakDays: Number(winner.streakDays) || 0,
    bestStreak: Math.max(Number(l.bestStreak) || 0, Number(c.bestStreak) || 0),
    lastReadDay: winner.lastReadDay || older.lastReadDay || "",
    unlockedTitles: mergedUnlocked,
    equippedTitle: winner.equippedTitle || older.equippedTitle || "",
    claimedRewards: mergedClaimed,
    inventory: mergedInventory,
    equippedItems: mergedEquipped,
    systemAchievements: mergedSystem,
    genreAchievements: mergedGenre,
    dailyChapters: pruned,
    cultivatedRealmIndex: realmIndex,
    cultivatedStage: stage,
    lastBreakthrough: bestBreakthrough || null,
    ...(mergedThemes ? { cultivationThemes: mergedThemes } : {}),
    updatedAt: Math.max(l.updatedAt || 0, c.updatedAt || 0)
  };

  evaluateUnlockedTitles(merged);
  if (typeof evaluateSystemAchievements === "function") {
    evaluateSystemAchievements(merged);
  }
  if (typeof syncUserInventory === "function") {
    syncUserInventory(merged);
  }
  merged.bonusQi = calculateBonusQi(merged);
  return merged;
}

function mergeNovelsMaps(localMap, cloudMap, allowRewind = true, now = Date.now()) {
  const lMap = localMap && typeof localMap === "object" ? localMap : {};
  const cMap = cloudMap && typeof cloudMap === "object" ? cloudMap : {};

  const allKeys = new Set([...Object.keys(lMap), ...Object.keys(cMap)]);
  const preMerged = {};
  let shouldPush = false;

  for (const key of allKeys) {
    const lItem = lMap[key];
    const cItem = cMap[key];

    let winner = null;
    let older = null;

    if (cItem && lItem) {
      const cChap = parseFloat(cItem.chapter) || 0;
      const lChap = parseFloat(lItem.chapter) || 0;
      if (!allowRewind && cChap !== lChap) {
        winner = cChap > lChap ? cItem : lItem;
        older = winner === cItem ? lItem : cItem;
        if (winner === lItem) shouldPush = true;
      } else if ((lItem.updatedAt || 0) > (cItem.updatedAt || 0)) {
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
      // Tombstone de eliminación: mantener si tiene <= 30 días
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
  return {
    mergedNovels: finalPass.migratedNovels,
    shouldPush: shouldPush || finalPass.changed
  };
}

async function getCloudSyncMeta(uid) {
  if (!uid) return { lastPullAt: 0, novelsETag: null };
  try {
    const key = `cloud_sync_meta_${uid}`;
    const storage = await chrome.storage.local.get([key]);
    return storage[key] || { lastPullAt: 0, novelsETag: null };
  } catch {
    return { lastPullAt: 0, novelsETag: null };
  }
}

async function setCloudSyncMeta(uid, meta) {
  if (!uid || !meta) return;
  try {
    const key = `cloud_sync_meta_${uid}`;
    const current = await getCloudSyncMeta(uid);
    await chrome.storage.local.set({
      [key]: { ...current, ...meta }
    });
  } catch {}
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

async function maybeMigrateLocalStorage() {
  chrome.storage.local.remove(["supabase_auth", "supabase_config", "pending_supabase_signup_email"]).catch(() => {});

  // Migración segura desde chrome.storage.sync si existieran datos legados
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.get === "function") {
    try {
      const syncData = await chrome.storage.sync.get(["savedNovels"]);
      if (syncData && syncData.savedNovels && typeof syncData.savedNovels === "object" && Object.keys(syncData.savedNovels).length > 0) {
        const localData = await chrome.storage.local.get(["savedNovels"]);
        const localNovels = localData.savedNovels || {};
        let modified = false;
        for (const [k, sEntry] of Object.entries(syncData.savedNovels)) {
          if (!sEntry || typeof sEntry !== "object") continue;
          const lEntry = localNovels[k];
          if (!lEntry) {
            localNovels[k] = sEntry;
            modified = true;
          } else {
            const sChap = parseFloat(sEntry.chapter) || 0;
            const lChap = parseFloat(lEntry.chapter) || 0;
            if (sChap > lChap || (sChap === lChap && (sEntry.updatedAt || 0) > (lEntry.updatedAt || 0))) {
              localNovels[k] = { ...lEntry, ...sEntry };
              modified = true;
            }
          }
        }
        if (modified || Object.keys(localNovels).length === 0) {
          const { migratedNovels } = deduplicateAndMigrateMap(localNovels);
          await chrome.storage.local.set({ savedNovels: migratedNovels });
        }
        chrome.storage.sync.remove(["savedNovels"]).catch(() => {});
      }
    } catch (syncErr) {
      console.warn("Storage sync migration notice:", syncErr?.name || "SyncReadNotice");
    }
  }

  const { schemaVersion } = await chrome.storage.local.get(["schemaVersion"]);
  if (schemaVersion === 4) return;
  await migrateLocalStorageNow();
  await chrome.storage.local.set({ schemaVersion: 4 });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.stats || changes.settings) {
    if (refreshIconDebounceTimer) clearTimeout(refreshIconDebounceTimer);
    refreshIconDebounceTimer = setTimeout(() => {
      refreshIconDebounceTimer = null;
      refreshBrowserActionAppearance();
    }, 50);
  }
});

// Sincronización periódica cada 30 min para ahorrar ancho de banda de Firebase Spark y bienvenida inicial
chrome.runtime.onInstalled.addListener((details) => {
  chrome.alarms.create("periodic_cloud_sync", { periodInMinutes: 30 });
  maybeMigrateLocalStorage();
  refreshBrowserActionAppearance();

  if (details && details.reason === "install") {
    try {
      const welcomeUrl = chrome.runtime && typeof chrome.runtime.getURL === "function"
        ? chrome.runtime.getURL("welcome.html")
        : "welcome.html";
      if (chrome.tabs && typeof chrome.tabs.create === "function") {
        const createPromise = chrome.tabs.create({ url: welcomeUrl });
        if (createPromise && typeof createPromise.catch === "function") {
          createPromise.catch((err) => {
            console.warn("[MyNovelSystem] Error al crear pestaña de bienvenida:", err);
          });
        }
      }
    } catch (err) {
      console.warn("[MyNovelSystem] Error al abrir la página de bienvenida:", err);
    }
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("periodic_cloud_sync", { periodInMinutes: 30 });
  refreshBrowserActionAppearance();
  pullFromCloud();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab && tab.incognito) return;
  if (changeInfo.url) {
    if (await isDomainBlacklisted(changeInfo.url)) {
      setTabQuestionBadge(tabId, false);
      chrome.storage.local.remove([`tab_${tabId}`]).catch(() => {});
      chrome.tabs.sendMessage(tabId, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
    } else if (looksLikeReadingUrl(changeInfo.url) && !isInformationalOrNonReaderUrl(changeInfo.url)) {
      chrome.tabs.sendMessage(tabId, {
        type: "SPA_URL_CHANGED",
        url: changeInfo.url
      }).catch(() => {});
    }
  }
});

const GROUP_1_CONTENT_SCRIPT_MESSAGES = new Set([
  "NOVEL_DETECTED",
  "SCROLL_UPDATED",
  "CONFIRM_UNCONFIRMED_TAB",
  "DISCARD_UNCONFIRMED_TAB",
  "DISMISS_TAB_PROMPT",
  "ADD_DOMAIN_BLACKLIST",
  "REMOVE_DOMAIN_BLACKLIST",
  "DIAGNOSTIC_LOG"
]);

const GROUP_2_ADMIN_MESSAGES = new Set([
  "IMPORT_DATA",
  "PERFORM_BREAKTHROUGH",
  "CLAIM_ACHIEVEMENT_REWARD",
  "CLAIM_ALL_ACHIEVEMENTS",
  "RECORD_MANUAL_READ",
  "FORCE_CLOUD_SYNC",
  "PULL_FROM_CLOUD",
  "SWITCH_ACCOUNT",
  "LOGOUT",
  "DELETE_ACCOUNT",
  "TEST_WHATSAPP",
  "CLEAR_DOMAIN_BLACKLIST",
  "GET_DOMAIN_BLACKLIST",
  "CHECK_DOMAIN_BLACKLISTED",
  "SUBMIT_BUG_REPORT",
  "REFRESH_ICON",
  "EQUIP_ITEM",
  "UNEQUIP_ITEM",
  "GET_INVENTORY",
  "CLEAR_CACHE",
  "RESET_LOCAL_DATA",
  "UPDATE_NOVEL_GENRES"
]);

function isValidHttpUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateMessageSchema(message) {
  if (!message || typeof message !== "object") return false;
  const { type, data } = message;
  if (type === "NOVEL_DETECTED") {
    if (!data || typeof data !== "object") return false;
    if (data.novelName && typeof data.novelName !== "string") return false;
    if (data.url && (typeof data.url !== "string" || !isValidHttpUrl(data.url) || data.url.length > 2048)) return false;
    if (data.novelUrl && (typeof data.novelUrl !== "string" || !isValidHttpUrl(data.novelUrl) || data.novelUrl.length > 2048)) return false;
    if (data.chapter && typeof data.chapter !== "string") return false;
    if (data.seriesId && (typeof data.seriesId !== "string" || data.seriesId.length > 200)) return false;
    if (data.genres && (!Array.isArray(data.genres) || data.genres.length > 50)) return false;
    return true;
  }
  if (type === "SCROLL_UPDATED") {
    if (!data || typeof data !== "object") return false;
    if (!data.seriesId || typeof data.seriesId !== "string" || data.seriesId.length > 200) return false;
    if (data.chapter != null && typeof data.chapter !== "string" && typeof data.chapter !== "number") return false;
    if (data.scrollPct != null && (typeof data.scrollPct !== "number" || isNaN(data.scrollPct) || data.scrollPct < 0 || data.scrollPct > 100)) return false;
    if (data.url && (typeof data.url !== "string" || !isValidHttpUrl(data.url) || data.url.length > 2048)) return false;
    return true;
  }
  if (type === "CONFIRM_UNCONFIRMED_TAB") {
    if (message.novelName && (typeof message.novelName !== "string" || message.novelName.length > 300)) return false;
    if (message.customName && (typeof message.customName !== "string" || message.customName.length > 300)) return false;
    if (message.chapter != null && String(message.chapter).length > 50) return false;
    if (message.url && (typeof message.url !== "string" || !isValidHttpUrl(message.url) || message.url.length > 2048)) return false;
    if (message.novelUrl && (typeof message.novelUrl !== "string" || !isValidHttpUrl(message.novelUrl) || message.novelUrl.length > 2048)) return false;
    if (message.seriesId && (typeof message.seriesId !== "string" || message.seriesId.length > 200)) return false;
    return true;
  }
  if (type === "ADD_DOMAIN_BLACKLIST" || type === "REMOVE_DOMAIN_BLACKLIST") {
    if (message.domain && (typeof message.domain !== "string" || message.domain.length > 253)) return false;
    return true;
  }
  if (type === 'UPDATE_NOVEL_GENRES') {
    const sId = message.seriesId || message.novelKey;
    if (!sId || typeof sId !== "string" || sId.length > 200) return false;
    if (!Array.isArray(message.genres)) return false;
    return true;
  }
  if (type === "DIAGNOSTIC_LOG") {
    if (message.entry && typeof message.entry !== "object") return false;
    return true;
  }
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object" || !message.type) {
    sendResponse({ ok: false, error: "Invalid message format" });
    return false;
  }

  const rawType = typeof message.type === "string" ? message.type.trim() : "";
  const upperType = rawType.toUpperCase();

  const isGroup1 = GROUP_1_CONTENT_SCRIPT_MESSAGES.has(rawType) || GROUP_1_CONTENT_SCRIPT_MESSAGES.has(upperType);
  const isGroup2 = GROUP_2_ADMIN_MESSAGES.has(rawType) || GROUP_2_ADMIN_MESSAGES.has(upperType);

  // SEC-02: Tipo de mensaje desconocido: rechazar con respuesta de error, sin ejecutar nada
  if (!isGroup1 && !isGroup2) {
    sendResponse({ ok: false, error: `Unknown message type: ${rawType || message.type}` });
    return true;
  }

  // SEC-PRIVACY: Rechazar cualquier mensaje de lectura proveniente de pestañas en modo incógnito
  if (sender && sender.tab && sender.tab.incognito) {
    if (isGroup1) {
      sendResponse({ ok: false, incognito: true, ignored: true });
      return true;
    }
  }

  // Normalizar internamente message.type a mayúsculas canónicas para asegurar enrutamiento homogéneo
  if (GROUP_1_CONTENT_SCRIPT_MESSAGES.has(upperType) || GROUP_2_ADMIN_MESSAGES.has(upperType)) {
    message.type = upperType;
  }

  // SEC-02: Validación de emisor frente a chrome.runtime.id si está disponible
  const currentRuntimeId = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) ? chrome.runtime.id : null;
  if (currentRuntimeId && sender && sender.id && sender.id !== currentRuntimeId) {
    sendResponse({ ok: false, error: "Unauthorized sender id" });
    return true;
  }

  // SEC-02: Grupo 2 (acciones administrativas): exige sender.id === chrome.runtime.id Y !sender.tab (salvo páginas internas chrome-extension:// de esta extensión)
  if (isGroup2) {
    const extPrefix = currentRuntimeId ? `chrome-extension://${currentRuntimeId}/` : "chrome-extension://";
    const isExtensionPageTab = sender && sender.tab && (
      (sender.url && (sender.url.startsWith(extPrefix) || (!currentRuntimeId && sender.url.startsWith("chrome-extension://")))) ||
      (sender.tab.url && (sender.tab.url.startsWith(extPrefix) || (!currentRuntimeId && sender.tab.url.startsWith("chrome-extension://"))))
    );
    if (sender && sender.tab && !isExtensionPageTab) {
      sendResponse({ ok: false, error: "Unauthorized: administrative action rejected from tab" });
      return true;
    }
  }

  // SEC-02: Grupo 1 (acciones desde content scripts / tabs):
  if (sender && sender.tab) {
    if (!validateMessageSchema(message)) {
      sendResponse({ ok: false, error: "Invalid message schema" });
      return true;
    }

    // En las acciones de lista negra enviadas desde el aviso, el dominio debe coincidir con el hostname de sender.tab.url
    if (message.type === "ADD_DOMAIN_BLACKLIST" || message.type === "REMOVE_DOMAIN_BLACKLIST") {
      const tabUrl = sender.tab.url || "";
      const tabDomain = extractDomain(tabUrl);
      if (!tabDomain || tabDomain === "local") {
        sendResponse({ ok: false, error: "Cannot determine valid domain from tab URL" });
        return true;
      }
      message.domain = tabDomain;
    }
  } else {
    // Si viene sin tab pero es NOVEL_DETECTED o SCROLL_UPDATED, rechazar
    if (message.type === "NOVEL_DETECTED" || message.type === "SCROLL_UPDATED") {
      sendResponse({ ok: false, error: "Unauthorized: content detection requires tab sender" });
      return true;
    }
  }

  if (message.type === "NOVEL_DETECTED" && sender && sender.tab) {
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

  if (message.type === "CLAIM_ACHIEVEMENT_REWARD") {
    withStorageLock(async () => {
      const storage = await chrome.storage.local.get(["stats", "savedNovels"]);
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      const res = claimAchievementReward(stats, message.achievementId);
      if (res.ok) {
        await chrome.storage.local.set({ stats });
        await refreshBrowserActionAppearance();
        await pushToCloudUnlocked(storage.savedNovels || {}, stats);
      }
      return res;
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "CLAIM_ALL_ACHIEVEMENTS") {
    withStorageLock(async () => {
      const storage = await chrome.storage.local.get(["stats", "savedNovels"]);
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      const unclaimed = getUnclaimedAchievements(stats);
      let claimedCount = 0;
      let totalReward = 0;
      for (const item of unclaimed) {
        const res = claimAchievementReward(stats, item.id);
        if (res.ok) {
          claimedCount++;
          totalReward += res.rewardQi;
        }
      }
      if (claimedCount > 0) {
        await chrome.storage.local.set({ stats });
        await refreshBrowserActionAppearance();
        await pushToCloudUnlocked(storage.savedNovels || {}, stats);
      }
      return { ok: true, claimedCount, totalReward, stats };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "RECORD_MANUAL_READ") {
    withStorageLock(async () => {
      const storage = await chrome.storage.local.get(["stats", "savedNovels", "settings"]);
      let currentStats = { ...getDefaultStats(), ...(storage.stats || {}) };
      const chaptersDelta = Math.max(0, Number(message.chaptersDelta) || 0);
      const isNewNovel = Boolean(message.isNewNovel);
      const completedDelta = Number(message.completedDelta) || 0;
      const activeThemeId = message.themeId || storage.settings?.activeThemeId || "cultivation";
      currentStats = recordCultivationProgress(currentStats, chaptersDelta, isNewNovel, completedDelta, activeThemeId);
      await chrome.storage.local.set({ stats: currentStats });
      await refreshBrowserActionAppearance();
      await pushToCloudUnlocked(storage.savedNovels || {}, currentStats);
      return { ok: true, stats: currentStats };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "PERFORM_BREAKTHROUGH") {
    withStorageLock(async () => {
      const storage = await chrome.storage.local.get(["stats", "settings", "savedNovels"]);
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      const settings = storage.settings || {};
      const themeId = message.themeId || settings.activeThemeId || "cultivation";

      const res = advanceCultivationBreakthrough(stats, themeId, { applySurplus: true });
      if (res.ok) {
        const finalStats = res.stats || stats;
        await chrome.storage.local.set({ stats: finalStats });
        await refreshBrowserActionAppearance();
        await pushToCloudUnlocked(storage.savedNovels || {}, finalStats);
      }
      return res;
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "EQUIP_ITEM") {
    withStorageLock(async () => {
      const storage = await chrome.storage.local.get(["stats", "savedNovels"]);
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      let equipRes = { ok: true };
      if (typeof equipItem === "function") {
        equipRes = equipItem(stats, message.itemId, message.slotIndex);
      }
      if (!equipRes.ok) {
        return {
          ok: false,
          error: equipRes.error,
          reason: equipRes.reason || equipRes.error,
          message: equipRes.message || equipRes.error,
          stats
        };
      }
      stats.updatedAt = Date.now();
      await chrome.storage.local.set({ stats });
      await refreshBrowserActionAppearance();
      await pushToCloudUnlocked(storage.savedNovels || {}, stats);
      return {
        ok: true,
        stats,
        replacedItemId: equipRes.replacedItemId,
        alreadyEquipped: equipRes.alreadyEquipped,
        breakdown: typeof calculateQiBreakdown === "function" ? calculateQiBreakdown(stats) : null
      };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "UNEQUIP_ITEM") {
    withStorageLock(async () => {
      const storage = await chrome.storage.local.get(["stats", "savedNovels"]);
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      if (typeof unequipItem === "function") {
        unequipItem(stats, message.itemId);
      }
      stats.updatedAt = Date.now();
      await chrome.storage.local.set({ stats });
      await refreshBrowserActionAppearance();
      await pushToCloudUnlocked(storage.savedNovels || {}, stats);
      return {
        ok: true,
        stats,
        breakdown: typeof calculateQiBreakdown === "function" ? calculateQiBreakdown(stats) : null
      };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "GET_INVENTORY") {
    chrome.storage.local.get(["stats"], (storage) => {
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      if (typeof syncUserInventory === "function") {
        syncUserInventory(stats);
      }
      sendResponse({
        ok: true,
        inventory: stats.inventory || [],
        equippedItems: stats.equippedItems || [],
        breakdown: typeof calculateQiBreakdown === "function" ? calculateQiBreakdown(stats) : null
      });
    });
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
    pullFromCloud(Boolean(message.force))
      .then((res) => sendResponse(res || { ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "SWITCH_ACCOUNT") {
    withStorageLock(async () => {
      const target = message.uid || message.targetUid;
      return await switchAccountProfile(target, Boolean(message.mergeGuestData));
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "LOGOUT") {
    withStorageLock(async () => {
      const storedAuth = await chrome.storage.local.get(["auth"]);
      const outgoingUid = storedAuth?.auth?.uid;

      const res = await switchAccountProfile("guest");
      await chrome.storage.local.remove(["auth"]);

      if (message.clearLocalData) {
        const { settings } = await chrome.storage.local.get(["settings"]);
        const cleanSettings = { ...(settings || {}) };
        delete cleanSettings.phone;
        delete cleanSettings.apiKey;
        cleanSettings.enableWhatsapp = false;
        cleanSettings.whatsappStatus = "unconfigured";
        await chrome.storage.local.set({ settings: cleanSettings, diagnosticLogs: [], notifiedHistory: {} });
        await clearInactiveAlarms();

        if (outgoingUid && outgoingUid !== "guest") {
          await chrome.storage.local.remove([`account_data_${outgoingUid}`, `userAvatar_${outgoingUid}`]);
        }
      } else {
        await chrome.storage.local.set({ diagnosticLogs: [] });
      }

      await refreshBrowserActionAppearance();
      return res;
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "DELETE_ACCOUNT") {
    withStorageLock(async () => {
      // 1. Obtener credenciales válidas y actualizadas intentando renovar token si expiró
      let auth = await getValidAuth();
      if (!auth || !auth.idToken || !auth.uid) {
        const stored = await chrome.storage.local.get(["auth"]);
        if (stored && stored.auth) {
          return { ok: false, error: "REAUTH_REQUIRED" };
        }
        return { ok: false, error: "NOT_AUTHENTICATED" };
      }

      // 2. Eliminar cuenta de Firebase Authentication mediante accounts:delete
      const apiKey = FIREBASE_API_KEY;

      let authRes;
      try {
        authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: auth.idToken })
        });
      } catch (networkErr) {
        return { ok: false, error: "NETWORK_ERROR", details: String(networkErr) };
      }

      let authData;
      try {
        authData = await authRes.json();
      } catch {
        authData = null;
      }

      if (!authRes.ok || (authData && authData.error)) {
        const errMsg = authData?.error?.message || `HTTP_${authRes.status}`;
        if (
          errMsg.includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN") ||
          errMsg.includes("TOKEN_EXPIRED") ||
          errMsg.includes("INVALID_ID_TOKEN") ||
          errMsg.includes("USER_NOT_FOUND")
        ) {
          return { ok: false, error: "REAUTH_REQUIRED", details: errMsg };
        }
        return { ok: false, error: errMsg };
      }

      // 3. Confirmada la eliminación en Auth por el servidor: eliminar datos remotos en Realtime Database
      let rtdbDeleted = false;
      try {
        const rtdbRes = await fetch(getFirebaseUrl(`/users/${auth.uid}.json`, auth.idToken), {
          method: "DELETE"
        });
        rtdbDeleted = rtdbRes.ok;
      } catch (err) {
        console.warn("[Background] Warning deleting RTDB data:", err);
      }

      // 4. Cambiar a modo invitado de forma segura PRIMERO
      await switchAccountProfile("guest");

      // 5. Limpiar definitivamente bóveda local, avatar y credenciales de la cuenta eliminada (previene resurrección)
      const userVaultKey = `account_data_${auth.uid}`;
      const avatarKey = `userAvatar_${auth.uid}`;
      await chrome.storage.local.remove([userVaultKey, avatarKey, "auth"]);

      const { settings } = await chrome.storage.local.get(["settings"]);
      const cleanSettings = { ...(settings || {}) };
      delete cleanSettings.phone;
      delete cleanSettings.apiKey;
      cleanSettings.enableWhatsapp = false;
      cleanSettings.whatsappStatus = "unconfigured";
      await chrome.storage.local.set({ settings: cleanSettings, diagnosticLogs: [], notifiedHistory: {} });
      await clearInactiveAlarms();

      await refreshBrowserActionAppearance();

      return { ok: true, rtdbDeleted };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "GET_DOMAIN_BLACKLIST") {
    getStoredDomainBlacklist()
      .then((list) => sendResponse({ ok: true, domainBlacklist: list }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "ADD_DOMAIN_BLACKLIST") {
    addDomainToBlacklist(message.domain, message.addedAt)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "REMOVE_DOMAIN_BLACKLIST") {
    removeDomainFromBlacklist(message.domain)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "CLEAR_DOMAIN_BLACKLIST") {
    clearDomainBlacklist()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "CHECK_DOMAIN_BLACKLISTED") {
    isDomainBlacklisted(message.domain || message.url)
      .then((blacklisted) => sendResponse({ ok: true, blacklisted }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "DISMISS_TAB_PROMPT" || message.type === "DISCARD_UNCONFIRMED_TAB") {
    const targetTabId = message.tabId || sender?.tab?.id;
    if (targetTabId) {
      setTabQuestionBadge(targetTabId, false);
      chrome.storage.local.remove([`tab_${targetTabId}`]).catch(() => {});
      chrome.tabs.sendMessage(targetTabId, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "CONFIRM_UNCONFIRMED_TAB") {
    const targetTabId = message.tabId || sender?.tab?.id;
    handleConfirmUnconfirmedTab({
      tabId: targetTabId,
      novelName: message.novelName,
      chapter: message.chapter,
      customName: message.customName,
      url: message.url || sender?.tab?.url,
      seriesId: message.seriesId,
      novelUrl: message.novelUrl
    })
      .then((res) => {
        if (targetTabId) {
          chrome.tabs.sendMessage(targetTabId, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
        }
        sendResponse(res);
      })
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "CLEAR_CACHE") {
    withStorageLock(async () => {
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allData).filter((k) => {
        return (
          k.startsWith("tab_") ||
          k.startsWith("cache_") ||
          k.startsWith("badge_") ||
          k.startsWith("debug_") ||
          k.startsWith("logs_") ||
          k.startsWith("preview_") ||
          k === "lastError" ||
          k === "unconfirmed_queue" ||
          k === "supabase_auth" ||
          k === "supabase_config" ||
          k === "pending_supabase_signup_email"
        );
      });
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
      return { ok: true, clearedCount: keysToRemove.length };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "RESET_LOCAL_DATA") {
    withStorageLock(async () => {
      const defaultStats = getDefaultStats();
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allData).filter((k) => k.startsWith("tab_"));
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
      const { settings } = await chrome.storage.local.get(["settings"]);
      const cleanSettings = { ...(settings || {}) };
      delete cleanSettings.phone;
      delete cleanSettings.apiKey;
      cleanSettings.enableWhatsapp = false;
      cleanSettings.whatsappStatus = "unconfigured";

      await chrome.storage.local.set({
        savedNovels: {},
        stats: defaultStats,
        settings: cleanSettings,
        diagnosticLogs: [],
        notifiedHistory: {}
      });
      await clearInactiveAlarms();
      await refreshBrowserActionAppearance();
      return { ok: true, stats: defaultStats };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "UPDATE_NOVEL_GENRES") {
    withStorageLock(async () => {
      const seriesId = message.seriesId || message.novelKey;
      const { genres } = message;
      if (!seriesId || !Array.isArray(genres)) {
        return { ok: false, error: "invalid_params" };
      }
      const storage = await chrome.storage.local.get(["savedNovels", "stats"]);
      const savedNovels = storage.savedNovels || {};
      const stats = { ...getDefaultStats(), ...(storage.stats || {}) };
      if (!savedNovels[seriesId]) {
        return { ok: false, error: "novel_not_found" };
      }
      const normalized = Array.from(
        new Set(genres.map((g) => (typeof normalizeGenre === "function" ? normalizeGenre(g) : g)).filter(Boolean))
      );
      savedNovels[seriesId].genres = normalized;
      savedNovels[seriesId].genreSource = "manual";
      savedNovels[seriesId].updatedAt = Date.now();
      if (typeof evaluateGenreAchievements === "function") {
        evaluateGenreAchievements(stats, savedNovels);
      }
      await chrome.storage.local.set({ savedNovels, stats });
      await pushToCloudUnlocked(savedNovels, stats);
      return { ok: true, seriesId, genres: normalized, stats };
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return false;
});

async function handleConfirmUnconfirmedTab({ tabId, novelName, chapter, customName, url, seriesId, novelUrl }) {
  if (tabId) {
    try {
      if (typeof chrome !== "undefined" && chrome.tabs && typeof chrome.tabs.get === "function") {
        const tabInfo = await chrome.tabs.get(tabId);
        if (tabInfo && tabInfo.incognito) {
          return { ok: false, incognito: true, ignored: true };
        }
      }
    } catch {}
  }
  return withStorageLock(async () => {
    let tabData = null;
    if (tabId) {
      const storage = await chrome.storage.local.get([`tab_${tabId}`]);
      tabData = storage[`tab_${tabId}`];
    }
    const rawName = (customName || novelName || tabData?.novelName || "").trim();
    const finalName = rawName.slice(0, 300);
    const rawChap = String(chapter || tabData?.chapter || "1").trim();
    const finalChap = rawChap.slice(0, 50);
    const rawUrl = url || tabData?.url || "";
    if (!isValidHttpUrl(rawUrl)) {
      return { ok: false, error: "Invalid URL scheme" };
    }
    const finalUrl = rawUrl.slice(0, 2048);
    const rawNovelUrl = novelUrl || tabData?.novelUrl || "";
    let finalNovelUrl = "";
    if (rawNovelUrl) {
      if (!isValidHttpUrl(rawNovelUrl)) {
        return { ok: false, error: "Invalid novel URL scheme" };
      }
      finalNovelUrl = rawNovelUrl.slice(0, 2048);
    }
    let finalSeriesId = String(seriesId || tabData?.seriesId || "").slice(0, 200);

    if (!finalSeriesId) {
      const computed = computeCanonicalSeriesId(
        { url: finalUrl, novelUrl: finalNovelUrl, novelName: finalName },
        finalName
      );
      finalSeriesId = computed.seriesId || buildSeriesIdFromName(finalName, extractDomain(finalUrl));
    }

    const storage = await chrome.storage.local.get(["savedNovels", "stats", "settings"]);
    const savedNovels = storage.savedNovels || {};
    const existingKey = findExistingNovelKey(
      savedNovels,
      { url: finalUrl, novelUrl: finalNovelUrl, novelName: finalName, chapter: finalChap, seriesId: finalSeriesId },
      finalSeriesId,
      finalNovelUrl
    );
    if (existingKey) {
      finalSeriesId = existingKey;
    }
    let stats = { ...getDefaultStats(), ...(storage.stats || {}) };
    const existing = savedNovels[finalSeriesId];
    const isNew = !existing;

    const chapNum = parseFloat(finalChap) || 1;
    const prevMax = existing ? parseFloat(existing.maxCounted ?? existing.chapter) || 0 : 0;
    const chapDelta = isNew ? chapNum : Math.max(0, chapNum - prevMax);

    const allowRewind = storage.settings?.allowRewind !== false;
    const prevChapNum = existing && !existing.deleted ? parseFloat(existing.chapter) || 0 : NaN;
    let finalChapterToSave = finalChap;
    let finalUrlToSave = finalUrl || existing?.url || "";
    let finalScrollPctToSave = existing?.scrollPct || 0;

    if (!isNew && !isNaN(prevChapNum) && chapNum < prevChapNum && !allowRewind) {
      finalChapterToSave = existing.chapter;
      finalUrlToSave = existing.url;
      finalScrollPctToSave = typeof existing.scrollPct === "number" ? existing.scrollPct : 0;
    }

    const initialGenres = existing?.genres || (Array.isArray(tabData?.genres) ? tabData.genres : []);
    const initialSource = existing?.genreSource || (initialGenres.length > 0 ? "source" : "unknown");

    const entry = {
      ...(existing || {}),
      seriesId: finalSeriesId,
      novelName: existing?.customName || finalName,
      novelUrl: finalNovelUrl || existing?.novelUrl || "",
      url: finalUrlToSave,
      chapter: finalChapterToSave,
      maxCounted: Math.max(prevMax, chapNum, isNaN(prevChapNum) ? 0 : prevChapNum),
      scrollPct: finalScrollPctToSave,
      statusManual: existing?.statusManual || "",
      genres: initialGenres,
      genreSource: initialSource,
      completedCounted: Boolean(existing?.completedCounted),
      alert: null,
      updatedAt: (!isNew && !isNaN(prevChapNum) && chapNum < prevChapNum && !allowRewind) ? (existing.updatedAt || Date.now()) : Date.now()
    };
    if (existing?.customName || customName) {
      entry.customName = customName || existing.customName;
    }

    savedNovels[finalSeriesId] = entry;

    if (chapDelta > 0 || isNew) {
      const activeThemeId = storage.settings?.activeThemeId || "cultivation";
      stats = recordCultivationProgress(stats, chapDelta, isNew, 0, activeThemeId);
    }
    if (typeof evaluateSystemAchievements === "function") {
      evaluateSystemAchievements(stats, savedNovels);
    }

    const updates = { savedNovels, stats };
    if (tabId) {
      updates[`tab_${tabId}`] = { ...entry, unconfirmed: false };
      try {
        const pBadge = chrome.action.setBadgeText({ text: "", tabId });
        if (pBadge && typeof pBadge.catch === "function") pBadge.catch(() => {});
      } catch (_e) {}
    }

    await chrome.storage.local.set(updates);
    await refreshBrowserActionAppearance();
    await pushToCloudUnlocked(savedNovels, stats);
    return { ok: true, seriesId: finalSeriesId, chapter: finalChap, novelName: finalName };
  });
}

function setTabQuestionBadge(tabId, showQuestion) {
  if (!tabId) return;
  if (showQuestion) {
    try {
      const p1 = chrome.action.setBadgeText({ text: "?", tabId });
      if (p1 && typeof p1.catch === "function") p1.catch(() => {});
    } catch (_e) {}
    try {
      const p2 = chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId });
      if (p2 && typeof p2.catch === "function") p2.catch(() => {});
    } catch (_e) {}
  } else {
    try {
      const p3 = chrome.action.setBadgeText({ text: "", tabId });
      if (p3 && typeof p3.catch === "function") p3.catch(() => {});
    } catch (_e) {}
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
  if (tabId) {
    try {
      if (typeof chrome !== "undefined" && chrome.tabs && typeof chrome.tabs.get === "function") {
        const tabInfo = await chrome.tabs.get(tabId);
        if (tabInfo && tabInfo.incognito) {
          return { ok: false, incognito: true, ignored: true };
        }
      }
    } catch {}
  }
  return withStorageLock(async () => {
    // 1. Descartar de inmediato si es un dominio excluido, URL inválida o subpágina informativa
    if (
      !novelData ||
      !novelData.url ||
      !isValidHttpUrl(novelData.url) ||
      (await isDomainBlacklisted(novelData.url)) ||
      isInformationalOrNonReaderUrl(novelData.url)
    ) {
      setTabQuestionBadge(tabId, false);
      await chrome.storage.local.remove([`tab_${tabId}`]);
      return { ok: false, ignored: true, informational: isInformationalOrNonReaderUrl(novelData?.url) };
    }

    novelData.novelName = String(novelData.novelName || "").slice(0, 300);
    novelData.url = String(novelData.url).slice(0, 2048);
    if (novelData.novelUrl) {
      novelData.novelUrl = isValidHttpUrl(novelData.novelUrl) ? String(novelData.novelUrl).slice(0, 2048) : "";
    }
    novelData.chapter = String(novelData.chapter || "1").slice(0, 50);
    if (novelData.seriesId) {
      novelData.seriesId = String(novelData.seriesId).slice(0, 200);
    }

    const storage = await chrome.storage.local.get(["savedNovels", "stats", "settings"]);
    const rawSaved = storage.savedNovels || {};
    let currentStats = { ...getDefaultStats(), ...(storage.stats || {}) };
    const { migratedNovels: savedNovels } = deduplicateAndMigrateMap(rawSaved);

    const { seriesId: computedSeriesId, novelUrl } = computeCanonicalSeriesId(novelData, novelData.seriesId || novelData.novelName);
    const existingKey = findExistingNovelKey(savedNovels, novelData, computedSeriesId, novelUrl);
    const seriesId = existingKey || computedSeriesId;
    if (existingKey && computedSeriesId && existingKey !== computedSeriesId && savedNovels[computedSeriesId]) {
      savedNovels[seriesId].maxCounted = Math.max(
        parseFloat(savedNovels[seriesId].maxCounted) || 0,
        parseFloat(savedNovels[computedSeriesId].maxCounted) || 0
      );
      delete savedNovels[computedSeriesId];
    }
    const existing = savedNovels[seriesId];
    const isAlreadyKnownActive = Boolean(existing && !existing.deleted && !isBogusNovelName(existing.novelName, novelUrl));

    // 2. Si no es una serie ya activa y tampoco tiene novelUrl ni indicios de lectura, ignorar por completo
    if (!isAlreadyKnownActive && !novelUrl && !looksLikeReadingUrl(novelData.url)) {
      setTabQuestionBadge(tabId, false);
      await chrome.storage.local.remove([`tab_${tabId}`]);
      return { ok: false, ignored: true };
    }

    const strippedIncoming = stripChapterFromTitle(novelData.novelName, novelData.chapter);
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
        url: getHostnameFromUrl(novelData.url),
        pageTitle: novelData.pageTitle || "",
        rawName: novelData.novelName || "",
        chapter: resolvedChapterStr,
        seriesId
      });
      setTabQuestionBadge(tabId, true);
      return {
        ok: true,
        saved: false,
        unconfirmed: true,
        seriesId,
        novelName: cleanIncomingName || "",
        chapter: resolvedChapterStr,
        url: novelData.url,
        novelUrl
      };
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
    const hasValidNewChap = !isNaN(newChapNum) && isFinite(newChapNum) && newChapNum >= 0;
    const hasValidPrevChap = !isNaN(prevChapNum) && isFinite(prevChapNum) && prevChapNum >= 0;
    const prevMaxCounted = existing && !existing.deleted
      ? parseFloat(existing.maxCounted ?? existing.chapter)
      : NaN;

    const allowRewind = storage.settings?.allowRewind !== false;

    let chaptersToCount = 0;
    let isNewNovelStarted = false;
    let newMaxCounted = !isNaN(prevMaxCounted) ? prevMaxCounted : (!isNaN(newChapNum) ? newChapNum : 0);
    let alertObj = existing?.alert || null;
    let scrollPct = 0;
    let restoreScrollPct = 0;

    let finalChapter = resolvedChapterStr;
    let finalUrl = novelData.url;
    let finalScrollPct = 0;
    let isRewindPrevented = false;
    let isInvalidDetectionOnExisting = false;

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
      finalChapter = resolvedChapterStr;
      finalUrl = novelData.url;
      finalScrollPct = 0;
    } else {
      if (!hasValidNewChap && hasValidPrevChap) {
        // Detección inválida, intermedia o sin número: no sobrescribir el progreso válido
        isInvalidDetectionOnExisting = true;
        finalChapter = existing.chapter;
        finalUrl = existing.url;
        finalScrollPct = typeof existing.scrollPct === "number" ? existing.scrollPct : 0;
        newMaxCounted = Math.max(prevMaxCounted || 0, prevChapNum);
        alertObj = existing.alert || null;
        chaptersToCount = 0;
        restoreScrollPct = 0;
      } else if (hasValidNewChap && hasValidPrevChap) {
        const diffFromSaved = newChapNum - prevChapNum;
        const isAlphabeticalRewind = () => {
          if (diffFromSaved !== 0 || resolvedChapterStr === existing.chapter) return false;
          const mPrev = String(existing.chapter).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z])$/);
          const mNew = String(resolvedChapterStr).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z])$/);
          return Boolean(mPrev && mNew && mPrev[1] === mNew[1] && mNew[2] < mPrev[2]);
        };
        const isRewind = diffFromSaved < 0 || isAlphabeticalRewind();

        if (isRewind && !allowRewind) {
          // Retroceso deshabilitado: mantener capítulo guardado, URL, scroll y progreso máximo
          isRewindPrevented = true;
          finalChapter = existing.chapter;
          finalUrl = existing.url;
          finalScrollPct = typeof existing.scrollPct === "number" ? existing.scrollPct : 0;
          newMaxCounted = Math.max(prevMaxCounted || 0, prevChapNum, newChapNum);
          alertObj = existing.alert || null;
          chaptersToCount = 0;
          restoreScrollPct = 0;
        } else {
          // Retroceso habilitado (o avance / mismo capítulo)
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

          finalChapter = resolvedChapterStr;
          finalUrl = novelData.url;
          finalScrollPct = scrollPct;
        }
      } else {
        if (String(existing.chapter) === resolvedChapterStr) {
          scrollPct = typeof existing.scrollPct === "number" ? existing.scrollPct : 0;
          restoreScrollPct = scrollPct;
        } else {
          scrollPct = 0;
          restoreScrollPct = 0;
        }
        finalChapter = resolvedChapterStr;
        finalUrl = novelData.url;
        finalScrollPct = scrollPct;
      }
    }

    // P1-1: Detección ambigua o AUTO_NEXT: NUNCA conceder Qi ni contar capítulos adicionales
    if (novelData.chapter === "AUTO_NEXT" || resolvedChapterStr === "AUTO_NEXT" || (!confident && !isAlreadyKnownActive)) {
      chaptersToCount = 0;
      isNewNovelStarted = false;
    }

    if (chaptersToCount > 0 || isNewNovelStarted) {
      const activeThemeId = storage.settings?.activeThemeId || "cultivation";
      currentStats = recordCultivationProgress(currentStats, chaptersToCount, isNewNovelStarted, 0, activeThemeId);
    }

    const combinedGenres = Array.isArray(existing?.genres)
      ? existing.genres
      : (Array.isArray(novelData.genres) ? novelData.genres : []);
    const genreSource = existing?.genreSource || (combinedGenres.length > 0 ? "source" : "unknown");

    const updatedEntry = {
      seriesId,
      novelName: stableNovelName,
      novelUrl: stableNovelUrl,
      url: finalUrl,
      chapter: finalChapter,
      maxCounted: newMaxCounted,
      scrollPct: finalScrollPct,
      statusManual: existing?.statusManual || "",
      genres: combinedGenres,
      genreSource,
      completedCounted: Boolean(existing?.completedCounted),
      alert: alertObj,
      lastTabId: tabId,
      updatedAt: (isRewindPrevented || isInvalidDetectionOnExisting) ? (existing.updatedAt || Date.now()) : (novelData.updatedAt || Date.now())
    };
    if (customName) {
      updatedEntry.customName = customName;
    }

    savedNovels[seriesId] = updatedEntry;
    if (typeof evaluateSystemAchievements === "function") {
      evaluateSystemAchievements(currentStats, savedNovels);
    }

    await chrome.storage.local.set({
      savedNovels,
      stats: currentStats,
      [`tab_${tabId}`]: { ...updatedEntry, chapter: finalChapter, unconfirmed: false }
    });

    await appendDiagnosticLog({
      event: isRewindPrevented
        ? "DETECT_REWIND_PREVENTED"
        : isInvalidDetectionOnExisting
          ? "DETECT_INVALID_CHAPTER_PREVENTED"
          : "DETECT_SAVED_OK",
      novelName: stableNovelName,
      chapter: finalChapter,
      detectedChapter: resolvedChapterStr,
      seriesId,
      novelUrl: getHostnameFromUrl(stableNovelUrl),
      url: getHostnameFromUrl(novelData.url)
    });

    setTabQuestionBadge(tabId, false);
    chrome.alarms.clear(`inactive_${tabId}`);

    await refreshBrowserActionAppearance();
    const hasDataChanged =
      !isRewindPrevented &&
      !isInvalidDetectionOnExisting &&
      (isNewNovelStarted ||
      chaptersToCount > 0 ||
      !existing ||
      existing.deleted ||
      existing.chapter !== finalChapter ||
      existing.url !== finalUrl ||
      existing.novelName !== stableNovelName);

    if (hasDataChanged) {
      await pushToCloudUnlocked(savedNovels, currentStats);
    }
    return {
      ok: true,
      saved: true,
      seriesId,
      chapter: finalChapter,
      restoreScrollPct,
      rewindPrevented: isRewindPrevented
    };
  });
}

function buildCallMeBotUrl(phone, apiKey, textMsg) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const cleanApiKey = encodeURIComponent(String(apiKey || "").trim());
  const cleanText = encodeURIComponent(String(textMsg || ""));
  if (!cleanPhone || !cleanApiKey) return null;
  return `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${cleanText}&apikey=${cleanApiKey}`;
}

async function handleTestWhatsapp(data) {
  await initI18n();
  const storage = await chrome.storage.local.get(["settings"]);
  const initialSettings = { ...(storage.settings || {}), ...(data || {}) };
  const waUrl = buildCallMeBotUrl(initialSettings.phone, initialSettings.apiKey, t("wa_msg_test"));

  if (!waUrl) {
    await withStorageLock(async () => {
      const cur = (await chrome.storage.local.get(["settings"])).settings || {};
      cur.whatsappStatus = "unconfigured";
      await chrome.storage.local.set({ settings: cur });
    });
    return { ok: false, status: "unconfigured" };
  }

  let finalStatus = "error";
  let ok = false;

  try {
    const res = await fetch(waUrl);
    const bodyText = await res.text().catch(() => "");
    const isErrorBody = /error|invalid|not activated/i.test(bodyText);
    if (res.ok && !isErrorBody) {
      finalStatus = "working";
      ok = true;
    } else {
      finalStatus = "error";
      await appendDiagnosticLog({ event: "WHATSAPP_TEST_FAIL", status: res.status });
    }
  } catch (err) {
    finalStatus = "error";
    await appendDiagnosticLog({ event: "WHATSAPP_NETWORK_ERROR", error: String(err) });
  }

  await withStorageLock(async () => {
    const cur = (await chrome.storage.local.get(["settings"])).settings || {};
    cur.whatsappStatus = finalStatus;
    if (data?.phone !== undefined) cur.phone = data.phone;
    if (data?.apiKey !== undefined) cur.apiKey = data.apiKey;
    await chrome.storage.local.set({ settings: cur });
  });

  return { ok, status: finalStatus };
}

async function handleImportData(payload) {
  return withStorageLock(async () => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false, error: "INVALID_PAYLOAD" };
    }

    const integrityCheck = verifyExportIntegrity(payload);
    if (!integrityCheck.ok) {
      return { ok: false, error: integrityCheck.error };
    }

    let actualPayload = payload;
    if (payload.exportMetadata && payload.data) {
      actualPayload = payload.data;
    }

    const storage = await chrome.storage.local.get(["savedNovels", "stats", "settings"]);
    const localNovels = storage.savedNovels || {};
    const rawIncoming = actualPayload.novels || actualPayload.savedNovels || {};

    let incomingEntries = [];
    if (Array.isArray(rawIncoming)) {
      incomingEntries = rawIncoming.map((entry, idx) => [entry?.seriesId || String(idx), entry]);
    } else if (rawIncoming && typeof rawIncoming === "object") {
      incomingEntries = Object.entries(rawIncoming);
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let discarded = 0;

    const MAX_IMPORT_NOVELS = 5000;
    const MAX_IMPORT_DOMAINS = 2000;

    if (incomingEntries.length > MAX_IMPORT_NOVELS) {
      discarded += (incomingEntries.length - MAX_IMPORT_NOVELS);
      incomingEntries = incomingEntries.slice(0, MAX_IMPORT_NOVELS);
    }

    const combinedNovels = { ...localNovels };

    for (const [rawKey, incEntry] of incomingEntries) {
      if (!incEntry || typeof incEntry !== "object" || Array.isArray(incEntry)) {
        discarded++;
        continue;
      }

      // URL validation: if url or novelUrl is present, it must be valid http/https and <= 2048 chars
      if (incEntry.url) {
        if (typeof incEntry.url !== "string" || !isValidHttpUrl(incEntry.url) || incEntry.url.length > 2048) {
          discarded++;
          continue;
        }
      }
      if (incEntry.novelUrl) {
        if (typeof incEntry.novelUrl !== "string" || !isValidHttpUrl(incEntry.novelUrl) || incEntry.novelUrl.length > 2048) {
          discarded++;
          continue;
        }
      }

      // Check identifying string
      const novelNameStr = typeof incEntry.novelName === "string" ? incEntry.novelName.trim() : "";
      const customNameStr = typeof incEntry.customName === "string" ? incEntry.customName.trim() : "";
      const seriesIdStr = typeof incEntry.seriesId === "string" ? incEntry.seriesId.trim() : "";
      const urlStr = typeof incEntry.url === "string" ? incEntry.url.trim() : "";
      if (!novelNameStr && !customNameStr && !seriesIdStr && !urlStr) {
        discarded++;
        continue;
      }

      // Truncate strings to safe bounds
      const sanitizedEntry = {
        ...incEntry,
        novelName: novelNameStr.slice(0, 300),
        customName: customNameStr ? customNameStr.slice(0, 300) : undefined,
        url: urlStr.slice(0, 2048),
        novelUrl: incEntry.novelUrl ? String(incEntry.novelUrl).slice(0, 2048) : "",
        chapter: incEntry.chapter !== undefined && incEntry.chapter !== null ? String(incEntry.chapter).slice(0, 50) : "",
        seriesId: seriesIdStr ? seriesIdStr.slice(0, 256) : undefined
      };
      if (!sanitizedEntry.customName) delete sanitizedEntry.customName;
      if (!sanitizedEntry.novelUrl) delete sanitizedEntry.novelUrl;
      if (!sanitizedEntry.seriesId) delete sanitizedEntry.seriesId;

      const { seriesId } = computeCanonicalSeriesId(sanitizedEntry, sanitizedEntry.seriesId || rawKey);
      let localEntry = combinedNovels[seriesId] || combinedNovels[rawKey] || (sanitizedEntry.seriesId ? combinedNovels[sanitizedEntry.seriesId] : null);

      if (!localEntry) {
        const incNovelNorm = normalizeText(sanitizedEntry.novelName);
        const incCustomNorm = normalizeText(sanitizedEntry.customName);
        for (const [locK, locE] of Object.entries(combinedNovels)) {
          if (!locE) continue;
          const locNovelNorm = normalizeText(locE.novelName);
          const locCustomNorm = normalizeText(locE.customName);
          if (
            (incNovelNorm && locNovelNorm && incNovelNorm === locNovelNorm) ||
            (incCustomNorm && locCustomNorm && incCustomNorm === locCustomNorm) ||
            (incNovelNorm && locCustomNorm && incNovelNorm === locCustomNorm) ||
            (incCustomNorm && locNovelNorm && incCustomNorm === locNovelNorm)
          ) {
            localEntry = locE;
            delete combinedNovels[locK];
            break;
          }
        }
      }

      if (rawKey !== seriesId && combinedNovels[rawKey]) {
        delete combinedNovels[rawKey];
      }
      if (sanitizedEntry.seriesId && sanitizedEntry.seriesId !== seriesId && combinedNovels[sanitizedEntry.seriesId]) {
        delete combinedNovels[sanitizedEntry.seriesId];
      }

      if (!localEntry) {
        combinedNovels[seriesId] = { ...sanitizedEntry, seriesId };
        if (!sanitizedEntry.deleted) added++;
      } else {
        const incMax = parseFloat(sanitizedEntry.maxCounted ?? sanitizedEntry.chapter) || 0;
        const locMax = parseFloat(localEntry.maxCounted ?? localEntry.chapter) || 0;
        const bestMax = Math.max(incMax, locMax);
        const isIncomingNewer = (sanitizedEntry.updatedAt || 0) > (localEntry.updatedAt || 0);
        const customName = isIncomingNewer
          ? (sanitizedEntry.customName || localEntry.customName)
          : (localEntry.customName || sanitizedEntry.customName);

        if (isIncomingNewer) {
          combinedNovels[seriesId] = {
            ...localEntry,
            ...sanitizedEntry,
            seriesId,
            maxCounted: bestMax,
            ...(customName ? { customName } : {})
          };
          updated++;
        } else {
          combinedNovels[seriesId] = {
            ...localEntry,
            maxCounted: bestMax,
            ...(customName ? { customName } : {})
          };
          skipped++;
        }
      }
    }

    const { migratedNovels } = deduplicateAndMigrateMap(combinedNovels);
    const mergedStats = (actualPayload.stats && typeof actualPayload.stats === "object" && !Array.isArray(actualPayload.stats))
      ? mergeStatsObjects(storage.stats, actualPayload.stats)
      : (storage.stats || getDefaultStats());

    const currentSettings = storage.settings || {};
    const incSettings = (actualPayload.settings && typeof actualPayload.settings === "object" && !Array.isArray(actualPayload.settings))
      ? actualPayload.settings
      : {};
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

    if (Array.isArray(actualPayload.domainBlacklist)) {
      const currentBl = await getStoredDomainBlacklist();
      const blMap = new Map();
      currentBl.forEach((item) => {
        const d = normalizeDomain(item && item.domain);
        const rawAddedAt = typeof item === "object" && item !== null ? Number(item.addedAt) : NaN;
        const safeAddedAt = Number.isFinite(rawAddedAt) && rawAddedAt > 0 ? rawAddedAt : Date.now();
        if (d) blMap.set(d, { domain: d, addedAt: safeAddedAt });
      });
      actualPayload.domainBlacklist.slice(0, MAX_IMPORT_DOMAINS).forEach((item) => {
        const d = normalizeDomain(typeof item === "string" ? item : item?.domain);
        const rawAddedAt = typeof item === "object" && item !== null ? Number(item.addedAt) : NaN;
        const safeAddedAt = Number.isFinite(rawAddedAt) && rawAddedAt > 0 ? rawAddedAt : Date.now();
        const isValid = Boolean(d && d.length <= 253 && d.includes(".") && !/\s/.test(d) && !d.startsWith(".") && !d.endsWith("."));
        if (isValid && blMap.size < MAX_IMPORT_DOMAINS && !blMap.has(d)) {
          blMap.set(d, { domain: d, addedAt: safeAddedAt });
        }
      });
      const mergedBl = Array.from(blMap.values())
        .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        .slice(0, MAX_IMPORT_DOMAINS);
      await chrome.storage.local.set({ domainBlacklist: mergedBl });
      cachedDomainBlacklist = mergedBl;
      await pushDomainBlacklistToCloud(mergedBl);
    }

    await refreshBrowserActionAppearance();
    await pushToCloudUnlocked(migratedNovels, mergedStats);
    return { ok: true, added, updated, skipped, discarded };
  });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const currentTabId = activeInfo.tabId;
  chrome.alarms.clear(`inactive_${currentTabId}`);

  try {
    if (typeof chrome !== "undefined" && chrome.tabs && typeof chrome.tabs.get === "function") {
      const activeTab = await chrome.tabs.get(currentTabId);
      if (activeTab && activeTab.incognito) return;
    }
  } catch {}

  const { settings } = await chrome.storage.local.get(["settings"]);
  if (!settings || !settings.enableWhatsapp) return;

  const allData = await chrome.storage.local.get(null);

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
  const waUrl = buildCallMeBotUrl(settings.phone, settings.apiKey, textMsg);
  if (!waUrl) return;

  let isWorking = false;
  try {
    const res = await fetch(waUrl);
    isWorking = res.ok;
  } catch {
    isWorking = false;
  }

  await withStorageLock(async () => {
    const fresh = await chrome.storage.local.get(["notifiedHistory", "settings"]);
    const curSettings = fresh.settings || {};
    curSettings.whatsappStatus = isWorking ? "working" : "error";
    const updates = { settings: curSettings };
    if (isWorking) {
      const curHistory = fresh.notifiedHistory || {};
      curHistory[historyKey] = String(currentSaved.chapter);
      updates.notifiedHistory = curHistory;
    }
    await chrome.storage.local.set(updates);
  });
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
  if (!isValidHttpUrl(url)) return;
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
      .filter((n) => n && !n.deleted && n.url && isValidHttpUrl(n.url))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (novels.length > 0) {
      chrome.tabs.create({ url: novels[0].url });
    }
  }
});

async function getValidAuth(forceRefresh = false) {
  const { auth } = await chrome.storage.local.get(["auth"]);
  if (!auth) return null;

  if (!forceRefresh && auth.idToken && auth.expiresAt && Date.now() < auth.expiresAt - 300000) {
    return auth;
  }

  if (!auth.refreshToken) {
    if (auth.idToken && (!auth.expiresAt || Date.now() < auth.expiresAt)) {
      return auth;
    }
    return null;
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
    if (data && data.id_token) {
      const updatedAuth = {
        ...auth,
        idToken: data.id_token,
        refreshToken: data.refresh_token || data.refreshToken || auth.refreshToken,
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

async function pushToCloudUnlocked(novelsMap, statsObj, blacklistArr) {
  const auth = await getValidAuth();
  if (!auth) return { ok: false, error: "NO_AUTH" };

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 1. Obtener estado actual de la nube y su ETag para control de concurrencia
      const getRes = await fetch(
        getFirebaseUrl(`/users/${auth.uid}/novels.json`, auth.idToken),
        { headers: { "X-Firebase-ETag": "true" } }
      );
      if (!getRes.ok) {
        throw new Error(`GET_NOVELS_${getRes.status}`);
      }
      const remoteNovels = (await getRes.json()) || {};
      const remoteETag = getRes.headers?.get?.("ETag") || null;

      // 2. Fusionar concurrentemente lo remoto con lo local para no borrar novelas de otro equipo
      const { settings } = await chrome.storage.local.get(["settings"]);
      const allowRewind = settings?.allowRewind !== false;
      const localMig = deduplicateAndMigrateMap(novelsMap || {});
      const cloudMig = deduplicateAndMigrateMap(remoteNovels || {});
      const { mergedNovels } = mergeNovelsMaps(localMig.migratedNovels, cloudMig.migratedNovels, allowRewind);

      const safePayload = {};
      for (const [k, v] of Object.entries(mergedNovels)) {
        const safeKey = sanitizeRtdbKey(k);
        safePayload[safeKey] = v;
      }

      // 3. Preparar encabezados con If-Match si hay un ETag conocido
      const putHeaders = { "Content-Type": "application/json" };
      if (remoteETag) {
        putHeaders["If-Match"] = remoteETag;
      }

      const putRes = await fetch(getFirebaseUrl(`/users/${auth.uid}/novels.json`, auth.idToken), {
        method: "PUT",
        headers: putHeaders,
        body: JSON.stringify(safePayload)
      });

      // 4. Si hay conflicto de concurrencia (412 Precondition Failed), reintentar tras breve espera
      if (putRes.status === 412) {
        console.warn(`[Background] Conflicto de concurrencia ETag (412). Reintento ${attempt + 1}/${MAX_RETRIES}...`);
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        continue;
      }

      if (!putRes.ok) {
        const errMsg = `HTTP_${putRes.status}`;
        lastError = errMsg;
        await appendDiagnosticLog({ event: "CLOUD_PUSH_NOVELS_ERROR", error: errMsg });
        await chrome.storage.local.set({ lastSyncError: { at: Date.now(), error: errMsg } });
        return { ok: false, error: errMsg };
      }

      // Escritura de novelas exitosa: capturar nuevo ETag
      const newETag = putRes.headers?.get?.("ETag") || null;

      // 5. Actualizar la copia local con la versión consolidada
      await chrome.storage.local.set({ savedNovels: mergedNovels });

      // 6. Push de stats y blacklist
      const promises = [];

      let cleanStats = statsObj;
      if (cleanStats) {
        if (!cleanStats.updatedAt || cleanStats.updatedAt <= 0) {
          cleanStats = { ...cleanStats, updatedAt: Date.now() };
        }
        promises.push(
          fetch(getFirebaseUrl(`/users/${auth.uid}/stats.json`, auth.idToken), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cleanStats)
          })
        );
      }

      const currentBl = blacklistArr !== undefined ? blacklistArr : cachedDomainBlacklist;
      if (Array.isArray(currentBl)) {
        promises.push(
          fetch(getFirebaseUrl(`/users/${auth.uid}/domainBlacklist.json`, auth.idToken), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentBl)
          })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      // 7. Persistir metadatos de sincronización exitosa
      await setCloudSyncMeta(auth.uid, {
        lastPullAt: Date.now(),
        novelsETag: newETag || remoteETag
      });

      await chrome.storage.local.remove(["lastSyncError"]);
      return { ok: true, retries: attempt, mergedCount: Object.keys(mergedNovels).length };
    } catch (e) {
      lastError = String(e);
      await appendDiagnosticLog({ event: "CLOUD_PUSH_ERROR", error: String(e) });
      await chrome.storage.local.set({ lastSyncError: { at: Date.now(), error: String(e) } });
      return { ok: false, error: String(e) };
    }
  }

  const finalErr = lastError || "SYNC_CONFLICT_LIMIT_EXCEEDED";
  await chrome.storage.local.set({ lastSyncError: { at: Date.now(), error: finalErr } });
  return { ok: false, error: finalErr };
}

async function switchAccountProfile(targetUid, mergeGuestData = false) {
  const normTarget = targetUid && typeof targetUid === "string" ? targetUid : "guest";
  const storage = await chrome.storage.local.get([
    "lastAuthUid",
    "lastAuthenticatedUid",
    "savedNovels",
    "stats",
    "domainBlacklist",
    "guest_data",
    `account_data_${normTarget}`,
    "settings"
  ]);

  const currentUid = storage.lastAuthUid || "guest";
  if (currentUid === normTarget) {
    return { ok: true, switched: false, currentUid };
  }

  // 1. Guardar estado activo en la bóveda del usuario saliente
  const activeSnapshot = {
    savedNovels: storage.savedNovels || {},
    stats: storage.stats || getDefaultStats(),
    domainBlacklist: storage.domainBlacklist || [],
    updatedAt: Date.now()
  };

  const toSave = {};
  if (currentUid === "guest") {
    toSave.guest_data = activeSnapshot;
  } else {
    toSave[`account_data_${currentUid}`] = activeSnapshot;
  }

  // 2. Restaurar estado de la bóveda del usuario entrante
  let targetData = null;
  if (normTarget === "guest") {
    targetData = storage.guest_data || null;
  } else {
    targetData = storage[`account_data_${normTarget}`] || null;
  }

  let restoredNovels = {};
  let restoredStats = getDefaultStats();
  let restoredBlacklist = [];

  if (targetData && typeof targetData === "object") {
    restoredNovels = targetData.savedNovels || {};
    restoredStats = targetData.stats || getDefaultStats();
    restoredBlacklist = Array.isArray(targetData.domainBlacklist) ? targetData.domainBlacklist : [];
  }

  // 3. Fusión controlada de datos de invitado a cuenta registrada SOLO si el usuario lo confirmó expresamente (P0-2)
  if (normTarget !== "guest" && currentUid === "guest" && mergeGuestData === true) {
    const guestNovels = activeSnapshot.savedNovels || {};
    const guestStats = activeSnapshot.stats || getDefaultStats();
    const guestBlacklist = activeSnapshot.domainBlacklist || [];

    const mergedNovels = { ...restoredNovels };
    for (const [k, gItem] of Object.entries(guestNovels)) {
      if (!gItem || gItem.deleted) continue;
      const existingAccountItem = mergedNovels[k];
      if (!existingAccountItem) {
        mergedNovels[k] = gItem;
      } else {
        const gTime = gItem.updatedAt || 0;
        const aTime = existingAccountItem.updatedAt || 0;
        const gChap = parseFloat(gItem.chapter) || 0;
        const aChap = parseFloat(existingAccountItem.chapter) || 0;
        if (gChap > aChap || (gChap === aChap && gTime > aTime)) {
          mergedNovels[k] = { ...existingAccountItem, ...gItem };
        }
      }
    }
    restoredNovels = mergedNovels;

    restoredStats = mergeStatsObjects(restoredStats, guestStats);

    const blSet = new Set(restoredBlacklist.map((b) => (typeof b === "string" ? b : b?.domain)).filter(Boolean));
    guestBlacklist.forEach((b) => {
      const d = typeof b === "string" ? b : b?.domain;
      if (d && !blSet.has(d)) {
        blSet.add(d);
        restoredBlacklist.push(typeof b === "object" ? b : { domain: d, addedAt: Date.now() });
      }
    });
  }

  // 4. Asociar avatar personalizado de invitado a cuenta registrada si el perfil de destino no tiene avatar
  if (normTarget !== "guest" && currentUid === "guest") {
    const guestAvKey = "userAvatar_guest";
    const targetAvKey = `userAvatar_${normTarget}`;
    const avStore = await chrome.storage.local.get([guestAvKey, targetAvKey]);
    if (avStore[guestAvKey] && !avStore[targetAvKey]) {
      toSave[targetAvKey] = avStore[guestAvKey];
    }
  }

  // 5. Aislamiento de ajustes de WhatsApp entre cuentas autenticadas distintas
  if (normTarget !== "guest") {
    const prevAuthUid = storage.lastAuthenticatedUid || (storage.lastAuthUid && storage.lastAuthUid !== "guest" ? storage.lastAuthUid : null);
    if (prevAuthUid && prevAuthUid !== normTarget) {
      const currentSettings = storage.settings || {};
      const cleanSettings = { ...currentSettings };
      delete cleanSettings.phone;
      delete cleanSettings.apiKey;
      cleanSettings.enableWhatsapp = false;
      cleanSettings.whatsappStatus = "unconfigured";
      toSave.settings = cleanSettings;
      toSave.diagnosticLogs = [];
      toSave.notifiedHistory = {};
      await clearInactiveAlarms();
    }
    toSave.lastAuthenticatedUid = normTarget;
  }

  toSave.savedNovels = restoredNovels;
  toSave.stats = restoredStats;
  toSave.domainBlacklist = restoredBlacklist;
  toSave.lastAuthUid = normTarget;

  cachedDomainBlacklist = restoredBlacklist;
  await chrome.storage.local.set(toSave);
  await refreshBrowserActionAppearance();

  return { ok: true, switched: true, previousUid: currentUid, newUid: normTarget };
}

const CLOUD_SYNC_CACHE_MS = 10 * 60 * 1000;
let inFlightCloudPullPromise = null;

async function pullFromCloud(force = false) {
  if (inFlightCloudPullPromise && !force) {
    return inFlightCloudPullPromise;
  }

  inFlightCloudPullPromise = withStorageLock(async () => {
    const { auth: rawAuth } = await chrome.storage.local.get(["auth"]);
    if (!rawAuth || !rawAuth.refreshToken) {
      const { lastAuthUid } = await chrome.storage.local.get(["lastAuthUid"]);
      if (lastAuthUid && lastAuthUid !== "guest") {
        await switchAccountProfile("guest");
      }
      await refreshBrowserActionAppearance();
      return { ok: false, error: "NO_AUTH" };
    }

    const auth = await getValidAuth();
    if (!auth) {
      // Dispositivo offline o error de red temporal al refrescar token.
      // Mantener al usuario en su perfil activo para lectura offline sin conmutar a invitado.
      return { ok: false, error: "OFFLINE_AUTH_FAILED" };
    }

    // P1-3: Política de caché de sincronización persistente por UID (10 minutos para lecturas pasivas)
    const syncMeta = await getCloudSyncMeta(auth.uid);
    const lastPull = syncMeta?.lastPullAt || 0;
    if (!force && lastPull > 0 && Date.now() - lastPull < CLOUD_SYNC_CACHE_MS) {
      return { ok: true, cached: true, lastSyncAt: lastPull };
    }

    const { lastAuthUid } = await chrome.storage.local.get(["lastAuthUid"]);
    if (lastAuthUid && lastAuthUid !== auth.uid) {
      await switchAccountProfile(auth.uid);
    } else if (!lastAuthUid) {
      await chrome.storage.local.set({ lastAuthUid: auth.uid });
    }

    const { savedNovels, stats, settings } = await chrome.storage.local.get(["savedNovels", "stats", "settings"]);
    const allowRewind = settings?.allowRewind !== false;
    const localMig = deduplicateAndMigrateMap(savedNovels || {});
    let localStats = evaluateUnlockedTitles({ ...getDefaultStats(), ...(stats || {}) });

    if (localMig.changed) {
      await chrome.storage.local.set({ savedNovels: localMig.migratedNovels });
    }

    try {
      const [novelsRes, statsRes, blacklistRes] = await Promise.all([
        fetch(getFirebaseUrl(`/users/${auth.uid}/novels.json`, auth.idToken)),
        fetch(getFirebaseUrl(`/users/${auth.uid}/stats.json`, auth.idToken)),
        fetch(getFirebaseUrl(`/users/${auth.uid}/domainBlacklist.json`, auth.idToken)).catch(() => null)
      ]);

      if (!novelsRes.ok || !statsRes.ok) {
        return { ok: false, error: `FIREBASE_HTTP_ERROR: ${novelsRes.status}/${statsRes.status}` };
      }

      if (blacklistRes && blacklistRes.ok) {
        const rawCloudBl = (await blacklistRes.json()) || [];
        if (Array.isArray(rawCloudBl)) {
          const localBl = await getStoredDomainBlacklist();
          const blMap = new Map();
          localBl.forEach((item) => {
            const d = normalizeDomain(typeof item === "string" ? item : item?.domain);
            const addedAt = (typeof item === "object" && typeof item?.addedAt === "number") ? item.addedAt : Date.now();
            if (d) blMap.set(d, { domain: d, addedAt });
          });
          let cloudHadNew = false;
          rawCloudBl.forEach((item) => {
            const d = normalizeDomain(typeof item === "string" ? item : item?.domain);
            const addedAt = (typeof item === "object" && typeof item?.addedAt === "number") ? item.addedAt : Date.now();
            if (d && !blMap.has(d)) {
              blMap.set(d, { domain: d, addedAt });
              cloudHadNew = true;
            }
          });
          const mergedBl = Array.from(blMap.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
          await chrome.storage.local.set({ domainBlacklist: mergedBl });
          cachedDomainBlacklist = mergedBl;
          if (mergedBl.length > rawCloudBl.length) {
            await pushDomainBlacklistToCloud(mergedBl);
          }
        }
      }

      const novelsETag = novelsRes.headers?.get?.("ETag") || null;
      const rawCloudNovels = novelsRes.ok ? (await novelsRes.json()) || {} : {};
      const rawCloudStats = statsRes.ok ? (await statsRes.json()) || null : null;

      const cloudMig = deduplicateAndMigrateMap(rawCloudNovels);
      const { mergedNovels, shouldPush: novelsShouldPush } = mergeNovelsMaps(
        localMig.migratedNovels,
        cloudMig.migratedNovels,
        allowRewind
      );
      let shouldPush = novelsShouldPush || cloudMig.changed || localMig.changed;

      const mergedStats = rawCloudStats ? mergeStatsObjects(localStats, rawCloudStats) : localStats;
      if (!rawCloudStats || (mergedStats.updatedAt || 0) > (rawCloudStats.updatedAt || 0)) {
        shouldPush = true;
      }

      await chrome.storage.local.set({
        savedNovels: mergedNovels,
        stats: mergedStats
      });

      await refreshBrowserActionAppearance();

      if (shouldPush) {
        await pushToCloudUnlocked(mergedNovels, mergedStats);
      }

      const nowSuccess = Date.now();
      await setCloudSyncMeta(auth.uid, {
        lastPullAt: nowSuccess,
        novelsETag
      });

      return { ok: true, cached: false, lastSyncAt: nowSuccess };
    } catch (e) {
      await appendDiagnosticLog({ event: "CLOUD_PULL_ERROR", error: String(e) });
      return { ok: false, error: String(e) };
    } finally {
      inFlightCloudPullPromise = null;
    }
  });

  return inFlightCloudPullPromise;
}

if (typeof globalThis !== "undefined") {
  globalThis.normalizeDomain = normalizeDomain;
  globalThis.matchesDomainPattern = matchesDomainPattern;
  globalThis.isDomainBlacklisted = isDomainBlacklisted;
  globalThis.isHostBlacklistedSync = isHostBlacklistedSync;
  globalThis.addDomainToBlacklist = addDomainToBlacklist;
  globalThis.removeDomainFromBlacklist = removeDomainFromBlacklist;
  globalThis.clearDomainBlacklist = clearDomainBlacklist;
  globalThis.getStoredDomainBlacklist = getStoredDomainBlacklist;
  globalThis.handleConfirmUnconfirmedTab = handleConfirmUnconfirmedTab;
  globalThis.handleNovelDetected = handleNovelDetected;
  globalThis.findExistingNovelKey = findExistingNovelKey;
  globalThis.isSameDomainOrSubdomain = isSameDomainOrSubdomain;
  globalThis.deduplicateAndMigrateMap = deduplicateAndMigrateMap;
  globalThis.mergeStatsObjects = mergeStatsObjects;
  globalThis.refreshBrowserActionAppearance = refreshBrowserActionAppearance;
  globalThis.TIER_ROMAN = TIER_ROMAN;
  globalThis.RARITY_BADGE_COLORS = RARITY_BADGE_COLORS;
  globalThis.BASE_TOOLBAR_ICONS = BASE_TOOLBAR_ICONS;
  globalThis.getToolbarIconPathsForTitle = getToolbarIconPathsForTitle;
  globalThis.resetRenderedStateKey = resetRenderedStateKey;
  globalThis.switchAccountProfile = switchAccountProfile;
  globalThis.isInformationalOrNonReaderUrl = isInformationalOrNonReaderUrl;
  globalThis.NON_READER_SUBPAGE_REGEX = NON_READER_SUBPAGE_REGEX;
  globalThis.CHAPTER_LISTING_SUBPAGE_REGEX = CHAPTER_LISTING_SUBPAGE_REGEX;
  globalThis.CHAPTER_URL_REGEX = CHAPTER_URL_REGEX;
  globalThis.isBogusNovelName = isBogusNovelName;
  globalThis.isValidSeriesPath = isValidSeriesPath;
  globalThis.CATALOG_SEGMENTS = CATALOG_SEGMENTS;
  globalThis.BOGUS_NAMES = BOGUS_NAMES;
  globalThis.clearInactiveAlarms = clearInactiveAlarms;
  globalThis.getHostnameFromUrl = getHostnameFromUrl;
  globalThis.getFirebaseUrl = getFirebaseUrl;
  globalThis.verifyExportIntegrity = verifyExportIntegrity;
  globalThis.mergeNovelsMaps = mergeNovelsMaps;
  globalThis.getCloudSyncMeta = getCloudSyncMeta;
  globalThis.setCloudSyncMeta = setCloudSyncMeta;
  globalThis.pushToCloudUnlocked = pushToCloudUnlocked;
  globalThis.pullFromCloud = pullFromCloud;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeDomain,
    matchesDomainPattern,
    isDomainBlacklisted,
    isHostBlacklistedSync,
    addDomainToBlacklist,
    removeDomainFromBlacklist,
    clearDomainBlacklist,
    getStoredDomainBlacklist,
    handleConfirmUnconfirmedTab,
    handleNovelDetected,
    findExistingNovelKey,
    isSameDomainOrSubdomain,
    deduplicateAndMigrateMap,
    mergeStatsObjects,
    mergeNovelsMaps,
    getCloudSyncMeta,
    setCloudSyncMeta,
    pushToCloudUnlocked,
    pullFromCloud,
    refreshBrowserActionAppearance,
    switchAccountProfile,
    handleImportData,
    isInformationalOrNonReaderUrl,
    NON_READER_SUBPAGE_REGEX,
    CHAPTER_LISTING_SUBPAGE_REGEX,
    CHAPTER_URL_REGEX,
    isBogusNovelName,
    isValidSeriesPath,
    CATALOG_SEGMENTS,
    BOGUS_NAMES,
    TIER_ROMAN,
    RARITY_BADGE_COLORS,
    BASE_TOOLBAR_ICONS,
    getToolbarIconPathsForTitle,
    resetRenderedStateKey,
    clearInactiveAlarms,
    getHostnameFromUrl,
    getFirebaseUrl,
    verifyExportIntegrity
  };
}