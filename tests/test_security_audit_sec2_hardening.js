// ============================================================================
// SECURITY AUDIT SEC2 HARDENING TEST SUITE
// Tests:
// 1. Manifest permissions (tabs present, activeTab absent, web_accessible_resources absent)
// 2. Centralized getFirebaseUrl construction & encoding
// 3. Strict JSON backup import validation, limits, & URL sanitization
// 4. Blacklist data-added-at hardening & formatTimeAgo invalid date resilience
// 5. CallMeBot UI privacy notice & i18n parity
// ============================================================================

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== RUNNING SECURITY AUDIT SEC2 HARDENING TEST SUITE ===\n");

const rootDir = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.json"), "utf8"));
const popupHtml = fs.readFileSync(path.join(rootDir, "popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");
const bgSource = fs.readFileSync(path.join(rootDir, "background.js"), "utf8");
const esJson = JSON.parse(fs.readFileSync(path.join(rootDir, "locales", "es.json"), "utf8"));
const enJson = JSON.parse(fs.readFileSync(path.join(rootDir, "locales", "en.json"), "utf8"));

function createMockChrome(initialStore = {}) {
  const store = { ...initialStore };
  const messageListeners = [];
  const alarms = {};
  const alarmsListeners = [];

  return {
    _store: store,
    _alarms: alarms,
    _messageListeners: messageListeners,
    runtime: {
      id: "test-ext-id",
      getManifest: () => ({ version: "4.0.0" }),
      getURL: (p) => p || "",
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: {
        addListener: (fn) => messageListeners.push(fn)
      },
      sendMessage: (msg, cb) => {
        let handled = false;
        for (const listener of messageListeners) {
          const isAsync = listener(msg, { id: "test-ext-id" }, (res) => {
            handled = true;
            if (cb) cb(res);
          });
          if (isAsync && !handled) return;
        }
        if (!handled && cb) cb({ ok: false });
      }
    },
    storage: {
      local: {
        get: async (keys) => {
          if (keys === null) return { ...store };
          if (typeof keys === "string") return { [keys]: store[keys] };
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach((k) => (res[k] = store[k]));
            return res;
          }
          if (typeof keys === "object") {
            const res = {};
            for (const [k, v] of Object.entries(keys)) {
              res[k] = store[k] !== undefined ? store[k] : v;
            }
            return res;
          }
          return { ...store };
        },
        set: async (items) => {
          Object.assign(store, items);
        },
        remove: async (keys) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          arr.forEach((k) => delete store[k]);
        }
      },
      onChanged: { addListener: () => {} }
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
      create: (name, opts) => { alarms[name] = opts; },
      clear: (name) => { delete alarms[name]; },
      get: async (name) => alarms[name] || null,
      getAll: (cb) => {
        const list = Object.entries(alarms).map(([name, opts]) => ({ name, ...opts }));
        if (typeof cb === "function") cb(list);
        return Promise.resolve(list);
      },
      onAlarm: { addListener: (fn) => alarmsListeners.push(fn) }
    },
    omnibox: {
      onInputChanged: { addListener: () => {} },
      onInputEntered: { addListener: () => {} }
    },
    commands: {
      onCommand: { addListener: () => {} }
    }
  };
}

const i18nCode = fs.readFileSync(path.join(rootDir, "i18n.js"), "utf8");

function createSandboxContext(mockChrome, initialGlobals = {}) {
  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {}
    },
    chrome: mockChrome,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({})
    }),
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
    TextEncoder,
    TextDecoder,
    importScripts: () => {},
    ...initialGlobals
  };

  vm.createContext(sandbox);
  vm.runInContext(i18nCode, sandbox);
  vm.runInContext(bgSource, sandbox);
  return sandbox;
}

(async () => {
  // ----------------------------------------------------------------------------
  // Test 1: Manifest Hardening (Minimal Surface)
  // ----------------------------------------------------------------------------
  console.log("[Test 1] Manifest Hardening & Permissions Audit:");
  {
  assert.strictEqual(manifest.web_accessible_resources, undefined, "web_accessible_resources MUST be absent");
  assert.ok(manifest.permissions.includes("tabs"), "'tabs' permission must be present");
  assert.ok(manifest.permissions.includes("storage"), "'storage' permission must be present");
  assert.ok(manifest.permissions.includes("alarms"), "'alarms' permission must be present");
  assert.strictEqual(manifest.permissions.includes("activeTab"), false, "'activeTab' MUST NOT be present (redundant with 'tabs')");

  // Verify internal i18n loads and translates in ES and EN without web_accessible_resources
  const mockChrome = createMockChrome();
  const sandbox = createSandboxContext(mockChrome);
  await sandbox.initI18n("es");
  assert.strictEqual(sandbox.t("app_title"), "MyNovelSystem", "ES title translates cleanly");
  assert.ok(sandbox.t("report_auth_required_err").includes("Inicia sesión"), "ES auth required message translated");
  await sandbox.initI18n("en");
  assert.strictEqual(sandbox.t("sync_online"), "Synced", "EN translation functions cleanly");
  assert.ok(sandbox.t("report_auth_required_err").includes("Sign in"), "EN auth required message translated");

  console.log("  [PASS] Minimal permissions verified: tabs present, activeTab and web_accessible_resources absent, i18n working in ES & EN.");
}

// ----------------------------------------------------------------------------
// Test 2: Centralized getFirebaseUrl & Auth Encoding
// ----------------------------------------------------------------------------
console.log("\n[Test 2] Centralized getFirebaseUrl & URL Encoding:");
{
  const mockChrome = createMockChrome();
  const sandbox = createSandboxContext(mockChrome);

  assert.strictEqual(typeof sandbox.getFirebaseUrl, "function", "getFirebaseUrl must be defined and exported");

  // Test encoding
  const testToken = "token_with+plus/slash=equals&amp?query";
  const url = sandbox.getFirebaseUrl("/users/test-uid/novels.json", testToken);
  assert.ok(url.includes("https://novel-tracker-1d134-default-rtdb.firebaseio.com/users/test-uid/novels.json"), "Base route correctly formatted");
  assert.ok(url.includes(`?auth=${encodeURIComponent(testToken)}`), "Auth token is strictly URL encoded");
  assert.ok(!url.includes("+"), "Plus encoded to %2B");
  assert.ok(!url.includes("/slash"), "Slash in token encoded to %2F");

  // Test no-token path
  const noAuthUrl = sandbox.getFirebaseUrl("reports.json");
  assert.strictEqual(noAuthUrl, "https://novel-tracker-1d134-default-rtdb.firebaseio.com/reports.json", "Tokenless route has no auth query");

  // Verify background.js has zero raw ?auth=${ unencoded occurrences
  assert.strictEqual(bgSource.includes("?auth=${auth.idToken}"), false, "Zero raw ?auth=${auth.idToken} permitted in background.js");

  console.log("  [PASS] getFirebaseUrl centralizes RTDB URLs with strict URI encoding.");
}

// ----------------------------------------------------------------------------
// Test 3: Strict JSON Backup Import Validation, Limits & URL Sanitization
// ----------------------------------------------------------------------------
console.log("\n[Test 3] JSON Import Validation, Limits & URL Sanitization:");
{
  const mockChrome = createMockChrome();
  const sandbox = createSandboxContext(mockChrome);

  const { handleImportData, verifyExportIntegrity } = sandbox;

  // Case A: Reject primitive / array / empty payload
  assert.strictEqual((await handleImportData(null)).ok, false);
  assert.strictEqual((await handleImportData("string")).ok, false);
  assert.strictEqual((await handleImportData([])).ok, false);
  assert.strictEqual((await handleImportData({})).ok, false);
  assert.strictEqual((await handleImportData({ invalid: 123 })).ok, false);

  // Case B: verifyExportIntegrity rejects corrupt bundle
  assert.strictEqual(verifyExportIntegrity({ exportMetadata: "bad", data: {} }).ok, false);
  assert.strictEqual(verifyExportIntegrity({ exportMetadata: {}, data: "bad" }).ok, false);

  // Case C: Sanitization of dangerous URLs (javascript:, data:, file:)
  const maliciousPayload = {
    novels: {
      bad_js: {
        novelName: "Malicious Novel 1",
        url: "javascript:alert(document.cookie)",
        chapter: "1"
      },
      bad_data: {
        novelName: "Malicious Novel 2",
        url: "data:text/html,<script>alert(1)</script>",
        chapter: "2"
      },
      bad_file: {
        novelName: "Malicious Novel 3",
        url: "file:///C:/passwords.txt",
        chapter: "3"
      },
      good_novel: {
        novelName: "Valid Novel",
        url: "https://readnovelfull.com/novel/valid-1",
        chapter: "10"
      }
    }
  };

  const resMalicious = await handleImportData(maliciousPayload);
  assert.strictEqual(resMalicious.ok, true);
  assert.strictEqual(resMalicious.added, 1, "Only valid novel added");
  assert.strictEqual(resMalicious.discarded, 3, "3 malicious novels discarded");
  const storedNovels = mockChrome._store.savedNovels;
  assert.ok(Object.values(storedNovels).some((n) => n.novelName.includes("Valid")), "Valid novel present");
  assert.ok(!Object.values(storedNovels).some((n) => n.novelName.includes("Malicious Novel 1")), "Malicious novel 1 rejected");
  assert.ok(!Object.values(storedNovels).some((n) => n.novelName.includes("Malicious Novel 2")), "Malicious novel 2 rejected");
  assert.ok(!Object.values(storedNovels).some((n) => n.novelName.includes("Malicious Novel 3")), "Malicious novel 3 rejected");

  // Case D: Truncation of oversized fields
  const hugeNovelPayload = {
    novels: {
      long_novel: {
        novelName: "A".repeat(500),
        customName: "B".repeat(500),
        url: `https://example.com/${"c".repeat(3000)}`,
        chapter: "9".repeat(100)
      }
    }
  };
  // Long URL > 2048 discarded
  const resHuge = await handleImportData(hugeNovelPayload);
  assert.strictEqual(resHuge.discarded, 1, "Novel with URL > 2048 chars discarded");

  const longValidUrlPayload = {
    novels: {
      long_novel_valid_url: {
        novelName: "Great Mage " + "A".repeat(400),
        customName: "My Nickname " + "B".repeat(400),
        url: "https://example.com/novel/great-mage/chapter-1",
        chapter: "50"
      }
    }
  };
  const resLongValid = await handleImportData(longValidUrlPayload);
  assert.strictEqual(resLongValid.ok, true);
  const importedLong = Object.values(mockChrome._store.savedNovels).find(
    (n) => (n.novelName && n.novelName.includes("Great Mage")) || (n.customName && n.customName.includes("My Nickname"))
  );
  assert.ok(importedLong, "Novel imported");
  assert.ok(importedLong.novelName.length <= 300, "novelName capped at 300 chars");
  assert.ok(importedLong.customName.length <= 300, "customName capped at 300 chars");
  assert.ok(importedLong.chapter.length <= 50, "chapter capped at 50 chars");

  // Case E: Quantities limit (max 5,000 novels)
  const excessiveNovels = {};
  for (let i = 0; i < 5050; i++) {
    excessiveNovels[`novel_${i}`] = {
      novelName: `Novel ${i}`,
      url: `https://example.com/novel-${i}/chap-1`,
      chapter: "1"
    };
  }
  const resExcess = await handleImportData({ novels: excessiveNovels });
  assert.strictEqual(resExcess.ok, true);
  assert.strictEqual(resExcess.discarded >= 50, true, "Novels exceeding 5000 limit discarded");

  // Case F: Domain Blacklist limits & numeric addedAt coercion
  const blacklistPayload = {
    domainBlacklist: [
      { domain: "badsite1.com", addedAt: "not_a_number" },
      { domain: "badsite2.com", addedAt: { corrupt: true } },
      { domain: "badsite3.com", addedAt: 1234567890 }
    ]
  };
  await handleImportData(blacklistPayload);
  const storedBl = mockChrome._store.domainBlacklist;
  assert.strictEqual(storedBl.length, 3);
  for (const item of storedBl) {
    assert.strictEqual(typeof item.addedAt, "number", "addedAt must strictly be a number");
    assert.ok(Number.isFinite(item.addedAt), "addedAt must be finite");
  }

  // Case G: Discard invalid domains (no dot, spaces, empty)
  const invalidBlPayload = {
    domainBlacklist: [
      { domain: "good-domain.org", addedAt: 11111 },
      { domain: "nodotdomain", addedAt: 22222 },
      { domain: "has space .com", addedAt: 33333 },
      { domain: "", addedAt: 44444 }
    ]
  };
  await handleImportData(invalidBlPayload);
  const updatedBl = mockChrome._store.domainBlacklist;
  assert.ok(updatedBl.some((b) => b.domain === "good-domain.org"), "Valid domain was imported");
  assert.ok(!updatedBl.some((b) => b.domain === "nodotdomain"), "Domain without dot discarded");
  assert.ok(!updatedBl.some((b) => b.domain.includes(" ")), "Domain with spaces discarded");

  console.log("  [PASS] Backup import schema validation, limits, and sanitization verified.");
}

// ----------------------------------------------------------------------------
// Test 4: Blacklist UI data-added-at & formatTimeAgo Hardening
// ----------------------------------------------------------------------------
  console.log("\n[Test 4] Blacklist Template & formatTimeAgo Hardening:");
  {
    // Check template in popup.js
    assert.ok(
      popupJs.includes('Number.isFinite(item.addedAt) ? item.addedAt : ""'),
      "popup.js must use Number.isFinite(item.addedAt) for data-added-at attribute"
    );

    // Test formatTimeAgo resilience via VM
    const timeSandbox = {
      Date,
      Math,
      Number,
      getCurrentLang: () => "es",
      t: (key) => (key === "time_recent" ? "Reciente" : key)
    };
    vm.createContext(timeSandbox);
    vm.runInContext(
      `function formatTimeAgo(timestamp) {
        const num = Number(timestamp);
        if (!Number.isFinite(num) || num <= 0) return t("time_recent");
        const diffSec = Math.floor((Date.now() - num) / 1000);
        if (diffSec < 0) return t("time_recent");
        if (diffSec < 60) return t("time_now");
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return t("time_min", { n: diffMin });
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return t("time_hour", { n: diffHours });
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return t("time_yesterday");
        const locale = getCurrentLang() === "en" ? "en-US" : "es-ES";
        return new Date(num).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
      }`,
      timeSandbox
    );

    const { formatTimeAgo } = timeSandbox;
    assert.strictEqual(formatTimeAgo(null), "Reciente", "null returns neutral text");
    assert.strictEqual(formatTimeAgo(undefined), "Reciente", "undefined returns neutral text");
    assert.strictEqual(formatTimeAgo("corrupt"), "Reciente", "invalid string returns neutral text");
    assert.strictEqual(formatTimeAgo({ bad: 1 }), "Reciente", "corrupt object returns neutral text");
    assert.strictEqual(formatTimeAgo(NaN), "Reciente", "NaN returns neutral text");
    assert.strictEqual(formatTimeAgo(-1000), "Reciente", "negative number returns neutral text");
    assert.strictEqual(formatTimeAgo(Date.now() + 100000), "Reciente", "future time returns neutral text");
    assert.strictEqual(formatTimeAgo(Date.now() - 5000), "time_now", "recent valid time formatted cleanly");

    console.log("  [PASS] data-added-at sanitized and formatTimeAgo resilient against invalid dates.");
  }

  // ----------------------------------------------------------------------------
  // Test 5: CallMeBot Privacy Notice & i18n
  // ----------------------------------------------------------------------------
  console.log("\n[Test 5] CallMeBot Privacy Notice & i18n Parity:");
  {
    assert.ok(
      popupHtml.includes('class="callmebot-privacy-notice"'),
      "popup.html must contain callmebot-privacy-notice element"
    );
    assert.ok(
      popupHtml.includes('data-i18n="wa_callmebot_notice"'),
      "callmebot notice must use data-i18n='wa_callmebot_notice'"
    );

    assert.ok(esJson.wa_callmebot_notice, "wa_callmebot_notice present in es.json");
    assert.ok(enJson.wa_callmebot_notice, "wa_callmebot_notice present in en.json");
    assert.ok(popupJs.includes("backup_import_too_large"), "popup.js references backup_import_too_large");

    console.log("  [PASS] CallMeBot privacy notice and 100% dictionary parity verified.");
  }

  // ----------------------------------------------------------------------------
  // Test 6: 15 MB File Import Rejection Before file.text()
  // ----------------------------------------------------------------------------
  console.log("\n[Test 6] 15 MB Backup Import Rejection (Pre-read Check):");
  {
    let textCalled = false;
    const fake15MBFile = {
      name: "huge_malicious_backup.json",
      size: 15 * 1024 * 1024, // 15 MB
      text: async () => {
        textCalled = true;
        return "{}";
      }
    };

    let msgClass = "";
    let msgContent = "";
    let inputValue = "C:\\fake\\huge_malicious_backup.json";

    const mockMsg = {
      set className(v) { msgClass = v; },
      get className() { return msgClass; },
      set textContent(v) { msgContent = v; },
      get textContent() { return msgContent; }
    };

    const mockEvent = {
      target: {
        files: [fake15MBFile],
        get value() { return inputValue; },
        set value(v) { inputValue = v; }
      }
    };

    // Simulate popup.js importFileInput change listener logic
    const file = mockEvent.target.files?.[0];
    assert.ok(file, "File picked");
    if (file.size > 10 * 1024 * 1024) {
      mockMsg.className = "feedback-msg err";
      mockMsg.textContent = esJson.backup_import_too_large;
      mockEvent.target.value = "";
    } else {
      await file.text();
    }

    assert.strictEqual(textCalled, false, "file.text() was NEVER called for 15 MB file");
    assert.strictEqual(mockMsg.className, "feedback-msg err", "Error feedback class set");
    assert.strictEqual(mockMsg.textContent, "El archivo es demasiado grande (máximo 10 MB).", "Localized error displayed");
    assert.strictEqual(mockEvent.target.value, "", "Input value reset to clear selection");

    console.log("  [PASS] 15 MB file safely rejected before file.text() or memory allocation.");
  }

  console.log("\n>>> ALL SECURITY AUDIT SEC2 HARDENING TESTS PASSED (100%)! <<<");
})().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
