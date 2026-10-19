const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
  const extPath = path.resolve(__dirname, '..');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-ext-'));

  console.log('Launching browser with extension at:', extPath);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // extensions only load in headed or new-headless
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--headless=new'
    ]
  });

  try {
    const page = await context.newPage();

    // Check service worker / background
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => null);
    }
    console.log('Background service worker found?:', Boolean(background));

    // Listen to all console messages in page and background
    page.on('console', msg => console.log('[PAGE CONSOLE]:', msg.text()));
    if (background) {
      background.on('console', msg => console.log('[SW CONSOLE]:', msg.text()));
    }

    console.log('Navigating to SkyNovels...');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Initial page loaded!');
    await page.waitForTimeout(4000);

    // Check storage in extension
    if (background) {
      const storageData = await background.evaluate(async () => {
        return await chrome.storage.local.get(null);
      });
      console.log('SavedNovels in storage after initial load:');
      console.log(JSON.stringify(storageData.savedNovels, null, 2));
    }

    // Now click the real next button
    console.log('Clicking next chapter button on page...');
    const clicked = await page.evaluate(() => {
      const nextBtn = document.querySelector('button.bottom-nav-btn[aria-label="Capítulo siguiente"]') ||
                      document.querySelector('button.nav-next') ||
                      document.querySelector('button[aria-label*="siguiente" i]');
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });
    console.log('Button clicked?:', clicked);

    console.log('Waiting 8s after click...');
    await page.waitForTimeout(8000);

    console.log('URL after click:', page.url());
    console.log('Title after click:', await page.title());

    if (background) {
      const storageAfter = await background.evaluate(async () => {
        return await chrome.storage.local.get(null);
      });
      console.log('SavedNovels in storage after click:');
      console.log(JSON.stringify(storageAfter.savedNovels, null, 2));
    }

  } catch (err) {
    console.error('Error in extension test:', err);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
})();
