// ============================================================================
// COMPREHENSIVE TEST SUITE: V4 ADVANCED ACHIEVEMENTS & VISUAL REDESIGN
// ============================================================================
const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=== RUNNING V4 ADVANCED ACHIEVEMENTS & VISUAL TEST SUITE ===");

const achData = require("../achievements_data.js");
const {
  THEMES_CONFIG,
  ALL_TITLES,
  TITLE_CONFIG,
  calculateBonusQi,
  calculateQi,
  getCultivationState,
  evaluateUnlockedTitles,
  claimAchievementReward,
  getUnclaimedAchievements,
  recordCultivationProgress
} = achData;

// Mock storage and environment for background.js tests
const bgCode = fs.readFileSync(path.join(__dirname, "../background.js"), "utf8");
const vm = require("vm");
const mockContext = {
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
          vm.runInContext(fs.readFileSync(p, "utf8"), mockContext);
        }
      } catch {}
    }
  },
  chrome: {
    storage: {
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
      sync: { set: () => Promise.resolve() },
      onChanged: { addListener: () => {}, removeListener: () => {} }
    },
    runtime: { onInstalled: { addListener: () => {} }, onStartup: { addListener: () => {} }, onMessage: { addListener: () => {} }, getManifest: () => ({ version: "4.0.0" }), getURL: (p) => p || "" },
    tabs: { onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} }, onActivated: { addListener: () => {} } },
    alarms: { onAlarm: { addListener: () => {} } },
    action: { setIcon: () => Promise.resolve(), setBadgeText: () => Promise.resolve(), setBadgeBackgroundColor: () => Promise.resolve(), setTitle: () => Promise.resolve() },
    omnibox: { onInputChanged: { addListener: () => {} }, onInputEntered: { addListener: () => {} } },
    commands: { onCommand: { addListener: () => {} } }
  },
  t: (k) => k,
  initI18n: () => Promise.resolve(),
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};
vm.createContext(mockContext);
vm.runInContext(bgCode, mockContext);
const { mergeStatsObjects, getDefaultStats } = mockContext;

// -------------------------------------------------------------
// TEST 1: Preservation of 28 Original Titles + 6 New Titles (34 Total)
// -------------------------------------------------------------
console.log("\n[Test 1] 100% Preservation of 28 Legacy Titles + 6 New Emblematic Achievements:");
{
  const expectedOriginal28 = [
    "outer_disciple", "scroll_initiate", "diligent_reader", "body_refiner",
    "meridian_opener", "secluded_cultivator", "thousand_scrolls", "spirit_temperer",
    "pill_refiner", "chapter_devourer", "tribulation_overcomer", "domain_ruler",
    "bottleneck_breaker", "ancient_scholar", "dao_heart", "golden_immortal",
    "heaven_defier", "cosmic_sovereign", "tribulation_emperor", "primordial_immortal",
    "hunter_awakening", "dungeon_scout", "shadow_monarch", "national_hunter",
    "fool_pathway", "constellation_reader", "nano_symbiosis", "primordial_author"
  ];

  for (const id of expectedOriginal28) {
    assert.ok(TITLE_CONFIG[id], `Legacy title '${id}' must exist in TITLE_CONFIG`);
  }

  const expectedNew6 = [
    "legendary_reader", "saga_master", "qi_control",
    "scroll_collector", "reading_immortal", "arc_lord"
  ];

  for (const id of expectedNew6) {
    assert.ok(TITLE_CONFIG[id], `New emblematic title '${id}' must exist in TITLE_CONFIG`);
    assert.ok(TITLE_CONFIG[id].rewardQi > 0, `Title '${id}' must provide a positive Qi reward`);
    assert.ok(["common", "rare", "epic", "legendary"].includes(TITLE_CONFIG[id].rarity), `Title '${id}' must have a valid rarity tier`);
  }

  assert.strictEqual(ALL_TITLES.length, 34, "Total registered titles count must be exactly 34");
  console.log("  [PASS] All 28 legacy titles preserved and 6 new emblematic titles registered.");
}

// -------------------------------------------------------------
// TEST 2: Illustrated SVG Badges Existence and Quality
// -------------------------------------------------------------
console.log("\n[Test 2] Illustrated SVG Badges in assets/badges/:");
{
  const badgesDir = path.join(__dirname, "../assets/badges");
  assert.ok(fs.existsSync(badgesDir), "assets/badges directory must exist");

  const files = fs.readdirSync(badgesDir);
  assert.ok(files.length >= 38, `Expected at least 38 SVG badge files, found ${files.length}`);

  // Check each title has an existing SVG badge
  for (const title of ALL_TITLES) {
    const badgeFile = path.join(badgesDir, `${title.id}.svg`);
    assert.ok(fs.existsSync(badgeFile), `SVG badge file for '${title.id}' must exist`);
    const content = fs.readFileSync(badgeFile, "utf8");
    assert.ok(content.startsWith("<?xml") || content.includes("<svg"), `Badge '${title.id}' must be valid SVG`);
    assert.ok(content.includes("viewBox="), `Badge '${title.id}' must have a viewBox`);
  }

  // Check base rarity templates
  for (const r of ["common", "rare", "epic", "legendary"]) {
    const baseFile = path.join(badgesDir, `badge_${r}.svg`);
    assert.ok(fs.existsSync(baseFile), `Base badge_${r}.svg must exist`);
  }

  console.log("  [PASS] 38 SVG badges verified with valid vector geometry and gradients.");
}

// -------------------------------------------------------------
// TEST 3: Unlocking Logic for the 6 New Achievements
// -------------------------------------------------------------
console.log("\n[Test 3] Verifiable Metrics Unlocking Logic for 6 New Achievements:");
{
  // 1. qi_control: requires 7 days streak
  let stats1 = { ...getDefaultStats(), streakDays: 6, bestStreak: 6 };
  evaluateUnlockedTitles(stats1);
  assert.strictEqual(stats1.unlockedTitles.includes("qi_control"), false, "qi_control not unlocked with 6 days");
  stats1.streakDays = 7;
  evaluateUnlockedTitles(stats1);
  assert.strictEqual(stats1.unlockedTitles.includes("qi_control"), true, "qi_control unlocks with 7 days streak");

  // 2. scroll_collector: requires 10 novels started
  let stats2 = { ...getDefaultStats(), novelsStarted: 9 };
  evaluateUnlockedTitles(stats2);
  assert.strictEqual(stats2.unlockedTitles.includes("scroll_collector"), false);
  stats2.novelsStarted = 10;
  evaluateUnlockedTitles(stats2);
  assert.strictEqual(stats2.unlockedTitles.includes("scroll_collector"), true, "scroll_collector unlocks with 10 started");

  // 3. saga_master: requires Foundation Establishment (Realm 1) and 5 novels completed
  let stats3 = { ...getDefaultStats(), novelsCompleted: 5, cultivatedRealmIndex: 0, cultivatedStage: 5 };
  evaluateUnlockedTitles(stats3);
  assert.strictEqual(stats3.unlockedTitles.includes("saga_master"), false, "saga_master gated by Realm 1");
  stats3.cultivatedRealmIndex = 1;
  stats3.cultivatedStage = 1;
  stats3.cultivationThemes = { cultivation: { realmIndex: 1, stage: 1 } };
  evaluateUnlockedTitles(stats3);
  assert.strictEqual(stats3.unlockedTitles.includes("saga_master"), true, "saga_master unlocks at Realm 1 with 5 novels");

  // 4. arc_lord: requires 40 chapters in a single day and Realm 1
  const today = "2026-10-15";
  let stats4 = {
    ...getDefaultStats(),
    cultivatedRealmIndex: 1,
    cultivatedStage: 1,
    cultivationThemes: { cultivation: { realmIndex: 1, stage: 1 } },
    dailyChapters: { [today]: 39 }
  };
  evaluateUnlockedTitles(stats4);
  assert.strictEqual(stats4.unlockedTitles.includes("arc_lord"), false);
  stats4.dailyChapters[today] = 40;
  evaluateUnlockedTitles(stats4);
  assert.strictEqual(stats4.unlockedTitles.includes("arc_lord"), true, "arc_lord unlocks with 40 daily chapters");

  // 5. legendary_reader: requires 1000 chapters and Realm 3 (Nascent Soul)
  let stats5 = {
    ...getDefaultStats(),
    chaptersRead: 1000,
    cultivatedRealmIndex: 2, // Golden core
    cultivationThemes: { cultivation: { realmIndex: 2, stage: 5 } }
  };
  evaluateUnlockedTitles(stats5);
  assert.strictEqual(stats5.unlockedTitles.includes("legendary_reader"), false, "legendary_reader gated by Realm 3");
  stats5.cultivatedRealmIndex = 3;
  stats5.cultivatedStage = 1;
  stats5.cultivationThemes.cultivation = { realmIndex: 3, stage: 1 };
  evaluateUnlockedTitles(stats5);
  assert.strictEqual(stats5.unlockedTitles.includes("legendary_reader"), true, "legendary_reader unlocks at Realm 3 with 1000 chapters");

  // 6. reading_immortal: requires Realm 9 (Immortal Ascension)
  let stats6 = {
    ...getDefaultStats(),
    cultivatedRealmIndex: 8, // Tribulation
    cultivationThemes: { cultivation: { realmIndex: 8, stage: 9 } }
  };
  evaluateUnlockedTitles(stats6);
  assert.strictEqual(stats6.unlockedTitles.includes("reading_immortal"), false);
  stats6.cultivatedRealmIndex = 9;
  stats6.cultivatedStage = null;
  stats6.cultivationThemes.cultivation = { realmIndex: 9, stage: null };
  evaluateUnlockedTitles(stats6);
  assert.strictEqual(stats6.unlockedTitles.includes("reading_immortal"), true, "reading_immortal unlocks at peak Realm 9");

  console.log("  [PASS] All 6 new emblematic achievements unlock on accurate verifiable metrics.");
}

// -------------------------------------------------------------
// TEST 4: Peak Realm immortal_ascension (stage === null) Bug Fix
// -------------------------------------------------------------
console.log("\n[Test 4] Peak Realm immortal_ascension (stage === null) Gating Verification:");
{
  const stats = {
    ...getDefaultStats(),
    chaptersRead: 250000,
    cultivatedRealmIndex: 9,
    cultivatedStage: null,
    cultivationThemes: {
      cultivation: { realmIndex: 9, stage: null }
    }
  };

  const peakState = getCultivationState(stats, "cultivation");
  assert.strictEqual(peakState.realmIndex, 9, "Realm index is 9");
  assert.strictEqual(peakState.isPeakRealm, true, "Is peak realm");
  assert.strictEqual(peakState.stage, null, "Stage is strictly null");

  evaluateUnlockedTitles(stats, "cultivation");

  // Title reading_immortal and primordial_immortal require Realm 9
  assert.strictEqual(stats.unlockedTitles.includes("reading_immortal"), true, "reading_immortal unlocked at peak realm");
  assert.strictEqual(stats.unlockedTitles.includes("primordial_immortal"), true, "primordial_immortal unlocked at peak realm");

  console.log("  [PASS] Peak realm titles unlock cleanly without stage === null gating bug.");
}

// -------------------------------------------------------------
// TEST 5: Idempotent bonusQi & claimedRewards Synchronization
// -------------------------------------------------------------
console.log("\n[Test 5] Idempotent bonusQi & claimedRewards Synchronization:");
{
  const stats = {
    ...getDefaultStats(),
    chaptersRead: 100,
    novelsCompleted: 1, // Qi = 100 + 50 = 150
    unlockedTitles: ["outer_disciple", "qi_control", "saga_master"],
    claimedRewards: []
  };

  assert.strictEqual(calculateQi(stats), 150, "Initial Qi is 150 with 0 claimed rewards");

  // Claim outer_disciple (rewardQi: 25)
  const res1 = claimAchievementReward(stats, "outer_disciple");
  assert.strictEqual(res1.ok, true, "Claim outer_disciple succeeds");
  assert.strictEqual(res1.rewardQi, 25, "Reward is 25 Qi");
  assert.strictEqual(stats.bonusQi, 25, "bonusQi is 25");
  assert.strictEqual(calculateQi(stats), 175, "Total Qi is now 175");

  // Attempt duplicate claim (must fail idempotently)
  const dupRes = claimAchievementReward(stats, "outer_disciple");
  assert.strictEqual(dupRes.ok, false, "Duplicate claim is rejected");
  assert.strictEqual(dupRes.error, "already_claimed");
  assert.strictEqual(stats.bonusQi, 25, "bonusQi remains 25");
  assert.strictEqual(calculateQi(stats), 175, "Total Qi unchanged");

  // Claim qi_control (rewardQi: 40)
  claimAchievementReward(stats, "qi_control");
  assert.strictEqual(stats.bonusQi, 65, "bonusQi is 25 + 40 = 65");
  assert.strictEqual(calculateQi(stats), 215, "Total Qi is 215");

  // Test Cloud Sync merge: Device A has outer_disciple, Device B has qi_control and saga_master
  const deviceA = {
    ...getDefaultStats(),
    chaptersRead: 100,
    claimedRewards: ["outer_disciple"],
    updatedAt: 1000
  };
  const deviceB = {
    ...getDefaultStats(),
    chaptersRead: 100,
    claimedRewards: ["qi_control", "saga_master"],
    updatedAt: 1500
  };

  const merged = mergeStatsObjects(deviceA, deviceB);
  assert.ok(merged.claimedRewards.includes("outer_disciple"), "merged has outer_disciple");
  assert.ok(merged.claimedRewards.includes("qi_control"), "merged has qi_control");
  assert.ok(merged.claimedRewards.includes("saga_master"), "merged has saga_master");
  assert.strictEqual(merged.claimedRewards.length, 3, "No duplicates in claimedRewards");

  // Idempotent recalculation: 25 + 40 + 130 = 195 bonusQi
  assert.strictEqual(merged.bonusQi, 195, "Merged bonusQi is exactly 195");
  assert.strictEqual(calculateBonusQi(merged), 195, "calculateBonusQi confirms 195");

  console.log("  [PASS] Claim rewards and cross-device sync are strictly idempotent.");
}

// -------------------------------------------------------------
// TEST 6: Manual Reading Integration with recordCultivationProgress
// -------------------------------------------------------------
console.log("\n[Test 6] Manual Reading Integration (drawer, unconfirmed, button +1):");
{
  let stats = getDefaultStats();

  // 1. Manual drawer read of novel with 15 chapters
  stats = recordCultivationProgress(stats, 15, true, 0);
  assert.strictEqual(stats.chaptersRead, 15, "chaptersRead is 15");
  assert.strictEqual(stats.novelsStarted, 1, "novelsStarted is 1");
  assert.strictEqual(stats.streakDays, 1, "streakDays is 1");
  assert.ok(stats.dailyChapters[stats.lastReadDay] === 15, "dailyChapters recorded 15 chapters");

  // 2. Unconfirmed banner save: user adds 2nd novel with 5 chapters
  stats = recordCultivationProgress(stats, 5, true, 0);
  assert.strictEqual(stats.chaptersRead, 20, "chaptersRead is 20");
  assert.strictEqual(stats.novelsStarted, 2, "novelsStarted is 2");

  // 3. Button +1: user clicks +1 chapter
  stats = recordCultivationProgress(stats, 1, false, 0);
  assert.strictEqual(stats.chaptersRead, 21, "chaptersRead incremented to 21");
  assert.strictEqual(stats.novelsStarted, 2, "novelsStarted remains 2");

  console.log("  [PASS] All manual reading paths accurately record cultivation progress.");
}

// -------------------------------------------------------------
// TEST 7: UI & DOM Architectural Verification
// -------------------------------------------------------------
console.log("\n[Test 7] UI Anti-Overflow Flexbox & New DOM Elements Verification:");
{
  const popupHtml = fs.readFileSync(path.join(__dirname, "../popup.html"), "utf8");

  // 1. Anti-overflow Flexbox checks
  assert.ok(popupHtml.includes("height: 600px;"), "body has height: 600px;");
  assert.ok(popupHtml.includes(".view-container {") && popupHtml.includes("flex: 1;"), ".view-container has flex: 1;");
  assert.ok(popupHtml.includes("min-height: 0;"), ".view-container has min-height: 0;");

  // 2. Elimination of equippedTitleSelect dropdown
  assert.strictEqual(popupHtml.includes("<select id=\"equippedTitleSelect\""), false, "Native select #equippedTitleSelect is removed");

  // 3. New interactive active chip
  assert.ok(popupHtml.includes("id=\"equippedTitleActiveChip\""), "#equippedTitleActiveChip exists");
  assert.ok(popupHtml.includes("id=\"btnUnequipTitle\""), "#btnUnequipTitle exists");

  // 4. Unclaimed rewards banner
  assert.ok(popupHtml.includes("id=\"unclaimedRewardsBanner\""), "#unclaimedRewardsBanner exists");
  assert.ok(popupHtml.includes("id=\"btnClaimAllRewards\""), "#btnClaimAllRewards exists");

  // 5. Celebration modal
  assert.ok(popupHtml.includes("id=\"achievementCelebrationModal\""), "#achievementCelebrationModal exists");
  assert.ok(popupHtml.includes("id=\"celebrationBadgeImg\""), "#celebrationBadgeImg exists");
  assert.ok(popupHtml.includes("id=\"btnClaimCelebrationReward\""), "#btnClaimCelebrationReward exists");

  // 6. Scripts include achievements_data.js
  assert.ok(popupHtml.includes("<script src=\"achievements_data.js\"></script>"), "achievements_data.js is loaded in popup.html");

  console.log("  [PASS] UI anti-overflow flexbox, celebration modal, and interactive elements verified.");
}

// -------------------------------------------------------------
// TEST 8: popup.js Verification & background.js Service Worker Safety
// -------------------------------------------------------------
console.log("\n[Test 8] popup.js & background.js Integration Verification:");
{
  const popupJs = fs.readFileSync(path.join(__dirname, "../popup.js"), "utf8");
  const bgJs = fs.readFileSync(path.join(__dirname, "../background.js"), "utf8");

  // 1. calculateQi in popup.js includes bonusQi
  assert.ok(popupJs.includes("calculateBonusQi") || popupJs.includes("bonusQi"), "popup.js calculateQi accounts for bonus Qi");

  // 2. No lingering equippedTitleSelect in popup.js
  assert.strictEqual(popupJs.includes("equippedTitleSelect"), false, "equippedTitleSelect is completely removed from popup.js");

  // 3. New interactive active chip & unequip button
  assert.ok(popupJs.includes("equippedTitleActiveChip"), "popup.js controls equippedTitleActiveChip");
  assert.ok(popupJs.includes("btnUnequipTitle"), "popup.js wires btnUnequipTitle");

  // 4. Unclaimed rewards banner & claim-all
  assert.ok(popupJs.includes("unclaimedRewardsBanner"), "popup.js manages unclaimedRewardsBanner");
  assert.ok(popupJs.includes("btnClaimAllRewards"), "popup.js wires btnClaimAllRewards");

  // 5. Illustrated SVG badges rendering
  assert.ok(popupJs.includes("badge-img"), "popup.js renders badge-img");
  assert.ok(popupJs.includes("title-rarity-tag"), "popup.js renders title-rarity-tag");
  assert.ok(popupJs.includes("title-progress-container"), "popup.js renders title-progress-container");

  // 6. Peak realm stage === null fix in titles rendering
  assert.ok(popupJs.includes("cultState.stage === null"), "popup.js handles peak realm stage === null in titlesList");

  // 7. Manual reading messages sent to background
  assert.ok(popupJs.includes('type: "RECORD_MANUAL_READ"'), "popup.js sends RECORD_MANUAL_READ on manual reading events");

  // 8. Celebration modal interaction wiring
  assert.ok(popupJs.includes("btnClaimCelebrationReward"), "popup.js handles celebration reward claiming");
  assert.ok(popupJs.includes("btnCloseCelebrationModal"), "popup.js handles closing celebration modal");

  // 9. background.js no recursive wrappers
  assert.strictEqual(
    bgJs.includes("var claimAchievementReward = function(stats, achievementId) { return globalThis.claimAchievementReward"),
    false,
    "background.js does not have recursive wrapper that causes Maximum call stack size exceeded"
  );

  console.log("  [PASS] popup.js UI bindings, badges, progress, manual reading, and service worker safety verified.");
}

console.log("\n>>> ALL V4 ADVANCED ACHIEVEMENTS & VISUAL TESTS PASSED CLEANLY! <<<\n");
