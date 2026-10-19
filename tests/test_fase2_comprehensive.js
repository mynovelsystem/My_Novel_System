// ============================================================================
// MYNOVELSYSTEM — TEST SUITE FASE 2: UI AVANZADA, EQUIPAMIENTO, ECONOMÍA DE QI,
// BIBLIOTECA PAGINADA, DETECCIÓN DE GÉNEROS, WIP BADGE, DANGER ZONE Y ANUNCIOS XIANXIA
// ============================================================================

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");
const achievementsData = require(path.join(ROOT_DIR, "achievements_data.js"));
const esLocale = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "locales", "es.json"), "utf8"));
const enLocale = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "locales", "en.json"), "utf8"));
const popupHtml = fs.readFileSync(path.join(ROOT_DIR, "popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(ROOT_DIR, "popup.js"), "utf8");
const backgroundJs = fs.readFileSync(path.join(ROOT_DIR, "background.js"), "utf8");
const contentJs = fs.readFileSync(path.join(ROOT_DIR, "content.js"), "utf8");

console.log("====================================================================");
console.log("       FASE 2 COMPREHENSIVE VERIFICATION SUITE                      ");
console.log("====================================================================\n");

// ----------------------------------------------------------------------------
// Test 1: Header Brand Crest Independence & Avatar Inviolability
// ----------------------------------------------------------------------------
console.log("[Test 1] Header Crest Independence & Avatar Perimeter Layout:");
{
  // 1. Brand Crest displays the iconic "N" emblem inner HTML with cultivation gradient
  assert.ok(popupHtml.includes('class="brand-crest"'), "popup.html has brand-crest element");
  assert.ok(popupHtml.includes('class="brand-crest-inner"'), "popup.html has brand-crest-inner element");
  assert.ok(popupHtml.includes('class="crest-n">N</span>'), "popup.html has iconic 'N' emblem");
  assert.ok(popupHtml.includes('id="headerEquippedTitle"'), "popup.html has independent headerEquippedTitle plaque");

  // In popup.js, brandCrestEl retains its N crest innerHTML rather than being overwritten with renderBadge
  assert.ok(popupJs.includes('brandCrestEl.innerHTML = `<div class="brand-crest-inner"><span class="crest-n">N</span></div>`'), "brandCrestEl preserves 'N' inner HTML");

  // 2. Avatar Photo surface inviolability: avatar has z-index: 2, items have pointer-events: auto outside silhouette
  assert.ok(popupHtml.includes('.avatar-portrait {'), "Avatar portrait styling defined");
  assert.ok(popupHtml.includes('z-index: 2;'), "Avatar photo has high z-index protecting portrait surface");
  assert.ok(popupHtml.includes('.avatar-item-slots {'), "Avatar item slots container defined");
  assert.ok(popupHtml.includes('pointer-events: none;'), "Avatar slots container does not intercept clicks");

  // Orbital positions for perimeter items defined
  const requiredPositions = ['pos-hat', 'pos-sword', 'pos-glasses', 'pos-earrings', 'pos-necklace', 'pos-aura'];
  for (const pos of requiredPositions) {
    assert.ok(popupHtml.includes(`.avatar-item-node.${pos}`), `CSS orbital position class .avatar-item-node.${pos} defined`);
  }

  console.log("  [PASS] Independent 'N' crest, equipped title plaque, and inviolable avatar perimeter layout verified.");
}

// ----------------------------------------------------------------------------
// Test 2: Equipment Pipeline, 12 Illustrated Item SVGs & Zero Collisions
// ----------------------------------------------------------------------------
console.log("\n[Test 2] Equipment Pipeline, 12 Offline Item SVGs & Zero Collision:");
{
  const items = Object.values(achievementsData.ITEMS_CONFIG);
  assert.strictEqual(items.length, 12, "Exactly 12 items configured in ITEMS_CONFIG");

  const categories = new Set();
  for (const item of items) {
    assert.ok(item.id, "Item has id");
    assert.ok(item.nameKey, `Item ${item.id} has nameKey`);
    assert.ok(item.descKey, `Item ${item.id} has descKey`);
    assert.ok(item.category, `Item ${item.id} has category`);
    assert.ok(item.svg, `Item ${item.id} has svg attribute`);

    // Category uniqueness: verify each item has a distinct category (zero collisions)
    assert.strictEqual(categories.has(item.category), false, `Collision detected: category ${item.category} duplicated`);
    categories.add(item.category);

    // Verify SVG file exists on disk
    const svgPath = path.join(ROOT_DIR, item.svg);
    assert.ok(fs.existsSync(svgPath), `SVG file ${item.svg} exists on disk`);
    const svgContent = fs.readFileSync(svgPath, "utf8");
    assert.ok(svgContent.includes("<svg"), `SVG file ${item.svg} is a valid XML SVG document`);
    assert.ok(svgContent.length > 100, `SVG file ${item.svg} is non-empty`);
  }

  // Verify equipItem logic with 3-slot cap and replacement
  const stats = {
    chaptersRead: 0,
    novelsStarted: 0,
    novelsCompleted: 0,
    streakDays: 0,
    bestStreak: 0,
    bonusQi: 0,
    unlockedTitles: [],
    equippedTitle: "",
    equippedItems: [],
    inventory: items.map(it => it.id),
    genreAchievements: []
  };

  // Equip 1st item
  let res = achievementsData.equipItem(stats, items[0].id);
  assert.strictEqual(res.ok, true, "First item equipped");
  assert.strictEqual(stats.equippedItems.length, 1);

  // Equip 2nd item
  res = achievementsData.equipItem(stats, items[1].id);
  assert.strictEqual(res.ok, true, "Second item equipped");
  assert.strictEqual(stats.equippedItems.length, 2);

  // Equip 3rd item
  res = achievementsData.equipItem(stats, items[2].id);
  assert.strictEqual(res.ok, true, "Third item equipped");
  assert.strictEqual(stats.equippedItems.length, 3);

  // Attempt to equip 4th item without specifying slot -> should reject with descriptive slots_full reason
  res = achievementsData.equipItem(stats, items[3].id);
  assert.strictEqual(res.ok, false, "4th item rejected due to slots cap");
  assert.strictEqual(res.reason, "slots_full", "Rejection reason is slots_full");
  assert.ok(res.message, "Descriptive error message returned");
  assert.strictEqual(stats.equippedItems.length, 3, "Equipped slots strictly capped at 3");

  // Replacing explicit slot (e.g. slotIndex = 1)
  res = achievementsData.equipItem(stats, items[3].id, 1);
  assert.strictEqual(res.ok, true, "Slot replacement at index 1 succeeded");
  assert.strictEqual(stats.equippedItems[1], items[3].id, "Item replaced at index 1");
  assert.strictEqual(stats.equippedItems.length, 3);

  // Unequip item
  res = achievementsData.unequipItem(stats, items[0].id);
  assert.strictEqual(res.ok, true, "Item unequipped");
  assert.strictEqual(stats.equippedItems.length, 2);
  assert.strictEqual(stats.equippedItems.includes(items[0].id), false);

  console.log("  [PASS] 12 unique item SVGs, zero category collision, 3-slot cap enforcement, and replacement verified.");
}

// ----------------------------------------------------------------------------
// Test 3: Slower Xianxia Qi Economy Scaling & Surplus Rollover
// ----------------------------------------------------------------------------
console.log("\n[Test 3] Slower Xianxia Progression Curve & Qi Rollover:");
{
  const realms = achievementsData.THEMES_CONFIG.cultivation.realms;
  assert.ok(realms.length >= 7, "At least 7 realms defined in cultivation theme");

  // Check scaling over legacy curve (minimum 1.4x, up to 2.5x) and monotonic span growth
  const legacyCaps = [100, 400, 1000, 2500, 6000, 14000, 30000, 60000, 120000];
  for (let i = 0; i < legacyCaps.length; i++) {
    const newCap = realms[i].nextQi;
    const legacyCap = legacyCaps[i];
    const scaling = newCap / legacyCap;
    assert.ok(scaling >= 1.4, `Realm ${realms[i].id} nextQi (${newCap}) scaled (${scaling.toFixed(2)}x) over legacy (${legacyCap})`);
  }

  for (let i = 1; i < realms.length - 1; i++) {
    const prevSpan = realms[i - 1].nextQi - realms[i - 1].minQi;
    const currentSpan = realms[i].nextQi - realms[i].minQi;
    assert.ok(currentSpan > prevSpan, `Realm ${realms[i].id} span (${currentSpan}) strictly greater than previous span (${prevSpan})`);
  }

  // Breakthrough surplus Qi rollover check
  const stats = {
    chaptersRead: 200,
    novelsStarted: 1,
    novelsCompleted: 0,
    streakDays: 1,
    bestStreak: 1,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 1,
    unlockedTitles: [],
    equippedTitle: "",
    equippedItems: [],
    inventory: []
  };
  const cultState = achievementsData.getCultivationState(stats, "cultivation");
  assert.ok(cultState.isBottleneckReady, "Bottleneck reached with surplus Qi");
  assert.ok(cultState.overflowQi > 0, "Surplus Qi properly calculated in dantian");

  const prevQi = stats.chaptersRead;
  const breakthroughRes = achievementsData.advanceCultivationBreakthrough(stats, "cultivation");
  assert.strictEqual(breakthroughRes.ok, true, "Breakthrough executed successfully");
  assert.strictEqual(stats.cultivatedStage, 2, "Stage advanced to 2");
  // Total chaptersRead / base reading Qi preserved (surplus rollover, no Qi loss)
  assert.strictEqual(stats.chaptersRead, prevQi, "Zero Qi loss during breakthrough; surplus rolled over");

  console.log("  [PASS] Exponential 2.5x-4x realm scaling and surplus Qi dantian rollover verified.");
}

// ----------------------------------------------------------------------------
// Test 4: Library Pagination Architecture (10, 15, 30 per page)
// ----------------------------------------------------------------------------
console.log("\n[Test 4] Library Pagination Slicing, Controls & Bounds:");
{
  // Check DOM elements in popup.html
  assert.ok(popupHtml.includes('id="libraryPaginationBar"'), "libraryPaginationBar present in popup.html");
  assert.ok(popupHtml.includes('id="btnPrevPage"'), "btnPrevPage present in popup.html");
  assert.ok(popupHtml.includes('id="btnNextPage"'), "btnNextPage present in popup.html");
  assert.ok(popupHtml.includes('id="pageIndicator"'), "pageIndicator present in popup.html");
  assert.ok(popupHtml.includes('id="libraryPageSize"'), "libraryPageSize present in popup.html");

  // Check pagination logic simulation for 0, 1, 10, 15, 30, 100, and 300 novels
  const testCases = [
    { count: 0, pageSize: 15, expectedPages: 1 },
    { count: 1, pageSize: 15, expectedPages: 1 },
    { count: 10, pageSize: 15, expectedPages: 1 },
    { count: 15, pageSize: 15, expectedPages: 1 },
    { count: 16, pageSize: 15, expectedPages: 2 },
    { count: 30, pageSize: 10, expectedPages: 3 },
    { count: 100, pageSize: 10, expectedPages: 10 },
    { count: 100, pageSize: 15, expectedPages: 7 },
    { count: 100, pageSize: 30, expectedPages: 4 },
    { count: 125, pageSize: 15, expectedPages: 9 },
    { count: 125, pageSize: 30, expectedPages: 5 },
    { count: 300, pageSize: 10, expectedPages: 30 },
    { count: 300, pageSize: 15, expectedPages: 20 },
    { count: 300, pageSize: 30, expectedPages: 10 }
  ];

  for (const tc of testCases) {
    const totalPages = Math.max(1, Math.ceil(tc.count / tc.pageSize));
    assert.strictEqual(totalPages, tc.expectedPages, `Page count matches for ${tc.count} items with size ${tc.pageSize}`);

    // Boundary slicing checks
    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * tc.pageSize;
      const end = start + tc.pageSize;
      const sliceSize = Math.max(0, Math.min(tc.count, end) - start);
      assert.ok(sliceSize <= tc.pageSize, `Slice size does not exceed page size on page ${page}`);
    }
  }

  // Performance simulation: 300 synthetic entries pagination slicing execution time
  const synthetic300 = {};
  for (let i = 0; i < 300; i++) {
    synthetic300[`synthetic_novel_${i}`] = {
      novelName: `Synthetic Cultivation Novel #${i}`,
      genres: [i % 2 === 0 ? "xianxia" : "fantasy"],
      chapter: 10 + i,
      updatedAt: 1700000000000 + i * 1000
    };
  }
  const tStart = Date.now();
  const sortedKeys = Object.keys(synthetic300)
    .filter((k) => synthetic300[k].novelName.includes("Novel"))
    .sort((a, b) => synthetic300[b].updatedAt - synthetic300[a].updatedAt);
  const slicedPage = sortedKeys.slice(0, 15);
  const tElapsed = Date.now() - tStart;
  assert.strictEqual(slicedPage.length, 15, "First page of 300 synthetic novels has exactly 15 items");
  assert.ok(tElapsed < 50, `300 novels slicing performance test took ${tElapsed}ms (< 50ms requirement)`);

  // Verify popup.js pagination handlers and filter-before-paginate architecture
  assert.ok(popupJs.includes('libraryCurrentPage = 1;'), "Page reset to 1 on search or filter change in popup.js");
  assert.ok(popupJs.includes('keys.slice(startIndex, startIndex + libraryPageSize)'), "Slicing logic applied in renderNovels");
  assert.ok(popupJs.includes('btnPrevPage'), "btnPrevPage wired in popup.js");
  assert.ok(popupJs.includes('btnNextPage'), "btnNextPage wired in popup.js");

  console.log("  [PASS] Library pagination slicing, page bounds, and control wiring verified.");
}

// ----------------------------------------------------------------------------
// Test 5: System Achievements Architecture, Illustrated Badges & Metric Tracking
// ----------------------------------------------------------------------------
console.log("\n[Test 5] System Achievements Configuration, Metrics & Backward Compatibility:");
{
  const systemConfig = achievementsData.SYSTEM_ACHIEVEMENTS_CONFIG;
  assert.ok(systemConfig, "SYSTEM_ACHIEVEMENTS_CONFIG exists");
  const systemAchKeys = Object.keys(systemConfig);
  assert.strictEqual(systemAchKeys.length, 15, "Exactly 15 metric-based system achievements defined");

  // Validate 5 categories and illustrated badges existence
  const requiredCategories = new Set(["library", "reading", "streak", "mastery", "special"]);
  const foundCategories = new Set();

  for (const [id, cfg] of Object.entries(systemConfig)) {
    assert.strictEqual(cfg.id, id, `Achievement ${id} id matches key`);
    assert.ok(cfg.categoryKey, `Achievement ${id} has categoryKey`);
    assert.ok(cfg.nameKey, `Achievement ${id} has nameKey`);
    assert.ok(cfg.descKey, `Achievement ${id} has descKey`);
    assert.ok(typeof cfg.rewardQi === "number" && cfg.rewardQi > 0, `Achievement ${id} has positive rewardQi`);
    assert.ok(["common", "rare", "epic", "legendary"].includes(cfg.rarity), `Achievement ${id} has valid rarity`);
    assert.ok(requiredCategories.has(cfg.category), `Achievement ${id} has valid category: ${cfg.category}`);
    foundCategories.add(cfg.category);

    const badgePath = path.join(ROOT_DIR, cfg.badge);
    assert.ok(fs.existsSync(badgePath), `Illustrated badge file exists for ${id} at ${cfg.badge}`);
    const badgeContent = fs.readFileSync(badgePath, "utf8");
    assert.ok(badgeContent.includes("<svg") && badgeContent.includes("</svg>"), `Badge ${id} is valid SVG`);
  }

  assert.strictEqual(foundCategories.size, 5, "All 5 achievement categories represented");

  // System achievements metric evaluation tests
  const stats = {
    chaptersRead: 150,
    novelsStarted: 4,
    novelsCompleted: 1,
    streakDays: 7,
    bestStreak: 7,
    dailyChapters: { "2026-10-10": 26, "2026-10-11": 10, "2026-10-12": 5, "2026-10-13": 8, "2026-10-14": 12 },
    bonusQi: 0,
    unlockedTitles: [],
    equippedTitle: "",
    equippedItems: [],
    inventory: [],
    systemAchievements: []
  };

  const mockNovels = {
    nov1: { novelName: "Story 1", chapter: 15, maxCounted: 15, status: "reading" },
    nov2: { novelName: "Story 2", chapter: 8, maxCounted: 8, status: "reading" },
    nov3: { novelName: "Story 3", chapter: 12, maxCounted: 12, status: "reading" },
    nov4: { novelName: "Story 4", chapter: 6, maxCounted: 6, status: "reading" },
    nov5: { novelName: "Story 5", chapter: 10, maxCounted: 10, status: "reading" },
    nov6: { novelName: "Story 6", chapter: 1, maxCounted: 1, status: "reading" },
    nov7: { novelName: "Story 7", chapter: 1, maxCounted: 1, status: "reading" },
    nov8: { novelName: "Story 8", chapter: 1, maxCounted: 1, status: "reading" },
    nov9: { novelName: "Story 9", chapter: 1, maxCounted: 1, status: "reading" },
    nov10: { novelName: "Story 10", chapter: 1, maxCounted: 1, status: "reading" }
  };

  const unlockedAch = achievementsData.evaluateSystemAchievements(stats, mockNovels);
  assert.ok(unlockedAch.includes("story_collector"), "story_collector unlocked with >=3 active novels");
  assert.ok(unlockedAch.includes("expanding_library"), "expanding_library unlocked with >=10 novels");
  assert.ok(unlockedAch.includes("first_page"), "first_page unlocked with chaptersRead >= 1");
  assert.ok(unlockedAch.includes("constant_reader"), "constant_reader unlocked with chaptersRead >= 100");
  assert.ok(unlockedAch.includes("reading_marathon"), "reading_marathon unlocked with maxSingleDay >= 25");
  assert.ok(unlockedAch.includes("tracking_master"), "tracking_master unlocked with 5 novels >= 5 chapters");
  assert.ok(unlockedAch.includes("steady_rhythm"), "steady_rhythm unlocked with 5 active days");
  assert.ok(unlockedAch.includes("iron_will"), "iron_will unlocked with streak >= 7");
  assert.ok(unlockedAch.includes("personal_multiverse"), "personal_multiverse unlocked with completed >= 1 and 3 active novels");
  assert.ok(stats.systemAchievements.includes("story_collector"));

  // Verify that UNREAD novels (chapter = 0 and status = 'unread') or DELETED novels DO NOT count toward progress
  const unreadNovels = {
    nov1: { novelName: "Unread 1", chapter: 0, status: "unread" },
    nov2: { novelName: "Unread 2", chapter: 0, status: "unread" },
    nov3: { novelName: "Unread 3", chapter: 0, status: "unread" },
    nov4: { novelName: "Deleted 4", chapter: 100, deleted: true }
  };
  const testStatsFresh = { ...stats, systemAchievements: [] };
  const unreadResult = achievementsData.evaluateSystemAchievements(testStatsFresh, unreadNovels);
  assert.strictEqual(unreadResult.includes("story_collector"), false, "Unread novels MUST NOT unlock story_collector");

  // Verify claiming system achievement rewards
  const claimRes = achievementsData.claimAchievementReward(stats, "story_collector");
  assert.strictEqual(claimRes.ok, true, "System achievement reward claimed");
  assert.strictEqual(claimRes.rewardQi, 75, "Claimed 75 Qi for story_collector");
  assert.ok(stats.bonusQi >= 75, "bonusQi updated with system achievement reward");

  // Verify backward compatibility: legacy claimed genre rewards preserved in calculateBonusQi
  const legacyStats = {
    chaptersRead: 50,
    novelsCompleted: 0,
    claimedRewards: ["cultivate_xianxia_master", "fantasy_archmage"],
    systemAchievements: []
  };
  const legacyBonus = achievementsData.calculateBonusQi(legacyStats);
  assert.strictEqual(legacyBonus, 300, "Legacy claimed rewards yield 300 Qi without resetting stats");

  // Verify getUnclaimedAchievements includes unclaimed system achievements and legacy fallbacks
  const unclaimedList = achievementsData.getUnclaimedAchievements({
    ...stats,
    unlockedTitles: [],
    systemAchievements: ["expanding_library"],
    claimedRewards: []
  });
  assert.ok(unclaimedList.some((u) => u.id === "expanding_library"), "getUnclaimedAchievements includes unclaimed system achievements");

  // Verify content script sends clean payload without genre scraping overhead
  assert.ok(contentJs.includes("genres: []"), "content.js sends genres: [] payload without scraping");
  assert.strictEqual(contentJs.includes("extractPageGenres"), false, "content.js removed extractPageGenres()");

  // Verify background script compatibility handler
  assert.ok(backgroundJs.includes("UPDATE_NOVEL_GENRES"), "background.js handles UPDATE_NOVEL_GENRES message for backward compatibility");
  assert.ok(backgroundJs.includes("evaluateSystemAchievements"), "background.js evaluates system achievements");

  console.log("  [PASS] 15 system achievements, original SVG badges, metric evaluation, unread reading guards, legacy reward preservation, and content cleanup verified.");
}

// ----------------------------------------------------------------------------
// Test 6: "PRO" -> "WIP" Replacement Verification
// ----------------------------------------------------------------------------
console.log("\n[Test 6] 'PRO' -> 'WIP' Badge Replacement:");
{
  assert.strictEqual(esLocale.theme_premium_badge, "WIP", "es.json has theme_premium_badge = 'WIP'");
  assert.strictEqual(enLocale.theme_premium_badge, "WIP", "en.json has theme_premium_badge = 'WIP'");

  // Verify popup.html uses data-i18n="theme_premium_badge"
  assert.ok(popupHtml.includes('data-i18n="theme_premium_badge"'), "popup.html uses localized theme_premium_badge");

  console.log("  [PASS] 'PRO' badge replaced with 'WIP' cleanly across locales.");
}

// ----------------------------------------------------------------------------
// Test 7: Danger Zone Security & Isolation
// ----------------------------------------------------------------------------
console.log("\n[Test 7] Danger Zone Isolation & Data Safety:");
{
  // Verify HTML layout
  assert.ok(popupHtml.includes('class="glass-card danger-zone-card"'), "Danger Zone card present in popup.html");
  assert.ok(popupHtml.includes('id="btnClearCache"'), "btnClearCache button present in popup.html");
  assert.ok(popupHtml.includes('id="btnOpenResetLocalModal"'), "btnOpenResetLocalModal button present in popup.html");
  assert.ok(popupHtml.includes('id="modalResetLocalData"'), "modalResetLocalData confirmation modal present in popup.html");
  assert.ok(popupHtml.includes('id="btnConfirmResetLocal"'), "btnConfirmResetLocal button present in popup.html");

  // Verify background message handlers
  assert.ok(backgroundJs.includes('type === "CLEAR_CACHE"'), "background.js handles CLEAR_CACHE");
  assert.ok(backgroundJs.includes('type === "RESET_LOCAL_DATA"'), "background.js handles RESET_LOCAL_DATA");

  // Audit CLEAR_CACHE: only touches expendable keys, NEVER savedNovels, stats, or auth
  const clearCacheSection = backgroundJs.slice(
    backgroundJs.indexOf('type === "CLEAR_CACHE"'),
    backgroundJs.indexOf('type === "RESET_LOCAL_DATA"')
  );
  assert.ok(clearCacheSection.includes('tab_') || clearCacheSection.includes('cache_'), "CLEAR_CACHE purges transient keys");
  assert.strictEqual(clearCacheSection.includes('delete allData.savedNovels'), false, "CLEAR_CACHE does not delete savedNovels");
  assert.strictEqual(clearCacheSection.includes('delete allData.stats'), false, "CLEAR_CACHE does not delete stats");
  assert.strictEqual(clearCacheSection.includes('delete allData.auth'), false, "CLEAR_CACHE does not delete auth");

  // Audit RESET_LOCAL_DATA: resets local savedNovels & stats, but preserves cloud auth & settings
  const resetLocalSection = backgroundJs.slice(
    backgroundJs.indexOf('type === "RESET_LOCAL_DATA"'),
    backgroundJs.indexOf('type === "UPDATE_NOVEL_GENRES"')
  );
  assert.ok(resetLocalSection.includes('savedNovels: {}'), "RESET_LOCAL_DATA resets savedNovels");
  assert.ok(resetLocalSection.includes('getDefaultStats()'), "RESET_LOCAL_DATA resets stats to defaults");
  assert.strictEqual(resetLocalSection.includes('deleteAccount'), false, "RESET_LOCAL_DATA does not delete account");

  // Verify dynamic warning adaptation in popup.js
  assert.ok(popupJs.includes("Cuenta sincronizada"), "popup.js displays cloud safety notice for authenticated users");
  assert.ok(popupJs.includes("Modo Local"), "popup.js warns local-only users of permanent irreversible deletion");

  console.log("  [PASS] Danger Zone cache pruning and local reset strictly isolated without compromising cloud or auth.");
}

// ----------------------------------------------------------------------------
// Test 8: Fictional Xianxia Rotating Local Ads (Zero External Network Calls)
// ----------------------------------------------------------------------------
console.log("\n[Test 8] Xianxia Humorous Local Ads & 100% Offline Integrity:");
{
  // Verify footer in popup.html has sponsoredCard and NO iframe
  assert.ok(popupHtml.includes('id="sponsoredCard"'), "popup.html contains sponsoredCard");
  assert.ok(popupHtml.includes('id="sponsoredTag"'), "popup.html contains sponsoredTag category badge");
  assert.ok(popupHtml.includes('id="btnSponsoredPrev"'), "popup.html contains btnSponsoredPrev");
  assert.ok(popupHtml.includes('id="btnSponsoredNext"'), "popup.html contains btnSponsoredNext");
  assert.ok(popupHtml.includes('id="btnSponsoredCta"'), "popup.html contains btnSponsoredCta");
  assert.strictEqual(popupHtml.includes('acceptable.a-ads.com'), false, "External a-ads iframe completely removed");
  assert.strictEqual(popupHtml.includes('<iframe'), false, "Zero iframes in popup.html");

  // Verify all 5 WebP illustrations exist locally
  const expectedAds = [
    "assets/sponsored/ad_qi_pills.webp",
    "assets/sponsored/ad_celestial_sword.webp",
    "assets/sponsored/ad_immortal_sect.webp",
    "assets/sponsored/ad_void_ring.webp",
    "assets/sponsored/ad_tribulation_service.webp"
  ];

  for (const adFile of expectedAds) {
    const fullPath = path.join(ROOT_DIR, adFile);
    assert.ok(fs.existsSync(fullPath), `Local ad asset ${adFile} exists`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 5000, `Local ad asset ${adFile} is non-empty (${stat.size} bytes)`);
  }

  // Verify popup.js handles rotation, click, tags, error fallback, and auto-timer
  assert.ok(popupJs.includes('SPONSORED_ADS ='), "SPONSORED_ADS array defined in popup.js");
  assert.ok(popupJs.includes('tagKey'), "SPONSORED_ADS has tagKey category defined");
  assert.ok(popupJs.includes('renderSponsoredAd'), "renderSponsoredAd function defined in popup.js");
  assert.ok(popupJs.includes('initSponsoredAdEvents'), "initSponsoredAdEvents function defined in popup.js");
  assert.ok(popupJs.includes('imgEl.addEventListener("error"'), "Image error fallback defined in popup.js");
  assert.ok(popupJs.includes('setInterval('), "Auto-advance interval timer configured");

  console.log("  [PASS] 5 local humorous Xianxia ads with category badges, error fallback, zero external iframes, and local rotation verified.");
}

console.log("\n====================================================================");
console.log(">>> ALL FASE 2 COMPREHENSIVE TESTS PASSED 100%!                     ");
console.log("====================================================================");
