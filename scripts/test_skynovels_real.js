const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('Navigating to SkyNovels...');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('Page loaded DOMContentLoaded!');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());

    // Wait a couple seconds for Angular to hydrate
    await page.waitForTimeout(3000);
    console.log('Title after 3s:', await page.title());

    const headings = await page.$$eval('h1, h2, h3, .cha-tit, [class*="chapter"], [class*="chp"]', els =>
      els.map(e => ({ tag: e.tagName, text: e.innerText?.trim()?.slice(0, 100), cls: e.className }))
    );
    console.log('Found elements count:', headings.length);
    console.log('Headings/Chapter elements found:', headings.slice(0, 10));

    const links = await page.$$eval('a[href]', els =>
      els.filter(e => /novelas|siguiente|next/i.test(e.innerText || '') || /novelas/i.test(e.href))
        .map(e => ({ text: e.innerText?.trim()?.slice(0, 60), href: e.href }))
    );
    console.log('Sample links found:', links.slice(0, 10));

  } catch (err) {
    console.error('Error during navigation:', err);
  } finally {
    await browser.close();
  }
})();
