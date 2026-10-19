// ============================================================================
// NOVEL TRACKER — TEST SUITE: QI CLAIMING, ACHIEVEMENT TIERS & AVATAR AUDIT (V15)
// File: tests/test_qi_claiming_and_avatar_v15.js
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const achData = require("../achievements_data.js");
const {
  THEMES_CONFIG,
  TITLE_CONFIG,
  ITEMS_CONFIG,
  SYSTEM_ACHIEVEMENTS_CONFIG,
  getCultivationState,
  calculateQi,
  calculateBonusQi,
  getEquippedQiMultiplier,
  equipItem,
  unequipItem,
  claimAchievementReward,
  getUnclaimedAchievements,
  getAchievementTier,
  getSortedAchievementsByTier,
  getSortedTitlesByDifficulty
} = achData;

// Load background.js into VM context to test mergeStatsObjects and claim handlers
const bgCode = fs.readFileSync(path.resolve(__dirname, "../background.js"), "utf8");
const popupCode = fs.readFileSync(path.resolve(__dirname, "../popup.js"), "utf8");
const popupHtml = fs.readFileSync(path.resolve(__dirname, "../popup.html"), "utf8");

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
      }
    },
    sync: { set: async () => {}, get: async () => ({}) },
    onChanged: { addListener: () => {} }
  },
  action: {
    setIcon: async () => {},
    setBadgeText: async () => {},
    setBadgeBackgroundColor: async () => {},
    setTitle: async () => {}
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
  chrome: mockChrome,
  THEMES_CONFIG,
  TITLE_CONFIG,
  ITEMS_CONFIG,
  SYSTEM_ACHIEVEMENTS_CONFIG,
  getCultivationState,
  calculateQi,
  calculateBonusQi,
  getEquippedQiMultiplier,
  equipItem,
  unequipItem,
  claimAchievementReward,
  getUnclaimedAchievements,
  getAchievementTier,
  getSortedAchievementsByTier,
  getSortedTitlesByDifficulty,
  t: (k) => k,
  initI18n: () => Promise.resolve()
};
vm.createContext(bgContext);
vm.runInContext(bgCode, bgContext);
const { mergeStatsObjects } = bgContext;

// Load popup functions into VM context
const popupContext = {
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  Set,
  Map,
  chrome: mockChrome,
  THEMES_CONFIG,
  TITLE_CONFIG,
  ITEMS_CONFIG,
  SYSTEM_ACHIEVEMENTS_CONFIG,
  getCultivationState,
  calculateQi,
  calculateBonusQi,
  getEquippedQiMultiplier,
  equipItem,
  unequipItem,
  claimAchievementReward,
  getUnclaimedAchievements,
  getAchievementTier,
  getSortedAchievementsByTier,
  getSortedTitlesByDifficulty,
  t: (k) => k,
  escapeHtml: (s) => String(s || "")
};
vm.createContext(popupContext);

// Extract renderAvatarEquippedNodes from popup.js
const renderAvatarMatch = popupCode.match(/function renderAvatarEquippedNodes\([\s\S]*?\n\}/);
assert.ok(renderAvatarMatch, "renderAvatarEquippedNodes function must exist in popup.js");
vm.runInContext(renderAvatarMatch[0], popupContext);
const { renderAvatarEquippedNodes } = popupContext;

async function runAudit() {
  console.log("====================================================================");
  console.log("  QI CLAIMING, ACHIEVEMENT TIERS & AVATAR AUDIT (V15)               ");
  console.log("====================================================================\n");

  // ----------------------------------------------------------------------------
  // SECTION 1: Qi Reward Claiming Pipeline
  // ----------------------------------------------------------------------------
  console.log("[Test 1] Qi Reward Claiming Pipeline:");
  {
    const stats = {
      chaptersRead: 50,
      novelsStarted: 2,
      novelsCompleted: 1,
      streakDays: 3,
      bestStreak: 5,
      cultivatedRealmIndex: 0,
      cultivatedStage: 2,
      unlockedTitles: ["outer_disciple"],
      claimedRewards: [],
      bonusQi: 0,
      cultivationThemes: {
        cultivation: {
          realmIndex: 0,
          stage: 2,
          exp: 100,
          totalExp: 100,
          chaptersRead: 50
        }
      }
    };

    const initialExp = stats.cultivationThemes.cultivation.exp;
    const initialCultQi = getCultivationState(stats, "cultivation").totalQi;
    assert.strictEqual(initialCultQi, 100, "Initial cultivation Qi is 100");

    // Claim 'outer_disciple' reward (rewardQi: 25)
    const claimRes = claimAchievementReward(stats, "outer_disciple");
    assert.strictEqual(claimRes.ok, true, "Claim must return ok: true");
    assert.strictEqual(claimRes.rewardQi, 25, "Reward Qi must be 25");
    assert.strictEqual(stats.claimedRewards.includes("outer_disciple"), true, "outer_disciple added to claimedRewards");
    assert.strictEqual(stats.bonusQi, 25, "bonusQi must be updated to 25");
    assert.strictEqual(stats.cultivationThemes.cultivation.exp, initialExp + 25, "cultivation.exp incremented by 25");
    assert.strictEqual(stats.cultivationThemes.cultivation.totalExp, initialExp + 25, "cultivation.totalExp incremented by 25");

    const afterCultQi = getCultivationState(stats, "cultivation").totalQi;
    assert.strictEqual(afterCultQi, initialCultQi + 25, "getCultivationState reflects new Qi balance (125)");

    // Duplicate claim attempt
    const dupRes = claimAchievementReward(stats, "outer_disciple");
    assert.strictEqual(dupRes.ok, false, "Duplicate claim must fail");
    assert.strictEqual(dupRes.error, "already_claimed", "Error must be already_claimed");
    assert.strictEqual(stats.cultivationThemes.cultivation.exp, 125, "exp unchanged after duplicate attempt");
    assert.strictEqual(stats.bonusQi, 25, "bonusQi unchanged after duplicate attempt");

    // Locked achievement claim attempt
    const lockedRes = claimAchievementReward(stats, "foundation_builder");
    assert.strictEqual(lockedRes.ok, false, "Locked achievement claim must fail");
    assert.strictEqual(lockedRes.error, "not_unlocked", "Error must be not_unlocked");

    // System achievement claim
    stats.systemAchievements = ["story_collector"];
    const sysAchConfig = SYSTEM_ACHIEVEMENTS_CONFIG.story_collector;
    const expectedSysReward = sysAchConfig.rewardQi; // 100
    const sysClaimRes = claimAchievementReward(stats, "story_collector");
    assert.strictEqual(sysClaimRes.ok, true, "System achievement claim must succeed");
    assert.strictEqual(sysClaimRes.rewardQi, expectedSysReward, `System achievement reward must be ${expectedSysReward}`);
    assert.strictEqual(stats.cultivationThemes.cultivation.exp, 125 + expectedSysReward, "Cultivation exp increased by system reward");
    assert.strictEqual(stats.bonusQi, 25 + expectedSysReward, "bonusQi includes system reward");

    // Cloud merge preserves claimed rewards and highest exp
    const cloudStats = {
      chaptersRead: 50,
      claimedRewards: ["outer_disciple"],
      cultivationThemes: {
        cultivation: { realmIndex: 0, stage: 2, exp: 125, totalExp: 125, chaptersRead: 50 }
      }
    };
    const merged = mergeStatsObjects(stats, cloudStats);
    assert.ok(merged.claimedRewards.includes("outer_disciple"), "Merged claimedRewards includes outer_disciple");
    assert.ok(merged.claimedRewards.includes("story_collector"), "Merged claimedRewards includes story_collector");
    assert.strictEqual(merged.cultivationThemes.cultivation.exp, 125 + expectedSysReward, "Merged preserves highest exp with claimed reward");

    console.log("  [PASS] Qi reward claiming successfully updates exp, totalExp, bonusQi, rejects duplicates, and merges safely.");
  }

  // ----------------------------------------------------------------------------
  // SECTION 2: Achievement Monotonic Ordering by Tier
  // ----------------------------------------------------------------------------
  console.log("\n[Test 2] Achievement Monotonic Ordering by Tier:");
  {
    // A. Normal Titles in each theme
    for (const [themeId, theme] of Object.entries(THEMES_CONFIG)) {
      const sortedTitles = getSortedTitlesByDifficulty(theme.titles || []);
      assert.ok(sortedTitles.length > 0, `Theme ${themeId} must have titles`);

      for (let i = 1; i < sortedTitles.length; i++) {
        const prevTier = getAchievementTier(sortedTitles[i - 1]);
        const currTier = getAchievementTier(sortedTitles[i]);
        assert.ok(
          currTier >= prevTier,
          `Theme ${themeId}: Title ${sortedTitles[i].id} (tier ${currTier}) must have tier >= previous ${sortedTitles[i - 1].id} (tier ${prevTier})`
        );
      }
    }

    // B. System Achievements (Grandes Hazañas)
    const systemList = Object.values(SYSTEM_ACHIEVEMENTS_CONFIG);
    const sortedSystem = getSortedAchievementsByTier(systemList);
    assert.strictEqual(sortedSystem.length, 15, "All 15 system achievements must be sorted");

    for (let i = 1; i < sortedSystem.length; i++) {
      const prevTier = getAchievementTier(sortedSystem[i - 1]);
      const currTier = getAchievementTier(sortedSystem[i]);
      assert.ok(
        currTier >= prevTier,
        `System achievement ${sortedSystem[i].id} (tier ${currTier}) must have tier >= previous ${sortedSystem[i - 1].id} (tier ${prevTier})`
      );
    }

    // First system achievement must be tier 1, last must be tier 5
    assert.strictEqual(getAchievementTier(sortedSystem[0]), 1, "First system achievement is Tier 1");
    assert.strictEqual(getAchievementTier(sortedSystem[sortedSystem.length - 1]), 5, "Last system achievement is Tier 5");

    console.log("  [PASS] Normal and System achievements strictly follow monotonic tier ordering (Tier 1 to 9 / Tier 1 to 5).");
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: Qi Bonus Items Functionality
  // ----------------------------------------------------------------------------
  console.log("\n[Test 3] Qi Bonus Items Functionality:");
  {
    let stats = {
      chaptersRead: 100,
      novelsCompleted: 0,
      inventory: ["sword_dao_1", "earrings_spirit_1", "armor_turtle_1"],
      equippedItems: []
    };

    // Baseline: no items equipped
    assert.strictEqual(getEquippedQiMultiplier(stats), 1.0, "Multiplier is 1.0 with no items");
    const baseQi = calculateQi(stats);
    assert.strictEqual(baseQi, 100, "Base Qi is 100");

    // Equip sword_dao_1 (+15% Qi)
    let eqRes = equipItem(stats, "sword_dao_1");
    assert.strictEqual(eqRes.ok, true);
    assert.strictEqual(getEquippedQiMultiplier(stats), 1.15, "Multiplier is 1.15 with sword equipped");
    assert.strictEqual(calculateQi(stats), 115, "Total Qi is 115 with sword");

    // Equip earrings_spirit_1 (+15% Qi)
    eqRes = equipItem(stats, "earrings_spirit_1");
    assert.strictEqual(eqRes.ok, true);
    assert.strictEqual(Math.round(getEquippedQiMultiplier(stats) * 100) / 100, 1.30, "Multiplier is 1.30 with sword + earrings");
    assert.strictEqual(calculateQi(stats), 130, "Total Qi is 130 with sword + earrings");

    // Re-equipping the same item does not duplicate
    eqRes = equipItem(stats, "earrings_spirit_1");
    assert.strictEqual(stats.equippedItems.length, 2, "Re-equipping existing item does not duplicate");
    assert.strictEqual(Math.round(getEquippedQiMultiplier(stats) * 100) / 100, 1.30, "Multiplier stays 1.30");

    // Unequip earrings
    let unRes = unequipItem(stats, "earrings_spirit_1");
    assert.strictEqual(unRes.ok, true);
    assert.strictEqual(getEquippedQiMultiplier(stats), 1.15, "Multiplier reverts to 1.15 after unequipping earrings");
    assert.strictEqual(calculateQi(stats), 115, "Total Qi reverts to 115");

    // Unequip sword
    unRes = unequipItem(stats, "sword_dao_1");
    assert.strictEqual(unRes.ok, true);
    assert.strictEqual(getEquippedQiMultiplier(stats), 1.0, "Multiplier reverts to 1.0 after unequipping all");
    assert.strictEqual(calculateQi(stats), 100, "Total Qi reverts to 100");

    // --------------------------------------------------------------------------
    // REPRODUCIBLE REFERENCE BENCHMARK TEST (Requirement 3)
    // --------------------------------------------------------------------------
    // 1. Initial state without bonus item
    let testStatsWithout = {
      chaptersRead: 5,
      novelsCompleted: 0,
      inventory: ["sword_dao_1", "earrings_spirit_1"],
      equippedItems: [],
      cultivationThemes: {
        cultivation: { realmIndex: 0, stage: 1, exp: 5.0, totalExp: 5.0, chaptersRead: 5 }
      }
    };
    const qiInitWithout = getCultivationState(testStatsWithout, "cultivation").totalQi;
    assert.strictEqual(qiInitWithout, 5.0, "Initial Qi is 5.0");

    // 2. Read 1 chapter without bonus item
    testStatsWithout = recordCultivationProgress(testStatsWithout, 1, false, 0, "cultivation");
    const qiAfterWithout = getCultivationState(testStatsWithout, "cultivation").totalQi;
    const gainWithout = Math.round((qiAfterWithout - qiInitWithout) * 100) / 100;
    assert.strictEqual(gainWithout, 1.0, "Gain without bonus item is exactly 1.0 Qi");

    // 3. Identical isolated scenario with bonus item equipped
    let testStatsWith = {
      chaptersRead: 5,
      novelsCompleted: 0,
      inventory: ["sword_dao_1", "earrings_spirit_1"],
      equippedItems: [],
      cultivationThemes: {
        cultivation: { realmIndex: 0, stage: 1, exp: 5.0, totalExp: 5.0, chaptersRead: 5 }
      }
    };
    // Equip sword_dao_1 (+15%)
    equipItem(testStatsWith, "sword_dao_1");
    assert.strictEqual(getEquippedQiMultiplier(testStatsWith), 1.15, "Active multiplier is 1.15");
    const qiInitWith = getCultivationState(testStatsWith, "cultivation").totalQi;
    assert.strictEqual(qiInitWith, 5.0, "Initial Qi before reading is 5.0 (no retroactive corruption)");

    // 4. Read the exact same 1 chapter event with bonus item equipped
    testStatsWith = recordCultivationProgress(testStatsWith, 1, false, 0, "cultivation");
    const qiAfterWith = getCultivationState(testStatsWith, "cultivation").totalQi;
    const gainWith = Math.round((qiAfterWith - qiInitWith) * 100) / 100;

    // 5. Compare gains: bonus must be applied functionally
    assert.strictEqual(gainWith, 1.15, "Gain with +15% item is exactly 1.15 Qi");
    assert.ok(gainWith > gainWithout, "Qi gain with bonus item must be greater than neutral gain");

    // 6. Cumulative single-chapter reads over 10 consecutive chapters
    let testStreak = {
      chaptersRead: 0,
      novelsCompleted: 0,
      inventory: ["sword_dao_1"],
      equippedItems: ["sword_dao_1"],
      cultivationThemes: {
        cultivation: { realmIndex: 0, stage: 1, exp: 0, totalExp: 0, chaptersRead: 0 }
      }
    };
    for (let c = 0; c < 10; c++) {
      testStreak = recordCultivationProgress(testStreak, 1, false, 0, "cultivation");
    }
    const streakQi = getCultivationState(testStreak, "cultivation").totalQi;
    assert.strictEqual(streakQi, 11.5, "10 chapters read 1-by-1 with +15% sword yield exactly 11.5 Qi (no integer truncation loss)");

    // 7. Stacking two items (+15% sword + +15% earrings = +30%)
    let testStack = {
      chaptersRead: 0,
      novelsCompleted: 0,
      inventory: ["sword_dao_1", "earrings_spirit_1"],
      equippedItems: ["sword_dao_1", "earrings_spirit_1"],
      cultivationThemes: {
        cultivation: { realmIndex: 0, stage: 1, exp: 0, totalExp: 0, chaptersRead: 0 }
      }
    };
    assert.strictEqual(Math.round(getEquippedQiMultiplier(testStack) * 100) / 100, 1.30);
    testStack = recordCultivationProgress(testStack, 1, false, 0, "cultivation");
    const stackGain = getCultivationState(testStack, "cultivation").totalQi;
    assert.strictEqual(stackGain, 1.30, "Single chapter with sword + earrings yields exactly 1.30 Qi (+30%)");

    console.log("  [PASS] Qi bonus items apply bonuses cleanly, update immediately, prevent duplicate stacking, and reward exact bonuses on chapter reading.");
  }

  // ----------------------------------------------------------------------------
  // SECTION 4: Visual Avatar Equipment Slots & Symmetrical Earrings
  // ----------------------------------------------------------------------------
  console.log("\n[Test 4] Visual Avatar Equipment Slots & Symmetrical Earrings:");
  {
    // A. Verify earrings_spirit_1 configuration has singleSvg and isPair
    const earringsConfig = ITEMS_CONFIG.earrings_spirit_1;
    assert.ok(earringsConfig, "earrings_spirit_1 must exist in ITEMS_CONFIG");
    assert.strictEqual(earringsConfig.isPair, true, "earrings_spirit_1 must have isPair: true");
    assert.ok(earringsConfig.singleSvg, "earrings_spirit_1 must have singleSvg");
    assert.ok(fs.existsSync(path.resolve(__dirname, "..", earringsConfig.singleSvg)), "singleSvg file must exist on disk");

    // B. Verify renderAvatarEquippedNodes renders TWO symmetrical nodes for earrings
    const statsWithEarrings = {
      equippedItems: ["earrings_spirit_1"]
    };
    const htmlSm = renderAvatarEquippedNodes(statsWithEarrings, "sm");
    assert.ok(htmlSm.includes("pos-earrings-left"), "Must render left earring node");
    assert.ok(htmlSm.includes("pos-earrings-right"), "Must render right earring node");
    assert.ok(htmlSm.includes("earring-single-left"), "Must apply earring-single-left class");
    assert.ok(htmlSm.includes("earring-single-right"), "Must apply earring-single-right class");

    // Verify left and right nodes are distinct elements
    const leftCount = (htmlSm.match(/pos-earrings-left/g) || []).length;
    const rightCount = (htmlSm.match(/pos-earrings-right/g) || []).length;
    assert.strictEqual(leftCount, 1, "Exactly one left earring node");
    assert.strictEqual(rightCount, 1, "Exactly one right earring node");

    // C. Verify CSS rules in popup.html cover all slots and earring positions
    assert.ok(popupHtml.includes(".pos-earrings-left"), "popup.html contains .pos-earrings-left");
    assert.ok(popupHtml.includes(".pos-earrings-right"), "popup.html contains .pos-earrings-right");
    assert.ok(popupHtml.includes(".pos-hat"), "popup.html contains .pos-hat");
    assert.ok(popupHtml.includes(".pos-glasses"), "popup.html contains .pos-glasses");
    assert.ok(popupHtml.includes(".pos-necklace"), "popup.html contains .pos-necklace");
    assert.ok(popupHtml.includes(".pos-armor"), "popup.html contains .pos-armor");
    assert.ok(popupHtml.includes(".pos-cape"), "popup.html contains .pos-cape");
    assert.ok(popupHtml.includes(".pos-sword"), "popup.html contains .pos-sword");
    assert.ok(popupHtml.includes(".pos-ring"), "popup.html contains .pos-ring");
    assert.ok(popupHtml.includes(".pos-relic"), "popup.html contains .pos-relic");
    assert.ok(popupHtml.includes(".pos-aura"), "popup.html contains .pos-aura");
    assert.ok(popupHtml.includes(".pos-pill"), "popup.html contains .pos-pill");
    assert.ok(popupHtml.includes(".pos-seal"), "popup.html contains .pos-seal");

    console.log("  [PASS] Earrings render symmetrically on left and right ears with dedicated single-earring SVG; all equipment slots styled.");
  }

  console.log("\n====================================================================");
  console.log(">>> ALL AUDIT V15 TESTS PASSED (100%)! <<<");
  console.log("====================================================================\n");
}

runAudit().catch((err) => {
  console.error("FATAL ERROR in test_qi_claiming_and_avatar_v15:", err);
  process.exit(1);
});
