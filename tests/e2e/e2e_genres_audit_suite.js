/**
 * MYNOVELSYSTEM v4.0.0 — E2E POST-GENRE REMOVAL & REGRESSION AUDIT SUITE
 * 
 * Verifies with real Playwright Chromium MV3:
 * 1. Zero genre scraping on Spanish reader (clean genres: [], zero overhead)
 * 2. Zero genre scraping on multi-tag Spanish pages (clean genres: [])
 * 3. Zero genre scraping on English platforms (clean genres: [])
 * 4. Zero genre scraping on complex multilingual pages (clean genres: [])
 * 5. Tag deduplication & clean empty array on duplicate meta tags
 * 6. Zero crash and clean state on plain pages
 * 7. Obsolete genre achievements (cultivate_xianxia_master) NEVER unlock
 * 8. New system achievements DO unlock based on valid metrics (story_collector, etc.)
 * 9. UPDATE_NOVEL_GENRES message handler normalizes safely without data loss (backward compatibility)
 * 10. SPA novel isolation (consecutive navigations do not bleed or corrupt)
 * 11. Recommendation section tags are completely ignored
 * 12. Demographics, status & SEO tokens do not pollute storage
 * 13. Legacy novel data with existing genres is preserved non-destructively
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");
const assert = require("assert");

const EXT_PATH = path.resolve(__dirname, "../../");
const FIXTURES_DIR = path.join(__dirname, "../fixtures");

const fixtures = {
  wuxiaworld: fs.readFileSync(path.join(FIXTURES_DIR, "wuxiaworld_chapter.html"), "utf8"),
  skynovels: fs.readFileSync(path.join(FIXTURES_DIR, "skynovels_spanish_reader.html"), "utf8"),
  tunovela: fs.readFileSync(path.join(FIXTURES_DIR, "tunovela_decimal_reader.html"), "utf8"),
  multilingual: fs.readFileSync(path.join(FIXTURES_DIR, "multilingual_genres_page.html"), "utf8"),
  mangadex: fs.readFileSync(path.join(FIXTURES_DIR, "mangadex_single_page.html"), "utf8")
};

const DUPE_TAGS_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="keywords" content="Fantasy, Action, Fantasy, Action, fantasy">
  <meta property="og:book:genre" content="Fantasy">
</head>
<body>
  <a href="/series/magic-world" class="novel-title">Magic World</a>
  <div class="tags">
    <span class="genre">Fantasy</span>
    <span class="genre">Action</span>
    <span class="genre">Fantasy</span>
  </div>
  <div class="reading-content">
    <p>Chapter 1 of Magic World text...</p>
    <p>Substantial text paragraph for length...</p>
    <p>Third long paragraph to qualify reader...</p>
  </div>
  <a href="/series/magic-world/chapter-2" class="next-chap">Next</a>
</body>
</html>`;

const ZERO_GENRES_HTML = `
<!DOCTYPE html>
<html>
<head><title>No Genre Story - Chapter 1</title></head>
<body>
  <a href="/novel/clean-story" class="novel-title">Clean Story</a>
  <div class="reading-content">
    <p>This is a clean story with no genre tags anywhere.</p>
    <p>Just plain text paragraphs describing the adventure of life.</p>
    <p>Another long paragraph to easily pass reader threshold verification.</p>
  </div>
  <a href="/novel/clean-story/chapter-2" class="next-chap">Next</a>
</body>
</html>`;

const RECOMMENDATION_GENRES_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>The Lone Warrior - Chapter 1</title>
</head>
<body>
  <div class="novel-header">
    <a href="/novel/lone-warrior" class="novel-title">The Lone Warrior</a>
    <div class="tags">
      <a href="/genre/fantasy">Fantasy</a>
      <a href="/genre/action">Action</a>
    </div>
  </div>
  <div class="reading-content">
    <h1>Chapter 1: The Beginning</h1>
    <p>A lone warrior walked across the scorched valley with determination in his eyes.</p>
    <p>The sword on his back hummed with an ominous magical resonance.</p>
    <p>Three giant beasts approached from the rocky cliffs above the canyon.</p>
  </div>
  <div class="recommendations">
    <h3>Recommended Stories</h3>
    <div class="rec-card">
      <a href="/novel/scary-romance">Scary Romance In The Palace</a>
      <div class="tags">
        <a href="/genre/horror">Horror</a>
        <a href="/genre/romance">Romance</a>
      </div>
    </div>
  </div>
  <a href="/novel/lone-warrior/chapter-2" class="next-chap">Next</a>
</body>
</html>`;

const STATUS_JUNK_GENRES_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Martial God Legend - Chapter 5</title>
  <meta name="keywords" content="Read manga free, Chapter 5, Raw, Ongoing, Shounen, Wuxia">
</head>
<body>
  <div class="novel-header">
    <a href="/series/martial-god" class="series-title">Martial God Legend</a>
    <div class="tags">
      <a href="/status/ongoing">Ongoing</a>
      <a href="/demographic/shounen">Shounen</a>
      <a href="/tag/character-growth">Character Growth</a>
      <a href="/tag/faction">Faction</a>
      <a href="/tag/artifacts">Artifacts</a>
      <a href="/tag/wuxia">Wuxia</a>
    </div>
  </div>
  <div class="reading-content">
    <h1>Chapter 5: Breakthrough</h1>
    <p>The inner disciple concentrated his spiritual energy at midnight.</p>
    <p>The dantian barrier shattered like fragile glass under immense pressure.</p>
    <p>He had successfully advanced to the third layer of foundation establishment.</p>
  </div>
  <a href="/series/martial-god/chapter-6" class="next-chap">Next</a>
</body>
</html>`;

async function runGenresAuditSuite() {
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — POST-GENRE REDESIGN & REGRESSION AUDIT    ");
  console.log("====================================================================\n");

  let tempProfileDir = null;
  let context = null;
  let passedCount = 0;
  let failedCount = 0;

  try {
    tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_e2e_genres_"));
    console.log(`[Setup] Launching Chromium MV3 with Profile: ${tempProfileDir}`);

    context = await chromium.launchPersistentContext(tempProfileDir, {
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

    // Unified route dispatcher
    await context.route("**/*", (route) => {
      const u = route.request().url();
      if (u.includes("skynovels.net")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.skynovels });
      }
      if (u.includes("tu-novela.com/novela/el-camino-del-chaman")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.tunovela });
      }
      if (u.includes("tu-novela.com/novela/omniscient-readers-viewpoint")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.multilingual });
      }
      if (u.includes("wuxiaworld.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.wuxiaworld });
      }
      if (u.includes("magic-reader.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: DUPE_TAGS_HTML });
      }
      if (u.includes("clean-story-reader.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: ZERO_GENRES_HTML });
      }
      if (u.includes("rec-isolation-reader.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: RECOMMENDATION_GENRES_HTML });
      }
      if (u.includes("status-filter-reader.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: STATUS_JUNK_GENRES_HTML });
      }
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<html><body>Default</body></html>" });
    });

    const page = await context.newPage();

    // -------------------------------------------------------------
    // TEST 1: Zero Genre Scraping on Spanish Reader (Clean genres: [])
    // -------------------------------------------------------------
    process.stdout.write("[Test 1/13] Spanish Reader Zero Genre Scraping (Clean genres: [])... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://skynovels.net/novelas/120/reverend-insanity/10045/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const novels = Object.values(storage.savedNovels || {});
      assert.strictEqual(novels.length, 1, "Novel detected");
      assert.ok(Array.isArray(novels[0].genres), "genres is array");
      assert.strictEqual(novels[0].genres.length, 0, "genres is strictly empty []");
      console.log(`✔ PASS [Genres: [], Source: ${novels[0].genreSource || "unknown"}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 2: Zero Genre Scraping on Multi-Tag Spanish Reader
    // -------------------------------------------------------------
    process.stdout.write("[Test 2/13] Multi-Tag Spanish Reader Zero Genre Scraping (genres: [])... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://tu-novela.com/novela/el-camino-del-chaman/capitulo-125-5/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const novels = Object.values(storage.savedNovels || {});
      assert.strictEqual(novels.length, 1, "Novel detected");
      assert.strictEqual(novels[0].genres.length, 0, "No scraped genres on multi-tag reader");
      console.log(`✔ PASS [Clean genres: []]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 3: Zero Genre Scraping on English Platform
    // -------------------------------------------------------------
    process.stdout.write("[Test 3/13] English Platform Zero Genre Scraping (genres: [])... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://www.wuxiaworld.com/novel/coiling-dragon/cd-chapter-125", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const novels = Object.values(storage.savedNovels || {});
      assert.strictEqual(novels.length, 1, "Novel detected");
      assert.strictEqual(novels[0].genres.length, 0, "English platform genre scraping eliminated");
      console.log(`✔ PASS [Clean genres: []]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 4: Complex Multilingual Reader Zero Genre Scraping
    // -------------------------------------------------------------
    process.stdout.write("[Test 4/13] Multilingual Page Zero Genre Scraping (genres: [])... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://tu-novela.com/novela/omniscient-readers-viewpoint/capitulo-10", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const novels = Object.values(storage.savedNovels || {});
      assert.strictEqual(novels.length, 1, "Novel detected");
      assert.strictEqual(novels[0].genres.length, 0, "Multilingual genres eliminated");
      console.log(`✔ PASS [Clean genres: []]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 5: Duplicate Tags Ignored in DOM / Meta
    // -------------------------------------------------------------
    process.stdout.write("[Test 5/13] Duplicate Genre Tags in DOM/Meta Ignored... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://magic-reader.com/series/magic-world/chapter-1", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const novels = Object.values(storage.savedNovels || {});
      assert.strictEqual(novels.length, 1, "Novel detected");
      assert.strictEqual(novels[0].genres.length, 0, "No duplicate genres extracted");
      console.log(`✔ PASS [Clean genres: []]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 6: Page with Zero Genres (Clean Empty Array, No Crash)
    // -------------------------------------------------------------
    process.stdout.write("[Test 6/13] Clean Page Detection (Clean Empty Array, No Crash)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://clean-story-reader.com/novel/clean-story/chapter-1", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const novels = Object.values(storage.savedNovels || {});
      assert.strictEqual(novels.length, 1, "Novel detected");
      assert.ok(Array.isArray(novels[0].genres), "genres is array");
      assert.strictEqual(novels[0].genres.length, 0, "genres is empty array");
      console.log(`✔ PASS [Genres array: [], Source: ${novels[0].genreSource || "unknown"}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 7: Obsolete Genre Achievements NEVER Unlock From Reading
    // -------------------------------------------------------------
    process.stdout.write("[Test 7/13] Obsolete Genre Achievements NEVER Unlock... ");
    try {
      const result = await serviceWorker.evaluate(async () => {
        const stats = { genreAchievements: [], systemAchievements: [] };
        const savedNovels = {
          series_1: { seriesId: "s1", novelName: "Cult 1", chapter: "100", genres: ["xianxia"], genreSource: "source" },
          series_2: { seriesId: "s2", novelName: "Cult 2", chapter: "100", genres: ["xianxia"], genreSource: "source" },
          series_3: { seriesId: "s3", novelName: "Cult 3", chapter: "100", genres: ["xianxia"], genreSource: "source" }
        };

        if (typeof evaluateGenreAchievements === "function") {
          evaluateGenreAchievements(stats, savedNovels);
        }
        return {
          genreAchievements: stats.genreAchievements || [],
          unlockedTitles: stats.unlockedTitles || []
        };
      });

      assert.strictEqual(result.genreAchievements.includes("cultivate_xianxia_master"), false, "Old genre achievement not unlocked");
      assert.strictEqual(result.unlockedTitles.includes("cultivate_xianxia_master"), false, "Not unlocked as title");
      console.log(`✔ PASS [Old genre achievements strictly defunct]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 8: System Achievements DO Unlock Based on Genuine Reading Metrics
    // -------------------------------------------------------------
    process.stdout.write("[Test 8/13] System Achievements Unlock on Real Metrics (story_collector)... ");
    try {
      const result = await serviceWorker.evaluate(async () => {
        const stats = { chaptersRead: 25, systemAchievements: [] };
        const savedNovels = {
          nov1: { seriesId: "n1", novelName: "Story 1", chapter: "5", status: "reading" },
          nov2: { seriesId: "n2", novelName: "Story 2", chapter: "10", status: "reading" },
          nov3: { seriesId: "n3", novelName: "Story 3", chapter: "8", status: "reading" }
        };
        evaluateSystemAchievements(stats, savedNovels);
        return stats.systemAchievements;
      });

      assert.ok(result.includes("story_collector"), "story_collector unlocked with 3 novels with progress");
      assert.ok(result.includes("first_page"), "first_page unlocked with chaptersRead >= 1");
      console.log(`✔ PASS [Unlocked: ${result.join(", ")}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 9: Manual Genre Override (UPDATE_NOVEL_GENRES) Sets "manual"
    // -------------------------------------------------------------
    process.stdout.write("[Test 9/13] UPDATE_NOVEL_GENRES Message Handler Sets genreSource='manual'... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({
          savedNovels: {
            test_series_manual: {
              seriesId: "test_series_manual",
              novelName: "Manual Novel",
              chapter: "10",
              url: "https://example.com/novel/10",
              genres: [],
              genreSource: "unknown"
            }
          }
        });
      });

      const popupPage = await context.newPage();
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
      const updateResult = await popupPage.evaluate(async () => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: "UPDATE_NOVEL_GENRES",
              seriesId: "test_series_manual",
              genres: ["Fantasy", "Sci-Fi"]
            },
            (res) => resolve(res)
          );
        });
      });
      await popupPage.close();

      const updated = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const n = updated.savedNovels["test_series_manual"];

      assert.ok(updateResult && updateResult.ok, "UPDATE_NOVEL_GENRES responded OK");
      assert.strictEqual(n?.genreSource, "manual", "genreSource updated to manual");
      assert.ok(n?.genres.includes("fantasy"), "Genres normalized to fantasy");
      assert.ok(n?.genres.includes("sci-fi") || n?.genres.includes("scifi"), "Genres normalized safely");
      console.log(`✔ PASS [Genres: ${n.genres.join(", ")}, Source: ${n.genreSource}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 10: SPA Isolation: Consecutive Novel Navigations Do Not Bleed
    // -------------------------------------------------------------
    process.stdout.write("[Test 10/13] SPA Isolation: Consecutive Navigations Do Not Bleed... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://skynovels.net/novelas/120/reverend-insanity/10045/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      await page.goto("https://tu-novela.com/novela/el-camino-del-chaman/capitulo-125-5/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries.length, 2, "Both distinct novels saved independently");

      const novelA = entries.find(n => n.novelName && n.novelName.toLowerCase().includes("reverend"));
      const novelB = entries.find(n => n.novelName && (n.novelName.toLowerCase().includes("chaman") || n.novelName.toLowerCase().includes("chamán")));

      assert.ok(novelA, "Novel A exists");
      assert.ok(novelB, "Novel B exists");
      assert.strictEqual(novelA.genres.length, 0, "Novel A has clean empty genres");
      assert.strictEqual(novelB.genres.length, 0, "Novel B has clean empty genres");

      console.log(`✔ PASS [Novel A & B isolated cleanly without genre leakage]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 11: Recommendation Section Tags Ignored
    // -------------------------------------------------------------
    process.stdout.write("[Test 11/13] Recommendation Section Tags Ignored... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://rec-isolation-reader.com/novel/lone-warrior/chapter-1", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries.length, 1, "1 novel detected");
      const n = entries[0];
      assert.strictEqual(n.genres.length, 0, "Zero genres extracted from recommendation sections");
      console.log(`✔ PASS [Recommendation tags strictly excluded]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 12: Status, Demographics & Substring Junk Rejection
    // -------------------------------------------------------------
    process.stdout.write("[Test 12/13] Status, Demographics & Substring Junk Rejection... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://status-filter-reader.com/series/martial-god/chapter-5", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries.length, 1, "1 novel detected");
      const n = entries[0];
      assert.strictEqual(n.genres.length, 0, "Non-genre tags and status tokens eliminated");
      console.log(`✔ PASS [Clean genres: [] — Non-genre tags strictly eliminated]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 13: Legacy Novel Stored Genres Preservation & Non-Destructive Storage
    // -------------------------------------------------------------
    process.stdout.write("[Test 13/13] Legacy Novel Stored Genres Preservation... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({
          savedNovels: {
            legacy_novel_1: {
              seriesId: "legacy_novel_1",
              novelName: "Legacy Cyber 2099",
              chapter: "1",
              url: "https://example.com/legacy/1",
              genres: ["cyberpunk", "drama"],
              genreSource: "source",
              updatedAt: 1000
            }
          }
        });
      });

      // Open popup to trigger reading/rendering
      const popupPage = await context.newPage();
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
      await popupPage.waitForTimeout(1000);
      await popupPage.close();

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const n = storage.savedNovels["legacy_novel_1"];
      assert.ok(n, "Legacy novel preserved");
      assert.strictEqual(n.novelName, "Legacy Cyber 2099", "Name intact");
      assert.deepStrictEqual(n.genres, ["cyberpunk", "drama"], "Legacy stored genres preserved non-destructively");
      assert.strictEqual(n.genreSource, "source", "Legacy genreSource preserved");

      console.log(`✔ PASS [Legacy novel preserved: ${n.novelName}, genres: [${n.genres.join(", ")}]]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    console.log("\n====================================================================");
    console.log(`GENRES AUDIT COMPLETE: ${passedCount} APROBADO / ${failedCount} FALLIDO (Total: 13)`);
    console.log("====================================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    if (context) await context.close();
    if (tempProfileDir && fs.existsSync(tempProfileDir)) {
      try {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

if (require.main === module) {
  runGenresAuditSuite().catch((err) => {
    console.error("FATAL ERROR IN GENRES AUDIT SUITE:", err);
    process.exit(1);
  });
}

module.exports = { runGenresAuditSuite };
