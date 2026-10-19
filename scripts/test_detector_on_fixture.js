const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const EXT_PATH = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.resolve(__dirname, "../tests/fixtures");

const fixtureFile = process.argv[2] || "royalroad_chapter.html";
const testUrl = process.argv[3] || "https://www.royalroad.com/fiction/21220/mother-of-learning/chapter/301778/1-good-morning-brother";

(async () => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, fixtureFile), "utf8");
  const contentCode = fs.readFileSync(path.join(EXT_PATH, "content.js"), "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route(testUrl, route => route.fulfill({ status: 200, contentType: "text/html", body: html }));

  await page.goto(testUrl);

  // Inject content.js into page and capture console logs
  const result = await page.evaluate(async (code) => {
    // Mock chrome.runtime
    const messages = [];
    window.chrome = {
      runtime: {
        sendMessage: (msg) => {
          messages.push(msg);
          return Promise.resolve({ ok: true, saved: true, seriesId: msg.data?.seriesId, chapter: msg.data?.chapter });
        },
        onMessage: { addListener: () => {} }
      },
      storage: {
        local: { get: (k, cb) => cb && cb({ domainBlacklist: [] }) },
        onChanged: { addListener: () => {} }
      }
    };

    // Eval content.js
    window.__EXPOSE_DETECTOR_FOR_TESTS__ = true;
    try {
      eval(code);
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }

    // Wait for debounced evaluatePage (600ms)
    await new Promise(r => setTimeout(r, 900));

    return {
      messages,
      internals: Object.keys(window.__DETECTOR_INTERNALS__ || {}),
      authenticContext: window.__DETECTOR_INTERNALS__?.isAuthenticReadingContext(),
      realContent: window.__DETECTOR_INTERNALS__?.hasRealReaderContent(),
      chapNum: window.__DETECTOR_INTERNALS__?.extractChapterNumber(),
      chapUrl: window.__DETECTOR_INTERNALS__?.extractChapterFromUrl(location.href)
    };
  }, contentCode);

  console.log("Evaluation result:", JSON.stringify(result, null, 2));

  await browser.close();
})();
