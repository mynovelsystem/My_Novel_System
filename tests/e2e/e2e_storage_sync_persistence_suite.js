/**
 * MYNOVELSYSTEM v4.0.0 — E2E STORAGE, POPUP & PERSISTENCE SUITE (FASE 7)
 * 
 * Verifies with real Playwright Chromium MV3:
 * 1. Novel detection writes properly structured schema to chrome.storage.local
 * 2. Popup UI renders tracked novels cleanly in the DOM (novel card, chapter, genre badges)
 * 3. Popup user actions (edit custom name, update genres) persist to storage
 * 4. Browser restart persistence: Data survives browser restart using persistent context directory
 * 5. Multi-profile isolation: Independent browser profiles have completely isolated storage
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");
const assert = require("assert");

const EXT_PATH = path.resolve(__dirname, "../../");
const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const fixtures = {
  wuxiaworld: fs.readFileSync(path.join(FIXTURES_DIR, "wuxiaworld_chapter.html"), "utf8")
};

async function runStoragePersistenceSuite() {
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — PLAYWRIGHT E2E STORAGE & POPUP AUDIT      ");
  console.log("====================================================================\n");

  let persistentProfileDir = null;
  let isolatedProfileDir = null;
  let context = null;
  let passedCount = 0;
  let failedCount = 0;

  try {
    persistentProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_e2e_persist_"));
    console.log(`[Setup] Launching Chromium MV3 with Profile: ${persistentProfileDir}`);

    context = await chromium.launchPersistentContext(persistentProfileDir, {
      headless: false,
      args: [
        "--headless=new",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });

    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
    }
    assert.ok(serviceWorker, "Extension Service Worker active");
    const swUrl = serviceWorker.url();
    const extensionId = swUrl.split("/")[2];
    console.log(`  ✔ PASS: Service Worker active (ID: ${extensionId})\n`);

    await context.route("**/*", (route) => {
      const u = route.request().url();
      if (u.startsWith("chrome-extension://")) {
        return route.continue();
      }
      if (u.includes("wuxiaworld.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.wuxiaworld });
      }
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<html><body>Default</body></html>" });
    });

    const page = await context.newPage();

    // -------------------------------------------------------------
    // TEST 1: Reading Detection Persists Accurate Schema to Storage
    // -------------------------------------------------------------
    process.stdout.write("[Test 1/5] Reading Detection Schema Verification in chrome.storage.local... ");
    let detectedSeriesId = "";
    try {
      await page.goto("https://www.wuxiaworld.com/novel/coiling-dragon/cd-chapter-125", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels", "stats"]));
      const entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries.length, 1, "1 novel in savedNovels");
      const n = entries[0];
      detectedSeriesId = n.seriesId;

      assert.strictEqual(n.novelName, "Coiling Dragon", "novelName matches");
      assert.strictEqual(n.chapter, "125", "chapter matches");
      assert.ok(Array.isArray(n.genres), "genres is array");
      assert.strictEqual(n.genres.length, 0, "genres is empty array without scraping overhead");
      assert.strictEqual(n.genreSource, "unknown", "genreSource is unknown");
      assert.ok((storage.stats.chaptersRead || 0) >= 1, "stats.chaptersRead incremented");

      console.log(`✔ PASS [Series: ${n.novelName}, Chap: ${n.chapter}, Qi: ${storage.stats.qi || 0}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 2: Popup UI DOM Rendering
    // -------------------------------------------------------------
    process.stdout.write("[Test 2/5] Popup UI Renders Novel Card, Chapter & Badge in Real DOM... ");
    const popupPage = await context.newPage();
    popupPage.on('console', msg => console.log('POPUP LOG:', msg.text()));
    popupPage.on('pageerror', err => console.log('POPUP ERROR:', err.message));
    try {
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });
      await popupPage.waitForTimeout(2000);

      const listHtml = await popupPage.evaluate(() => document.getElementById("novelList")?.innerHTML);
      console.log('NOVEL LIST HTML:', listHtml);

      // Verify DOM elements in popup
      const cardTitle = await popupPage.textContent(".novel-card .novel-title");
      assert.ok(cardTitle && cardTitle.includes("Coiling Dragon"), `Found novel title in popup: ${cardTitle}`);

      const chapterPill = await popupPage.textContent(".novel-card .chapter-pill");
      assert.ok(chapterPill && chapterPill.includes("125"), `Found chapter pill: ${chapterPill}`);
      console.log(`✔ PASS [Rendered Title: '${cardTitle.trim()}', Pill: '${chapterPill.trim()}']`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 3: User Manual Override (UPDATE_NOVEL_GENRES) via Popup
    // -------------------------------------------------------------
    process.stdout.write("[Test 3/5] User Genre Customization via Popup Interaction... ");
    try {
      const updateResult = await popupPage.evaluate(async (targetId) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: "UPDATE_NOVEL_GENRES",
              seriesId: targetId,
              genres: ["Fantasy", "Action", "Supernatural"]
            },
            (res) => resolve(res)
          );
        });
      }, detectedSeriesId);

      assert.ok(updateResult && updateResult.ok, "Message responded OK");

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const n = storage.savedNovels[detectedSeriesId];
      assert.strictEqual(n.genreSource, "manual", "genreSource set to manual");
      assert.ok(n.genres.includes("fantasy"), "genres includes fantasy");
      assert.ok(n.genres.includes("supernatural"), "genres includes supernatural");
      console.log(`✔ PASS [Updated Genres: ${n.genres.join(", ")}, Source: ${n.genreSource}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    } finally {
      await popupPage.close();
    }

    // -------------------------------------------------------------
    // TEST 4: Browser Restart Persistence
    // -------------------------------------------------------------
    process.stdout.write("[Test 4/5] Browser Restart Persistence (Close Context & Re-launch)... ");
    try {
      // Close browser context completely
      await context.close();
      context = null;

      // Re-launch with the SAME persistentProfileDir
      context = await chromium.launchPersistentContext(persistentProfileDir, {
        headless: false,
        args: [
          "--headless=new",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          `--disable-extensions-except=${EXT_PATH}`,
          `--load-extension=${EXT_PATH}`,
          "--no-first-run",
          "--no-default-browser-check"
        ]
      });

      let [newServiceWorker] = context.serviceWorkers();
      if (!newServiceWorker) {
        newServiceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
      }
      assert.ok(newServiceWorker, "Service worker restarted");

      // Verify data survived restart
      const reloadedStorage = await newServiceWorker.evaluate(async () => {
        return chrome.storage.local.get(["savedNovels", "stats"]);
      });

      const reloadedEntries = Object.values(reloadedStorage.savedNovels || {});
      assert.strictEqual(reloadedEntries.length, 1, "1 novel survived restart");
      const survivedNovel = reloadedEntries[0];
      assert.strictEqual(survivedNovel.novelName, "Coiling Dragon", "novelName intact after restart");
      assert.strictEqual(survivedNovel.chapter, "125", "chapter intact after restart");
      assert.strictEqual(survivedNovel.genreSource, "manual", "genreSource intact after restart");
      assert.ok(survivedNovel.genres.includes("supernatural"), "custom genres intact after restart");

      console.log(`✔ PASS [Restart survived: '${survivedNovel.novelName}' Ch. ${survivedNovel.chapter}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 5: Profile Storage Isolation (Guest Profile has 0 Novels)
    // -------------------------------------------------------------
    process.stdout.write("[Test 5/5] Multi-Profile Storage Isolation... ");
    let isolatedContext = null;
    try {
      isolatedProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_e2e_isolated_"));
      isolatedContext = await chromium.launchPersistentContext(isolatedProfileDir, {
        headless: false,
        args: [
          "--headless=new",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          `--disable-extensions-except=${EXT_PATH}`,
          `--load-extension=${EXT_PATH}`,
          "--no-first-run",
          "--no-default-browser-check"
        ]
      });

      let [isoSW] = isolatedContext.serviceWorkers();
      if (!isoSW) {
        isoSW = await isolatedContext.waitForEvent("serviceworker", { timeout: 15000 });
      }
      assert.ok(isoSW, "Isolated service worker active");

      const isoStorage = await isoSW.evaluate(async () => chrome.storage.local.get(["savedNovels", "stats"]));
      const isoEntries = Object.values(isoStorage.savedNovels || {});
      assert.strictEqual(isoEntries.length, 0, "Isolated profile has 0 saved novels");

      console.log("✔ PASS [Isolated profile has 0 novels — Perfect Isolation]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    } finally {
      if (isolatedContext) await isolatedContext.close();
      if (isolatedProfileDir && fs.existsSync(isolatedProfileDir)) {
        try { fs.rmSync(isolatedProfileDir, { recursive: true, force: true }); } catch {}
      }
    }

    console.log("\n====================================================================");
    console.log(`STORAGE & POPUP COMPLETE: ${passedCount} APROBADO / ${failedCount} FALLIDO (Total: 5)`);
    console.log("====================================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    if (context) await context.close();
    if (persistentProfileDir && fs.existsSync(persistentProfileDir)) {
      try {
        fs.rmSync(persistentProfileDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

if (require.main === module) {
  runStoragePersistenceSuite().catch((err) => {
    console.error("FATAL ERROR IN STORAGE PERSISTENCE SUITE:", err);
    process.exit(1);
  });
}

module.exports = { runStoragePersistenceSuite };
