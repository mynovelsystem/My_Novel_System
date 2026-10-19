const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const scrollModes = await page.evaluate(() => {
      // Check reader settings or localStorage or classes
      return {
        classes: document.querySelector('.skn-chp-main-panel')?.className,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      };
    });
    console.log('Scroll modes info:', scrollModes);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
