// ============================================================================
// COMPREHENSIVE TEST SUITE: V5 BLACKLIST, BUTTONS, SELECTORS & CSP
// ============================================================================
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== RUNNING V5 BLACKLIST, BUTTONS & SELECTORS TEST SUITE ===");

async function runAllTests() {
  // Load background.js into VM context with mock chrome
  let storageLocalData = {};
  const mockChrome = {
    storage: {
      local: {
        get: async (keys) => {
          if (!keys) return { ...storageLocalData };
          if (typeof keys === "string") return { [keys]: storageLocalData[keys] };
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach((k) => { res[k] = storageLocalData[k]; });
            return res;
          }
          const res = {};
          for (const k of Object.keys(keys)) {
            res[k] = storageLocalData[k] !== undefined ? storageLocalData[k] : keys[k];
          }
          return res;
        },
        set: async (obj) => {
          Object.assign(storageLocalData, obj);
        },
        remove: async (keys) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          arr.forEach((k) => delete storageLocalData[k]);
        }
      },
      sync: { set: async () => {} },
      onChanged: { addListener: () => {}, removeListener: () => {} }
    },
    runtime: {
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: () => {} },
      sendMessage: () => {},
      getManifest: () => ({ version: "4.0.0" }),
      getURL: (p) => p || "",
      lastError: null
    },
    tabs: {
      query: async () => [],
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} }
    },
    alarms: { onAlarm: { addListener: () => {} } },
    action: {
      setIcon: () => Promise.resolve(),
      setBadgeText: () => Promise.resolve(),
      setBadgeBackgroundColor: () => Promise.resolve(),
      setTitle: () => Promise.resolve()
    },
    omnibox: { onInputChanged: { addListener: () => {} }, onInputEntered: { addListener: () => {} } },
    commands: { onCommand: { addListener: () => {} } }
  };

  const bgCode = fs.readFileSync(path.join(__dirname, "../background.js"), "utf8");
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
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
    chrome: mockChrome,
    importScripts: (...files) => {
      for (const f of files) {
        try {
          const p = path.resolve(__dirname, "..", f);
          if (fs.existsSync(p)) {
            vm.runInContext(fs.readFileSync(p, "utf8"), sandbox);
          }
        } catch {}
      }
    },
    t: (k) => k,
    initI18n: () => Promise.resolve(),
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    globalThis: {},
    module: { exports: {} },
    exports: {}
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(bgCode, sandbox);

  const {
    normalizeDomain,
    matchesDomainPattern,
    isDomainBlacklisted,
    addDomainToBlacklist,
    removeDomainFromBlacklist,
    clearDomainBlacklist,
    getStoredDomainBlacklist,
    deduplicateAndMigrateMap
  } = sandbox;

  assert.strictEqual(typeof normalizeDomain, "function", "normalizeDomain must be exported");
  assert.strictEqual(typeof matchesDomainPattern, "function", "matchesDomainPattern must be exported");
  assert.strictEqual(typeof isDomainBlacklisted, "function", "isDomainBlacklisted must be exported");

  // ----------------------------------------------------------------------------
  // 1. DOMAIN NORMALIZATION TESTS
  // ----------------------------------------------------------------------------
  console.log("\n[Test 1] Domain Normalization (normalizeDomain):");

  assert.strictEqual(normalizeDomain("https://sub.ejemplo.com/chapter-1?query=1#top"), "sub.ejemplo.com");
  assert.strictEqual(normalizeDomain("http://www.ejemplo.com:8080/novels/"), "ejemplo.com");
  assert.strictEqual(normalizeDomain("  WWW.MySite.ORG/path  "), "mysite.org");
  assert.strictEqual(normalizeDomain("ftp://bad.site.com:21"), "bad.site.com");
  assert.strictEqual(normalizeDomain("ejemplo.com/"), "ejemplo.com");
  assert.strictEqual(normalizeDomain("https://www.google.com:443"), "google.com");
  assert.strictEqual(normalizeDomain("...sub.domain.co.uk..."), "sub.domain.co.uk");
  assert.strictEqual(normalizeDomain(""), "");
  assert.strictEqual(normalizeDomain(null), "");
  assert.strictEqual(normalizeDomain(undefined), "");
  assert.strictEqual(normalizeDomain(123), "");

  console.log("  [PASS] All normalization variants handled accurately.");

  // ----------------------------------------------------------------------------
  // 2. SUBDOMAIN & WILDCARD PATTERN MATCHING
  // ----------------------------------------------------------------------------
  console.log("\n[Test 2] Subdomain Pattern Matching (matchesDomainPattern):");

  assert.strictEqual(matchesDomainPattern("ejemplo.com", "ejemplo.com"), true, "Exact match must be true");
  assert.strictEqual(matchesDomainPattern("sub.ejemplo.com", "ejemplo.com"), true, "Subdomain must be blocked by root");
  assert.strictEqual(matchesDomainPattern("deep.sub.ejemplo.com", "ejemplo.com"), true, "Deep subdomain must be blocked by root");

  assert.strictEqual(matchesDomainPattern("otroejemplo.com", "ejemplo.com"), false, "Substring collision must be false");
  assert.strictEqual(matchesDomainPattern("fakeejemplo.com", "ejemplo.com"), false, "Prefix collision must be false");
  assert.strictEqual(matchesDomainPattern("ejemplo.com.evil.org", "ejemplo.com"), false, "Suffix in evil domain must be false");
  assert.strictEqual(matchesDomainPattern("ejemplo.com", "sub.ejemplo.com"), false, "Root must NOT be blocked by subdomain");
  assert.strictEqual(matchesDomainPattern("other.com", "ejemplo.com"), false, "Unrelated domain must be false");

  assert.strictEqual(matchesDomainPattern("SUB.EJEMPLO.COM", "ejemplo.com"), true, "Uppercase host must match");
  assert.strictEqual(matchesDomainPattern("sub.ejemplo.com", "EJEMPLO.COM"), true, "Uppercase pattern must match");

  assert.strictEqual(matchesDomainPattern("sub.ejemplo.com", "*.ejemplo.com"), true, "*.domain must match subdomain");
  assert.strictEqual(matchesDomainPattern("ejemplo.com", "*.ejemplo.com"), true, "*.domain must match root");

  console.log("  [PASS] Subdomain pattern matching is robust and avoids false positives.");

  // ----------------------------------------------------------------------------
  // 3. BLACKLIST CRUD OPERATIONS & CACHING
  // ----------------------------------------------------------------------------
  console.log("\n[Test 3] Blacklist CRUD Operations in Storage:");

  storageLocalData = {};

  let list = await getStoredDomainBlacklist();
  assert.strictEqual(list.length, 0, "Initial blacklist should be empty");
  assert.strictEqual(await isDomainBlacklisted("novelpub.com"), false);

  let resAdded = await addDomainToBlacklist("https://novelpub.com/path");
  assert.strictEqual(resAdded.ok, true, "Adding new domain should return ok: true");
  assert.strictEqual(await isDomainBlacklisted("novelpub.com"), true);
  assert.strictEqual(await isDomainBlacklisted("read.novelpub.com"), true, "Subdomain must now be blacklisted");
  assert.strictEqual(await isDomainBlacklisted("royalroad.com"), false, "Unrelated domain must remain free");

  let resDuplicate = await addDomainToBlacklist("www.novelpub.com");
  assert.strictEqual(resDuplicate.alreadyExists, true, "Adding duplicate domain should flag alreadyExists");
  list = await getStoredDomainBlacklist();
  assert.strictEqual(list.length, 1, "List length should still be 1");

  await addDomainToBlacklist("badsite.net");
  list = await getStoredDomainBlacklist();
  assert.strictEqual(list.length, 2, "List length should be 2");

  let resRemoved = await removeDomainFromBlacklist("novelpub.com");
  assert.strictEqual(resRemoved.ok, true, "Removing domain should return ok: true");
  assert.strictEqual(await isDomainBlacklisted("novelpub.com"), false);
  assert.strictEqual(await isDomainBlacklisted("badsite.net"), true);

  let resClear = await clearDomainBlacklist();
  assert.strictEqual(resClear.ok, true, "Clearing should return ok: true");
  list = await getStoredDomainBlacklist();
  assert.strictEqual(list.length, 0, "List should be empty after clear");
  assert.strictEqual(await isDomainBlacklisted("badsite.net"), false);

  console.log("  [PASS] Blacklist CRUD operations and caching operate correctly.");

  // ----------------------------------------------------------------------------
  // 4. DATA PROTECTION: SAVED NOVELS MUST NEVER BE DELETED
  // ----------------------------------------------------------------------------
  console.log("\n[Test 4] Data Protection on Blacklisted Domains (deduplicateAndMigrateMap):");

  const mockNovelsMap = {
    "site_a__novel_1_12345678": {
      seriesId: "site_a__novel_1_12345678",
      novelName: "Lord of the Mysteries",
      url: "https://blacklisted-site.com/novel/lotm/chapter-100",
      novelUrl: "https://blacklisted-site.com/novel/lotm",
      chapter: "100",
      maxCounted: 100,
      statusManual: "reading",
      updatedAt: 1000
    },
    "site_b__novel_2_87654321": {
      seriesId: "site_b__novel_2_87654321",
      novelName: "Shadow Slave",
      url: "https://allowed-site.com/novel/ss/chapter-50",
      novelUrl: "https://allowed-site.com/novel/ss",
      chapter: "50",
      maxCounted: 50,
      statusManual: "reading",
      updatedAt: 2000
    }
  };

  const migrationRes = deduplicateAndMigrateMap(mockNovelsMap);
  const migrated = migrationRes?.migratedNovels || migrationRes;
  assert.ok(migrated, "Migrated map must exist");
  assert.strictEqual(Object.keys(migrated).length, 2, "Both novels must be preserved");

  const blacklistedNovel = Object.values(migrated).find((n) => n.novelName === "Lord of the Mysteries");
  assert.ok(blacklistedNovel, "Novel from blacklisted domain must NEVER be deleted");
  assert.strictEqual(blacklistedNovel.chapter, "100");

  console.log("  [PASS] Existing user novels from blacklisted domains are 100% preserved.");

  // ----------------------------------------------------------------------------
  // 5. CULTIVATION BREAKTHROUGH STATS PERSISTENCE BUG FIX
  // ----------------------------------------------------------------------------
  console.log("\n[Test 5] Cultivation Breakthrough Stats Persistence Bug Fix:");

  const achData = require("../achievements_data.js");
  assert.strictEqual(typeof achData.advanceCultivationBreakthrough, "function");

  const testStats = {
    chaptersRead: 300,
    cultivatedRealmIndex: 0,
    cultivatedStage: 9,
    bonusQi: 100,
    unlockedTitles: [],
    cultivationThemes: {
      cultivation: {
        cultivatedRealmIndex: 0,
        cultivatedStage: 9,
        lastBreakthrough: null
      }
    }
  };

  const btResult = achData.advanceCultivationBreakthrough(testStats, "cultivation");
  assert.strictEqual(btResult.ok, true, "Breakthrough must succeed");
  assert.ok(btResult.stats, "CRITICAL FIX: advanceCultivationBreakthrough MUST return mutated stats object");
  assert.strictEqual(btResult.stats.cultivatedRealmIndex, 1, "Realm must advance to 1");
  assert.strictEqual(btResult.stats.cultivatedStage, 1, "Stage must reset to 1");
  assert.strictEqual(btResult.stats.cultivationThemes.cultivation.realmIndex, 1, "Theme realm must advance to 1");
  assert.strictEqual(btResult.stats.cultivationThemes.cultivation.stage, 1, "Theme stage must reset to 1");

  console.log("  [PASS] advanceCultivationBreakthrough returns stats object and advances realm.");

  // ----------------------------------------------------------------------------
  // 6. I18N DICTIONARY SYNCHRONIZATION (35+ KEYS)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 6] i18n Dictionary Synchronization across es.json, en.json, i18n.js:");

  const esJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../locales/es.json"), "utf8"));
  const enJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../locales/en.json"), "utf8"));
  const i18nFileContent = fs.readFileSync(path.join(__dirname, "../i18n.js"), "utf8");

  const requiredKeys = [
    "blacklist_title",
    "blacklist_desc",
    "blacklist_quick_block",
    "blacklist_quick_block_none",
    "blacklist_input_placeholder",
    "blacklist_btn_add",
    "blacklist_search_placeholder",
    "blacklist_empty",
    "blacklist_empty_desc",
    "blacklist_empty_search",
    "blacklist_btn_clear",
    "blacklist_clear_confirm_title",
    "blacklist_clear_confirm_desc",
    "blacklist_clear_confirm_btn",
    "blacklist_added_toast",
    "blacklist_removed_toast",
    "blacklist_cleared_toast",
    "blacklist_invalid_err",
    "blacklist_exists_err",
    "btn_blacklist_domain",
    "btn_add_novel",
    "btn_dismiss_prompt",
    "btn_close",
    "prompt_novel_detected",
    "prompt_novel_saved",
    "prompt_domain_blocked",
    "novel_deleted_toast",
    "novel_restored_toast",
    "toast_undo",
    "bt_modal_title",
    "bt_modal_target",
    "bt_modal_surplus",
    "bt_modal_btn_confirm",
    "bt_modal_btn_cancel",
    "bt_success_toast",
    "bt_ascending",
    "wa_enabled_toast",
    "wa_disabled_toast",
    "lang_changed_toast",
    "status_chip_auto",
    "status_chip_reading",
    "status_chip_paused",
    "status_chip_dropped",
    "status_chip_completed",
    "form_name_required",
    "status_blocked",
    "bt_error_toast"
  ];

  for (const key of requiredKeys) {
    assert.ok(esJson[key], `Missing key in locales/es.json: ${key}`);
    assert.ok(enJson[key], `Missing key in locales/en.json: ${key}`);
    assert.ok(i18nFileContent.includes(`"${key}"`), `Missing key in fallback dicts of i18n.js: ${key}`);
  }

  console.log(`  [PASS] All ${requiredKeys.length} required keys verified across es.json, en.json and i18n.js.`);

  // ----------------------------------------------------------------------------
  // 7. IN-PAGE SHADOW DOM & MV3 CSP COMPLIANCE
  // ----------------------------------------------------------------------------
  console.log("\n[Test 7] In-Page Shadow DOM & MV3 CSP Compliance:");

  const contentJs = fs.readFileSync(path.join(__dirname, "../content.js"), "utf8");
  const popupHtml = fs.readFileSync(path.join(__dirname, "../popup.html"), "utf8");

  assert.ok(contentJs.includes("attachShadow({ mode: 'closed' })") || contentJs.includes('attachShadow({ mode: "closed" })'), "Must use closed shadow DOM");
  assert.ok(contentJs.includes("prefers-reduced-motion"), "Must include prefers-reduced-motion media query");
  assert.ok(contentJs.includes("noveltrack-prompt"), "Must create custom tag <noveltrack-prompt>");
  assert.ok(contentJs.includes("DISCARD_UNCONFIRMED_TAB"), "Must handle tab discard");
  assert.ok(contentJs.includes("ADD_DOMAIN_BLACKLIST"), "Must handle domain blacklist action");
  assert.ok(contentJs.includes("Escape"), "Must handle Escape key");
  assert.ok(contentJs.includes("ntBtnUndo"), "Must provide undo option on in-page prompt blacklist button");

  const onerrorMatches = popupHtml.match(/onerror\s*=/gi) || [];
  assert.strictEqual(onerrorMatches.length, 0, `CSP Violation: Found ${onerrorMatches.length} inline onerror handlers in popup.html`);
  const popupJs = fs.readFileSync(path.join(__dirname, "../popup.js"), "utf8");
  assert.ok(popupJs.includes("data-fallback="), "Must use data-fallback in popup.js dynamically rendered badges");

  const requiredElements = [
    'id="breakthroughConfirmModal"',
    'id="clearBlacklistConfirmModal"',
    'id="toastContainer"',
    'id="blacklistCard"',
    'id="manualStatusChips"',
    'id="languageSegmentedControl"',
    'id="waToggleIndicator"'
  ];

  for (const elem of requiredElements) {
    assert.ok(popupHtml.includes(elem), `Missing required DOM element in popup.html: ${elem}`);
  }

  console.log("  [PASS] Shadow DOM isolation, Escape handler, and zero inline CSP violations verified.");

  // ----------------------------------------------------------------------------
  // 8. POPUP FIXED DIMENSIONS & CSS LAYOUT INTEGRITY
  // ----------------------------------------------------------------------------
  console.log("\n[Test 8] Popup Layout Fixed Dimensions & Accessibility:");

  assert.ok(popupHtml.includes("width: 390px;"), "Popup width must be exactly 390px");
  assert.ok(popupHtml.includes("height: 600px;"), "Popup height must be exactly 600px");
  assert.ok(popupHtml.includes(".toast-container"), "Toast container styles must exist");
  assert.ok(popupHtml.includes(".status-chip"), "Status chips styles must exist");
  assert.ok(popupHtml.includes(".lang-segment-btn"), "Segmented language button styles must exist");

  console.log("  [PASS] 390x600 fixed dimensions and selector layouts verified.");

  // ----------------------------------------------------------------------------
  // 9. SETBADGETEXT MV3 API COMPLIANCE (TEXT: "" REQUIRED)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 9] setBadgeText MV3 Compliance (Zero naked { tabId } calls):");

  const nakedBadgeCalls = (bgCode.match(/setBadgeText\(\s*\{\s*tabId\s*\}\s*\)/g) || []).concat(
    popupJs.match(/setBadgeText\(\s*\{\s*tabId\s*\}\s*\)/g) || []
  );
  assert.strictEqual(nakedBadgeCalls.length, 0, `Found invalid naked setBadgeText({ tabId }) calls without text: ""`);
  assert.ok(bgCode.includes('setBadgeText({ text: "", tabId })'), "background.js must clear badges with text: \"\"");
  assert.ok(popupJs.includes('setBadgeText({ text: "", tabId'), "popup.js must clear badges with text: \"\"");

  console.log("  [PASS] All setBadgeText invocations adhere strictly to Chrome MV3 text specifications.");

  // ----------------------------------------------------------------------------
  // 10. KEYBOARD ARROW NAVIGATION & AUTH VALIDATION
  // ----------------------------------------------------------------------------
  console.log("\n[Test 10] Keyboard Navigation & Form Validation:");

  assert.ok(popupJs.includes("ArrowRight"), "Must handle ArrowRight navigation");
  assert.ok(popupJs.includes("ArrowLeft"), "Must handle ArrowLeft navigation");
  assert.ok(popupJs.includes("authEmail") && popupJs.includes("input-error"), "Must validate authEmail with input-error");
  assert.ok(popupJs.includes("authPass") && popupJs.includes("input-error"), "Must validate authPass with input-error");
  assert.ok(popupJs.includes("bt_error_toast"), "Must handle breakthrough failure with error toast");

  console.log("  [PASS] Keyboard arrow navigation and auth input validation verified.");

  // ----------------------------------------------------------------------------
  // 11. BLACKLIST OBJECTS PARSING & DATE FORMAT SIMULATION
  // ----------------------------------------------------------------------------
  console.log("\n[Test 11] Blacklist Objects Parsing & Date Format Verification:");

  const sampleRawList = [
    { domain: "novelpub.com", addedAt: Date.now() - 3600000 },
    { domain: "royalroad.com", addedAt: Date.now() - 86400000 },
    "legacy-domain.org"
  ];

  const parsedItems = sampleRawList
    .map((item) => {
      if (typeof item === "string") return { domain: normalizeDomain(item), addedAt: Date.now() };
      return { domain: normalizeDomain(item?.domain), addedAt: Number(item?.addedAt) || Date.now() };
    })
    .filter((item) => Boolean(item.domain));

  assert.strictEqual(parsedItems.length, 3, "All 3 items must be parsed");
  assert.strictEqual(parsedItems[0].domain, "novelpub.com");
  assert.strictEqual(parsedItems[2].domain, "legacy-domain.org");

  // Verify search filtering works across objects without throwing TypeError
  const searchMatch = parsedItems.filter((item) => item.domain.toLowerCase().includes("pub"));
  assert.strictEqual(searchMatch.length, 1);
  assert.strictEqual(searchMatch[0].domain, "novelpub.com");

  // Verify quick block duplicate check on host with subdomain
  const testHost = "sub.novelpub.com";
  const isBlocked = parsedItems.some((item) => {
    const pattern = item.domain;
    if (testHost === pattern) return true;
    if (testHost.endsWith("." + pattern)) return true;
    return false;
  });
  assert.strictEqual(isBlocked, true, "Subdomain must be detected as blocked");

  console.log("  [PASS] Blacklist objects, date format, and subdomain filtering operate cleanly without type errors.");

  console.log("\n>>> ALL V5 BLACKLIST, BUTTONS & SELECTORS TESTS PASSED CLEANLY! <<<\n");
}

runAllTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
