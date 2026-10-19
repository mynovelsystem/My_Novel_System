const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXT_PATH = path.resolve('.');

(async () => {
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw_nav_'));
  const context = await chromium.launchPersistentContext(tempProfileDir, {
    headless: false,
    args: ['--headless=new', '--disable-extensions-except=' + EXT_PATH, '--load-extension=' + EXT_PATH]
  });

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10000 });

  const page = await context.newPage();

  console.log('Navigating to chapter 103204 on SkyNovels...');
  await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  let st = await sw.evaluate(() => chrome.storage.local.get(['savedNovels']));
  console.log('Initial savedNovels:', JSON.stringify(st.savedNovels));

  // Open the chapter drawer/modal
  console.log('Clicking navbar-chapters-btn...');
  await page.click('button.navbar-chapters-btn');
  await page.waitForTimeout(2000);

  // Look for chapter list items
  const chapItems = await page.$$eval('mat-list-item, .mat-list-item, a[href*="/103"], .chapter-item', els =>
    els.map(e => ({ tag: e.tagName, text: e.innerText?.trim()?.slice(0, 50), href: e.href }))
  );
  console.log('Chapter drawer items count:', chapItems.length);
  console.log('Sample items:', chapItems.slice(0, 5));

  await context.close();
  fs.rmSync(tempProfileDir, { recursive: true, force: true });
})();
