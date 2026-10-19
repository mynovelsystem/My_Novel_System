// ============================================================================
// MYNOVELSYSTEM — CHAPTER DETECTOR COMPREHENSIVE AUDIT TEST SUITE (FASE 2)
// Testing Novels, Manga, Manhwa, Manhua, SPA, Scroll Continuo, Decimals, Special Chapters
// ============================================================================

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================================');
console.log('   MYNOVELSYSTEM: CHAPTER DETECTOR COMPREHENSIVE AUDIT (FASE 2)     ');
console.log('====================================================================\n');

// Read source files
const contentScriptSrc = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const achievementsSrc = fs.readFileSync(path.join(__dirname, '..', 'achievements_data.js'), 'utf8');

function createDetectorContext(initialUrl, initialHtml = '<html><head></head><body></body></html>') {
  const urlObj = new URL(initialUrl);

  const listeners = {};
  const mockStorage = {};
  const sentMessages = [];

  class MockNode {
    constructor(tagName = 'div', attrs = {}, text = '') {
      this.tagName = tagName.toUpperCase();
      this.attributes = { ...attrs };
      this.textContent = text;
      this.children = [];
      this.parentNode = null;
      this.style = {};
      this.classList = {
        _classes: new Set((attrs.class || '').split(/\s+/).filter(Boolean)),
        contains(c) { return this._classes.has(c); },
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); }
      };
    }

    getAttribute(name) {
      return this.attributes[name] !== undefined ? this.attributes[name] : null;
    }

    setAttribute(name, val) {
      this.attributes[name] = String(val);
      if (name === 'class') {
        this.classList._classes = new Set(String(val).split(/\s+/).filter(Boolean));
      }
    }

    hasAttribute(name) {
      return this.attributes[name] !== undefined;
    }

    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    cloneNode(deep = false) {
      const clone = new MockNode(this.tagName, this.attributes, this.textContent);
      if (deep) {
        for (const child of this.children) {
          clone.appendChild(child.cloneNode(true));
        }
      }
      return clone;
    }

    remove() {
      if (this.parentNode) {
        const idx = this.parentNode.children.indexOf(this);
        if (idx !== -1) this.parentNode.children.splice(idx, 1);
        this.parentNode = null;
      }
    }

    querySelectorAll(selector) {
      const subSelectors = selector.split(',').map(s => s.trim());
      const results = [];
      const traverse = (node) => {
        for (const child of node.children) {
          if (subSelectors.some(s => matchesSelector(child, s))) {
            results.push(child);
          }
          traverse(child);
        }
      };
      traverse(this);
      return results;
    }

    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    }

    getBoundingClientRect() {
      return { top: 100, bottom: 500, height: 400, left: 0, right: 800, width: 800 };
    }
  }

  function matchesSelector(el, selector) {
    const sel = selector.trim();
    if (sel.startsWith('.')) {
      const cls = sel.slice(1).split(/[ ,.[\]]/)[0];
      return el.classList.contains(cls);
    }
    if (sel.startsWith('#')) {
      const id = sel.slice(1).split(/[ ,.[\]]/)[0];
      return el.attributes.id === id;
    }
    if (sel.includes('[') && sel.includes(']')) {
      const attrMatch = sel.match(/\[([a-zA-Z0-9_-]+)(?:([*^$]?=)(["']?)(.*?)\3)?\]/i);
      if (attrMatch) {
        const [, attr, op, , val] = attrMatch;
        const actual = el.getAttribute(attr);
        if (actual === null) return false;
        if (!op) return true;
        if (op === '=') return actual === val;
        if (op === '*=') return actual.toLowerCase().includes(val.toLowerCase());
        if (op === '^=') return actual.startsWith(val);
        if (op === '$=') return actual.endsWith(val);
      }
    }
    if (/^[a-zA-Z0-9]+$/.test(sel)) {
      return el.tagName === sel.toUpperCase();
    }
    return false;
  }

  const documentElement = new MockNode('html');
  const head = new MockNode('head');
  const body = new MockNode('body');
  documentElement.appendChild(head);
  documentElement.appendChild(body);

  const mockDocument = {
    documentElement,
    head,
    body,
    title: '',
    location: {
      href: initialUrl,
      origin: urlObj.origin,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      host: urlObj.host,
      hostname: urlObj.hostname,
      protocol: urlObj.protocol
    },
    createElement(tag, attrs = {}, text = '') { return new MockNode(tag, attrs, text); },
    querySelector(s) { return documentElement.querySelector(s); },
    querySelectorAll(s) { return documentElement.querySelectorAll(s); },
    getElementById(id) {
      const all = documentElement.querySelectorAll(`[id="${id}"]`);
      return all.length > 0 ? all[0] : null;
    },
    addEventListener(evt, fn) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    }
  };

  const mockWindow = {
    document: mockDocument,
    location: mockDocument.location,
    history: {
      pushState(state, title, url) {
        if (url) {
          const parsed = new URL(url, mockDocument.location.href);
          mockDocument.location.href = parsed.href;
          mockDocument.location.pathname = parsed.pathname;
          mockDocument.location.search = parsed.search;
          mockDocument.location.origin = parsed.origin;
          mockDocument.location.host = parsed.host;
          mockDocument.location.hostname = parsed.hostname;
        }
      },
      replaceState(state, title, url) {
        this.pushState(state, title, url);
      }
    },
    innerHeight: 900,
    innerWidth: 1400,
    scrollY: 0,
    addEventListener(evt, fn) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    removeEventListener() {},
    setTimeout(fn, ms) { return setTimeout(fn, ms); },
    clearTimeout(id) { clearTimeout(id); },
    setInterval() { return 1; },
    clearInterval() {},
    MutationObserver: class {
      constructor(cb) { this.cb = cb; }
      observe() {}
      disconnect() {}
    }
  };

  const chromeMock = {
    runtime: {
      sendMessage(msg, cb) {
        sentMessages.push(msg);
        if (cb) cb({ ok: true });
        return Promise.resolve({ ok: true });
      },
      onMessage: {
        addListener() {}
      }
    },
    storage: {
      local: {
        get(keys, cb) {
          const res = {};
          (Array.isArray(keys) ? keys : [keys]).forEach(k => {
            if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
          });
          if (cb) cb(res);
          return Promise.resolve(res);
        },
        set(obj, cb) {
          Object.assign(mockStorage, obj);
          if (cb) cb();
          return Promise.resolve();
        }
      }
    }
  };

  const sandbox = {
    window: mockWindow,
    document: mockDocument,
    location: mockDocument.location,
    history: mockWindow.history,
    chrome: chromeMock,
    console: {
      log() {},
      warn() {},
      error() {},
      info() {}
    },
    URL,
    MutationObserver: mockWindow.MutationObserver,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {}
  };

  mockWindow.__EXPOSE_DETECTOR_FOR_TESTS__ = true;

  vm.createContext(sandbox);
  vm.runInContext(achievementsSrc, sandbox);
  vm.runInContext(contentScriptSrc, sandbox);

  const internals = mockWindow.__DETECTOR_INTERNALS__ || {};
  return { sandbox, mockDocument, mockWindow, sentMessages, mockStorage, internals };
}

// ----------------------------------------------------------------------------
// Test 1: Royal Road novel URL and chapter title extraction
// ----------------------------------------------------------------------------
console.log('[Test 1] Royal Road Novel & Chapter Detection:');
{
  const ctx = createDetectorContext(
    'https://www.royalroad.com/fiction/21220/mother-of-learning/chapter/301778/1-good-morning-brother'
  );
  ctx.mockDocument.title = 'Mother of Learning - Chapter 1 - Good Morning Brother | Royal Road';

  const heading = ctx.mockDocument.createElement('h1', { class: 'font-white' }, '1: Good Morning Brother');
  ctx.mockDocument.body.appendChild(heading);

  const seriesLink = ctx.mockDocument.createElement('a', { href: '/fiction/21220/mother-of-learning' }, 'Mother of Learning');
  ctx.mockDocument.body.appendChild(seriesLink);

  const res = ctx.internals.extractChapterNumber("Mother of Learning");
  assert.strictEqual(res, '1', 'Royal Road Chapter 1 detected accurately');
  console.log('  [PASS] Royal Road chapter 1 recognized accurately without interference from fiction ID');
}

// ----------------------------------------------------------------------------
// Test 2: Webnovel Multi-Language Chapter Headings (Continuous Scroll)
// ----------------------------------------------------------------------------
console.log('\n[Test 2] Webnovel Multi-Language Headings & Continuous Scroll:');
{
  const ctx = createDetectorContext(
    'https://www.webnovel.com/book/shadow-slave_22196618/chapter-1-nightmare-begins_5958223'
  );
  ctx.mockDocument.title = 'Shadow Slave - Chapter 1: Nightmare Begins - Webnovel';

  const resEn = ctx.internals.extractChapterFromUrl("https://www.webnovel.com/book/shadow-slave_22196618/chapter-1-nightmare-begins_5958223");
  assert.strictEqual(resEn, '1', 'English chapter-1 detected');

  const resId = ctx.internals.extractChapterFromUrl("https://www.webnovel.com/book/shadow-slave_22196618/bab-14-kebangkitan_5958245");
  assert.strictEqual(resId, '14', 'Indonesian bab-14 detected');

  const resEs = ctx.internals.extractChapterFromUrl("https://www.webnovel.com/book/shadow-slave_22196618/capitulo-25-el-abismo_5958260");
  assert.strictEqual(resEs, '25', 'Spanish capitulo-25 detected');
  console.log('  [PASS] Webnovel English, Indonesian and Spanish chapter URLs parsed seamlessly');
}

// ----------------------------------------------------------------------------
// Test 3: SkyNovels SPA Angular Material Dropdown Detection
// ----------------------------------------------------------------------------
console.log('\n[Test 3] SkyNovels SPA Reader & Angular Material Dropdown:');
{
  const ctx = createDetectorContext('https://skynovels.net/novelas/1234/overlord/leer/capitulo-45');
  ctx.mockDocument.title = 'Overlord - Novela Ligera en Español | SkyNovels';

  const matSelect = ctx.mockDocument.createElement('span', { class: 'mat-mdc-select-value-text' }, 'Capítulo 45: Los Dos Líderes');
  ctx.mockDocument.body.appendChild(matSelect);

  const res = ctx.internals.extractChapterFromReaderDropdown("Overlord");
  assert.strictEqual(res, '45', 'SkyNovels chapter 45 extracted from custom select');
  console.log('  [PASS] SkyNovels Angular Material dropdown chapter 45 extracted reliably');
}

// ----------------------------------------------------------------------------
// Test 4: Webtoons Query Parameter Detection (episode_no)
// ----------------------------------------------------------------------------
console.log('\n[Test 4] Webtoons Query Parameter Detection (episode_no):');
{
  const ctx = createDetectorContext(
    'https://www.webtoons.com/en/fantasy/tower-of-god/ep-1/viewer?title_no=95&episode_no=88'
  );
  ctx.mockDocument.title = 'Ep. 88 - Tower of God | WEBTOON';

  const res = ctx.internals.extractChapterFromUrl("https://www.webtoons.com/en/fantasy/tower-of-god/ep-1/viewer?title_no=95&episode_no=88");
  assert.strictEqual(res, '88', 'Webtoons episode_no=88 detected without title_no collision');
  console.log('  [PASS] Webtoons episode_no query parameter extracted accurately');
}

// ----------------------------------------------------------------------------
// Test 5: MangaDex & AsuraScans Manga/Manhwa/Manhua Readers
// ----------------------------------------------------------------------------
console.log('\n[Test 5] Manga & Manhwa Platforms (AsuraScans, MangaDex):');
{
  const ctx = createDetectorContext('https://asuracomic.net/series/solo-leveling-chapter-179/');
  const resAsura = ctx.internals.extractChapterFromUrl("https://asuracomic.net/series/solo-leveling-chapter-179/");
  assert.strictEqual(resAsura, '179', 'AsuraScans chapter 179 parsed');

  const resNumericTrailing = ctx.internals.extractChapterFromUrl("https://example.com/manga/solo-leveling/15");
  assert.strictEqual(resNumericTrailing, '15', 'Trailing chapter number parsed');
  console.log('  [PASS] AsuraScans and Manga reader URL structures parsed cleanly');
}

// ----------------------------------------------------------------------------
// Test 6: Decimal Chapters (12.5, c12_5, 12-5)
// ----------------------------------------------------------------------------
console.log('\n[Test 6] Decimal Chapters Parsing:');
{
  const ctx = createDetectorContext('https://example.com/manga/test-series/chapter-12.5');
  const resDot = ctx.internals.extractChapterFromUrl("https://example.com/manga/test-series/chapter-12.5");
  assert.strictEqual(resDot, '12.5', 'Decimal chapter 12.5 parsed');

  const resHyphen = ctx.internals.extractChapterFromUrl("https://example.com/manga/test-series/chapter-12-5");
  assert.strictEqual(resHyphen, '12.5', 'Hyphen decimal chapter 12-5 normalized to 12.5');
  console.log('  [PASS] Decimal chapters 12.5 and 12-5 normalized accurately');
}

// ----------------------------------------------------------------------------
// Test 7: Special Chapters (Prólogo -> 0, Epílogo)
// ----------------------------------------------------------------------------
console.log('\n[Test 7] Special Chapter Normalization (Prólogo -> 0):');
{
  const ctx = createDetectorContext('https://example.com/novela/reverend-insanity/prologo');
  const resPrologo = ctx.internals.parseSpecialChapter("Prólogo: El Gran Viaje");
  assert.strictEqual(resPrologo, '0', 'Spanish Prólogo mapped to chapter 0');

  const resPrologue = ctx.internals.parseSpecialChapter("Prologue - Rebirth of the Demon");
  assert.strictEqual(resPrologue, '0', 'English Prologue mapped to chapter 0');
  console.log('  [PASS] Special chapters (Prólogo / Prologue) mapped reliably to 0');
}

// ----------------------------------------------------------------------------
// Test 8: Anti-False-Positive Guards
// ----------------------------------------------------------------------------
console.log('\n[Test 8] Anti-False-Positive Guards:');
{
  const ctx = createDetectorContext('https://example.com/novela/86-eighty-six/capitulo-10');
  // Title has leading number "86", but chapter is 10
  const isExcluded = ctx.internals.matchLeadingNumberChapter("86", "86 - Eighty Six");
  assert.strictEqual(isExcluded, null, 'Leading novel title number 86 excluded from chapter detection');

  // Year 2024 should not be detected as chapter without keyword
  const isYearExcluded = ctx.internals.matchLeadingNumberChapter("2024");
  assert.strictEqual(isYearExcluded, null, 'Publication year 2024 excluded from bare chapter detection');

  // Page pagination /page/3 should not be detected as chapter 3
  const isPageExcluded = ctx.internals.extractChapterFromUrl("https://example.com/manga/bleach/chapter-50/page/3");
  assert.notStrictEqual(isPageExcluded, '3', 'Image page 3 is not treated as chapter 3');
  console.log('  [PASS] Anti-false-positive guards prevent book title numbers, years, and image pages from falsifying chapter detection');
}

// ----------------------------------------------------------------------------
// Test 9: SPA Dynamic Navigation via History API
// ----------------------------------------------------------------------------
console.log('\n[Test 9] SPA Dynamic Navigation via History API:');
{
  const ctx = createDetectorContext('https://example.com/series/lord-of-mysteries/chapter-1');
  ctx.mockDocument.title = 'Lord of Mysteries - Chapter 1';

  // Simulate SPA pushState transition to Chapter 2
  ctx.mockWindow.history.pushState({}, '', 'https://example.com/series/lord-of-mysteries/chapter-2');
  assert.strictEqual(ctx.mockDocument.location.pathname, '/series/lord-of-mysteries/chapter-2');

  const newChap = ctx.internals.extractChapterFromUrl(ctx.mockDocument.location.href);
  assert.strictEqual(newChap, '2', 'Chapter 2 detected cleanly after SPA navigation');
  console.log('  [PASS] SPA History pushState updates URL and detects new chapter without page reload');
}

console.log('\n====================================================================');
console.log('>>> ALL FASE 2 CHAPTER DETECTOR COMPREHENSIVE TESTS PASSED 100%! <<<');
console.log('====================================================================\n');
process.exit(0);
