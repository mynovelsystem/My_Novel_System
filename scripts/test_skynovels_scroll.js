const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('Navigating to SkyNovels...');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Initial URL:', page.url());
    console.log('Initial Title:', await page.title());

    // Scroll to the bottom of the page
    console.log('Scrolling to bottom of page...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    console.log('URL after scroll:', page.url());
    console.log('Title after scroll:', await page.title());

    // Scroll more just in case
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    console.log('URL after 2nd scroll:', page.url());
    console.log('Title after 2nd scroll:', await page.title());

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
