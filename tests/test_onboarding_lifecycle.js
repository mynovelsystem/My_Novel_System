// ============================================================================
// TEST SUITE: ONBOARDING LIFECYCLE & WELCOME EXPERIENCE
// Verifies background onInstalled hook, welcome.html UI/CSP, i18n & packaging
// ============================================================================

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");
const os = require("os");
let chromium;
try {
  chromium = require("playwright").chromium;
} catch {}

console.log("=== ONBOARDING LIFECYCLE & WELCOME PAGE TEST SUITE ===\n");

const rootDir = path.resolve(__dirname, "..");
const backgroundSrc = fs.readFileSync(path.join(rootDir, "background.js"), "utf8");
const welcomeHtmlSrc = fs.readFileSync(path.join(rootDir, "welcome.html"), "utf8");
const welcomeJsSrc = fs.readFileSync(path.join(rootDir, "welcome.js"), "utf8");
const esLocale = JSON.parse(fs.readFileSync(path.join(rootDir, "locales/es.json"), "utf8"));
const enLocale = JSON.parse(fs.readFileSync(path.join(rootDir, "locales/en.json"), "utf8"));
const popupHtmlSrc = fs.readFileSync(path.join(rootDir, "popup.html"), "utf8");
const popupJsSrc = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");

(async () => {
// ----------------------------------------------------------------------------
// Test 1: Background onInstalled Lifecycle Hook
// ----------------------------------------------------------------------------
console.log("[Test 1] Background onInstalled Lifecycle Hook:");
{
  let installedListeners = [];
  let createdTabs = [];
  let alarmsCreated = [];

  const mockChrome = {
    runtime: {
      onInstalled: {
        addListener: (fn) => installedListeners.push(fn)
      },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: () => {} },
      getURL: (p) => `chrome-extension://mock-id/${p}`,
      getManifest: () => ({ version: "4.0.0" })
    },
    alarms: {
      create: (name, info) => alarmsCreated.push({ name, info }),
      clear: () => {},
      onAlarm: { addListener: () => {} }
    },
    commands: {
      onCommand: { addListener: () => {} }
    },
    omnibox: {
      onInputChanged: { addListener: () => {} },
      onInputEntered: { addListener: () => {} }
    },
    tabs: {
      create: (opts) => {
        createdTabs.push(opts);
        return Promise.resolve({ id: 101, ...opts });
      },
      query: async () => [],
      get: async (id) => ({ id }),
      update: async () => ({ id: 1 }),
      sendMessage: async () => {},
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onActivated: { addListener: () => {} }
    },
    action: {
      setIcon: () => Promise.resolve(),
      setBadgeText: () => Promise.resolve(),
      setBadgeBackgroundColor: () => Promise.resolve(),
      setTitle: () => Promise.resolve()
    },
    storage: {
      onChanged: { addListener: () => {} },
      local: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {}
      },
      sync: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {}
      }
    }
  };

  const sandbox = {
    chrome: mockChrome,
    importScripts: (...files) => {
      for (const f of files) {
        try {
          const p = path.resolve(rootDir, f);
          if (fs.existsSync(p)) {
            vm.runInContext(fs.readFileSync(p, "utf8"), sandbox);
          }
        } catch {}
      }
    },
    t: (k) => k,
    initI18n: () => Promise.resolve(),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    URL: global.URL,
    Date: global.Date,
    Math: global.Math,
    String: global.String,
    Number: global.Number,
    Boolean: global.Boolean,
    Array: global.Array,
    Object: global.Object,
    Set: global.Set,
    Map: global.Map,
    Promise: global.Promise
  };

  vm.createContext(sandbox);
  vm.runInContext(backgroundSrc, sandbox);

  assert.ok(installedListeners.length >= 1, "At least one onInstalled listener registered in background.js");
  const onInstalledHandler = installedListeners[0];
  assert.strictEqual(typeof onInstalledHandler, "function", "onInstalledHandler is a function");

  // Case A: Fresh Installation (reason: "install") -> MUST open welcome.html
  createdTabs = [];
  onInstalledHandler({ reason: "install" });
  assert.strictEqual(createdTabs.length, 1, "Exactly one tab created on install");
  assert.strictEqual(
    createdTabs[0].url,
    "chrome-extension://mock-id/welcome.html",
    "Created tab URL matches chrome-extension://mock-id/welcome.html"
  );
  console.log("  [PASS] Fresh install (reason: 'install') triggers welcome.html tab creation.");

  // Case B: Extension Update (reason: "update") -> MUST NOT open welcome.html
  createdTabs = [];
  onInstalledHandler({ reason: "update", previousVersion: "3.9.0" });
  assert.strictEqual(createdTabs.length, 0, "Zero tabs created on update");
  console.log("  [PASS] Extension update (reason: 'update') does NOT open welcome.html.");

  // Case C: Chrome Browser Update (reason: "chrome_update") -> MUST NOT open welcome.html
  createdTabs = [];
  onInstalledHandler({ reason: "chrome_update" });
  assert.strictEqual(createdTabs.length, 0, "Zero tabs created on chrome_update");
  console.log("  [PASS] Browser update (reason: 'chrome_update') does NOT open welcome.html.");

  // Case D: Undefined details -> MUST NOT throw and zero tabs created
  createdTabs = [];
  assert.doesNotThrow(() => onInstalledHandler(undefined), "Undefined details does not throw");
  assert.strictEqual(createdTabs.length, 0, "Zero tabs created when details is undefined");
  console.log("  [PASS] Undefined details handled safely without error or unexpected tab.");

  // Case E: tabs.create error resilience
  mockChrome.tabs.create = () => {
    throw new Error("Simulated browser error");
  };
  assert.doesNotThrow(() => onInstalledHandler({ reason: "install" }), "tabs.create failure handled gracefully");
  console.log("  [PASS] Error resilience: tabs.create exceptions caught safely.");
}

// ----------------------------------------------------------------------------
// Test 2: welcome.html Static Structure & Strict CSP Compliance
// ----------------------------------------------------------------------------
console.log("\n[Test 2] welcome.html Static Structure & Strict CSP Compliance:");
{
  assert.ok(welcomeHtmlSrc.length > 500, "welcome.html is non-empty");
  assert.ok(welcomeHtmlSrc.includes("<!DOCTYPE html>"), "welcome.html has standard HTML5 DOCTYPE");
  assert.ok(welcomeHtmlSrc.includes('<html lang="es">'), "welcome.html specifies lang attribute");
  assert.ok(welcomeHtmlSrc.includes('<meta charset="UTF-8">'), "welcome.html specifies UTF-8 charset");
  assert.ok(welcomeHtmlSrc.includes('<meta name="viewport"'), "welcome.html specifies responsive viewport");

  // Strict CSP: Zero inline event handlers (onclick, onload, onerror, etc.)
  const inlineEventMatches = welcomeHtmlSrc.match(/\bon[a-z]+\s*=/gi) || [];
  assert.strictEqual(
    inlineEventMatches.length,
    0,
    `Inline event handlers forbidden in welcome.html, found: ${inlineEventMatches.join(", ")}`
  );
  console.log("  [PASS] Strict CSP: Zero inline event handlers found in welcome.html.");

  // Strict CSP: No external CDN links (http://, https://, cdnjs, fonts.googleapis.com)
  const externalMatches = welcomeHtmlSrc.match(/(?:href|src)\s*=\s*["']https?:\/\/[^"']+/gi) || [];
  assert.strictEqual(
    externalMatches.length,
    0,
    `External CDN links forbidden in welcome.html, found: ${externalMatches.join(", ")}`
  );
  console.log("  [PASS] Strict CSP: Zero external CDN resources found in welcome.html.");

  // Local assets exist
  assert.ok(welcomeHtmlSrc.includes("assets/icon48.png"), "welcome.html references local icon48.png");
  assert.ok(fs.existsSync(path.join(rootDir, "assets/icon48.png")), "assets/icon48.png exists on disk");
  assert.ok(welcomeHtmlSrc.includes("assets/icon32.png"), "welcome.html references local icon32.png");
  assert.ok(fs.existsSync(path.join(rootDir, "assets/icon32.png")), "assets/icon32.png exists on disk");

  // Script tags in order: i18n.js followed by welcome.js
  const scriptI18nIdx = welcomeHtmlSrc.indexOf('<script src="i18n.js"></script>');
  const scriptWelcomeIdx = welcomeHtmlSrc.indexOf('<script src="welcome.js"></script>');
  assert.ok(scriptI18nIdx !== -1, "welcome.html loads i18n.js");
  assert.ok(scriptWelcomeIdx !== -1, "welcome.html loads welcome.js");
  assert.ok(scriptI18nIdx < scriptWelcomeIdx, "i18n.js must be loaded before welcome.js");
  console.log("  [PASS] Scripts loaded properly in order (i18n.js -> welcome.js).");

  // Content requirements check:
  // 1. What is MyNovelSystem (reading tracker, webnovels, manga, cultivation)
  assert.ok(welcomeHtmlSrc.includes("welcome_what_title"), "welcome.html contains What is MyNovelSystem title");
  assert.ok(welcomeHtmlSrc.includes("welcome_what_p1"), "welcome.html contains What is MyNovelSystem description");

  // 2. How it works (detection, library, cultivation, achievements)
  assert.ok(welcomeHtmlSrc.includes("welcome_how_title"), "welcome.html contains How It Works section");
  assert.ok(welcomeHtmlSrc.includes("welcome_card1_title"), "welcome.html explains chapter & scroll detection");
  assert.ok(welcomeHtmlSrc.includes("welcome_card2_title"), "welcome.html explains library management");
  assert.ok(welcomeHtmlSrc.includes("welcome_card3_title"), "welcome.html explains cultivation & Qi system");
  assert.ok(welcomeHtmlSrc.includes("welcome_card4_title"), "welcome.html explains achievements & avatars");

  // 3. How to use it (pin extension, shortcut Alt+Shift+N, simply read, and manage settings)
  assert.ok(welcomeHtmlSrc.includes("welcome_guide_title"), "welcome.html contains 4-step usage guide");
  assert.ok(welcomeHtmlSrc.includes("welcome_step1_title"), "welcome.html explains pinning extension to toolbar");
  assert.ok(welcomeHtmlSrc.includes("welcome_step2_title"), "welcome.html explains Alt+Shift+N shortcut");
  assert.ok(welcomeHtmlSrc.includes("welcome_step3_title"), "welcome.html explains reading flow");
  assert.ok(welcomeHtmlSrc.includes("welcome_step4_title"), "welcome.html explains managing settings");

  // Mockup & UI localizations
  assert.ok(welcomeHtmlSrc.includes("welcome_mock_chapter"), "welcome.html localizes preview chapter number");
  assert.ok(welcomeHtmlSrc.includes("welcome_mock_progress"), "welcome.html localizes preview progress percentage");
  assert.ok(welcomeHtmlSrc.includes("welcome_mock_realm"), "welcome.html localizes preview realm indicator");
  assert.ok(welcomeHtmlSrc.includes("welcome_nav_privacy"), "welcome.html localizes navbar privacy link");
  assert.ok(welcomeHtmlSrc.includes("welcome_shortcut_copy_title"), "welcome.html localizes shortcut copy tooltip");

  // 4. Privacy & local-first (100% offline, zero ads/selling, optional Firebase)
  assert.ok(welcomeHtmlSrc.includes("welcome_privacy_title"), "welcome.html contains privacy section");
  assert.ok(welcomeHtmlSrc.includes("welcome_privacy_item1_title"), "welcome.html highlights 100% offline default");
  assert.ok(welcomeHtmlSrc.includes("welcome_privacy_item2_title"), "welcome.html highlights zero ads/tracking");
  assert.ok(welcomeHtmlSrc.includes("welcome_privacy_item3_title"), "welcome.html highlights optional Firebase sync");

  // 5. Local Serverless Account Transfer section (export, transfer, import, contrast & tips)
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_title"), "welcome.html contains Local Transfer title");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_subtitle"), "welcome.html contains Local Transfer subtitle");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step1_badge"), "welcome.html contains Step 1 Export badge");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step1_title"), "welcome.html explains JSON export from Settings -> Backup");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step1_desc"), "welcome.html explains JSON export description");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step2_badge"), "welcome.html contains Step 2 Transfer badge");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step2_title"), "welcome.html explains moving file via USB, email, cloud drive, or messaging");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step2_desc"), "welcome.html explains moving file description");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step3_badge"), "welcome.html contains Step 3 Import badge");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step3_title"), "welcome.html explains importing JSON on new device");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_step3_desc"), "welcome.html explains importing JSON description");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_contrast_title"), "welcome.html contains contrast between local and cloud sync");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_contrast_local_title"), "welcome.html highlights 100% offline private transfer");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_contrast_local_desc"), "welcome.html describes local transfer privacy benefits");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_contrast_cloud_title"), "welcome.html highlights optional Firebase cloud sync");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_contrast_cloud_desc"), "welcome.html describes cloud sync benefits");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_tip"), "welcome.html contains backup pro tip");
  assert.ok(welcomeHtmlSrc.includes("welcome_badge_transfer"), "welcome.html includes transfer nav pill in hero");
  assert.ok(welcomeHtmlSrc.includes("welcome_transfer_pill_title"), "welcome.html includes tooltip translation for transfer nav pill");
  assert.ok(welcomeHtmlSrc.includes("scroll-margin-top"), "welcome.html defines scroll-margin-top for smooth navigation under sticky navbar");
  assert.ok(!esLocale.welcome_transfer_contrast_local_title.startsWith("🛡️"), "welcome_transfer_contrast_local_title does not duplicate emoji");
  assert.ok(!esLocale.welcome_transfer_contrast_cloud_title.startsWith("☁️"), "welcome_transfer_contrast_cloud_title does not duplicate emoji");
  assert.ok(!esLocale.welcome_transfer_tip.startsWith("💡"), "welcome_transfer_tip does not duplicate emoji");

  console.log("  [PASS] All essential sections, transfer guides, styling, and emoji parity verified in HTML.");
}

// ----------------------------------------------------------------------------
// Test 3: welcome.js Script Security & Runtime Logic Execution
// ----------------------------------------------------------------------------
console.log("\n[Test 3] welcome.js Script Security & Runtime Logic Execution:");
{
  assert.ok(welcomeJsSrc.length > 200, "welcome.js is non-empty");

  // Security checks: zero eval, zero Function
  assert.strictEqual(/\beval\s*\(/.test(welcomeJsSrc), false, "Zero eval() in welcome.js");
  assert.strictEqual(/new\s+Function\s*\(/.test(welcomeJsSrc), false, "Zero new Function() in welcome.js");
  console.log("  [PASS] Zero dangerous APIs (eval, new Function) in welcome.js.");

  // Functional logic checks
  assert.ok(welcomeJsSrc.includes("addEventListener"), "Uses addEventListener for event dispatching");
  assert.ok(welcomeJsSrc.includes("btnLangEs"), "Handles Spanish toggle button");
  assert.ok(welcomeJsSrc.includes("btnLangEn"), "Handles English toggle button");
  assert.ok(welcomeJsSrc.includes("switchLanguage"), "Implements switchLanguage routine");
  assert.ok(welcomeJsSrc.includes("shortcutCopyPill"), "Handles shortcut copy interaction");
  assert.ok(welcomeJsSrc.includes("btnStartReading"), "Handles Start Reading CTA interaction");

  // Runtime DOM Execution test in VM sandbox to ensure TDZ safety (no ReferenceError on startup)
  const listenersMap = {};
  const mockClassList = () => {
    const classes = new Set();
    return {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    };
  };

  const createMockElement = (id) => ({
    id,
    classList: mockClassList(),
    listeners: {},
    addEventListener(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
    },
    click() {
      if (this.listeners["click"]) this.listeners["click"].forEach((fn) => fn({ type: "click" }));
    },
    scrollIntoView: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    textContent: ""
  });

  const elements = {
    btnLangEs: createMockElement("btnLangEs"),
    btnLangEn: createMockElement("btnLangEn"),
    shortcutCopyPill: createMockElement("shortcutCopyPill"),
    transferNavPill: createMockElement("transferNavPill"),
    transferSection: createMockElement("transferSection"),
    btnStartReading: createMockElement("btnStartReading"),
    guideSection: createMockElement("guideSection"),
    step1Card: createMockElement("step1Card")
  };

  let storageData = { settings: { language: "es" } };
  let storageChangedListeners = [];
  let clipboardCopied = "";

  const mockDomSandbox = {
    document: {
      readyState: "complete",
      documentElement: { lang: "es" },
      title: "",
      getElementById: (id) => elements[id] || null,
      querySelectorAll: () => [],
      createElement: (tag) => createMockElement(tag),
      body: {
        appendChild: () => {}
      },
      addEventListener: (evt, fn) => {
        if (!listenersMap[evt]) listenersMap[evt] = [];
        listenersMap[evt].push(fn);
      }
    },
    navigator: {
      clipboard: {
        writeText: async (t) => {
          clipboardCopied = t;
        }
      }
    },
    chrome: {
      runtime: {
        getURL: (p) => p
      },
      action: {
        openPopup: async () => {}
      },
      storage: {
        local: {
          get: async () => storageData,
          set: async (obj) => {
            Object.assign(storageData, obj);
          }
        },
        onChanged: {
          addListener: (fn) => storageChangedListeners.push(fn)
        }
      }
    },
    initI18n: () => Promise.resolve("es"),
    getCurrentLang: () => "es",
    setCurrentLang: (l) => {},
    applyI18nToDom: () => {},
    t: (k) => k,
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {}
  };

  const vmContext = vm.createContext(mockDomSandbox);

  // Must execute cleanly WITHOUT throwing ReferenceError (TDZ safety check)
  assert.doesNotThrow(() => {
    vm.runInContext(welcomeJsSrc, vmContext);
  }, "welcome.js executes cleanly on startup without ReferenceError / TDZ crashes");

  // Verify interactive handlers are registered
  assert.ok(elements.btnLangEs.listeners["click"], "btnLangEs has click listener");
  assert.ok(elements.btnLangEn.listeners["click"], "btnLangEn has click listener");
  assert.ok(elements.shortcutCopyPill.listeners["click"], "shortcutCopyPill has click listener");
  assert.ok(elements.transferNavPill.listeners["click"], "transferNavPill has click listener");
  assert.ok(elements.btnStartReading.listeners["click"], "btnStartReading has click listener");

  console.log("  [PASS] Runtime execution & TDZ safety verified (zero startup ReferenceErrors).");
}

// ----------------------------------------------------------------------------
// Test 4: i18n Dictionary Parity & Coverage
// ----------------------------------------------------------------------------
console.log("\n[Test 4] i18n Dictionary Parity & Coverage for Welcome Page:");
{
  // Extract all data-i18n attributes from welcome.html
  const regex = /data-i18n="([^"]+)"/g;
  let match;
  const usedKeys = new Set();
  while ((match = regex.exec(welcomeHtmlSrc)) !== null) {
    usedKeys.add(match[1]);
  }

  // Extract all data-i18n-title attributes from welcome.html
  const titleRegex = /data-i18n-title="([^"]+)"/g;
  while ((match = titleRegex.exec(welcomeHtmlSrc)) !== null) {
    usedKeys.add(match[1]);
  }

  assert.ok(usedKeys.size >= 25, `Expected at least 25 localized keys in welcome.html, found ${usedKeys.size}`);

  // Verify all used keys exist in both locales
  for (const k of usedKeys) {
    assert.ok(esLocale[k], `Key '${k}' used in welcome.html missing in es.json`);
    assert.ok(enLocale[k], `Key '${k}' used in welcome.html missing in en.json`);
    assert.ok(esLocale[k].length > 0, `Key '${k}' in es.json is empty string`);
    assert.ok(enLocale[k].length > 0, `Key '${k}' in en.json is empty string`);
  }
  console.log(`  [PASS] All ${usedKeys.size} UI keys used in welcome.html exist with 100% parity in es.json & en.json.`);

  // Check that all welcome_* keys in es.json exist in en.json and vice-versa
  const esWelcomeKeys = Object.keys(esLocale).filter((k) => k.startsWith("welcome_"));
  const enWelcomeKeys = Object.keys(enLocale).filter((k) => k.startsWith("welcome_"));

  assert.strictEqual(
    esWelcomeKeys.length,
    enWelcomeKeys.length,
    `welcome_* key count must match (es: ${esWelcomeKeys.length}, en: ${enWelcomeKeys.length})`
  );
  assert.ok(esWelcomeKeys.length >= 40, `Expected at least 40 welcome_* keys, found ${esWelcomeKeys.length}`);

  const diffEn = esWelcomeKeys.filter((k) => enLocale[k] === undefined);
  const diffEs = enWelcomeKeys.filter((k) => esLocale[k] === undefined);
  assert.deepStrictEqual(diffEn, [], "No welcome keys in es.json missing from en.json");
  assert.deepStrictEqual(diffEs, [], "No welcome keys in en.json missing from es.json");
  console.log(`  [PASS] 100% bidirectional parity across all ${esWelcomeKeys.length} welcome_* keys.`);

  // Comprehensive FALLBACK_DICTS in i18n.js Verification (Key & Value Parity)
  const i18nJsSrc = fs.readFileSync(path.join(rootDir, "i18n.js"), "utf8");
  const i18nSandbox = {};
  vm.createContext(i18nSandbox);
  vm.runInContext(i18nJsSrc + "; this.FB = FALLBACK_DICTS;", i18nSandbox);
  const fbEs = i18nSandbox.FB.es;
  const fbEn = i18nSandbox.FB.en;

  assert.strictEqual(Object.keys(fbEs).length, Object.keys(esLocale).length, "FALLBACK_DICTS.es key count matches es.json");
  assert.strictEqual(Object.keys(fbEn).length, Object.keys(enLocale).length, "FALLBACK_DICTS.en key count matches en.json");

  const missingFbEs = Object.keys(esLocale).filter((k) => !(k in fbEs));
  const missingFbEn = Object.keys(enLocale).filter((k) => !(k in fbEn));
  assert.deepStrictEqual(missingFbEs, [], "No keys in es.json missing from FALLBACK_DICTS.es");
  assert.deepStrictEqual(missingFbEn, [], "No keys in en.json missing from FALLBACK_DICTS.en");

  const valDiffsEs = Object.keys(esLocale).filter((k) => esLocale[k] !== fbEs[k]);
  const valDiffsEn = Object.keys(enLocale).filter((k) => enLocale[k] !== fbEn[k]);
  assert.deepStrictEqual(valDiffsEs, [], `FALLBACK_DICTS.es values match es.json 1:1, mismatches: ${valDiffsEs.join(", ")}`);
  assert.deepStrictEqual(valDiffsEn, [], `FALLBACK_DICTS.en values match en.json 1:1, mismatches: ${valDiffsEn.join(", ")}`);
  console.log(`  [PASS] 100% key and value parity verified between JSON locales and FALLBACK_DICTS across all ${Object.keys(esLocale).length} entries.`);
}

// ----------------------------------------------------------------------------
// Test 5: Popup Settings Integration
// ----------------------------------------------------------------------------
console.log("\n[Test 5] Popup Settings Integration:");
{
  assert.ok(
    popupHtmlSrc.includes('id="linkWelcomeGuide"'),
    "popup.html contains linkWelcomeGuide in Settings"
  );
  assert.ok(
    popupHtmlSrc.includes('data-i18n="settings_welcome_guide"'),
    "popup.html uses settings_welcome_guide key for the link"
  );
  assert.ok(esLocale.settings_welcome_guide, "settings_welcome_guide defined in es.json");
  assert.ok(enLocale.settings_welcome_guide, "settings_welcome_guide defined in en.json");

  // Verify popup.js binds click handler to open welcome.html
  assert.ok(
    popupJsSrc.includes('document.getElementById("linkWelcomeGuide")'),
    "popup.js queries linkWelcomeGuide"
  );
  assert.ok(
    popupJsSrc.includes('chrome.runtime.getURL("welcome.html")'),
    "popup.js opens welcome.html tab via chrome.tabs.create"
  );
  console.log("  [PASS] Popup settings correctly includes linkWelcomeGuide wired to open welcome.html.");
}

// ----------------------------------------------------------------------------
// Test 6: Packaging Verification Integration
// ----------------------------------------------------------------------------
console.log("\n[Test 6] Packaging Verification Integration:");
{
  const verifyScriptSrc = fs.readFileSync(path.join(rootDir, "tests/verify_cws_package.js"), "utf8");
  assert.ok(
    verifyScriptSrc.includes('"welcome.html"'),
    "verify_cws_package.js requires welcome.html in package"
  );
  assert.ok(
    verifyScriptSrc.includes('"welcome.js"'),
    "verify_cws_package.js requires welcome.js in package"
  );
  console.log("  [PASS] CWS package builder includes welcome.html and welcome.js in production build.");
}

// ----------------------------------------------------------------------------
// Test 7: Real Chromium MV3 Playwright E2E Integration (Live Fresh Install)
// ----------------------------------------------------------------------------
console.log("\n[Test 7] Real Chromium MV3 Playwright E2E Integration:");
if (chromium) {
  let tempDir = null;
  let context = null;
  try {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_onboard_e2e_"));
    context = await chromium.launchPersistentContext(tempDir, {
      headless: false,
      args: [
        "--headless=new",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--disable-extensions-except=${rootDir}`,
        `--load-extension=${rootDir}`
      ]
    });

    const sw = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
    assert.ok(sw, "Service worker active");

    // Wait for welcome.html tab to be created by background onInstalled hook
    let welcomePage = null;
    for (let i = 0; i < 10; i++) {
      welcomePage = context.pages().find((p) => p.url().includes("welcome.html"));
      if (welcomePage) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    assert.ok(welcomePage, "welcome.html opened automatically on fresh install");
    console.log("  [PASS] Fresh install automatically opened welcome.html in browser tab.");

    const errors = [];
    welcomePage.on("pageerror", (err) => errors.push("pageerror: " + err.message));
    welcomePage.on("console", (msg) => {
      if (msg.type() === "error") errors.push("console error: " + msg.text());
    });

    // 1. Initial Spanish default render
    assert.strictEqual(await welcomePage.title(), "Bienvenido a MyNovelSystem — Guía de Inicio");
    const heroEs = (await welcomePage.locator(".hero-title").textContent()).trim();
    assert.strictEqual(heroEs, "¡Bienvenido a MyNovelSystem!");
    const pillTitleEs = await welcomePage.locator("#transferNavPill").getAttribute("title");
    assert.strictEqual(pillTitleEs, "Ver cómo transferir tu cuenta sin servidor");
    console.log("  [PASS] Initial render executes cleanly in Spanish without TDZ ReferenceErrors.");

    // 2. Switch to English
    await welcomePage.click("#btnLangEn");
    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(await welcomePage.title(), "Welcome to MyNovelSystem — Getting Started Guide");
    const heroEn = (await welcomePage.locator(".hero-title").textContent()).trim();
    assert.strictEqual(heroEn, "Welcome to MyNovelSystem!");
    const mockChapEn = (await welcomePage.locator('[data-i18n="welcome_mock_chapter"]').textContent()).trim();
    assert.strictEqual(mockChapEn, "Chapter 1397");
    const mockProgEn = (await welcomePage.locator('[data-i18n="welcome_mock_progress"]').textContent()).trim();
    assert.strictEqual(mockProgEn, "84% read");
    const mockRealmEn = (await welcomePage.locator('[data-i18n="welcome_mock_realm"]').textContent()).trim();
    assert.strictEqual(mockRealmEn, "Realm: Golden Core (Stage 7/9)");
    const step4TitleEn = (await welcomePage.locator('[data-i18n="welcome_step4_title"]').textContent()).trim();
    assert.strictEqual(step4TitleEn, "Customize Your Settings");
    const transferTitleEn = (await welcomePage.locator('[data-i18n="welcome_transfer_title"]').textContent()).trim();
    assert.strictEqual(transferTitleEn, "100% Local Account Transfer (No Server Needed)");
    const pillTitleEn = await welcomePage.locator("#transferNavPill").getAttribute("title");
    assert.strictEqual(pillTitleEn, "See how to transfer your account without a server");
    const contrastLocalEn = (await welcomePage.locator('[data-i18n="welcome_transfer_contrast_local_title"]').textContent()).trim();
    assert.strictEqual(contrastLocalEn, "Local Transfer (Recommended for Privacy)");
    const contrastCloudEn = (await welcomePage.locator('[data-i18n="welcome_transfer_contrast_cloud_title"]').textContent()).trim();
    assert.strictEqual(contrastCloudEn, "Firebase Cloud Sync (Automatic Alternative)");
    console.log("  [PASS] Dynamic language toggle to English updates document.title, hero, mockup, 4th step & transfer section.");

    // 3. Switch back to Spanish
    await welcomePage.click("#btnLangEs");
    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(await welcomePage.title(), "Bienvenido a MyNovelSystem — Guía de Inicio");
    const transferTitleEs = (await welcomePage.locator('[data-i18n="welcome_transfer_title"]').textContent()).trim();
    assert.strictEqual(transferTitleEs, "Traspaso de Cuenta 100% Local (Sin Servidor)");
    const contrastLocalEs = (await welcomePage.locator('[data-i18n="welcome_transfer_contrast_local_title"]').textContent()).trim();
    assert.strictEqual(contrastLocalEs, "Traspaso Local (Recomendado para Privacidad)");
    const pillTitleEsRestored = await welcomePage.locator("#transferNavPill").getAttribute("title");
    assert.strictEqual(pillTitleEsRestored, "Ver cómo transferir tu cuenta sin servidor");
    console.log("  [PASS] Dynamic language toggle back to Spanish restores localized transfer section.");

    // 4. Click shortcut pill & verify interactive toast
    await welcomePage.click("#shortcutCopyPill");
    await new Promise((r) => setTimeout(r, 200));
    const toastText = (await welcomePage.locator("#welcomeToast").textContent()).trim();
    assert.ok(toastText.includes("Alt+Shift+N") || toastText.includes("copiado"), "Toast shown on shortcut click");
    console.log("  [PASS] Shortcut copy action triggers visual toast notification.");

    // 5. Click Start Reading CTA & verify pulse animation
    await welcomePage.click("#btnStartReading");
    await new Promise((r) => setTimeout(r, 200));
    const hasPulse = await welcomePage.locator("#step1Card").evaluate((el) => el.classList.contains("highlight-pulse"));
    assert.strictEqual(hasPulse, true, "step1Card receives highlight-pulse class upon CTA click");
    console.log("  [PASS] Start Reading CTA guides user and triggers highlight-pulse on Step 1 card.");

    // 6. Click Transfer Nav Pill & verify pulse animation on transferSection
    await welcomePage.click("#transferNavPill");
    await new Promise((r) => setTimeout(r, 200));
    const hasTransferPulse = await welcomePage.locator("#transferSection").evaluate((el) => el.classList.contains("highlight-pulse"));
    assert.strictEqual(hasTransferPulse, true, "transferSection receives highlight-pulse upon transferNavPill click");
    console.log("  [PASS] Transfer nav pill smoothly navigates and triggers highlight-pulse on transfer section.");

    assert.strictEqual(errors.length, 0, "Zero runtime errors in Chromium session: " + errors.join("; "));
    console.log("  [PASS] Zero console errors or unhandled exceptions in live browser session.");
  } finally {
    if (context) await context.close();
    if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  }
} else {
  console.log("  [SKIP] Playwright not installed in environment, skipped live browser launch.");
}

console.log("\n====================================================================");
console.log(">>> ALL ONBOARDING LIFECYCLE & WELCOME TESTS PASSED CLEANLY (100%)! <<<");
console.log("====================================================================\n");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
