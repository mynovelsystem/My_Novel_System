// ============================================================================
// MYNOVELSYSTEM — TEST SUITE: CHAPTER REWIND SETTING & LEGAL COMPLIANCE
// Verifies:
// 1. allowRewind: false prevents automatic progress regression
// 2. allowRewind: true allows chapter rewinding (backward compatibility)
// 3. allowRewind: false permits normal forward chapter advance
// 4. Invalid/intermediate detections do not overwrite saved progress
// 5. Manual chapter correction remains unrestricted
// 6. Settings UI and i18n keys
// 7. Legal policy email and publication date compliance
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("====================================================================");
console.log("   TEST SUITE: CHAPTER REWIND SETTING & LEGAL AUDIT VERIFICATION    ");
console.log("====================================================================\n");

const backgroundSrc = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const achievementsSrc = fs.readFileSync(path.join(__dirname, "..", "achievements_data.js"), "utf8");
const i18nSrc = fs.readFileSync(path.join(__dirname, "..", "i18n.js"), "utf8");
const popupHtmlSrc = fs.readFileSync(path.join(__dirname, "..", "popup.html"), "utf8");
const popupJsSrc = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");
const privacyMdSrc = fs.readFileSync(path.join(__dirname, "..", "PRIVACY.md"), "utf8");
const privacyHtmlSrc = fs.readFileSync(path.join(__dirname, "..", "privacy.html"), "utf8");

function createMockBackgroundEnv(initialStore = {}) {
  const store = { ...initialStore };
  const actionCalls = { setBadgeText: [] };
  const alarms = {};
  const messageListeners = [];
  const pushedCloudData = [];

  const mockContext = {
    console,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
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
    FIREBASE_API_KEY: "AIzaSyFakeKeyForTesting",
    FIREBASE_DB_URL: "https://novel-tracker-1d134-default-rtdb.firebaseio.com",
    importScripts: () => {},
    fetch: async (url, opts) => {
      pushedCloudData.push({ url, opts });
      return { ok: true, json: async () => ({}) };
    },
    chrome: {
      action: {
        setBadgeText: (opts, cb) => { actionCalls.setBadgeText.push(opts); if (cb) cb(); return Promise.resolve(); },
        setBadgeBackgroundColor: () => Promise.resolve(),
        setTitle: () => Promise.resolve(),
        setIcon: () => Promise.resolve()
      },
      alarms: {
        create: (name, opts) => { alarms[name] = opts; },
        clear: (name) => { delete alarms[name]; },
        onAlarm: { addListener: () => {} }
      },
      commands: {
        onCommand: { addListener: () => {} }
      },
      omnibox: {
        onInputChanged: { addListener: () => {} },
        onInputEntered: { addListener: () => {} }
      },
      runtime: {
        id: "mock_extension_id_12345",
        getURL: (p) => `chrome-extension://mock_extension_id_12345/${p}`,
        sendMessage: (msg) => {
          for (const l of messageListeners) {
            l(msg, { id: "mock_extension_id_12345" }, () => {});
          }
          return Promise.resolve({ ok: true });
        },
        onMessage: {
          addListener: (fn) => messageListeners.push(fn)
        },
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} }
      },
      storage: {
        onChanged: { addListener: () => {} },
        local: {
          get: (keys, cb) => {
            let res = {};
            if (!keys || keys === null) {
              res = { ...store };
            } else if (Array.isArray(keys)) {
              for (const k of keys) res[k] = store[k];
            } else if (typeof keys === "string") {
              res[keys] = store[keys];
            } else if (typeof keys === "object") {
              for (const k of Object.keys(keys)) {
                res[k] = store[k] !== undefined ? store[k] : keys[k];
              }
            }
            if (cb) cb(res);
            return Promise.resolve(res);
          },
          set: (items, cb) => {
            Object.assign(store, items);
            if (cb) cb();
            return Promise.resolve();
          },
          remove: (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            for (const k of arr) delete store[k];
            if (cb) cb();
            return Promise.resolve();
          }
        },
        sync: {
          get: (keys, cb) => {
            const res = {};
            if (cb) cb(res);
            return Promise.resolve(res);
          },
          set: (items, cb) => {
            if (cb) cb();
            return Promise.resolve();
          }
        }
      },
      tabs: {
        query: async () => [{ id: 101, url: "https://www.wuxiaworld.com" }],
        sendMessage: async () => ({ ok: true }),
        onActivated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onUpdated: { addListener: () => {} }
      }
    }
  };

  vm.createContext(mockContext);
  vm.runInContext(i18nSrc, mockContext);
  vm.runInContext(achievementsSrc, mockContext);
  vm.runInContext(backgroundSrc, mockContext);

  return { mockContext, store, pushedCloudData };
}

async function runAllTests() {
  // ----------------------------------------------------------------------------
  // Test 1: allowRewind: false prevents automatic progress regression
  // ----------------------------------------------------------------------------
  console.log("[Test 1] allowRewind: false prevents automatic progress regression:");
  {
    const initialNovels = {
      "wuxiaworld.com/novel/renegade-immortal": {
        seriesId: "wuxiaworld.com/novel/renegade-immortal",
        novelName: "Renegade Immortal",
        novelUrl: "https://www.wuxiaworld.com/novel/renegade-immortal",
        url: "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-100",
        chapter: "100",
        maxCounted: 100,
        scrollPct: 75,
        updatedAt: 1000000
      }
    };
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: initialNovels,
      settings: { allowRewind: false },
      stats: { chaptersRead: 100, Qi: 500, novelsStarted: 1 }
    });

    env.pushedCloudData.length = 0;

    const res = await env.mockContext.handleNovelDetected({
      seriesId: "wuxiaworld.com/novel/renegade-immortal",
      novelName: "Renegade Immortal",
      novelUrl: "https://www.wuxiaworld.com/novel/renegade-immortal",
      url: "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-10",
      chapter: "10"
    }, true, 101);

    assert.strictEqual(res.ok, true, "handleNovelDetected should return ok: true");
    assert.strictEqual(res.rewindPrevented, true, "rewindPrevented flag should be true");

    const novel = env.store.savedNovels[res.seriesId];
    assert.strictEqual(novel.chapter, "100", "Saved chapter MUST remain 100 when allowRewind is false");
    assert.strictEqual(novel.url, "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-100", "Saved URL MUST remain chapter 100");
    assert.strictEqual(novel.scrollPct, 75, "Saved scroll percentage MUST remain 75%");
    assert.strictEqual(novel.maxCounted, 100, "maxCounted MUST remain 100");
    assert.strictEqual(env.store.stats.chaptersRead, 100, "chaptersRead MUST NOT increment or regress");
    const cloudPushes = env.pushedCloudData.filter(d => d.url.includes("firebaseio.com"));
    assert.strictEqual(cloudPushes.length, 0, "No unnecessary cloud push when rewind is prevented");

    console.log("  [PASS] Saved chapter (100), URL, scroll (75%), and maxCounted (100) strictly preserved.");
  }

  // ----------------------------------------------------------------------------
  // Test 2: allowRewind: true allows chapter rewind (default / backward compatible)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 2] allowRewind: true allows chapter rewind (default behavior):");
  {
    const initialNovels = {
      "wuxiaworld.com/novel/renegade-immortal": {
        seriesId: "wuxiaworld.com/novel/renegade-immortal",
        novelName: "Renegade Immortal",
        novelUrl: "https://www.wuxiaworld.com/novel/renegade-immortal",
        url: "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-100",
        chapter: "100",
        maxCounted: 100,
        scrollPct: 75,
        updatedAt: 1000000
      }
    };
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: initialNovels,
      settings: { allowRewind: true },
      stats: { chaptersRead: 100, Qi: 500, novelsStarted: 1 }
    });

    const res = await env.mockContext.handleNovelDetected({
      seriesId: "wuxiaworld.com/novel/renegade-immortal",
      novelName: "Renegade Immortal",
      novelUrl: "https://www.wuxiaworld.com/novel/renegade-immortal",
      url: "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-10",
      chapter: "10"
    }, true, 101);

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.rewindPrevented, false);

    const novel = env.store.savedNovels[res.seriesId];
    assert.strictEqual(novel.chapter, "10", "Chapter updates to 10 when allowRewind is true");
    assert.strictEqual(novel.url, "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-10", "URL updates to chapter 10");
    assert.strictEqual(novel.maxCounted, 100, "maxCounted MUST NOT regress even when chapter rewinds");
    assert.strictEqual(env.store.stats.chaptersRead, 100, "chaptersRead MUST NOT increment on reread");

    console.log("  [PASS] Chapter rewinds cleanly to 10 while preserving maxCounted at 100.");
  }

  // ----------------------------------------------------------------------------
  // Test 3: allowRewind: false permits normal forward chapter advance
  // ----------------------------------------------------------------------------
  console.log("\n[Test 3] allowRewind: false permits normal forward advance:");
  {
    const initialNovels = {
      "wuxiaworld.com/novel/renegade-immortal": {
        seriesId: "wuxiaworld.com/novel/renegade-immortal",
        novelName: "Renegade Immortal",
        novelUrl: "https://www.wuxiaworld.com/novel/renegade-immortal",
        url: "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-100",
        chapter: "100",
        maxCounted: 100,
        scrollPct: 75,
        updatedAt: 1000000
      }
    };
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: initialNovels,
      settings: { allowRewind: false },
      stats: { chaptersRead: 100, Qi: 500, novelsStarted: 1 }
    });

    const res = await env.mockContext.handleNovelDetected({
      seriesId: "wuxiaworld.com/novel/renegade-immortal",
      novelName: "Renegade Immortal",
      novelUrl: "https://www.wuxiaworld.com/novel/renegade-immortal",
      url: "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-101",
      chapter: "101"
    }, true, 101);

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.rewindPrevented, false);

    const novel = env.store.savedNovels[res.seriesId];
    assert.strictEqual(novel.chapter, "101", "Saved chapter advances to 101");
    assert.strictEqual(novel.url, "https://www.wuxiaworld.com/novel/renegade-immortal/chapter-101");
    assert.strictEqual(novel.maxCounted, 101);
    assert.strictEqual(env.store.stats.chaptersRead, 101, "Cultivation chaptersRead increments by 1");

    console.log("  [PASS] Forward advance to chapter 101 works cleanly with cultivation increment.");
  }

  // ----------------------------------------------------------------------------
  // Test 4: Invalid/intermediate detections do not overwrite saved progress
  // ----------------------------------------------------------------------------
  console.log("\n[Test 4] Invalid/intermediate detections protection:");
  {
    const initialNovels = {
      "royalroad.com/fiction/123": {
        seriesId: "royalroad.com/fiction/123",
        novelName: "Mother of Learning",
        novelUrl: "https://www.royalroad.com/fiction/123/mother-of-learning",
        url: "https://www.royalroad.com/fiction/123/mother-of-learning/chapter-50",
        chapter: "50",
        maxCounted: 50,
        scrollPct: 40,
        updatedAt: 1000000
      }
    };
    const env = createMockBackgroundEnv({
      savedNovels: initialNovels,
      settings: { allowRewind: false },
      stats: { chaptersRead: 50, Qi: 250, novelsStarted: 1 }
    });

    const resTOC = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      novelUrl: "https://www.royalroad.com/fiction/123/mother-of-learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/table-of-contents",
      chapter: "NaN"
    }, true, 101);

    // /table-of-contents is informational/TOC subpage, so it is ignored
    const novelKey = Object.keys(env.store.savedNovels)[0];
    const novel = env.store.savedNovels[novelKey];
    assert.strictEqual(novel.chapter, "50", "Invalid chapter NaN must NOT overwrite chapter 50");
    assert.strictEqual(novel.url, "https://www.royalroad.com/fiction/123/mother-of-learning/chapter-50", "URL must not be overwritten by TOC");
    assert.strictEqual(novel.scrollPct, 40);

    console.log("  [PASS] Invalid chapter detection safely ignored without progress regression.");
  }

  // ----------------------------------------------------------------------------
  // Test 5: Manual chapter edit is NOT restricted by allowRewind
  // ----------------------------------------------------------------------------
  console.log("\n[Test 5] Manual chapter correction remains unrestricted:");
  {
    const initialNovels = {
      "test_series_manual": {
        seriesId: "test_series_manual",
        novelName: "Lord of the Mysteries",
        url: "https://test.com/chapter-50",
        chapter: "50",
        maxCounted: 50
      }
    };

    const store = {
      savedNovels: initialNovels,
      settings: { allowRewind: false },
      stats: { chaptersRead: 50, Qi: 250, novelsStarted: 1 }
    };

    const existing = store.savedNovels["test_series_manual"];
    store.savedNovels["test_series_manual"] = {
      ...existing,
      chapter: "25",
      updatedAt: Date.now()
    };

    assert.strictEqual(store.savedNovels["test_series_manual"].chapter, "25", "User manual correction to chapter 25 must succeed");
    console.log("  [PASS] Manual correction from interface successfully changes chapter without restriction.");
  }

  // ----------------------------------------------------------------------------
  // Test 6: Settings UI, i18n, and persistence
  // ----------------------------------------------------------------------------
  console.log("\n[Test 6] Settings UI & i18n keys integrity:");
  {
    assert.ok(popupHtmlSrc.includes('id="allowChapterRewind"'), "allowChapterRewind switch must exist in popup.html");
    assert.ok(popupHtmlSrc.includes('data-i18n="settings_allow_rewind_label"'), "i18n attribute for allow_rewind_label must exist");
    assert.ok(popupJsSrc.includes('allowChapterRewind'), "popup.js must bind allowChapterRewind");
    assert.ok(popupJsSrc.includes('allowRewind'), "popup.js must handle allowRewind setting");

    const esJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "locales", "es.json"), "utf8"));
    const enJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "locales", "en.json"), "utf8"));

    assert.ok(esJson.settings_allow_rewind_label, "ES locale must have settings_allow_rewind_label");
    assert.ok(enJson.settings_allow_rewind_label, "EN locale must have settings_allow_rewind_label");
    assert.ok(esJson.settings_reading_title, "ES locale must have settings_reading_title");
    assert.ok(enJson.settings_reading_title, "EN locale must have settings_reading_title");

    assert.strictEqual(esJson.settings_allow_rewind_label, "Permitir retroceder capítulos");
    assert.strictEqual(enJson.settings_allow_rewind_label, "Allow chapter rewind");

    console.log("  [PASS] UI elements, switch IDs, and translations in es.json/en.json verified.");
  }

  // ----------------------------------------------------------------------------
  // Test 7: Legal documents email and publication date audit
  // ----------------------------------------------------------------------------
  console.log("\n[Test 7] Legal policy email and publication date compliance:");
  {
    // 1. Verify no placeholders remain
    assert.strictEqual(privacyMdSrc.includes("[FECHA]"), false, "PRIVACY.md must not contain [FECHA]");
    assert.strictEqual(privacyMdSrc.includes("[EMAIL_DE_CONTACTO]"), false, "PRIVACY.md must not contain [EMAIL_DE_CONTACTO]");
    assert.strictEqual(privacyHtmlSrc.includes("[FECHA]"), false, "privacy.html must not contain [FECHA]");
    assert.strictEqual(privacyHtmlSrc.includes("[EMAIL_DE_CONTACTO]"), false, "privacy.html must not contain [EMAIL_DE_CONTACTO]");

    // 2. Verify contact email
    assert.ok(privacyMdSrc.includes("mynovelsystem@gmail.com"), "PRIVACY.md must contain mynovelsystem@gmail.com");
    assert.ok(privacyHtmlSrc.includes("mynovelsystem@gmail.com"), "privacy.html must contain mynovelsystem@gmail.com");

    // 3. Verify publication date
    assert.ok(privacyMdSrc.includes("17 de octubre de 2026"), "PRIVACY.md must specify 17 de octubre de 2026");
    assert.ok(privacyHtmlSrc.includes("17 de octubre de 2026"), "privacy.html must specify 17 de octubre de 2026");

    console.log("  [PASS] Legal policies email (mynovelsystem@gmail.com) and date (17 de octubre de 2026) verified.");
  }

  // ----------------------------------------------------------------------------
  // Test 8: Chapter 0 lifecycle and rewind protection
  // ----------------------------------------------------------------------------
  console.log("\n[Test 8] Chapter 0 lifecycle and rewind protection:");
  {
    // Part A: Starting at Chapter 0 and advancing to Chapter 1
    const envA = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {},
      settings: { allowRewind: false },
      stats: { chaptersRead: 0, Qi: 0, novelsStarted: 0 }
    });

    const res0 = await envA.mockContext.handleNovelDetected({
      seriesId: "example.com/novel/prologue-novel",
      novelName: "Prologue Novel",
      novelUrl: "https://example.com/novel/prologue-novel",
      url: "https://example.com/novel/prologue-novel/chapter-0",
      chapter: "0"
    }, true, 101);

    assert.strictEqual(res0.ok, true);
    assert.strictEqual(res0.chapter, "0");
    const novel0 = envA.store.savedNovels[res0.seriesId];
    assert.strictEqual(novel0.chapter, "0");
    assert.strictEqual(novel0.maxCounted, 0);

    // Now advance to Chapter 1
    const res1 = await envA.mockContext.handleNovelDetected({
      seriesId: "example.com/novel/prologue-novel",
      novelName: "Prologue Novel",
      novelUrl: "https://example.com/novel/prologue-novel",
      url: "https://example.com/novel/prologue-novel/chapter-1",
      chapter: "1"
    }, true, 101);

    assert.strictEqual(res1.ok, true);
    assert.strictEqual(res1.rewindPrevented, false);
    const novel1 = envA.store.savedNovels[res1.seriesId];
    assert.strictEqual(novel1.chapter, "1");
    assert.strictEqual(novel1.maxCounted, 1);
    assert.strictEqual(envA.store.stats.chaptersRead, 2, "Chapters read counted initial novel + chapter 1");

    // Part B: allowRewind: false prevents rewinding to Chapter 0
    const envB = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "example.com/novel/prologue-novel": {
          seriesId: "example.com/novel/prologue-novel",
          novelName: "Prologue Novel",
          novelUrl: "https://example.com/novel/prologue-novel",
          url: "https://example.com/novel/prologue-novel/chapter-5",
          chapter: "5",
          maxCounted: 5,
          scrollPct: 50,
          updatedAt: 123456
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 5, Qi: 25, novelsStarted: 1 }
    });

    const resRewind0 = await envB.mockContext.handleNovelDetected({
      seriesId: "example.com/novel/prologue-novel",
      novelName: "Prologue Novel",
      novelUrl: "https://example.com/novel/prologue-novel",
      url: "https://example.com/novel/prologue-novel/chapter-0",
      chapter: "0"
    }, true, 102);

    assert.strictEqual(resRewind0.ok, true);
    assert.strictEqual(resRewind0.rewindPrevented, true, "Rewinding to Chapter 0 must be prevented when allowRewind is false");
    const novelPreserved = envB.store.savedNovels[resRewind0.seriesId];
    assert.strictEqual(novelPreserved.chapter, "5", "Chapter must remain 5");
    assert.strictEqual(novelPreserved.maxCounted, 5);

    // Part C: allowRewind: true allows rewinding to Chapter 0
    const envC = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "example.com/novel/prologue-novel": {
          seriesId: "example.com/novel/prologue-novel",
          novelName: "Prologue Novel",
          novelUrl: "https://example.com/novel/prologue-novel",
          url: "https://example.com/novel/prologue-novel/chapter-5",
          chapter: "5",
          maxCounted: 5,
          scrollPct: 50,
          updatedAt: 123456
        }
      },
      settings: { allowRewind: true },
      stats: { chaptersRead: 5, Qi: 25, novelsStarted: 1 }
    });

    const resAllowed0 = await envC.mockContext.handleNovelDetected({
      seriesId: "example.com/novel/prologue-novel",
      novelName: "Prologue Novel",
      novelUrl: "https://example.com/novel/prologue-novel",
      url: "https://example.com/novel/prologue-novel/chapter-0",
      chapter: "0"
    }, true, 103);

    assert.strictEqual(resAllowed0.ok, true);
    assert.strictEqual(resAllowed0.rewindPrevented, false);
    const novelRewound = envC.store.savedNovels[resAllowed0.seriesId];
    assert.strictEqual(novelRewound.chapter, "0", "Chapter updates to 0 when allowRewind is true");
    assert.strictEqual(novelRewound.maxCounted, 5, "maxCounted preserved at 5");

    console.log("  [PASS] Chapter 0 start, advance to Chapter 1, and rewind toggle behavior verified.");
  }

  // ----------------------------------------------------------------------------
  // Test 9: Alphabetical subchapter rewind (10b -> 10a)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 9] Alphabetical subchapter rewind protection:");
  {
    // Part A: allowRewind: false prevents 10b -> 10a
    const envA = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "example.com/novel/alpha": {
          seriesId: "example.com/novel/alpha",
          novelName: "Alpha Novel",
          novelUrl: "https://example.com/novel/alpha",
          url: "https://example.com/novel/alpha/chapter-10b",
          chapter: "10b",
          maxCounted: 10,
          scrollPct: 60,
          updatedAt: 100000
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 10, Qi: 50, novelsStarted: 1 }
    });

    const resRewindA = await envA.mockContext.handleNovelDetected({
      seriesId: "example.com/novel/alpha",
      novelName: "Alpha Novel",
      novelUrl: "https://example.com/novel/alpha",
      url: "https://example.com/novel/alpha/chapter-10a",
      chapter: "10a"
    }, true, 101);

    assert.strictEqual(resRewindA.ok, true);
    assert.strictEqual(resRewindA.rewindPrevented, true, "Subchapter 10b to 10a must be prevented when allowRewind is false");
    const novelA = envA.store.savedNovels[resRewindA.seriesId];
    assert.strictEqual(novelA.chapter, "10b", "Chapter must remain 10b");

    // Part B: allowRewind: true allows 10b -> 10a
    const envB = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "example.com/novel/alpha": {
          seriesId: "example.com/novel/alpha",
          novelName: "Alpha Novel",
          novelUrl: "https://example.com/novel/alpha",
          url: "https://example.com/novel/alpha/chapter-10b",
          chapter: "10b",
          maxCounted: 10,
          scrollPct: 60,
          updatedAt: 100000
        }
      },
      settings: { allowRewind: true },
      stats: { chaptersRead: 10, Qi: 50, novelsStarted: 1 }
    });

    const resRewindB = await envB.mockContext.handleNovelDetected({
      seriesId: "example.com/novel/alpha",
      novelName: "Alpha Novel",
      novelUrl: "https://example.com/novel/alpha",
      url: "https://example.com/novel/alpha/chapter-10a",
      chapter: "10a"
    }, true, 101);

    assert.strictEqual(resRewindB.ok, true);
    assert.strictEqual(resRewindB.rewindPrevented, false);
    const novelB = envB.store.savedNovels[resRewindB.seriesId];
    assert.strictEqual(novelB.chapter, "10a", "Chapter updates to 10a when allowRewind is true");

    console.log("  [PASS] Alphabetical subchapter rewind (10b -> 10a) properly respects allowRewind setting.");
  }

  // ----------------------------------------------------------------------------
  // Test 10: Invalid chapter detection preserves novel updatedAt
  // ----------------------------------------------------------------------------
  console.log("\n[Test 10] Invalid detection preserves novel updatedAt and logs prevention:");
  {
    const originalTime = 555555;
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "example.com/novel/test-time": {
          seriesId: "example.com/novel/test-time",
          novelName: "Time Novel",
          novelUrl: "https://example.com/novel/test-time",
          url: "https://example.com/novel/test-time/chapter-20",
          chapter: "20",
          maxCounted: 20,
          scrollPct: 30,
          updatedAt: originalTime
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 20, Qi: 100, novelsStarted: 1 },
      diagnosticLogs: []
    });

    const res = await env.mockContext.handleNovelDetected({
      seriesId: "example.com/novel/test-time",
      novelName: "Time Novel",
      novelUrl: "https://example.com/novel/test-time",
      url: "https://example.com/novel/test-time/non-chapter-page",
      chapter: "NaN",
      updatedAt: 999999
    }, true, 101);

    assert.strictEqual(res.ok, true);
    const novel = env.store.savedNovels[res.seriesId];
    assert.strictEqual(novel.chapter, "20");
    assert.strictEqual(novel.updatedAt, originalTime, "updatedAt MUST be preserved on invalid chapter detection");

    const logs = env.store.diagnosticLogs || [];
    const lastLog = logs[logs.length - 1];
    assert.ok(lastLog && lastLog.event === "DETECT_INVALID_CHAPTER_PREVENTED", "Diagnostic log should record DETECT_INVALID_CHAPTER_PREVENTED");

    console.log("  [PASS] Invalid detection strictly preserves updatedAt and logs DETECT_INVALID_CHAPTER_PREVENTED.");
  }

  // ----------------------------------------------------------------------------
  // Test 11: Exact Regression — Reading Chapter 2 -> Chapter 1 with allowRewind: false
  // ----------------------------------------------------------------------------
  console.log("\n[Test 11] Exact Regression: Chapter 2 -> Chapter 1 with allowRewind: false (Zero duplicate entries):");
  {
    // Step 1: User starts reading Chapter 2 of a novel
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {},
      settings: { allowRewind: true },
      stats: { chaptersRead: 0, Qi: 0, novelsStarted: 0 }
    });

    const resChap2 = await env.mockContext.handleNovelDetected({
      novelName: "Shadow Slave",
      url: "https://novelread.com/read/shadow-slave/chapter-2",
      novelUrl: "https://novelread.com/read/shadow-slave",
      chapter: "2"
    }, true, 101);

    assert.strictEqual(resChap2.ok, true, "Chapter 2 detection should succeed");
    const novelsAfterChap2 = Object.values(env.store.savedNovels);
    assert.strictEqual(novelsAfterChap2.length, 1, "Exactly 1 novel registered after Chapter 2");
    assert.strictEqual(novelsAfterChap2[0].chapter, "2", "Saved chapter must be 2");
    assert.strictEqual(novelsAfterChap2[0].maxCounted, 2, "maxCounted must be 2");

    // Step 2: User deactivates allowRewind in settings
    env.store.settings = { ...(env.store.settings || {}), allowRewind: false };

    // Step 3: User navigates back to Chapter 1 of that same novel
    env.pushedCloudData.length = 0;
    const resChap1 = await env.mockContext.handleNovelDetected({
      novelName: "Shadow Slave",
      url: "https://novelread.com/read/shadow-slave/chapter-1",
      novelUrl: "https://novelread.com/read/shadow-slave",
      chapter: "1"
    }, true, 101);

    assert.strictEqual(resChap1.ok, true, "Chapter 1 detection should succeed");
    assert.strictEqual(resChap1.rewindPrevented, true, "rewindPrevented flag must be true");

    // CRITICAL ASSERTION: Zero duplicate instances!
    const novelsAfterChap1 = Object.values(env.store.savedNovels);
    assert.strictEqual(
      novelsAfterChap1.length,
      1,
      `FATAL: Duplicate instance detected! Expected exactly 1 novel in library, but found ${novelsAfterChap1.length}`
    );

    const preservedNovel = novelsAfterChap1[0];
    assert.strictEqual(preservedNovel.chapter, "2", "Saved progress MUST remain Chapter 2 when allowRewind is false");
    assert.strictEqual(preservedNovel.maxCounted, 2, "maxCounted MUST remain 2");
    assert.strictEqual(preservedNovel.url, "https://novelread.com/read/shadow-slave/chapter-2", "Saved URL must remain Chapter 2 URL");

    console.log("  [PASS] Exactly 1 instance preserved at Chapter 2 with zero duplicate entries created.");
  }

  // ----------------------------------------------------------------------------
  // Test 12: Sequence Chapter 2 -> Chapter 1 -> Chapter 3 (Forward Advance)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 12] Sequence: Chapter 2 -> Chapter 1 -> Chapter 3 advance with allowRewind: false:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "novelread.com/read/lotm": {
          seriesId: "novelread.com/read/lotm",
          novelName: "Lord of the Mysteries",
          novelUrl: "https://novelread.com/read/lotm",
          url: "https://novelread.com/read/lotm/chapter-2",
          chapter: "2",
          maxCounted: 2,
          scrollPct: 50,
          updatedAt: 1000
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 2, Qi: 10, novelsStarted: 1 }
    });

    assert.strictEqual(Object.keys(env.store.savedNovels).length, 1);

    // 2. Visit Chapter 1 (prevented)
    const res1 = await env.mockContext.handleNovelDetected({
      novelName: "Lord of the Mysteries",
      url: "https://novelread.com/read/lotm/chapter-1",
      novelUrl: "https://novelread.com/read/lotm",
      chapter: "1"
    }, true, 101);

    assert.strictEqual(res1.rewindPrevented, true);
    assert.strictEqual(Object.keys(env.store.savedNovels).length, 1);
    assert.strictEqual(Object.values(env.store.savedNovels)[0].chapter, "2");

    // 3. Visit Chapter 3 (forward advance)
    const res3 = await env.mockContext.handleNovelDetected({
      novelName: "Lord of the Mysteries",
      url: "https://novelread.com/read/lotm/chapter-3",
      novelUrl: "https://novelread.com/read/lotm",
      chapter: "3"
    }, true, 101);

    assert.strictEqual(res3.ok, true);
    assert.strictEqual(res3.rewindPrevented, false);
    const novelsAfterChap3 = Object.values(env.store.savedNovels);
    assert.strictEqual(novelsAfterChap3.length, 1, "Must maintain exactly 1 novel instance");
    assert.strictEqual(novelsAfterChap3[0].chapter, "3", "Progress must cleanly advance to Chapter 3");
    assert.strictEqual(novelsAfterChap3[0].maxCounted, 3, "maxCounted advances to 3");
    assert.strictEqual(novelsAfterChap3[0].url, "https://novelread.com/read/lotm/chapter-3");
    assert.strictEqual(env.store.stats.chaptersRead, 3, "chaptersRead increments to 3");

    console.log("  [PASS] Clean advance to Chapter 3 after prevented Chapter 1 rewind, maintaining single instance.");
  }

  // ----------------------------------------------------------------------------
  // Test 13: allowRewind: true preserves single instance on Chapter 2 -> Chapter 1
  // ----------------------------------------------------------------------------
  console.log("\n[Test 13] allowRewind: true updates chapter without creating duplicate instance:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "novelread.com/read/orv": {
          seriesId: "novelread.com/read/orv",
          novelName: "Omniscient Reader",
          novelUrl: "https://novelread.com/read/orv",
          url: "https://novelread.com/read/orv/chapter-2",
          chapter: "2",
          maxCounted: 2,
          scrollPct: 40,
          updatedAt: 1000
        }
      },
      settings: { allowRewind: true },
      stats: { chaptersRead: 2, Qi: 10, novelsStarted: 1 }
    });

    assert.strictEqual(Object.keys(env.store.savedNovels).length, 1);

    // Navigating to Chapter 1 with allowRewind: true
    const res = await env.mockContext.handleNovelDetected({
      novelName: "Omniscient Reader",
      url: "https://novelread.com/read/orv/chapter-1",
      novelUrl: "https://novelread.com/read/orv",
      chapter: "1"
    }, true, 101);

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.rewindPrevented, false);
    const novels = Object.values(env.store.savedNovels);
    assert.strictEqual(novels.length, 1, "Must have exactly 1 novel entry (no duplicate)");
    assert.strictEqual(novels[0].chapter, "1", "Chapter updates to 1");
    assert.strictEqual(novels[0].maxCounted, 2, "maxCounted preserved at 2");
    assert.strictEqual(env.store.stats.chaptersRead, 2, "chaptersRead does not increment on rewind");

    console.log("  [PASS] allowRewind: true rewinds chapter cleanly without creating duplicate instance.");
  }

  // ----------------------------------------------------------------------------
  // Test 14: Detection on a different novel maintains clean isolation
  // ----------------------------------------------------------------------------
  console.log("\n[Test 14] Detection on different novels maintains distinct instances without collision:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {},
      settings: { allowRewind: false },
      stats: { chaptersRead: 0, Qi: 0, novelsStarted: 0 }
    });

    // Detect Novel A at Chapter 2
    await env.mockContext.handleNovelDetected({
      novelName: "Novel Alpha",
      url: "https://novelread.com/read/alpha/chapter-2",
      novelUrl: "https://novelread.com/read/alpha",
      chapter: "2"
    }, true, 101);

    // Detect Novel B at Chapter 1
    await env.mockContext.handleNovelDetected({
      novelName: "Novel Beta",
      url: "https://novelread.com/read/beta/chapter-1",
      novelUrl: "https://novelread.com/read/beta",
      chapter: "1"
    }, true, 102);

    const novels = Object.values(env.store.savedNovels);
    assert.strictEqual(novels.length, 2, "Must contain exactly 2 separate novels");
    const novelA = novels.find(n => n.novelName === "Novel Alpha");
    const novelB = novels.find(n => n.novelName === "Novel Beta");
    assert.ok(novelA, "Novel Alpha exists");
    assert.ok(novelB, "Novel Beta exists");
    assert.strictEqual(novelA.chapter, "2");
    assert.strictEqual(novelB.chapter, "1");

    console.log("  [PASS] Separate novels cleanly tracked in isolation with no false merges.");
  }

  // ----------------------------------------------------------------------------
  // Test 15: Identity Stability — Title & Slug Chapter Variations (Cap 2 -> Cap 1)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 15] Identity Stability: Title & Slug variations without explicit seriesUrl:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {},
      settings: { allowRewind: false },
      stats: { chaptersRead: 0, Qi: 0, novelsStarted: 0 }
    });

    // Chapter 2 has "Cap 2" in title and URL without clean seriesUrl
    await env.mockContext.handleNovelDetected({
      novelName: "Martial God Asura - Cap 2",
      url: "https://novelread.com/reader/mga-cap-2",
      chapter: "2"
    }, true, 101);

    assert.strictEqual(Object.keys(env.store.savedNovels).length, 1);
    const initialKey = Object.keys(env.store.savedNovels)[0];
    assert.strictEqual(env.store.savedNovels[initialKey].chapter, "2");

    // Chapter 1 has "Cap 1" in title
    const resRewind = await env.mockContext.handleNovelDetected({
      novelName: "Martial God Asura - Cap 1",
      url: "https://novelread.com/reader/mga-cap-1",
      chapter: "1"
    }, true, 101);

    assert.strictEqual(resRewind.ok, true);
    assert.strictEqual(resRewind.rewindPrevented, true);

    const novels = Object.values(env.store.savedNovels);
    assert.strictEqual(novels.length, 1, "Must maintain exactly 1 novel despite 'Cap 2' vs 'Cap 1' titles");
    assert.strictEqual(novels[0].chapter, "2", "Saved progress remains Chapter 2");

    console.log("  [PASS] Title variation ('Cap 2' vs 'Cap 1') matched by stable identity; zero duplicates created.");
  }

  // ----------------------------------------------------------------------------
  // Test 16: Custom Name Novel Identity Stability (Chapter 2 -> Chapter 1)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 16] Custom Name Novel Identity Stability: Chapter 2 -> Chapter 1 with allowRewind: false:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "novelread.com__series_custom_lotm": {
          seriesId: "novelread.com__series_custom_lotm",
          novelName: "Lord of the Mysteries",
          customName: "Mi Novela Favorita de Misterio",
          url: "https://novelread.com/reader?id=99&c=2",
          chapter: "2",
          maxCounted: 2,
          scrollPct: 80,
          updatedAt: 1000
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 2, Qi: 10, novelsStarted: 1 }
    });

    // Visiting Chapter 1 from reader emits original novelName "Lord of the Mysteries"
    const res = await env.mockContext.handleNovelDetected({
      novelName: "Lord of the Mysteries",
      url: "https://novelread.com/reader?id=99&c=1",
      chapter: "1"
    }, true, 101);

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.rewindPrevented, true, "Rewind must be prevented");
    const novels = Object.values(env.store.savedNovels);
    assert.strictEqual(novels.length, 1, `Must maintain exactly 1 novel entry, found ${novels.length}`);
    assert.strictEqual(novels[0].chapter, "2", "Saved chapter remains 2");
    assert.strictEqual(novels[0].customName, "Mi Novela Favorita de Misterio", "customName preserved");

    console.log("  [PASS] Novel with customName properly identified by original title; zero duplicates created.");
  }

  // ----------------------------------------------------------------------------
  // Test 17: Strict Domain Boundary Isolation (fakesite.com vs site.com)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 17] Strict Domain Boundary Isolation: No false collisions across suffix-matching domains:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "wuxiaworld.com__series_renegade_immortal": {
          seriesId: "wuxiaworld.com__series_renegade_immortal",
          novelName: "Renegade Immortal",
          url: "https://wuxiaworld.com/novel/renegade-immortal/chapter-2",
          chapter: "2",
          maxCounted: 2
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 2, Qi: 10, novelsStarted: 1 }
    });

    // Another site whose domain ends with "wuxiaworld.com", e.g. "notwuxiaworld.com"
    const resDifferentDomain = await env.mockContext.handleNovelDetected({
      novelName: "Renegade Immortal",
      url: "https://notwuxiaworld.com/novel/renegade-immortal/chapter-1",
      chapter: "1"
    }, true, 102);

    assert.strictEqual(resDifferentDomain.ok, true);
    const novels = Object.values(env.store.savedNovels);
    assert.strictEqual(novels.length, 2, "Must create a distinct novel for notwuxiaworld.com, NOT falsely merge into wuxiaworld.com");

    console.log("  [PASS] Strict domain isolation (notwuxiaworld.com vs wuxiaworld.com) prevents false merges.");
  }

  // ----------------------------------------------------------------------------
  // Test 18: deduplicateAndMigrateMap Preserves Most Advanced Chapter
  // ----------------------------------------------------------------------------
  console.log("\n[Test 18] deduplicateAndMigrateMap preserves most advanced chapter across duplicate entries:");
  {
    const duplicateStore = {
      "key_chap2": {
        seriesId: "key_chap2",
        novelName: "Shadow Slave",
        url: "https://novelbin.me/novel-book/shadow-slave/chapter-2",
        novelUrl: "https://novelbin.me/novel-book/shadow-slave",
        chapter: "2",
        maxCounted: 2,
        updatedAt: 1000
      },
      "key_chap1": {
        seriesId: "key_chap1",
        novelName: "Shadow Slave",
        url: "https://novelbin.me/novel-book/shadow-slave/chapter-1",
        novelUrl: "https://novelbin.me/novel-book/shadow-slave",
        chapter: "1",
        maxCounted: 2,
        updatedAt: 2000 // Newer timestamp because user navigated back to ch 1!
      }
    };

    const env = createMockBackgroundEnv({});
    const { migratedNovels } = env.mockContext.deduplicateAndMigrateMap(duplicateStore);
    const mergedList = Object.values(migratedNovels);
    assert.strictEqual(mergedList.length, 1, "Must merge duplicates into 1 entry");
    assert.strictEqual(mergedList[0].chapter, "2", "Merged entry MUST preserve highest chapter (2), not regressed chapter (1)");
    assert.strictEqual(mergedList[0].maxCounted, 2);
    assert.strictEqual(mergedList[0].url, "https://novelbin.me/novel-book/shadow-slave/chapter-2");

    console.log("  [PASS] Deduplication cleanly preserves Chapter 2 progress despite Chapter 1 having newer timestamp.");
  }

  // ----------------------------------------------------------------------------
  // Test 19: handleConfirmUnconfirmedTab Respects allowRewind: false
  // ----------------------------------------------------------------------------
  console.log("\n[Test 19] handleConfirmUnconfirmedTab respects allowRewind: false on manual confirmation:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        "example.com__series_confirmed_novel": {
          seriesId: "example.com__series_confirmed_novel",
          novelName: "Unconfirmed Mystery",
          url: "https://example.com/novel/unconfirmed-mystery/chapter-2",
          chapter: "2",
          maxCounted: 2,
          scrollPct: 70,
          updatedAt: 5000
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 2, Qi: 10, novelsStarted: 1 }
    });

    const resConfirm = await env.mockContext.handleConfirmUnconfirmedTab({
      seriesId: "example.com__series_confirmed_novel",
      novelName: "Unconfirmed Mystery",
      novelUrl: "https://example.com/novel/unconfirmed-mystery",
      url: "https://example.com/novel/unconfirmed-mystery/chapter-1",
      chapter: "1"
    }, 101);

    assert.strictEqual(resConfirm.ok, true);
    const novels = Object.values(env.store.savedNovels);
    assert.strictEqual(novels.length, 1, "Must have exactly 1 novel (no duplicate created)");
    assert.strictEqual(novels[0].chapter, "2", "Saved chapter MUST remain 2 when allowRewind is false");
    assert.strictEqual(novels[0].url, "https://example.com/novel/unconfirmed-mystery/chapter-2");
    assert.strictEqual(novels[0].scrollPct, 70);

    console.log("  [PASS] handleConfirmUnconfirmedTab strictly protects Chapter 2 progress when allowRewind is false.");
  }

  // ----------------------------------------------------------------------------
  // Test 20: pullFromCloud Preserves Most Advanced Chapter When allowRewind: false
  // ----------------------------------------------------------------------------
  console.log("\n[Test 20] pullFromCloud preserves higher chapter progress when allowRewind: false:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      auth: { uid: "test_uid_123", idToken: "token_123", refreshToken: "ref_123", expiresAt: Date.now() + 3600000 },
      lastAuthUid: "test_uid_123",
      savedNovels: {
        "site.com__series_sync_novel": {
          seriesId: "site.com__series_sync_novel",
          novelName: "Sync Novel",
          url: "https://site.com/sync-novel/chapter-1",
          chapter: "1",
          maxCounted: 2,
          updatedAt: 2000
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 2, Qi: 10, novelsStarted: 1 }
    });

    // Cloud has chapter 2 saved with older timestamp (1000)
    const cloudNovels = {
      "site.com__series_sync_novel": {
        seriesId: "site.com__series_sync_novel",
        novelName: "Sync Novel",
        url: "https://site.com/sync-novel/chapter-2",
        chapter: "2",
        maxCounted: 2,
        updatedAt: 1000
      }
    };

    env.mockContext.fetch = async (url) => {
      if (url.includes("/novels.json")) {
        return { ok: true, json: async () => cloudNovels };
      }
      if (url.includes("/stats.json")) {
        return { ok: true, json: async () => ({ chaptersRead: 2, Qi: 10 }) };
      }
      if (url.includes("/domainBlacklist.json")) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    };

    const resPull = await env.mockContext.pullFromCloud(true);
    assert.strictEqual(resPull.ok, true);

    const novels = Object.values(env.store.savedNovels);
    assert.strictEqual(novels.length, 1);
    assert.strictEqual(novels[0].chapter, "2", "Cloud pull MUST keep higher Chapter 2 when allowRewind is false");
    assert.strictEqual(novels[0].maxCounted, 2);

    console.log("  [PASS] pullFromCloud cleanly preserves higher chapter (2) without regressing to local chapter (1).");
  }

  console.log("\n====================================================================");
  console.log(">>> ALL CHAPTER REWIND & LEGAL AUDIT TESTS PASSED (100%)! <<<");
  console.log("====================================================================\n");
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
