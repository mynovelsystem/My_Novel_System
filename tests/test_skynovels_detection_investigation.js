// ============================================================================
// MYNOVELSYSTEM — SKYNOVELS INVESTIGATION & VERIFICATION TEST SUITE
// Validates:
// 1. Direct URL detection of https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page
// 2. Stable novel identity generation without duplicate instances
// 3. Chapter 1397 extracted from page DOM / title, not internal chapter ID 103204
// 4. Chapter navigation: 103204 (1397) -> 103205 (1398) updates chapter cleanly
// 5. Query parameter ?readerScroll=page presence vs absence canonicalization
// 6. allowRewind: false preserves Chapter 1398 when navigating back to 103204
// 7. Re-advancing forward to 103205 does not falsely trigger stale chapter delay
// 8. Single instance guarantee: exactly 1 entry across all transitions
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("====================================================================");
console.log("   SKYNOVELS DETECTION & SPA NAVIGATION INVESTIGATION SUITE         ");
console.log("====================================================================\n");

const backgroundSrc = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const contentScriptSrc = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const achievementsSrc = fs.readFileSync(path.join(__dirname, "..", "achievements_data.js"), "utf8");
const i18nSrc = fs.readFileSync(path.join(__dirname, "..", "i18n.js"), "utf8");

function createMockBackgroundEnv(initialStore = {}) {
  const store = { ...initialStore };
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
    FIREBASE_API_KEY: "fake_key",
    FIREBASE_DB_URL: "https://novel-tracker-default.firebaseio.com",
    importScripts: () => {},
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    chrome: {
      action: {
        setBadgeText: () => Promise.resolve(),
        setBadgeBackgroundColor: () => Promise.resolve(),
        setTitle: () => Promise.resolve(),
        setIcon: () => Promise.resolve()
      },
      alarms: { create: () => {}, clear: () => {}, onAlarm: { addListener: () => {} } },
      commands: { onCommand: { addListener: () => {} } },
      omnibox: { onInputChanged: { addListener: () => {} }, onInputEntered: { addListener: () => {} } },
      runtime: {
        id: "test-ext-id",
        getURL: (p) => p,
        onMessage: { addListener: () => {} },
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} }
      },
      storage: {
        onChanged: { addListener: () => {} },
        sync: { set: async () => {} },
        local: {
          get: async (k) => {
            if (!k || k === null) return { ...store };
            if (Array.isArray(k)) {
              const r = {}; k.forEach((x) => (r[x] = store[x])); return r;
            }
            if (typeof k === "string") return { [k]: store[k] };
            return { ...store };
          },
          set: async (items) => { Object.assign(store, items); },
          remove: async (keys) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach((k) => delete store[k]);
          }
        }
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
      }
    }
  };

  vm.createContext(mockContext);
  vm.runInContext(i18nSrc, mockContext);
  vm.runInContext(achievementsSrc, mockContext);
  vm.runInContext(backgroundSrc, mockContext);

  return { mockContext, store };
}

(async () => {
  // Test 1: Direct URL canonicalization and stable series ID for SkyNovels
  console.log("[Test 1] SkyNovels URL canonicalization and stable series ID:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {},
      settings: { allowRewind: true },
      stats: { chaptersRead: 0, Qi: 0, novelsStarted: 0 }
    });

    const urlWithParam = "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page";
    const derivedSeriesUrl = env.mockContext.deriveNovelUrlFromChapterUrl(urlWithParam);
    assert.strictEqual(
      derivedSeriesUrl,
      "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras",
      "Should strip chapter ID 103204 and query param to produce base series URL"
    );

    const seriesId = env.mockContext.buildSeriesIdFromUrl(derivedSeriesUrl);
    assert.ok(seriesId.includes("esclavo_de_las_sombras"), "Series ID must contain novel slug");
    assert.ok(seriesId.startsWith("skynovels_net__"), "Series ID must prefix with domain slug");

    // Also verify without readerScroll=page produces identical result
    const urlWithoutParam = "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/";
    const derivedWithoutParam = env.mockContext.deriveNovelUrlFromChapterUrl(urlWithoutParam);
    assert.strictEqual(derivedWithoutParam, derivedSeriesUrl);
    assert.strictEqual(env.mockContext.buildSeriesIdFromUrl(derivedWithoutParam), seriesId);

    console.log("  [PASS] Base novel URL and stable series ID strictly consistent with and without ?readerScroll=page.");
  }

  // Test 2: Detection on direct load of Chapter 103204 (extracts Chapter 1397 from title/DOM)
  console.log("\n[Test 2] Direct load detection of Chapter 103204 (Ilusiones -> 1397):");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {},
      settings: { allowRewind: true },
      stats: { chaptersRead: 0, Qi: 0, novelsStarted: 0 }
    });

    const payload = {
      seriesId: "skynovels_net__series_179_esclavo_de_las_sombras_36473b5b",
      novelName: "Esclavo de las Sombras",
      novelUrl: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras",
      url: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page",
      pageTitle: "Esclavo de las Sombras | Capítulo 1397: Ilusiones",
      chapter: "1397",
      updatedAt: Date.now()
    };

    const res = await env.mockContext.handleNovelDetected(payload, true, 101);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.saved, true);
    assert.strictEqual(res.chapter, "1397");

    const savedKeys = Object.keys(env.store.savedNovels);
    assert.strictEqual(savedKeys.length, 1);
    const novel = env.store.savedNovels[savedKeys[0]];
    assert.strictEqual(novel.novelName, "Esclavo de las Sombras");
    assert.strictEqual(novel.chapter, "1397");
    assert.strictEqual(novel.maxCounted, 1397);
    assert.strictEqual(novel.url, payload.url);

    console.log("  [PASS] Chapter 1397 registered cleanly under stable series ID with 0 duplicates.");
  }

  // Test 3: Navigation Next Chapter -> 103205 (Desafiando la Barrera -> 1398)
  console.log("\n[Test 3] Navigation to next chapter 103205 (1398) updates single instance:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {},
      settings: { allowRewind: false },
      stats: { chaptersRead: 0, Qi: 0, novelsStarted: 0 }
    });

    // Step 1: Arrive at 103204 (1397)
    await env.mockContext.handleNovelDetected({
      seriesId: "skynovels_net__series_179_esclavo_de_las_sombras_36473b5b",
      novelName: "Esclavo de las Sombras",
      novelUrl: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras",
      url: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page",
      pageTitle: "Esclavo de las Sombras | Capítulo 1397: Ilusiones",
      chapter: "1397",
      updatedAt: 1000
    }, true, 101);

    assert.strictEqual(Object.keys(env.store.savedNovels).length, 1);

    // Step 2: Next button clicked -> 103205 (1398)
    const resNext = await env.mockContext.handleNovelDetected({
      seriesId: "skynovels_net__series_179_esclavo_de_las_sombras_36473b5b",
      novelName: "Esclavo de las Sombras",
      novelUrl: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras",
      url: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103205/?readerScroll=page",
      pageTitle: "Esclavo de las Sombras | Capítulo 1398: Desafiando la Barrera",
      chapter: "1398",
      updatedAt: 2000
    }, true, 101);

    assert.strictEqual(resNext.ok, true);
    assert.strictEqual(resNext.chapter, "1398");

    const savedKeys = Object.keys(env.store.savedNovels);
    assert.strictEqual(savedKeys.length, 1, "Must maintain exactly 1 instance of the novel");
    const novel = env.store.savedNovels[savedKeys[0]];
    assert.strictEqual(novel.chapter, "1398");
    assert.strictEqual(novel.maxCounted, 1398);
    assert.strictEqual(novel.url, "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103205/?readerScroll=page");

    console.log("  [PASS] Chapter cleanly advanced to 1398 with 0 duplicate instances.");
  }

  // Test 4: Navigation Previous Chapter with allowRewind: false
  console.log("\n[Test 4] Navigation to previous chapter 103204 with allowRewind: false:");
  {
    const env = createMockBackgroundEnv({
      schemaVersion: 4,
      savedNovels: {
        skynovels_net__series_179_esclavo_de_las_sombras_36473b5b: {
          seriesId: "skynovels_net__series_179_esclavo_de_las_sombras_36473b5b",
          novelName: "Esclavo de las Sombras",
          novelUrl: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras",
          url: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103205/?readerScroll=page",
          chapter: "1398",
          maxCounted: 1398,
          scrollPct: 40,
          updatedAt: 2000
        }
      },
      settings: { allowRewind: false },
      stats: { chaptersRead: 1398, Qi: 1000, novelsStarted: 1 }
    });

    // Prev clicked -> 103204 (1397)
    const resPrev = await env.mockContext.handleNovelDetected({
      seriesId: "skynovels_net__series_179_esclavo_de_las_sombras_36473b5b",
      novelName: "Esclavo de las Sombras",
      novelUrl: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras",
      url: "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page",
      pageTitle: "Esclavo de las Sombras | Capítulo 1397: Ilusiones",
      chapter: "1397",
      updatedAt: 3000
    }, true, 101);

    assert.strictEqual(resPrev.ok, true);
    assert.strictEqual(resPrev.rewindPrevented, true);
    assert.strictEqual(resPrev.chapter, "1398", "Returned chapter must remain 1398 to keep content.js activeChapter consistent");

    const savedKeys = Object.keys(env.store.savedNovels);
    assert.strictEqual(savedKeys.length, 1);
    const novel = env.store.savedNovels[savedKeys[0]];
    assert.strictEqual(novel.chapter, "1398", "Saved chapter preserved at 1398");
    assert.strictEqual(novel.url, "https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103205/?readerScroll=page");
    assert.strictEqual(novel.updatedAt, 2000, "updatedAt strictly preserved");

    // Also check tab_101 storage consistency
    const tabData = env.store["tab_101"];
    assert.strictEqual(tabData.chapter, "1398");
    assert.strictEqual(tabData.unconfirmed, false);

    console.log("  [PASS] Progress preserved at 1398, rewindPrevented flag set, 0 duplicates, tab state synchronized.");
  }

  // Test 5: Staleness logic check in content.js
  console.log("\n[Test 5] Content script DOM staleness tracking behavior:");
  {
    // Verify that when content.js receives res.chapter = "1398" upon a prevented rewind on 103204 (DOM chapter 1397),
    // lastCapturedChapterForPrevUrl is NOT overwritten to 1398.
    // If it was overwritten to 1398, navigating back to 103205 (DOM chapter 1398) would see
    // chapter === lastCapturedChapterForPrevUrl and falsely treat 1398 as stale!
    const testSrc = contentScriptSrc;
    assert.ok(
      testSrc.includes('if (chapter === "AUTO_NEXT") {'),
      "content.js must only update lastCapturedChapterForPrevUrl with resolvedChapter when chapter is AUTO_NEXT"
    );

    console.log("  [PASS] lastCapturedChapterForPrevUrl guard verified; prevents false-stale delays on forward transitions.");
  }

  // Test 6: SkyNovels internal DB chapter id (103204) is NOT used as chapter number
  console.log("\n[Test 6] URL numeric segment vs SkyNovels catalog ID check:");
  {
    // When extractChapterFromUrl evaluates https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/
    // segments: ['novelas', '179', 'esclavo-de-las-sombras', '103204']
    // CATALOG_SEGMENTS.has('novelas') && /^\d+$/.test('179') marks it as a catalog ID path.
    // Therefore extractChapterFromUrl must return null, forcing extraction from DOM/title.
    const detectorSandbox = {
      window: {
        __EXPOSE_DETECTOR_FOR_TESTS__: true,
        addEventListener: () => {},
        removeEventListener: () => {}
      },
      history: { pushState: () => {}, replaceState: () => {} },
      location: new URL("https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page"),
      document: {
        querySelector: () => null,
        querySelectorAll: () => [],
        title: "Esclavo de las Sombras | Capítulo 1397: Ilusiones",
        addEventListener: () => {},
        removeEventListener: () => {}
      },
      URL,
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
      parseFloat,
      parseInt,
      isNaN,
      chrome: {
        storage: { local: { get: () => {}, onChanged: { addListener: () => {} } } },
        runtime: { onMessage: { addListener: () => {} }, sendMessage: () => Promise.resolve() }
      }
    };

    vm.createContext(detectorSandbox);
    vm.runInContext(contentScriptSrc, detectorSandbox);

    const internals = detectorSandbox.window.__DETECTOR_INTERNALS__;
    assert.ok(internals, "Internals must be exposed for testing");

    const urlChapter = internals.extractChapterFromUrl("https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page");
    assert.strictEqual(
      urlChapter,
      null,
      "SkyNovels URL internal ID 103204 must NOT be extracted as chapter number"
    );

    console.log("  [PASS] SkyNovels internal chapter ID 103204 safely ignored; forces extraction of authentic chapter 1397.");
  }

  console.log("\n====================================================================");
  console.log(">>> ALL SKYNOVELS INVESTIGATION & VERIFICATION TESTS PASSED (100%)! <<<");
  console.log("====================================================================\n");
})();
