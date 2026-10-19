// ============================================================================
// TEST SUITE: ACCOUNT ISOLATION, WHATSAPP CREDENTIALS, AND ALARMS SAFETY
// ============================================================================
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== RUNNING ACCOUNT ISOLATION & SECURITY TEST SUITE ===\n");

const rootDir = path.resolve(__dirname, "..");
const bgSource = fs.readFileSync(path.join(rootDir, "background.js"), "utf8");

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
    importScripts: () => {},
    ...initialGlobals
  };

  vm.createContext(sandbox);
  vm.runInContext(bgSource, sandbox);
  return sandbox;
}

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

(async () => {
  // --------------------------------------------------------------------------
  // Test 1: Account A and B isolation (WhatsApp, alarms, diagnostic logs)
  // --------------------------------------------------------------------------
  console.log("[Test 1] User Account Isolation: User A -> Logout -> User B:");
  {
    const mockChrome = createMockChrome({
      lastAuthUid: "guest",
      settings: { language: "es" },
      savedNovels: {},
      stats: { chaptersRead: 0 }
    });
    const ctx = createSandboxContext(mockChrome);

    // 1. User A logs in
    await ctx.switchAccountProfile("UID_USER_A");
    assert.strictEqual(mockChrome._store.lastAuthUid, "UID_USER_A");

    // User A sets WhatsApp credentials and creates an inactive alarm + diagnostic log
    mockChrome._store.settings = {
      ...mockChrome._store.settings,
      phone: "+34611223344",
      apiKey: "secret_api_key_A",
      enableWhatsapp: true
    };
    mockChrome._alarms["inactive_101"] = { delayInMinutes: 1 };
    await ctx.appendDiagnosticLog({ event: "USER_A_ACTION", url: "https://example.com/novel/read" });
    assert.ok(mockChrome._alarms["inactive_101"], "Alarm for tab 101 exists");
    assert.strictEqual(mockChrome._store.diagnosticLogs.length > 0, true, "Diagnostic logs populated");

    // 2. Simple LOGOUT without clearing local data
    // Must switch to guest, wipe diagnosticLogs, BUT preserve device WhatsApp settings
    const logoutRes = await new Promise((resolve) => {
      mockChrome.runtime.sendMessage({ type: "LOGOUT", clearLocalData: false }, resolve);
    });
    assert.strictEqual(logoutRes.ok, true, "Logout succeeds");
    assert.strictEqual(mockChrome._store.lastAuthUid, "guest", "Switched to guest profile");
    assert.strictEqual(mockChrome._store.settings.phone, "+34611223344", "Simple logout preserves phone on device");
    assert.strictEqual(mockChrome._store.settings.apiKey, "secret_api_key_A", "Simple logout preserves apiKey on device");
    assert.strictEqual(mockChrome._store.settings.enableWhatsapp, true, "Simple logout preserves enableWhatsapp");
    assert.strictEqual(mockChrome._store.diagnosticLogs.length, 0, "Simple logout empties diagnosticLogs");

    // 3. User B logs in (different UID from User A)
    // User B MUST NOT inherit User A's phone, apiKey, or enableWhatsapp!
    // And User A's inactive alarm must be cancelled!
    await ctx.switchAccountProfile("UID_USER_B");
    assert.strictEqual(mockChrome._store.lastAuthUid, "UID_USER_B");
    assert.strictEqual(mockChrome._store.settings.phone, undefined, "User B DOES NOT inherit User A phone");
    assert.strictEqual(mockChrome._store.settings.apiKey, undefined, "User B DOES NOT inherit User A apiKey");
    assert.strictEqual(mockChrome._store.settings.enableWhatsapp, false, "User B enableWhatsapp defaults to false");
    assert.strictEqual(mockChrome._alarms["inactive_101"], undefined, "User A inactive alarm was cancelled for User B");
    assert.strictEqual(mockChrome._store.diagnosticLogs.length, 0, "User B starts with zero diagnosticLogs from User A");

    console.log("  [PASS] User B does not inherit phone, apiKey, or alarms from User A; simple logout preserved WhatsApp.");
  }

  // --------------------------------------------------------------------------
  // Test 2: LOGOUT with clearLocalData: true
  // --------------------------------------------------------------------------
  console.log("\n[Test 2] LOGOUT with clearLocalData: true:");
  {
    const mockChrome = createMockChrome({
      auth: { uid: "UID_USER_C" },
      lastAuthUid: "UID_USER_C",
      lastAuthenticatedUid: "UID_USER_C",
      settings: { phone: "12345", apiKey: "key123", enableWhatsapp: true },
      diagnosticLogs: [{ event: "LOG_C" }]
    });
    mockChrome._alarms["inactive_202"] = { delayInMinutes: 2 };
    const ctx = createSandboxContext(mockChrome);

    const logoutRes = await new Promise((resolve) => {
      mockChrome.runtime.sendMessage({ type: "LOGOUT", clearLocalData: true }, resolve);
    });
    assert.strictEqual(logoutRes.ok, true);
    assert.strictEqual(mockChrome._store.settings.phone, undefined, "Phone erased on clearLocalData logout");
    assert.strictEqual(mockChrome._store.settings.apiKey, undefined, "ApiKey erased on clearLocalData logout");
    assert.strictEqual(mockChrome._store.settings.enableWhatsapp, false, "enableWhatsapp false on clearLocalData logout");
    assert.strictEqual(mockChrome._store.diagnosticLogs.length, 0, "diagnosticLogs emptied");
    assert.strictEqual(mockChrome._alarms["inactive_202"], undefined, "inactive_202 alarm cancelled");
    assert.strictEqual(mockChrome._store.lastAuthenticatedUid, "UID_USER_C", "lastAuthenticatedUid preserved to protect next login");

    // Interim guest sets WhatsApp credentials
    mockChrome._store.settings = { ...mockChrome._store.settings, phone: "guest_phone", apiKey: "guest_key", enableWhatsapp: true };
    await ctx.switchAccountProfile("UID_USER_E");
    assert.strictEqual(mockChrome._store.settings.phone, undefined, "User E does not inherit interim WhatsApp credentials");
    assert.strictEqual(mockChrome._store.settings.enableWhatsapp, false, "User E enableWhatsapp is false");
    console.log("  [PASS] LOGOUT with clearLocalData wipes WhatsApp settings, logs, and alarms.");
  }

  // --------------------------------------------------------------------------
  // Test 3: DELETE_ACCOUNT wipes WhatsApp, alarms, and logs
  // --------------------------------------------------------------------------
  console.log("\n[Test 3] DELETE_ACCOUNT Handler Isolation:");
  {
    const mockChrome = createMockChrome({
      auth: { uid: "UID_USER_D", idToken: "tok_d" },
      lastAuthUid: "UID_USER_D",
      lastAuthenticatedUid: "UID_USER_D",
      settings: { phone: "99999", apiKey: "key999", enableWhatsapp: true },
      diagnosticLogs: [{ event: "LOG_D" }]
    });
    mockChrome._alarms["inactive_303"] = { delayInMinutes: 3 };
    const ctx = createSandboxContext(mockChrome);

    const deleteRes = await new Promise((resolve) => {
      mockChrome.runtime.sendMessage({ type: "DELETE_ACCOUNT" }, resolve);
    });
    assert.strictEqual(deleteRes.ok, true);
    assert.strictEqual(mockChrome._store.settings.phone, undefined, "Phone erased on DELETE_ACCOUNT");
    assert.strictEqual(mockChrome._store.settings.apiKey, undefined, "ApiKey erased on DELETE_ACCOUNT");
    assert.strictEqual(mockChrome._store.settings.enableWhatsapp, false, "enableWhatsapp false on DELETE_ACCOUNT");
    assert.strictEqual(mockChrome._store.diagnosticLogs.length, 0, "diagnosticLogs emptied");
    assert.strictEqual(mockChrome._alarms["inactive_303"], undefined, "inactive_303 alarm cancelled");
    console.log("  [PASS] DELETE_ACCOUNT wipes WhatsApp credentials, logs, and cancels alarms.");
  }

  // --------------------------------------------------------------------------
  // Test 4: RESET_LOCAL_DATA wipes WhatsApp, alarms, and logs while resetting library
  // --------------------------------------------------------------------------
  console.log("\n[Test 4] RESET_LOCAL_DATA Handler Isolation:");
  {
    const mockChrome = createMockChrome({
      savedNovels: { n1: { novelName: "Novel 1" } },
      stats: { chaptersRead: 50 },
      settings: { phone: "77777", apiKey: "key777", enableWhatsapp: true },
      diagnosticLogs: [{ event: "LOG_E" }]
    });
    mockChrome._alarms["inactive_404"] = { delayInMinutes: 4 };
    const ctx = createSandboxContext(mockChrome);

    const resetRes = await new Promise((resolve) => {
      mockChrome.runtime.sendMessage({ type: "RESET_LOCAL_DATA" }, resolve);
    });
    assert.strictEqual(resetRes.ok, true);
    assert.strictEqual(mockChrome._store.settings.phone, undefined, "Phone erased on RESET_LOCAL_DATA");
    assert.strictEqual(mockChrome._store.settings.apiKey, undefined, "ApiKey erased on RESET_LOCAL_DATA");
    assert.strictEqual(mockChrome._store.settings.enableWhatsapp, false, "enableWhatsapp false on RESET_LOCAL_DATA");
    assert.strictEqual(mockChrome._store.diagnosticLogs.length, 0, "diagnosticLogs emptied");
    assert.strictEqual(mockChrome._alarms["inactive_404"], undefined, "inactive_404 alarm cancelled");
    assert.strictEqual(Object.keys(mockChrome._store.savedNovels).length, 0, "savedNovels reset to empty");
    console.log("  [PASS] RESET_LOCAL_DATA wipes WhatsApp credentials, logs, and alarms cleanly.");
  }

  // --------------------------------------------------------------------------
  // Test 5: Diagnostic logs store only hostname for URLs
  // --------------------------------------------------------------------------
  console.log("\n[Test 5] Diagnostic Logs URL Sanitization (Hostname Only):");
  {
    const mockChrome = createMockChrome({ diagnosticLogs: [] });
    const ctx = createSandboxContext(mockChrome);

    await ctx.appendDiagnosticLog({
      event: "TEST_URL_LOG",
      url: "https://read.example.com/series/shadow-slave/chapter-100?token=secret123",
      novelUrl: "https://read.example.com/series/shadow-slave"
    });

    const storedLogs = mockChrome._store.diagnosticLogs;
    assert.strictEqual(storedLogs.length, 1);
    assert.strictEqual(storedLogs[0].url, "read.example.com", "URL sanitized to hostname only");
    assert.strictEqual(storedLogs[0].novelUrl, "read.example.com", "novelUrl sanitized to hostname only");
    assert.strictEqual(storedLogs[0].url.includes("shadow-slave"), false, "Path not included in diagnosticLog url");
    console.log("  [PASS] Diagnostic logs strictly store only hostname for URLs.");
  }

  console.log("\n>>> ALL ACCOUNT ISOLATION TESTS PASSED (100%)! <<<");
})().catch((err) => {
  console.error("TEST SUITE FAILED:", err);
  process.exit(1);
});
