const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXT_PATH = path.resolve(__dirname, '..');

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
  </script>
</body>
</html>`;

(async () => {
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_debug_"));
  const context = await chromium.launchPersistentContext(tempProfileDir, {
    headless: false,
    args: [
      "--headless=new",
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
    ]
  });

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 10000 });

  sw.on('console', msg => console.log('[SW LOG]:', msg.text()));

  await context.route("**/*", (route) => {
    return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: SPA_READER_HTML });
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('[PAGE LOG]:', msg.text()));

  await page.goto("https://spa-reader.com/series/martial-peak/chapter-1", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  let st = await sw.evaluate(() => chrome.storage.local.get(["savedNovels"]));
  console.log('After initial load, savedNovels:', JSON.stringify(st.savedNovels));

  console.log('Clicking #btn-next...');
  await page.click("#btn-next");
  console.log('Waiting 3000ms...');
  await page.waitForTimeout(3000);

  st = await sw.evaluate(() => chrome.storage.local.get(["savedNovels"]));
  console.log('After click, savedNovels:', JSON.stringify(st.savedNovels));

  await context.close();
  fs.rmSync(tempProfileDir, { recursive: true, force: true });
})();
