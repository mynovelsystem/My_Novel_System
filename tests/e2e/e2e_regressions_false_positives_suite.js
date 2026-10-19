/**
 * MYNOVELSYSTEM v4.0.0 — E2E REGRESSIONS & FALSE POSITIVES SUITE (FASE 6)
 * 
 * Verifies with real Playwright Chromium MV3:
 * 1. Table of contents / Novel profile pages (/novel/slug, /toc) do NOT detect
 * 2. Reviews / Comments pages (/reviews, /comments) do NOT detect
 * 3. Search results pages (/search?q=...) do NOT detect
 * 4. Anime / Video media pages do NOT detect
 * 5. Built-in hardcoded blacklisted domains (youtube.com, google.com, reddit.com)
 * 6. Dynamic user domain blacklist in chrome.storage.local
 * 7. Non-reader pages with chapter numbers in comments ("Great chapter 500!") do NOT detect
 * 8. Catalog root directories (/novelas/, /manga/) do NOT detect
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");
const assert = require("assert");

const EXT_PATH = path.resolve(__dirname, "../../");

const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const fixtures = {
  toc: fs.readFileSync(path.join(FIXTURES_DIR, "toc_novel_profile.html"), "utf8"),
  anime: fs.readFileSync(path.join(FIXTURES_DIR, "anime_info_page.html"), "utf8"),
  search: fs.readFileSync(path.join(FIXTURES_DIR, "search_results_page.html"), "utf8")
};

const COMMENTS_WITH_CHAPTER_MENTIONS_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lord of the Mysteries - Community Discussion & Comments</title>
</head>
<body>
  <h1>Discussion: Lord of the Mysteries</h1>
  <div class="comments-section">
    <div class="comment">
      <span class="user">Reader99:</span>
      <p>I just finished chapter 500 yesterday! It was an absolute masterpiece.</p>
    </div>
    <div class="comment">
      <span class="user">Cultivator42:</span>
      <p>Wait until you reach chapter 1200, the tarot club meeting will blow your mind.</p>
    </div>
  </div>
</body>
</html>`;

async function runRegressionsFalsePositivesSuite() {
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — PLAYWRIGHT E2E FALSE POSITIVES & REGRESSIONS ");
  console.log("====================================================================\n");

  let tempProfileDir = null;
  let context = null;
  let passedCount = 0;
  let failedCount = 0;

  try {
    tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_e2e_negatives_"));
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
      if (u.includes("toc-profile.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.toc });
      }
      if (u.includes("myanimelist.net")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.anime });
      }
      if (u.includes("search-novel.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.search });
      }
      if (u.includes("community-forum.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: COMMENTS_WITH_CHAPTER_MENTIONS_HTML });
      }
      if (u.includes("youtube.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<html><head><title>YouTube Video</title></head><body><h1>Video Player</h1></body></html>" });
      }
      if (u.includes("custom-blocked-site.com")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fixtures.toc });
      }
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<html><body>Catalog Directory</body></html>" });
    });

    const page = await context.newPage();

    // -------------------------------------------------------------
    // TEST 1: Novel Table of Contents (TOC) is NOT detected as a reading session
    // -------------------------------------------------------------
    process.stdout.write("[Test 1/8] Novel Profile / TOC Page Rejection... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://toc-profile.com/novel/coiling-dragon", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "No novel detected on TOC");
      console.log("✔ PASS [TOC Ignored cleanly]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 2: Reviews Subpage is NOT detected
    // -------------------------------------------------------------
    process.stdout.write("[Test 2/8] Novel Reviews Subpage Rejection (/reviews)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://toc-profile.com/novel/coiling-dragon/reviews", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "No novel detected on reviews");
      console.log("✔ PASS [Reviews Ignored cleanly]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 3: Search Results Page is NOT detected
    // -------------------------------------------------------------
    process.stdout.write("[Test 3/8] Search Results Page Rejection (/search?q=...)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://search-novel.com/search?q=cultivation", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "No novel detected on search");
      console.log("✔ PASS [Search Ignored cleanly]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 4: Comments with Chapter Mentions ("I love chapter 500!") are NOT false positives
    // -------------------------------------------------------------
    process.stdout.write("[Test 4/8] Discussion / Comments with Chapter Mentions Rejection... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://community-forum.com/novel/lord-of-the-mysteries/comments", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "No novel detected in comments discussion");
      console.log("✔ PASS [False Chapter Mention in Comments Rejected]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 5: Anime / Video Media Page is NOT detected
    // -------------------------------------------------------------
    process.stdout.write("[Test 5/8] Anime / Video Media Info Page Rejection (MAL)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://myanimelist.net/anime/5114/Fullmetal_Alchemist__Brotherhood", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "No novel detected on Anime page");
      console.log("✔ PASS [Anime Info Page Ignored]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 6: Hardcoded Blacklisted Streaming Video Domain (YouTube)
    // -------------------------------------------------------------
    process.stdout.write("[Test 6/8] Hardcoded Blacklisted Domain Rejection (YouTube)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ savedNovels: {}, stats: {} });
      });

      await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "No novel detected on YouTube");
      console.log("✔ PASS [YouTube Blacklisted]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 7: Dynamic User Domain Blacklist
    // -------------------------------------------------------------
    process.stdout.write("[Test 7/8] Dynamic User Domain Blacklist via chrome.storage... ");
    try {
      await serviceWorker.evaluate(async () => {
        // Add custom-blocked-site.com to domainBlacklist
        await chrome.storage.local.set({
          domainBlacklist: ["custom-blocked-site.com"],
          savedNovels: {},
          stats: {}
        });
      });

      await page.goto("https://custom-blocked-site.com/series/fantasy-quest/chapter-1", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "User blacklisted domain completely ignored");
      console.log("✔ PASS [Dynamic User Blacklist Active]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    // -------------------------------------------------------------
    // TEST 8: Catalog Directory Root (/novelas/, /manga/)
    // -------------------------------------------------------------
    process.stdout.write("[Test 8/8] Catalog Directory Root Rejection (/novelas/)... ");
    try {
      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ domainBlacklist: [], savedNovels: {}, stats: {} });
      });

      await page.goto("https://toc-profile.com/novelas/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);

      const storage = await serviceWorker.evaluate(async () => chrome.storage.local.get(["savedNovels"]));
      const entries = Object.values(storage.savedNovels || {}).filter(n => n && !n.deleted);
      assert.strictEqual(entries.length, 0, "No novel detected on catalog root");
      console.log("✔ PASS [Catalog Directory Root Ignored]");
      passedCount++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failedCount++;
    }

    console.log("\n====================================================================");
    console.log(`FALSE POSITIVES AUDIT COMPLETE: ${passedCount} APROBADO / ${failedCount} FALLIDO (Total: 8)`);
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
  runRegressionsFalsePositivesSuite().catch((err) => {
    console.error("FATAL ERROR IN FALSE POSITIVES SUITE:", err);
    process.exit(1);
  });
}

module.exports = { runRegressionsFalsePositivesSuite };
