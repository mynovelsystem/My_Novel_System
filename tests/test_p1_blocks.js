// Test suite for P1 Blocks & P2 Enhancements
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== RUNNING P1 & P2 ARCHITECTURAL TEST SUITE ===");

// 1. Mock extension environment
let mockStorage = {};
const mockEvent = () => ({ addListener: () => {}, removeListener: () => {} });
const mockChrome = {
  storage: {
    local: {
      get: (keys) => {
        if (!keys) return Promise.resolve({ ...mockStorage });
        if (Array.isArray(keys)) {
          const res = {};
          keys.forEach((k) => { if (mockStorage[k] !== undefined) res[k] = mockStorage[k]; });
          return Promise.resolve(res);
        }
        return Promise.resolve({ [keys]: mockStorage[keys] });
      },
      set: (items) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      },
      remove: (keys) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach((k) => delete mockStorage[k]);
        return Promise.resolve();
      }
    },
    sync: { set: () => Promise.resolve() },
    onChanged: mockEvent()
  },
  action: {
    setIcon: () => Promise.resolve(),
    setBadgeText: () => Promise.resolve(),
    setBadgeBackgroundColor: () => Promise.resolve(),
    setTitle: () => Promise.resolve()
  },
  runtime: {
    onInstalled: mockEvent(),
    onStartup: mockEvent(),
    onMessage: mockEvent(),
    getManifest: () => ({ version: "4.0.0" }),
    getURL: (p) => p || ""
  },
  tabs: {
    onRemoved: mockEvent(),
    onUpdated: mockEvent(),
    onActivated: mockEvent(),
    query: () => Promise.resolve([]),
    get: () => Promise.resolve({})
  },
  alarms: {
    create: () => {},
    clear: () => {},
    get: () => Promise.resolve(null),
    onAlarm: mockEvent()
  },
  omnibox: {
    onInputChanged: mockEvent(),
    onInputEntered: mockEvent()
  },
  commands: {
    onCommand: mockEvent()
  }
};

// 2. Load background.js in context
const bgCode = fs.readFileSync(__dirname + "/../background.js", "utf8");
const context = {
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
  URL,
  importScripts: (...files) => {
    for (const f of files) {
      try {
        const p = path.resolve(__dirname, "..", f);
        if (fs.existsSync(p)) {
          vm.runInContext(fs.readFileSync(p, "utf8"), context);
        }
      } catch {}
    }
  },
  chrome: mockChrome,
  t: (k) => k,
  initI18n: () => Promise.resolve(),
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};
vm.createContext(context);
vm.runInContext(bgCode + "; globalThis.THEMES_CONFIG = THEMES_CONFIG;", context);

const {
  THEMES_CONFIG,
  getCultivationState,
  advanceCultivationBreakthrough,
  evaluateUnlockedTitles,
  getDefaultStats,
  calculateQi,
  mergeStatsObjects
} = context;

// -------------------------------------------------------------
// TEST 1: Bloque A - Theme Isolation & Persistence
// -------------------------------------------------------------
console.log("\n[Test 1] Bloque A - Theme Isolation & Backward Compatibility:");
{
  const stats = {
    ...getDefaultStats(),
    chaptersRead: 500,
    cultivatedRealmIndex: 2, // Golden Core
    cultivatedStage: 5,
    cultivationThemes: {
      cultivation: { realmIndex: 2, stage: 5, lastBreakthrough: null },
      hunter: { realmIndex: 1, stage: 2, lastBreakthrough: null }
    }
  };

  const cultState = getCultivationState(stats, "cultivation");
  const hunterState = getCultivationState(stats, "hunter");

  assert.strictEqual(cultState.realmIndex, 2, "Cultivation realm should be 2 (Golden Core)");
  assert.strictEqual(cultState.stage, 5, "Cultivation stage should be 5");
  assert.strictEqual(hunterState.realmIndex, 1, "Hunter realm should be 1 (Rank D)");
  assert.strictEqual(hunterState.stage, 2, "Hunter stage should be 2");

  // Advance Hunter breakthrough
  // Golden Core has 400 minQi, 500 totalQi is enough for hunter rank D stage 2 (span 300 / 9 = ~33.3 per stage, cap is 167)
  const btRes = advanceCultivationBreakthrough(stats, "hunter");
  assert.strictEqual(btRes.ok, true, "Breakthrough in hunter should succeed");
  assert.strictEqual(stats.cultivationThemes.hunter.stage, 3, "Hunter stage advances to 3");
  assert.strictEqual(stats.cultivationThemes.cultivation.stage, 5, "Cultivation stage remains untouched at 5");
  assert.strictEqual(stats.cultivatedStage, 5, "Root cultivatedStage remains untouched at 5");

  console.log("  [PASS] Themes are isolated and do not contaminate each other.");
}

// -------------------------------------------------------------
// TEST 2: Bloque B - Title Gating and Prevention of Illegal Unlocks
// -------------------------------------------------------------
console.log("\n[Test 2] Bloque B - Title Gating & Bypass Removal:");
{
  // User with only Realm 0 (Qi Condensation), but 10 novels completed
  const stats = {
    ...getDefaultStats(),
    chaptersRead: 100,
    novelsCompleted: 10,
    cultivatedRealmIndex: 0,
    cultivatedStage: 3,
    cultivationThemes: {
      cultivation: { realmIndex: 0, stage: 3 }
    }
  };

  evaluateUnlockedTitles(stats, "cultivation");

  // tribulation_overcomer requires Realm 2 (Golden Core) Stage 4 and 7 completed novels
  assert.strictEqual(
    stats.unlockedTitles.includes("tribulation_overcomer"),
    false,
    "tribulation_overcomer MUST NOT unlock when realm is below Golden Core Stage 4"
  );

  // Now advance to Realm 2 Stage 4
  stats.cultivationThemes.cultivation = { realmIndex: 2, stage: 4 };
  stats.cultivatedRealmIndex = 2;
  stats.cultivatedStage = 4;
  evaluateUnlockedTitles(stats, "cultivation");

  assert.strictEqual(
    stats.unlockedTitles.includes("tribulation_overcomer"),
    true,
    "tribulation_overcomer unlocks legitimately once Realm 2 Stage 4 is reached"
  );

  // Verify cross-theme title isolation: hunter title cannot unlock based on cultivation realm
  // shadow_monarch requires hunter realm 2 (Rank C)
  assert.strictEqual(
    stats.unlockedTitles.includes("shadow_monarch"),
    false,
    "Hunter title shadow_monarch must not unlock with cultivation realm"
  );

  console.log("  [PASS] Title gating is strictly enforced and cross-theme leaks prevented.");
}

// -------------------------------------------------------------
// TEST 3: Bloque C - Peak Realm Stage null & 9 Tiers Architecture
// -------------------------------------------------------------
console.log("\n[Test 3] Bloque C - Peak Realm stage = null & 9-Tier Architecture:");
{
  const stats = {
    ...getDefaultStats(),
    chaptersRead: 50000,
    cultivatedRealmIndex: 9, // Immortal Ascension
    cultivatedStage: 9
  };

  const peakState = getCultivationState(stats, "cultivation");
  assert.strictEqual(peakState.isPeakRealm, true, "Immortal Ascension is peak realm");
  assert.strictEqual(peakState.stage, null, "Peak realm has stage === null (not forced to 1/9)");

  // Verify all 9 tiers exist in Cultivation titles
  const cultTitles = THEMES_CONFIG.cultivation.titles;
  const tiers = new Set(cultTitles.map(t => t.tier));
  for (let i = 1; i <= 9; i++) {
    assert.strictEqual(tiers.has(i), true, `Tier ${i} must exist in cultivation titles`);
  }

  // Verify tribulation_emperor
  const tribEmp = cultTitles.find(t => t.id === "tribulation_emperor");
  assert.ok(tribEmp, "tribulation_emperor title must exist");
  assert.strictEqual(tribEmp.tier, 9, "tribulation_emperor is Tier 9");
  assert.strictEqual(tribEmp.minRealmIndex, 8, "tribulation_emperor requires Realm 8 (Heavenly Tribulation)");

  console.log("  [PASS] Peak realm has stage = null and full 9-tier scale is validated.");
}

// -------------------------------------------------------------
// TEST 4: Bloque D - Tab Event Consolidation
// -------------------------------------------------------------
console.log("\n[Test 4] Bloque D - tabs.onRemoved Single Consolidated Listener:");
{
  // Count tabs.onRemoved in background.js
  const onRemovedMatches = bgCode.match(/chrome\.tabs\.onRemoved\.addListener/g);
  assert.strictEqual(
    onRemovedMatches.length,
    1,
    "background.js must contain exactly ONE chrome.tabs.onRemoved listener"
  );
  console.log("  [PASS] Duplicate tabs.onRemoved listener successfully removed.");
}

// -------------------------------------------------------------
// TEST 5: Phase 4 (P2) - Tomo vs Capítulo Priority
// -------------------------------------------------------------
console.log("\n[Test 5] P2 - Chapter vs Volume Detection & i18n Synchronization:");
{
  // Load content.js regex logic
  const contentCode = fs.readFileSync(__dirname + "/../content.js", "utf8");
  const regexChapMatch = contentCode.match(/const CHAPTER_EXPLICIT_REGEX = (.*?);/);
  const regexVolMatch = contentCode.match(/const VOLUME_FALLBACK_REGEX = (.*?);/);

  assert.ok(regexChapMatch, "CHAPTER_EXPLICIT_REGEX found in content.js");
  assert.ok(regexVolMatch, "VOLUME_FALLBACK_REGEX found in content.js");

  function parseRegexLiteral(str) {
    const m = str.match(/^\/(.*)\/([a-z]*)$/);
    if (!m) throw new Error("Invalid regex literal: " + str);
    return new RegExp(m[1], m[2]);
  }
  const chapRegex = parseRegexLiteral(regexChapMatch[1]);
  const volRegex = parseRegexLiteral(regexVolMatch[1]);

  function parseChapter(text) {
    const m = text.match(chapRegex);
    if (m) return m[1] || m[2];
    const mVol = text.match(volRegex);
    if (mVol) return mVol[1];
    return null;
  }

  assert.strictEqual(parseChapter("Tomo 3 Capítulo 45"), "45", "Tomo 3 Capítulo 45 detects 45, not 3");
  assert.strictEqual(parseChapter("Volumen 2 Cap. 120"), "120", "Volumen 2 Cap. 120 detects 120");
  assert.strictEqual(parseChapter("Tomo 5"), "5", "Pure Tomo 5 detects 5 as fallback");

  // Validate i18n keys synchronization
  const esJson = JSON.parse(fs.readFileSync(__dirname + "/../locales/es.json", "utf8"));
  const enJson = JSON.parse(fs.readFileSync(__dirname + "/../locales/en.json", "utf8"));

  assert.strictEqual(Object.keys(esJson).length, Object.keys(enJson).length, "ES and EN have equal key counts");
  assert.strictEqual(esJson["cult_tier_9"], "Tier IX • Inmortal", "cult_tier_9 present in ES");
  assert.strictEqual(enJson["cult_tier_9"], "Tier IX • Immortal", "cult_tier_9 present in EN");
  assert.strictEqual(esJson["title_tribulation_emperor_name"], "Emperador de la Tribulación");
  assert.ok(esJson["report_title"], "report_title present in ES");
  assert.ok(esJson["logs_empty"], "logs_empty present in ES");

  console.log("  [PASS] Chapter vs Volume priority and i18n synchronization validated.");
}

console.log("\n>>> ALL P1 AND P2 ARCHITECTURAL TESTS PASSED CLEANLY! <<<\n");
