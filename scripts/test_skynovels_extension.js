const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const contentScriptCode = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

  const sentMessages = [];

  // Expose mock chrome API to the page before any script runs
  await page.addInitScript(() => {
    window.__sentMessages = [];
    window.chrome = {
      runtime: {
        id: "mock-id",
        getURL: (p) => p,
        sendMessage: (msg) => {
          window.__sentMessages.push(msg);
          console.log('[PAGE chrome.runtime.sendMessage]:', JSON.stringify(msg));
          if (msg.type === "NOVEL_DETECTED") {
            return Promise.resolve({
              ok: true,
              saved: true,
              seriesId: msg.data.seriesId,
              novelName: msg.data.novelName,
              chapter: msg.data.chapter
            });
          }
          return Promise.resolve({ ok: true });
        },
        onMessage: {
          addListener: (fn) => {
            window.__msgListener = fn;
          }
        }
      },
      storage: {
        local: {
          get: (keys, cb) => {
            const res = { domainBlacklist: [] };
            if (cb) cb(res);
            return Promise.resolve(res);
          },
          set: (obj, cb) => {
            if (cb) cb();
            return Promise.resolve();
          }
        },
        onChanged: {
          addListener: () => {}
        }
      }
    };
  });

  try {
    console.log('Navigating to SkyNovels...');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page loaded. Evaluating content.js...');
    await page.evaluate((code) => {
      window.eval(code);
    }, contentScriptCode);

    console.log('Waiting 4s for detection...');
    await page.waitForTimeout(4000);

    const msgs = await page.evaluate(() => window.__sentMessages);
    console.log('Messages sent count:', msgs.length);
    console.log('Messages:', JSON.stringify(msgs, null, 2));

    // Now let's test what happens when navigating to the next chapter!
    // Let's find how next chapter is triggered on the page:
    // Is there a next button, or does changing URL trigger it?
    console.log('Testing URL change / navigation to next chapter 103205...');
    await page.evaluate(() => {
      history.pushState({}, '', '/novelas/179/esclavo-de-las-sombras/103205/?readerScroll=page');
      document.title = 'Esclavo de las Sombras | SS - Capítulo 1398';
      const h2 = document.querySelector('h2');
      if (h2) h2.textContent = 'Capítulo 1398: Siguiente';
    });

    console.log('Waiting 4s after pushState navigation...');
    await page.waitForTimeout(4000);

    const msgsAfter = await page.evaluate(() => window.__sentMessages);
    console.log('Total messages sent after pushState:', msgsAfter.length);
    console.log('All messages:', JSON.stringify(msgsAfter, null, 2));

  } catch (err) {
    console.error('Error in test:', err);
  } finally {
    await browser.close();
  }
})();
