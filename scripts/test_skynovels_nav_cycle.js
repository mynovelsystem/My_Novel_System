const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
  const extPath = path.resolve(__dirname, '..');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-cycle-'));

  console.log('Launching browser with extension...');
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
    console.log('Background SW active:', Boolean(background));

    // Enable console logs
    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('NOVEL_DETECTED') || txt.includes('SPA') || txt.includes('evaluatePage')) {
        console.log('[PAGE]:', txt);
      }
    });

    console.log('\n--- Step 1: Navigating to Chapter 103204 (1397) ---');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(4000);

    let storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after Step 1:');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

    console.log('\n--- Step 2: Clicking Next Chapter -> 103205 (1398) ---');
    const nextClicked = await page.evaluate(() => {
      const btn = document.querySelector('button.bottom-nav-btn[aria-label="Capítulo siguiente"]') ||
                  document.querySelector('button[aria-label*="siguiente" i]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log('Next clicked:', nextClicked);
    await page.waitForTimeout(6000);

    console.log('Page URL after Next:', page.url());
    console.log('Page Title after Next:', await page.title());
    storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after Step 2:');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

    console.log('\n--- Step 3: Clicking Previous Chapter -> 103204 (1397) ---');
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
    console.log('Storage after Step 3:');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

    console.log('\n--- Step 4: Clicking Next Chapter AGAIN -> 103205 (1398) ---');
    const nextAgain = await page.evaluate(() => {
      const btn = document.querySelector('button.bottom-nav-btn[aria-label="Capítulo siguiente"]') ||
                  document.querySelector('button[aria-label*="siguiente" i]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log('Next again clicked:', nextAgain);
    await page.waitForTimeout(6000);

    console.log('Page URL after Next again:', page.url());
    console.log('Page Title after Next again:', await page.title());
    storage = await background.evaluate(async () => (await chrome.storage.local.get('savedNovels')).savedNovels);
    console.log('Storage after Step 4:');
    for (const [k, v] of Object.entries(storage || {})) {
      console.log(`  Key: ${k} | Chap: ${v.chapter} | maxCounted: ${v.maxCounted} | URL: ${v.url}`);
    }

  } catch (err) {
    console.error('Error in nav cycle:', err);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
})();
