const FIREBASE_API_KEY = "AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU";
const FIREBASE_DB_URL = "https://novel-tracker-1d134-default-rtdb.firebaseio.com";

const INLINE_CHAPTER_CUT_REGEX = /\s*[-–—|:«»]*\s*(?:chapter|cap[ií]tulo|capitulo|episode|episodio|parte|ch\.|cap\.|ep\.|c\.)\s*#?\s*\d+.*$/i;
const TRAILING_MEDIA_SUFFIX_REGEX = /\s+\b(?:manhwa|manhua|manga|webtoon|novela\s*ligera|light\s*novel|web\s*novel|novela|novel|comic|raw|sub\s*espa[ñn]ol|en\s*espa[ñn]ol|online|gratis|free)\b\s*$/i;

// Themes & Achievements data loaded from achievements_data.js (with global fallback)
var THEMES_CONFIG = window.THEMES_CONFIG || (typeof globalThis !== "undefined" ? globalThis.THEMES_CONFIG : null);
var CULTIVATION_REALMS = window.CULTIVATION_REALMS || (THEMES_CONFIG ? THEMES_CONFIG.cultivation.realms : []);
var ALL_TITLES = window.ALL_TITLES || [];
var TITLE_CONFIG = window.TITLE_CONFIG || {};
var TITLE_BADGE_COLORS = window.TITLE_BADGE_COLORS || {};
var TITLE_BADGE_SYMBOLS = window.TITLE_BADGE_SYMBOLS || {};
var CULTIVATION_TITLES = window.CULTIVATION_TITLES || [];

let currentThemeFilter = "cultivation";

let currentSearch = "";
let currentStatusFilter = "all";
let activeUnconfirmedTabId = null;
let activeUnconfirmedData = null;
let currentBlacklistSearch = "";

function isValidHttpUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeDomain(input) {
  if (!input || typeof input !== "string") return "";
  let clean = input.trim().toLowerCase();
  clean = clean.replace(/^[a-z0-9+.-]+:\/\//i, "");
  if (clean.includes("@")) {
    clean = clean.split("@").pop();
  }
  clean = clean.split(/[/?#]/)[0];
  clean = clean.split(":")[0];
  clean = clean.replace(/^www\./i, "");
  clean = clean.replace(/^\*+\.?/i, "");
  clean = clean.replace(/\.+$/, "").replace(/^\.+/, "");
  return clean.trim();
}

function showToast(message, type = "info", duration = 3000, action = null) {
  const container = document.getElementById("toastContainer");
  if (!container) return null;

  const item = document.createElement("div");
  item.className = `toast-item ${type}`;

  const textSpan = document.createElement("span");
  textSpan.textContent = message;
  textSpan.style.flex = "1";
  item.appendChild(textSpan);

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    if (item.parentNode === container) {
      item.style.transition = "opacity 0.2s, transform 0.2s";
      item.style.opacity = "0";
      item.style.transform = "translateY(6px)";
      setTimeout(() => item.remove(), 200);
    }
  };

  if (action && action.label && typeof action.onClick === "function") {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-undo-btn";
    actionBtn.textContent = action.label;
    actionBtn.addEventListener("click", () => {
      dismiss();
      action.onClick();
    });
    item.appendChild(actionBtn);
  }

  container.appendChild(item);

  if (duration > 0) {
    timer = setTimeout(dismiss, duration);
  }

  return { dismiss };
}

function setManualStatus(status) {
  const hidden = document.getElementById("manualStatus");
  if (hidden) hidden.value = status || "";
  const chips = document.querySelectorAll("#manualStatusChips .status-chip");
  chips.forEach((c) => {
    const isTarget = (c.getAttribute("data-status") || "") === (status || "");
    c.classList.toggle("active", isTarget);
  });
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
  await renderInventoryUI();
  await renderNovels();
  await renderDiagnosticLogs();
  await renderBlacklistUI();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.savedNovels) renderNovels();
    if (changes.stats) {
      renderCultivationUI();
      renderInventoryUI();
    }
    if (changes.auth) checkAuthState();
    if (changes.settings) loadSettings();
    if (changes.diagnosticLogs) renderDiagnosticLogs();
    if (changes.domainBlacklist) renderBlacklistUI();
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

      if (targetId === "view-inventory") {
        renderInventoryUI();
      } else if (targetId === "view-cultivation") {
        renderCultivationUI();
      }
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

  const focusEquippedTitle = async () => {
    openCultivation();

    const { stats: rawStats } = await chrome.storage.local.get(["stats"]);
    const stats = rawStats || {};
    const equippedId = stats.equippedTitle;
    const isUnlocked = Boolean(equippedId && (stats.unlockedTitles || []).includes(equippedId));

    if (isUnlocked && equippedId) {
      const cfg = TITLE_CONFIG[equippedId];
      const targetTheme = cfg?.themeId || "cultivation";

      if (currentThemeFilter !== targetTheme && THEMES_CONFIG[targetTheme]) {
        currentThemeFilter = targetTheme;
        const { settings: rawSettings } = await chrome.storage.local.get(["settings"]);
        const settings = { ...(rawSettings || {}), activeThemeId: targetTheme };
        await chrome.storage.local.set({ settings });
        try {
          chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
        } catch {}
        await renderCultivationUI();
      } else if (!document.querySelector(`.title-item[data-title-id="${equippedId}"]`)) {
        await renderCultivationUI();
      }

      // Ajuste 4: Tras cambiar de pestaña, ejecuta scrollIntoView con requestAnimationFrame y comprueba que la tarjeta exista y sea visible
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const card = document.querySelector(`.title-item[data-title-id="${equippedId}"]`);
          if (card && (card.offsetParent !== null || card.offsetWidth > 0 || card.offsetHeight > 0)) {
            const isReducedMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
            card.scrollIntoView({ behavior: isReducedMotion ? "auto" : "smooth", block: "center" });
            card.classList.remove("highlight-flash");
            void card.offsetWidth;
            card.classList.add("highlight-flash");
            setTimeout(() => {
              card.classList.remove("highlight-flash");
            }, 1800);
            card.focus?.();
          }
        });
      });
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const titlesList = document.getElementById("titlesList");
          if (titlesList && (titlesList.offsetParent !== null || titlesList.offsetWidth > 0)) {
            const isReducedMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
            titlesList.scrollIntoView({ behavior: isReducedMotion ? "auto" : "smooth", block: "start" });
          }
        });
      });
    }
  };

  const eqTitle = document.getElementById("headerEquippedTitle");
  eqTitle?.addEventListener("click", focusEquippedTitle);
  eqTitle?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focusEquippedTitle();
    }
  });

  const brandCrestEl = document.getElementById("brandCrest");
  brandCrestEl?.addEventListener("click", focusEquippedTitle);
  brandCrestEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focusEquippedTitle();
    }
  });

  // Global Escape Key Listener for Modals, Drawers and Banner
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const btModal = document.getElementById("breakthroughConfirmModal");
      if (btModal && btModal.style.display !== "none") {
        btModal.style.display = "none";
        return;
      }
      const clModal = document.getElementById("clearBlacklistConfirmModal");
      if (clModal && clModal.style.display !== "none") {
        clModal.style.display = "none";
        return;
      }
      const celModal = document.getElementById("achievementCelebrationModal");
      if (celModal && celModal.style.display !== "none") {
        closeCelebrationModal();
        return;
      }
      const drawer = document.getElementById("manualDrawer");
      if (drawer && drawer.classList.contains("open")) {
        drawer.classList.remove("open");
        return;
      }
      const banner = document.getElementById("unconfirmedBanner");
      if (banner && banner.classList.contains("visible")) {
        banner.classList.remove("visible");
        if (activeUnconfirmedTabId) {
          chrome.runtime.sendMessage({
            type: "DISCARD_UNCONFIRMED_TAB",
            tabId: activeUnconfirmedTabId
          }).catch(() => {});
        }
        return;
      }
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
  const bonus = (typeof calculateBonusQi === "function") ? calculateBonusQi(stats) : (Number(stats?.bonusQi) || 0);
  return chapters + 50 * completed + bonus;
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
  if (typeof globalThis.getCultivationState === "function" && globalThis.getCultivationState !== getCultivationState) {
    return globalThis.getCultivationState(stats, themeId);
  }

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
  const isPeakRealm = !currentRealm.hasStages || currentRealm.nextQi === null;

  let currentCapQi = null;
  let currentStageCapQi = null;
  let prevStageCapQi = currentRealm.minQi;
  let stageProgress = 0;
  let stageSpan = 0;
  let isBottleneck = false;
  let isRealmBottleneck = false;
  let overflowQi = 0;
  let pct = 100;

  if (!isPeakRealm && cultivatedStage !== null) {
    const realmSpan = currentRealm.nextQi - currentRealm.minQi;
    stageSpan = realmSpan / 9;
    const stageMin = currentRealm.minQi + stageSpan * (cultivatedStage - 1);
    prevStageCapQi = Math.round(stageMin);
    currentCapQi = Math.round(currentRealm.minQi + stageSpan * cultivatedStage);
    currentStageCapQi = currentCapQi;
    stageProgress = Math.max(0, totalQi - stageMin);

    if (totalQi >= currentCapQi) {
      isBottleneck = true;
      if (cultivatedStage === 9) {
        isRealmBottleneck = true;
      }
      overflowQi = totalQi - currentCapQi;
      pct = 100;
    } else {
      overflowQi = 0;
      const progressInStage = Math.max(0, totalQi - prevStageCapQi);
      const spanInStage = Math.max(1, currentStageCapQi - prevStageCapQi);
      pct = Math.min(99, Math.max(0, Math.round((progressInStage / spanInStage) * 100)));
    }
  } else if (isPeakRealm) {
    currentCapQi = currentRealm.minQi;
    currentStageCapQi = currentRealm.minQi;
  }

  const nextRealm = (!isPeakRealm && cultivatedRealmIndex < realms.length - 1)
    ? realms[cultivatedRealmIndex + 1]
    : null;

  return {
    themeId: theme.id,
    realmIndex: cultivatedRealmIndex,
    realmId: currentRealm.id,
    realmObj: currentRealm,
    realmNameKey: `realm_${currentRealm.id}`,
    stage: cultivatedStage,
    colors: currentRealm.colors,
    gradient: currentRealm.gradient,
    totalQi,
    currentCapQi,
    currentStageCapQi,
    prevStageCapQi,
    isBottleneck,
    isBottleneckReady: isBottleneck,
    isRealmBottleneck,
    isMajorBottleneck: isRealmBottleneck,
    overflowQi,
    pct,
    nextRealmId: nextRealm ? nextRealm.id : null,
    isPeakRealm,
    nextRealm,
    stageProgress,
    stageSpan
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


function getAchievementProgress(title, stats, cultState) {
  const currentTheme = THEMES_CONFIG[title.themeId || "cultivation"] || THEMES_CONFIG.cultivation;
  const themeState = getCultivationState(stats, currentTheme.id);
  const themeRealmIndex = themeState.realmIndex;
  const themeStage = themeState.stage;

  const reqList = [];

  if (title.reqChapters) {
    const target = title.reqChapters;
    const current = Math.min(Number(stats.chaptersRead) || 0, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: t("ach_unit_chapters"), pct });
  }
  if (title.reqNovelsStarted) {
    const target = title.reqNovelsStarted;
    const current = Math.min(Number(stats.novelsStarted) || 0, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: t("ach_unit_novels"), pct });
  }
  if (title.reqNovelsCompleted) {
    const target = title.reqNovelsCompleted;
    const current = Math.min(Number(stats.novelsCompleted) || 0, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: t("ach_unit_novels"), pct });
  }
  if (title.reqStreak) {
    const maxStreak = Math.max(Number(stats.streakDays) || 0, Number(stats.bestStreak) || 0);
    const target = title.reqStreak;
    const current = Math.min(maxStreak, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: t("ach_unit_days"), pct });
  }
  if (title.reqSingleDay) {
    const { maxSingleDay } = pruneAndSumDailyChapters(stats.dailyChapters);
    const target = title.reqSingleDay;
    const current = Math.min(maxSingleDay, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: t("ach_unit_daily_cap"), pct });
  }
  if (title.req30Days) {
    const { last30DaysSum } = pruneAndSumDailyChapters(stats.dailyChapters);
    const target = title.req30Days;
    const current = Math.min(last30DaysSum, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: t("ach_unit_30days"), pct });
  }
  if (title.reqQi) {
    const totalQi = calculateQi(stats);
    const target = title.reqQi;
    const current = Math.min(totalQi, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: t("ach_unit_qi"), pct });
  }
  if (reqList.length === 0) {
    const target = title.minRealmIndex;
    const current = Math.min(themeRealmIndex, target);
    const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    reqList.push({ current, target, unit: "Reino", pct });
  }

  const minPct = Math.min(...reqList.map((r) => r.pct));
  const text = reqList
    .map((r) => {
      const curFmt = r.current >= 1000 ? r.current.toLocaleString() : String(r.current);
      const tarFmt = r.target >= 1000 ? r.target.toLocaleString() : String(r.target);
      return `${curFmt} / ${tarFmt} ${r.unit}`;
    })
    .join(" · ") + ` (${minPct}%)`;

  const primary = reqList[0];
  return {
    current: primary.current,
    target: primary.target,
    pct: minPct,
    text,
    allRequirements: reqList
  };
}

function renderBadge(titleOrId, options = {}) {
  const size = options.size || "md";

  let cfg = null;
  let id = null;
  if (typeof titleOrId === "string" && titleOrId) {
    id = titleOrId;
    cfg = TITLE_CONFIG[id] || null;
  } else if (titleOrId && typeof titleOrId === "object") {
    id = titleOrId.id || null;
    cfg = (id && TITLE_CONFIG[id]) ? { ...TITLE_CONFIG[id], ...titleOrId } : titleOrId;
  }

  // Estado vacío: elegante marco apagado con silueta que invita a equipar un título
  if (!cfg || !id) {
    const hintText = (typeof t === "function" ? t("header_no_title_hint") : "") || "Equipar título";
    return `
      <div class="novel-badge badge-size-${escapeHtml(size)} badge-empty" data-size="${escapeHtml(size)}" data-rarity="none" role="img" aria-label="${escapeHtml(hintText)}">
        <div class="badge-halo">
          <div class="badge-frame-layer">
            <svg class="badge-silhouette-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <polygon points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" stroke-dasharray="5 3.5" fill="rgba(255,255,255,0.03)" />
              <polygon points="32,12 68,12 88,32 88,68 68,88 32,88 12,68 12,32" stroke="rgba(255,255,255,0.08)" stroke-width="1.2" fill="none" />
              <circle cx="50" cy="44" r="14" stroke="rgba(255,255,255,0.22)" stroke-width="2" fill="none" />
              <path d="M30 78 C30 65 40 58 50 58 C60 58 70 65 70 78" stroke="rgba(255,255,255,0.22)" stroke-width="2" stroke-linecap="round" fill="none" />
            </svg>
          </div>
        </div>
      </div>
    `.trim();
  }

  // Ajuste 3: La rareza debe leerse de TITLE_CONFIG[id].rarity, no deducirse del rango de tier
  const rarity = (TITLE_CONFIG[id] && TITLE_CONFIG[id].rarity) || cfg.rarity || "common";
  const badgeSrc = cfg.badge || (TITLE_CONFIG[id] && TITLE_CONFIG[id].badge) || `assets/badges/${id}.svg`;
  const fallbackSrc = `assets/badges/badge_${rarity}.svg`;
  const titleName = (typeof t === "function" ? t(`title_${id}_name`) : "") || cfg.name || id;
  const loadingMode = size === "md" ? "lazy" : "eager";
  const imgIdAttr = size === "lg" ? ' id="celebrationBadgeImg"' : "";

  return `
    <div class="novel-badge badge-size-${escapeHtml(size)} rarity-${escapeHtml(rarity)}" data-title-id="${escapeHtml(id)}" data-rarity="${escapeHtml(rarity)}" data-size="${escapeHtml(size)}" role="img" aria-label="${escapeHtml(titleName)}">
      <div class="badge-halo">
        <div class="badge-frame-layer">
          <img${imgIdAttr} class="badge-img" src="${escapeHtml(badgeSrc)}" alt="${escapeHtml(titleName)}" data-fallback="${escapeHtml(fallbackSrc)}" loading="${loadingMode}">
        </div>
      </div>
    </div>
  `.trim();
}

function openCelebrationModal(titleId) {
  const cfg = TITLE_CONFIG[titleId];
  if (!cfg) return;

  const modal = document.getElementById("achievementCelebrationModal");
  if (!modal) return;

  const badgeWrapper = document.getElementById("celebrationBadgeWrapper");
  const titleName = document.getElementById("celebrationTitleName");
  const tierTag = document.getElementById("celebrationTierTag");
  const titleDesc = document.getElementById("celebrationTitleDesc");
  const rewardVal = document.getElementById("celebrationRewardVal");
  const claimBtn = document.getElementById("btnClaimCelebrationReward");

  // Ajuste 3: La rareza debe leerse de TITLE_CONFIG[id].rarity, no deducirse del rango de tier
  const rarity = (TITLE_CONFIG[titleId] && TITLE_CONFIG[titleId].rarity) || cfg.rarity || "common";
  const fallbackSrc = `assets/badges/badge_${rarity}.svg`;

  if (badgeWrapper) {
    // Reutilizar componente renderBadge(titleId, { size: "lg" }) para el modal de celebración
    badgeWrapper.innerHTML = renderBadge(titleId, { size: "lg" });
    badgeWrapper.className = `celebration-badge-wrapper rarity-${rarity}`;

    // Ajuste 1: El fallback de imagen debe usar addEventListener('error'), no atributos onerror inline (CSP de MV3)
    const badgeImg = badgeWrapper.querySelector("img");
    if (badgeImg) {
      badgeImg.addEventListener(
        "error",
        () => {
          if (!badgeImg.dataset.hasFailed) {
            badgeImg.dataset.hasFailed = "true";
            badgeImg.src = fallbackSrc;
          }
        },
        { once: true }
      );
    }
  }
  if (titleName) {
    titleName.textContent = t(`title_${cfg.id}_name`);
  }
  if (tierTag) {
    tierTag.textContent = `${t(`cult_tier_${cfg.tier || 1}`)} • ${t(`ach_rarity_${rarity}`)}`;
    tierTag.className = `celebration-tier-tag tier-tag-${cfg.tier || 1}`;
  }
  if (titleDesc) {
    titleDesc.textContent = t(`title_${cfg.id}_desc`);
  }
  if (rewardVal) {
    rewardVal.textContent = `+${cfg.rewardQi || 50} Qi`;
  }
  if (claimBtn) {
    claimBtn.textContent = t("ach_modal_claim_btn", { qi: cfg.rewardQi || 50 });
    claimBtn.setAttribute("data-ach-id", cfg.id);
  }

  modal.style.display = "flex";
}

function closeCelebrationModal() {
  const modal = document.getElementById("achievementCelebrationModal");
  if (modal) modal.style.display = "none";
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
    if (cultState.isBottleneckReady && !cultState.isPeakRealm) {
      bottleneckCard.style.display = "flex";
      const iconEl = document.getElementById("bottleneckIcon");
      const titleEl = document.getElementById("bottleneckTitle");
      const descEl = document.getElementById("bottleneckDesc");
      const btnTextEl = document.getElementById("btnBreakthroughText");
      const surplusEl = document.getElementById("bottleneckSurplus");

      const currentRealmName = t(`realm_${cultState.realmId}`);

      if (cultState.isMajorBottleneck && cultState.nextRealmId) {
        bottleneckCard.classList.add("major-realm-card");
        if (iconEl) iconEl.textContent = "🌌";
        const nextRealmName = t(`realm_${cultState.nextRealmId}`);
        if (titleEl) titleEl.textContent = t("bottleneck_realm_title");
        if (descEl) {
          descEl.textContent = t("bottleneck_realm_desc", {
            realmName: currentRealmName,
            nextRealmName: nextRealmName
          });
        }
        if (btnTextEl) {
          btnTextEl.textContent = t("bottleneck_btn_realm", { nextRealm: nextRealmName });
        }
      } else {
        bottleneckCard.classList.remove("major-realm-card");
        if (iconEl) iconEl.textContent = "⚡";
        const realmSpan = cultState.realmObj ? (cultState.realmObj.nextQi - cultState.realmObj.minQi) : 100;
        const progressInRealm = Math.max(0, cultState.totalQi - (cultState.realmObj?.minQi || 0));
        const earnedStage = Math.min(9, Math.floor((progressInRealm * 9) / realmSpan) + 1);
        const nextStage = Math.min(9, Math.max((cultState.stage || 1) + 1, earnedStage));

        if (titleEl) titleEl.textContent = t("bottleneck_stage_title", { stage: nextStage });
        if (descEl) {
          descEl.textContent = t("bottleneck_stage_desc", {
            totalQi: cultState.totalQi,
            capQi: cultState.currentStageCapQi,
            nextStage
          });
        }
        if (btnTextEl) {
          btnTextEl.textContent = t("bottleneck_btn_stage", { stage: nextStage });
        }
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
      bottleneckCard.classList.remove("major-realm-card");
    }
  }

  const equippedPlaque = document.getElementById("headerEquippedTitle");
  const brandCrestEl = document.getElementById("brandCrest");
  const hasValidEquipped = Boolean(stats.equippedTitle && (stats.unlockedTitles || []).includes(stats.equippedTitle));

  if (hasValidEquipped) {
    const titleId = stats.equippedTitle;
    const cfg = TITLE_CONFIG[titleId] || { tier: 1, symbol: "🏆" };
    // Ajuste 3: La rareza debe leerse de TITLE_CONFIG[id].rarity, no deducirse del rango de tier
    const rarity = (TITLE_CONFIG[titleId] && TITLE_CONFIG[titleId].rarity) || cfg.rarity || "common";
    const titleName = t(`title_${titleId}_name`);
    const tierLabel = t(`cult_tier_${cfg.tier || 1}`);
    const rarityLabel = t(`ach_rarity_${rarity}`);
    const tooltip = `${titleName} • ${tierLabel} (${rarityLabel}) — ${t("header_title_click_hint")}`;

    equippedPlaque?.classList.remove("empty", "rarity-common", "rarity-rare", "rarity-epic", "rarity-legendary");
    equippedPlaque?.classList.add(`rarity-${rarity}`);
    equippedPlaque?.setAttribute("title", tooltip);

    if (equippedPlaque) {
      equippedPlaque.innerHTML = `
        <span class="header-badge-inline">${renderBadge(titleId, { size: "sm" })}</span>
        <span class="header-tier-tag rarity-${rarity}">T${cfg.tier || 1}</span>
        <span id="headerEquippedTitleText" class="header-title-text">${escapeHtml(titleName)}</span>
      `;
    }

    if (brandCrestEl) {
      brandCrestEl.innerHTML = renderBadge(titleId, { size: "sm" });
      brandCrestEl.className = `brand-crest has-equipped rarity-${rarity}`;
      brandCrestEl.setAttribute("title", tooltip);
    }
  } else {
    equippedPlaque?.classList.remove("rarity-common", "rarity-rare", "rarity-epic", "rarity-legendary");
    equippedPlaque?.classList.add("empty");
    const emptyTooltip = `${t("header_no_title_hint")} — ${t("header_title_click_hint")}`;
    equippedPlaque?.setAttribute("title", emptyTooltip);

    if (equippedPlaque) {
      equippedPlaque.innerHTML = `
        <span class="header-badge-inline">${renderBadge(null, { size: "sm" })}</span>
        <span id="headerEquippedTitleText" class="header-title-text">${escapeHtml(t("header_no_title_hint"))}</span>
      `;
    }

    if (brandCrestEl) {
      brandCrestEl.className = "brand-crest";
      brandCrestEl.innerHTML = `<div class="brand-crest-inner"><span class="crest-n">N</span></div>`;
      brandCrestEl.setAttribute("title", t("app_title") || "MyNovelSystem");
      if (cultState.gradient) {
        brandCrestEl.style.background = cultState.gradient;
      }
    }
  }

  // Update Active Equipped Title Chip and Unequip Button in Cultivation view
  const equippedChip = document.getElementById("equippedTitleActiveChip");
  const equippedChipSymbol = document.getElementById("equippedChipSymbol");
  const equippedChipText = document.getElementById("equippedChipText");
  const btnUnequip = document.getElementById("btnUnequipTitle");

  if (hasValidEquipped) {
    const titleId = stats.equippedTitle;
    const cfg = TITLE_CONFIG[titleId] || { tier: 1, symbol: "🏆" };
    const rarity = (TITLE_CONFIG[titleId] && TITLE_CONFIG[titleId].rarity) || cfg.rarity || "common";
    if (equippedChip) {
      equippedChip.classList.remove("empty", "rarity-common", "rarity-rare", "rarity-epic", "rarity-legendary");
      equippedChip.classList.add(`rarity-${rarity}`);
    }
    if (equippedChipSymbol) {
      equippedChipSymbol.textContent = cfg.symbol || "🏆";
    }
    if (equippedChipText) {
      equippedChipText.textContent = t(`title_${titleId}_name`);
    }
    if (btnUnequip) {
      btnUnequip.style.display = "inline-block";
    }
  } else {
    if (equippedChip) {
      equippedChip.className = "equipped-title-active-chip empty";
    }
    if (equippedChipSymbol) {
      equippedChipSymbol.textContent = "";
    }
    if (equippedChipText) {
      equippedChipText.textContent = t("title_none_name");
    }
    if (btnUnequip) {
      btnUnequip.style.display = "none";
    }
  }

  // Update Unclaimed Rewards Banner
  const unclaimedBanner = document.getElementById("unclaimedRewardsBanner");
  const unclaimedTitleEl = document.getElementById("unclaimedBannerTitle");
  const unclaimedQiEl = document.getElementById("unclaimedBannerQi");
  const unclaimedList = (typeof getUnclaimedAchievements === "function")
    ? getUnclaimedAchievements(stats)
    : [];

  if (unclaimedList.length > 0) {
    const totalRewardQi = unclaimedList.reduce((acc, it) => acc + (it.rewardQi || 50), 0);
    if (unclaimedBanner) unclaimedBanner.style.display = "flex";
    if (unclaimedTitleEl) unclaimedTitleEl.textContent = t("ach_reward_banner_text", { count: unclaimedList.length });
    if (unclaimedQiEl) unclaimedQiEl.textContent = `+${totalRewardQi} Qi`;
  } else {
    if (unclaimedBanner) unclaimedBanner.style.display = "none";
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

  // Current theme titles sorted by difficulty (Phase 2)
  const targetTheme = THEMES_CONFIG[currentThemeFilter] || THEMES_CONFIG.cultivation;
  const currentThemeTitles = typeof getSortedTitlesByDifficulty === "function"
    ? getSortedTitlesByDifficulty(targetTheme.titles || [])
    : (targetTheme.titles || []);
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
      const isClaimed = (stats.claimedRewards || []).includes(title.id);
      const cfg = TITLE_CONFIG[title.id] || { tier: 1, symbol: "📜" };
      const tier = cfg.tier || 1;
      const rarity = (TITLE_CONFIG[title.id] && TITLE_CONFIG[title.id].rarity) || cfg.rarity || "common";
      const stateClass = isUnlocked ? "unlocked" : "locked";
      const equippedClass = isEquipped ? "equipped" : "";

      const diffCfg = (typeof DIFFICULTY_CONFIG !== "undefined" && DIFFICULTY_CONFIG[title.difficulty]) || { id: "beginner" };
      const diffName = t(`diff_${diffCfg.id}`) || diffCfg.id;
      const diffTagHtml = `<span class="title-diff-tag diff-${title.difficulty || 1}">${escapeHtml(diffName)}</span>`;

      // Level Gating check (with peak realm stage === null fix)
      let levelSatisfied = false;
      if (cultState.realmIndex > title.minRealmIndex) {
        levelSatisfied = true;
      } else if (cultState.realmIndex === title.minRealmIndex) {
        levelSatisfied = (cultState.stage === null || (cultState.stage >= (title.minStage || 1)));
      }

      let actionBtnHtml = "";
      if (isUnlocked) {
        let claimHtml = "";
        if (!isClaimed) {
          claimHtml = `<button type="button" class="btn-claim-reward" data-ach-id="${escapeHtml(title.id)}">${escapeHtml(t("ach_claim_btn", { qi: cfg.rewardQi || 50 }))}</button>`;
        } else {
          claimHtml = `<span class="badge-claimed">${escapeHtml(t("ach_claimed_badge"))}</span>`;
        }

        let equipHtml = "";
        if (isEquipped) {
          equipHtml = `<button type="button" class="title-action-btn btn-equipped" data-title-id="${escapeHtml(title.id)}" data-action="unequip" title="${escapeHtml(t("ach_unequip_btn") || "Desequipar")}"><span class="equip-icon">✓</span> ${escapeHtml(t("cult_equipped_badge"))}</button>`;
        } else {
          equipHtml = `<button type="button" class="title-action-btn btn-equip" data-title-id="${escapeHtml(title.id)}" data-action="equip">${escapeHtml(t("cult_equip_btn"))}</button>`;
        }

        actionBtnHtml = `<div class="title-actions-cluster">${claimHtml} ${equipHtml}</div>`;
      } else {
        actionBtnHtml = `<span class="title-action-btn btn-locked">🔒 ${escapeHtml(t("cult_title_locked"))}</span>`;
      }

      let reqBadgeHtml = "";
      if (!isUnlocked && !levelSatisfied) {
        const themeRealms = (THEMES_CONFIG[title.themeId || currentThemeFilter] || THEMES_CONFIG.cultivation).realms;
        const reqRealmObj = themeRealms[title.minRealmIndex] || themeRealms[0];
        const reqRealmName = reqRealmObj ? t(`realm_${reqRealmObj.id}`) : "";
        const reqText = (reqRealmObj && !reqRealmObj.hasStages)
          ? t("cult_req_realm_only", { realm: reqRealmName })
          : t("cult_req_realm_stage", { realm: reqRealmName, stage: title.minStage || 1 });
        reqBadgeHtml = `<div class="title-req-stage-tag">${escapeHtml(reqText)}</div>`;
      }

      const progress = getAchievementProgress(title, stats, cultState);
      const progressHtml = `
        <div class="title-progress-container">
          <div class="title-progress-meta">
            <span>${escapeHtml(progress.text)}</span>
            <span class="title-progress-pct">${progress.pct}%</span>
          </div>
          <div class="title-progress-track">
            <div class="title-progress-fill rarity-${rarity}" style="width: ${progress.pct}%;"></div>
          </div>
        </div>
      `;

      return `
        <div class="title-item tier-${tier} rarity-${rarity} ${stateClass} ${equippedClass}" data-title-id="${escapeHtml(title.id)}" ${isUnlocked ? `tabindex="0" role="button" aria-label="${escapeHtml(t(`title_${title.id}_name`))}"` : ""}>
          <div class="title-emblem">
            ${renderBadge(title, { size: "md" })}
          </div>
          <div class="title-info">
            <div class="title-header-row">
              <span class="title-name">${escapeHtml(t(`title_${title.id}_name`))}</span>
              ${diffTagHtml}
              <span class="title-rarity-tag rarity-tag-${rarity}">${escapeHtml(t(`ach_rarity_${rarity}`))}</span>
              <span class="title-tier-tag tier-tag-${tier}">${escapeHtml(t(`cult_tier_${tier}`))}</span>
            </div>
            <span class="title-desc">${escapeHtml(t(`title_${title.id}_desc`))}</span>
            ${reqBadgeHtml}
            ${progressHtml}
          </div>
          ${actionBtnHtml}
        </div>
      `;
    }).join("");
  }

  updateAvatarMiniSlots(stats);
}

function updateAvatarMiniSlots(stats, forceIsLoggedIn) {
  const miniSlots = document.getElementById("avatarMiniSlots");
  const avatarPortrait = document.getElementById("userAvatarPortrait");
  const profileBtn = document.getElementById("btnUserProfile");
  if (!miniSlots || !avatarPortrait) return;

  const authEmail = document.getElementById("userEmailDisplay")?.textContent || "";
  const isLoggedIn = typeof forceIsLoggedIn === "boolean" ? forceIsLoggedIn : Boolean(authEmail && authEmail.includes("@"));

  if (profileBtn) {
    if (isLoggedIn) profileBtn.classList.add("logged-in");
    else profileBtn.classList.remove("logged-in");
  }

  if (!isLoggedIn) {
    avatarPortrait.textContent = "👤";
    miniSlots.innerHTML = "";
    return;
  }

  avatarPortrait.textContent = "🧙‍♂️";
  const equipped = Array.isArray(stats?.equippedItems) ? stats.equippedItems : [];
  let html = "";
  for (let i = 0; i < Math.min(equipped.length, 3); i++) {
    const item = (typeof ITEMS_CONFIG !== "undefined" && ITEMS_CONFIG[equipped[i]]) || null;
    if (!item) continue;
    const itemName = typeof t === "function" ? t(item.nameKey) : item.id;
    const bonus = Math.round(((item.qiBonusMultiplier !== undefined ? item.qiBonusMultiplier : (item.qiMultiplier ? item.qiMultiplier - 1 : 0))) * 100);
    html += `
      <div class="avatar-mini-dot slot-${i} rarity-${escapeHtml(item.rarity)}" title="${escapeHtml(itemName)} (+${bonus}% Qi)">
        ${escapeHtml(item.icon)}
      </div>
    `;
  }
  miniSlots.innerHTML = html;
}

async function renderInventoryUI() {
  const { stats: rawStats } = await chrome.storage.local.get(["stats"]);
  const stats = { ...(typeof getDefaultStats === "function" ? getDefaultStats() : {}), ...(rawStats || {}) };
  if (typeof syncUserInventory === "function") {
    syncUserInventory(stats);
  }

  const equippedIds = Array.isArray(stats.equippedItems) ? stats.equippedItems : [];
  const inventoryIds = Array.isArray(stats.inventory) ? stats.inventory : [];
  const breakdown = typeof calculateQiBreakdown === "function" ? calculateQiBreakdown(stats) : {
    baseReadingQi: (Number(stats.chaptersRead) || 0) + (Number(stats.novelsCompleted) || 0) * 50,
    multiplier: 1.0,
    bonusQi: Number(stats.bonusQi) || 0,
    totalQi: 0
  };

  // 1. Render Equipped Slots (3 slots)
  const slotsContainer = document.getElementById("equippedSlotsContainer");
  if (slotsContainer) {
    let slotsHtml = "";
    for (let i = 0; i < 3; i++) {
      const itemId = equippedIds[i];
      if (itemId && typeof ITEMS_CONFIG !== "undefined" && ITEMS_CONFIG[itemId]) {
        const item = ITEMS_CONFIG[itemId];
        const pctBonus = Math.round(((item.qiBonusMultiplier !== undefined ? item.qiBonusMultiplier : (item.qiMultiplier ? item.qiMultiplier - 1 : 0))) * 100);
        slotsHtml += `
          <div class="equipped-slot-card slot-filled rarity-${escapeHtml(item.rarity)}">
            <div class="slot-item-icon">${escapeHtml(item.icon)}</div>
            <div class="slot-item-name" title="${escapeHtml(t(item.nameKey))}">${escapeHtml(t(item.nameKey))}</div>
            <div class="slot-item-bonus">+${pctBonus}% Qi</div>
            <button type="button" class="btn-slot-unequip" data-item-id="${escapeHtml(item.id)}" data-i18n="inventory_btn_unequip">${escapeHtml(t("inventory_btn_unequip") || "Desequipar")}</button>
          </div>
        `;
      } else {
        slotsHtml += `
          <div class="equipped-slot-card slot-empty">
            <span style="font-size:18px; opacity:0.35;">+</span>
            <span style="font-size:9px; color:#64748b; margin-top:2px;">Ranura ${i + 1}</span>
          </div>
        `;
      }
    }
    slotsContainer.innerHTML = slotsHtml;

    slotsContainer.querySelectorAll(".btn-slot-unequip").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const itemId = e.currentTarget.getAttribute("data-item-id");
        if (!itemId) return;
        btn.disabled = true;
        try {
          const res = await chrome.runtime.sendMessage({ type: "UNEQUIP_ITEM", itemId });
          if (res && res.ok) {
            await renderInventoryUI();
            await renderCultivationUI();
            await checkAuthState();
          }
        } catch (err) {
          console.error("Error unequipping item:", err);
        }
      });
    });
  }

  // 2. Render Qi Breakdown Formula
  const elBase = document.getElementById("formulaBaseQi");
  const elMult = document.getElementById("formulaMultiplier");
  const elBonus = document.getElementById("formulaBonusQi");
  const elTotal = document.getElementById("formulaTotalQi");
  const elMultPill = document.getElementById("totalQiMultiplierPill");

  if (elBase) elBase.textContent = String(breakdown.baseReadingQi || 0);
  if (elMult) elMult.textContent = `${(breakdown.multiplier || 1.0).toFixed(2)}x`;
  if (elBonus) elBonus.textContent = `+${breakdown.bonusQi || 0}`;
  if (elTotal) elTotal.textContent = String(breakdown.finalQi ?? breakdown.totalQi ?? 0);
  if (elMultPill) {
    const totalBonusPct = Math.round(((breakdown.multiplier || 1.0) - 1) * 100);
    elMultPill.textContent = totalBonusPct > 0 ? `+${totalBonusPct}% Qi (${breakdown.multiplier.toFixed(2)}x)` : "1.00x";
  }

  // 3. Render Available Inventory List
  const itemsContainer = document.getElementById("inventoryItemsList");
  if (itemsContainer) {
    if (inventoryIds.length === 0) {
      itemsContainer.innerHTML = `
        <div class="inventory-empty-state">
          <div style="font-size:24px; margin-bottom:6px;">🔮</div>
          <p data-i18n="inventory_no_items">${escapeHtml(t("inventory_no_items") || "Tu inventario está vacío. Desbloquea títulos en Cultivo para obtener artefactos.")}</p>
        </div>
      `;
    } else {
      const isSlotsFull = equippedIds.length >= 3;
      itemsContainer.innerHTML = inventoryIds.map((itemId) => {
        const item = typeof ITEMS_CONFIG !== "undefined" && ITEMS_CONFIG[itemId];
        if (!item) return "";
        const isEquipped = equippedIds.includes(itemId);
        const pctBonus = Math.round(((item.qiBonusMultiplier !== undefined ? item.qiBonusMultiplier : (item.qiMultiplier ? item.qiMultiplier - 1 : 0))) * 100);

        let actionHtml = "";
        if (isEquipped) {
          actionHtml = `<span class="item-equipped-badge" data-i18n="inventory_equipped_badge">✓ ${escapeHtml(t("inventory_equipped_badge") || "Equipado")}</span>`;
        } else {
          actionHtml = `<button type="button" class="btn-equip-item" data-item-id="${escapeHtml(item.id)}" ${isSlotsFull ? "disabled title='Máximo 3 ranuras equipadas'" : ""} data-i18n="inventory_btn_equip">${escapeHtml(t("inventory_btn_equip") || "Equipar")}</button>`;
        }

        return `
          <div class="inventory-item-card rarity-${escapeHtml(item.rarity)}" data-item-id="${escapeHtml(item.id)}">
            <div class="item-card-left">
              <div class="item-card-icon">${escapeHtml(item.icon)}</div>
              <div class="item-card-details">
                <div class="item-card-title-row">
                  <span class="item-card-name">${escapeHtml(t(item.nameKey))}</span>
                  <span class="title-rarity-tag rarity-tag-${escapeHtml(item.rarity)}">${escapeHtml(t(`ach_rarity_${item.rarity}`))}</span>
                </div>
                <span class="item-card-desc">${escapeHtml(t(item.descKey))}</span>
                <span class="item-card-bonus-tag">+${pctBonus}% Qi</span>
              </div>
            </div>
            <div>${actionHtml}</div>
          </div>
        `;
      }).join("");

      itemsContainer.querySelectorAll(".btn-equip-item").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const itemId = e.currentTarget.getAttribute("data-item-id");
          if (!itemId) return;
          btn.disabled = true;
          try {
            const res = await chrome.runtime.sendMessage({ type: "EQUIP_ITEM", itemId });
            if (res && res.ok) {
              await renderInventoryUI();
              await renderCultivationUI();
              await checkAuthState();
            }
          } catch (err) {
            console.error("Error equipping item:", err);
          }
        });
      });
    }
  }

  updateAvatarMiniSlots(stats);
}

function initCultivationEvents() {
  document.getElementById("btnUnequipTitle")?.addEventListener("click", async () => {
    await equipTitleById("");
  });

  document.getElementById("btnClaimAllRewards")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnClaimAllRewards");
    if (btn) btn.disabled = true;
    try {
      const res = await chrome.runtime.sendMessage({ type: "CLAIM_ALL_ACHIEVEMENTS" });
      if (res && res.ok) {
        await renderCultivationUI();
      }
    } catch (err) {
      console.error("Error claiming all achievements:", err);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById("btnClaimCelebrationReward")?.addEventListener("click", async (e) => {
    const achId = e.currentTarget.getAttribute("data-ach-id");
    if (!achId) return;
    try {
      const res = await chrome.runtime.sendMessage({
        type: "CLAIM_ACHIEVEMENT_REWARD",
        achievementId: achId
      });
      if (res && res.ok) {
        e.currentTarget.textContent = t("ach_modal_claimed");
        e.currentTarget.disabled = true;
        setTimeout(() => {
          closeCelebrationModal();
          e.currentTarget.disabled = false;
        }, 600);
        await renderCultivationUI();
      }
    } catch (err) {
      console.error("Error claiming celebration reward:", err);
    }
  });

  document.getElementById("btnCloseCelebrationModal")?.addEventListener("click", () => {
    closeCelebrationModal();
  });

  document.getElementById("achievementCelebrationModal")?.addEventListener("click", (e) => {
    if (e.target.id === "achievementCelebrationModal") {
      closeCelebrationModal();
    }
  });

  const handleTitleActivation = async (card, e) => {
    if (!card) return;
    const titleId = card.getAttribute("data-title-id");
    if (!titleId) return;

    const claimBtn = e?.target?.closest(".btn-claim-reward");
    if (claimBtn) {
      e?.stopPropagation();
      const achId = claimBtn.getAttribute("data-ach-id") || titleId;
      claimBtn.disabled = true;
      try {
        const res = await chrome.runtime.sendMessage({
          type: "CLAIM_ACHIEVEMENT_REWARD",
          achievementId: achId
        });
        if (res && res.ok) {
          openCelebrationModal(achId);
          await renderCultivationUI();
        }
      } catch (err) {
        console.error("Error claiming reward:", err);
      } finally {
        claimBtn.disabled = false;
      }
      return;
    }

    const equippedBtn = e?.target?.closest(".btn-equipped");
    if (equippedBtn) {
      e?.stopPropagation();
      await equipTitleById("");
      return;
    }

    const equipBtn = e?.target?.closest(".btn-equip");
    if (equipBtn) {
      e?.stopPropagation();
      await equipTitleById(titleId);
      return;
    }

    const { stats } = await chrome.storage.local.get(["stats"]);
    if (stats?.equippedTitle === titleId) {
      await equipTitleById("");
    } else {
      await equipTitleById(titleId);
    }
  };

  document.getElementById("titlesList")?.addEventListener("click", async (e) => {
    const card = e.target.closest(".title-item.unlocked");
    await handleTitleActivation(card, e);
  });

  document.getElementById("titlesList")?.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const card = e.target.closest(".title-item.unlocked");
      if (card) {
        e.preventDefault();
        await handleTitleActivation(card, e);
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

  const handleBadgeImgError = (e) => {
    const target = e.target;
    if (target && target.tagName === "IMG" && target.dataset.fallback) {
      if (!target.dataset.hasFailed && target.getAttribute("src") !== target.dataset.fallback) {
        target.dataset.hasFailed = "true";
        target.src = target.dataset.fallback;
      }
    }
  };
  window.addEventListener("error", handleBadgeImgError, true);
  document.addEventListener("error", handleBadgeImgError, true);

  const closeBtModal = () => {
    const modal = document.getElementById("breakthroughConfirmModal");
    if (modal) modal.style.display = "none";
  };

  document.getElementById("btnCancelBreakthroughAction")?.addEventListener("click", closeBtModal);
  document.getElementById("btnCloseBreakthroughModal")?.addEventListener("click", closeBtModal);
  document.getElementById("breakthroughConfirmModal")?.addEventListener("click", (e) => {
    if (e.target.id === "breakthroughConfirmModal") closeBtModal();
  });

  document.getElementById("btnBreakthrough")?.addEventListener("click", async () => {
    const { stats: rawStats } = await chrome.storage.local.get(["stats"]);
    const stats = rawStats || {};
    const cultState = getCultivationState(stats, currentThemeFilter);
    if (!cultState || !cultState.isBottleneckReady || cultState.isPeakRealm) return;

    const modal = document.getElementById("breakthroughConfirmModal");
    if (!modal) return;

    const modalIconEl = document.getElementById("btModalIcon");
    const modalTitleEl = document.getElementById("btModalTitle");
    const targetEl = document.getElementById("btModalTargetText");
    const surplusEl = document.getElementById("btModalSurplusText");
    const confirmBtn = document.getElementById("btnConfirmBreakthroughAction");

    const currentRealmName = t(`realm_${cultState.realmId}`) || cultState.realmName || "";

    if (cultState.isMajorBottleneck && cultState.nextRealmId) {
      const nextRealmName = t(`realm_${cultState.nextRealmId}`) || cultState.nextRealmId;
      if (modalIconEl) modalIconEl.textContent = "🌌";
      if (modalTitleEl) modalTitleEl.textContent = t("bt_modal_title_realm");
      if (targetEl) {
        targetEl.textContent = `${currentRealmName} (Cúspide 9/9) ➔ ${nextRealmName} (Estadio 1/9)`;
      }
      if (confirmBtn) {
        confirmBtn.textContent = t("bt_modal_btn_realm", { nextRealm: nextRealmName });
      }
    } else {
      const realmSpan = cultState.realmObj ? (cultState.realmObj.nextQi - cultState.realmObj.minQi) : 100;
      const progressInRealm = Math.max(0, cultState.totalQi - (cultState.realmObj?.minQi || 0));
      const earnedStage = Math.min(9, Math.floor((progressInRealm * 9) / realmSpan) + 1);
      const nextStage = Math.min(9, Math.max((cultState.stage || 1) + 1, earnedStage));

      if (modalIconEl) modalIconEl.textContent = "⚡";
      if (modalTitleEl) modalTitleEl.textContent = t("bt_modal_title_stage");
      if (targetEl) {
        targetEl.textContent = `${currentRealmName} • ${t("header_stage", { stage: nextStage })}`;
      }
      if (confirmBtn) {
        confirmBtn.textContent = t("bt_modal_btn_stage");
      }
    }

    if (surplusEl) {
      if (cultState.overflowQi > 0) {
        surplusEl.textContent = t("bt_modal_surplus", { qi: cultState.overflowQi });
        surplusEl.style.display = "block";
      } else {
        surplusEl.textContent = "";
        surplusEl.style.display = "none";
      }
    }

    modal.style.display = "flex";
    confirmBtn?.focus();
  });

  document.getElementById("btnConfirmBreakthroughAction")?.addEventListener("click", async () => {
    const confirmBtn = document.getElementById("btnConfirmBreakthroughAction");
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = t("bt_ascending") || "Ascendiendo...";
    }

    try {
      const res = await chrome.runtime.sendMessage({
        type: "PERFORM_BREAKTHROUGH",
        themeId: currentThemeFilter
      });
      if (res && res.ok) {
        closeBtModal();
        const header = document.querySelector(".header");
        if (header) {
          header.classList.remove("ascension-burst");
          void header.offsetWidth;
          header.classList.add("ascension-burst");
          setTimeout(() => {
            header.classList.remove("ascension-burst");
          }, 950);
        }
        if (res.isMajor && res.realmObj) {
          const newRealmName = t(`realm_${res.realmObj.id}`) || res.realmObj.name || "";
          showToast(t("bt_success_realm_toast", { realm: newRealmName }), "success", 4000);
        } else {
          showToast(t("bt_success_stage_toast", { stage: res.newStage }), "success", 3000);
        }
        await renderCultivationUI();
      } else {
        closeBtModal();
        const errorMsg = res && res.reason === "already_max_level"
          ? (t("bt_already_max") || "¡Has alcanzado la cima suprema de cultivo!")
          : (t("bt_error_toast") || "Error al ascender");
        showToast(errorMsg, "error", 3500);
      }
    } catch (err) {
      console.error("Error al romper cuello de botella:", err);
      closeBtModal();
      showToast(t("bt_error_toast") || "Error al ascender", "error", 3500);
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = t("bt_modal_btn_confirm") || "¡Ascender ahora!";
      }
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
  try {
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
  } catch {}
  try {
    chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
  } catch {}
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
      const domainChip = document.getElementById("unconfirmedDomain");
      if (domainChip) {
        domainChip.textContent = extractDomain(data.url || tab.url);
      }
      banner.classList.add("visible");
    } else if (banner) {
      banner.classList.remove("visible");
    }
  } catch {}
}

function initLibraryEvents() {
  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    renderNovels();
  });

  const filterChips = Array.from(document.querySelectorAll(".filter-chip"));
  filterChips.forEach((chip, index) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentStatusFilter = chip.getAttribute("data-status") || "all";
      renderNovels();
    });

    chip.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (index + 1) % filterChips.length;
        filterChips[nextIndex].focus();
        filterChips[nextIndex].click();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = (index - 1 + filterChips.length) % filterChips.length;
        filterChips[prevIndex].focus();
        filterChips[prevIndex].click();
      }
    });
  });

  document.getElementById("btnDismissUnconfirmed")?.addEventListener("click", async () => {
    const banner = document.getElementById("unconfirmedBanner");
    if (banner) banner.classList.remove("visible");
    if (activeUnconfirmedTabId) {
      try {
        await chrome.runtime.sendMessage({
          type: "DISCARD_UNCONFIRMED_TAB",
          tabId: activeUnconfirmedTabId
        });
      } catch {}
      try {
        await chrome.storage.local.remove([`tab_${activeUnconfirmedTabId}`]);
      } catch {}
    }
  });

  document.getElementById("btnBlacklistUnconfirmed")?.addEventListener("click", async () => {
    const banner = document.getElementById("unconfirmedBanner");
    const targetDomain = extractDomain(activeUnconfirmedData?.url || "");
    if (!targetDomain || targetDomain === t("domain_manual")) return;

    if (banner) banner.classList.remove("visible");

    try {
      await chrome.runtime.sendMessage({
        type: "ADD_DOMAIN_BLACKLIST",
        domain: targetDomain
      });
    } catch {}

    const tabIdToClear = activeUnconfirmedTabId;
    if (tabIdToClear) {
      try {
        await chrome.runtime.sendMessage({
          type: "DISCARD_UNCONFIRMED_TAB",
          tabId: tabIdToClear
        });
      } catch {}
      try {
        await chrome.storage.local.remove([`tab_${tabIdToClear}`]);
      } catch {}
    }

    showToast(t("blacklist_added_toast", { domain: targetDomain }), "warning", 5000, {
      label: t("toast_undo"),
      onClick: async () => {
        try {
          await chrome.runtime.sendMessage({
            type: "REMOVE_DOMAIN_BLACKLIST",
            domain: targetDomain
          });
        } catch {}
        showToast(t("blacklist_removed_toast", { domain: targetDomain }), "info", 2000);
        await checkUnconfirmedTab();
      }
    });
  });

  document.getElementById("btnSaveUnconfirmed")?.addEventListener("click", async () => {
    const nameInput = document.getElementById("unconfirmedName");
    const rawName = nameInput.value.trim().slice(0, 300);
    const novelName = (cleanTabTitleForInput(rawName) || rawName).slice(0, 300);
    const chapter = (document.getElementById("unconfirmedChap").value.trim() || "1").slice(0, 50);
    const errEl = document.getElementById("unconfirmedErrorMsg");

    if (!novelName || !activeUnconfirmedData || !isValidHttpUrl(activeUnconfirmedData.url)) {
      if (errEl) {
        errEl.textContent = t("form_name_required");
        errEl.style.display = "block";
      }
      nameInput.classList.add("input-error");
      nameInput.focus();
      return;
    }
    if (errEl) errEl.style.display = "none";
    nameInput.classList.remove("input-error");

    const seriesId =
      activeUnconfirmedData.novelUrl && activeUnconfirmedData.seriesId
        ? activeUnconfirmedData.seriesId
        : buildManualSeriesId(novelName, activeUnconfirmedData.url);

    const storage = await chrome.storage.local.get(["savedNovels"]);
    const savedNovels = storage.savedNovels || {};
    const existing = savedNovels[seriesId];
    const isNewNovel = !existing;

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
      chrome.action.setBadgeText({ text: "", tabId: activeUnconfirmedTabId }).catch(() => {});
      chrome.tabs.sendMessage(activeUnconfirmedTabId, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
    }

    await chrome.storage.local.set(updates);
    if (isNewNovel || (parseFloat(chapter) || 1) > (parseFloat(existing?.maxCounted) || 0)) {
      try {
        const chapNum = parseFloat(chapter) || 1;
        const prevMax = parseFloat(existing?.maxCounted) || 0;
        const chaptersDelta = isNewNovel ? chapNum : Math.max(0, chapNum - prevMax);
        await chrome.runtime.sendMessage({
          type: "RECORD_MANUAL_READ",
          chaptersDelta,
          isNewNovel
        });
      } catch {}
    }
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
    document.getElementById("unconfirmedBanner")?.classList.remove("visible");
    await renderNovels();
    await renderCultivationUI();
    showToast(t("prompt_novel_saved"), "success", 2500);
  });

  const handleUnconfirmedEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btnSaveUnconfirmed")?.click();
    }
  };
  document.getElementById("unconfirmedName")?.addEventListener("keydown", handleUnconfirmedEnter);
  document.getElementById("unconfirmedChap")?.addEventListener("keydown", handleUnconfirmedEnter);
  document.getElementById("unconfirmedName")?.addEventListener("input", () => {
    const errEl = document.getElementById("unconfirmedErrorMsg");
    if (errEl) errEl.style.display = "none";
    document.getElementById("unconfirmedName")?.classList.remove("input-error");
  });

  document.getElementById("btnToggleManual")?.addEventListener("click", async () => {
    const drawer = document.getElementById("manualDrawer");
    if (!drawer) return;
    document.getElementById("editingSeriesId").value = "";
    setManualStatus("");
    const errEl = document.getElementById("manualNameError");
    if (errEl) errEl.style.display = "none";
    document.getElementById("manualName")?.classList.remove("input-error");
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

  const manualChips = Array.from(document.querySelectorAll("#manualStatusChips .status-chip"));
  manualChips.forEach((chip, index) => {
    chip.addEventListener("click", () => {
      const status = chip.getAttribute("data-status") || "";
      setManualStatus(status);
    });

    chip.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (index + 1) % manualChips.length;
        manualChips[nextIndex].focus();
        manualChips[nextIndex].click();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = (index - 1 + manualChips.length) % manualChips.length;
        manualChips[prevIndex].focus();
        manualChips[prevIndex].click();
      }
    });
  });

  const handleManualEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btnConfirmManual")?.click();
    }
  };
  document.getElementById("manualName")?.addEventListener("keydown", handleManualEnter);
  document.getElementById("manualChapter")?.addEventListener("keydown", handleManualEnter);
  document.getElementById("manualName")?.addEventListener("input", () => {
    const errEl = document.getElementById("manualNameError");
    if (errEl) errEl.style.display = "none";
    document.getElementById("manualName")?.classList.remove("input-error");
  });

  document.getElementById("btnConfirmManual")?.addEventListener("click", async () => {
    const editingId = document.getElementById("editingSeriesId").value.trim();
    const nameInput = document.getElementById("manualName");
    const chapInput = document.getElementById("manualChapter");
    const statusSelect = document.getElementById("manualStatus");
    const errEl = document.getElementById("manualNameError");
    const novelName = nameInput.value.trim().slice(0, 300);
    const chapter = (chapInput.value.trim() || "1").slice(0, 50);
    const statusManual = statusSelect.value;

    if (!novelName) {
      if (errEl) {
        errEl.textContent = t("form_name_required");
        errEl.style.display = "block";
      }
      nameInput.classList.add("input-error");
      nameInput.focus();
      return;
    }
    if (errEl) errEl.style.display = "none";
    nameInput.classList.remove("input-error");

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
    let currentUrl = "https://mynovelsystem.local";
    let tabId = null;

    if (!targetId) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && isValidHttpUrl(tab.url)) currentUrl = tab.url;
        if (tab && tab.id) tabId = tab.id;
      } catch {}
      targetId = buildManualSeriesId(novelName, currentUrl);
    }

    const existing = savedNovels[targetId];
    const isNew = !existing;
    let completedCounted = Boolean(existing?.completedCounted);
    let completedDelta = 0;

    if (statusManual === "completed" && !completedCounted) {
      completedCounted = true;
      completedDelta = 1;
      stats.novelsCompleted = (Number(stats.novelsCompleted) || 0) + 1;
      evaluateUnlockedTitles(stats, currentThemeFilter);
      stats.updatedAt = Date.now();
    }

    const chapNum = parseFloat(chapter) || 1;
    const prevMax = existing ? parseFloat(existing.maxCounted ?? existing.chapter) || 0 : 0;
    const chapDelta = isNew ? chapNum : Math.max(0, chapNum - prevMax);

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
      chrome.action.setBadgeText({ text: "", tabId }).catch(() => {});
      chrome.tabs.sendMessage(tabId, { type: "DISMISS_UNCONFIRMED_PROMPT" }).catch(() => {});
    }

    await chrome.storage.local.set({ savedNovels, stats });
    if (chapDelta > 0 || isNew || completedDelta > 0) {
      try {
        await chrome.runtime.sendMessage({
          type: "RECORD_MANUAL_READ",
          chaptersDelta: chapDelta,
          isNewNovel: isNew,
          completedDelta
        });
      } catch {}
    }
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });

    document.getElementById("editingSeriesId").value = "";
    nameInput.value = "";
    chapInput.value = "";
    setManualStatus("");
    document.getElementById("manualDrawer")?.classList.remove("open");
    await renderCultivationUI();
    await renderNovels();
    showToast(t("prompt_novel_saved"), "success", 2500);
  });

  document.getElementById("novelList")?.addEventListener("click", async (e) => {
    const resumeBtn = e.target.closest(".btn-resume");
    if (resumeBtn) {
      const url = resumeBtn.getAttribute("data-url");
      if (url && isValidHttpUrl(url)) chrome.tabs.create({ url });
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
        try {
          await chrome.runtime.sendMessage({
            type: "RECORD_MANUAL_READ",
            chaptersDelta: 1,
            isNewNovel: false,
            completedDelta: 0
          });
        } catch {}
        chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
        await renderNovels();
        await renderCultivationUI();
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
      setManualStatus(item.statusManual || "");
      const errEl = document.getElementById("manualNameError");
      if (errEl) errEl.style.display = "none";
      document.getElementById("manualName")?.classList.remove("input-error");
      drawer?.classList.add("open");
      document.getElementById("manualName")?.focus();
      return;
    }

    const deleteBtn = e.target.closest(".btn-delete");
    if (deleteBtn) {
      const key = deleteBtn.getAttribute("data-key");
      const storage = await chrome.storage.local.get(["savedNovels"]);
      const savedNovels = storage.savedNovels || {};
      const backupNovel = savedNovels[key] ? { ...savedNovels[key] } : null;
      if (backupNovel && !backupNovel.deleted) {
        savedNovels[key] = {
          ...backupNovel,
          deleted: true,
          updatedAt: Date.now()
        };
        await chrome.storage.local.set({ savedNovels });
        chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
        await renderNovels();

        const novelName = backupNovel.customName || backupNovel.novelName || t("domain_manual");
        showToast(t("novel_deleted_toast", { name: novelName }), "info", 5000, {
          label: t("toast_undo"),
          onClick: async () => {
            const s = await chrome.storage.local.get(["savedNovels"]);
            const currentNovels = s.savedNovels || {};
            currentNovels[key] = backupNovel;
            await chrome.storage.local.set({ savedNovels: currentNovels });
            chrome.runtime.sendMessage({ type: "FORCE_CLOUD_SYNC" });
            await renderNovels();
            showToast(t("novel_restored_toast"), "success", 2000);
          }
        });
      }
      return;
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
        ${currentSearch || currentStatusFilter !== "all" ? escapeHtml(t("empty_search")) : escapeHtml(t("empty_library"))}
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
  const updateWhatsappToggleIndicator = (enabled) => {
    const ind = document.getElementById("waToggleIndicator");
    if (ind) {
      ind.textContent = enabled ? (t("status_on") || "ON") : (t("status_off") || "OFF");
      ind.style.color = enabled ? "#4ade80" : "var(--text-secondary)";
    }
  };

  document.getElementById("enableWhatsapp")?.addEventListener("change", async (e) => {
    const isEnabled = Boolean(e.target.checked);
    updateWhatsappToggleIndicator(isEnabled);
    const storage = await chrome.storage.local.get(["settings"]);
    const settings = { ...(storage.settings || {}), enableWhatsapp: isEnabled };
    await chrome.storage.local.set({ settings });
    showToast(isEnabled ? t("wa_enabled_toast") : t("wa_disabled_toast"), "info", 2000);
  });

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

  const handleWaEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btnSaveSettings")?.click();
    }
  };
  document.getElementById("apiKey")?.addEventListener("keydown", handleWaEnter);
  document.getElementById("phone")?.addEventListener("keydown", handleWaEnter);
  document.getElementById("waitMinutes")?.addEventListener("keydown", handleWaEnter);
}

function initSettingsAndBackupEvents() {
  const updateLanguageSegmentedControl = (lang) => {
    document.querySelectorAll("#languageSegmentedControl .lang-segment-btn").forEach((b) => {
      const isCurrent = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", isCurrent);
      if (isCurrent) {
        b.style.background = "rgba(99, 102, 241, 0.4)";
        b.style.color = "#ffffff";
      } else {
        b.style.background = "transparent";
        b.style.color = "var(--text-secondary)";
      }
    });
  };

  const langSegmentBtns = Array.from(document.querySelectorAll("#languageSegmentedControl .lang-segment-btn"));
  langSegmentBtns.forEach((btn, index) => {
    btn.addEventListener("click", async () => {
      const lang = btn.getAttribute("data-lang");
      if (!lang) return;
      document.getElementById("languageSelect").value = lang;
      updateLanguageSegmentedControl(lang);

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
      await renderBlacklistUI();
      showToast(t("lang_changed_toast"), "success", 2000);
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const nextIndex = (index + 1) % langSegmentBtns.length;
        langSegmentBtns[nextIndex].focus();
        langSegmentBtns[nextIndex].click();
      }
    });
  });

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
    await renderBlacklistUI();
  });

  document.getElementById("enablePerfMode")?.addEventListener("change", async (e) => {
    const isPerf = Boolean(e.target.checked);
    document.body.classList.toggle("perf-mode", isPerf);
    const storage = await chrome.storage.local.get(["settings"]);
    const settings = { ...(storage.settings || {}), perfMode: isPerf };
    await chrome.storage.local.set({ settings });
  });

  document.getElementById("showTierOnIcon")?.addEventListener("change", async (e) => {
    const showTier = Boolean(e.target.checked);
    const storage = await chrome.storage.local.get(["settings"]);
    const settings = { ...(storage.settings || {}), showTierOnIcon: showTier };
    await chrome.storage.local.set({ settings });
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
  });

  document.getElementById("linkPrivacyPolicy")?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("privacy.html") });
  });

  document.getElementById("btnSavePrefs")?.addEventListener("click", async () => {
    const lang = document.getElementById("languageSelect").value;
    const pauseDays = Math.max(1, parseInt(document.getElementById("pauseDaysInput").value, 10) || 30);
    const dropDays = Math.max(pauseDays + 1, parseInt(document.getElementById("dropDaysInput").value, 10) || 90);
    const isPerf = document.getElementById("enablePerfMode")?.checked;
    const showTier = Boolean(document.getElementById("showTierOnIcon")?.checked);

    const storage = await chrome.storage.local.get(["settings"]);
    const settings = {
      ...(storage.settings || {}),
      language: lang,
      pauseDays,
      dropDays,
      perfMode: Boolean(isPerf),
      showTierOnIcon: Boolean(showTier)
    };

    await chrome.storage.local.set({ settings });
    setCurrentLang(lang);
    applyI18nToDom();
    chrome.runtime.sendMessage({ type: "REFRESH_ICON" });
    await checkAuthState();
    await renderCultivationUI();
    await renderNovels();
    await renderDiagnosticLogs();
    await renderBlacklistUI();

    const msg = document.getElementById("prefsMsg");
    msg.textContent = t("settings_prefs_saved");
    setTimeout(() => { msg.textContent = ""; }, 2000);
  });

  const handlePrefsEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btnSavePrefs")?.click();
    }
  };
  document.getElementById("pauseDaysInput")?.addEventListener("keydown", handlePrefsEnter);
  document.getElementById("dropDaysInput")?.addEventListener("keydown", handlePrefsEnter);

  // Blacklist Events
  document.getElementById("btnQuickBlockCurrentSite")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnQuickBlockCurrentSite");
    const host = btn?.getAttribute("data-host");
    if (!host) return;

    try {
      await chrome.runtime.sendMessage({
        type: "ADD_DOMAIN_BLACKLIST",
        domain: host
      });
      await renderBlacklistUI();
      showToast(t("blacklist_added_toast", { domain: host }), "warning", 5000, {
        label: t("toast_undo"),
        onClick: async () => {
          await chrome.runtime.sendMessage({
            type: "REMOVE_DOMAIN_BLACKLIST",
            domain: host
          });
          await renderBlacklistUI();
          showToast(t("blacklist_removed_toast", { domain: host }), "info", 2000);
        }
      });
    } catch (err) {
      console.error("Error quick blocking domain:", err);
    }
  });

  const handleAddDomain = async () => {
    const input = document.getElementById("blacklistDomainInput");
    const errEl = document.getElementById("blacklistInputError");
    if (!input) return;

    const raw = input.value.trim();
    const normalized = normalizeDomain(raw);

    if (!normalized || !normalized.includes(".") || /\s/.test(normalized)) {
      if (errEl) {
        errEl.textContent = t("blacklist_invalid_err");
        errEl.style.display = "block";
      }
      input.classList.add("input-error");
      input.focus();
      return;
    }

    const storage = await chrome.storage.local.get(["domainBlacklist"]);
    const currentList = Array.isArray(storage.domainBlacklist) ? storage.domainBlacklist : [];
    const exists = currentList.some((item) => {
      const d = typeof item === "string" ? item : item?.domain;
      return normalizeDomain(d) === normalized;
    });
    if (exists) {
      if (errEl) {
        errEl.textContent = t("blacklist_exists_err");
        errEl.style.display = "block";
      }
      input.classList.add("input-error");
      input.focus();
      return;
    }

    if (errEl) errEl.style.display = "none";
    input.classList.remove("input-error");

    try {
      await chrome.runtime.sendMessage({
        type: "ADD_DOMAIN_BLACKLIST",
        domain: normalized
      });
      input.value = "";
      await renderBlacklistUI();
      showToast(t("blacklist_added_toast", { domain: normalized }), "warning", 5000, {
        label: t("toast_undo"),
        onClick: async () => {
          await chrome.runtime.sendMessage({
            type: "REMOVE_DOMAIN_BLACKLIST",
            domain: normalized
          });
          await renderBlacklistUI();
          showToast(t("blacklist_removed_toast", { domain: normalized }), "info", 2000);
        }
      });
    } catch (err) {
      console.error("Error adding domain to blacklist:", err);
    }
  };

  document.getElementById("btnAddBlacklistDomain")?.addEventListener("click", handleAddDomain);
  document.getElementById("blacklistDomainInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  });
  document.getElementById("blacklistDomainInput")?.addEventListener("input", () => {
    const errEl = document.getElementById("blacklistInputError");
    if (errEl) errEl.style.display = "none";
    document.getElementById("blacklistDomainInput")?.classList.remove("input-error");
  });

  document.getElementById("blacklistSearchInput")?.addEventListener("input", (e) => {
    currentBlacklistSearch = e.target.value.toLowerCase().trim();
    renderBlacklistUI();
  });

  document.getElementById("blacklistedDomainsList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-remove-blacklist");
    if (!btn) return;
    const domain = btn.getAttribute("data-domain");
    const addedAtRaw = btn.getAttribute("data-added-at");
    const addedAt = addedAtRaw ? Number(addedAtRaw) : Date.now();
    if (!domain) return;

    try {
      await chrome.runtime.sendMessage({
        type: "REMOVE_DOMAIN_BLACKLIST",
        domain
      });
      await renderBlacklistUI();
      showToast(t("blacklist_removed_toast", { domain }), "info", 5000, {
        label: t("toast_undo"),
        onClick: async () => {
          await chrome.runtime.sendMessage({
            type: "ADD_DOMAIN_BLACKLIST",
            domain,
            addedAt
          });
          await renderBlacklistUI();
          showToast(t("blacklist_added_toast", { domain }), "warning", 2000);
        }
      });
    } catch (err) {
      console.error("Error removing domain from blacklist:", err);
    }
  });

  const closeClearBlModal = () => {
    const modal = document.getElementById("clearBlacklistConfirmModal");
    if (modal) modal.style.display = "none";
  };

  document.getElementById("btnClearBlacklist")?.addEventListener("click", () => {
    const modal = document.getElementById("clearBlacklistConfirmModal");
    if (modal) modal.style.display = "flex";
  });
  document.getElementById("btnCloseClearBlModal")?.addEventListener("click", closeClearBlModal);
  document.getElementById("btnCancelClearBl")?.addEventListener("click", closeClearBlModal);
  document.getElementById("clearBlacklistConfirmModal")?.addEventListener("click", (e) => {
    if (e.target.id === "clearBlacklistConfirmModal") closeClearBlModal();
  });

  document.getElementById("btnConfirmClearBl")?.addEventListener("click", async () => {
    try {
      await chrome.runtime.sendMessage({ type: "CLEAR_DOMAIN_BLACKLIST" });
      closeClearBlModal();
      await renderBlacklistUI();
      showToast(t("blacklist_cleared_toast"), "success", 2500);
    } catch (err) {
      console.error("Error clearing domain blacklist:", err);
    }
  });

  document.getElementById("btnExportJson")?.addEventListener("click", async () => {
    const { savedNovels, stats, settings, domainBlacklist } = await chrome.storage.local.get(["savedNovels", "stats", "settings", "domainBlacklist"]);
    const safeSettings = { ...(settings || {}) };
    delete safeSettings.phone;
    delete safeSettings.apiKey;

    const exportPayload = {
      version: "4.0.0",
      exportedAt: Date.now(),
      novels: savedNovels || {},
      stats: stats || {},
      settings: safeSettings,
      domainBlacklist: Array.isArray(domainBlacklist) ? domainBlacklist : []
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mynovelsystem-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          await renderBlacklistUI();
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
  // 1. Configuración de autenticación en pestaña de Ajustes
  document.getElementById("btnLogin")?.addEventListener("click", () => handleAuth("signInWithPassword"));
  document.getElementById("btnRegister")?.addEventListener("click", () => handleAuth("signUp"));

  const handleAuthEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAuth("signInWithPassword");
    }
  };
  document.getElementById("authEmail")?.addEventListener("keydown", handleAuthEnter);
  document.getElementById("authPass")?.addEventListener("keydown", handleAuthEnter);

  document.getElementById("authEmail")?.addEventListener("input", () => {
    document.getElementById("authEmail")?.classList.remove("input-error");
    const msg = document.getElementById("authMsg");
    if (msg) msg.textContent = "";
  });
  document.getElementById("authPass")?.addEventListener("input", () => {
    document.getElementById("authPass")?.classList.remove("input-error");
    const msg = document.getElementById("authMsg");
    if (msg) msg.textContent = "";
  });

  document.getElementById("btnSyncNow")?.addEventListener("click", () => {
    showAuthMsg(t("cloud_msg_syncing"), false);
    chrome.runtime.sendMessage({ type: "PULL_FROM_CLOUD" }, () => {
      showAuthMsg(t("cloud_msg_synced"), false);
      renderCultivationUI();
      renderNovels();
      renderInventoryUI();
    });
  });

  document.getElementById("btnLogout")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, async () => {
      await checkAuthState();
      await renderNovels();
      await renderCultivationUI();
      await renderBlacklistUI();
      await renderInventoryUI();
      showAuthMsg(t("cloud_msg_logged_out"), false);
    });
  });

  // 2. Modal de cuenta (Fase 3 y 6)
  const accountModal = document.getElementById("accountModal");
  const btnUserProfile = document.getElementById("btnUserProfile");
  const btnCloseAccountModal = document.getElementById("btnCloseAccountModal");

  const openAccountModal = async () => {
    if (accountModal) {
      accountModal.style.display = "flex";
      showModalStatusMsg("", false);
      await checkAuthState();
      const { auth, stats } = await chrome.storage.local.get(["auth", "stats"]);
      if (!auth || !auth.email) {
        switchModalView("login");
      }
      const largeAvatar = document.getElementById("accountLargeAvatar");
      if (largeAvatar) {
        const titleId = stats?.equippedTitle;
        const cfg = (titleId && typeof TITLE_CONFIG !== "undefined") ? TITLE_CONFIG[titleId] : null;
        largeAvatar.textContent = cfg?.symbol || (auth?.email ? "🧙‍♂️" : "👤");
      }
    }
  };

  const closeAccountModal = () => {
    if (accountModal) {
      accountModal.style.display = "none";
      showModalStatusMsg("", false);
    }
  };

  btnUserProfile?.addEventListener("click", openAccountModal);
  btnCloseAccountModal?.addEventListener("click", closeAccountModal);

  accountModal?.addEventListener("click", (e) => {
    if (e.target === accountModal) {
      closeAccountModal();
    }
  });

  const formLogin = document.getElementById("formAccountLogin");
  const formRegister = document.getElementById("formAccountRegister");
  const formForgot = document.getElementById("formAccountForgot");
  const modalTitle = document.getElementById("accountModalTitle");
  const modalSubtitle = document.getElementById("accountModalSubtitle");

  const switchModalView = (view) => {
    showModalStatusMsg("", false);
    if (!formLogin || !formRegister || !formForgot) return;
    if (view === "login") {
      formLogin.style.display = "flex";
      formRegister.style.display = "none";
      formForgot.style.display = "none";
      if (modalTitle) modalTitle.textContent = t("account_login_title") || "Acceso MyNovelSystem";
      if (modalSubtitle) modalSubtitle.textContent = t("account_guest_desc") || "Inicia sesión o regístrate para sincronizar tu progreso y artefactos.";
    } else if (view === "register") {
      formLogin.style.display = "none";
      formRegister.style.display = "flex";
      formForgot.style.display = "none";
      if (modalTitle) modalTitle.textContent = t("account_register_title") || "Crear Cuenta MyNovelSystem";
      if (modalSubtitle) modalSubtitle.textContent = t("account_guest_desc") || "Inicia sesión o regístrate para sincronizar tu progreso y artefactos.";
    } else if (view === "forgot") {
      formLogin.style.display = "none";
      formRegister.style.display = "none";
      formForgot.style.display = "flex";
      if (modalTitle) modalTitle.textContent = t("account_forgot_title") || "Recuperar Contraseña";
      if (modalSubtitle) modalSubtitle.textContent = "Te enviaremos un enlace de recuperación.";
    }
  };

  document.getElementById("linkToRegister")?.addEventListener("click", () => switchModalView("register"));
  document.getElementById("linkToForgot")?.addEventListener("click", () => switchModalView("forgot"));
  document.getElementById("linkToLoginFromReg")?.addEventListener("click", () => switchModalView("login"));
  document.getElementById("linkToLoginFromForgot")?.addEventListener("click", () => switchModalView("login"));

  // Submissions con validaciones cliente estrictas y prevención de llamadas duplicadas
  formLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("modalAuthEmail")?.value.trim() || "";
    const pass = document.getElementById("modalAuthPass")?.value.trim() || "";
    if (!email || !email.includes("@")) {
      showModalStatusMsg(t("cloud_msg_invalid") || "Introduce un correo válido", true);
      return;
    }
    if (!pass || pass.length < 6) {
      showModalStatusMsg(t("account_pass_length_err") || "La contraseña debe tener al menos 6 caracteres", true);
      return;
    }
    await executeFirebaseAuth(email, pass, "signInWithPassword", true);
  });

  formRegister?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("modalRegEmail")?.value.trim() || "";
    const pass = document.getElementById("modalRegPass")?.value.trim() || "";
    const confirmPass = document.getElementById("modalRegConfirmPass")?.value.trim() || "";

    if (!email || !email.includes("@")) {
      showModalStatusMsg(t("cloud_msg_invalid") || "Introduce un correo válido", true);
      return;
    }
    if (!pass || pass.length < 6) {
      showModalStatusMsg(t("account_pass_length_err") || "La contraseña debe tener al menos 6 caracteres", true);
      return;
    }
    if (pass !== confirmPass) {
      showModalStatusMsg(t("account_pass_mismatch_err") || "Las contraseñas no coinciden", true);
      return;
    }
    await executeFirebaseAuth(email, pass, "signUp", true);
  });

  formForgot?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("modalForgotEmail")?.value.trim() || "";
    if (!email || !email.includes("@")) {
      showModalStatusMsg(t("cloud_msg_invalid") || "Introduce un correo válido", true);
      return;
    }

    const forgotBtn = document.getElementById("btnModalSubmitForgot");
    const origText = forgotBtn ? forgotBtn.textContent : "";
    if (forgotBtn) {
      forgotBtn.disabled = true;
      forgotBtn.textContent = t("cloud_msg_connecting") || "Enviando...";
    }
    showModalStatusMsg(t("cloud_msg_connecting") || "Enviando...", false);

    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email })
      });
      const data = await res.json();
      if (data.error) {
        if (data.error.message && data.error.message.includes("EMAIL_NOT_FOUND")) {
          showModalStatusMsg(t("account_reset_sent_msg") || "Si la cuenta existe, se ha enviado un enlace de recuperación a tu correo.", false);
        } else {
          showModalStatusMsg(mapFirebaseAuthError(data.error.message), true);
        }
      } else {
        showModalStatusMsg(t("account_reset_sent_msg") || "Enlace enviado. Revisa tu bandeja de entrada.", false);
      }
    } catch {
      showModalStatusMsg(t("cloud_msg_net_err") || "Error de conexión", true);
    } finally {
      if (forgotBtn) {
        forgotBtn.disabled = false;
        forgotBtn.textContent = origText;
      }
    }
  });

  // Acciones con sesión iniciada en modal
  document.getElementById("btnAccountModalSync")?.addEventListener("click", () => {
    showModalStatusMsg(t("cloud_msg_syncing") || "Sincronizando...", false);
    chrome.runtime.sendMessage({ type: "PULL_FROM_CLOUD" }, () => {
      showModalStatusMsg(t("cloud_msg_synced") || "¡Sincronizado con éxito!", false);
      renderCultivationUI();
      renderNovels();
      renderInventoryUI();
    });
  });

  document.getElementById("btnAccountModalLogout")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, async () => {
      await checkAuthState();
      await renderNovels();
      await renderCultivationUI();
      await renderBlacklistUI();
      await renderInventoryUI();
      showModalStatusMsg(t("cloud_msg_logged_out") || "Sesión cerrada", false);
    });
  });
}

function showModalStatusMsg(text, isError) {
  const el = document.getElementById("accountModalStatusMsg");
  if (!el) return;
  el.textContent = text;
  el.className = isError ? "feedback-msg err" : "feedback-msg ok";
}

function mapFirebaseAuthError(rawMsg) {
  if (!rawMsg) return t("cloud_msg_net_err") || "Error de autenticación";
  const str = String(rawMsg);
  if (str.includes("EMAIL_EXISTS")) {
    return t("account_err_email_exists") || "Este correo ya está registrado. Inicia sesión.";
  }
  if (str.includes("INVALID_LOGIN_CREDENTIALS") || str.includes("INVALID_PASSWORD") || str.includes("EMAIL_NOT_FOUND")) {
    return t("account_err_bad_credentials") || "Credenciales incorrectas. Comprueba tu correo y contraseña.";
  }
  if (str.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
    return t("account_err_too_many") || "Demasiados intentos. Inténtalo más tarde.";
  }
  if (str.includes("WEAK_PASSWORD")) {
    return t("account_pass_length_err") || "La contraseña debe tener al menos 6 caracteres.";
  }
  if (str.includes("INVALID_EMAIL")) {
    return t("cloud_msg_invalid") || "Introduce un correo válido.";
  }
  return `Error: ${str}`;
}

async function executeFirebaseAuth(email, password, mode, isModal = false) {
  const showFn = isModal ? showModalStatusMsg : showAuthMsg;
  showFn(t("cloud_msg_connecting") || "Conectando...", false);

  const submitBtn = isModal
    ? (mode === "signUp" ? document.getElementById("btnModalSubmitRegister") : document.getElementById("btnModalSubmitLogin"))
    : (mode === "signUp" ? document.getElementById("btnRegister") : document.getElementById("btnLogin"));
  const origBtnText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = mode === "signUp" ? (t("account_btn_registering") || "Creando cuenta...") : (t("account_btn_logging_in") || "Iniciando sesión...");
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${mode}?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await res.json();
    if (data.error) {
      showFn(mapFirebaseAuthError(data.error.message), true);
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
    chrome.runtime.sendMessage({ type: "SWITCH_ACCOUNT", uid: data.localId }, () => {
      chrome.runtime.sendMessage({ type: "PULL_FROM_CLOUD" }, async () => {
        await checkAuthState();
        await renderNovels();
        await renderCultivationUI();
        await renderBlacklistUI();
        await renderInventoryUI();
        showFn(t("cloud_msg_connected") || "¡Conectado!", false);
      });
    });
  } catch {
    showFn(t("cloud_msg_net_err") || "Error de red", true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origBtnText;
    }
  }
}

async function handleAuth(mode) {
  const emailInput = document.getElementById("authEmail");
  const passInput = document.getElementById("authPass");
  const email = emailInput?.value.trim() || "";
  const password = passInput?.value.trim() || "";

  let hasError = false;
  if (!email || !email.includes("@")) {
    emailInput?.classList.add("input-error");
    hasError = true;
  }
  if (!password || password.length < 6) {
    passInput?.classList.add("input-error");
    hasError = true;
  }

  if (hasError) {
    showAuthMsg(t("cloud_msg_invalid"), true);
    if (!email) emailInput?.focus();
    else passInput?.focus();
    return;
  }

  await executeFirebaseAuth(email, password, mode, false);
}

async function checkAuthState() {
  const { auth, stats } = await chrome.storage.local.get(["auth", "stats"]);
  const loggedOutView = document.getElementById("loggedOutView");
  const loggedInView = document.getElementById("loggedInView");
  const badge = document.getElementById("syncBadge");
  const syncText = document.getElementById("syncText");

  const modalLoggedIn = document.getElementById("accountModalLoggedIn");
  const modalLoggedOut = document.getElementById("accountModalLoggedOut");
  const modalEmail = document.getElementById("accountModalUserEmail");

  const isLoggedIn = Boolean(auth && auth.email);

  if (loggedOutView) loggedOutView.style.display = isLoggedIn ? "none" : "flex";
  if (loggedInView) loggedInView.style.display = isLoggedIn ? "flex" : "none";
  if (modalLoggedIn) modalLoggedIn.style.display = isLoggedIn ? "flex" : "none";
  if (modalLoggedOut) modalLoggedOut.style.display = isLoggedIn ? "none" : "flex";

  if (isLoggedIn) {
    const userEmail = document.getElementById("userEmailDisplay");
    if (userEmail) userEmail.textContent = auth.email;
    if (modalEmail) modalEmail.textContent = auth.email;
    if (syncText) syncText.textContent = t("sync_online");
    if (badge) badge.className = "sync-pill online";
  } else {
    const userEmail = document.getElementById("userEmailDisplay");
    if (userEmail) userEmail.textContent = "";
    if (modalEmail) modalEmail.textContent = "";
    if (syncText) syncText.textContent = t("sync_local");
    if (badge) badge.className = "sync-pill";
  }

  updateAvatarMiniSlots(stats, isLoggedIn);
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

  const isWa = Boolean(settings.enableWhatsapp);
  document.getElementById("enableWhatsapp").checked = isWa;
  const waInd = document.getElementById("waToggleIndicator");
  if (waInd) {
    waInd.textContent = isWa ? (t("status_on") || "ON") : (t("status_off") || "OFF");
    waInd.style.color = isWa ? "#4ade80" : "var(--text-secondary)";
  }
  document.getElementById("waitMinutes").value = settings.waitMinutes || 1;
  document.getElementById("phone").value = settings.phone || "";
  document.getElementById("apiKey").value = settings.apiKey || "";

  const status = !settings.phone || !settings.apiKey
    ? "unconfigured"
    : (settings.whatsappStatus || "untested");
  updateWhatsappStatusBadge(status);

  const lang = settings.language || getCurrentLang();
  document.getElementById("languageSelect").value = lang;
  document.querySelectorAll("#languageSegmentedControl .lang-segment-btn").forEach((b) => {
    const isCurrent = b.getAttribute("data-lang") === lang;
    b.classList.toggle("active", isCurrent);
    if (isCurrent) {
      b.style.background = "rgba(99, 102, 241, 0.4)";
      b.style.color = "#ffffff";
    } else {
      b.style.background = "transparent";
      b.style.color = "var(--text-secondary)";
    }
  });

  document.getElementById("pauseDaysInput").value = settings.pauseDays || 30;
  document.getElementById("dropDaysInput").value = settings.dropDays || 90;

  const isPerf = Boolean(settings.perfMode);
  const perfToggle = document.getElementById("enablePerfMode");
  if (perfToggle) perfToggle.checked = isPerf;
  document.body.classList.toggle("perf-mode", isPerf);

  const showTierToggle = document.getElementById("showTierOnIcon");
  if (showTierToggle) showTierToggle.checked = Boolean(settings.showTierOnIcon);

  if (settings.activeThemeId && THEMES_CONFIG[settings.activeThemeId]) {
    currentThemeFilter = settings.activeThemeId;
  }
}

async function renderBlacklistUI() {
  const container = document.getElementById("blacklistedDomainsList");
  if (!container) return;

  let rawList = [];
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_DOMAIN_BLACKLIST" });
    if (res && Array.isArray(res.domainBlacklist)) {
      rawList = res.domainBlacklist;
    } else {
      const s = await chrome.storage.local.get(["domainBlacklist"]);
      rawList = Array.isArray(s.domainBlacklist) ? s.domainBlacklist : [];
    }
  } catch {
    const s = await chrome.storage.local.get(["domainBlacklist"]);
    rawList = Array.isArray(s.domainBlacklist) ? s.domainBlacklist : [];
  }

  const items = rawList
    .map((item) => {
      if (typeof item === "string") {
        return { domain: normalizeDomain(item), addedAt: Date.now() };
      }
      return { domain: normalizeDomain(item?.domain), addedAt: Number(item?.addedAt) || Date.now() };
    })
    .filter((item) => Boolean(item.domain));

  let currentTabHost = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const u = new URL(tab.url);
      if (u.protocol.startsWith("http")) {
        currentTabHost = normalizeDomain(u.hostname);
      }
    }
  } catch {}

  const quickBlockBtn = document.getElementById("btnQuickBlockCurrentSite");
  const quickBlockText = document.getElementById("quickBlockText");
  if (quickBlockBtn && quickBlockText) {
    if (currentTabHost) {
      const isAlreadyBlocked = items.some((item) => {
        const pattern = item.domain;
        if (currentTabHost === pattern) return true;
        if (currentTabHost.endsWith("." + pattern)) return true;
        return false;
      });
      if (isAlreadyBlocked) {
        quickBlockText.textContent = `✓ ${currentTabHost} (${t("status_blocked") || "Bloqueado"})`;
        quickBlockBtn.disabled = true;
      } else {
        quickBlockText.textContent = t("blacklist_quick_block", { domain: currentTabHost });
        quickBlockBtn.disabled = false;
        quickBlockBtn.setAttribute("data-host", currentTabHost);
      }
    } else {
      quickBlockText.textContent = t("blacklist_quick_block_none");
      quickBlockBtn.disabled = true;
      quickBlockBtn.removeAttribute("data-host");
    }
  }

  const filterContainer = document.getElementById("blacklistFilterContainer");
  if (filterContainer) {
    filterContainer.style.display = items.length > 8 ? "block" : "none";
  }

  const clearBtn = document.getElementById("btnClearBlacklist");
  if (clearBtn) {
    clearBtn.style.display = items.length > 0 ? "block" : "none";
  }

  const filtered = items.filter((item) => item.domain.toLowerCase().includes(currentBlacklistSearch));

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:14px 8px; font-size:11px; text-align:center;">
        <div style="color:var(--text-primary); font-weight:600;">${escapeHtml(t("blacklist_empty"))}</div>
        <div style="color:var(--text-secondary); margin-top:4px;">${escapeHtml(t("blacklist_empty_desc"))}</div>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:12px 8px; font-size:11px; text-align:center; color:var(--text-secondary);">
        ${escapeHtml(t("blacklist_empty_search"))}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map(
      (item) => `
    <div class="blacklist-item-row" style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); padding:6px 10px; border-radius:6px; gap:8px;">
      <div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1;">
        <span style="font-size:11.5px; font-family:monospace; color:var(--text-primary); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(item.domain)}</span>
        <span style="font-size:9.5px; color:var(--text-secondary);">${escapeHtml(formatTimeAgo(item.addedAt))}</span>
      </div>
      <button type="button" class="btn-remove-blacklist" data-domain="${escapeHtml(item.domain)}" data-added-at="${item.addedAt || ""}" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:15px; padding:2px 6px; border-radius:4px; line-height:1; flex-shrink:0;" title="${escapeHtml(t("btn_close") || "Eliminar")}" aria-label="Eliminar ${escapeHtml(item.domain)}">&times;</button>
    </div>
  `
    )
    .join("");
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