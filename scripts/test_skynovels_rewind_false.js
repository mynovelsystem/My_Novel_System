const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
  const extPath = path.resolve(__dirname, '..');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-rewind-false-'));

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

    // Set allowRewind to FALSE
    await background.evaluate(async () => {
      await chrome.storage.local.set({
        settings: { allowRewind: false }
      });
    });

    console.log('\n--- Step 1: Navigating to Chapter 103205 (1398) ---');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103205/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(4000);

    let storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after Step 1 (should be 1398):');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

    console.log('\n--- Step 2: Clicking Previous Chapter -> 103204 (1397) with allowRewind: false ---');
    const prevClicked = await page.evaluate(() => {
      const btn = document.querySelector('button.bottom-nav-btn[aria-label="Capítulo anterior"]') ||
                  document.querySelector('button[aria-label*="anterior" i]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log('Prev clicked:', prevClicked);
    await page.waitForTimeout(6000);

    console.log('Page URL after Prev:', page.url());
    console.log('Page Title after Prev:', await page.title());
    storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after Step 2 (should still be 1398, zero duplicates):');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

    console.log('\n--- Step 3: Refresh or navigate to 103204 directly ---');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after reload on 103204:');
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
