const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXT_PATH = path.resolve('.');

const SPA_READER_HTML = fs.readFileSync('tests/e2e/e2e_navigation_spa_scroll_suite.js', 'utf8')
  .match(/const SPA_READER_HTML = \`([\s\S]*?)\`;/)[1];

(async () => {
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw_timing_'));
  const context = await chromium.launchPersistentContext(tempProfileDir, {
    headless: false,
    args: ['--headless=new', '--disable-extensions-except=' + EXT_PATH, '--load-extension=' + EXT_PATH]
  });

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10000 });

  await context.route('**/*', (route) => {
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SPA_READER_HTML });
  });

  const page = await context.newPage();
  await page.goto('https://spa-reader.com/series/martial-peak/chapter-1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('Clicking #btn-next...');
  await page.click('#btn-next');

  let elapsed = 0;
  for (const step of [400, 300, 300, 300, 300, 500, 500]) {
    await page.waitForTimeout(step);
    elapsed += step;
    const st = await sw.evaluate(() => chrome.storage.local.get(['savedNovels']));
    const ch = Object.values(st.savedNovels || {})[0]?.chapter;
    console.log(`At elapsed ${elapsed}ms, chapter = ${ch}`);
  }

  await context.close();
  fs.rmSync(tempProfileDir, { recursive: true, force: true });
})();
