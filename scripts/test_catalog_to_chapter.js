const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXT_PATH = path.resolve('.');

(async () => {
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw_cat_'));
  const context = await chromium.launchPersistentContext(tempProfileDir, {
    headless: false,
    args: ['--headless=new', '--disable-extensions-except=' + EXT_PATH, '--load-extension=' + EXT_PATH]
  });

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10000 });

  const page = await context.newPage();

  console.log('Navigating to novel profile page on SkyNovels...');
  await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  let st = await sw.evaluate(() => chrome.storage.local.get(['savedNovels']));
  console.log('On profile page, savedNovels count:', Object.keys(st.savedNovels || {}).length);

  console.log('Navigating via SPA to chapter 103204...');
  // Find a link or navigate to chapter 103204
  await page.evaluate(() => {
    // Angular router navigate
    window.location.href = 'https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page';
  });

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  st = await sw.evaluate(() => chrome.storage.local.get(['savedNovels']));
  console.log('After arriving at chapter, savedNovels:');
  console.log(JSON.stringify(st.savedNovels, null, 2));

  await context.close();
  fs.rmSync(tempProfileDir, { recursive: true, force: true });
})();
