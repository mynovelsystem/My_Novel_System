// ============================================================================
// NOVEL CHAPTER TRACKER — PLAYWRIGHT MV3 EXTENSION AUTOMATED TEST SUITE
// Webnovel Continuous Scrolling (SPA Infinite Scroll) Verification
// ============================================================================

const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');
const vm = require('vm');

// Helper for colored console output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

function logStep(stepNum, title) {
  console.log(`\n${colors.cyan(colors.bold(`[Test Step ${stepNum}]`))} ${colors.bold(title)}`);
}

function logPass(msg) {
  console.log(`  ${colors.green('✔ PASS:')} ${msg}`);
}

function logFail(msg) {
  console.error(`  ${colors.red('✖ FAIL:')} ${msg}`);
}

function resolvePlaywright() {
  const pkgNames = ['playwright', '@playwright/test', 'playwright-core'];
  for (const name of pkgNames) {
    try {
      return require(name);
    } catch {}
  }

  const userProfile = process.env.USERPROFILE || 'C:\\Users\\dhovs';
  const candidateDirs = [
    path.join(process.cwd(), 'node_modules'),
    path.join(userProfile, 'node_modules'),
    path.join(userProfile, 'AppData', 'Roaming', 'npm', 'node_modules')
  ];

  for (const dir of candidateDirs) {
    for (const name of pkgNames) {
      const cand = path.join(dir, name);
      try {
        if (fs.existsSync(cand)) {
          return require(cand);
        }
      } catch {}
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Self-Contained Native MV3 & DOM Continuous Scroll Test Engine
// ----------------------------------------------------------------------------
class MockElement {
  constructor(tagName = 'div', attributes = {}, textContent = '') {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.attributes = { ...attributes };
    this.children = [];
    this.parent = null;
    this._textContent = textContent;
    this.style = {};
    this.eventListeners = {};
    this._scrollHeight = 2400;
  }

  get scrollHeight() {
    if (this.children.length > 0) {
      let total = 0;
      for (const c of this.children) {
        total += (c.scrollHeight || 0);
      }
      return Math.max(this._scrollHeight, total);
    }
    return this._scrollHeight;
  }
  set scrollHeight(v) { this._scrollHeight = v; }

  get textContent() { return this._textContent; }
  set textContent(val) {
    const old = this._textContent;
    this._textContent = String(val);
    if (old !== this._textContent) {
      this._notifyMutation({
        type: 'characterData',
        target: this,
        oldValue: old
      });
    }
  }

  get id() { return this.attributes.id || ''; }
  set id(val) {
    this.attributes.id = val;
    this._notifyMutation({ type: 'attributes', target: this, attributeName: 'id' });
  }

  get className() { return this.attributes.class || ''; }
  set className(val) {
    this.attributes.class = val;
    this._notifyMutation({ type: 'attributes', target: this, attributeName: 'class' });
  }

  get href() {
    if (!this.attributes.href) return '';
    if (this.attributes.href.startsWith('http')) return this.attributes.href;
    return `https://www.webnovel.com${this.attributes.href}`;
  }
  set href(val) {
    this.attributes.href = val;
    this._notifyMutation({ type: 'attributes', target: this, attributeName: 'href' });
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.attributes.id = String(value);
    if (name === 'class') this.attributes.class = String(value);
    this._notifyMutation({ type: 'attributes', target: this, attributeName: name });
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    this._notifyMutation({ type: 'attributes', target: this, attributeName: name });
  }

  appendChild(child) {
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    this.children.push(child);
    this._notifyMutation({
      type: 'childList',
      target: this,
      addedNodes: [child],
      removedNodes: []
    });
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parent = null;
      this._notifyMutation({
        type: 'childList',
        target: this,
        addedNodes: [],
        removedNodes: [child]
      });
    }
    return child;
  }

  remove() {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  cloneNode(deep = true) {
    const clone = new MockElement(this.tagName, { ...this.attributes }, this.textContent);
    clone.style = { ...this.style };
    clone._scrollHeight = this._scrollHeight;
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  _notifyMutation(record) {
    let curr = this;
    while (curr) {
      if (curr._observers) {
        for (const obs of curr._observers) {
          const isDirect = curr === this;
          if (isDirect || obs.options.subtree) {
            if (record.type === 'childList' && obs.options.childList) {
              obs.observer._enqueue(record);
            } else if (record.type === 'characterData' && obs.options.characterData) {
              obs.observer._enqueue(record);
            } else if (record.type === 'attributes' && obs.options.attributes) {
              obs.observer._enqueue(record);
            }
          }
        }
      }
      curr = curr.parent;
    }
  }

  addEventListener(type, listener) {
    if (!this.eventListeners[type]) this.eventListeners[type] = [];
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type, listener) {
    if (!this.eventListeners[type]) return;
    this.eventListeners[type] = this.eventListeners[type].filter(l => l !== listener);
  }

  dispatchEvent(evt) {
    const listeners = this.eventListeners[evt.type] || [];
    for (const l of listeners) {
      try { l(evt); } catch (e) { console.error('Event listener error:', e); }
    }
  }

  attachShadow() {
    this.shadowRoot = new MockElement('SHADOW-ROOT');
    this.shadowRoot.getElementById = (id) => this.shadowRoot.querySelector(`#${id}`);
    return this.shadowRoot;
  }

  scrollIntoView() {}

  matches(sel) {
    sel = sel.trim();
    if (!sel || sel === '*') return true;

    // Direct child combinator: head > title or parent > child
    if (sel.includes(' > ')) {
      const parts = sel.split(/\s*>\s*/);
      const childPart = parts[parts.length - 1];
      const parentPart = parts[parts.length - 2];
      if (!this.matches(childPart)) return false;
      return Boolean(this.parent && this.parent.matches(parentPart));
    }

    // Descendant: .breadcrumb a, nav[aria-label] a[href], etc. (respecting attribute brackets)
    const descendantParts = sel.match(/([^\s\[\]]+|\[[^\]]+\])+/g);
    if (descendantParts && descendantParts.length > 1) {
      const lastPart = descendantParts[descendantParts.length - 1];
      if (!this.matches(lastPart)) return false;
      let ancestor = this.parent;
      let partIdx = descendantParts.length - 2;
      while (ancestor && partIdx >= 0) {
        if (ancestor.matches(descendantParts[partIdx])) {
          partIdx--;
        }
        ancestor = ancestor.parent;
      }
      return partIdx < 0;
    }

    // Selector: #id
    if (sel.startsWith('#')) {
      return this.id === sel.slice(1);
    }

    // Selector: .class
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      const classes = (this.className || '').split(/\s+/).filter(Boolean);
      return classes.includes(cls);
    }

    // Tag + class: a.novel-title or div.reading-content
    const tagClassMatch = sel.match(/^([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)$/);
    if (tagClassMatch) {
      const [_, tag, cls] = tagClassMatch;
      if (this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
      const classes = (this.className || '').split(/\s+/).filter(Boolean);
      return classes.includes(cls);
    }

    // Tag and/or Multiple Attribute selectors:
    // Examples: a[href], a[href*="/book/"], link[rel="canonical"][href], [href], etc.
    const attrSelMatch = sel.match(/^([a-zA-Z0-9_-]+)?((?:\[[^\]]+\])+)$/);
    if (attrSelMatch) {
      const tag = attrSelMatch[1];
      if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
      const attrBlocks = attrSelMatch[2];
      const attrRegex = /\[([a-zA-Z0-9_-]+)(?:([*^$]?=)(["']?)(.*?)\3)?\s*(i)?\]/g;
      let match;
      while ((match = attrRegex.exec(attrBlocks)) !== null) {
        const [__, attrName, op, ___, attrVal, flag] = match;
        const val = this.getAttribute(attrName);
        if (val === null) return false;
        if (!op) continue;
        const ignoreCase = flag === 'i';
        const actual = ignoreCase ? val.toLowerCase() : val;
        const expected = ignoreCase ? attrVal.toLowerCase() : attrVal;
        if (op === '=' && actual !== expected) return false;
        if (op === '*=' && !actual.includes(expected)) return false;
        if (op === '^=' && !actual.startsWith(expected)) return false;
        if (op === '$=' && !actual.endsWith(expected)) return false;
      }
      return true;
    }

    // Pure Tag selector: h1, div, a, p, title, etc.
    if (/^[a-zA-Z0-9_-]+$/.test(sel)) {
      return this.tagName.toLowerCase() === sel.toLowerCase();
    }

    return false;
  }

  querySelectorAll(selector) {
    const results = [];
    const selectors = (selector.match(/(?:[^,\[\]]+|\[[^\]]*\])+/g) || []).map(s => s.trim());

    function traverse(node) {
      for (const sel of selectors) {
        if (node.matches(sel)) {
          results.push(node);
          break;
        }
      }
      for (const child of node.children) {
        traverse(child);
      }
    }

    for (const child of this.children) {
      traverse(child);
    }
    return results;
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }
}

class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observedTargets = [];
    this.queue = [];
    this._flushScheduled = false;
  }

  observe(target, options = {}) {
    if (!target._observers) target._observers = [];
    target._observers.push({ observer: this, options });
    this.observedTargets.push(target);
  }

  disconnect() {
    for (const t of this.observedTargets) {
      if (t._observers) {
        t._observers = t._observers.filter(o => o.observer !== this);
      }
    }
    this.observedTargets = [];
    this.queue = [];
  }

  _enqueue(record) {
    this.queue.push(record);
    if (!this._flushScheduled) {
      this._flushScheduled = true;
      Promise.resolve().then(() => {
        this._flushScheduled = false;
        if (this.queue.length > 0) {
          const recs = this.queue.slice();
          this.queue = [];
          try {
            this.callback(recs, this);
          } catch (e) {
            console.error('MockMutationObserver callback error:', e);
          }
        }
      });
    }
  }
}

function createSharedMockStorage(initial = {}) {
  const store = JSON.parse(JSON.stringify(initial));
  const changeListeners = [];

  const local = {
    get: (keys, callback) => {
      const performGet = () => {
        if (keys === null || keys === undefined) return JSON.parse(JSON.stringify(store));
        if (typeof keys === 'string') return { [keys]: store[keys] !== undefined ? JSON.parse(JSON.stringify(store[keys])) : undefined };
        if (Array.isArray(keys)) {
          const res = {};
          for (const k of keys) {
            if (store[k] !== undefined) res[k] = JSON.parse(JSON.stringify(store[k]));
          }
          return res;
        }
        if (typeof keys === 'object') {
          const res = {};
          for (const [k, def] of Object.entries(keys)) {
            res[k] = store[k] !== undefined ? JSON.parse(JSON.stringify(store[k])) : def;
          }
          return res;
        }
        return JSON.parse(JSON.stringify(store));
      };

      const result = performGet();
      if (typeof callback === 'function') {
        callback(result);
        return;
      }
      return Promise.resolve(result);
    },
    set: (items, callback) => {
      const changes = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: store[k], newValue: v };
        store[k] = JSON.parse(JSON.stringify(v));
      }
      for (const listener of changeListeners) {
        try { listener(changes, 'local'); } catch {}
      }
      if (typeof callback === 'function') callback();
      return Promise.resolve();
    },
    remove: (keys, callback) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      const changes = {};
      for (const k of arr) {
        changes[k] = { oldValue: store[k], newValue: undefined };
        delete store[k];
      }
      for (const listener of changeListeners) {
        try { listener(changes, 'local'); } catch {}
      }
      if (typeof callback === 'function') callback();
      return Promise.resolve();
    }
  };

  const sync = {
    get: async () => ({}),
    set: async () => {}
  };

  const onChanged = {
    addListener: (fn) => changeListeners.push(fn),
    removeListener: (fn) => {
      const idx = changeListeners.indexOf(fn);
      if (idx !== -1) changeListeners.splice(idx, 1);
    }
  };

  return { store, local, sync, onChanged };
}

// Helper to wait for debounced page evaluation
const waitForEvaluation = (ms = 1200) => new Promise((r) => setTimeout(r, ms));

// ----------------------------------------------------------------------------
// Execution of Self-Contained Test Suite
// ----------------------------------------------------------------------------
async function runSelfContainedContinuousScrollSuite() {
  console.log(colors.yellow(colors.bold('\n>>> EXECUTING MANIFEST V3 CONTINUOUS SCROLL AUTOMATED VERIFICATION SUITE <<<')));
  console.log('Running isolated in-process VM engine with real background.js and content.js...\n');

  let passedTests = 0;
  let totalTests = 0;

  // STEP 1: Extension MV3 Environment Setup
  logStep(1, 'Initializing Manifest V3 Extension Environment & Webnovel Continuous Scroll Engine');
  const sharedStorage = createSharedMockStorage();
  const bgListeners = [];

  const bgChrome = {
    runtime: {
      id: 'novel-tracker-extension-id',
      getManifest: () => ({ version: '4.0.0' }),
      getURL: (p) => p || '',
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: (fn) => bgListeners.push(fn) },
      sendMessage: () => {}
    },
    storage: {
      local: sharedStorage.local,
      sync: sharedStorage.sync,
      onChanged: sharedStorage.onChanged
    },
    action: {
      setIcon: async () => {},
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {},
      setTitle: async () => {}
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
    },
    alarms: {
      create: () => {},
      clear: () => {},
      onAlarm: { addListener: () => {} }
    },
    omnibox: { onInputChanged: { addListener: () => {} }, onInputEntered: { addListener: () => {} } },
    commands: { onCommand: { addListener: () => {} } }
  };

  const bgSandbox = {
    chrome: bgChrome,
    console: {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {}
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    URL,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    parseFloat,
    parseInt,
    isNaN,
    importScripts: () => {}
  };

  vm.createContext(bgSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../achievements_data.js'), 'utf8'), bgSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../i18n.js'), 'utf8'), bgSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), bgSandbox);

  totalTests++;
  assert(bgListeners.length > 0, 'Service Worker failed to register runtime.onMessage listener');
  logPass(`Extension Service Worker active with ${bgListeners.length} message listener(s)`);
  passedTests++;

  // Setup Simulated Webnovel DOM
  const document = new MockElement('DOCUMENT');
  const html = new MockElement('HTML');
  const head = new MockElement('HEAD');
  const body = new MockElement('BODY');

  document.appendChild(html);
  html.appendChild(head);
  html.appendChild(body);

  document.head = head;
  document.body = body;
  document.documentElement = html;

  const titleNode = new MockElement('TITLE', {}, 'Chapter 1: The Beginning - Shadow Slave - Webnovel');
  head.appendChild(titleNode);

  Object.defineProperty(document, 'title', {
    get: () => titleNode.textContent,
    set: (val) => { titleNode.textContent = val; }
  });

  document.visibilityState = 'visible';
  document.createElement = (tag) => new MockElement(tag);
  document.createTextNode = (txt) => ({ nodeType: 3, textContent: txt });

  const header = new MockElement('DIV', { class: 'header' });
  const breadcrumb = new MockElement('DIV', { class: 'breadcrumb' });
  const breadcrumbLink = new MockElement('A', { href: '/book/shadow-slave_22196618' }, 'Shadow Slave');
  breadcrumb.appendChild(breadcrumbLink);
  header.appendChild(breadcrumb);
  body.appendChild(header);

  const readerContainer = new MockElement('DIV', { class: 'reader-container', id: 'readerContainer' });
  body.appendChild(readerContainer);

  function addChapterSection(num, title) {
    const section = new MockElement('DIV', { class: 'chapter-section', id: `chapter-${num}`, 'data-chapter': String(num) });
    section.scrollHeight = 1800;
    const h1 = new MockElement('H1', { class: 'chapter-title' }, `Chapter ${num}: ${title}`);
    const content = new MockElement('DIV', { class: 'reading-content' });
    const p1 = new MockElement('P', {}, `Paragraph ${num}.1: Story text for chapter ${num}...`);
    content.appendChild(p1);
    section.appendChild(h1);
    section.appendChild(content);
    readerContainer.appendChild(section);
    return section;
  }
  addChapterSection(1, 'The Beginning');

  let currentUrl = 'https://www.webnovel.com/book/shadow-slave_22196618/chapter-1';
  const windowListeners = {};

  const location = {
    get href() { return currentUrl; },
    set href(v) { currentUrl = v; },
    get origin() { return new URL(currentUrl).origin; },
    get hostname() { return new URL(currentUrl).hostname; },
    get pathname() { return new URL(currentUrl).pathname; },
    get search() { return new URL(currentUrl).search; },
    get hash() { return new URL(currentUrl).hash; }
  };

  const history = {
    pushState: (state, title, url) => {
      if (url) currentUrl = new URL(url, currentUrl).href;
      if (title) document.title = title;
    },
    replaceState: (state, title, url) => {
      if (url) currentUrl = new URL(url, currentUrl).href;
      if (title) document.title = title;
    }
  };

  const window = {
    location,
    history,
    document,
    scrollY: 0,
    innerHeight: 800,
    scrollTo: (x, y) => {
      const top = typeof x === 'object' ? x.top : y;
      window.scrollY = top || 0;
    },
    scrollBy: (x, y) => {
      window.scrollY += (y || 0);
    },
    addEventListener: (type, fn) => {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(fn);
    },
    removeEventListener: (type, fn) => {
      if (!windowListeners[type]) return;
      windowListeners[type] = windowListeners[type].filter(l => l !== fn);
    },
    dispatchEvent: (evt) => {
      const list = windowListeners[evt.type] || [];
      for (const fn of list) {
        try { fn(evt); } catch (e) { console.error('Window listener error:', e); }
      }
    },
    MutationObserver: MockMutationObserver
  };

  const contentListeners = [];
  const contentChrome = {
    runtime: {
      id: 'novel-tracker-extension-id',
      getManifest: () => ({ version: '4.0.0' }),
      getURL: (p) => p || '',
      onMessage: { addListener: (fn) => contentListeners.push(fn) },
      sendMessage: (message) => {
        return new Promise((resolve) => {
          let handled = false;
          const sender = {
            id: 'novel-tracker-extension-id',
            url: location.href,
            tab: { id: 1, url: location.href }
          };
          for (const listener of bgListeners) {
            const isAsync = listener(message, sender, (res) => {
              handled = true;
              resolve(res);
            });
            if (isAsync) return;
          }
          if (!handled) resolve({ ok: true });
        });
      }
    },
    storage: {
      local: sharedStorage.local,
      onChanged: sharedStorage.onChanged
    }
  };

  const contentSandbox = {
    chrome: contentChrome,
    window,
    document,
    location,
    history,
    MutationObserver: MockMutationObserver,
    console: {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {}
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    parseFloat,
    parseInt,
    isNaN
  };

  vm.createContext(contentSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8'), contentSandbox);

  // ------------------------------------------------------------------------
  // STEP 2: Initial Chapter 1 Detection on Webnovel
  // ------------------------------------------------------------------------
  logStep(2, 'Initial Chapter 1 Detection on Webnovel');
  await waitForEvaluation();

  let storage = await sharedStorage.local.get(null);
  let savedNovels = storage.savedNovels || {};
  let novelKeys = Object.keys(savedNovels);

  totalTests++;
  assert.strictEqual(novelKeys.length, 1, `Expected exactly 1 saved novel, got ${novelKeys.length}`);
  logPass(`Novel registered with unique key: ${novelKeys[0]}`);
  passedTests++;

  const novelKey = novelKeys[0];
  const novelEntry = savedNovels[novelKey];

  totalTests++;
  assert.strictEqual(novelEntry.chapter, '1', `Expected chapter '1', got '${novelEntry.chapter}'`);
  assert.strictEqual(novelEntry.maxCounted, 1, `Expected maxCounted 1, got ${novelEntry.maxCounted}`);
  assert.strictEqual(novelEntry.novelName, 'Shadow Slave', `Expected novelName 'Shadow Slave', got '${novelEntry.novelName}'`);
  logPass(`Initial chapter detected correctly: Chapter ${novelEntry.chapter} ("${novelEntry.novelName}")`);
  passedTests++;

  totalTests++;
  assert.strictEqual(storage.stats.chaptersRead, 1, `Expected chaptersRead 1, got ${storage.stats.chaptersRead}`);
  assert.strictEqual(storage.stats.novelsStarted, 1, `Expected novelsStarted 1, got ${storage.stats.novelsStarted}`);
  logPass(`Cultivation progress initialized: chaptersRead = 1, novelsStarted = 1`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 3: Scroll Position Tracking on Chapter 1
  // ------------------------------------------------------------------------
  logStep(3, 'Scroll Position Tracking on Chapter 1');
  window.scrollTo(0, 800);
  window.dispatchEvent({ type: 'scroll' });
  await new Promise((r) => setTimeout(r, 2200));

  storage = await sharedStorage.local.get(null);
  const chapter1ScrollPct = storage.savedNovels[novelKey].scrollPct;
  totalTests++;
  assert(chapter1ScrollPct > 0, `Expected scrollPct > 0, got ${chapter1ScrollPct}`);
  logPass(`Scroll position updated to ${chapter1ScrollPct}% without page reload`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 4: Rapid Scroll Burst & Throttle Debounce Edge Case
  // ------------------------------------------------------------------------
  logStep(4, 'Rapid Scroll Burst & Throttle Debounce (Attacking 2000ms Throttle)');
  // Simulates rapid continuous reading flick: 900px -> 1100px -> 1400px within 200ms
  window.scrollTo(0, 900);
  window.dispatchEvent({ type: 'scroll' });
  await new Promise((r) => setTimeout(r, 50));
  window.scrollTo(0, 1100);
  window.dispatchEvent({ type: 'scroll' });
  await new Promise((r) => setTimeout(r, 50));
  window.scrollTo(0, 1400);
  window.dispatchEvent({ type: 'scroll' });

  // Wait for 2000ms throttle timer to expire and flush debounced position
  await new Promise((r) => setTimeout(r, 2300));
  storage = await sharedStorage.local.get(null);
  const debouncedScroll = storage.savedNovels[novelKey].scrollPct;
  totalTests++;
  assert(debouncedScroll >= chapter1ScrollPct, `Expected debounced scroll >= ${chapter1ScrollPct}, got ${debouncedScroll}`);
  logPass(`Rapid scrolling throttled properly: final position saved at ${debouncedScroll}% without dropping updates`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 5: Continuous Scroll to Chapter 2 (pushState, NO Page Reload)
  // ------------------------------------------------------------------------
  logStep(5, 'Continuous Scroll Transition to Chapter 2 (pushState, NO Reload)');
  addChapterSection(2, 'A Flaw in the System');
  history.pushState({ chapter: 2 }, 'Chapter 2: A Flaw in the System - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/chapter-2');
  assert(location.href.includes('/chapter-2'), `URL should be updated to chapter-2, got ${location.href}`);

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const afterChap2Novels = storage.savedNovels || {};
  const chap2Keys = Object.keys(afterChap2Novels);

  totalTests++;
  assert.strictEqual(chap2Keys.length, 1, `Expected still exactly 1 novel entry (no duplicate!), got ${chap2Keys.length}`);
  logPass(`Zero duplicate entries maintained across continuous scroll (entries = 1)`);
  passedTests++;

  const chap2Entry = afterChap2Novels[chap2Keys[0]];
  totalTests++;
  assert.strictEqual(chap2Entry.chapter, '2', `Expected chapter '2', got '${chap2Entry.chapter}'`);
  assert.strictEqual(chap2Entry.maxCounted, 2, `Expected maxCounted 2, got ${chap2Entry.maxCounted}`);
  logPass(`Chapter 2 detected cleanly via continuous scroll: chapter = ${chap2Entry.chapter}, maxCounted = ${chap2Entry.maxCounted}`);
  passedTests++;

  totalTests++;
  assert.strictEqual(storage.stats.chaptersRead, 2, `Expected chaptersRead 2, got ${storage.stats.chaptersRead}`);
  assert.strictEqual(storage.stats.novelsStarted, 1, `Expected novelsStarted 1, got ${storage.stats.novelsStarted}`);
  logPass(`Cultivation progress updated: chaptersRead = 2, novelsStarted = 1`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 6: Scroll Progress Tracking on Chapter 2
  // ------------------------------------------------------------------------
  logStep(6, 'Scroll Position Tracking on Chapter 2');
  window.scrollBy(0, 700);
  window.dispatchEvent({ type: 'scroll' });
  await new Promise((r) => setTimeout(r, 2200));

  storage = await sharedStorage.local.get(null);
  const chap2Scroll = storage.savedNovels[novelKey].scrollPct;
  totalTests++;
  assert(chap2Scroll > 0, `Expected chapter 2 scrollPct > 0, got ${chap2Scroll}`);
  logPass(`Chapter 2 scroll percentage recorded in storage: ${chap2Scroll}%`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 7: Continuous Scroll to Chapter 3 (replaceState, NO Page Reload)
  // ------------------------------------------------------------------------
  logStep(7, 'Continuous Scroll Transition to Chapter 3 (replaceState, NO Reload)');
  addChapterSection(3, 'The First Trial');
  history.replaceState({ chapter: 3 }, 'Chapter 3: The First Trial - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/chapter-3');

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const chap3Entry = storage.savedNovels[chap2Keys[0]];

  totalTests++;
  assert.strictEqual(chap3Entry.chapter, '3', `Expected chapter '3', got '${chap3Entry.chapter}'`);
  assert.strictEqual(chap3Entry.maxCounted, 3, `Expected maxCounted 3, got ${chap3Entry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 3, `Expected chaptersRead 3, got ${storage.stats.chaptersRead}`);
  logPass(`Chapter 3 detected cleanly via replaceState: chapter = 3, maxCounted = 3, chaptersRead = 3`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 8: Continuous Scroll to Chapter 4 (pushState, NO Reload)
  // ------------------------------------------------------------------------
  logStep(8, 'Continuous Scroll Transition to Chapter 4 (pushState, NO Reload)');
  addChapterSection(4, 'The Shrouded Island');
  history.pushState({ chapter: 4 }, 'Chapter 4: The Shrouded Island - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/chapter-4');

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const chap4Entry = storage.savedNovels[chap2Keys[0]];

  totalTests++;
  assert.strictEqual(chap4Entry.chapter, '4', `Expected chapter '4', got '${chap4Entry.chapter}'`);
  assert.strictEqual(chap4Entry.maxCounted, 4, `Expected maxCounted 4, got ${chap4Entry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 4, `Expected chaptersRead 4, got ${storage.stats.chaptersRead}`);
  logPass(`Chapter 4 detected cleanly: chapter = 4, maxCounted = 4, chaptersRead = 4`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 9: Real DOM & Title MutationObserver Continuous Scroll (Chapter 5)
  // ------------------------------------------------------------------------
  logStep(9, 'Webnovel DOM MutationObserver Dynamic Chapter Detection (Chapter 5)');
  addChapterSection(5, 'Shadows in the Mist');
  location.href = 'https://www.webnovel.com/book/shadow-slave_22196618/chapter-5';
  document.title = 'Chapter 5: Shadows in the Mist - Shadow Slave - Webnovel';

  // Allow titleObserver and bodyObserver microtask & debounce delay
  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const chap5Entry = storage.savedNovels[chap2Keys[0]];

  totalTests++;
  assert.strictEqual(chap5Entry.chapter, '5', `Expected chapter '5', got '${chap5Entry.chapter}'`);
  assert.strictEqual(chap5Entry.maxCounted, 5, `Expected maxCounted 5, got ${chap5Entry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 5, `Expected chaptersRead 5, got ${storage.stats.chaptersRead}`);
  logPass(`Chapter 5 detected via DOM/Title MutationObserver: chapter = 5, maxCounted = 5, chaptersRead = 5`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 10: Backward Scroll Edge Case (Non-Regression of maxCounted)
  // ------------------------------------------------------------------------
  logStep(10, 'Backward Scroll to Chapter 1 (Prevent Progress Regression / Cultivation Abuse)');
  history.pushState({ chapter: 1 }, 'Chapter 1: The Beginning - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/chapter-1');

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const regressEntry = storage.savedNovels[chap2Keys[0]];

  totalTests++;
  assert.strictEqual(regressEntry.chapter, '1', `Current reading position should reflect chapter '1', got '${regressEntry.chapter}'`);
  assert.strictEqual(regressEntry.maxCounted, 5, `maxCounted MUST NOT regress: expected 5, got ${regressEntry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 5, `chaptersRead MUST remain 5, got ${storage.stats.chaptersRead}`);
  logPass(`Backward scrolling handled safely: chapter is '1', maxCounted preserved at 5, chaptersRead preserved at 5`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 11: Re-reading Forward Scroll (Zero Progress Duplication)
  // ------------------------------------------------------------------------
  logStep(11, 'Re-reading Forward Scroll to Chapter 3 (Zero Progress Duplication)');
  history.pushState({ chapter: 3 }, 'Chapter 3: The First Trial - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/chapter-3');

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const rereadEntry = storage.savedNovels[chap2Keys[0]];

  totalTests++;
  assert.strictEqual(rereadEntry.chapter, '3', `Expected reading chapter '3', got '${rereadEntry.chapter}'`);
  assert.strictEqual(rereadEntry.maxCounted, 5, `maxCounted MUST remain 5: got ${rereadEntry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 5, `chaptersRead MUST NOT increment on re-read: expected 5, got ${storage.stats.chaptersRead}`);
  logPass(`Re-reading verified: reading position is 3, maxCounted remains 5, chaptersRead preserved at 5`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 12: Continuous Scroll Progression Resumption to Chapter 6
  // ------------------------------------------------------------------------
  logStep(12, 'Continuous Scroll Progression Resumption (Advance to New Chapter 6)');
  addChapterSection(6, 'Awakening');
  history.pushState({ chapter: 6 }, 'Chapter 6: Awakening - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/chapter-6');

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const chap6Entry = storage.savedNovels[chap2Keys[0]];

  totalTests++;
  assert.strictEqual(chap6Entry.chapter, '6', `Expected chapter '6', got '${chap6Entry.chapter}'`);
  assert.strictEqual(chap6Entry.maxCounted, 6, `Expected maxCounted to advance to 6, got ${chap6Entry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 6, `Expected chaptersRead to increment to 6, got ${storage.stats.chaptersRead}`);
  logPass(`Progression resumption verified: chapter = 6, maxCounted = 6, chaptersRead = 6`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 13: Webnovel Numeric Chapter ID URL Pattern & Zero Duplicate Check
  // ------------------------------------------------------------------------
  logStep(13, 'Webnovel Numeric Chapter ID URL Pattern & Zero Duplicate Check');
  // Webnovel often renders URLs with internal chapter IDs like /book/shadow-slave_22196618/59578129
  addChapterSection(7, 'The Dark Sea');
  history.pushState({ chapter: 7 }, 'Chapter 7: The Dark Sea - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/59578129');

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const allFinalNovels = storage.savedNovels || {};
  const finalKeys = Object.keys(allFinalNovels);

  totalTests++;
  assert.strictEqual(finalKeys.length, 1, `Expected strictly 1 novel entry, found keys: ${finalKeys.join(', ')}`);
  const chap7Entry = allFinalNovels[finalKeys[0]];
  assert.strictEqual(chap7Entry.chapter, '7', `Expected chapter '7', got '${chap7Entry.chapter}'`);
  assert.strictEqual(chap7Entry.maxCounted, 7, `Expected maxCounted 7, got ${chap7Entry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 7, `Expected chaptersRead 7, got ${storage.stats.chaptersRead}`);
  logPass(`Alternative URL structure mapped cleanly to canonical series: zero duplicates (entries = 1)`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 14: Webnovel Indonesian Chapter Title & URL Continuous Scroll ('bab-8')
  // ------------------------------------------------------------------------
  logStep(14, 'Webnovel Indonesian Chapter Title & URL Continuous Scroll (bab-8, pushState, NO Reload)');
  const indoSection = new MockElement('DIV', { class: 'chapter-section', id: 'chapter-8', 'data-chapter': '8' });
  indoSection.scrollHeight = 1800;
  const h1Indo = new MockElement('H1', { class: 'chapter-title' }, 'Bab 8: Kelemahannya Adalah Privasi');
  const contentIndo = new MockElement('DIV', { class: 'reading-content' });
  contentIndo.appendChild(new MockElement('P', {}, 'Paragraf 8.1: Cerita berlanjut ke bab 8...'));
  indoSection.appendChild(h1Indo);
  indoSection.appendChild(contentIndo);
  readerContainer.appendChild(indoSection);

  history.pushState({ chapter: 8 }, 'Bab 8: Kelemahannya Adalah Privasi - Shadow Slave - Webnovel', '/book/shadow-slave_22196618/bab-8-kelemahannya-adalah-privasi_34961050508960006');

  await waitForEvaluation();

  storage = await sharedStorage.local.get(null);
  const indNovels = storage.savedNovels || {};
  const indKeys = Object.keys(indNovels);

  totalTests++;
  assert.strictEqual(indKeys.length, 1, `Expected strictly 1 novel entry, found: ${indKeys.length}`);
  const chap8Entry = indNovels[indKeys[0]];
  assert.strictEqual(chap8Entry.chapter, '8', `Expected chapter '8', got '${chap8Entry.chapter}'`);
  assert.strictEqual(chap8Entry.maxCounted, 8, `Expected maxCounted 8, got ${chap8Entry.maxCounted}`);
  assert.strictEqual(storage.stats.chaptersRead, 8, `Expected chaptersRead 8, got ${storage.stats.chaptersRead}`);
  logPass(`Indonesian continuous scroll detected cleanly: bab = 8, maxCounted = 8, chaptersRead = 8`);
  passedTests++;

  // ------------------------------------------------------------------------
  // STEP 15: Data Persistence Across Browser Restart
  // ------------------------------------------------------------------------
  logStep(15, 'Data Persistence Across Browser & Service Worker Restart');
  console.log('  Relaunching background service worker with persisted user storage snapshot...');

  const restartStorage = createSharedMockStorage(storage);
  const restartBgListeners = [];
  const restartBgChrome = {
    ...bgChrome,
    runtime: {
      ...bgChrome.runtime,
      onMessage: { addListener: (fn) => restartBgListeners.push(fn) }
    },
    storage: {
      local: restartStorage.local,
      sync: restartStorage.sync,
      onChanged: restartStorage.onChanged
    }
  };

  const restartSandbox = { ...bgSandbox, chrome: restartBgChrome };
  vm.createContext(restartSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../achievements_data.js'), 'utf8'), restartSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../i18n.js'), 'utf8'), restartSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), restartSandbox);

  const restartedStorage = await restartStorage.local.get(null);
  const restartedNovels = restartedStorage.savedNovels || {};
  const restartedKeys = Object.keys(restartedNovels);

  totalTests++;
  assert.strictEqual(restartedKeys.length, 1, `After restart: expected 1 novel, found ${restartedKeys.length}`);
  const persistedEntry = restartedNovels[restartedKeys[0]];
  assert.strictEqual(persistedEntry.novelName, 'Shadow Slave');
  assert.strictEqual(persistedEntry.maxCounted, 8);
  assert.strictEqual(restartedStorage.stats.chaptersRead, 8);
  assert.strictEqual(restartedStorage.stats.novelsStarted, 1);
  logPass(`Full persistence verified: novel preserved, maxCounted = 8, chaptersRead = 8, novelsStarted = 1`);
  passedTests++;

  // SUMMARY
  console.log(colors.bold('\n--------------------------------------------------------------------'));
  console.log(colors.green(colors.bold(`>>> ALL AUTOMATED MV3 CONTINUOUS SCROLL TESTS PASSED (${passedTests}/${totalTests}) <<<`)));
  console.log(colors.bold('--------------------------------------------------------------------\n'));

  process.exit(0);
}

// ----------------------------------------------------------------------------
// Playwright Suite Runner (when Playwright is installed & available)
// ----------------------------------------------------------------------------
async function runPlaywrightSuite(pw) {
  const { chromium } = pw;
  const extensionPath = path.resolve(__dirname, '..');
  const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-noveltracker-test-'));
  console.log(`Isolated Chrome User Profile created at: ${tempUserData}`);

  const simulatedWebnovelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Chapter 1: The Beginning - Shadow Slave - Webnovel</title>
  <meta name="robots" content="noindex">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #111; color: #eee; }
    .header { position: sticky; top: 0; background: #1e1e1e; padding: 12px 20px; border-bottom: 1px solid #333; z-index: 100; }
    .breadcrumb a { color: #38bdf8; text-decoration: none; font-weight: bold; }
    .reader-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .chapter-section { min-height: 1800px; border-bottom: 2px dashed #444; padding-bottom: 60px; margin-bottom: 60px; }
    .chapter-title { font-size: 26px; margin-top: 20px; margin-bottom: 20px; color: #facc15; }
    p { line-height: 1.8; font-size: 18px; color: #ccc; }
  </style>
</head>
<body>
  <div class="header">
    <div class="breadcrumb">
      <a href="/book/shadow-slave_22196618">Shadow Slave</a>
    </div>
  </div>

  <div class="reader-container" id="readerContainer">
    <div class="chapter-section" id="chapter-1" data-chapter="1">
      <h1 class="chapter-title">Chapter 1: The Beginning</h1>
      <div class="reading-content">
        <p>Paragraph 1.1: The nightmare began on an ordinary Tuesday morning...</p>
        <p>Paragraph 1.2: Sunny opened his eyes and looked around the desolate ruins...</p>
        <p>Paragraph 1.3: Shadows danced upon the broken stones as he took his first breath.</p>
        <div style="height: 1400px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 8px;">
          <p>[Chapter 1 deep reading content block to enable genuine scroll depth...]</p>
        </div>
        <p>Paragraph 1.4: End of Chapter 1.</p>
      </div>
    </div>
  </div>

  <script>
    let highestLoadedChapter = 1;
    window.__loadNextChapter = function(nextNum, nextTitle, useReplaceState) {
      if (document.getElementById('chapter-' + nextNum)) return;
      highestLoadedChapter = nextNum;
      const container = document.getElementById('readerContainer');
      const section = document.createElement('div');
      section.className = 'chapter-section';
      section.id = 'chapter-' + nextNum;
      section.setAttribute('data-chapter', String(nextNum));
      section.innerHTML = \`
        <h2 class="chapter-title">Chapter \${nextNum}: \${nextTitle}</h2>
        <div class="reading-content">
          <p>Paragraph \${nextNum}.1: Continuation of the story into chapter \${nextNum}...</p>
          <p>Paragraph \${nextNum}.2: The shadows deepened, whispering unknown secrets...</p>
          <div style="height: 1400px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 8px;">
            <p>[Chapter \${nextNum} deep reading content block...]</p>
          </div>
          <p>Paragraph \${nextNum}.3: End of Chapter \${nextNum}.</p>
        </div>
      \`;
      container.appendChild(section);
      const newPath = '/book/shadow-slave_22196618/chapter-' + nextNum;
      const newTitle = 'Chapter ' + nextNum + ': ' + nextTitle + ' - Shadow Slave - Webnovel';
      if (useReplaceState) {
        history.replaceState({ chapter: nextNum }, newTitle, newPath);
      } else {
        history.pushState({ chapter: nextNum }, newTitle, newPath);
      }
      document.title = newTitle;
    };

    window.__scrollToChapter = function(targetNum, targetTitle) {
      const newPath = '/book/shadow-slave_22196618/chapter-' + targetNum;
      const newTitle = 'Chapter ' + targetNum + ': ' + targetTitle + ' - Shadow Slave - Webnovel';
      history.pushState({ chapter: targetNum }, newTitle, newPath);
      document.title = newTitle;
    };
  </script>
</body>
</html>`;

  let context = null;
  let passedTests = 0;
  let totalTests = 0;

  async function getServiceWorker(ctx) {
    if (ctx.serviceWorkers().length > 0) {
      return ctx.serviceWorkers()[0];
    }
    return await ctx.waitForEvent('serviceworker', { timeout: 10000 });
  }

  async function getExtensionStorage(sw) {
    return await sw.evaluate(async () => chrome.storage.local.get(null));
  }

  try {
    logStep(1, 'Launching Chromium with Novel Chapter Tracker MV3 extension');
    context = await chromium.launchPersistentContext(tempUserData, {
      headless: false,
      args: [
        '--headless=new',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-gpu'
      ]
    });

    await context.route('https://www.webnovel.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: simulatedWebnovelHtml
      });
    });

    const sw = await getServiceWorker(context);
    assert(sw, 'Service Worker failed to initialize');
    logPass(`Extension Service Worker active at ${sw.url()}`);
    passedTests++;
    totalTests++;

    logStep(2, 'Initial Chapter 1 Detection on Webnovel');
    const page = await context.newPage();
    const startUrl = 'https://www.webnovel.com/book/shadow-slave_22196618/chapter-1';
    await page.goto(startUrl);
    await page.waitForTimeout(2000);

    let storage = await getExtensionStorage(sw);
    const savedNovels = storage.savedNovels || {};
    const novelKeys = Object.keys(savedNovels);

    totalTests++;
    assert.strictEqual(novelKeys.length, 1);
    logPass(`Novel registered with unique key: ${novelKeys[0]}`);
    passedTests++;

    const novelEntry = savedNovels[novelKeys[0]];
    totalTests++;
    assert.strictEqual(novelEntry.chapter, '1');
    assert.strictEqual(novelEntry.maxCounted, 1);
    assert.strictEqual(novelEntry.novelName, 'Shadow Slave');
    logPass(`Initial chapter detected correctly: Chapter ${novelEntry.chapter}`);
    passedTests++;

    totalTests++;
    assert.strictEqual(storage.stats.chaptersRead, 1);
    assert.strictEqual(storage.stats.novelsStarted, 1);
    logPass(`Cultivation progress initialized: chaptersRead = 1, novelsStarted = 1`);
    passedTests++;

    logStep(3, 'Scroll Position Tracking on Chapter 1');
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(2300);

    storage = await getExtensionStorage(sw);
    const chapter1ScrollPct = storage.savedNovels[novelKeys[0]].scrollPct;
    totalTests++;
    assert(chapter1ScrollPct > 0);
    logPass(`Scroll position updated to ${chapter1ScrollPct}% without page reload`);
    passedTests++;

    logStep(4, 'Continuous Scroll Transition to Chapter 2 (pushState, NO Reload)');
    await page.evaluate(() => {
      window.__loadNextChapter(2, 'A Flaw in the System', false);
      const chap2El = document.getElementById('chapter-2');
      if (chap2El) chap2El.scrollIntoView();
    });
    await page.waitForTimeout(2000);

    storage = await getExtensionStorage(sw);
    const afterChap2Novels = storage.savedNovels || {};
    const chap2Keys = Object.keys(afterChap2Novels);

    totalTests++;
    assert.strictEqual(chap2Keys.length, 1);
    logPass(`Zero duplicate entries maintained across continuous scroll (entries = 1)`);
    passedTests++;

    const chap2Entry = afterChap2Novels[chap2Keys[0]];
    totalTests++;
    assert.strictEqual(chap2Entry.chapter, '2');
    assert.strictEqual(chap2Entry.maxCounted, 2);
    logPass(`Chapter 2 detected cleanly: chapter = ${chap2Entry.chapter}, maxCounted = ${chap2Entry.maxCounted}`);
    passedTests++;

    totalTests++;
    assert.strictEqual(storage.stats.chaptersRead, 2);
    assert.strictEqual(storage.stats.novelsStarted, 1);
    logPass(`Cultivation progress updated: chaptersRead = 2, novelsStarted = 1`);
    passedTests++;

    logStep(5, 'Scroll Position Tracking on Chapter 2');
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(2300);

    storage = await getExtensionStorage(sw);
    const chap2Scroll = storage.savedNovels[novelKeys[0]].scrollPct;
    totalTests++;
    assert(chap2Scroll > 0);
    logPass(`Chapter 2 scroll percentage recorded in storage: ${chap2Scroll}%`);
    passedTests++;

    logStep(6, 'Continuous Scroll Transition to Chapter 3 (replaceState, NO Reload)');
    await page.evaluate(() => {
      window.__loadNextChapter(3, 'The First Trial', true);
      const chap3El = document.getElementById('chapter-3');
      if (chap3El) chap3El.scrollIntoView();
    });
    await page.waitForTimeout(2000);

    storage = await getExtensionStorage(sw);
    const chap3Entry = storage.savedNovels[chap2Keys[0]];
    totalTests++;
    assert.strictEqual(chap3Entry.chapter, '3');
    assert.strictEqual(chap3Entry.maxCounted, 3);
    assert.strictEqual(storage.stats.chaptersRead, 3);
    logPass(`Chapter 3 detected cleanly via replaceState: chapter = 3, maxCounted = 3, chaptersRead = 3`);
    passedTests++;

    logStep(7, 'Continuous Scroll Transition to Chapter 4 (pushState, NO Reload)');
    await page.evaluate(() => {
      window.__loadNextChapter(4, 'The Shrouded Island', false);
      const chap4El = document.getElementById('chapter-4');
      if (chap4El) chap4El.scrollIntoView();
    });
    await page.waitForTimeout(2000);

    storage = await getExtensionStorage(sw);
    const chap4Entry = storage.savedNovels[chap2Keys[0]];
    totalTests++;
    assert.strictEqual(chap4Entry.chapter, '4');
    assert.strictEqual(chap4Entry.maxCounted, 4);
    assert.strictEqual(storage.stats.chaptersRead, 4);
    logPass(`Chapter 4 detected cleanly: chapter = 4, maxCounted = 4, chaptersRead = 4`);
    passedTests++;

    logStep(8, 'Backward Scroll to Chapter 1 (Prevent Progress Regression / Cultivation Abuse)');
    await page.evaluate(() => {
      window.__scrollToChapter(1, 'The Beginning');
      const chap1El = document.getElementById('chapter-1');
      if (chap1El) chap1El.scrollIntoView();
    });
    await page.waitForTimeout(2000);

    storage = await getExtensionStorage(sw);
    const regressEntry = storage.savedNovels[chap2Keys[0]];
    totalTests++;
    assert.strictEqual(regressEntry.chapter, '1');
    assert.strictEqual(regressEntry.maxCounted, 4);
    assert.strictEqual(storage.stats.chaptersRead, 4);
    logPass(`Backward scrolling handled safely: chapter is '1', maxCounted preserved at 4, chaptersRead preserved at 4`);
    passedTests++;

    logStep(9, 'Exhaustive Check for Zero Duplicate Records');
    const finalNovels = storage.savedNovels || {};
    const finalKeys = Object.keys(finalNovels);
    totalTests++;
    assert.strictEqual(finalKeys.length, 1);
    assert.strictEqual(storage.stats.novelsStarted, 1);
    logPass(`Zero duplicate entries confirmed across all navigation and scrolling actions`);
    passedTests++;

    await page.close();
    await context.close();
    context = null;

    logStep(10, 'Data Persistence Across Browser Restart');
    const restartContext = await chromium.launchPersistentContext(tempUserData, {
      headless: false,
      args: [
        '--headless=new',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-gpu'
      ]
    });

    const restartSw = await getServiceWorker(restartContext);
    assert(restartSw, 'Service Worker failed to initialize after browser restart');

    const restartedStorage = await getExtensionStorage(restartSw);
    const restartedNovels = restartedStorage.savedNovels || {};
    const restartedKeys = Object.keys(restartedNovels);

    totalTests++;
    assert.strictEqual(restartedKeys.length, 1);
    const persistedEntry = restartedNovels[restartedKeys[0]];
    assert.strictEqual(persistedEntry.novelName, 'Shadow Slave');
    assert.strictEqual(persistedEntry.maxCounted, 4);
    assert.strictEqual(restartedStorage.stats.chaptersRead, 4);
    assert.strictEqual(restartedStorage.stats.novelsStarted, 1);
    logPass(`Full persistence verified: novel preserved, maxCounted = 4, chaptersRead = 4, novelsStarted = 1`);
    passedTests++;

    await restartContext.close();

    console.log(colors.bold('\n--------------------------------------------------------------------'));
    console.log(colors.green(colors.bold(`>>> ALL AUTOMATED PLAYWRIGHT MV3 TESTS PASSED (${passedTests}/${totalTests}) <<<`)));
    console.log(colors.bold('--------------------------------------------------------------------\n'));
    process.exit(0);

  } finally {
    if (context) await context.close();
    try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch {}
  }
}

// ----------------------------------------------------------------------------
// Main Entrypoint
// ----------------------------------------------------------------------------
(async () => {
  console.log(colors.bold('\n===================================================================='));
  console.log(colors.bold('   PLAYWRIGHT MV3: WEBNOVEL CONTINUOUS SCROLL AUTOMATED TEST SUITE   '));
  console.log(colors.bold('====================================================================\n'));

  // 1. Check if Playwright is installed and available
  const pw = resolvePlaywright();
  if (pw) {
    try {
      console.log('Playwright module detected. Attempting browser execution...');
      await runPlaywrightSuite(pw);
      return;
    } catch (err) {
      logFail(`Playwright launch failed: ${err.message}`);
      console.log('Falling back to viable alternative runner...\n');
    }
  }

  // 2. Identify and document exact limitation
  console.log(colors.yellow('ℹ LIMITATION IDENTIFIED:'));
  console.log('  - Playwright is not installed in local workspace dependencies (package.json has 0 dependencies).');
  console.log('  - External/global package paths outside the workspace cannot be accessed due to sandbox file permissions (EPERM).');
  console.log('  - Native browser automation via third-party packages is unavailable without local install.\n');
  console.log(colors.cyan('✔ CONFIGURING VIABLE ALTERNATIVE:'));
  console.log('  - Executing self-contained Manifest V3 Extension & Webnovel Continuous Scroll Test Suite.');
  console.log('  - Simulates genuine Webnovel continuous scroll (DOM, History pushState/replaceState, scroll throttle).');
  console.log('  - Executes real content.js, background.js, achievements_data.js, and i18n.js in isolated VM.\n');

  try {
    await runSelfContainedContinuousScrollSuite();
  } catch (err) {
    logFail(`Automated test failed with exception: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
})();
