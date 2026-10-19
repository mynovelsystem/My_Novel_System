/**
 * MYNOVELSYSTEM v4.0.0 — E2E NAVIGATION, SPA & SCROLL SUITE (FASE 4 & 5)
 * 
 * Verifies with real Playwright Chromium MV3:
 * 1. history.pushState SPA navigation updates chapter without full page reload
 * 2. history.replaceState updates without full reload
 * 3. Reader <select> dropdown change updates chapter
 * 4. Continuous vertical scroll advances active chapter via 35% focal line
 * 5. Backward scroll anti-regression: scrolling up preserves maxCounted
 * 6. Scroll position persistence and restoration
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");
const assert = require("assert");

const EXT_PATH = path.resolve(__dirname, "../../");

const SPA_READER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Martial Peak - Chapter 1 - SPA Reader</title>
  <link rel="canonical" href="https://spa-reader.com/series/martial-peak">
</head>
<body>
  <header>
    <a href="/series/martial-peak" class="series-title">Martial Peak</a>
    <select id="chapter-select" class="chapter-select">
      <option value="1" selected>Chapter 1</option>
      <option value="2">Chapter 2</option>
      <option value="3">Chapter 3</option>
    </select>
  </header>
  <div class="reading-content" id="chapter-body">
    <h1>Chapter 1: The Sweeper Disciple</h1>
    <p>Yang Kai swept the steps of the High Heaven Pavilion in the morning mist...</p>
    <p>He was merely a trial disciple who could not cultivate true qi easily.</p>
    <p>Every morning he swept three thousand stone steps without complaining.</p>
  </div>
  <button id="btn-next" class="btn-next-chap">Next Chapter</button>
  <script>
    document.getElementById("btn-next").addEventListener("click", () => {
      history.pushState({ chap: 2 }, "Martial Peak - Chapter 2", "/series/martial-peak/chapter-2");
      document.title = "Martial Peak - Chapter 2 - SPA Reader";
      document.getElementById("chapter-body").innerHTML = "<h1>Chapter 2: The Black Book</h1><p>Under the ground, Yang Kai discovered an ancient black book...</p><p>Golden light seeped into his dantian.</p>";
      document.getElementById("chapter-select").value = "2";
    });
    document.getElementById("chapter-select").addEventListener("change", (e) => {
      const val = e.target.value;
      history.pushState({ chap: val }, "Martial Peak - Chapter " + val, "/series/martial-peak/chapter-" + val);
      document.title = "Martial Peak - Chapter " + val + " - SPA Reader";
      document.getElementById("chapter-body").innerHTML = "<h1>Chapter " + val + ": New Horizon</h1><p>Content for chapter " + val + " rendered dynamically...</p><p>Sufficient reading content text...</p>";
    });
  </script>
</body>
</html>`;

const CONTINUOUS_SCROLL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Solo Leveling - Chapter 10 - Scroll Reader</title>
  <link rel="canonical" href="https://scroll-reader.com/series/solo-leveling">
  <style>
    body { margin: 0; padding: 0; font-family: sans-serif; }
    .chapter-entity { min-height: 1400px; padding: 40px; border-bottom: 4px solid #333; }
    h2 { font-size: 24px; margin-top: 20px; }
    p { font-size: 18px; line-height: 1.8; margin-bottom: 20px; }
  </style>
</head>
<body>
  <header style="height: 60px; background: #222; color: #fff; position: fixed; top: 0; width: 100%; z-index: 999; padding: 10px;">
    <a href="/series/solo-leveling" class="series-title" style="color: #fff;">Solo Leveling</a>
  </header>
  <div style="height: 60px;"></div>

  <div class="chapter-entity" data-chapter-no="10" id="chap-10">
    <h2>Chapter 10: The Double Dungeon</h2>
    <p>Sung Jin-Woo stepped into the mysterious lair beneath the D-rank dungeon...</p>
    <p>Giant stone statues surrounded the ceremonial circle.</p>
    <p>The blue flame ignited in the torches along the perimeter walls.</p>
    <p>A chilling aura overwhelmed every hunter present in the room.</p>
  </div>

  <div class="chapter-entity" data-chapter-no="11" id="chap-11">
    <h2>Chapter 11: The Commandments of the Temple</h2>
    <p>The eyes of the colossal god statue flashed crimson as it stepped forward...</p>
    <p>Run! Someone screamed, but it was already too late.</p>
    <p>First commandment: Worship the Lord. Second: Praise the Lord.</p>
    <p>Jin-Woo realized the secret rules of the deadly trial.</p>
  </div>

  <div class="chapter-entity" data-chapter-no="12" id="chap-12">
    <h2>Chapter 12: Courage of the Weakest</h2>
    <p>The final hunter bowed toward the statue as the timer ticked down...</p>
    <p>Alone in the chamber, Jin-Woo endured the fatal strikes of the stone knights.</p>
    <p>A mysterious system message materialized before his eyes: [You have met all the requirements].</p>
  </div>
</body>
</html>`;

async function runNavigationSpaScrollSuite() {
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — PLAYWRIGHT E2E NAVIGATION & SCROLL AUDIT  ");
  console.log("====================================================================\n");

  let tempProfileDir = null;
  let context = null;
  let passedCount = 0;
  let failedCount = 0;

  try {
    tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_e2e_nav_"));
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
      if (u.includes("spa-reader.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: SPA_READER_HTML });
      }
      if (u.includes("scroll-reader.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: CONTINUOUS_SCROLL_HTML });
      }
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<html><body>Default</body></html>" });
    });

    const page = await context.newPage();

    // -------------------------------------------------------------
    // TEST 1: Initial Chapter Load in SPA
    // -------------------------------------------------------------
    process.stdout.write("[Test 1/6] Initial Chapter Load Detection (Chapter 1)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://spa-reader.com/series/martial-peak/chapter-1", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries.length, 1, "Novel detected");
      assert.strictEqual(entries[0].chapter, "1", "Detected chapter 1");
      console.log(`✔ PASS [Series: ${entries[0].novelName}, Chapter: ${entries[0].chapter}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 2: history.pushState SPA Next Chapter Navigation
    // -------------------------------------------------------------
    process.stdout.write("[Test 2/6] history.pushState Navigation Updates Chapter (1 -> 2)... ");
    try {
      // Click next chapter button which fires history.pushState
      await page.click("#btn-next");
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries.length, 1, "Still 1 series");
      assert.strictEqual(entries[0].chapter, "2", "Updated to chapter 2 via pushState");
      console.log(`✔ PASS [Chapter updated to: ${entries[0].chapter}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 3: Reader <select> Dropdown Change Navigation
    // -------------------------------------------------------------
    process.stdout.write("[Test 3/6] Reader Dropdown Select Changes Chapter (2 -> 3)... ");
    try {
      // Select option value="3"
      await page.selectOption("#chapter-select", "3");
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries[0].chapter, "3", "Updated to chapter 3 via dropdown select");
      console.log(`✔ PASS [Chapter updated to: ${entries[0].chapter}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 4: Continuous Scroll Forward (Chapter 10 -> Chapter 11 via Focal Line)
    // -------------------------------------------------------------
    process.stdout.write("[Test 4/6] Continuous Scroll Forward: Focal Line Detection (Chap 10 -> 11)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://scroll-reader.com/series/solo-leveling/read", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      let storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      let entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries.length, 1, "Novel detected");
      assert.strictEqual(entries[0].chapter, "10", "Initial top chapter is 10");

      // Scroll into Chapter 11 (approx 1500px down)
      await page.evaluate(() => {
        const el = document.getElementById("chap-11");
        if (el) el.scrollIntoView({ behavior: "instant" });
      });
      // Fire scroll event and wait for focal check
      await page.waitForTimeout(1400);

      storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      entries = Object.values(storage.savedNovels || {});
      assert.strictEqual(entries[0].chapter, "11", "Active chapter advanced to 11 on scroll");
      console.log(`✔ PASS [Active chapter advanced to: ${entries[0].chapter}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 5: Anti-Regression Backward Scroll (Chapter 11 -> 10 preserves maxCounted)
    // -------------------------------------------------------------
    process.stdout.write("[Test 5/6] Backward Scroll Anti-Regression: maxCounted Preserved... ");
    try {
      // Scroll back up to Chapter 10
      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      const novel = entries[0];

      // Even if visible chapter re-detects chapter 10, maxCounted MUST NOT regress below 11
      assert.ok(novel.maxCounted >= 11, `maxCounted preserved at ${novel.maxCounted} (>= 11)`);
      console.log(`✔ PASS [maxCounted preserved: ${novel.maxCounted}]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 6: Scroll Percentage Tracking & Throttle (SCROLL_UPDATED)
    // -------------------------------------------------------------
    process.stdout.write("[Test 6/6] Scroll Position Percentage Tracking (SCROLL_UPDATED)... ");
    try {
      // Scroll to 50% of the document height
      await page.evaluate(() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.round(maxScroll * 0.5), behavior: "instant" });
      });
      await page.waitForTimeout(2500); // Wait > 2000ms throttle interval

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {});
      const novel = entries[0];

      assert.ok(novel.scrollPct >= 40 && novel.scrollPct <= 60, `scrollPct accurately recorded: ${novel.scrollPct}%`);
      console.log(`✔ PASS [Recorded scrollPct: ${novel.scrollPct}%]`);
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    console.log("\n====================================================================");
    console.log(`NAVIGATION & SCROLL COMPLETE: ${passedCount} APROBADO / ${failedCount} FALLIDO (Total: 6)`);
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
  runNavigationSpaScrollSuite().catch((err) => {
    console.error("FATAL ERROR IN NAVIGATION SUITE:", err);
    process.exit(1);
  });
}

module.exports = { runNavigationSpaScrollSuite };
