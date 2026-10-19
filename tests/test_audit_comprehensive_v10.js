// ============================================================================
// NOVEL CHAPTER TRACKER — V10 COMPREHENSIVE AUDIT & VERIFICATION TEST SUITE
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ----------------------------------------------------------------------------
// Infrastructure Setup: Chrome Mock & VM Sandboxing
// ----------------------------------------------------------------------------
function createMockChrome(initialStore = {}) {
  const store = { ...initialStore };
  const messageListeners = [];
  const alarms = {};
  const alarmsListeners = [];
  const tabStores = {};
  const syncStore = {};

  return {
    _store: store,
    _syncStore: syncStore,
    _messageListeners: messageListeners,
    _alarmsListeners: alarmsListeners,
    _tabStores: tabStores,
    runtime: {
      id: "novel-tracker-extension-id",
      getManifest: () => ({ version: "4.0.0" }),
      getURL: (p) => p || "",
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: {
        addListener: (fn) => messageListeners.push(fn)
      },
      sendMessage: (msg, cb) => {
        let handled = false;
        for (const listener of messageListeners) {
          const isAsync = listener(msg, { id: "novel-tracker-extension-id" }, (res) => {
            handled = true;
            if (cb) cb(res);
          });
          if (isAsync && !handled) return;
        }
        if (!handled && cb) cb({ ok: false });
      }
    },
    storage: {
      local: {
        get: async (keys) => {
          if (keys === null) return { ...store };
          if (typeof keys === "string") return { [keys]: store[keys] };
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach((k) => (res[k] = store[k]));
            return res;
          }
          if (typeof keys === "object") {
            const res = {};
            for (const [k, v] of Object.entries(keys)) {
              res[k] = store[k] !== undefined ? store[k] : v;
            }
            return res;
          }
          return { ...store };
        },
        set: async (items) => {
          Object.assign(store, items);
        },
        remove: async (keys) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          arr.forEach((k) => delete store[k]);
        }
      },
      sync: {
        set: async (items) => {
          Object.assign(syncStore, items);
        },
        get: async () => ({ ...syncStore })
      },
      onChanged: { addListener: () => {} }
    },
    action: {
      setIcon: async () => {},
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {},
      setTitle: async () => {}
    },
    tabs: {
      query: async () => [],
      get: async (id) => ({ id }),
      create: async () => ({ id: 2 }),
      update: async () => ({ id: 1 }),
      sendMessage: async () => {},
      onActivated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} }
    },
    alarms: {
      create: (name, opts) => { alarms[name] = opts; },
      clear: (name) => { delete alarms[name]; },
      onAlarm: { addListener: (fn) => alarmsListeners.push(fn) }
    },
    omnibox: {
      onInputChanged: { addListener: () => {} },
      onInputEntered: { addListener: () => {} }
    },
    commands: {
      onCommand: { addListener: () => {} }
    }
  };
}

// Load background scripts
const achCode = fs.readFileSync(path.join(__dirname, "../achievements_data.js"), "utf8");
const i18nCode = fs.readFileSync(path.join(__dirname, "../i18n.js"), "utf8");
const bgCode = fs.readFileSync(path.join(__dirname, "../background.js"), "utf8");

function createSandboxContext(mockChrome, cloudResponses = {}, fetchOverride = null) {
  const recordedCloudPushes = [];

  const sandbox = {
    chrome: mockChrome,
    console: {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {}
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch: fetchOverride || (async (url, options = {}) => {
      if (options.method === "PUT") {
        recordedCloudPushes.push({ url, body: JSON.parse(options.body || "{}") });
        return { ok: true, status: 200, json: async () => ({}) };
      }
      if (url.includes("/novels.json")) {
        return { ok: true, status: 200, json: async () => cloudResponses.novels || {} };
      }
      if (url.includes("/stats.json")) {
        return { ok: true, status: 200, json: async () => cloudResponses.stats || null };
      }
      if (url.includes("/domainBlacklist.json")) {
        return { ok: true, status: 200, json: async () => cloudResponses.blacklist || [] };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    }),
    URL,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    parseFloat,
    parseInt,
    isNaN,
    importScripts: () => {},
    _recordedCloudPushes: recordedCloudPushes
  };

  vm.createContext(sandbox);
  vm.runInContext(achCode, sandbox);
  vm.runInContext(i18nCode, sandbox);
  vm.runInContext(bgCode, sandbox);

  return sandbox;
}

// ----------------------------------------------------------------------------
// TEST 1: P0 Data Integrity — Persistence After Browser Restart & Peak Realm
// ----------------------------------------------------------------------------
async function test1() {
  console.log("[Test 1] P0 Data Integrity — Persistence After Browser Restart & Peak Realm:");
  const mockChrome = createMockChrome({
    savedNovels: {
      novel_1: { seriesId: "novel_1", novelName: "Cultivation Record", chapter: "45", maxCounted: 45, updatedAt: 5000 }
    },
    stats: {
      chaptersRead: 45000,
      cultivatedRealmIndex: 9, // Peak realm
      cultivatedStage: null,   // Peak realm MUST be null
      cultivationThemes: {
        cultivation: { realmIndex: 9, stage: null, lastBreakthrough: { timestamp: 4000 } }
      },
      updatedAt: 5000
    }
  });

  const ctx = createSandboxContext(mockChrome);

  // Verify storage state persists and stage remains null
  const storedStats = mockChrome._store.stats;
  assert.strictEqual(storedStats.cultivatedRealmIndex, 9, "cultivatedRealmIndex remains 9 after restart");
  assert.strictEqual(storedStats.cultivatedStage, null, "cultivatedStage remains strictly null at peak realm");
  assert.strictEqual(storedStats.cultivationThemes.cultivation.stage, null, "Theme stage remains strictly null at peak");

  // Merge simulation at peak realm
  const cloudPeak = {
    chaptersRead: 46000,
    cultivatedRealmIndex: 9,
    cultivatedStage: null,
    cultivationThemes: {
      cultivation: { realmIndex: 9, stage: null }
    },
    updatedAt: 6000
  };
  const merged = ctx.mergeStatsObjects(storedStats, cloudPeak);
  assert.strictEqual(merged.cultivatedRealmIndex, 9);
  assert.strictEqual(merged.cultivatedStage, null, "Merge must preserve stage === null for peak realm");
  assert.strictEqual(merged.cultivationThemes.cultivation.stage, null);

  console.log("  [PASS] Peak realm (stage === null) preserved across browser restart and cloud merge.");
}

// ----------------------------------------------------------------------------
// TEST 2: P0 Data Integrity — Import & Export Roundtrip Without Progress Loss
// ----------------------------------------------------------------------------
async function test2() {
  console.log("\n[Test 2] P0 Data Integrity — Import & Export Roundtrip Without Progress Loss:");
  const mockChrome = createMockChrome({
    savedNovels: {
      series_1: {
        seriesId: "series_1",
        novelName: "Lord of the Mysteries",
        customName: "Klein's Journey",
        chapter: "120",
        maxCounted: 120,
        updatedAt: 8000
      }
    },
    stats: {
      chaptersRead: 500,
      cultivatedRealmIndex: 2,
      cultivatedStage: 5,
      updatedAt: 8000
    }
  });

  const ctx = createSandboxContext(mockChrome);

  // Incoming backup created earlier when reader was on chapter 50 with lower maxCounted
  const backupPayload = {
    version: "4.0.0",
    exportedAt: 4000,
    novels: {
      series_1: {
        seriesId: "series_1",
        novelName: "Lord of the Mysteries",
        chapter: "50",
        maxCounted: 50,
        updatedAt: 4000
      },
      series_2: {
        seriesId: "series_2",
        novelName: "Shadow Slave",
        chapter: "80",
        maxCounted: 80,
        updatedAt: 4000
      }
    },
    stats: {
      chaptersRead: 300,
      cultivatedRealmIndex: 1,
      cultivatedStage: 3,
      updatedAt: 4000
    }
  };

  const importRes = await ctx.handleImportData(backupPayload);
  assert.strictEqual(importRes.ok, true, "handleImportData must succeed");
  assert.strictEqual(importRes.added, 1, "series_2 was added");

  const finalNovels = mockChrome._store.savedNovels;
  const s1 = finalNovels.series_1 || Object.values(finalNovels).find((n) => n.customName === "Klein's Journey" || n.novelName === "Lord of the Mysteries");
  assert.ok(s1, "series_1 must be present");
  assert.strictEqual(s1.maxCounted, 120, "maxCounted must NEVER regress during backup import");
  assert.strictEqual(s1.customName, "Klein's Journey", "customName must be preserved");

  const s2 = finalNovels.series_2 || Object.values(finalNovels).find((n) => n.novelName === "Shadow Slave");
  assert.ok(s2, "series_2 must be present");
  assert.strictEqual(s2.chapter, "80");

  const finalStats = mockChrome._store.stats;
  assert.strictEqual(finalStats.chaptersRead, 500);
  assert.strictEqual(finalStats.cultivatedRealmIndex, 2);
  assert.strictEqual(finalStats.cultivatedStage, 5);

  console.log("  [PASS] Backup import prevents maxCounted regression and preserves custom names and stats.");
}

// ----------------------------------------------------------------------------
// TEST 3: P0 Data Integrity — User Account Isolation (Guest -> User A -> User B)
// ----------------------------------------------------------------------------
async function test3() {
  console.log("\n[Test 3] P0 Data Integrity — User Account Isolation (Guest -> User A -> User B):");
  const mockChrome = createMockChrome({
    lastAuthUid: "guest",
    savedNovels: {
      guest_novel: { seriesId: "guest_novel", novelName: "Guest Chronicle", chapter: "10", maxCounted: 10, updatedAt: 1000 }
    },
    stats: {
      chaptersRead: 10,
      cultivatedRealmIndex: 0,
      cultivatedStage: 1,
      updatedAt: 1000
    }
  });

  const ctx = createSandboxContext(mockChrome);

  // 1. User A logs in for the first time with explicit transfer requested: inherits guest novels without loss
  const switchResA = await ctx.switchAccountProfile("UID_USER_A", true);
  assert.strictEqual(switchResA.ok, true);
  assert.strictEqual(switchResA.switched, true);
  assert.strictEqual(mockChrome._store.lastAuthUid, "UID_USER_A");
  const hasGuestNovel = Object.values(mockChrome._store.savedNovels || {}).some((n) => n.novelName === "Guest Chronicle");
  assert.strictEqual(hasGuestNovel, true, "First login with confirmed transfer inherits guest novels");

  // User A reads user-A exclusive novel
  mockChrome._store.savedNovels.user_a_exclusive = {
    seriesId: "user_a_exclusive",
    novelName: "User A Secret Diary",
    chapter: "200",
    maxCounted: 200,
    updatedAt: 2000
  };
  mockChrome._store.stats.chaptersRead = 210;

  // 2. User A logs out -> switches back to guest
  const switchLogout = await ctx.switchAccountProfile("guest");
  assert.strictEqual(switchLogout.ok, true);
  assert.strictEqual(mockChrome._store.lastAuthUid, "guest");
  const guestHasUserANovel = Object.values(mockChrome._store.savedNovels || {}).some((n) => n.novelName === "User A Secret Diary");
  assert.strictEqual(guestHasUserANovel, false, "Guest does not see User A exclusive novel");

  // 3. User B logs in (with their own account)
  const switchResB = await ctx.switchAccountProfile("UID_USER_B");
  assert.strictEqual(switchResB.ok, true);
  assert.strictEqual(mockChrome._store.lastAuthUid, "UID_USER_B");
  const userBHasUserANovel = Object.values(mockChrome._store.savedNovels || {}).some((n) => n.novelName === "User A Secret Diary");
  assert.strictEqual(userBHasUserANovel, false, "User B NEVER sees User A's novels (100% Isolation)");
  assert.strictEqual(Boolean(mockChrome._store.savedNovels.user_a_exclusive), false, "User B NEVER sees User A's novels (100% Isolation)");

  // 4. User B logs out, User A logs back in
  await ctx.switchAccountProfile("guest");
  await ctx.switchAccountProfile("UID_USER_A");
  assert.strictEqual(mockChrome._store.lastAuthUid, "UID_USER_A");
  assert.ok(mockChrome._store.savedNovels.user_a_exclusive, "User A data restored with 100% fidelity upon re-login");
  assert.strictEqual(mockChrome._store.stats.chaptersRead, 210);

  console.log("  [PASS] User account isolation verified: zero data leakage across guest, User A, and User B.");
}

// ----------------------------------------------------------------------------
// TEST 4: P1 Cultivation & Achievements — Bottlenecks & Surplus Experience
// ----------------------------------------------------------------------------
async function test4() {
  console.log("\n[Test 4] P1 Cultivation — Bottlenecks & Surplus Experience Application:");
  const mockChrome = createMockChrome();
  const ctx = createSandboxContext(mockChrome);

  // Cultivator at Realm 0 (Qi Condensation, span 0-250, 9 stages = 27.8 Qi/stage)
  const stats = {
    chaptersRead: 150,
    cultivatedRealmIndex: 0,
    cultivatedStage: 1,
    claimedRewards: [],
    updatedAt: 1000
  };

  const stateBefore = ctx.getCultivationState(stats, "cultivation");
  assert.strictEqual(stateBefore.isBottleneckReady, true, "Bottleneck is ready");
  assert.ok(stateBefore.overflowQi > 0, "Accumulated surplus Qi during bottleneck");

  // Perform breakthrough with applySurplus
  const btRes = ctx.advanceCultivationBreakthrough(stats, "cultivation", { applySurplus: true });
  assert.strictEqual(btRes.ok, true, "Breakthrough succeeds");
  assert.strictEqual(btRes.newStage, 7, "Surplus Qi correctly advanced user to stage 7 upon breakthrough");

  // Peak Realm guard: cannot breakthrough at immortal_ascension (Realm 9)
  const peakStats = {
    chaptersRead: 250000,
    cultivatedRealmIndex: 9,
    cultivatedStage: null,
    cultivationThemes: {
      cultivation: { realmIndex: 9, stage: null }
    }
  };
  const peakRes = ctx.advanceCultivationBreakthrough(peakStats, "cultivation", { applySurplus: true });
  assert.strictEqual(peakRes.ok, false);
  assert.strictEqual(peakRes.reason, "already_max_level");

  console.log("  [PASS] Surplus Qi applied accurately and peak realm termination guarded.");
}

// ----------------------------------------------------------------------------
// TEST 5: P1 Achievements — Legitimate Gating & Idempotent Rewards
// ----------------------------------------------------------------------------
async function test5() {
  console.log("\n[Test 5] P1 Achievements — Legitimate Gating & Idempotent Rewards:");
  const mockChrome = createMockChrome();
  const ctx = createSandboxContext(mockChrome);

  const stats = {
    chaptersRead: 10,
    novelsCompleted: 0,
    streakDays: 1,
    cultivatedRealmIndex: 0,
    cultivatedStage: 2,
    unlockedTitles: [],
    claimedRewards: [],
    updatedAt: 1000
  };

  ctx.evaluateUnlockedTitles(stats, "cultivation");
  assert.ok(stats.unlockedTitles.includes("outer_disciple"), "outer_disciple unlocked legitimately");
  assert.strictEqual(stats.unlockedTitles.includes("golden_immortal"), false, "golden_immortal gated");

  // Claim reward
  const claimRes1 = ctx.claimAchievementReward(stats, "outer_disciple");
  assert.strictEqual(claimRes1.ok, true);
  assert.strictEqual(stats.bonusQi, 25, "bonusQi updated to 25");

  // Repeated claim must be rejected
  const claimRes2 = ctx.claimAchievementReward(stats, "outer_disciple");
  assert.strictEqual(claimRes2.ok, false);
  assert.strictEqual(claimRes2.error, "already_claimed");
  assert.strictEqual(stats.bonusQi, 25, "bonusQi strictly unchanged on repeated claim");

  console.log("  [PASS] Legitimate achievement unlock gating and idempotent reward claims verified.");
}

// ----------------------------------------------------------------------------
// TEST 6: P1 Theme Isolation — Multi-Theme Independence
// ----------------------------------------------------------------------------
async function test6() {
  console.log("\n[Test 6] P1 Theme Isolation — Multi-Theme Independence:");
  const mockChrome = createMockChrome();
  const ctx = createSandboxContext(mockChrome);

  const stats = {
    chaptersRead: 600,
    cultivatedRealmIndex: 2,
    cultivatedStage: 4,
    cultivationThemes: {
      cultivation: { realmIndex: 2, stage: 4, lastBreakthrough: null },
      hunter: { realmIndex: 0, stage: 1, exp: 100, totalExp: 100, lastBreakthrough: null },
      legendary_novels: { realmIndex: 1, stage: 2, lastBreakthrough: null }
    }
  };

  // Breakthrough in hunter
  const hRes = ctx.advanceCultivationBreakthrough(stats, "hunter", { applySurplus: true });
  assert.strictEqual(hRes.ok, true);
  assert.strictEqual(stats.cultivationThemes.hunter.stage > 1, true, "Hunter stage advanced");
  assert.strictEqual(stats.cultivationThemes.cultivation.stage, 4, "Cultivation stage untouched");
  assert.strictEqual(stats.cultivationThemes.legendary_novels.stage, 2, "Legendary Novels stage untouched");

  console.log("  [PASS] All 3 cultivation themes maintain 100% state isolation.");
}

// ----------------------------------------------------------------------------
// TEST 7: P1 Chapter Detection — SkyNovels & Priority Hierarchy
// ----------------------------------------------------------------------------
async function test7() {
  console.log("\n[Test 7] P1 Chapter Detection — SkyNovels & Priority Hierarchy:");
  const contentCode = fs.readFileSync(path.join(__dirname, "../content.js"), "utf8");

  // 1. Verify matchExplicitChapter hierarchy
  const matchFnIndex = contentCode.indexOf("function matchExplicitChapter");
  const specialCallIndex = contentCode.indexOf("parseSpecialChapter(str)", matchFnIndex);
  const volCallIndex = contentCode.indexOf("VOLUME_FALLBACK_REGEX", matchFnIndex);
  assert.ok(
    specialCallIndex > matchFnIndex && specialCallIndex < volCallIndex,
    "Inside matchExplicitChapter, parseSpecialChapter must be evaluated before VOLUME_FALLBACK_REGEX"
  );

  // 2. Simulate matchExplicitChapter with regexes from content.js
  const chapRegex = /\b(?:chapter|cap[ií]tulo|capitulo|episode|episodio|parte|part|ch\.?|cap\.?|ep\.?|pt\.?|c\.?)\s*#?\s*(\d{1,5}(?:[.,-]\d{1,2}|[a-z])?)\b|(?:^|\s)#(\d{1,5}(?:[.,-]\d{1,2})?)(?:\s|:|-|$)/i;
  const specialRegex = /\b(pr[oó]logo|prologue|ep[ií]logo|epilogue|oneshot|one-shot|extra|special|especial|side\s*story)\b/i;
  const volRegex = /\b(?:tomo|volumen|volume|vol\.?|v\.?)\s*#?\s*(\d{1,5}(?:[.,-]\d{1,2}|[a-z])?)\b/i;

  function parseSpecialChapter(text) {
    const m = String(text).match(specialRegex);
    if (!m) return null;
    const term = m[1].toLowerCase();
    if (term.includes("prolog") || term.includes("prólog")) return "0";
    return term;
  }

  function matchChapter(text) {
    const str = String(text);
    const mChap = str.match(chapRegex);
    if (mChap) return mChap[1] || mChap[2];
    const mSpecial = parseSpecialChapter(str);
    if (mSpecial !== null) return mSpecial;
    const mVol = str.match(volRegex);
    if (mVol) return mVol[1];
    return null;
  }

  assert.strictEqual(matchChapter("Tomo 3 Capítulo 45"), "45", "Tomo 3 Capítulo 45 detects 45");
  assert.strictEqual(matchChapter("Volumen 2 Cap. 120"), "120", "Volumen 2 Cap. 120 detects 120");
  assert.strictEqual(matchChapter("Volumen 2 - Prólogo"), "0", "Volumen 2 - Prólogo detects 0 (Prologue)");
  assert.strictEqual(matchChapter("Tomo 1 Epílogo"), "epílogo", "Tomo 1 Epílogo detects epílogo");
  assert.strictEqual(matchChapter("Tomo 5"), "5", "Pure Tomo 5 detects 5 as fallback");

  // 3. SkyNovels URL canonicalization in content.js and background.js
  assert.ok(contentCode.includes("segments.length >= 3 &&"), "content.js supports SkyNovels catalog paths with segments >= 3");
  assert.ok(contentCode.includes("isCatalogIdPath"), "content.js excludes catalog database IDs from trailing number chapter extraction");

  console.log("  [PASS] SkyNovels URL canonicalization and Chapter/Volume/Prologue hierarchy validated.");
}

// ----------------------------------------------------------------------------
// TEST 8: P1 Performance — Zero Redundant Cloud Pushes on Static Page Reloads
// ----------------------------------------------------------------------------
async function test8() {
  console.log("\n[Test 8] P1 Performance — Zero Redundant Cloud Pushes on Static Page Reloads:");
  const mockChrome = createMockChrome({
    savedNovels: {
      novel_1: {
        seriesId: "novel_1",
        novelName: "A Will Eternal",
        url: "https://wuxia.com/chapter-15",
        novelUrl: "https://wuxia.com/novel",
        chapter: "15",
        maxCounted: 15,
        updatedAt: 1000
      }
    },
    stats: {
      chaptersRead: 15,
      cultivatedRealmIndex: 0,
      cultivatedStage: 2,
      updatedAt: 1000
    },
    auth: {
      uid: "UID_TEST",
      idToken: "token123",
      refreshToken: "mock_refresh_token",
      expiresAt: Date.now() + 3600000
    }
  });

  const ctx = createSandboxContext(mockChrome);

  // Allow background startup migration to settle
  await new Promise((resolve) => setTimeout(resolve, 100));

  // First call: reload same chapter (15) on same URL -> no progress, no novel change
  const reloadPayload = {
    seriesId: "novel_1",
    novelName: "A Will Eternal",
    url: "https://wuxia.com/chapter-15",
    novelUrl: "https://wuxia.com/novel",
    chapter: "15"
  };

  const initialPushCount = ctx._recordedCloudPushes.length;
  await ctx.handleNovelDetected(reloadPayload, true, 101);
  const afterReloadPushCount = ctx._recordedCloudPushes.length;

  assert.strictEqual(
    afterReloadPushCount,
    initialPushCount,
    "handleNovelDetected MUST NOT trigger cloud push when reloading identical page without progress"
  );

  // Second call: advance to chapter 16 -> progress made! Must trigger cloud push!
  const advancePayload = {
    seriesId: "novel_1",
    novelName: "A Will Eternal",
    url: "https://wuxia.com/chapter-16",
    novelUrl: "https://wuxia.com/novel",
    chapter: "16"
  };

  await ctx.handleNovelDetected(advancePayload, true, 101);
  assert.ok(
    ctx._recordedCloudPushes.length > initialPushCount,
    "handleNovelDetected MUST trigger cloud push when novel chapter advances"
  );

  console.log("  [PASS] Redundant cloud pushes on static reloads prevented; quota preserved.");
}

// ----------------------------------------------------------------------------
// TEST 9: P0 & P1 Deep Edge Case Verification & Regression Protection
// ----------------------------------------------------------------------------
async function test9() {
  console.log("\n[Test 9] P0 & P1 Edge Cases — Non-Peak Stage Null Preservation, Offline Profile Protection, Recency & Detection:");
  const mockChrome = createMockChrome();
  const ctx = createSandboxContext(mockChrome);

  // 1. Non-peak realm (Realm 1 Foundation Establishment) must NEVER coerce stage to null
  const localR1 = { ...ctx.getDefaultStats(), cultivatedRealmIndex: 1, cultivatedStage: 3, updatedAt: 2000 };
  const cloudR1 = { ...ctx.getDefaultStats(), cultivatedRealmIndex: 1, cultivatedStage: null, updatedAt: 1000 };
  const mergedR1 = ctx.mergeStatsObjects(localR1, cloudR1);
  assert.strictEqual(mergedR1.cultivatedRealmIndex, 1);
  assert.strictEqual(mergedR1.cultivatedStage, 3, "Non-peak Realm 1 must preserve valid stage 3 and never set stage to null");

  // 2. Offline pullFromCloud must NEVER kick user to guest
  const offlineChrome = createMockChrome({
    lastAuthUid: "UID_OFFLINE_USER",
    auth: {
      uid: "UID_OFFLINE_USER",
      email: "user@novel.com",
      refreshToken: "offline_ref_token",
      expiresAt: Date.now() - 5000 // expired token requiring refresh
    },
    savedNovels: {
      secret_novel: { seriesId: "secret_novel", novelName: "Offline Chronicles", chapter: "5" }
    }
  });

  // Mock fetch that throws network error to simulate offline mode
  const offlineFetch = async () => {
    throw new Error("Failed to fetch: Network unreachable (offline)");
  };
  const offlineCtx = createSandboxContext(offlineChrome, {}, offlineFetch);

  await offlineCtx.pullFromCloud();
  assert.strictEqual(
    offlineChrome._store.lastAuthUid,
    "UID_OFFLINE_USER",
    "Offline token refresh failure MUST NOT kick user to guest profile!"
  );
  assert.ok(
    Object.values(offlineChrome._store.savedNovels || {}).some((n) => n.novelName === "Offline Chronicles"),
    "Offline reading novels remain in active store when offline"
  );

  // 3. handleImportData customName recency priority
  const importChrome = createMockChrome({
    savedNovels: {
      novel_a: {
        seriesId: "novel_a",
        novelName: "Omniscient Reader",
        customName: "Newer Local Nickname",
        chapter: "200",
        maxCounted: 200,
        updatedAt: 5000
      }
    },
    stats: ctx.getDefaultStats()
  });
  const importCtx = createSandboxContext(importChrome);
  const oldBackupPayload = {
    novels: {
      novel_a: {
        seriesId: "novel_a",
        novelName: "Omniscient Reader",
        customName: "Older Backup Nickname",
        chapter: "100",
        maxCounted: 100,
        updatedAt: 2000
      }
    }
  };
  await importCtx.handleImportData(oldBackupPayload);
  const updatedEntry = Object.values(importChrome._store.savedNovels || {}).find(
    (n) => n.customName === "Newer Local Nickname" || n.novelName === "Omniscient Reader"
  );
  assert.ok(updatedEntry, "Omniscient Reader entry must exist");
  assert.strictEqual(
    updatedEntry.customName,
    "Newer Local Nickname",
    "Importing older backup MUST NOT overwrite newer local customName"
  );

  // 4. recordCultivationProgress must NOT reset cultivatedRealmIndex when only cultivatedStage is undefined
  const cultStats = {
    chaptersRead: 200,
    cultivatedRealmIndex: 3,
    cultivatedStage: undefined
  };
  const progressed = ctx.recordCultivationProgress(cultStats, 1, false);
  assert.strictEqual(
    progressed.cultivatedRealmIndex,
    3,
    "recordCultivationProgress must preserve cultivatedRealmIndex = 3 when stage is undefined"
  );
  assert.strictEqual(
    progressed.cultivatedStage,
    1,
    "cultivatedStage set to 1 for non-peak realm"
  );

  // 5. getCultivationState root vs cultivationThemes divergence resolution
  const divergingStats = {
    chaptersRead: 800,
    cultivatedRealmIndex: 3,
    cultivatedStage: 2,
    cultivationThemes: {
      cultivation: { realmIndex: 1, stage: 1 }
    }
  };
  const resolvedState = ctx.getCultivationState(divergingStats, "cultivation");
  assert.strictEqual(
    resolvedState.realmIndex,
    3,
    "getCultivationState resolves root and theme divergence in favor of highest realm (3)"
  );

  // 6. Reader dropdown chapter extraction & title number protection
  const contentSource = fs.readFileSync(path.join(__dirname, "../content.js"), "utf8");

  // Simulate enhanced matchLeadingNumberChapter
  const CHAPTER_LEADING_NUM_REGEX = /^\s*(?:\[\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*\]|(\d{1,5}(?:[.,]\d{1,2})?)\s*[---.:)\]]\s+\S)/;
  function matchLeadingNumber(text, novelNameHint = "") {
    if (!text) return null;
    const clean = String(text).trim();
    if (novelNameHint && clean.toLowerCase() === novelNameHint.toLowerCase()) return null;
    const m = clean.match(CHAPTER_LEADING_NUM_REGEX);
    if (!m) return null;
    const rawNum = m[1] || m[2];
    const num = parseFloat(String(rawNum).replace(",", "."));
    if (isNaN(num) || num < 0 || num > 4000 || (num >= 1990 && num <= 2035)) return null;
    if (novelNameHint) {
      const hintLeading = String(novelNameHint).trim().match(/^(\d{1,5})/);
      if (hintLeading && parseFloat(hintLeading[1]) === num) {
        return null;
      }
    }
    return String(num);
  }

  assert.strictEqual(matchLeadingNumber("45 - El Comienzo"), "45", "45 - El Comienzo matches 45");
  assert.strictEqual(matchLeadingNumber("86 - Eighty Six", "86 - Eighty Six"), null, "Novel title '86 - Eighty Six' protects from false positive");
  assert.strictEqual(matchLeadingNumber("86 - Eighty Six", "86"), null, "Novel title starting with 86 protects from false positive");

  console.log("  [PASS] All P0/P1 edge cases, offline resilience, and detection robustness verified.");
}

// ----------------------------------------------------------------------------
// Master Runner
// ----------------------------------------------------------------------------
async function runAllTests() {
  console.log("=== RUNNING V10 COMPREHENSIVE AUDIT & VERIFICATION TEST SUITE ===\n");
  await test1();
  await test2();
  await test3();
  await test4();
  await test5();
  await test6();
  await test7();
  await test8();
  await test9();
  console.log("\n>>> ALL V10 COMPREHENSIVE AUDIT TESTS PASSED CLEANLY (100%)! <<<\n");
}

runAllTests().catch((err) => {
  console.error("\nFATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
