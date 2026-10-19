// ============================================================================
// NOVEL TRACKER — TEST SUITE: THEME PROGRESSION ISOLATION & RESOURCE PERSONALIZATION
// File: tests/test_theme_progression_v4.js
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const achData = require("../achievements_data.js");
const {
  THEMES_CONFIG,
  getCultivationState,
  advanceCultivationBreakthrough,
  calculateQi,
  calculateBonusQi,
  claimAchievementReward,
  recordCultivationProgress
} = achData;

// Load translations for localization verification
const esLocale = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../locales/es.json"), "utf8"));
const enLocale = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../locales/en.json"), "utf8"));

function mockT(locale) {
  return function (key, params = {}) {
    let str = locale[key] || key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
    return str;
  };
}

const tEs = mockT(esLocale);
const tEn = mockT(enLocale);

// Set up VM context for background.js testing (mergeStatsObjects, refreshBrowserActionAppearance)
const bgCode = fs.readFileSync(path.resolve(__dirname, "../background.js"), "utf8");
const actionCalls = {
  setIcon: [],
  setBadgeText: [],
  setBadgeBackgroundColor: [],
  setTitle: []
};

const mockChrome = {
  storage: {
    local: {
      _data: {},
      get: async (keys) => {
        const res = {};
        for (const k of keys) {
          if (mockChrome.storage.local._data[k] !== undefined) {
            res[k] = JSON.parse(JSON.stringify(mockChrome.storage.local._data[k]));
          }
        }
        return res;
      },
      set: async (obj) => {
        for (const [k, v] of Object.entries(obj)) {
          mockChrome.storage.local._data[k] = JSON.parse(JSON.stringify(v));
        }
      },
      remove: async (keys) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) delete mockChrome.storage.local._data[k];
      }
    },
    sync: { set: async () => {} },
    onChanged: { addListener: () => {} }
  },
  action: {
    setIcon: async (opts) => actionCalls.setIcon.push(opts),
    setBadgeText: async (opts) => actionCalls.setBadgeText.push(opts),
    setBadgeBackgroundColor: async (opts) => actionCalls.setBadgeBackgroundColor.push(opts),
    setTitle: async (opts) => actionCalls.setTitle.push(opts)
  },
  alarms: {
    create: () => {},
    clear: () => {},
    get: async () => null,
    onAlarm: { addListener: () => {} }
  },
  omnibox: {
    onInputChanged: { addListener: () => {} },
    onInputEntered: { addListener: () => {} }
  },
  commands: {
    onCommand: { addListener: () => {} }
  },
  runtime: {
    sendMessage: async () => ({ ok: true }),
    onMessage: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    getManifest: () => ({ version: "4.0.0" }),
    getURL: (p) => p || ""
  },
  tabs: {
    query: async () => [],
    sendMessage: async () => {},
    get: async () => ({}),
    onRemoved: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    onActivated: { addListener: () => {} }
  }
};

const bgContext = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  Set,
  Map,
  Promise,
  parseFloat,
  parseInt,
  isNaN,
  importScripts: (...files) => {
    for (const f of files) {
      try {
        const p = path.resolve(__dirname, "..", f);
        if (fs.existsSync(p)) {
          vm.runInContext(fs.readFileSync(p, "utf8"), bgContext);
        }
      } catch {}
    }
  },
  fetch: async (url) => ({
    ok: true,
    json: async () => (String(url).includes("en") ? enLocale : esLocale)
  }),
  chrome: mockChrome,
  THEMES_CONFIG,
  getCultivationState,
  advanceCultivationBreakthrough,
  calculateQi,
  recordCultivationProgress,
  t: (k, p) => tEs(k, p),
  initI18n: () => Promise.resolve(),
  currentLang: "es"
};
vm.createContext(bgContext);
vm.runInContext(bgCode, bgContext);

const { mergeStatsObjects, refreshBrowserActionAppearance } = bgContext;

async function runAll() {
  console.log("====================================================================");
  console.log("   THEME PROGRESSION ISOLATION & RESOURCE PERSONALIZATION TESTS     ");
  console.log("====================================================================\n");

  // ----------------------------------------------------------------------------
  // CASO A: Nueva temática nunca usada (Clean Start, No Qi/Stage Leakage)
  // ----------------------------------------------------------------------------
console.log("[Caso A] Nueva temática nunca usada:");
{
  // User with 240 chapters in Cultivation (Stage 9 of Qi Condensation)
  const stats = {
    chaptersRead: 240,
    novelsStarted: 5,
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 9
    // cultivationThemes is undefined or does not have 'hunter' / 'legendary_novels'
  };

  // 1. Cultivation state is at stage 9
  const cultState = getCultivationState(stats, "cultivation");
  assert.strictEqual(cultState.realmIndex, 0, "Cultivation should be in Realm 0");
  assert.strictEqual(cultState.stage, 9, "Cultivation should be at Stage 9");
  assert.strictEqual(cultState.totalQi, 240, "Cultivation totalQi should be 240");

  // 2. Switching to Hunter for the first time must start at Realm 0, Stage 1, 0 EXP
  const hunterState = getCultivationState(stats, "hunter");
  assert.strictEqual(hunterState.realmIndex, 0, "Hunter must start at Realm 0 (Rank E)");
  assert.strictEqual(hunterState.stage, 1, "Hunter must start at Stage 1 (NOT Stage 9!)");
  assert.strictEqual(hunterState.totalQi, 0, "Hunter EXP must be 0 (NOT 240 Qi!)");
  assert.strictEqual(hunterState.isBottleneckReady, false, "Hunter must not have bottleneck ready at 0 EXP");
  assert.strictEqual(hunterState.isBottleneck, false, "Hunter must not be stuck in bottleneck at start");
  assert.strictEqual(hunterState.resource.id, "hunter_exp", "Resource must be hunter_exp");

  // 3. Switching to Legendary Novels for the first time
  const novelsState = getCultivationState(stats, "legendary_novels");
  assert.strictEqual(novelsState.realmIndex, 0, "Legendary Novels must start at Realm 0 (Novice Reader)");
  assert.strictEqual(novelsState.stage, 1, "Legendary Novels must start at Stage 1");
  assert.strictEqual(novelsState.totalQi, 0, "Legendary Novels Lore EXP must be 0");
  assert.strictEqual(novelsState.resource.id, "lore_exp", "Resource must be lore_exp");

  // 4. Pre-existing uninitialized theme object with { realmIndex: 0, stage: 1 } but no exp
  const statsWithEmptyRecord = {
    chaptersRead: 300,
    cultivatedRealmIndex: 0,
    cultivatedStage: 9,
    cultivationThemes: {
      hunter: { realmIndex: 0, stage: 1 }
    }
  };
  const emptyHunterState = getCultivationState(statsWithEmptyRecord, "hunter");
  assert.strictEqual(emptyHunterState.realmIndex, 0);
  assert.strictEqual(emptyHunterState.stage, 1);
  assert.strictEqual(emptyHunterState.totalQi, 0, "Hunter with initial record { realmIndex: 0, stage: 1 } must NOT inherit 300 cultivation Qi");

  console.log("  [PASS] Never-used themes cleanly start at Realm 0, Stage 1, 0 EXP without Qi leakage.");
}

// ----------------------------------------------------------------------------
// CASO B: Progreso independiente entre temáticas (Isolated Progression)
// ----------------------------------------------------------------------------
console.log("\n[Caso B] Progreso independiente entre temáticas:");
{
  let stats = {
    chaptersRead: 50,
    novelsStarted: 2,
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 2,
    cultivationThemes: {
      cultivation: {
        realmIndex: 0,
        stage: 2,
        exp: 50,
        totalExp: 50,
        chaptersRead: 50
      }
    }
  };

  // Read 40 chapters while 'hunter' theme is active
  stats = recordCultivationProgress(stats, 40, false, 0, "hunter");

  // Global chapters must be 50 + 40 = 90
  assert.strictEqual(stats.chaptersRead, 90, "Global chaptersRead must increase to 90");

  // Hunter theme should have gained 40 EXP
  const hunterData = stats.cultivationThemes.hunter;
  assert.ok(hunterData, "Hunter theme data must be created");
  assert.strictEqual(hunterData.exp, 40, "Hunter exp must be exactly 40");
  assert.strictEqual(hunterData.chaptersRead, 40, "Hunter chaptersRead must be 40");

  // Cultivation theme must be UNCHANGED (50 exp)
  const cultData = stats.cultivationThemes.cultivation;
  assert.strictEqual(cultData.exp, 50, "Cultivation exp must remain unchanged at 50");

  // Verify getCultivationState for both
  const hunterState = getCultivationState(stats, "hunter");
  assert.strictEqual(hunterState.totalQi, 40, "Hunter totalQi (EXP) must be 40");

  const cultState = getCultivationState(stats, "cultivation");
  assert.strictEqual(cultState.totalQi, 50, "Cultivation totalQi must remain 50");

  console.log("  [PASS] Reading in Hunter adds EXP only to Hunter while keeping Cultivation Qi intact.");
}

// ----------------------------------------------------------------------------
// CASO C: Persistencia y cambio de temáticas sin reinicios
// ----------------------------------------------------------------------------
console.log("\n[Caso C] Persistencia y cambio de temáticas sin reinicios:");
{
  let stats = {
    chaptersRead: 60,
    novelsStarted: 3,
    novelsCompleted: 0,
    cultivationThemes: {
      cultivation: { realmIndex: 0, stage: 2, exp: 50, totalExp: 50, chaptersRead: 50 },
      hunter: { realmIndex: 0, stage: 1, exp: 35, totalExp: 35, chaptersRead: 35 }
    }
  };

  // In Hunter (Rank E, 0-250 cap, 9 stages -> stage 1 cap = 28 exp).
  // With 35 exp, Hunter is ready for stage 2 bottleneck!
  let hunterState = getCultivationState(stats, "hunter");
  assert.strictEqual(hunterState.isBottleneckReady, true, "Hunter at 35 EXP should be bottleneck ready (> 28)");

  // Advance breakthrough in Hunter
  const btRes = advanceCultivationBreakthrough(stats, "hunter", { applySurplus: true });
  assert.strictEqual(btRes.ok, true, "Breakthrough in Hunter must succeed");
  assert.strictEqual(btRes.newStage, 2, "Hunter must advance to Stage 2");
  stats = btRes.stats;

  assert.strictEqual(stats.cultivationThemes.hunter.stage, 2, "Hunter stage in stats must be 2");
  assert.strictEqual(stats.cultivationThemes.hunter.exp, 35, "Hunter exp must be preserved");

  // User switches to Cultivation
  let cultState = getCultivationState(stats, "cultivation");
  assert.strictEqual(cultState.stage, 2, "Cultivation remains at Stage 2");
  assert.strictEqual(cultState.totalQi, 50, "Cultivation Qi remains 50");

  // User switches back to Hunter: MUST NOT reset to stage 1 or zero exp
  hunterState = getCultivationState(stats, "hunter");
  assert.strictEqual(hunterState.stage, 2, "Hunter must still be at Stage 2 after switching back");
  assert.strictEqual(hunterState.totalQi, 35, "Hunter must retain 35 EXP after switching back");

  console.log("  [PASS] Theme switching preserves stage and exp accurately without resetting.");
}

// ----------------------------------------------------------------------------
// CASO D: Sincronización en la nube / Cloud merge (mergeStatsObjects)
// ----------------------------------------------------------------------------
console.log("\n[Caso D] Sincronización en la nube / Cloud merge:");
{
  const localStats = {
    updatedAt: 1000,
    chaptersRead: 200,
    cultivationThemes: {
      cultivation: { realmIndex: 1, stage: 2, exp: 300, totalExp: 300, chaptersRead: 200 },
      hunter: { realmIndex: 0, stage: 4, exp: 120, totalExp: 120, chaptersRead: 120 }
    }
  };

  const cloudStats = {
    updatedAt: 2000,
    chaptersRead: 350,
    cultivationThemes: {
      cultivation: { realmIndex: 0, stage: 9, exp: 240, totalExp: 240, chaptersRead: 200 },
      hunter: { realmIndex: 1, stage: 1, exp: 280, totalExp: 280, chaptersRead: 280 }
    }
  };

  const merged = mergeStatsObjects(localStats, cloudStats);

  // Cultivation: local has realm 1, cloud has realm 0 -> realm 1 must win!
  assert.strictEqual(merged.cultivationThemes.cultivation.realmIndex, 1, "Higher realm index for cultivation must win");
  assert.strictEqual(merged.cultivationThemes.cultivation.stage, 2, "Stage corresponding to higher realm must be kept");
  assert.strictEqual(merged.cultivationThemes.cultivation.exp, 300, "Higher exp must be preserved");

  // Hunter: cloud has realm 1, local has realm 0 -> cloud realm 1 must win!
  assert.strictEqual(merged.cultivationThemes.hunter.realmIndex, 1, "Higher realm index for hunter must win");
  assert.strictEqual(merged.cultivationThemes.hunter.stage, 1, "Stage corresponding to higher realm must be kept");
  assert.strictEqual(merged.cultivationThemes.hunter.exp, 280, "Higher hunter exp must be preserved");
  assert.strictEqual(merged.cultivationThemes.hunter.chaptersRead, 280, "Hunter chaptersRead must be preserved");

  console.log("  [PASS] Cloud merge preserves highest realm, stage, exp and chaptersRead per theme.");
}

// ----------------------------------------------------------------------------
// CASO E: Preservación de estadísticas globales y logros
// ----------------------------------------------------------------------------
console.log("\n[Caso E] Preservación de estadísticas globales y logros:");
{
  const todayStr = (typeof achData.getLocalDateStr === "function") ? achData.getLocalDateStr() : new Date().toISOString().slice(0, 10);
  let stats = {
    chaptersRead: 100,
    novelsStarted: 5,
    novelsCompleted: 2,
    streakDays: 7,
    bestStreak: 14,
    lastReadDay: todayStr,
    unlockedTitles: ["outer_disciple", "meridian_opener"],
    claimedRewards: ["outer_disciple"],
    inventory: ["sword_dao_1"],
    equippedItems: ["sword_dao_1"],
    cultivationThemes: {
      cultivation: { realmIndex: 0, stage: 5, exp: 100, totalExp: 100, chaptersRead: 100 }
    }
  };

  // Read 10 chapters and start 1 novel while active in Legendary Novels
  stats = recordCultivationProgress(stats, 10, true, 0, "legendary_novels");

  assert.strictEqual(stats.chaptersRead, 110, "Global chaptersRead must increment to 110");
  assert.strictEqual(stats.novelsStarted, 6, "Global novelsStarted must increment to 6");
  assert.strictEqual(stats.novelsCompleted, 2, "Global novelsCompleted must be preserved at 2");
  assert.strictEqual(stats.streakDays, 7, "Streak days must be preserved");
  assert.ok(stats.unlockedTitles.includes("outer_disciple"), "Previously unlocked title outer_disciple preserved");
  assert.ok(stats.unlockedTitles.includes("meridian_opener"), "Previously unlocked title meridian_opener preserved");
  assert.ok(stats.inventory.includes("sword_dao_1"), "Original inventory item sword_dao_1 preserved");

  // Claim non-cultivation title reward (hunter_awakening: Hunter title, rewardQi: 30)
  stats.unlockedTitles.push("hunter_awakening");
  const claimRes = claimAchievementReward(stats, "hunter_awakening");
  assert.strictEqual(claimRes.ok, true, "Claiming hunter_awakening should succeed");
  assert.strictEqual(stats.cultivationThemes.hunter.exp, 30, "Claiming hunter_awakening credits 30 EXP to Hunter theme");
  assert.strictEqual(stats.cultivationThemes.hunter.totalExp, 30, "Claiming hunter_awakening credits 30 totalExp to Hunter theme");
  assert.strictEqual(stats.bonusQi, 25, "bonusQi must only include cultivation title (outer_disciple: 25), not hunter title");
  assert.strictEqual(calculateBonusQi(stats), 25, "calculateBonusQi must ignore non-cultivation titles");

  console.log("  [PASS] Global metrics and achievements remain intact across theme activities.");
}

// ----------------------------------------------------------------------------
// CASO F: Visuales y coherencia del recurso por temática
// ----------------------------------------------------------------------------
console.log("\n[Caso F] Visuales y coherencia del recurso por temática:");
{
  // Cultivation
  const cultCfg = THEMES_CONFIG.cultivation.resource;
  assert.strictEqual(cultCfg.id, "qi");
  assert.strictEqual(tEs(cultCfg.nameKey), "Qi");
  assert.strictEqual(tEn(cultCfg.nameKey), "Qi");
  assert.strictEqual(cultCfg.icon, "⛩️");
  assert.strictEqual(cultCfg.majorIcon, "🌌");
  assert.strictEqual(cultCfg.animationClass, "ascension-burst");

  // Hunter
  const hunterCfg = THEMES_CONFIG.hunter.resource;
  assert.strictEqual(hunterCfg.id, "hunter_exp");
  assert.strictEqual(tEs(hunterCfg.nameKey), "Puntos de Caza");
  assert.strictEqual(tEn(hunterCfg.nameKey), "Hunter EXP");
  assert.strictEqual(tEs(hunterCfg.unitKey), "pts");
  assert.strictEqual(tEn(hunterCfg.unitKey), "EXP");
  assert.ok(hunterCfg.barGradient.includes("#ef4444"), "Hunter gradient should feature red/crimson accents");
  assert.strictEqual(hunterCfg.symbol, "⚡");
  assert.strictEqual(hunterCfg.majorIcon, "🛡️");
  assert.strictEqual(hunterCfg.animationClass, "hunter-burst");

  // Verify Hunter text does NOT use Cultivation terms
  const hunterAlertEs = tEs(hunterCfg.bottleneckAlertKey);
  assert.ok(!hunterAlertEs.includes("Qi"), "Hunter bottleneck alert in ES must not contain 'Qi'");
  const hunterAlertEn = tEn(hunterCfg.bottleneckAlertKey);
  assert.ok(!hunterAlertEn.includes("Qi"), "Hunter bottleneck alert in EN must not contain 'Qi'");

  // Legendary Novels
  const novelsCfg = THEMES_CONFIG.legendary_novels.resource;
  assert.strictEqual(novelsCfg.id, "lore_exp");
  assert.strictEqual(tEs(novelsCfg.nameKey), "Comprensión");
  assert.strictEqual(tEn(novelsCfg.nameKey), "Lore EXP");
  assert.strictEqual(tEs(novelsCfg.unitKey), "pts");
  assert.strictEqual(tEn(novelsCfg.unitKey), "EXP");
  assert.ok(novelsCfg.barGradient.includes("#a855f7"), "Novels gradient should feature mystic violet");
  assert.strictEqual(novelsCfg.symbol, "📜");
  assert.strictEqual(novelsCfg.majorIcon, "✨");
  assert.strictEqual(novelsCfg.animationClass, "lore-burst");

  // Verify Tooltip Title formatting in background.js with Hunter theme
  mockChrome.storage.local._data.settings = { activeThemeId: "hunter" };
  mockChrome.storage.local._data.stats = {
    chaptersRead: 50,
    cultivationThemes: {
      hunter: { realmIndex: 0, stage: 2, exp: 30, totalExp: 30 }
    }
  };

  actionCalls.setTitle.length = 0;
  // Clear lastRenderedStateKey to force render
  bgContext.lastRenderedStateKey = "";

  // Run appearance refresh in VM
  await refreshBrowserActionAppearance();
  assert.ok(actionCalls.setTitle.length > 0, "action.setTitle must have been called");
  const lastTitle = actionCalls.setTitle[actionCalls.setTitle.length - 1].title;
  assert.ok(lastTitle.includes("pts") || lastTitle.includes("EXP"), `Tooltip title must include theme unit: ${lastTitle}`);
  assert.ok(!lastTitle.includes("Qi"), `Tooltip title for Hunter theme must NOT contain 'Qi': ${lastTitle}`);

  console.log("  [PASS] Themes have coherent, localized resources, gradients, alerts, and units.");
}

console.log("\n====================================================================");
console.log(">>> ALL THEME PROGRESSION ISOLATION TESTS PASSED (100%)! <<<");
console.log("====================================================================\n");
}

runAll().catch((err) => {
  console.error("FATAL ERROR in test_theme_progression_v4:", err);
  process.exit(1);
});
