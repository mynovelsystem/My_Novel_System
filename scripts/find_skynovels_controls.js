const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Current URL:', page.url());

    // Look for navigation buttons or icons: skip_next, navigate_next, arrow_forward, etc.
    const buttons = await page.$$eval('button, a, .material-icons', els =>
      els.map(e => ({
        tag: e.tagName,
        text: e.innerText?.trim(),
        cls: e.className,
        ariaLabel: e.getAttribute('aria-label'),
        title: e.getAttribute('title')
      })).filter(b => /skip_next|navigate_next|arrow_forward|siguiente|next/i.test(b.text || b.ariaLabel || b.title || ''))
    );
    console.log('Potential next buttons:', buttons);

    // Let's also check the reader dropdown / select!
    const selects = await page.$$eval('mat-select, select, [class*="select"]', els =>
      els.map(e => ({
        tag: e.tagName,
        cls: e.className,
        text: e.innerText?.trim()?.slice(0, 50),
        id: e.id
      }))
    );
    console.log('Select elements:', selects);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
