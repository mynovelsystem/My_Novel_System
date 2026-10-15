importScripts("i18n.js");
try {
  importScripts("achievements_data.js");
} catch (_e) {}

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

  const currentList = await getStoredDomainBlacklist();
  const exists = currentList.some((item) => normalizeDomain(item.domain) === domain);
  if (exists) {
    return { ok: true, alreadyExists: true, domainBlacklist: currentList };
  }

  const addedAt = typeof customAddedAt === "number" ? customAddedAt : Date.now();
  const updatedList = [{ domain, addedAt }, ...currentList];
  cachedDomainBlacklist = updatedList;
  await chrome.storage.local.set({ domainBlacklist: updatedList });

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && matchesDomainPattern(tab.url, domain)) {
        setTabQuestionBadge(tab.id, false);
        await chrome.storage.local.remove([`tab_${tab.id}`]);
        chrome.tabs.sendMessage(tab.id, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
      }
    }
  } catch {}

  await pushDomainBlacklistToCloud(updatedList);
  return { ok: true, domainBlacklist: updatedList };
}

async function removeDomainFromBlacklist(rawDomain) {
  const domain = normalizeDomain(rawDomain);
  const currentList = await getStoredDomainBlacklist();
  const updatedList = currentList.filter((item) => normalizeDomain(item.domain) !== domain);
  cachedDomainBlacklist = updatedList;
  await chrome.storage.local.set({ domainBlacklist: updatedList });
  await pushDomainBlacklistToCloud(updatedList);
  return { ok: true, domainBlacklist: updatedList };
}

async function clearDomainBlacklist() {
  cachedDomainBlacklist = [];
  await chrome.storage.local.set({ domainBlacklist: [] });
  await pushDomainBlacklistToCloud([]);
  return { ok: true, domainBlacklist: [] };
}

async function pushDomainBlacklistToCloud(list) {
  const auth = await getValidAuth();
  if (!auth) return;
  const dbCleanUrl = FIREBASE_DB_URL.replace(/\/$/, "");
  try {
    const payload = Array.isArray(list) ? list : await getStoredDomainBlacklist();
    await fetch(`${dbCleanUrl}/users/${auth.uid}/domainBlacklist.json?auth=${auth.idToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    await appendDiagnosticLog({ event: "CLOUD_BLACKLIST_PUSH_ERROR", error: String(e) });
  }
}

function looksLikeReadingUrl(urlStr) {
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
      await chrome.action.setTitle({
        title: `MyNovelSystem — ${realmName}${stageStr}${bAlert} • ${cultState.totalQi} Qi`
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

  const rawEffectiveName = (!isBogusNovelName(entry.novelName, bestNovelUrl) ? entry.novelName : "") || entry.customName || fallbackKey;
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

  const lUnlocked = Array.isArray(l.unlockedTitles) ? l.unlockedTitles : [];
  const cUnlocked = Array.isArray(c.unlockedTitles) ? c.unlockedTitles : [];
  const mergedUnlocked = Array.from(new Set([...lUnlocked, ...cUnlocked]));
  const lClaimed = Array.isArray(l.claimedRewards) ? l.claimedRewards : [];
  const cClaimed = Array.isArray(c.claimedRewards) ? c.claimedRewards : [];
  const mergedClaimed = Array.from(new Set([...lClaimed, ...cClaimed]));

  const lInventory = Array.isArray(l.inventory) ? l.inventory : [];
  const cInventory = Array.isArray(c.inventory) ? c.inventory : [];
  const mergedInventory = Array.from(new Set([...lInventory, ...cInventory]));
  const rawEquipped = Array.isArray(winner.equippedItems) && winner.equippedItems.length > 0
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
          stage: isPeak ? null : (singleTheme?.stage !== null && singleTheme?.stage !== undefined ? Number(singleTheme.stage) || 1 : 1)
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
    dailyChapters: pruned,
    cultivatedRealmIndex: realmIndex,
    cultivatedStage: stage,
    lastBreakthrough: bestBreakthrough || null,
    ...(mergedThemes ? { cultivationThemes: mergedThemes } : {}),
    updatedAt: Math.max(l.updatedAt || 0, c.updatedAt || 0)
  };

  evaluateUnlockedTitles(merged);
  if (typeof syncUserInventory === "function") {
    syncUserInventory(merged);
  }
  merged.bonusQi = calculateBonusQi(merged);
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
    if (refreshIconDebounceTimer) clearTimeout(refreshIconDebounceTimer);
    refreshIconDebounceTimer = setTimeout(() => {
      refreshIconDebounceTimer = null;
      refreshBrowserActionAppearance();
    }, 50);
  }
});

// Sincronización periódica cada 30 min para ahorrar ancho de banda de Firebase Spark
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("periodic_cloud_sync", { periodInMinutes: 30 });
  migrateLocalStorageNow();
  refreshBrowserActionAppearance();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("periodic_cloud_sync", { periodInMinutes: 30 });
  refreshBrowserActionAppearance();
  pullFromCloud();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url && (await isDomainBlacklisted(changeInfo.url))) {
    setTabQuestionBadge(tabId, false);
    chrome.storage.local.remove([`tab_${tabId}`]).catch(() => {});
    chrome.tabs.sendMessage(tabId, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
  }
});

const GROUP_1_CONTENT_SCRIPT_MESSAGES = new Set([
  "NOVEL_DETECTED",
  "SCROLL_UPDATED",
  "CONFIRM_UNCONFIRMED_TAB",
  "DISCARD_UNCONFIRMED_TAB",
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
  "TEST_WHATSAPP",
  "CLEAR_DOMAIN_BLACKLIST",
  "GET_DOMAIN_BLACKLIST",
  "CHECK_DOMAIN_BLACKLISTED",
  "SUBMIT_BUG_REPORT",
  "REFRESH_ICON",
  "EQUIP_ITEM",
  "UNEQUIP_ITEM",
  "GET_INVENTORY"
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

  const isGroup1 = GROUP_1_CONTENT_SCRIPT_MESSAGES.has(message.type);
  const isGroup2 = GROUP_2_ADMIN_MESSAGES.has(message.type);

  // SEC-02: Tipo de mensaje desconocido: rechazar con respuesta de error, sin ejecutar nada
  if (!isGroup1 && !isGroup2) {
    sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
    return true;
  }

  // SEC-02: Validación de emisor frente a chrome.runtime.id si está disponible
  const currentRuntimeId = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) ? chrome.runtime.id : null;
  if (currentRuntimeId && sender && sender.id && sender.id !== currentRuntimeId) {
    sendResponse({ ok: false, error: "Unauthorized sender id" });
    return true;
  }

  // SEC-02: Grupo 2 (acciones administrativas): exige sender.id === chrome.runtime.id Y !sender.tab
  if (isGroup2) {
    if (sender && sender.tab) {
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
      const storage = await chrome.storage.local.get(["stats", "savedNovels"]);
      let currentStats = { ...getDefaultStats(), ...(storage.stats || {}) };
      const chaptersDelta = Math.max(0, Number(message.chaptersDelta) || 0);
      const isNewNovel = Boolean(message.isNewNovel);
      const completedDelta = Number(message.completedDelta) || 0;
      currentStats = recordCultivationProgress(currentStats, chaptersDelta, isNewNovel, completedDelta);
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
      if (typeof equipItem === "function") {
        equipItem(stats, message.itemId);
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
    pullFromCloud()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "SWITCH_ACCOUNT") {
    withStorageLock(async () => {
      return await switchAccountProfile(message.uid);
    })
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.type === "LOGOUT") {
    withStorageLock(async () => {
      const res = await switchAccountProfile("guest");
      await chrome.storage.local.remove(["auth"]);
      await refreshBrowserActionAppearance();
      return res;
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

  if (message.type === "DISCARD_UNCONFIRMED_TAB") {
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

  return false;
});

async function handleConfirmUnconfirmedTab({ tabId, novelName, chapter, customName, url, seriesId, novelUrl }) {
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

    const storage = await chrome.storage.local.get(["savedNovels", "stats"]);
    const savedNovels = storage.savedNovels || {};
    let stats = { ...getDefaultStats(), ...(storage.stats || {}) };
    const existing = savedNovels[finalSeriesId];
    const isNew = !existing;

    const chapNum = parseFloat(finalChap) || 1;
    const prevMax = existing ? parseFloat(existing.maxCounted ?? existing.chapter) || 0 : 0;
    const chapDelta = isNew ? chapNum : Math.max(0, chapNum - prevMax);

    const entry = {
      ...(existing || {}),
      seriesId: finalSeriesId,
      novelName: existing?.customName || finalName,
      novelUrl: finalNovelUrl || existing?.novelUrl || "",
      url: finalUrl || existing?.url || "",
      chapter: finalChap,
      maxCounted: Math.max(prevMax, chapNum),
      scrollPct: existing?.scrollPct || 0,
      statusManual: existing?.statusManual || "",
      completedCounted: Boolean(existing?.completedCounted),
      alert: null,
      updatedAt: Date.now()
    };
    if (existing?.customName || customName) {
      entry.customName = customName || existing.customName;
    }

    savedNovels[finalSeriesId] = entry;

    if (chapDelta > 0 || isNew) {
      stats = recordCultivationProgress(stats, chapDelta, isNew, 0);
    }

    const updates = { savedNovels, stats };
    if (tabId) {
      updates[`tab_${tabId}`] = { ...entry, unconfirmed: false };
      setTabQuestionBadge(tabId, false);
      chrome.action.setBadgeText({ text: "", tabId }).catch(() => {});
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
    chrome.action.setBadgeText({ text: "?", tabId }).catch(() => {});
    chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId }).catch(() => {});
  } else {
    chrome.action.setBadgeText({ text: "", tabId }).catch(() => {});
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
    if (!novelData || !novelData.url || !isValidHttpUrl(novelData.url) || (await isDomainBlacklisted(novelData.url))) {
      setTabQuestionBadge(tabId, false);
      await chrome.storage.local.remove([`tab_${tabId}`]);
      return { ok: false, ignored: true, blacklisted: true };
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
    const hasDataChanged =
      isNewNovelStarted ||
      chaptersToCount > 0 ||
      !existing ||
      existing.deleted ||
      existing.chapter !== resolvedChapterStr ||
      existing.url !== novelData.url ||
      existing.novelName !== stableNovelName;

    if (hasDataChanged) {
      chrome.storage.sync.set({ savedNovels }).catch(() => {});
      await pushToCloudUnlocked(savedNovels, currentStats);
    }
    return { ok: true, saved: true, seriesId, chapter: resolvedChapterStr, restoreScrollPct };
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
  const settings = { ...(storage.settings || {}), ...(data || {}) };
  const waUrl = buildCallMeBotUrl(settings.phone, settings.apiKey, t("wa_msg_test"));

  if (!waUrl) {
    settings.whatsappStatus = "unconfigured";
    await chrome.storage.local.set({ settings });
    return { ok: false, status: "unconfigured" };
  }

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
      let localEntry = combinedNovels[seriesId] || combinedNovels[rawKey] || (incEntry.seriesId ? combinedNovels[incEntry.seriesId] : null);

      if (!localEntry) {
        const incNovelNorm = normalizeText(incEntry.novelName);
        const incCustomNorm = normalizeText(incEntry.customName);
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
      if (incEntry.seriesId && incEntry.seriesId !== seriesId && combinedNovels[incEntry.seriesId]) {
        delete combinedNovels[incEntry.seriesId];
      }

      if (!localEntry) {
        combinedNovels[seriesId] = { ...incEntry, seriesId };
        if (!incEntry.deleted) added++;
      } else {
        const incMax = parseFloat(incEntry.maxCounted ?? incEntry.chapter) || 0;
        const locMax = parseFloat(localEntry.maxCounted ?? localEntry.chapter) || 0;
        const bestMax = Math.max(incMax, locMax);
        const isIncomingNewer = (incEntry.updatedAt || 0) > (localEntry.updatedAt || 0);
        const customName = isIncomingNewer
          ? (incEntry.customName || localEntry.customName)
          : (localEntry.customName || incEntry.customName);

        if (isIncomingNewer) {
          combinedNovels[seriesId] = {
            ...localEntry,
            ...incEntry,
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

    if (Array.isArray(payload.domainBlacklist)) {
      const currentBl = await getStoredDomainBlacklist();
      const blMap = new Map();
      currentBl.forEach((item) => {
        const d = normalizeDomain(item && item.domain);
        if (d) blMap.set(d, { domain: d, addedAt: item.addedAt || Date.now() });
      });
      payload.domainBlacklist.forEach((item) => {
        const d = normalizeDomain(typeof item === "string" ? item : item?.domain);
        if (d && !blMap.has(d)) {
          blMap.set(d, { domain: d, addedAt: item?.addedAt || Date.now() });
        }
      });
      const mergedBl = Array.from(blMap.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      await chrome.storage.local.set({ domainBlacklist: mergedBl });
      cachedDomainBlacklist = mergedBl;
      await pushDomainBlacklistToCloud(mergedBl);
    }

    await refreshBrowserActionAppearance();
    await pushToCloudUnlocked(migratedNovels, mergedStats);
    return { ok: true, added, updated, skipped };
  });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const currentTabId = activeInfo.tabId;
  chrome.alarms.clear(`inactive_${currentTabId}`);

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

async function pushToCloudUnlocked(novelsMap, statsObj, blacklistArr) {
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

    const currentBl = blacklistArr !== undefined ? blacklistArr : cachedDomainBlacklist;
    if (Array.isArray(currentBl)) {
      promises.push(
        fetch(`${dbCleanUrl}/users/${auth.uid}/domainBlacklist.json?auth=${auth.idToken}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentBl)
        })
      );
    }

    await Promise.all(promises);
  } catch (e) {
    await appendDiagnosticLog({ event: "CLOUD_PUSH_ERROR", error: String(e) });
  }
}

async function switchAccountProfile(targetUid) {
  const normTarget = targetUid && typeof targetUid === "string" ? targetUid : "guest";
  const storage = await chrome.storage.local.get([
    "lastAuthUid",
    "savedNovels",
    "stats",
    "domainBlacklist",
    "guest_data",
    `account_data_${normTarget}`
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
  } else if (normTarget !== "guest" && currentUid === "guest" && Object.keys(activeSnapshot.savedNovels || {}).length > 0) {
    // Si el usuario era invitado y acaba de iniciar sesión por primera vez, hereda sus novelas locales sin perderlas
    restoredNovels = activeSnapshot.savedNovels;
    restoredStats = activeSnapshot.stats;
    restoredBlacklist = activeSnapshot.domainBlacklist;
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

async function pullFromCloud() {
  return withStorageLock(async () => {
    const { auth: rawAuth } = await chrome.storage.local.get(["auth"]);
    if (!rawAuth || !rawAuth.refreshToken) {
      const { lastAuthUid } = await chrome.storage.local.get(["lastAuthUid"]);
      if (lastAuthUid && lastAuthUid !== "guest") {
        await switchAccountProfile("guest");
      }
      await refreshBrowserActionAppearance();
      return;
    }

    const auth = await getValidAuth();
    if (!auth) {
      // Dispositivo offline o error de red temporal al refrescar token.
      // Mantener al usuario en su perfil activo para lectura offline sin conmutar a invitado.
      return;
    }

    const { lastAuthUid } = await chrome.storage.local.get(["lastAuthUid"]);
    if (lastAuthUid && lastAuthUid !== auth.uid) {
      await switchAccountProfile(auth.uid);
    } else if (!lastAuthUid) {
      await chrome.storage.local.set({ lastAuthUid: auth.uid });
    }

    const { savedNovels, stats } = await chrome.storage.local.get(["savedNovels", "stats"]);
    const localMig = deduplicateAndMigrateMap(savedNovels || {});
    let localStats = evaluateUnlockedTitles({ ...getDefaultStats(), ...(stats || {}) });

    if (localMig.changed) {
      await chrome.storage.local.set({ savedNovels: localMig.migratedNovels });
    }

    const dbCleanUrl = FIREBASE_DB_URL.replace(/\/$/, "");
    try {
      const [novelsRes, statsRes, blacklistRes] = await Promise.all([
        fetch(`${dbCleanUrl}/users/${auth.uid}/novels.json?auth=${auth.idToken}`),
        fetch(`${dbCleanUrl}/users/${auth.uid}/stats.json?auth=${auth.idToken}`),
        fetch(`${dbCleanUrl}/users/${auth.uid}/domainBlacklist.json?auth=${auth.idToken}`).catch(() => null)
      ]);

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
  globalThis.deduplicateAndMigrateMap = deduplicateAndMigrateMap;
  globalThis.mergeStatsObjects = mergeStatsObjects;
  globalThis.refreshBrowserActionAppearance = refreshBrowserActionAppearance;
  globalThis.TIER_ROMAN = TIER_ROMAN;
  globalThis.RARITY_BADGE_COLORS = RARITY_BADGE_COLORS;
  globalThis.BASE_TOOLBAR_ICONS = BASE_TOOLBAR_ICONS;
  globalThis.getToolbarIconPathsForTitle = getToolbarIconPathsForTitle;
  globalThis.resetRenderedStateKey = resetRenderedStateKey;
  globalThis.switchAccountProfile = switchAccountProfile;
  globalThis.handleImportData = handleImportData;
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
    deduplicateAndMigrateMap,
    mergeStatsObjects,
    refreshBrowserActionAppearance,
    switchAccountProfile,
    handleImportData,
    TIER_ROMAN,
    RARITY_BADGE_COLORS,
    BASE_TOOLBAR_ICONS,
    getToolbarIconPathsForTitle,
    resetRenderedStateKey
  };
}