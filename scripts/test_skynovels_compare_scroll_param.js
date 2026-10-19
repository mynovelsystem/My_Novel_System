const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
  const extPath = path.resolve(__dirname, '..');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-scroll-param-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--headless=new'
    ]
  });

  try {
    const page = await context.newPage();
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => null);
    }

    console.log('--- Test A: Load WITHOUT readerScroll=page ---');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(4000);

    console.log('Final URL on page A:', page.url());
    console.log('Page Title A:', await page.title());

    let storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after Test A:');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

    console.log('\n--- Test B: Load WITH readerScroll=page ---');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103205/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(4000);

    console.log('Final URL on page B:', page.url());
    console.log('Page Title B:', await page.title());

    storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after Test B:');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
})();
