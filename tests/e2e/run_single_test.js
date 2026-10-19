// ============================================================================
// MYNOVELSYSTEM v4.0.0 — SINGLE E2E TEST RUNNER
// Runs a specific E2E test case by ID or name
// Usage: node tests/e2e/run_single_test.js <testIdOrKeyword>
// ============================================================================

const path = require("path");
const { PLATFORMS_MATRIX } = require("./e2e_platforms_suite");
const { chromium } = require("playwright");
const assert = require("assert");
const fs = require("fs");
const os = require("os");

const EXT_PATH = path.resolve(__dirname, "../../");
const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

const fixtures = {
  wuxiaworld: fs.readFileSync(path.join(FIXTURES_DIR, "wuxiaworld_chapter.html"), "utf8"),
  royalroad: fs.readFileSync(path.join(FIXTURES_DIR, "royalroad_chapter.html"), "utf8"),
  skynovels: fs.readFileSync(path.join(FIXTURES_DIR, "skynovels_spanish_reader.html"), "utf8"),
  tunovela: fs.readFileSync(path.join(FIXTURES_DIR, "tunovela_decimal_reader.html"), "utf8"),
  mangadex: fs.readFileSync(path.join(FIXTURES_DIR, "mangadex_single_page.html"), "utf8"),
  lectormanga: fs.readFileSync(path.join(FIXTURES_DIR, "lectormanga_cascade.html"), "utf8"),
  asuracomic: fs.readFileSync(path.join(FIXTURES_DIR, "asuracomic_manhwa_scroll.html"), "utf8"),
  webtoons: fs.readFileSync(path.join(FIXTURES_DIR, "webtoons_episode_param.html"), "utf8"),
  anime: fs.readFileSync(path.join(FIXTURES_DIR, "anime_info_page.html"), "utf8"),
  toc: fs.readFileSync(path.join(FIXTURES_DIR, "toc_novel_profile.html"), "utf8"),
  search: fs.readFileSync(path.join(FIXTURES_DIR, "search_results_page.html"), "utf8"),
  multilingual: fs.readFileSync(path.join(FIXTURES_DIR, "multilingual_genres_page.html"), "utf8")
};

async function runSingle(target) {
  if (!target) {
    console.error("Error: Please specify a test ID or keyword. Examples:");
    console.error("  node tests/e2e/run_single_test.js wuxiaworld-chapter");
    console.error("  node tests/e2e/run_single_test.js mangadex-chapter");
    console.error("  node tests/e2e/run_single_test.js asuracomic-scroll");
    process.exit(1);
  }

  const tc = PLATFORMS_MATRIX.find(
    (t) => t.id.toLowerCase() === target.toLowerCase() || t.id.toLowerCase().includes(target.toLowerCase())
  );

  if (!tc) {
    console.error(`Error: No test case found matching '${target}' in PLATFORMS_MATRIX.`);
    console.error("Available IDs:", PLATFORMS_MATRIX.map((t) => t.id).join(", "));
    process.exit(1);
  }

  console.log(`\n====================================================================`);
  console.log(`RUNNING SINGLE E2E TEST: ${tc.id} (${tc.domain})`);
  console.log(`Category: ${tc.category}`);
  console.log(`Target URL: ${tc.url}`);
  console.log(`====================================================================\n`);

  let tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_e2e_single_"));
  let context = null;

  try {
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

    await context.route("**/*", (route) => {
      const htmlContent = tc.overrideHtml || fixtures[tc.fixtureKey];
      return route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: htmlContent
      });
    });

    const page = await context.newPage();
    await page.goto(tc.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const storage = await serviceWorker.evaluate(async () => {
      return chrome.storage.local.get(["savedNovels", "stats"]);
    });

    const entries = Object.values(storage.savedNovels || {}).filter((n) => n && !n.deleted);

    if (tc.shouldDetect) {
      assert.ok(entries.length > 0, "Novel was detected");
      const entry = entries[0];
      console.log(`[PASS] Detected Novel Name: '${entry.novelName}'`);
      console.log(`[PASS] Detected Chapter: '${entry.chapter}'`);
      console.log(`[PASS] Detected Genres: [${(entry.genres || []).join(", ")}] (Source: ${entry.genreSource || "unknown"})`);
      if (tc.expectedName) {
        assert.ok(
          entry.novelName.toLowerCase().includes(tc.expectedName.toLowerCase()),
          `Expected name '${tc.expectedName}' in '${entry.novelName}'`
        );
      }
      if (tc.expectedChapter) {
        assert.strictEqual(String(entry.chapter), String(tc.expectedChapter), "Chapter number matches");
      }
    } else {
      assert.strictEqual(entries.length, 0, "Negative test passed: zero novels detected");
      console.log(`[PASS] Page correctly rejected (negative control verified)`);
    }

    console.log(`\n>>> TEST '${tc.id}' PASSED CLEANLY! <<<\n`);
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
  const target = process.argv[2];
  runSingle(target).catch((err) => {
    console.error(`\n>>> TEST FAILED:`, err);
    process.exit(1);
  });
}

module.exports = { runSingle };
