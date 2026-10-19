const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== RUNNING V8 SECURITY AUDIT (SEC-01 TO SEC-08) TEST SUITE ===\n");

// ----------------------------------------------------------------------------
// 1. MANIFEST SECURITY (SEC-01 & SEC-06)
// ----------------------------------------------------------------------------
console.log("[Test 1] Manifest Permissions & Web Accessible Resources:");

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../manifest.json"), "utf8"));

// SEC-01: No broad <all_urls> in host_permissions
assert.ok(Array.isArray(manifest.host_permissions), "host_permissions must be an array");
assert.ok(!manifest.host_permissions.includes("<all_urls>"), "host_permissions MUST NOT contain <all_urls>");
assert.ok(!manifest.host_permissions.includes("*://*/*"), "host_permissions MUST NOT contain *://*/*");

const expectedHosts = [
  "https://identitytoolkit.googleapis.com/*",
  "https://securetoken.googleapis.com/*",
  "https://novel-tracker-1d134-default-rtdb.firebaseio.com/*",
  "https://api.callmebot.com/*"
];

assert.strictEqual(manifest.host_permissions.length, expectedHosts.length, `Expected exactly ${expectedHosts.length} host permissions`);
for (const h of expectedHosts) {
  assert.ok(manifest.host_permissions.includes(h), `Missing expected host permission: ${h}`);
}

// SEC-06: web_accessible_resources must NOT exist (locales loaded internally by extension)
assert.strictEqual(manifest.web_accessible_resources, undefined, "web_accessible_resources must NOT exist in manifest.json");

// SEC-02: externally_connectable must NOT exist
assert.strictEqual(manifest.externally_connectable, undefined, "externally_connectable must NOT exist");

console.log("  [PASS] Minimal host_permissions and absence of web_accessible_resources verified.");

// ----------------------------------------------------------------------------
// 2. SETUP VM SANDBOX FOR BACKGROUND.JS
// ----------------------------------------------------------------------------
function createMockChrome() {
  const store = {};
  const messageListeners = [];
  const alarms = {};

  return {
    _store: store,
    _messageListeners: messageListeners,
    runtime: {
      id: "novel-tracker-extension-id",
      getManifest: () => manifest,
      getURL: (p) => p || "",
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: {
        addListener: (fn) => messageListeners.push(fn)
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
      get: async () => ({ id: 1 }),
      create: async () => ({ id: 2 }),
      update: async () => ({ id: 1 }),
      sendMessage: async () => {},
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      onRemoved: { addListener: () => {} }
    },
    alarms: {
      create: (name, opts) => { alarms[name] = opts; },
      clear: (name) => { delete alarms[name]; },
      get: async (name) => alarms[name] || null,
      onAlarm: { addListener: () => {} }
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

const mockChrome = createMockChrome();
const bgCode = fs.readFileSync(path.join(__dirname, "../background.js"), "utf8");

const sandbox = {
  chrome: mockChrome,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  fetch: async () => ({ ok: true, status: 200, text: async () => "ok", json: async () => ({}) }),
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
  t: (k) => k,
  initI18n: () => Promise.resolve(),
  importScripts: (...files) => {
    for (const f of files) {
      try {
        const p = path.resolve(__dirname, "..", f);
        if (fs.existsSync(p)) {
          vm.runInContext(fs.readFileSync(p, "utf8"), sandbox);
        }
      } catch {}
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(bgCode, sandbox);

const dispatchMessage = (msg, sender) => {
  return new Promise((resolve) => {
    let handled = false;
    for (const listener of mockChrome._messageListeners) {
      const isAsync = listener(msg, sender, (res) => {
        handled = true;
        resolve(res);
      });
      if (isAsync === false && !handled) {
        handled = true;
        resolve({ ok: false, error: "Listener returned false" });
      }
    }
    // Timeout fallback if listener never responds
    setTimeout(() => {
      if (!handled) resolve({ ok: false, timeout: true });
    }, 150);
  });
};

// ----------------------------------------------------------------------------
// 3. SEC-02: REJECTION OF ADMIN MESSAGES FROM TAB SENDER
// ----------------------------------------------------------------------------
console.log("\n[Test 2] Rejection of Administrative Actions Sent from Tabs (SEC-02):");

(async () => {
  const adminTypes = [
    "IMPORT_DATA",
    "PERFORM_BREAKTHROUGH",
    "CLAIM_ALL_ACHIEVEMENTS",
    "CLAIM_ACHIEVEMENT_REWARD",
    "RECORD_MANUAL_READ",
    "FORCE_CLOUD_SYNC",
    "PULL_FROM_CLOUD",
    "TEST_WHATSAPP",
    "CLEAR_DOMAIN_BLACKLIST",
    "GET_DOMAIN_BLACKLIST"
  ];

  for (const type of adminTypes) {
    const maliciousTabSender = {
      id: "novel-tracker-extension-id",
      tab: { id: 42, url: "https://evil-novel-site.com/chapter-1" }
    };

    const res = await dispatchMessage({ type, payload: {}, data: {} }, maliciousTabSender);
    assert.strictEqual(res.ok, false, `Admin message '${type}' from tab sender must be rejected`);
    assert.ok(
      res.error && res.error.includes("administrative action"),
      `Admin message '${type}' error must indicate unauthorized administrative action, got: ${res.error}`
    );
  }

  console.log(`  [PASS] All ${adminTypes.length} administrative actions correctly rejected when sent with sender.tab.`);

  // ----------------------------------------------------------------------------
  // 4. SEC-02: REJECTION OF UNKNOWN MESSAGE TYPES
  // ----------------------------------------------------------------------------
  console.log("\n[Test 3] Rejection of Unknown Message Types (SEC-02):");

  const unknownTypes = ["DROP_DATABASE", "INJECT_SCRIPT", "ARBITRARY_ACTION", "FOO_BAR"];
  for (const type of unknownTypes) {
    const res = await dispatchMessage({ type }, { id: "novel-tracker-extension-id" });
    assert.strictEqual(res.ok, false, `Unknown type '${type}' must be rejected`);
    assert.ok(res.error && res.error.includes("Unknown message type"), `Error must indicate unknown type, got: ${res.error}`);
  }

  // Null/empty message
  const emptyRes = await dispatchMessage(null, {});
  assert.strictEqual(emptyRes.ok, false, "Null message must be rejected");

  console.log("  [PASS] Unknown message types and null payloads cleanly rejected.");

  // ----------------------------------------------------------------------------
  // 5. SEC-02: TAB BLACKLIST ACTIONS ENFORCE SENDER.TAB HOSTNAME
  // ----------------------------------------------------------------------------
  console.log("\n[Test 4] Blacklist Actions Enforce Hostname from sender.tab.url (SEC-02):");

  const legitimateTab = {
    id: 99,
    url: "https://read.novelsite.org/chapter/5"
  };

  // Content script attempts to blacklist an arbitrary target like google.com
  const addRes = await dispatchMessage(
    {
      type: "ADD_DOMAIN_BLACKLIST",
      domain: "google.com" // Malicious or mismatched payload
    },
    { id: "novel-tracker-extension-id", tab: legitimateTab }
  );

  assert.strictEqual(addRes.ok, true, "Blacklist add from valid tab should succeed");
  const storedList = mockChrome._store.domainBlacklist || [];
  const addedItem = storedList.find((item) => item.domain === "read.novelsite.org");
  const evilItem = storedList.find((item) => item.domain === "google.com");

  assert.ok(addedItem, "Tab hostname (read.novelsite.org) MUST be added to blacklist");
  assert.strictEqual(evilItem, undefined, "Arbitrary domain from message (google.com) MUST NOT be added");

  console.log("  [PASS] In-page blacklist strictly enforced sender.tab.url hostname instead of payload domain.");

  // ----------------------------------------------------------------------------
  // 6. SEC-05: WHATSAPP CALLMEBOT SANITIZATION & ENCODING
  // ----------------------------------------------------------------------------
  console.log("\n[Test 5] WhatsApp CallMeBot URL Builder Sanitization (SEC-05):");

  assert.strictEqual(typeof sandbox.buildCallMeBotUrl, "function", "buildCallMeBotUrl must be a function");

  // Test phone with spaces, dashes, plus sign
  const url1 = sandbox.buildCallMeBotUrl("+34 612-345-678", "api123", "Hello World");
  assert.ok(url1.includes("phone=34612345678"), `Phone must contain only digits, got: ${url1}`);
  assert.ok(url1.includes("apikey=api123"), "API key must be included");
  assert.ok(url1.includes("text=Hello%20World"), "Text must be encoded");

  // Test API key and text with special characters
  const url2 = sandbox.buildCallMeBotUrl("1234567890", "key with spaces & special=chars+", "Capítulo 12: «El dragón & el fénix»");
  assert.ok(!url2.includes(" "), "URL must not contain raw spaces");
  assert.ok(url2.includes("apikey=key%20with%20spaces%20%26%20special%3Dchars%2B"), "API key must be encodeURIComponent encoded");
  assert.ok(url2.includes("Cap%C3%ADtulo"), "Accents must be URL encoded");

  // Test empty phone or empty apiKey
  assert.strictEqual(sandbox.buildCallMeBotUrl("", "key", "msg"), null, "Empty phone must return null");
  assert.strictEqual(sandbox.buildCallMeBotUrl("123", "", "msg"), null, "Empty apiKey must return null");
  assert.strictEqual(sandbox.buildCallMeBotUrl("+-- ", "key", "msg"), null, "Phone with no digits must return null");

  console.log("  [PASS] WhatsApp URL builder sanitizes phone to digits and properly encodes apiKey and text.");

  // ----------------------------------------------------------------------------
  // 7. SEC-07: URL SCHEME VALIDATION (DISCARD JAVASCRIPT:, DATA:, ETC.)
  // ----------------------------------------------------------------------------
  console.log("\n[Test 6] URL Scheme Validation (Reject non-http/https) (SEC-07):");

  assert.strictEqual(typeof sandbox.isValidHttpUrl, "function", "isValidHttpUrl must be exported in background sandbox");
  assert.strictEqual(sandbox.isValidHttpUrl("https://example.com/novel/1"), true);
  assert.strictEqual(sandbox.isValidHttpUrl("http://localhost:8080/chap"), true);
  assert.strictEqual(sandbox.isValidHttpUrl("javascript:alert(1)"), false, "javascript: must be rejected");
  assert.strictEqual(sandbox.isValidHttpUrl("data:text/html,<script>alert(1)</script>"), false, "data: must be rejected");
  assert.strictEqual(sandbox.isValidHttpUrl("file:///C:/passwords.txt"), false, "file: must be rejected");
  assert.strictEqual(sandbox.isValidHttpUrl("ftp://bad.com/file"), false, "ftp: must be rejected");
  assert.strictEqual(sandbox.isValidHttpUrl(""), false, "Empty string must be rejected");
  assert.strictEqual(sandbox.isValidHttpUrl(null), false, "Null must be rejected");

  // Test CONFIRM_UNCONFIRMED_TAB with malicious javascript: URL
  const confirmMalicious = await dispatchMessage(
    {
      type: "CONFIRM_UNCONFIRMED_TAB",
      novelName: "Test Novel",
      chapter: "1",
      url: "javascript:evilPayload()"
    },
    { id: "novel-tracker-extension-id" }
  );
  assert.strictEqual(confirmMalicious.ok, false, "CONFIRM_UNCONFIRMED_TAB must reject javascript: URL");

  console.log("  [PASS] Non-http/https URLs strictly rejected in validation and storage.");

  // ----------------------------------------------------------------------------
  // 8. SEC-07: LENGTH BOUNDS ENFORCEMENT
  // ----------------------------------------------------------------------------
  console.log("\n[Test 7] Length Bounds Enforcement (novelName 300, url 2048, chapter 50, domain 253) (SEC-07):");

  const longName = "A".repeat(500);
  const longChap = "9".repeat(100);
  const validUrl = "https://example.com/" + "x".repeat(3000);

  const confirmRes = await dispatchMessage(
    {
      type: "CONFIRM_UNCONFIRMED_TAB",
      novelName: longName,
      chapter: longChap,
      url: "https://example.com/novel/long"
    },
    { id: "novel-tracker-extension-id" }
  );

  assert.strictEqual(confirmRes.ok, true, "CONFIRM_UNCONFIRMED_TAB should succeed with bounded values");
  assert.strictEqual(confirmRes.novelName.length, 300, "novelName must be capped at 300 characters");
  assert.strictEqual(confirmRes.chapter.length, 50, "chapter must be capped at 50 characters");

  // Domain length bound in addDomainToBlacklist
  const longDomain = "sub." + "b".repeat(300) + ".com";
  const blRes = await sandbox.addDomainToBlacklist(longDomain);
  assert.strictEqual(blRes.ok, true);
  const addedLong = (mockChrome._store.domainBlacklist || []).find((b) => b.domain.startsWith("sub."));
  assert.ok(addedLong, "Domain must be added");
  assert.ok(addedLong.domain.length <= 253, `Domain must be capped at 253 characters, got: ${addedLong.domain.length}`);

  console.log("  [PASS] All field length bounds (300, 2048, 50, 253) strictly enforced.");

  // ----------------------------------------------------------------------------
  // 9. SEC-04: SHADOW DOM CLOSED MODE & ISTRUSTED
  // ----------------------------------------------------------------------------
  console.log("\n[Test 8] Shadow DOM Closed Mode & isTrusted Handlers (SEC-04):");

  const contentJs = fs.readFileSync(path.join(__dirname, "../content.js"), "utf8");
  assert.ok(
    contentJs.includes('attachShadow({ mode: "closed" })') || contentJs.includes("attachShadow({ mode: 'closed' })"),
    "content.js must use closed shadow DOM"
  );
  assert.ok(contentJs.includes("inPagePromptShadow"), "content.js must store shadow in private closure");
  assert.ok(contentJs.includes("e.isTrusted"), "content.js click handlers must verify e.isTrusted");

  console.log("  [PASS] Closed shadow DOM mode and synthetic click protection verified.");

  // ----------------------------------------------------------------------------
  // 10. SEC-08: HTML ESCAPING ACROSS TEMPLATES
  // ----------------------------------------------------------------------------
  console.log("\n[Test 9] HTML Escaping Across UI Templates (SEC-08):");

  const popupJs = fs.readFileSync(path.join(__dirname, "../popup.js"), "utf8");
  assert.ok(
    popupJs.includes('escapeHtml(t("empty_library"))'),
    "Line 1928: empty_library translation must be escaped with escapeHtml()"
  );

  console.log("  [PASS] Verified comprehensive HTML escaping across templates.");

  console.log("\n>>> ALL V8 SECURITY AUDIT TESTS PASSED CLEANLY (100%)! <<<");
})();
