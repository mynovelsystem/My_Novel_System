const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const achievementsSrc = fs.readFileSync(path.join(__dirname, '..', 'achievements_data.js'), 'utf8');
const backgroundSrc = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
const contentScriptCode = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const store = {
    savedNovels: {},
    settings: { allowRewind: false },
    stats: {}
  };

  const bgSandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    Promise,
    parseFloat,
    parseInt,
    isNaN,
    URL,
    FIREBASE_API_KEY: 'fake',
    FIREBASE_DB_URL: 'https://fake.firebaseio.com',
    importScripts: () => {},
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    chrome: {
      action: {
        setBadgeText: () => Promise.resolve(),
        setBadgeBackgroundColor: () => Promise.resolve(),
        setTitle: () => Promise.resolve(),
        setIcon: () => Promise.resolve()
      },
      alarms: { create: () => {}, clear: () => {}, onAlarm: { addListener: () => {} } },
      commands: { onCommand: { addListener: () => {} } },
      omnibox: { onInputChanged: { addListener: () => {} }, onInputEntered: { addListener: () => {} } },
      runtime: {
        id: 'mock-ext',
        getURL: (p) => p,
        onMessage: { addListener: () => {} },
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} }
      },
      storage: {
        onChanged: { addListener: () => {} },
        local: {
          get: async (k) => {
            if (!k || k === null) return { ...store };
            if (Array.isArray(k)) {
              const r = {}; k.forEach(x => r[x] = store[x]); return r;
            }
            if (typeof k === 'string') return { [k]: store[k] };
            return { ...store };
          },
          set: async (items) => { Object.assign(store, items); },
          remove: async (keys) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => delete store[k]);
          }
        }
      },
      tabs: {
        query: async () => [],
        get: async (id) => ({ id }),
        create: async () => ({ id: 2 }),
        update: async () => ({ id: 1 }),
        sendMessage: async () => {},
        onActivated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onUpdated: { addListener: () => {} }
      }
    }
  };

  vm.createContext(bgSandbox);
  vm.runInContext(achievementsSrc, bgSandbox);
  vm.runInContext(backgroundSrc, bgSandbox);

  await page.exposeFunction('bgHandleNovelDetected', async (novelData, confident) => {
    console.log('[NODE BG RECEIVED NOVEL_DETECTED]:', novelData.chapter, novelData.url);
    const res = await bgSandbox.handleNovelDetected(novelData, confident, 1);
    console.log('[NODE BG RESULT]:', JSON.stringify(res, null, 2));
    console.log('[NODE BG STORE savedNovels keys]:', Object.keys(store.savedNovels));
    for (const [k, v] of Object.entries(store.savedNovels)) {
      console.log(`  ${k}: chapter=${v.chapter}, maxCounted=${v.maxCounted}, url=${v.url}`);
    }
    return res;
  });

  await page.addInitScript(() => {
    window.__sentMessages = [];
    window.chrome = {
      runtime: {
        id: "mock-id",
        getURL: (p) => p,
        sendMessage: async (msg) => {
          window.__sentMessages.push(msg);
          if (msg.type === "NOVEL_DETECTED") {
            const res = await window.bgHandleNovelDetected(msg.data, msg.confident);
            return res;
          }
          return { ok: true };
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
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Injecting content.js...');
    await page.evaluate((code) => {
      window.eval(code);
    }, contentScriptCode);

    console.log('Waiting 5s for initial detection...');
    await page.waitForTimeout(5000);

    console.log('Initial savedNovels count:', Object.keys(store.savedNovels).length);

    console.log('Clicking next chapter button...');
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

    console.log('Waiting 8s to see what happens after click...');
    await page.waitForTimeout(8000);

    console.log('Final savedNovels summary:');
    console.log('Total keys:', Object.keys(store.savedNovels).length);
    for (const [k, v] of Object.entries(store.savedNovels)) {
      console.log(`  Key: ${k}`);
      console.log(`  Name: ${v.novelName}`);
      console.log(`  Chapter: ${v.chapter}`);
      console.log(`  MaxCounted: ${v.maxCounted}`);
      console.log(`  URL: ${v.url}`);
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
})();
