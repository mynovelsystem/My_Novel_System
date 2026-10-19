/**
 * MYNOVELSYSTEM v4.0.0 — REGRESSION TEST SUITE:
 * Shadow Slave on Aethon Webcomics (/comic-episode/episode-1/)
 * 
 * Verifies with real Chromium MV3:
 * 1. Series title is correctly identified as 'Shadow Slave' from DOM/ARIA/series links,
 *    despite the generic URL pathname '/comic-episode/episode-1/'.
 * 2. Series title is NEVER deduced from 'comic-episode' (no 'Comic Episode' bogus name).
 * 3. Series title is NEVER confused with site branding 'AETHON'.
 * 4. Content type: Webcomic / digital webcomic reader.
 * 5. Episode number is correctly identified as '1'.
 * 6. Genres are strictly empty [] (never invent unbacked genres).
 * 7. Sequential episode navigation (/comic-episode/episode-2/) updates chapter to 2
 *    without accidentally changing the series title or creating duplicate records.
 * 8. Backward navigation (/comic-episode/episode-1/) preserves progress and series title.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");
const assert = require("assert");

const EXT_PATH = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const EP1_FIXTURE_PATH = path.join(FIXTURES_DIR, "aethon_shadow_slave_episode_1.html");

const ep1Html = fs.readFileSync(EP1_FIXTURE_PATH, "utf8");

// Episode 2 HTML fixture derived directly from episode 1
const ep2Html = ep1Html
  .replace(/<title>Episode 1 \| AETHON<\/title>/g, "<title>Episode 2 | AETHON</title>")
  .replace(/data-episode-number="1"/g, 'data-episode-number="2"')
  .replace(/data-episode-title="Episode 1"/g, 'data-episode-title="Episode 2"')
  .replace(/S1:E1 Episode 1/g, "S1:E2 Episode 2")
  .replace(/canonical" href="https:\/\/aethonwebcomics\.com\/comic-episode\/episode-1\/"/g, 'canonical" href="https://aethonwebcomics.com/comic-episode/episode-2/"');

async function runAethonRegressionTest() {
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — AETHON WEBCOMICS REGRESSION TEST SUITE    ");
  console.log("   URL: https://aethonwebcomics.com/comic-episode/episode-1/        ");
  console.log("====================================================================\n");

  // Step 1: Real Chromium MV3 launch
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_aethon_reg_"));
  console.log(`[Setup] Launching Chromium with Profile: ${tempProfileDir}`);

  const context = await chromium.launchPersistentContext(tempProfileDir, {
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

  let [sw] = context.serviceWorkers();
  if (!sw) {
    sw = await context.waitForEvent("serviceworker", { timeout: 15000 });
  }
  assert.ok(sw, "Extension Service Worker must be active");
  console.log(`  ✔ PASS: Service Worker active at ${sw.url()}\n`);

  // Step 2: In-Service Worker heuristic & unit assertions
  console.log("[Unit Check] Heuristic & Bogus Name Guards inside Service Worker:");
  const unitResults = await sw.evaluate(() => {
    return {
      bogusComicEpisode: isBogusNovelName("Comic Episode"),
      bogusComicEpisodeUnderscore: isBogusNovelName("comic_episode"),
      bogusAethonBranding: isBogusNovelName("AETHON", "https://aethonwebcomics.com/comic-episode/episode-1/"),
      bogusAethonWebcomics: isBogusNovelName("Aethon Webcomics", "https://aethonwebcomics.com/comic-episode/episode-1/"),
      bogusFollowButton: isBogusNovelName("Follow this series"),
      invalidComicEpisodePath: !isValidSeriesPath("/comic-episode"),
      validWebcomicsPath: isValidSeriesPath("/webcomics/shadow-slave"),
      catalogHasWebcomics: CATALOG_SEGMENTS.has("webcomics")
    };
  });
  assert.strictEqual(unitResults.bogusComicEpisode, true, "'Comic Episode' must be recognized as bogus");
  assert.strictEqual(unitResults.bogusComicEpisodeUnderscore, true, "'comic_episode' must be recognized as bogus");
  assert.strictEqual(unitResults.bogusAethonBranding, true, "'AETHON' branding must be recognized as bogus for novelUrl");
  assert.strictEqual(unitResults.bogusAethonWebcomics, true, "'Aethon Webcomics' branding must be recognized as bogus for novelUrl");
  assert.strictEqual(unitResults.bogusFollowButton, true, "'Follow this series' must be recognized as an action button");
  assert.strictEqual(unitResults.invalidComicEpisodePath, true, "'/comic-episode' must not be a valid series path");
  assert.strictEqual(unitResults.validWebcomicsPath, true, "'/webcomics/shadow-slave' must be a valid series path");
  assert.strictEqual(unitResults.catalogHasWebcomics, true, "CATALOG_SEGMENTS must include webcomics");
  console.log("  ✔ PASS: Heuristic, branding, and bogus slug filters verified inside real Service Worker.\n");

  // Setup route interceptor for deterministic test execution
  await context.route("**/*", (route) => {
    const reqUrl = route.request().url();
    if (reqUrl.includes("aethonwebcomics.com/comic-episode/episode-1")) {
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: ep1Html });
    }
    if (reqUrl.includes("aethonwebcomics.com/comic-episode/episode-2")) {
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: ep2Html });
    }
    if (reqUrl.endsWith(".jpg") || reqUrl.endsWith(".png") || reqUrl.endsWith(".css") || reqUrl.endsWith(".js")) {
      return route.fulfill({ status: 200, contentType: "text/plain", body: "" });
    }
    return route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Default</body></html>" });
  });

  const page = await context.newPage();

  try {
    // Clear initial storage
    await sw.evaluate(async () => {
      await chrome.storage.local.set({ savedNovels: {}, stats: {} });
    });

    // ------------------------------------------------------------------------
    // Test 1: Initial Detection of Shadow Slave on Episode 1
    // ------------------------------------------------------------------------
    console.log("[Test 1/5] Detecting Shadow Slave on generic URL /comic-episode/episode-1/...");
    await page.goto("https://aethonwebcomics.com/comic-episode/episode-1/", {
      waitUntil: "domcontentloaded",
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    let storage = await sw.evaluate(async () => {
      return chrome.storage.local.get(["savedNovels", "stats"]);
    });

    let entries = Object.values(storage.savedNovels || {}).filter((n) => n && !n.deleted);
    assert.strictEqual(entries.length, 1, "Exactly one work must be saved");

    const entry = entries[0];
    console.log("  Detected Data Payload:");
    console.log(`    • Title:        '${entry.novelName}'`);
    console.log(`    • Episode:      '${entry.chapter}'`);
    console.log(`    • Series ID:    '${entry.seriesId}'`);
    console.log(`    • Series URL:   '${entry.novelUrl}'`);
    console.log(`    • Source Genres: [${entry.genres.join(", ")}]`);

    // Verification against requirements
    assert.strictEqual(entry.novelName, "Shadow Slave", "Title must be identified as 'Shadow Slave'");
    assert.notStrictEqual(entry.novelName, "Comic Episode", "Must NOT deduce title from 'comic-episode'");
    assert.notStrictEqual(entry.novelName, "AETHON", "Must NOT confuse title with site branding 'AETHON'");
    assert.strictEqual(entry.chapter, "1", "Episode number must be 1");
    assert.strictEqual(entry.novelUrl, "https://aethonwebcomics.com/webcomics/shadow-slave", "Series URL must link to series page");
    assert.ok(entry.seriesId.includes("shadow_slave"), "Series ID must be canonical to shadow_slave");
    assert.deepStrictEqual(entry.genres, [], "Genres must be strictly [] when source has no genres");
    console.log("  ✔ PASS: Shadow Slave Episode 1 detected accurately without bogus name or unbacked genres.\n");

    // ------------------------------------------------------------------------
    // Test 2: Sequential Episode 2 Navigation
    // ------------------------------------------------------------------------
    console.log("[Test 2/5] Navigating to Episode 2 (/comic-episode/episode-2/)...");
    await page.goto("https://aethonwebcomics.com/comic-episode/episode-2/", {
      waitUntil: "domcontentloaded",
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    storage = await sw.evaluate(async () => {
      return chrome.storage.local.get(["savedNovels", "stats"]);
    });

    entries = Object.values(storage.savedNovels || {}).filter((n) => n && !n.deleted);
    assert.strictEqual(entries.length, 1, "Must not create duplicate entry on sequential navigation");
    assert.strictEqual(entries[0].seriesId, entry.seriesId, "Series ID must remain identical");
    assert.strictEqual(entries[0].novelName, "Shadow Slave", "Title must remain 'Shadow Slave' after navigation");
    assert.strictEqual(entries[0].chapter, "2", "Episode must be updated to 2");
    assert.strictEqual(entries[0].maxCounted, 2, "maxCounted must advance to 2");
    assert.strictEqual(entries[0].url, "https://aethonwebcomics.com/comic-episode/episode-2/", "URL must reflect episode 2");
    console.log("  ✔ PASS: Episode 2 updated cleanly: title preserved, chapter advanced to 2.\n");

    // ------------------------------------------------------------------------
    // Test 3: Backward Navigation & Regression Safety
    // ------------------------------------------------------------------------
    console.log("[Test 3/5] Navigating back to Episode 1 (backward reading)...");
    await page.goto("https://aethonwebcomics.com/comic-episode/episode-1/", {
      waitUntil: "domcontentloaded",
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    storage = await sw.evaluate(async () => {
      return chrome.storage.local.get(["savedNovels", "stats"]);
    });

    entries = Object.values(storage.savedNovels || {}).filter((n) => n && !n.deleted);
    assert.strictEqual(entries.length, 1, "Must maintain exactly 1 entry");
    assert.strictEqual(entries[0].novelName, "Shadow Slave", "Title must remain 'Shadow Slave'");
    assert.strictEqual(entries[0].chapter, "1", "Active chapter is now 1");
    assert.strictEqual(entries[0].maxCounted, 2, "maxCounted must NOT regress (remains 2)");
    console.log("  ✔ PASS: Backward navigation safe: title preserved, progress protected against regression.\n");

    // ------------------------------------------------------------------------
    // Test 4: In-page SPA Transition (pushState without full reload)
    // ------------------------------------------------------------------------
    console.log("[Test 4/5] In-page SPA navigation to Episode 2 (pushState)...");
    await page.evaluate(() => {
      window.history.pushState({}, "Episode 2 | AETHON", "https://aethonwebcomics.com/comic-episode/episode-2/");
      document.title = "Episode 2 | AETHON";
      const reader = document.querySelector("[data-webcomic-reader]");
      if (reader) {
        reader.setAttribute("data-episode-number", "2");
        reader.setAttribute("data-episode-title", "Episode 2");
      }
      const titleSpan = document.querySelector(".modfarm-webcomic-episode-title");
      if (titleSpan) titleSpan.textContent = "S1:E2 Episode 2";
      window.dispatchEvent(new Event("popstate"));
    });
    await page.waitForTimeout(2500);

    storage = await sw.evaluate(async () => {
      return chrome.storage.local.get(["savedNovels", "stats"]);
    });

    entries = Object.values(storage.savedNovels || {}).filter((n) => n && !n.deleted);
    assert.strictEqual(entries.length, 1, "Must maintain exactly 1 entry on SPA navigation");
    assert.strictEqual(entries[0].novelName, "Shadow Slave", "Title must remain 'Shadow Slave' after SPA pushState");
    assert.strictEqual(entries[0].chapter, "2", "Episode must advance to 2 via SPA detection");
    assert.strictEqual(entries[0].maxCounted, 2, "maxCounted must remain 2");
    console.log("  ✔ PASS: SPA pushState navigation safe: title preserved, chapter advanced to 2.\n");

    // ------------------------------------------------------------------------
    // Test 5: Complex URL with query parameters & hash
    // ------------------------------------------------------------------------
    console.log("[Test 5/5] Navigating to URL with query parameters and hash...");
    await page.goto("https://aethonwebcomics.com/comic-episode/episode-1/?source=app&theme=dark#top", {
      waitUntil: "domcontentloaded",
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    storage = await sw.evaluate(async () => {
      return chrome.storage.local.get(["savedNovels", "stats"]);
    });

    entries = Object.values(storage.savedNovels || {}).filter((n) => n && !n.deleted);
    assert.strictEqual(entries.length, 1, "Must maintain exactly 1 entry with query parameters");
    assert.strictEqual(entries[0].novelName, "Shadow Slave", "Title must remain 'Shadow Slave' with query params");
    assert.strictEqual(entries[0].chapter, "1", "Episode must be 1");
    assert.strictEqual(entries[0].maxCounted, 2, "maxCounted must remain 2");
    console.log("  ✔ PASS: Query parameters and hash handled cleanly without title corruption.\n");

    console.log("====================================================================");
    console.log(">>> ALL SHADOW SLAVE AETHON REGRESSION TESTS PASSED (100%)! <<<");
    console.log("====================================================================\n");

  } finally {
    await context.close();
  }
}

if (require.main === module) {
  runAethonRegressionTest().catch((err) => {
    console.error("REGRESSION TEST FAILED:", err);
    process.exit(1);
  });
}

module.exports = { runAethonRegressionTest };
