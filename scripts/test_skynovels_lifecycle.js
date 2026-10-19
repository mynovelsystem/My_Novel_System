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
    console.log('[NODE BG RESULT]: ok=', res.ok, 'saved=', res.saved, 'chapter=', res.chapter);
    return res;
  });

  await page.exposeFunction('bgLog', (text) => {
    console.log('[CONTENT.JS LOG]:', text);
  });

  // Inject content.js as an init script so it executes before/during page loading
  await page.addInitScript((code) => {
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
          if (msg.type === "DIAGNOSTIC_LOG") {
            window.bgLog('DIAGNOSTIC_LOG: ' + JSON.stringify(msg.entry));
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

    // Run content script when DOM is loading or ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.eval(code);
      });
    } else {
      window.eval(code);
    }
  }, contentScriptCode);

  try {
    console.log('Navigating to SkyNovels with content script pre-injected...');
    await page.goto('https://www.skynovels.net/novelas/179/esclavo-de-las-sombras/103204/?readerScroll=page', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Waiting 6s after networkidle...');
    await page.waitForTimeout(6000);

    console.log('Saved novels after initial load:', Object.keys(store.savedNovels).length);
    for (const [k, v] of Object.entries(store.savedNovels)) {
      console.log(`  Key: ${k}, Chapter: ${v.chapter}`);
    }

    console.log('Clicking next chapter button in Angular SPA...');
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

    console.log('Waiting 10s after click for Angular SPA transition and detection...');
    await page.waitForTimeout(10000);

    console.log('URL after click:', page.url());
    console.log('Title after click:', await page.title());
    console.log('Saved novels after click:');
    console.log('Total keys:', Object.keys(store.savedNovels).length);
    for (const [k, v] of Object.entries(store.savedNovels)) {
      console.log(`  Key: ${k}, Chapter: ${v.chapter}, URL: ${v.url}`);
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
})();
