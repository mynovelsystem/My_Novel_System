const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXT_PATH = path.resolve('.');

(async () => {
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw_cat_click_'));
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

  console.log('Finding chapter link on profile page...');
  const chapLinks = await page.$$eval('a[href*="/103204"], a[href*="103"]', els => els.map(e => ({ text: e.innerText?.trim(), href: e.href })));
  console.log('Found chapter links:', chapLinks.slice(0, 5));

  // If there's a "Leer" or "Primer Capítulo" or specific chapter button:
  const readBtn = await page.$$eval('a, button', els => els.filter(e => /leer|empezar|cap[ií]tulo/i.test(e.innerText || '')).map(e => ({ tag: e.tagName, text: e.innerText?.trim(), href: e.href })));
  console.log('Read buttons on profile:', readBtn.slice(0, 10));

  await context.close();
  fs.rmSync(tempProfileDir, { recursive: true, force: true });
})();
