const FIREBASE_API_KEY = "AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU";
const FIREBASE_DB_URL = "https://novel-tracker-1d134-default-rtdb.firebaseio.com";

const INLINE_CHAPTER_CUT_REGEX = /\s*[-–—|:«»]*\s*(?:chapter|cap[ií]tulo|capitulo|episode|episodio|parte|ch\.|cap\.|ep\.|c\.)\s*#?\s*\d+.*$/i;
const TRAILING_MEDIA_SUFFIX_REGEX = /\s+\b(?:manhwa|manhua|manga|webtoon|novela\s*ligera|light\s*novel|web\s*novel|novela|novel|comic|raw|sub\s*espa[ñn]ol|en\s*espa[ñn]ol|online|gratis|free)\b\s*$/i;

const THEMES_CONFIG = {
  cultivation: {
    id: "cultivation",
    nameKey: "theme_cultivation_name",
    icon: "⛩️",
    isPremium: false,
    realms: [
      { id: "qi_condensation", minQi: 0, nextQi: 100, hasStages: true, colors: ["#0ea5e9", "#6366f1", "#10b981"], gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #10b981 100%)" },
      { id: "foundation_establishment", minQi: 100, nextQi: 400, hasStages: true, colors: ["#10b981", "#059669", "#fbbf24"], gradient: "linear-gradient(135deg, #10b981 0%, #059669 55%, #fbbf24 100%)" },
      { id: "golden_core", minQi: 400, nextQi: 1000, hasStages: true, colors: ["#f59e0b", "#d97706", "#fde047"], gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #fde047 100%)" },
      { id: "nascent_soul", minQi: 1000, nextQi: 2500, hasStages: true, colors: ["#8b5cf6", "#ec4899", "#38bdf8"], gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 55%, #38bdf8 100%)" },
      { id: "spirit_transformation", minQi: 2500, nextQi: 5000, hasStages: true, colors: ["#f43f5e", "#9333ea", "#fbbf24"], gradient: "linear-gradient(135deg, #f43f5e 0%, #9333ea 55%, #fbbf24 100%)" },
      { id: "void_refinement", minQi: 5000, nextQi: 9000, hasStages: true, colors: ["#3b82f6", "#1d4ed8", "#a855f7"], gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 55%, #a855f7 100%)" },
      { id: "body_integration", minQi: 9000, nextQi: 15000, hasStages: true, colors: ["#ea580c", "#dc2626", "#facc15"], gradient: "linear-gradient(135deg, #ea580c 0%, #dc2626 55%, #facc15 100%)" },
      { id: "mahayana", minQi: 15000, nextQi: 25000, hasStages: true, colors: ["#06b6d4", "#6366f1", "#f472b6"], gradient: "linear-gradient(135deg, #06b6d4 0%, #6366f1 55%, #f472b6 100%)" },
      { id: "heavenly_tribulation", minQi: 25000, nextQi: 40000, hasStages: true, colors: ["#7c3aed", "#db2777", "#fde047"], gradient: "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #fde047 100%)" },
      { id: "immortal_ascension", minQi: 40000, nextQi: null, hasStages: false, colors: ["#fbbf24", "#ec4899", "#06b6d4"], gradient: "linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #06b6d4 100%)" }
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
      { id: "bottleneck_breaker", tier: 4, symbol: "💥", color: "#0d9488", minRealmIndex: 3, minStage: 1, reqChapters: 400, reqQi: 1000 },
      { id: "ancient_scholar", tier: 4, symbol: "🏛️", color: "#3b82f6", minRealmIndex: 3, minStage: 5, reqChapters: 750, reqNovelsCompleted: 10 },
      { id: "dao_heart", tier: 5, symbol: "💖", color: "#7c3aed", minRealmIndex: 4, minStage: 1, reqStreak: 60 },
      { id: "golden_immortal", tier: 6, symbol: "👑", color: "#b45309", minRealmIndex: 5, minStage: 1, reqChapters: 1500, reqNovelsCompleted: 15 },
      { id: "heaven_defier", tier: 7, symbol: "🐉", color: "#be185d", minRealmIndex: 6, minStage: 1, reqChapters: 2500, reqStreak: 90 },
      { id: "cosmic_sovereign", tier: 8, symbol: "🪐", color: "#f59e0b", minRealmIndex: 7, minStage: 1, reqChapters: 3500, reqNovelsCompleted: 25 },
      { id: "tribulation_emperor", tier: 9, symbol: "⚡", color: "#db2777", minRealmIndex: 8, minStage: 1, reqChapters: 4200, reqStreak: 100 },
      { id: "primordial_immortal", tier: 9, symbol: "☯️", color: "#ec4899", minRealmIndex: 9, minStage: 1, reqQi: 40000 }
    ]
  },
  hunter: {
    id: "hunter",
    nameKey: "theme_hunter_name",
    icon: "🗡️",
    isPremium: true,
    realms: [
      { id: "hunter_rank_e", minQi: 0, nextQi: 100, hasStages: true, colors: ["#64748b", "#475569", "#94a3b8"], gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)" },
      { id: "hunter_rank_d", minQi: 100, nextQi: 400, hasStages: true, colors: ["#10b981", "#059669", "#34d399"], gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)" },
      { id: "hunter_rank_c", minQi: 400, nextQi: 1000, hasStages: true, colors: ["#3b82f6", "#2563eb", "#60a5fa"], gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)" },
      { id: "hunter_rank_b", minQi: 1000, nextQi: 2500, hasStages: true, colors: ["#8b5cf6", "#7c3aed", "#a78bfa"], gradient: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)" },
      { id: "hunter_rank_a", minQi: 2500, nextQi: 6000, hasStages: true, colors: ["#f59e0b", "#d97706", "#fbbf24"], gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" },
      { id: "hunter_rank_s", minQi: 6000, nextQi: 15000, hasStages: true, colors: ["#ef4444", "#dc2626", "#f87171"], gradient: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)" },
      { id: "hunter_national", minQi: 15000, nextQi: null, hasStages: false, colors: ["#fbbf24", "#7c3aed", "#f43f5e"], gradient: "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)" }
    ],
    titles: [
      { id: "hunter_awakening", tier: 1, symbol: "🗡️", color: "#64748b", minRealmIndex: 0, minStage: 1, reqChapters: 5 },
      { id: "dungeon_scout", tier: 2, symbol: "🚪", color: "#059669", minRealmIndex: 1, minStage: 1, reqChapters: 120, reqStreak: 10 },
      { id: "shadow_monarch", tier: 3, symbol: "👥", color: "#7c3aed", minRealmIndex: 2, minStage: 1, reqChapters: 500, req30Days: 200 },
      { id: "national_hunter", tier: 6, symbol: "🛡️", color: "#f59e0b", minRealmIndex: 5, minStage: 1, reqChapters: 2000, reqNovelsCompleted: 15 }
    ]
  },
  legendary_novels: {
    id: "legendary_novels",
    nameKey: "theme_novels_name",
    icon: "📖",
    isPremium: true,
    realms: [
      { id: "novice_reader", minQi: 0, nextQi: 200, hasStages: true, colors: ["#0284c7", "#0369a1", "#38bdf8"], gradient: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)" },
      { id: "lore_seeker", minQi: 200, nextQi: 800, hasStages: true, colors: ["#6366f1", "#4f46e5", "#818cf8"], gradient: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" },
      { id: "omniscient_observer", minQi: 800, nextQi: 3000, hasStages: true, colors: ["#9333ea", "#7e22ce", "#c084fc"], gradient: "linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)" },
      { id: "mythic_chronicler", minQi: 3000, nextQi: null, hasStages: false, colors: ["#f59e0b", "#ec4899", "#06b6d4"], gradient: "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #06b6d4 100%)" }
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

const ALL_TITLES = [];
const TITLE_CONFIG = {};
Object.values(THEMES_CONFIG).forEach((tCfg) => {
  tCfg.titles.forEach((tItem) => {
    const fullItem = { ...tItem, themeId: tCfg.id };
    ALL_TITLES.push(fullItem);
    TITLE_CONFIG[tItem.id] = fullItem;
  });
});
const CULTIVATION_TITLES = THEMES_CONFIG.cultivation.titles.map((t) => t.id);

let currentThemeFilter = "cultivation";

let currentSearch = "";
let currentStatusFilter = "all";
let activeUnconfirmedTabId = null;
let activeUnconfirmedData = null;

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

function cleanTabTitleForInput(rawTitle) {
  if (!rawTitle) return "";
  let cleaned = String(rawTitle).split(/\s*(?:\||–|—| - )\s*/)[0].trim();
  cleaned = cleaned.replace(INLINE_CHAPTER_CUT_REGEX, "").trim();
  cleaned = cleaned
    .replace(/^(?:read|leer|ver)\s+/i, "")
    .replace(TRAILING_MEDIA_SUFFIX_REGEX, "")
    .replace(TRAILING_MEDIA_SUFFIX_REGEX, "")
    .trim();
  return cleaned;
}

function buildManualSeriesId(name, url) {
  const domain = extractDomain(url);
  const hostSlug = normalizeText(domain).slice(0, 24);
  const nameSlug = normalizeText(cleanTabTitleForInput(name) || name).slice(0, 48);
  const canonical = `${hostSlug}::${nameSlug}`;
  return `${hostSlug}__${nameSlug}_${fnv1aHex(canonical)}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  await initI18n();
  applyI18nToDom();

  initNavigation();
  initLibraryEvents();
  initCultivationEvents();
  initWhatsappEvents();
  initSettingsAndBackupEvents();
  initReportAndLogsEvents();
  initAccountEvents();

  await loadSettings();
  await checkAuthState();
  await checkUnconfirmedTab();
  await renderCultivationUI();
  await renderNovels();
  await renderDiagnosticLogs();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.savedNovels) renderNovels();
    if (changes.stats) renderCultivationUI();
    if (changes.auth) checkAuthState();
    if (changes.settings) loadSettings();
    if (changes.diagnosticLogs) renderDiagnosticLogs();
  });

  try {
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    chrome.runtime.sendMessage({ type: "PULL_FROM_CLOUD" });
  } catch {}
});

function initNavigation() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      tabButtons.forEach((b) => b.classList.remove("active"));
      views.forEach((v) => v.classList.remove("active"));

      btn.classList.add("active");
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add("active");
    });
  });

  document.getElementById("syncBadge")?.addEventListener("click", () => {
    document.querySelector('[data-target="view-settings"]')?.click();
  });

  const openCultivation = () => {
    document.querySelector('[data-target="view-cultivation"]')?.click();
  };

  const cultBar = document.getElementById("headerCultivationBar");
  cultBar?.addEventListener("click", openCultivation);
  cultBar?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openCultivation();
    }
  });

  const eqTitle = document.getElementById("headerEquippedTitle");
  const focusEquipped = () => {
    openCultivation();
    setTimeout(() => {
      document.getElementById("equippedTitleSelect")?.focus();
    }, 80);
  };
  eqTitle?.addEventListener("click", focusEquipped);
  eqTitle?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focusEquipped();
    }
  });
}

// ================= REPORTE DE ERRORES Y VISOR DE LOGS =================

function initReportAndLogsEvents() {
  document.getElementById("btnSendReport")?.addEventListener("click", () => {
    const category = document.getElementById("reportCategory").value;
    const message = document.getElementById("reportMessage").value.trim();
    const attachLogs = document.getElementById("reportAttachLogs").checked;
    const statusEl = document.getElementById("reportStatusMsg");

    if (!message) {
      statusEl.className = "feedback-msg err";
      statusEl.textContent = t("report_empty_err");
      return;
    }

    statusEl.className = "feedback-msg ok";
    statusEl.textContent = t("report_sending");

    chrome.runtime.sendMessage(
      {
        type: "SUBMIT_BUG_REPORT",
        payload: { category, message, attachLogs }
      },
      (res) => {
        if (res && res.ok) {
          document.getElementById("reportMessage").value = "";
          statusEl.className = "feedback-msg ok";
          statusEl.textContent = t("report_sent_ok");
        } else {
          statusEl.className = "feedback-msg err";
          statusEl.textContent = t("report_sent_err");
        }
      }
    );
  });

  document.getElementById("btnCopyLogs")?.addEventListener("click", async () => {
    const { diagnosticLogs } = await chrome.storage.local.get(["diagnosticLogs"]);
    const text = JSON.stringify(diagnosticLogs || [], null, 2);
    try {
      await navigator.clipboard.writeText(text);
      const statusEl = document.getElementById("reportStatusMsg");
      statusEl.className = "feedback-msg ok";
      statusEl.textContent = t("logs_copied_ok");
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch {}
  });

  document.getElementById("btnClearLogs")?.addEventListener("click", async () => {
    await chrome.storage.local.set({ diagnosticLogs: [] });
    await renderDiagnosticLogs();
  });
}

async function renderDiagnosticLogs() {
  const viewer = document.getElementById("diagnosticLogsViewer");
  if (!viewer) return;

  const { diagnosticLogs } = await chrome.storage.local.get(["diagnosticLogs"]);
  const logs = Array.isArray(diagnosticLogs) ? diagnosticLogs : [];

  if (logs.length === 0) {
    viewer.textContent = t("logs_empty");
    return;
  }

  viewer.textContent = logs
    .map((item) => {
      const time = item.ts ? item.ts.slice(11, 19) : "";
      const rest = { ...item };
      delete rest.ts;
      delete rest.event;
      return `[${time}] ${item.event}\n${JSON.stringify(rest, null, 2)}`;
    })
    .join("\n------------------------\n");
}

// ======================================================================

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

function getLocalDateStr(ts = Date.now()) {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetweenDateStrings(d1Str, d2Str) {
  if (!d1Str || !d2Str) return 0;
  const [y1, m1, day1] = d1Str.split("-").map(Number);
  const [y2, m2, day2] = d2Str.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, day1);
  const utc2 = Date.UTC(y2, m2 - 1, day2);
  return Math.round((utc2 - utc1) / (24 * 60 * 60 * 1000));
}

function pruneAndSumDailyChapters(dailyChapters, nowTs = Date.now()) {
  const pruned = {};
  const todayStr = getLocalDateStr(nowTs);
  let last30DaysSum = 0;
  let maxSingleDay = 0;

  for (const [dateStr, count] of Object.entries(dailyChapters || {})) {
    const num = Math.max(0, Number(count) || 0);
    const diffDays = daysBetweenDateStrings(dateStr, todayStr);
    if (diffDays >= 0 && diffDays <= 30) {
      pruned[dateStr] = num;
      last30DaysSum += num;
      if (num > maxSingleDay) maxSingleDay = num;
    }
  }

  return { pruned, last30DaysSum, maxSingleDay };
}

function getCultivationState(stats, themeId = "cultivation") {
  const theme = THEMES_CONFIG[themeId] || THEMES_CONFIG.cultivation;
  const realms = theme.realms;
  const totalQi = calculateQi(stats);

  const themeData = stats?.cultivationThemes?.[themeId];
  let cultivatedRealmIndex = themeData?.realmIndex;
  let cultivatedStage = themeData?.stage;

  // Fallback a campos planos raíz si la temática es "cultivation"
  if (themeId === "cultivation") {
    if (cultivatedRealmIndex === undefined && stats?.cultivatedRealmIndex !== undefined) {
      cultivatedRealmIndex = stats.cultivatedRealmIndex;
      cultivatedStage = stats.cultivatedStage;
    }
  }

  if (cultivatedRealmIndex === undefined) {
    const natural = computeNaturalRealmAndStage(totalQi, realms);
    cultivatedRealmIndex = natural.realmIndex;
    cultivatedStage = natural.stage;
  } else {
    cultivatedRealmIndex = Math.min(realms.length - 1, Math.max(0, Number(cultivatedRealmIndex) || 0));
    const targetRealm = realms[cultivatedRealmIndex] || realms[0];
    if (!targetRealm.hasStages || targetRealm.nextQi === null) {
      cultivatedStage = null;
    } else {
      cultivatedStage = Math.min(9, Math.max(1, Number(cultivatedStage) || 1));
    }
  }

  const currentRealm = realms[cultivatedRealmIndex] || realms[0];
  const isPeakRealm = (currentRealm.nextQi === null);

  let currentStageCapQi = null;
  let prevStageCapQi = currentRealm.minQi;
  let isBottleneckReady = false;
  let isMajorBottleneck = false;
  let overflowQi = 0;
  let pct = 100;

  if (!isPeakRealm && currentRealm.hasStages && cultivatedStage !== null) {
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

function evaluateUnlockedTitles(stats, currentThemeId = "cultivation") {
  const unlocked = new Set(Array.isArray(stats.unlockedTitles) ? stats.unlockedTitles : []);
  const totalQi = calculateQi(stats);
  const { last30DaysSum, maxSingleDay } = pruneAndSumDailyChapters(stats.dailyChapters);
  const maxStreak = Math.max(Number(stats.streakDays) || 0, Number(stats.bestStreak) || 0);

  for (const tConfig of Object.values(THEMES_CONFIG)) {
    const themeState = getCultivationState(stats, tConfig.id);
    const themeRealmIndex = themeState.realmIndex;
    const themeStage = themeState.stage;

    for (const title of tConfig.titles) {
      if (unlocked.has(title.id)) continue;

      // 1. Level Gating: Check minimum realm and stage within THIS title's theme
      let levelSatisfied = false;
      if (themeRealmIndex > title.minRealmIndex) {
        levelSatisfied = true;
      } else if (themeRealmIndex === title.minRealmIndex) {
        levelSatisfied = (themeStage === null || (themeStage >= (title.minStage || 1)));
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

async function renderCultivationUI() {
  const { stats: rawStats, settings: rawSettings } = await chrome.storage.local.get(["stats", "settings"]);
  const stats = rawStats || {
    chaptersRead: 0,
    novelsStarted: 0,
    novelsCompleted: 0,
    streakDays: 0,
    bestStreak: 0,
    unlockedTitles: [],
    equippedTitle: "",
    cultivatedRealmIndex: undefined,
    cultivatedStage: undefined,
    lastBreakthrough: null
  };
  const settings = rawSettings || {};
  const activeThemeId = currentThemeFilter || settings.activeThemeId || "cultivation";

  const cultState = getCultivationState(stats, activeThemeId);

  const brandCrest = document.getElementById("brandCrest");
  if (brandCrest && cultState.gradient) {
    brandCrest.style.background = cultState.gradient;
  }

  document.getElementById("headerRealmName").textContent = t(`realm_${cultState.realmId}`);
  document.getElementById("headerRealmStage").textContent = cultState.stage
    ? `• ${t("header_stage", { stage: cultState.stage })}`
    : `• ${t("header_immortal_max")}`;
  document.getElementById("headerQiText").textContent = t("header_qi", { qi: cultState.totalQi });

  const progressFill = document.getElementById("headerProgressFill");
  if (progressFill) {
    progressFill.style.width = `${cultState.pct}%`;
    if (cultState.isBottleneckReady) {
      progressFill.classList.add("bottleneck-pulsing");
    } else {
      progressFill.classList.remove("bottleneck-pulsing");
    }
  }

  // Bottleneck banner / action card
  const bottleneckCard = document.getElementById("bottleneckCard");
  if (bottleneckCard) {
    if (cultState.isBottleneckReady) {
      bottleneckCard.style.display = "flex";
      const titleEl = document.getElementById("bottleneckTitle");
      const descEl = document.getElementById("bottleneckDesc");
      const btnTextEl = document.getElementById("btnBreakthroughText");
      const surplusEl = document.getElementById("bottleneckSurplus");

      if (cultState.isMajorBottleneck && cultState.nextRealmId) {
        const nextRealmName = t(`realm_${cultState.nextRealmId}`);
        if (titleEl) titleEl.textContent = t("bottleneck_realm_title", { realm: nextRealmName });
        if (descEl) descEl.textContent = t("bottleneck_realm_desc", { realm: nextRealmName });
        if (btnTextEl) btnTextEl.textContent = t("bottleneck_btn_realm");
      } else {
        const nextStage = Math.min(9, (cultState.stage || 1) + 1);
        if (titleEl) titleEl.textContent = t("bottleneck_stage_title", { stage: nextStage });
        if (descEl) descEl.textContent = t("bottleneck_stage_desc", { stage: nextStage });
        if (btnTextEl) btnTextEl.textContent = t("bottleneck_btn_stage");
      }

      if (surplusEl) {
        if (cultState.overflowQi > 0) {
          surplusEl.textContent = t("bottleneck_surplus_hint", { surplus: cultState.overflowQi });
          surplusEl.style.display = "block";
        } else {
          surplusEl.textContent = "";
          surplusEl.style.display = "none";
        }
      }
    } else {
      bottleneckCard.style.display = "none";
    }
  }

  const equippedPlaque = document.getElementById("headerEquippedTitle");
  const equippedTextEl = document.getElementById("headerEquippedTitleText");
  const hasValidEquipped = Boolean(stats.equippedTitle && (stats.unlockedTitles || []).includes(stats.equippedTitle));

  if (hasValidEquipped) {
    equippedPlaque?.classList.remove("empty");
    const cfg = TITLE_CONFIG[stats.equippedTitle] || { tier: 1, symbol: "🏆" };
    if (equippedTextEl) {
      equippedTextEl.innerHTML = `<span style="margin-right:4px;">${cfg.symbol}</span> ${escapeHtml(t(`title_${stats.equippedTitle}_name`))}`;
    }
  } else {
    equippedPlaque?.classList.add("empty");
    if (equippedTextEl) {
      equippedTextEl.textContent = t("header_no_title_hint");
    }
  }

  const btBanner = document.getElementById("breakthroughBanner");
  const lastBt = stats?.cultivationThemes?.[activeThemeId]?.lastBreakthrough || stats?.lastBreakthrough;
  if (lastBt && lastBt.realmId) {
    const realmStr = t(`realm_${lastBt.realmId}`);
    const stageStr = lastBt.stage
      ? `(${t("header_stage", { stage: lastBt.stage })})`
      : "";
    const btText = document.getElementById("breakthroughText");
    if (btText) {
      btText.textContent = t("breakthrough_banner", {
        realm: realmStr,
        stage: stageStr
      });
    }
    btBanner?.classList.add("visible");
  } else {
    btBanner?.classList.remove("visible");
  }

  // Update Stats Box
  document.getElementById("statQi").textContent = String(cultState.totalQi);
  document.getElementById("statChapters").textContent = String(stats.chaptersRead || 0);
  document.getElementById("statStarted").textContent = String(stats.novelsStarted || 0);
  document.getElementById("statCompleted").textContent = String(stats.novelsCompleted || 0);
  document.getElementById("statStreak").textContent = t("cult_days_unit", { n: stats.streakDays || 0 });
  document.getElementById("statBestStreak").textContent = t("cult_days_unit", { n: stats.bestStreak || 0 });

  // Update Theme Selector Chips active state
  document.querySelectorAll(".theme-chip").forEach((chip) => {
    if (chip.getAttribute("data-theme") === currentThemeFilter) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  const unlockedSet = new Set(stats.unlockedTitles || []);

  // Update equippedTitleSelect dropdown
  const selectEl = document.getElementById("equippedTitleSelect");
  if (selectEl) {
    const options = [`<option value="">${escapeHtml(t("title_none_name"))}</option>`];
    ALL_TITLES.forEach((item) => {
      if (unlockedSet.has(item.id)) {
        const selected = stats.equippedTitle === item.id ? "selected" : "";
        const cfg = TITLE_CONFIG[item.id] || { symbol: "🏆" };
        options.push(
          `<option value="${escapeHtml(item.id)}" ${selected}>${cfg.symbol} ${escapeHtml(t(`title_${item.id}_name`))}</option>`
        );
      }
    });
    selectEl.innerHTML = options.join("");
  }

  // Current theme titles
  const targetTheme = THEMES_CONFIG[currentThemeFilter] || THEMES_CONFIG.cultivation;
  const currentThemeTitles = targetTheme.titles || [];
  const unlockedInTheme = currentThemeTitles.filter((item) => unlockedSet.has(item.id)).length;

  document.getElementById("titlesHeading").textContent = t("cult_titles_heading", {
    unlocked: unlockedInTheme,
    total: currentThemeTitles.length
  });

  const titlesContainer = document.getElementById("titlesList");
  if (titlesContainer) {
    titlesContainer.innerHTML = currentThemeTitles.map((title) => {
      const isUnlocked = unlockedSet.has(title.id);
      const isEquipped = stats.equippedTitle === title.id;
      const cfg = TITLE_CONFIG[title.id] || { tier: 1, symbol: "📜" };
      const tier = cfg.tier || 1;
      const stateClass = isUnlocked ? "unlocked" : "locked";
      const equippedClass = isEquipped ? "equipped" : "";

      // Level Gating check
      let levelSatisfied = false;
      if (cultState.realmIndex > title.minRealmIndex) {
        levelSatisfied = true;
      } else if (cultState.realmIndex === title.minRealmIndex) {
        levelSatisfied = (cultState.stage >= (title.minStage || 1));
      }

      let actionBtnHtml = "";
      if (isEquipped) {
        actionBtnHtml = `<span class="title-action-btn btn-equipped">${cfg.symbol} ${escapeHtml(t("cult_equipped_badge"))}</span>`;
      } else if (isUnlocked) {
        actionBtnHtml = `<button type="button" class="title-action-btn btn-equip" data-title-id="${escapeHtml(title.id)}">${escapeHtml(t("cult_equip_btn"))}</button>`;
      } else {
        actionBtnHtml = `<span class="title-action-btn btn-locked">🔒 ${escapeHtml(t("cult_title_locked"))}</span>`;
      }

      let reqBadgeHtml = "";
      if (!isUnlocked && !levelSatisfied) {
        const themeRealms = (THEMES_CONFIG[title.themeId || currentThemeFilter] || THEMES_CONFIG.cultivation).realms;
        const reqRealmObj = themeRealms[title.minRealmIndex] || themeRealms[0];
        const reqRealmName = reqRealmObj ? t(`realm_${reqRealmObj.id}`) : "";
        const reqText = t("cult_req_realm_stage", { realm: reqRealmName, stage: title.minStage || 1 });
        reqBadgeHtml = `<div class="title-req-stage-tag">${escapeHtml(reqText)}</div>`;
      }

      return `
        <div class="title-item tier-${tier} ${stateClass} ${equippedClass}" data-title-id="${escapeHtml(title.id)}" ${isUnlocked ? `tabindex="0" role="button" aria-label="${escapeHtml(t(`title_${title.id}_name`))}"` : ""}>
          <div class="title-emblem">${cfg.symbol}</div>
          <div class="title-info">
            <div class="title-header-row">
              <span class="title-name">${escapeHtml(t(`title_${title.id}_name`))}</span>
              <span class="title-tier-tag tier-tag-${tier}">${escapeHtml(t(`cult_tier_${tier}`))}</span>
            </div>
            <span class="title-desc">${escapeHtml(t(`title_${title.id}_desc`))}</span>
            ${reqBadgeHtml}
          </div>
          ${actionBtnHtml}
        </div>
      `;
    }).join("");
  }
}

function initCultivationEvents() {
  document.getElementById("equippedTitleSelect")?.addEventListener("change", async (e) => {
    await equipTitleById(e.target.value);
  });

  const handleTitleActivation = async (card) => {
    if (!card) return;
    const titleId = card.getAttribute("data-title-id");
    if (titleId) {
      await equipTitleById(titleId);
    }
  };

  document.getElementById("titlesList")?.addEventListener("click", async (e) => {
    const card = e.target.closest(".title-item.unlocked");
    await handleTitleActivation(card);
  });

  document.getElementById("titlesList")?.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const card = e.target.closest(".title-item.unlocked");
      if (card) {
        e.preventDefault();
        await handleTitleActivation(card);
      }
    }
  });

  document.getElementById("btnDismissBreakthrough")?.addEventListener("click", async () => {
    const { stats, settings } = await chrome.storage.local.get(["stats", "settings"]);
    if (stats) {
      stats.lastBreakthrough = null;
      const themeId = currentThemeFilter || settings?.activeThemeId || "cultivation";
      if (stats.cultivationThemes && stats.cultivationThemes[themeId]) {
        stats.cultivationThemes[themeId].lastBreakthrough = null;
      }
      await chrome.storage.local.set({ stats });
    }
    document.getElementById("breakthroughBanner")?.classList.remove("visible");
  });

  document.getElementById("btnBreakthrough")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnBreakthrough");
    if (btn) btn.disabled = true;

    try {
      const res = await chrome.runtime.sendMessage({
        type: "PERFORM_BREAKTHROUGH",
        themeId: currentThemeFilter
      });
      if (res && res.ok) {
        const header = document.querySelector(".header");
        if (header) {
          header.classList.remove("ascension-burst");
          void header.offsetWidth;
          header.classList.add("ascension-burst");
          setTimeout(() => {
            header.classList.remove("ascension-burst");
          }, 950);
        }
        await renderCultivationUI();
      }
    } catch (err) {
      console.error("Error al romper cuello de botella:", err);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.querySelectorAll(".theme-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      const theme = chip.getAttribute("data-theme");
      if (theme && THEMES_CONFIG[theme]) {
        currentThemeFilter = theme;
        const { settings: rawSettings } = await chrome.storage.local.get(["settings"]);
        const settings = { ...(rawSettings || {}), activeThemeId: theme };
        await chrome.storage.local.set({ settings });
        try {
          chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
        } catch {}
        await renderCultivationUI();
      }
    });
  });
}

async function equipTitleById(chosenId) {
  const { stats: rawStats } = await chrome.storage.local.get(["stats"]);
  const stats = rawStats || { unlockedTitles: [] };
  if (chosenId && !(stats.unlockedTitles || []).includes(chosenId)) return;

  stats.equippedTitle = chosenId;
  stats.updatedAt = Date.now();
  await chrome.storage.local.set({ stats });
  chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
  chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
  await renderCultivationUI();
}

function computeEffectiveStatus(novel, settings) {
  if (novel.statusManual && ["reading", "paused", "dropped", "completed"].includes(novel.statusManual)) {
    return novel.statusManual;
  }
  const pauseDays = Math.max(1, Number(settings?.pauseDays) || 30);
  const dropDays = Math.max(pauseDays + 1, Number(settings?.dropDays) || 90);
  const diffDays = (Date.now() - (novel.updatedAt || Date.now())) / (24 * 60 * 60 * 1000);

  if (diffDays >= dropDays) return "dropped";
  if (diffDays >= pauseDays) return "paused";
  return "reading";
}

async function checkUnconfirmedTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    const key = `tab_${tab.id}`;
    const storage = await chrome.storage.local.get([key]);
    const data = storage[key];

    const banner = document.getElementById("unconfirmedBanner");
    if (data && data.unconfirmed && banner) {
      activeUnconfirmedTabId = tab.id;
      activeUnconfirmedData = data;
      document.getElementById("unconfirmedName").value =
        cleanTabTitleForInput(data.novelName) || cleanTabTitleForInput(tab.title);
      document.getElementById("unconfirmedChap").value = data.chapter || "1";
      banner.classList.add("visible");
    }
  } catch {}
}

function initLibraryEvents() {
  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    renderNovels();
  });

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentStatusFilter = chip.getAttribute("data-status") || "all";
      renderNovels();
    });
  });

  document.getElementById("btnSaveUnconfirmed")?.addEventListener("click", async () => {
    const rawName = document.getElementById("unconfirmedName").value.trim();
    const novelName = cleanTabTitleForInput(rawName) || rawName;
    const chapter = document.getElementById("unconfirmedChap").value.trim() || "1";
    if (!novelName || !activeUnconfirmedData) return;

    const seriesId =
      activeUnconfirmedData.novelUrl && activeUnconfirmedData.seriesId
        ? activeUnconfirmedData.seriesId
        : buildManualSeriesId(novelName, activeUnconfirmedData.url);

    const storage = await chrome.storage.local.get(["savedNovels"]);
    const savedNovels = storage.savedNovels || {};
    const existing = savedNovels[seriesId];

    const entry = {
      seriesId,
      novelName: existing?.customName || novelName,
      novelUrl: activeUnconfirmedData.novelUrl || existing?.novelUrl || "",
      url: activeUnconfirmedData.url,
      chapter,
      maxCounted: parseFloat(chapter) || 1,
      scrollPct: 0,
      statusManual: existing?.statusManual || "",
      completedCounted: Boolean(existing?.completedCounted),
      alert: null,
      updatedAt: Date.now()
    };
    if (existing?.customName) {
      entry.customName = existing.customName;
    }

    savedNovels[seriesId] = entry;
    const updates = { savedNovels };
    if (activeUnconfirmedTabId) {
      updates[`tab_${activeUnconfirmedTabId}`] = { ...entry, unconfirmed: false };
      chrome.action.setBadgeText({ tabId: activeUnconfirmedTabId }).catch(() => {});
    }

    await chrome.storage.local.set(updates);
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
    document.getElementById("unconfirmedBanner")?.classList.remove("visible");
    renderNovels();
  });

  document.getElementById("btnToggleManual")?.addEventListener("click", async () => {
    const drawer = document.getElementById("manualDrawer");
    if (!drawer) return;
    document.getElementById("editingSeriesId").value = "";
    document.getElementById("manualStatus").value = "";
    drawer.classList.toggle("open");

    if (drawer.classList.contains("open")) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.title) {
          document.getElementById("manualName").value = cleanTabTitleForInput(tab.title);
          document.getElementById("manualChapter").focus();
        }
      } catch {}
    }
  });

  document.getElementById("btnConfirmManual")?.addEventListener("click", async () => {
    const editingId = document.getElementById("editingSeriesId").value.trim();
    const nameInput = document.getElementById("manualName");
    const chapInput = document.getElementById("manualChapter");
    const statusSelect = document.getElementById("manualStatus");
    const novelName = nameInput.value.trim();
    const chapter = chapInput.value.trim() || "1";
    const statusManual = statusSelect.value;

    if (!novelName) return;

    const storage = await chrome.storage.local.get(["savedNovels", "stats"]);
    const savedNovels = storage.savedNovels || {};
    let stats = storage.stats || {
      chaptersRead: 0,
      novelsStarted: 0,
      novelsCompleted: 0,
      streakDays: 0,
      bestStreak: 0,
      unlockedTitles: [],
      equippedTitle: ""
    };

    let targetId = editingId;
    let currentUrl = "https://google.com";
    let tabId = null;

    if (!targetId) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) currentUrl = tab.url;
        if (tab && tab.id) tabId = tab.id;
      } catch {}
      targetId = buildManualSeriesId(novelName, currentUrl);
    }

    const existing = savedNovels[targetId];
    let completedCounted = Boolean(existing?.completedCounted);

    if (statusManual === "completed" && !completedCounted) {
      completedCounted = true;
      stats.novelsCompleted = (Number(stats.novelsCompleted) || 0) + 1;
      evaluateUnlockedTitles(stats, currentThemeFilter);
      stats.updatedAt = Date.now();
    }

    const chapNum = parseFloat(chapter) || 1;
    const prevMax = existing ? parseFloat(existing.maxCounted ?? existing.chapter) || 0 : 0;

    savedNovels[targetId] = {
      ...(existing || {}),
      seriesId: targetId,
      novelName,
      customName: novelName,
      novelUrl: existing?.novelUrl || "",
      url: existing?.url || currentUrl,
      chapter,
      maxCounted: Math.max(prevMax, chapNum),
      statusManual,
      completedCounted,
      updatedAt: Date.now()
    };

    if (tabId) {
      chrome.action.setBadgeText({ tabId }).catch(() => {});
    }

    await chrome.storage.local.set({ savedNovels, stats });
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });

    document.getElementById("editingSeriesId").value = "";
    chapInput.value = "";
    statusSelect.value = "";
    document.getElementById("manualDrawer")?.classList.remove("open");
    await renderCultivationUI();
    await renderNovels();
  });

  document.getElementById("novelList")?.addEventListener("click", async (e) => {
    const resumeBtn = e.target.closest(".btn-resume");
    if (resumeBtn) {
      const url = resumeBtn.getAttribute("data-url");
      if (url) chrome.tabs.create({ url });
      return;
    }

    const dismissAlertBtn = e.target.closest(".btn-dismiss-alert");
    if (dismissAlertBtn) {
      const key = dismissAlertBtn.getAttribute("data-key");
      const storage = await chrome.storage.local.get(["savedNovels"]);
      const savedNovels = storage.savedNovels || {};
      if (savedNovels[key]) {
        savedNovels[key].alert = null;
        await chrome.storage.local.set({ savedNovels });
        renderNovels();
      }
      return;
    }

    const plusBtn = e.target.closest(".btn-plus-one");
    if (plusBtn) {
      const key = plusBtn.getAttribute("data-key");
      const storage = await chrome.storage.local.get(["savedNovels"]);
      const savedNovels = storage.savedNovels || {};
      if (savedNovels[key] && !savedNovels[key].deleted) {
        const currentChap = parseFloat(savedNovels[key].chapter) || 0;
        const nextChap = Math.floor(currentChap + 1);
        savedNovels[key].chapter = String(nextChap);
        savedNovels[key].maxCounted = Math.max(parseFloat(savedNovels[key].maxCounted) || 0, nextChap);
        savedNovels[key].scrollPct = 0;
        savedNovels[key].updatedAt = Date.now();
        await chrome.storage.local.set({ savedNovels });
        chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
        renderNovels();
      }
      return;
    }

    const renameBtn = e.target.closest(".btn-rename");
    if (renameBtn) {
      const key = renameBtn.getAttribute("data-key");
      const storage = await chrome.storage.local.get(["savedNovels"]);
      const savedNovels = storage.savedNovels || {};
      const item = savedNovels[key];
      if (!item || item.deleted) return;

      const drawer = document.getElementById("manualDrawer");
      document.getElementById("editingSeriesId").value = key;
      document.getElementById("manualName").value = item.customName || item.novelName || "";
      document.getElementById("manualChapter").value = item.chapter || "1";
      document.getElementById("manualStatus").value = item.statusManual || "";
      drawer?.classList.add("open");
      document.getElementById("manualName")?.focus();
      return;
    }

    const deleteBtn = e.target.closest(".btn-delete");
    if (deleteBtn) {
      const key = deleteBtn.getAttribute("data-key");
      const storage = await chrome.storage.local.get(["savedNovels"]);
      const savedNovels = storage.savedNovels || {};
      if (savedNovels[key]) {
        savedNovels[key] = {
          seriesId: key,
          deleted: true,
          updatedAt: Date.now()
        };
        await chrome.storage.local.set({ savedNovels });
        chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
        renderNovels();
      }
    }
  });
}

async function renderNovels() {
  const container = document.getElementById("novelList");
  if (!container) return;

  const { savedNovels: rawNovels, settings } = await chrome.storage.local.get(["savedNovels", "settings"]);
  const savedNovels = rawNovels || {};

  const keys = Object.keys(savedNovels)
    .filter((k) => {
      const item = savedNovels[k];
      if (!item || item.deleted === true) return false;
      const displayName = String(item.customName || item.novelName || "");
      if (!displayName || !displayName.toLowerCase().includes(currentSearch)) return false;

      if (currentStatusFilter !== "all") {
        const effStatus = computeEffectiveStatus(item, settings);
        if (effStatus !== currentStatusFilter) return false;
      }
      return true;
    })
    .sort((a, b) => (savedNovels[b].updatedAt || 0) - (savedNovels[a].updatedAt || 0));

  if (keys.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${currentSearch || currentStatusFilter !== "all" ? escapeHtml(t("empty_search")) : t("empty_library")}
      </div>`;
    return;
  }

  container.innerHTML = keys.map((key) => {
    const novel = savedNovels[key];
    const displayName = novel.customName || novel.novelName;
    const domain = extractDomain(novel.novelUrl || novel.url);
    const relativeTime = formatTimeAgo(novel.updatedAt);
    const effStatus = computeEffectiveStatus(novel, settings);
    const statusLabel = t(`status_${effStatus}`);
    const scrollPct = Number(novel.scrollPct) || 0;

    let alertHtml = "";
    if (novel.alert && novel.alert.type === "jump") {
      const jumpText = t("alert_jump", { from: novel.alert.from, to: novel.alert.to });
      alertHtml = `
        <div class="card-alert-row">
          <span>⚠️ ${escapeHtml(jumpText)}</span>
          <button type="button" class="btn-dismiss-alert" data-key="${escapeHtml(key)}" title="${escapeHtml(t("alert_dismiss"))}">✕</button>
        </div>`;
    } else if (novel.alert && novel.alert.type === "repeat") {
      const repText = t("alert_repeat", { chapter: novel.alert.chapter });
      alertHtml = `
        <div class="card-alert-row">
          <span>🔁 ${escapeHtml(repText)}</span>
          <button type="button" class="btn-dismiss-alert" data-key="${escapeHtml(key)}" title="${escapeHtml(t("alert_dismiss"))}">✕</button>
        </div>`;
    }

    const scrollHtml = scrollPct > 0
      ? `<span class="scroll-tag">${escapeHtml(t("scroll_badge", { pct: scrollPct }))}</span>`
      : "";

    return `
      <div class="novel-card">
        <div class="novel-top">
          <span class="novel-title">${escapeHtml(displayName)}</span>
          <div class="badge-group">
            <span class="chapter-pill">${escapeHtml(t("chapter_abbr", { chapter: novel.chapter }))}</span>
            <button type="button" class="btn-plus-one" data-key="${escapeHtml(key)}" title="${escapeHtml(t("btn_plus_one_title"))}">+1</button>
          </div>
        </div>
        ${alertHtml}
        <div class="novel-bottom">
          <div class="meta-info">
            <span class="status-tag ${escapeHtml(effStatus)}">${escapeHtml(statusLabel)}</span>
            <span class="domain-tag">${escapeHtml(domain)}</span>
            ${scrollHtml}
            <span>• ${escapeHtml(relativeTime)}</span>
          </div>
          <div class="card-actions">
            <button type="button" class="btn-resume" data-url="${escapeHtml(novel.url)}">
              <span>${escapeHtml(t("btn_continue"))}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-rename" data-key="${escapeHtml(key)}" title="${escapeHtml(t("btn_rename_title"))}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-delete" data-key="${escapeHtml(key)}" title="${escapeHtml(t("btn_delete_title"))}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function updateWhatsappStatusBadge(status) {
  const badge = document.getElementById("waStatusBadge");
  if (!badge) return;
  const valid = ["unconfigured", "untested", "working", "error"].includes(status) ? status : "unconfigured";
  badge.className = `wa-status-badge ${valid}`;
  badge.textContent = t(`wa_status_${valid}`);
}

function initWhatsappEvents() {
  document.getElementById("btnCopyCallmebotPhrase")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("I allow callmebot to send me messages");
      const status = document.getElementById("statusMsg");
      status.className = "feedback-msg ok";
      status.textContent = t("wa_step1_copied");
      setTimeout(() => { status.textContent = ""; }, 2500);
    } catch {}
  });

  document.getElementById("btnSaveSettings")?.addEventListener("click", async () => {
    const storage = await chrome.storage.local.get(["settings"]);
    const prev = storage.settings || {};
    const phone = document.getElementById("phone").value.replace(/[^0-9]/g, "");
    const apiKey = document.getElementById("apiKey").value.trim();

    let whatsappStatus = prev.whatsappStatus || "unconfigured";
    if (!phone || !apiKey) {
      whatsappStatus = "unconfigured";
    } else if (phone !== prev.phone || apiKey !== prev.apiKey || whatsappStatus === "unconfigured") {
      whatsappStatus = "untested";
    }

    const settings = {
      ...prev,
      enableWhatsapp: document.getElementById("enableWhatsapp").checked,
      waitMinutes: parseFloat(document.getElementById("waitMinutes").value) || 1,
      phone,
      apiKey,
      whatsappStatus
    };

    await chrome.storage.local.set({ settings });
    updateWhatsappStatusBadge(whatsappStatus);

    const status = document.getElementById("statusMsg");
    status.className = "feedback-msg ok";
    status.textContent = t("wa_saved_ok");
    setTimeout(() => { status.textContent = ""; }, 2000);
  });

  document.getElementById("btnTestWhatsapp")?.addEventListener("click", async () => {
    const phone = document.getElementById("phone").value.replace(/[^0-9]/g, "");
    const apiKey = document.getElementById("apiKey").value.trim();
    const enableWhatsapp = document.getElementById("enableWhatsapp").checked;
    const waitMinutes = parseFloat(document.getElementById("waitMinutes").value) || 1;

    const status = document.getElementById("statusMsg");
    status.className = "feedback-msg ok";
    status.textContent = t("wa_testing_msg");

    chrome.runtime.sendMessage(
      {
        type: "TEST_WHATSAPP",
        data: { phone, apiKey, enableWhatsapp, waitMinutes }
      },
      (res) => {
        if (res && res.ok) {
          updateWhatsappStatusBadge("working");
          status.className = "feedback-msg ok";
          status.textContent = t("wa_test_ok");
        } else {
          updateWhatsappStatusBadge(res?.status || "error");
          status.className = "feedback-msg err";
          status.textContent = t("wa_test_err");
        }
      }
    );
  });
}

function initSettingsAndBackupEvents() {
  document.getElementById("languageSelect")?.addEventListener("change", async (e) => {
    const lang = e.target.value;
    const storage = await chrome.storage.local.get(["settings"]);
    const settings = { ...(storage.settings || {}), language: lang };
    await chrome.storage.local.set({ settings });
    setCurrentLang(lang);
    applyI18nToDom();
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    await checkAuthState();
    await renderCultivationUI();
    await renderNovels();
    await renderDiagnosticLogs();
  });

  document.getElementById("enablePerfMode")?.addEventListener("change", async (e) => {
    const isPerf = Boolean(e.target.checked);
    document.body.classList.toggle("perf-mode", isPerf);
    const storage = await chrome.storage.local.get(["settings"]);
    const settings = { ...(storage.settings || {}), perfMode: isPerf };
    await chrome.storage.local.set({ settings });
  });

  document.getElementById("btnSavePrefs")?.addEventListener("click", async () => {
    const lang = document.getElementById("languageSelect").value;
    const pauseDays = Math.max(1, parseInt(document.getElementById("pauseDaysInput").value, 10) || 30);
    const dropDays = Math.max(pauseDays + 1, parseInt(document.getElementById("dropDaysInput").value, 10) || 90);
    const isPerf = document.getElementById("enablePerfMode")?.checked;

    const storage = await chrome.storage.local.get(["settings"]);
    const settings = {
      ...(storage.settings || {}),
      language: lang,
      pauseDays,
      dropDays,
      perfMode: Boolean(isPerf)
    };

    await chrome.storage.local.set({ settings });
    setCurrentLang(lang);
    applyI18nToDom();
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    await checkAuthState();
    await renderCultivationUI();
    await renderNovels();
    await renderDiagnosticLogs();

    const msg = document.getElementById("prefsMsg");
    msg.textContent = t("settings_prefs_saved");
    setTimeout(() => { msg.textContent = ""; }, 2000);
  });

  document.getElementById("btnExportJson")?.addEventListener("click", async () => {
    const { savedNovels, stats, settings } = await chrome.storage.local.get(["savedNovels", "stats", "settings"]);
    const safeSettings = { ...(settings || {}) };
    delete safeSettings.phone;
    delete safeSettings.apiKey;

    const exportPayload = {
      version: "4.0.0",
      exportedAt: Date.now(),
      novels: savedNovels || {},
      stats: stats || {},
      settings: safeSettings
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noveltrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const msg = document.getElementById("backupMsg");
    msg.className = "feedback-msg ok";
    msg.textContent = t("backup_export_ok");
  });

  document.getElementById("btnImportJson")?.addEventListener("click", () => {
    document.getElementById("importFileInput")?.click();
  });

  document.getElementById("importFileInput")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const msg = document.getElementById("backupMsg");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || (!parsed.novels && !parsed.stats)) {
        throw new Error("Invalid format");
      }

      chrome.runtime.sendMessage({ type: "IMPORT_DATA", payload: parsed }, async (res) => {
        if (res && res.ok) {
          await loadSettings();
          await renderCultivationUI();
          await renderNovels();
          msg.className = "feedback-msg ok";
          msg.textContent = t("backup_import_ok", {
            added: res.added || 0,
            updated: res.updated || 0,
            skipped: res.skipped || 0
          });
        } else {
          msg.className = "feedback-msg err";
          msg.textContent = t("backup_import_err");
        }
      });
    } catch {
      msg.className = "feedback-msg err";
      msg.textContent = t("backup_import_err");
    } finally {
      e.target.value = "";
    }
  });
}

function initAccountEvents() {
  document.getElementById("btnLogin")?.addEventListener("click", () => handleAuth("signInWithPassword"));
  document.getElementById("btnRegister")?.addEventListener("click", () => handleAuth("signUp"));

  document.getElementById("btnSyncNow")?.addEventListener("click", () => {
    showAuthMsg(t("cloud_msg_syncing"), false);
    chrome.runtime.sendMessage({ type: "PULL_FROM_CLOUD" }, () => {
      showAuthMsg(t("cloud_msg_synced"), false);
      renderCultivationUI();
      renderNovels();
    });
  });

  document.getElementById("btnLogout")?.addEventListener("click", async () => {
    await chrome.storage.local.remove(["auth"]);
    await checkAuthState();
    showAuthMsg(t("cloud_msg_logged_out"), false);
  });
}

async function handleAuth(mode) {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPass").value.trim();

  if (!email || password.length < 6) {
    showAuthMsg(t("cloud_msg_invalid"), true);
    return;
  }

  showAuthMsg(t("cloud_msg_connecting"), false);

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${mode}?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await res.json();
    if (data.error) {
      showAuthMsg(`Error: ${data.error.message}`, true);
      return;
    }

    const authData = {
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + parseInt(data.expiresIn, 10) * 1000
    };

    await chrome.storage.local.set({ auth: authData });
    await checkAuthState();
    showAuthMsg(t("cloud_msg_connected"), false);
    chrome.runtime.sendMessage({ type: "PULL_FROM_CLOUD" });
  } catch {
    showAuthMsg(t("cloud_msg_net_err"), true);
  }
}

async function checkAuthState() {
  const { auth } = await chrome.storage.local.get(["auth"]);
  const loggedOutView = document.getElementById("loggedOutView");
  const loggedInView = document.getElementById("loggedInView");
  const badge = document.getElementById("syncBadge");
  const syncText = document.getElementById("syncText");

  if (auth && auth.email) {
    loggedOutView.style.display = "none";
    loggedInView.style.display = "flex";
    document.getElementById("userEmailDisplay").textContent = auth.email;
    syncText.textContent = t("sync_online");
    badge.className = "sync-pill online";
  } else {
    loggedOutView.style.display = "flex";
    loggedInView.style.display = "none";
    syncText.textContent = t("sync_local");
    badge.className = "sync-pill";
  }
}

function showAuthMsg(text, isError) {
  const el = document.getElementById("authMsg");
  if (!el) return;
  el.textContent = text;
  el.className = isError ? "feedback-msg err" : "feedback-msg ok";
}

async function loadSettings() {
  const storage = await chrome.storage.local.get(["settings"]);
  const settings = storage.settings || {};

  document.getElementById("enableWhatsapp").checked = Boolean(settings.enableWhatsapp);
  document.getElementById("waitMinutes").value = settings.waitMinutes || 1;
  document.getElementById("phone").value = settings.phone || "";
  document.getElementById("apiKey").value = settings.apiKey || "";

  const status = !settings.phone || !settings.apiKey
    ? "unconfigured"
    : (settings.whatsappStatus || "untested");
  updateWhatsappStatusBadge(status);

  document.getElementById("languageSelect").value = settings.language || getCurrentLang();
  document.getElementById("pauseDaysInput").value = settings.pauseDays || 30;
  document.getElementById("dropDaysInput").value = settings.dropDays || 90;

  const isPerf = Boolean(settings.perfMode);
  const perfToggle = document.getElementById("enablePerfMode");
  if (perfToggle) perfToggle.checked = isPerf;
  document.body.classList.toggle("perf-mode", isPerf);

  if (settings.activeThemeId && THEMES_CONFIG[settings.activeThemeId]) {
    currentThemeFilter = settings.activeThemeId;
  }
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return t("domain_manual");
  }
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return t("time_recent");
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return t("time_now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("time_min", { n: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t("time_hour", { n: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return t("time_yesterday");
  const locale = getCurrentLang() === "en" ? "en-US" : "es-ES";
  return new Date(timestamp).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[s]));
}